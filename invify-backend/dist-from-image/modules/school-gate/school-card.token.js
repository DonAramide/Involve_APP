"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBarcodeToken = createBarcodeToken;
exports.sha256Hex = sha256Hex;
const crypto_1 = require("crypto");
/** 32 cryptographically random bytes, encoded for Code 128 subset B. Only the hash is stored. */
function createBarcodeToken() {
    const raw = (0, crypto_1.randomBytes)(32).toString('base64url');
    return { raw, sha256: sha256Hex(raw) };
}
function sha256Hex(value) {
    return (0, crypto_1.createHash)('sha256').update(value, 'utf8').digest('hex');
}
//# sourceMappingURL=school-card.token.js.map