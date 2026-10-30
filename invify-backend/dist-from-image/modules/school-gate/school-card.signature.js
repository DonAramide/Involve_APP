"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIGNATURE_STORAGE_PREREQUISITE = void 0;
exports.validateSchoolSignature = validateSchoolSignature;
const image_validator_1 = require("../../utils/image-validator");
const school_card_errors_1 = require("./school-card.errors");
exports.SIGNATURE_STORAGE_PREREQUISITE = [
    'A private, tenant-scoped signature store is not configured.',
    'The Contabo helper is not used: it accepts an http or https address unchanged and can publish a public object under an agents or institutions prefix.',
    'The store must accept only validated PNG, JPEG, or WebP bytes up to 2MB and return an access-controlled https address.',
    'That address is saved with the signatory name and designation in the same settings transaction as the settings_saved audit.',
    'A typed URL or a data URL is not a signature.',
].join(' ');
const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;
function validateSchoolSignature(image) {
    if (typeof image !== 'string' || image.trim() === '') {
        throw new school_card_errors_1.SchoolCardError('Choose a PNG, JPEG, or WebP signature image.', 400, 'INVALID_SIGNATURE');
    }
    const trimmed = image.trim();
    if (/^https?:\/\//i.test(trimmed)) {
        throw new school_card_errors_1.SchoolCardError('A signature cannot be an external address.', 400, 'INVALID_SIGNATURE');
    }
    try {
        const validated = (0, image_validator_1.validateImageBase64)(trimmed, {
            maxSizeBytes: MAX_SIGNATURE_BYTES,
            minWidth: 32,
            minHeight: 32,
            maxWidth: 4096,
            maxHeight: 4096,
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
        });
        return { buffer: validated.buffer, contentType: validated.contentType };
    }
    catch (error) {
        if (error instanceof school_card_errors_1.SchoolCardError)
            throw error;
        const message = error instanceof image_validator_1.ImageValidationError
            ? 'The signature image must be a PNG, JPEG, or WebP file of 2MB or less.'
            : 'The signature image could not be read.';
        throw new school_card_errors_1.SchoolCardError(message, 400, 'INVALID_SIGNATURE');
    }
}
//# sourceMappingURL=school-card.signature.js.map