import { PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { BuildVariantService } from '../config/build-variant';
import { createContaboS3Client, resolveContaboBucket, resolveContaboEndpoint } from '../utils/contabo-s3';
dotenv.config();

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
    const variant = BuildVariantService.getInstance();
    if (variant.isProd() || variant.isStaging()) {
      if (!process.env.CONTABO_ACCESS_KEY || !process.env.CONTABO_SECRET_KEY || !process.env.CONTABO_ENDPOINT) {
        throw new Error('Contabo S3 credentials (CONTABO_ACCESS_KEY, CONTABO_SECRET_KEY, CONTABO_ENDPOINT) are required in staging/production');
      }
    }
    const bucket = resolveContaboBucket();
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
      await createContaboS3Client().send(command);
      
      // Construct the public URL
      let endpoint = resolveContaboEndpoint();
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
