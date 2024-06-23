import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const acesssKey = process.env.ACESSS_KEY;
const secretAccessKey = process.env.SECRET_ACCESS_KEY;
const region = process.env.REGION;
const s3Bucket = process.env.S3_BUCKET;
export async function s3Upload(file, buffer) {
  new S3Client({
    credentials: {
      acesssKeyId: acesssKey,
      secretAccessKey,
    },
    region,
  });

  const params = {
    Bucket: s3Bucket,
    key: file.name,
    Body: file.buffer,
    ContentType: file.type,
  };

  const command = new PutObjectCommand(params);
}
