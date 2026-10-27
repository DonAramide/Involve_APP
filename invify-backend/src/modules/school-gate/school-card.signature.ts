import { ImageValidationError, validateImageBase64 } from '../../utils/image-validator';
import { SchoolCardError } from './school-card.errors';

export const SIGNATURE_STORAGE_PREREQUISITE = [
  'A private, tenant-scoped signature store is not configured.',
  'The Contabo helper is not used: it accepts an http or https address unchanged and can publish a public object under an agents or institutions prefix.',
  'The store must accept only validated PNG, JPEG, or WebP bytes up to 2MB and return an access-controlled https address.',
  'That address is saved with the signatory name and designation in the same settings transaction as the settings_saved audit.',
  'A typed URL or a data URL is not a signature.',
].join(' ');

const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

export interface SchoolSignatureUploader {
  put(input: { tenantId: string; body: Buffer; contentType: string }): Promise<string>;
}

export function validateSchoolSignature(image: unknown): { buffer: Buffer; contentType: string } {
  if (typeof image !== 'string' || image.trim() === '') {
    throw new SchoolCardError('Choose a PNG, JPEG, or WebP signature image.', 400, 'INVALID_SIGNATURE');
  }
  const trimmed = image.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    throw new SchoolCardError('A signature cannot be an external address.', 400, 'INVALID_SIGNATURE');
  }
  try {
    const validated = validateImageBase64(trimmed, {
      maxSizeBytes: MAX_SIGNATURE_BYTES,
      minWidth: 32,
      minHeight: 32,
      maxWidth: 4096,
      maxHeight: 4096,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
    });
    return { buffer: validated.buffer, contentType: validated.contentType };
  } catch (error) {
    if (error instanceof SchoolCardError) throw error;
    const message = error instanceof ImageValidationError
      ? 'The signature image must be a PNG, JPEG, or WebP file of 2MB or less.'
      : 'The signature image could not be read.';
    throw new SchoolCardError(message, 400, 'INVALID_SIGNATURE');
  }
}
