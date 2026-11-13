import { S3Client } from '@aws-sdk/client-s3';
export declare const DEFAULT_CONTABO_BUCKET = "iips.stargazer.bucket";
export declare const DEFAULT_CONTABO_ENDPOINT = "https://usc1.contabostorage.com";
export declare const DEFAULT_CONTABO_REGION = "usc1";
/** Contabo Object Storage account id used in public path-style URLs: /{accountId}:{bucket}/key */
export declare const DEFAULT_CONTABO_STORAGE_TENANT = "0d205683f3b543beb7298e9b68e26b0f";
/**
 * Contabo Object Storage is path-style at {region}.contabostorage.com.
 * `s3.{region}.contabostorage.com` has no DNS (ENOTFOUND on the VPS).
 */
export declare function resolveContaboEndpoint(): string;
export declare function resolveContaboBucket(): string;
export declare function resolveContaboStorageTenant(): string;
/** Browser GET path uses `{accountId}:{bucket}`, not the bare bucket name. */
export declare function resolveContaboPublicBucketSegment(): string;
/**
 * Contabo returns 401 for https://{region}.contabostorage.com/{bucket}/key.
 * The working public form is https://{region}.contabostorage.com/{accountId}:{bucket}/key.
 */
export declare function rewritePublicContaboUrl(url: string): string;
export declare function resolveContaboCredentials(): {
    accessKeyId: string;
    secretAccessKey: string;
};
export declare function contaboObjectPath(bucket: string, key: string): string;
/** Public HTTPS URL of an object. PUT still uses /{bucket}/key; browsers need /{accountId}:{bucket}/key. */
export declare function publicContaboObjectUrl(key: string): string;
export declare function formatContaboNetworkError(error: unknown): string;
export declare function formatContaboPutError(status: number, text: string): string;
/** SigV4 PUT without AWS SDK checksums, chunked encoding, or XML error parsing. */
export declare function putContaboObject(params: {
    bucket: string;
    key: string;
    body?: Buffer;
    filePath?: string;
    contentType: string;
    onProgress?: (written: number, total: number) => void;
}): Promise<void>;
export declare function createContaboS3Client(): S3Client;
