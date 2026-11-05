"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mintLegacyServiceRoleJwt = mintLegacyServiceRoleJwt;
exports.resolvePostgrestServiceKey = resolvePostgrestServiceKey;
exports.privilegedAdminCreateClientArgs = privilegedAdminCreateClientArgs;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function mintLegacyServiceRoleJwt(jwtSecret) {
    return jsonwebtoken_1.default.sign({ iss: 'supabase', role: 'service_role' }, jwtSecret, { algorithm: 'HS256', expiresIn: '87600h' });
}
function resolvePostgrestServiceKey(serviceKey, jwtSecret) {
    if (serviceKey.startsWith('sb_secret_') && jwtSecret.length >= 16) {
        return mintLegacyServiceRoleJwt(jwtSecret);
    }
    return serviceKey;
}
/**
 * New sb_secret keys are API keys, not JWTs. supabase-js puts the second
 * createClient argument in `apikey`; a minted HS256 JWT is rejected there.
 * Use the secret key as apikey and (when minting is possible) put the JWT
 * only on Authorization so PostgREST still sees role=service_role.
 */
function privilegedAdminCreateClientArgs(serviceKey, jwtSecret) {
    if (serviceKey.startsWith('sb_secret_')) {
        const minted = resolvePostgrestServiceKey(serviceKey, jwtSecret);
        if (minted !== serviceKey) {
            return {
                apiKey: serviceKey,
                options: { global: { headers: { Authorization: `Bearer ${minted}` } } },
            };
        }
        return { apiKey: serviceKey, options: {} };
    }
    return { apiKey: serviceKey, options: {} };
}
//# sourceMappingURL=postgrest-service-key.js.map