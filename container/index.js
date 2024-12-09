const { S3Client } = require('@aws-sdk/client-s3')
const fs = require("node:fs/promises");
const fsOld = require("node:fs")
const path = require("node:path")

const ffmpeg = require("fluent-ffmpeg");

const RESOLUTIONS = [
    { name: "360p", width: 480, height: 360 },
    { name: "480", width: 858, height: 480 },
    { name: "720p", width: 1280, height: 720 },

]

const fs = require("fs")


const s3Client = new S3Client({
    region: "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
})

//Download the original video






async function init() {
    
    const command = new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: process.env.KEY,
    })
    
    const result = await s3Client.send(command)
    
    const originalFilePath = `original-video.mp4`;
    
    
    await fs.writeFile(originalFilePath, result.body)
    
    const originalVideoPath = path.resolve(originalFilePath)
    
    //start the transcoder
    const promises = RESOLUTIONS.map(resolution => {
        const output = `video-${resolution.name}.mp4`
        
        return new Promise((resolve) => {
            ffmpeg(originalVideoPath)
            .output(output)
            .withVideoCodec("libx264")
            .withAudioCodec("aac")
            .withSize(`${resolution.width}x${resolution.height}`)
            .on("end", async () => {
                const putCommand = new PutObjectCommand({
                    Bucket:"production.sahilrevankar1.xyz",
                    Key: output,
                    Body:fsOld.createReadStream(path.resolve(output)),
                });
                await s3Client.send(putCommand);
                console.log(`uploaded ${output}`);
                resolve();
            })
            .format("mp4")
            .run();
        })
        
    })
    
    await Promise.all(promises);
}


init().finally(() => process.exit(0)) ;