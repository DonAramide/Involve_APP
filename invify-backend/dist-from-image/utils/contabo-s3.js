"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONTABO_STORAGE_TENANT = exports.DEFAULT_CONTABO_REGION = exports.DEFAULT_CONTABO_ENDPOINT = exports.DEFAULT_CONTABO_BUCKET = void 0;
exports.resolveContaboEndpoint = resolveContaboEndpoint;
exports.resolveContaboBucket = resolveContaboBucket;
exports.resolveContaboStorageTenant = resolveContaboStorageTenant;
exports.resolveContaboPublicBucketSegment = resolveContaboPublicBucketSegment;
exports.rewritePublicContaboUrl = rewritePublicContaboUrl;
exports.resolveContaboCredentials = resolveContaboCredentials;
exports.contaboObjectPath = contaboObjectPath;
exports.publicContaboObjectUrl = publicContaboObjectUrl;
exports.formatContaboNetworkError = formatContaboNetworkError;
exports.formatContaboPutError = formatContaboPutError;
exports.putContaboObject = putContaboObject;
exports.createContaboS3Client = createContaboS3Client;
const crypto_1 = require("crypto");
const promises_1 = require("dns/promises");
const fs_1 = __importDefault(require("fs"));
const https_1 = __importDefault(require("https"));
const client_s3_1 = require("@aws-sdk/client-s3");
exports.DEFAULT_CONTABO_BUCKET = 'iips.stargazer.bucket';
exports.DEFAULT_CONTABO_ENDPOINT = 'https://usc1.contabostorage.com';
exports.DEFAULT_CONTABO_REGION = 'usc1';
/** Contabo Object Storage account id used in public path-style URLs: /{accountId}:{bucket}/key */
exports.DEFAULT_CONTABO_STORAGE_TENANT = '0d205683f3b543beb7298e9b68e26b0f';
/**
 * Contabo Object Storage is path-style at {region}.contabostorage.com.
 * `s3.{region}.contabostorage.com` has no DNS (ENOTFOUND on the VPS).
 */
function resolveContaboEndpoint() {
    const raw = (process.env.CONTABO_ENDPOINT || exports.DEFAULT_CONTABO_ENDPOINT).trim();
    const region = (process.env.CONTABO_REGION || exports.DEFAULT_CONTABO_REGION).trim() || exports.DEFAULT_CONTABO_REGION;
    try {
        const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
        let host = url.hostname.toLowerCase().replace(/^s3\./, '');
        if (host === 'contabostorage.com') {
            host = `${region}.contabostorage.com`;
        }
        url.hostname = host.replace(/\.$/, '');
        url.protocol = 'https:';
        return url.origin;
    }
    catch {
        return exports.DEFAULT_CONTABO_ENDPOINT;
    }
}
function resolveContaboBucket() {
    return (process.env.CONTABO_BUCKET || exports.DEFAULT_CONTABO_BUCKET).trim();
}
function resolveContaboStorageTenant() {
    return firstNonEmpty(process.env.CONTABO_TENANT_ID, process.env.CONTABO_CUSTOMER_ID, exports.DEFAULT_CONTABO_STORAGE_TENANT);
}
/** Browser GET path uses `{accountId}:{bucket}`, not the bare bucket name. */
function resolveContaboPublicBucketSegment() {
    const bucket = resolveContaboBucket();
    const tenant = resolveContaboStorageTenant();
    if (!bucket)
        return tenant;
    if (bucket.includes(':'))
        return bucket;
    if (tenant && !bucket.startsWith(`${tenant}:`))
        return `${tenant}:${bucket}`;
    return bucket;
}
/**
 * Contabo returns 401 for https://{region}.contabostorage.com/{bucket}/key.
 * The working public form is https://{region}.contabostorage.com/{accountId}:{bucket}/key.
 */
