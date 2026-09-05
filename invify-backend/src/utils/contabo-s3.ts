import { S3Client } from '@aws-sdk/client-s3';

export const DEFAULT_CONTABO_BUCKET = 'iips.stargazer.bucket';
export const DEFAULT_CONTABO_ENDPOINT = 'https://usc1.contabostorage.com';
export const DEFAULT_CONTABO_REGION = 'usc1';

/**
 * Contabo Object Storage is path-style at {region}.contabostorage.com.
 * `s3.{region}.contabostorage.com` has no DNS (ENOTFOUND on the VPS).
 */
export function resolveContaboEndpoint(): string {
  const raw = (process.env.CONTABO_ENDPOINT || DEFAULT_CONTABO_ENDPOINT).trim();
  const region = (process.env.CONTABO_REGION || DEFAULT_CONTABO_REGION).trim() || DEFAULT_CONTABO_REGION;
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    let host = url.hostname.toLowerCase().replace(/^s3\./, '');
    if (host === 'contabostorage.com') {
      host = `${region}.contabostorage.com`;
    }
    url.hostname = host;
    url.protocol = 'https:';
    return url.origin;
  } catch {
    return DEFAULT_CONTABO_ENDPOINT;
  }
}

export function resolveContaboBucket(): string {
  return (process.env.CONTABO_BUCKET || DEFAULT_CONTABO_BUCKET).trim();
}

export function createContaboS3Client(): S3Client {
  process.env.AWS_REQUEST_CHECKSUM_CALCULATION ||= 'WHEN_REQUIRED';
  process.env.AWS_RESPONSE_CHECKSUM_VALIDATION ||= 'WHEN_REQUIRED';

  const client = new S3Client({
    endpoint: resolveContaboEndpoint(),
    region: (process.env.CONTABO_REGION || DEFAULT_CONTABO_REGION).trim() || DEFAULT_CONTABO_REGION,
    credentials: {
      accessKeyId: process.env.CONTABO_ACCESS_KEY || '',
      secretAccessKey: process.env.CONTABO_SECRET_KEY || '',
    },
    forcePathStyle: true,
    tls: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  const stripAwsChecksumHeaders = (next: (args: any) => Promise<any>) => async (args: any) => {
    const headers = args?.request?.headers;
    if (headers && typeof headers === 'object') {
      for (const key of Object.keys(headers)) {
        const lower = key.toLowerCase();
        if (
          lower.startsWith('x-amz-checksum-') ||
          lower === 'x-amz-sdk-checksum-algorithm' ||
          lower === 'x-amz-trailer' ||
          lower === 'x-amz-decoded-content-length'
        ) {
          delete headers[key];
        }
      }
      const encoding = String(headers['content-encoding'] || headers['Content-Encoding'] || '');
      if (encoding.toLowerCase().includes('aws-chunked')) {
        delete headers['content-encoding'];
        delete headers['Content-Encoding'];
      }
    }
    return next(args);
  };

  client.middlewareStack.add(stripAwsChecksumHeaders, {
    step: 'build',
    name: 'contaboStripAwsChecksums',
    priority: 'low',
  });
  client.middlewareStack.add(stripAwsChecksumHeaders, {
    step: 'finalizeRequest',
    name: 'contaboStripAwsChecksumsFinalize',
    priority: 'low',
  });

  return client;
}
