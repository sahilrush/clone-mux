import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import type {S3Event} from "aws-lambda"

import * as dotenv from "dotenv"
dotenv.config()

const client = new SQSClient({
    region:"us-east-1",
    credentials:{
        accessKeyId:process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY as string,
    }
})

    const ecsClient = new ECSClient({
        region:"us-east-1",
        credentials:{
            accessKeyId:process.env.AWS_ACCESS_KEY_ID as string,
            secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY as string,
        }
    })


async function init() {
    const command = new ReceiveMessageCommand({
        QueueUrl:process.env.AWS_QUEUE_URL,
        MaxNumberOfMessages:1,
        WaitTimeSeconds:20
    });


    while(true) {
        const {Messages} = await client.send(command)
        if(!Messages){
            console.log(`No message in Queue `,);
            continue;
        }

       try{
        for (const message of Messages){
            const {Body, MessageId} = message;
            console.log(`Message Received`, {MessageId,Body})

            if(!Body) continue;

            //validate and parse the event
            const event = JSON.parse(Body) as S3Event;

            //ignore the test event
            if("Service" in event && "Event" in event) {
                if(event.Event === "s3:TestEvent") {

                await client.send(new DeleteMessageCommand({QueueUrl:process.env.AWS_QUEUE_URL,
                    ReceiptHandle:message.ReceiptHandle
                }))
                continue;
                };
            }

            for(const record of event.Records) {
                const {s3} = record
                const {bucket, object:{key},}= s3
                
                //spin the docker container //learn about  promethuius and grafana
                const runTaskCommand = new RunTaskCommand({
                    taskDefinition:'arn:aws:ecs:us-east-1:060795917212:task-definition/video-transcoder',
                    cluster:'arn:aws:ecs:us-east-1:060795917212:cluster/devVideo',
                    launchType:"FARGATE",
                    networkConfiguration:{
                        awsvpcConfiguration:{
                            assignPublicIp:'ENABLED', 
                        securityGroups:['sg-0dc4af3d1d73cc144'],
                        subnets: [
                            'subnet-027b51341c277d0e2',
                            'subnet-0da78f9f76d863c73', 
                            'subnet-002b9782af3d1c9f4' ]
                    }
                },
                overrides:{
                    containerOverrides:[{name:"video-transcoder", environment: [{name:"BUCKET_NAME", value: bucket.name},
                        {name:"KEY", value:key}
                    ]}]
                }
                })
                await ecsClient.send(runTaskCommand);


                await client.send(new DeleteMessageCommand({QueueUrl:process.env.AWS_QUEUE_URL,
                    ReceiptHandle:message.ReceiptHandle
                }))
            }




        }
       }catch(error) {
        console.log(error)

       }
    }

}

init();