function rewritePublicContaboUrl(url) {
    const raw = String(url || '').trim();
    if (!raw)
        return raw;
    try {
        const parsed = new URL(raw);
        if (!/contabostorage\.com$/i.test(parsed.hostname))
            return raw;
        const bucket = resolveContaboBucket();
        const segment = resolveContaboPublicBucketSegment();
        if (!segment)
            return raw;
        const parts = parsed.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
        if (parts.length === 0)
            return raw;
        const first = decodeURIComponent(parts[0]);
        if (first.includes(':'))
            return raw;
        if (bucket && first === bucket) {
            parts[0] = segment;
        }
        else {
            parts.unshift(segment);
        }
        parsed.pathname = `/${parts.join('/')}`;
        return parsed.toString();
    }
    catch {
        return raw;
    }
}
function firstNonEmpty(...values) {
    for (const value of values) {
        const trimmed = String(value || '').trim();
        if (trimmed)
            return trimmed;
    }
    return '';
}
function resolveContaboCredentials() {
    return {
        accessKeyId: firstNonEmpty(process.env.CONTABO_ACCESS_KEY, process.env.CONTABO_ACCESS_KEY_ID, process.env.AWS_ACCESS_KEY_ID),
        secretAccessKey: firstNonEmpty(process.env.CONTABO_SECRET_KEY, process.env.CONTABO_SECRET_ACCESS_KEY, process.env.AWS_SECRET_ACCESS_KEY),
    };
}
function sha256Hex(data) {
    return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
}
function sha256File(filePath) {
    return new Promise((resolve, reject) => {
        const hash = (0, crypto_1.createHash)('sha256');
        const stream = fs_1.default.createReadStream(filePath);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}
function hmac(key, data) {
    return (0, crypto_1.createHmac)('sha256', key).update(data).digest();
}
async function resolveContaboIPv4(hostname) {
    const lookup = (0, promises_1.lookup)(hostname, { family: 4 });
    const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`DNS lookup timed out for ${hostname}`)), 8000);
    });
    const { address } = await Promise.race([lookup, timeout]);
    return address;
}
function contaboObjectPath(bucket, key) {
    const keyPath = String(key || '')
        .split('/')
        .filter(Boolean)
        .map(encodeURIComponent)
        .join('/');
    return `/${bucket}/${keyPath}`;
}
/** Public HTTPS URL of an object. PUT still uses /{bucket}/key; browsers need /{accountId}:{bucket}/key. */
function publicContaboObjectUrl(key) {
    const objectKey = String(key || '').replace(/^\/+/, '');
    const configured = (process.env.CONTABO_PUBLIC_BASE_URL || '').trim();
    if (configured) {
        return rewritePublicContaboUrl(`${configured.replace(/\/+$/, '')}/${objectKey}`);
    }
    return `${resolveContaboEndpoint()}/${resolveContaboPublicBucketSegment()}/${objectKey
        .split('/')
        .filter(Boolean)
        .map(encodeURIComponent)
        .join('/')}`;
}
function formatContaboNetworkError(error) {
    const raw = String(error?.message || error || '');
    if (/altnames|CERT_ALTNAME|unable to verify the first certificate/i.test(raw)) {
        if (/airtel/i.test(raw)) {
            return 'Your ISP intercepted Contabo Object Storage (TLS certificate was Airtel, not Contabo). Retry on a different network/DNS (1.1.1.1), or upload from https://staging.invify.org instead of localhost.';
        }
        return 'TLS to Contabo Object Storage failed (certificate hostname mismatch). This is usually ISP HTTPS interception. Upload from https://staging.invify.org instead of localhost.';
    }
    return raw || 'Contabo Object Storage upload failed';
}
function formatContaboPutError(status, text) {
    const trimmed = String(text || '').trim();
    if (trimmed.startsWith('{')) {
        try {
            const parsed = JSON.parse(trimmed);
            return parsed.message || parsed.error || parsed.Message || `Contabo storage error (${status})`;
        }
        catch {
            /* fall through */
        }
    }
    const xmlMsg = trimmed.match(/<Message>([^<]+)<\/Message>/i);
    if (xmlMsg?.[1])
        return xmlMsg[1];
    if (trimmed)
        return `Contabo storage error (${status}): ${trimmed.slice(0, 300)}`;
    return `Contabo storage error (${status})`;
}
/** SigV4 PUT without AWS SDK checksums, chunked encoding, or XML error parsing. */
async function putContaboObject(params) {
    const { accessKeyId, secretAccessKey } = resolveContaboCredentials();
    if (!accessKeyId || !secretAccessKey) {
        throw new Error('Contabo S3 credentials are missing (CONTABO_ACCESS_KEY / CONTABO_SECRET_KEY).');
    }
    if (!params.filePath && !params.body) {
        throw new Error('Contabo PUT requires a file path or a buffer');
    }
    const origin = resolveContaboEndpoint();
    const endpoint = new URL(origin);
    const hostname = endpoint.hostname;
    const port = endpoint.port ? Number(endpoint.port) : 443;
    const path = contaboObjectPath(params.bucket, params.key);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const region = (process.env.CONTABO_REGION || exports.DEFAULT_CONTABO_REGION).trim() || exports.DEFAULT_CONTABO_REGION;
    const contentType = params.contentType || 'application/octet-stream';
    const contentLength = params.filePath
        ? (await fs_1.default.promises.stat(params.filePath)).size
        : params.body.byteLength;
    const payloadHash = params.filePath
        ? await sha256File(params.filePath)
        : sha256Hex(params.body);
    const canonicalHeaders = `content-length:${contentLength}\n` +
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
    const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region), 's3'), 'aws4_request');
    const signature = hmac(signingKey, stringToSign).toString('hex');
    const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`;
    const started = Date.now();
    const address = await resolveContaboIPv4(hostname);
    console.log(`[contabo] PUT ${hostname}${path} (${contentLength} bytes) via ${address}`);
    await new Promise((resolve, reject) => {
        let settled = false;
        let bodyStarted = false;
        let lastWritten = 0;
        let lastProgressAt = Date.now();
        const agent = new https_1.default.Agent({ keepAlive: false, maxSockets: 1 });
        const finish = (error) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(watchdog);
            clearInterval(progress);
            agent.destroy();
            if (error)
                reject(new Error(formatContaboNetworkError(error)));
            else
                resolve();
        };
        const watchdog = setTimeout(() => {
            req.destroy();
            finish(new Error('Contabo Object Storage upload timed out'));
        }, 30 * 60 * 1000);
        const req = https_1.default.request({
            hostname,
            port,
            method: 'PUT',
            path,
            family: 4,
            servername: hostname,
            agent,
            headers: {
                host: hostname,
                'content-type': contentType,
                'content-length': contentLength,
                'x-amz-content-sha256': payloadHash,
                'x-amz-date': amzDate,
                authorization,
            },
        }, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const status = res.statusCode || 0;
                const text = Buffer.concat(chunks).toString('utf8');
                const elapsed = Date.now() - started;
                if (status >= 200 && status < 300) {
                    console.log(`[contabo] PUT ${status} in ${elapsed}ms`);
                    finish();
                    return;
                }
                console.error(`[contabo] PUT ${status} in ${elapsed}ms: ${text.slice(0, 300)}`);
                finish(new Error(formatContaboPutError(status, text)));
            });
        });
        const progress = setInterval(() => {
            const written = Number(req.socket?.bytesWritten || 0);
            console.log(`[contabo] PUT progress ${written}/${contentLength} bytes`);
            params.onProgress?.(written, contentLength);
            if (written > lastWritten) {
                lastWritten = written;
                lastProgressAt = Date.now();
            }
            else if (Date.now() - lastProgressAt > 90 * 1000) {
                req.destroy();
                finish(new Error('Contabo Object Storage upload stalled'));
            }
        }, 5000);
        const startBody = () => {
            if (bodyStarted)
                return;
            bodyStarted = true;
            lastProgressAt = Date.now();
            console.log(`[contabo] tls ready, sending body`);
            if (params.filePath) {
                const stream = fs_1.default.createReadStream(params.filePath, { highWaterMark: 1024 * 1024 });
                stream.on('error', (error) => {
                    req.destroy();
                    finish(error);
                });
                stream.pipe(req);
            }
            else {
                req.end(params.body);
            }
        };
        req.on('error', (error) => finish(error));
        req.on('socket', (socket) => {
            console.log(`[contabo] socket ${socket.remoteAddress || 'connecting'}`);
            socket.setNoDelay(true);
            if (socket.encrypted) {
                socket.once('secureConnect', startBody);
            }
            else {
                socket.once('connect', startBody);
            }
        });
    });
}
function createContaboS3Client() {
    process.env.AWS_REQUEST_CHECKSUM_CALCULATION ||= 'WHEN_REQUIRED';
    process.env.AWS_RESPONSE_CHECKSUM_VALIDATION ||= 'WHEN_REQUIRED';
    const { accessKeyId, secretAccessKey } = resolveContaboCredentials();
    const client = new client_s3_1.S3Client({
        endpoint: resolveContaboEndpoint(),
        region: (process.env.CONTABO_REGION || exports.DEFAULT_CONTABO_REGION).trim() || exports.DEFAULT_CONTABO_REGION,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
        forcePathStyle: true,
        tls: true,
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
    });
    const stripAwsChecksumHeaders = (next) => async (args) => {
        const headers = args?.request?.headers;
        if (headers && typeof headers === 'object') {
            for (const key of Object.keys(headers)) {
                const lower = key.toLowerCase();
                if (lower.startsWith('x-amz-checksum-') ||
                    lower === 'x-amz-sdk-checksum-algorithm' ||
                    lower === 'x-amz-trailer' ||
                    lower === 'x-amz-decoded-content-length') {
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
//# sourceMappingURL=contabo-s3.js.map