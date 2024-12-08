import { ReceiveMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
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

        for (const message of Messages){
            const {Body, MessageId} = message;
            console.log(`Message Received`, {MessageId,Body})
        }
    }

}

init();