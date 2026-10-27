import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { validateImageBase64 } from '../../../utils/image-validator';

const s3Client = new S3Client({
  endpoint: process.env.CONTABO_ENDPOINT || '',
  region: process.env.CONTABO_REGION || 'usc1',
  credentials: {
    accessKeyId: process.env.CONTABO_ACCESS_KEY || '',
    secretAccessKey: process.env.CONTABO_SECRET_KEY || ''
  },
  forcePathStyle: true
});

function buildPublicUrl(objectKey: string): string {
  const bucket = process.env.CONTABO_BUCKET || 'invify-kyc';
  const baseUrl = process.env.CONTABO_PUBLIC_BASE_URL;
  if (baseUrl) {
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return `${cleanBase}${objectKey}`;
  } else {
    let endpointUrl = process.env.CONTABO_ENDPOINT || '';
    if (!endpointUrl.endsWith('/')) endpointUrl += '/';
    const tenantPrefix = '0d205683f3b543beb7298e9b68e26b0f:';
    return `${endpointUrl}${tenantPrefix}${bucket}/${objectKey}`;
  }
}

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
  if (process.env.CONTABO_ACCESS_KEY && bucket) {
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: contentType,
      ACL: process.env.CONTABO_UPLOAD_PUBLIC_READ === 'true' ? 'public-read' : 'private'
    }));
  }

  return buildPublicUrl(objectKey);
}

/**
 * Validates and securely uploads an official institution logo to Contabo S3.
 * Enforces PNG/JPEG/WebP format, 2MB size limit, and dimension verification.
 */
export async function uploadInstitutionLogo(
  base64Data: string,
  institutionCode: string
): Promise<{ logoUrl: string; width: number; height: number; sizeBytes: number }> {
  if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
    return { logoUrl: base64Data, width: 0, height: 0, sizeBytes: 0 };
  }

  const validated = validateImageBase64(base64Data, {
    maxSizeBytes: 2 * 1024 * 1024, // 2MB strict
    minWidth: 32,
    minHeight: 32,
    maxWidth: 4096,
    maxHeight: 4096,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  });

  const safeCode = institutionCode.trim().replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const objectKey = `institutions/logos/${safeCode}_${Date.now()}.${validated.extension}`;
  const bucket = process.env.CONTABO_BUCKET;

  if (process.env.CONTABO_ACCESS_KEY && bucket) {
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: validated.buffer,
      ContentType: validated.contentType,
      ACL: process.env.CONTABO_UPLOAD_PUBLIC_READ === 'true' ? 'public-read' : 'private'
    }));
  }

  const logoUrl = buildPublicUrl(objectKey);
  return {
    logoUrl,
    width: validated.width,
    height: validated.height,
    sizeBytes: validated.sizeBytes,
  };
}

/**
 * Removes an institution logo from object storage.
 */
export async function deleteInstitutionLogo(logoUrl: string): Promise<boolean> {
  if (!logoUrl || !logoUrl.includes('institutions/logos/')) return false;
  const bucket = process.env.CONTABO_BUCKET;
  if (!process.env.CONTABO_ACCESS_KEY || !bucket) return true;

  try {
    const keyMatch = logoUrl.match(/(institutions\/logos\/[a-zA-Z0-9_\-\.]+)/);
    if (!keyMatch) return false;
    const objectKey = keyMatch[1];
    await s3Client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    }));
    return true;
  } catch (err: any) {
    console.warn('[kyc-storage] Failed to delete logo object:', err?.message || err);
    return false;
  }
}
