"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBase64ToContabo = uploadBase64ToContabo;
exports.uploadInstitutionLogo = uploadInstitutionLogo;
exports.deleteInstitutionLogo = deleteInstitutionLogo;
const client_s3_1 = require("@aws-sdk/client-s3");
const image_validator_1 = require("../../../utils/image-validator");
const s3Client = new client_s3_1.S3Client({
    endpoint: process.env.CONTABO_ENDPOINT || '',
    region: process.env.CONTABO_REGION || 'usc1',
    credentials: {
        accessKeyId: process.env.CONTABO_ACCESS_KEY || '',
        secretAccessKey: process.env.CONTABO_SECRET_KEY || ''
    },
    forcePathStyle: true
});
function buildPublicUrl(objectKey) {
    const bucket = process.env.CONTABO_BUCKET || 'invify-kyc';
    const baseUrl = process.env.CONTABO_PUBLIC_BASE_URL;
    if (baseUrl) {
        const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        return `${cleanBase}${objectKey}`;
    }
    else {
        let endpointUrl = process.env.CONTABO_ENDPOINT || '';
        if (!endpointUrl.endsWith('/'))
            endpointUrl += '/';
        const tenantPrefix = '0d205683f3b543beb7298e9b68e26b0f:';
        return `${endpointUrl}${tenantPrefix}${bucket}/${objectKey}`;
    }
}
async function uploadBase64ToContabo(base64Data, prefix, fileName) {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        if (base64Data.startsWith('http'))
            return base64Data;
        throw new Error('Invalid file format. Upload requires valid base64 stream.');
    }
    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const objectKey = `agents/${prefix}/${fileName}_${Date.now()}.${contentType.split('/')[1] || 'png'}`;
    const bucket = process.env.CONTABO_BUCKET;
    if (process.env.CONTABO_ACCESS_KEY && bucket) {
        await s3Client.send(new client_s3_1.PutObjectCommand({
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
async function uploadInstitutionLogo(base64Data, institutionCode) {
    if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
        return { logoUrl: base64Data, width: 0, height: 0, sizeBytes: 0 };
    }
    const validated = (0, image_validator_1.validateImageBase64)(base64Data, {
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
        await s3Client.send(new client_s3_1.PutObjectCommand({
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
async function deleteInstitutionLogo(logoUrl) {
    if (!logoUrl || !logoUrl.includes('institutions/logos/'))
        return false;
    const bucket = process.env.CONTABO_BUCKET;
    if (!process.env.CONTABO_ACCESS_KEY || !bucket)
        return true;
    try {
        const keyMatch = logoUrl.match(/(institutions\/logos\/[a-zA-Z0-9_\-\.]+)/);
        if (!keyMatch)
            return false;
        const objectKey = keyMatch[1];
        await s3Client.send(new client_s3_1.DeleteObjectCommand({
            Bucket: bucket,
            Key: objectKey,
        }));
        return true;
    }
    catch (err) {
        console.warn('[kyc-storage] Failed to delete logo object:', err?.message || err);
        return false;
    }
}
//# sourceMappingURL=kyc-storage.js.map