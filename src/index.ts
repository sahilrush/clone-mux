import { ReceiveMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import * as dotenv from "dotenv"
dotenv.config()

const client = new SQSClient({
    credentials:{
        accessKeyId:process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY as string,
    }
})


async function init() {
    const command = new ReceiveMessageCommand({
        QueueUrl:process.env.AWS_QUEUE_URL,
        MaxNumberOfMessages:1
    });

}


