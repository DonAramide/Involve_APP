// src/utils/image-validator.ts

export interface ImageValidationOptions {
  maxSizeBytes?: number; // default: 2MB (2,097,152 bytes)
  minWidth?: number;     // default: 32
  minHeight?: number;    // default: 32
  maxWidth?: number;     // default: 4096
  maxHeight?: number;    // default: 4096
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

export class ImageValidationError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'ImageValidationError';
  }
}

export const RECOMMENDED_LOGO_DIMENSIONS = {
  width: 512,
  height: 512,
  aspectRatio: '1:1',
  maxSizeBytes: 3 * 1024 * 1024, // 3MB
  allowedFormats: ['png', 'jpeg', 'webp'] as const,
};

const DEFAULT_OPTIONS: Required<ImageValidationOptions> = {
  maxSizeBytes: 3 * 1024 * 1024, // 3MB (Standardized)
  minWidth: 32,
  minHeight: 32,
  maxWidth: 4096,
  maxHeight: 4096,
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
};

/**
 * Extracts width and height from image buffer headers without native binaries.
 */
export function getImageDimensions(buffer: Buffer): { width: number; height: number; format: 'png' | 'jpeg' | 'webp' } {
  if (buffer.length < 16) {
    throw new ImageValidationError('Image payload too small to be a valid file.');
  }

  // 1. PNG Check (8-byte signature: 89 50 4E 47 0D 0A 1A 0A)
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    if (buffer.length < 24) throw new ImageValidationError('Truncated PNG header.');
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height, format: 'png' };
  }

  // 2. JPEG Check (FF D8 FF)
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buffer[offset + 1];
      // SOF markers: C0..C3, C5..C7, C9..CB, CD..CF
      const isSof =
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf);

      if (isSof) {
        if (offset + 9 > buffer.length) break;
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height, format: 'jpeg' };
      }

      // Next marker
      if (offset + 4 > buffer.length) break;
      const length = buffer.readUInt16BE(offset + 2);
      offset += 2 + length;
    }
    throw new ImageValidationError('Invalid JPEG: Missing SOF frame header.');
  }

  // 3. WebP Check (RIFF ... WEBP)
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    const chunkType = buffer.toString('ascii', 12, 16);
    if (chunkType === 'VP8 ') {
      // Lossy VP8
      if (buffer.length < 30) throw new ImageValidationError('Truncated WebP VP8 header.');
      const width = buffer.readUInt16LE(26) & 0x3fff;
      const height = buffer.readUInt16LE(28) & 0x3fff;
      return { width, height, format: 'webp' };
    } else if (chunkType === 'VP8L') {
      // Lossless VP8L
      if (buffer.length < 25) throw new ImageValidationError('Truncated WebP VP8L header.');
      const b1 = buffer[21];
      const b2 = buffer[22];
      const b3 = buffer[23];
      const b4 = buffer[24];
      const width = 1 + (((b2 & 0x3f) << 8) | b1);
      const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
      return { width, height, format: 'webp' };
    } else if (chunkType === 'VP8X') {
      // Extended VP8X
      if (buffer.length < 30) throw new ImageValidationError('Truncated WebP VP8X header.');
      const width = 1 + buffer.readUIntLE(24, 3);
      const height = 1 + buffer.readUIntLE(27, 3);
      return { width, height, format: 'webp' };
    }
    throw new ImageValidationError(`Unsupported WebP chunk type: ${chunkType}`);
  }

  throw new ImageValidationError('Unsupported image format. File must be PNG, JPEG, or WebP.');
}

/**
 * Validates a base64 Data URI or raw base64 string against format, size, and dimensions.
 */
export function validateImageBase64(
  base64Data: string,
  options?: ImageValidationOptions
): ValidatedImage {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!base64Data || typeof base64Data !== 'string') {
    throw new ImageValidationError('Image data is missing or empty.');
  }

  const matches = base64Data.match(/^data:([A-Za-z0-9\-+\/]+);base64,(.+)$/);
  let rawBase64 = base64Data;
  let declaredMime = '';

  if (matches && matches.length === 3) {
    declaredMime = matches[1].toLowerCase();
    rawBase64 = matches[2];
  }

  const buffer = Buffer.from(rawBase64, 'base64');
  const sizeBytes = buffer.length;

  if (sizeBytes === 0) {
    throw new ImageValidationError('Decoded image buffer is empty.');
  }

  if (sizeBytes > opts.maxSizeBytes) {
    const maxMb = (opts.maxSizeBytes / (1024 * 1024)).toFixed(1);
    const actualMb = (sizeBytes / (1024 * 1024)).toFixed(2);
    throw new ImageValidationError(
      `Logo image exceeds maximum allowed size of ${maxMb}MB (received ${actualMb}MB).`
    );
  }

  // Inspect binary magic bytes and dimensions
  const { width, height, format } = getImageDimensions(buffer);

  const canonicalMime = format === 'jpeg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp';

  if (declaredMime && !opts.allowedMimeTypes.includes(declaredMime)) {
    throw new ImageValidationError(
      `Declared MIME type "${declaredMime}" is not supported. Must be PNG, JPEG, or WebP.`
    );
  }

  if (!opts.allowedMimeTypes.includes(canonicalMime)) {
    throw new ImageValidationError(
      `Detected image format "${format}" is not permitted. Allowed: PNG, JPEG, WebP.`
    );
  }

  if (width < opts.minWidth || height < opts.minHeight) {
    throw new ImageValidationError(
      `Image dimensions (${width}x${height}px) are below minimum required size of ${opts.minWidth}x${opts.minHeight}px.`
    );
  }

  if (width > opts.maxWidth || height > opts.maxHeight) {
    throw new ImageValidationError(
      `Image dimensions (${width}x${height}px) exceed maximum allowed size of ${opts.maxWidth}x${opts.maxHeight}px.`
    );
  }

  return {
    buffer,
    contentType: canonicalMime,
    extension: format,
    width,
    height,
    sizeBytes,
  };
}
