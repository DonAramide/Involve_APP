"use strict";
// ─── Core governance policy types ────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.computePolicyHash = computePolicyHash;
exports.generatePolicyId = generatePolicyId;
/** Compute a deterministic content hash from policy fields */
function computePolicyHash(type, version, data, createdBy, effectiveDate) {
    const raw = `${type}:${version}:${JSON.stringify(data)}:${createdBy}:${effectiveDate}`;
    return Buffer.from(raw).toString('base64').substring(0, 16).toUpperCase();
}
/** Generate a unique policy ID */
function generatePolicyId(type, version) {
    return `POL-${type}-V${version}-${Date.now().toString(36).toUpperCase()}`;
}
//# sourceMappingURL=GovernancePolicy.js.map