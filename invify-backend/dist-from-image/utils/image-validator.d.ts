export interface ImageValidationOptions {
    maxSizeBytes?: number;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    allowedMimeTypes?: string[];
}
export interface ValidatedImage {
    buffer: Buffer;
    contentType: string;
    extension: 'png' | 'jpeg' | 'webp';
    width: number;
    height: number;
    sizeBytes: number;
}
export declare class ImageValidationError extends Error {
    statusCode: number;
    constructor(message: string, statusCode?: number);
}
export declare const RECOMMENDED_LOGO_DIMENSIONS: {
    width: number;
    height: number;
    aspectRatio: string;
    maxSizeBytes: number;
    allowedFormats: readonly ["png", "jpeg", "webp"];
};
/**
 * Extracts width and height from image buffer headers without native binaries.
 */
export declare function getImageDimensions(buffer: Buffer): {
    width: number;
    height: number;
    format: 'png' | 'jpeg' | 'webp';
};
/**
 * Validates a base64 Data URI or raw base64 string against format, size, and dimensions.
 */
export declare function validateImageBase64(base64Data: string, options?: ImageValidationOptions): ValidatedImage;
