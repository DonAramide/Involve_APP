export function resolveApkObjectKey(s3Url: string, bucket?: string): string | null {
  const raw = String(s3Url || '').trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) {
    return raw.replace(/^\/+/, '') || null;
  }
  try {
    const parsed = new URL(raw);
    const parts = parsed.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
    if (parts.length === 0) return null;

    // In Contabo S3 URLs with "apks/" prefix, anything starting from "apks/..." is the bucket object key
    const apksIdx = parts.indexOf('apks');
    if (apksIdx !== -1) {
      return parts.slice(apksIdx).join('/');
    }

    const bucketName = (bucket || process.env.CONTABO_BUCKET || '').trim();
    if (bucketName && (parts[0] === bucketName || parts[0].endsWith(`:${bucketName}`))) {
      return parts.slice(1).join('/') || null;
    }
    if (parts[0].includes(':')) {
      return parts.slice(1).join('/') || null;
    }
    return parts.join('/');
  } catch {
    return null;
  }
}
