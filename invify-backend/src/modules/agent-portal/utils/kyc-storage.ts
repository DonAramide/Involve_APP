import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  endpoint: process.env.CONTABO_ENDPOINT || '',
  region: process.env.CONTABO_REGION || 'usc1',
  credentials: {
    accessKeyId: process.env.CONTABO_ACCESS_KEY || '',
    secretAccessKey: process.env.CONTABO_SECRET_KEY || ''
  },
  forcePathStyle: true
});

export async function uploadBase64ToContabo(base64Data: string, prefix: string, fileName: string): Promise<string> {
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    if (base64Data.startsWith('http')) return base64Data;
    throw new Error('Invalid file format. Upload requires valid base64 stream.');
  }

  const contentType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  const objectKey = `agents/${prefix}/${fileName}_${Date.now()}.${contentType.split('/')[1] || 'png'}`;
  
  const bucket = process.env.CONTABO_BUCKET;
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    Body: buffer,
    ContentType: contentType,
    ACL: process.env.CONTABO_UPLOAD_PUBLIC_READ === 'true' ? 'public-read' : 'private'
  }));

  let baseUrl = process.env.CONTABO_PUBLIC_BASE_URL;
  if (baseUrl) {
    if (!baseUrl.endsWith('/')) baseUrl += '/';
    return `${baseUrl}${objectKey}`;
  } else {
    let endpointUrl = process.env.CONTABO_ENDPOINT || '';
    if (!endpointUrl.endsWith('/')) endpointUrl += '/';
    const tenantPrefix = '0d205683f3b543beb7298e9b68e26b0f:';
    return `${endpointUrl}${tenantPrefix}${bucket}/${objectKey}`;
  }
}
