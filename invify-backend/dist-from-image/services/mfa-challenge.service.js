"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MfaChallengeError = void 0;
exports.issueMfaChallenge = issueMfaChallenge;
exports.validateMfaChallenge = validateMfaChallenge;
exports.consumeMfaChallenge = consumeMfaChallenge;
exports.resetMfaChallengesForTests = resetMfaChallengesForTests;
const node_crypto_1 = require("node:crypto");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class MfaChallengeError extends Error {
    code;
    status;
    constructor(code, status, message) {
        super(message);
        this.code = code;
        this.status = status;
        this.name = 'MfaChallengeError';
    }
}
exports.MfaChallengeError = MfaChallengeError;
const CHALLENGE_TTL_SECONDS = 5 * 60;
const ISSUER = 'invify-auth';
const AUDIENCE = 'invify-mfa';
const activeChallenges = new Map();
function signingSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        throw new MfaChallengeError('MFA_SIGNING_NOT_CONFIGURED', 503, 'MFA challenge signing is not securely configured');
    }
    return secret;
}
function purgeExpiredChallenges(now = Date.now()) {
    for (const [jti, challenge] of activeChallenges) {
        if (challenge.expiresAt <= now)
            activeChallenges.delete(jti);
    }
}
function issueMfaChallenge(userId, operation, session, snapshot) {
    if (!userId || !session?.token || !session?.refreshToken) {
        throw new MfaChallengeError('MFA_CHALLENGE_CONTEXT_MISSING', 500, 'MFA challenge context is incomplete');
    }
    purgeExpiredChallenges();
    const secret = signingSecret();
    const jti = (0, node_crypto_1.randomUUID)();
    const expiresAt = Date.now() + CHALLENGE_TTL_SECONDS * 1000;
    const token = jsonwebtoken_1.default.sign({
        sub: userId,
        purpose: 'mfa_challenge',
        operation,
    }, secret, {
        algorithm: 'HS256',
        audience: AUDIENCE,
        issuer: ISSUER,
        jwtid: jti,
        expiresIn: CHALLENGE_TTL_SECONDS,
    });
    activeChallenges.set(jti, { jti, userId, operation, expiresAt, session, snapshot });
    return { token, expiresAt };
}
function validateMfaChallenge(token, expectedOperation, requestedUserId) {
    if (!token) {
        throw new MfaChallengeError('MFA_CHALLENGE_REQUIRED', 401, 'MFA challenge is required');
    }
    let payload;
    try {
        const verified = jsonwebtoken_1.default.verify(token, signingSecret(), {
            algorithms: ['HS256'],
            audience: AUDIENCE,
            issuer: ISSUER,
        });
        if (typeof verified === 'string')
            throw new Error('Invalid challenge payload');
        payload = verified;
    }
    catch (error) {
        if (error instanceof MfaChallengeError)
            throw error;
        throw new MfaChallengeError('MFA_CHALLENGE_INVALID', 401, 'MFA challenge is invalid or expired');
    }
    const jti = payload.jti;
    const userId = payload.sub;
    const operation = payload.operation;
    if (!jti ||
        !userId ||
        payload.purpose !== 'mfa_challenge' ||
        operation !== expectedOperation) {
        throw new MfaChallengeError('MFA_CHALLENGE_INVALID', 401, 'MFA challenge is invalid for this operation');
    }
    const stored = activeChallenges.get(jti);
    if (!stored ||
        stored.expiresAt <= Date.now() ||
        stored.userId !== userId ||
        stored.operation !== expectedOperation) {
        activeChallenges.delete(jti);
        throw new MfaChallengeError('MFA_CHALLENGE_INVALID', 401, 'MFA challenge is invalid, expired, or already used');
    }
    if (requestedUserId && requestedUserId !== userId) {
        throw new MfaChallengeError('MFA_CHALLENGE_USER_MISMATCH', 403, 'MFA challenge is not authorized for the requested user');
    }
    return {
        jti,
        userId,
        operation: expectedOperation,
        expiresAt: stored.expiresAt,
        snapshot: stored.snapshot,
    };
}
function consumeMfaChallenge(challenge) {
    const stored = activeChallenges.get(challenge.jti);
    if (!stored ||
        stored.expiresAt <= Date.now() ||
        stored.userId !== challenge.userId ||
        stored.operation !== challenge.operation) {
        activeChallenges.delete(challenge.jti);
        throw new MfaChallengeError('MFA_CHALLENGE_INVALID', 401, 'MFA challenge is invalid, expired, or already used');
    }
    activeChallenges.delete(challenge.jti);
    return stored.session;
}
function resetMfaChallengesForTests() {
    if (process.env.NODE_ENV !== 'test') {
        throw new Error('MFA challenge reset is test-only');
    }
    activeChallenges.clear();
}
//# sourceMappingURL=mfa-challenge.service.js.map