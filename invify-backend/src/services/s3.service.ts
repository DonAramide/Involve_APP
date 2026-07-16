import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const s3Client = new S3Client({
  endpoint: process.env.CONTABO_ENDPOINT,
  region: process.env.CONTABO_REGION || 'default',
  credentials: {
    accessKeyId: process.env.CONTABO_ACCESS_KEY || '',
    secretAccessKey: process.env.CONTABO_SECRET_KEY || ''
  },
  forcePathStyle: true // Important for many S3-compatible providers
});

export class S3Service {
  /**
   * Uploads a file buffer to Contabo S3 bucket.
   * @param fileBuffer The file content as a Buffer.
   * @param originalName The original name of the file (to extract extension).
   * @param mimetype The MIME type of the file.
   * @param folder Optional folder path inside the bucket.
   * @returns The public URL of the uploaded file.
   */
  static async uploadFile(fileBuffer: Buffer, originalName: string, mimetype: string, folder: string = 'kyc'): Promise<string> {
    const bucket = process.env.CONTABO_BUCKET || 'iips.stargazer.bucket';
    const ext = path.extname(originalName) || '.bin';
    const fileName = `${folder}/${uuidv4()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimetype,
      ACL: 'public-read' // Assumes CONTABO_UPLOAD_PUBLIC_READ=true logic
    });

    try {
      await s3Client.send(command);
      
      // Construct the public URL
      let endpoint = process.env.CONTABO_ENDPOINT || '';
      // Ensure no trailing slash
      if (endpoint.endsWith('/')) {
        endpoint = endpoint.slice(0, -1);
      }
      
      return `${endpoint}/${bucket}/${fileName}`;
    } catch (error: any) {
      console.error('[S3Service] Error uploading file:', error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }
}
