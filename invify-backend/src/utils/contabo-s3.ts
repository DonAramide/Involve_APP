import { createHash, createHmac } from 'crypto';
import https from 'https';
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

function sha256Hex(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

export function contaboObjectPath(bucket: string, key: string): string {
  const keyPath = String(key || '')
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
  return `/${bucket}/${keyPath}`;
}

export function formatContaboPutError(status: number, text: string): string {
  const trimmed = String(text || '').trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      return parsed.message || parsed.error || parsed.Message || `Contabo storage error (${status})`;
    } catch {
      /* fall through */
    }
  }
  const xmlMsg = trimmed.match(/<Message>([^<]+)<\/Message>/i);
  if (xmlMsg?.[1]) return xmlMsg[1];
  if (trimmed) return `Contabo storage error (${status}): ${trimmed.slice(0, 300)}`;
  return `Contabo storage error (${status})`;
}

/** SigV4 PUT without AWS SDK checksums, chunked encoding, or XML error parsing. */
export async function putContaboObject(params: {
  bucket: string;
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<void> {
  const accessKeyId = process.env.CONTABO_ACCESS_KEY || '';
  const secretAccessKey = process.env.CONTABO_SECRET_KEY || '';
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Contabo S3 credentials are missing (CONTABO_ACCESS_KEY / CONTABO_SECRET_KEY).');
  }

  const origin = resolveContaboEndpoint();
  const endpoint = new URL(origin);
  const hostname = endpoint.hostname;
  const port = endpoint.port ? Number(endpoint.port) : 443;
  const path = contaboObjectPath(params.bucket, params.key);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const region = (process.env.CONTABO_REGION || DEFAULT_CONTABO_REGION).trim() || DEFAULT_CONTABO_REGION;
  const payloadHash = sha256Hex(params.body);
  const contentType = params.contentType || 'application/octet-stream';
  const canonicalHeaders =
    `content-length:${params.body.byteLength}\n` +
    `content-type:${contentType}\n` +
    `host:${hostname}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-length;content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    'PUT',
    path,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region), 's3'),
    'aws4_request',
  );
  const signature = hmac(signingKey, stringToSign).toString('hex');
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  await new Promise<void>((resolve, reject) => {
    const req = https.request(
      {
        hostname,
        port,
        method: 'PUT',
        path,
        headers: {
          host: hostname,
          'content-type': contentType,
          'content-length': params.body.byteLength,
          'x-amz-content-sha256': payloadHash,
          'x-amz-date': amzDate,
          authorization,
        },
        timeout: 15 * 60 * 1000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const status = res.statusCode || 0;
          const text = Buffer.concat(chunks).toString('utf8');
          if (status >= 200 && status < 300) {
            resolve();
            return;
          }
          reject(new Error(formatContaboPutError(status, text)));
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Contabo Object Storage upload timed out'));
    });
    req.end(params.body);
  });
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
