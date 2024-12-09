"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_ecs_1 = require("@aws-sdk/client-ecs");
const client_sqs_1 = require("@aws-sdk/client-sqs");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const client = new client_sqs_1.SQSClient({
    region: "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});
const ecsClient = new client_ecs_1.ECSClient({
    region: "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        const command = new client_sqs_1.ReceiveMessageCommand({
            QueueUrl: process.env.AWS_QUEUE_URL,
            MaxNumberOfMessages: 1,
            WaitTimeSeconds: 20
        });
        while (true) {
            const { Messages } = yield client.send(command);
            if (!Messages) {
                console.log(`No message in Queue `);
                continue;
            }
            try {
                for (const message of Messages) {
                    const { Body, MessageId } = message;
                    console.log(`Message Received`, { MessageId, Body });
                    if (!Body)
                        continue;
                    //validate and parse the event
                    const event = JSON.parse(Body);
                    //ignore the test event
                    if ("Service" in event && "Event" in event) {
                        if (event.Event === "s3:TestEvent") {
                            yield client.send(new client_sqs_1.DeleteMessageCommand({ QueueUrl: process.env.AWS_QUEUE_URL,
                                ReceiptHandle: message.ReceiptHandle
                            }));
                            continue;
                        }
                        ;
                    }
                    for (const record of event.Records) {
                        const { s3 } = record;
                        const { bucket, object: { key }, } = s3;
                        //spin the docker container //learn about  promethuius and grafana
                        const runTaskCommand = new client_ecs_1.RunTaskCommand({
                            taskDefinition: 'arn:aws:ecs:us-east-1:060795917212:task-definition/video-transcoder',
                            cluster: 'arn:aws:ecs:us-east-1:060795917212:cluster/devVideo',
                            launchType: "FARGATE",
                            networkConfiguration: {
                                awsvpcConfiguration: {
                                    assignPublicIp: 'ENABLED',
                                    securityGroups: ['sg-0dc4af3d1d73cc144'],
                                    subnets: [
                                        'subnet-027b51341c277d0e2',
                                        'subnet-0da78f9f76d863c73',
                                        'subnet-002b9782af3d1c9f4'
                                    ]
                                }
                            },
                            overrides: {
                                containerOverrides: [{ name: "video-transcoder", environment: [{ name: "BUCKET_NAME", value: bucket.name },
                                            { name: "KEY", value: key }
                                        ] }]
                            }
                        });
                        yield ecsClient.send(runTaskCommand);
                        yield client.send(new client_sqs_1.DeleteMessageCommand({ QueueUrl: process.env.AWS_QUEUE_URL,
                            ReceiptHandle: message.ReceiptHandle
                        }));
                    }
                }
            }
            catch (error) {
                console.log(error);
            }
        }
    });
}
init();
