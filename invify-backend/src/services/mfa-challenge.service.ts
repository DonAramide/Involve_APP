import { randomUUID } from 'node:crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';

export type MfaOperation = 'setup' | 'verify';

export interface MfaPendingSession {
  token: string;
  refreshToken: string;
}

interface StoredChallenge {
  jti: string;
  userId: string;
  operation: MfaOperation;
  expiresAt: number;
  session: MfaPendingSession;
}

export interface ValidatedMfaChallenge {
  jti: string;
  userId: string;
  operation: MfaOperation;
  expiresAt: number;
}

export class MfaChallengeError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'MfaChallengeError';
  }
}

const CHALLENGE_TTL_SECONDS = 5 * 60;
const ISSUER = 'invify-auth';
const AUDIENCE = 'invify-mfa';
const activeChallenges = new Map<string, StoredChallenge>();

function signingSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new MfaChallengeError(
      'MFA_SIGNING_NOT_CONFIGURED',
      503,
      'MFA challenge signing is not securely configured',
    );
  }
  return secret;
}

function purgeExpiredChallenges(now = Date.now()): void {
  for (const [jti, challenge] of activeChallenges) {
    if (challenge.expiresAt <= now) activeChallenges.delete(jti);
  }
}

export function issueMfaChallenge(
  userId: string,
  operation: MfaOperation,
  session: MfaPendingSession,
): { token: string; expiresAt: number } {
  if (!userId || !session?.token || !session?.refreshToken) {
    throw new MfaChallengeError(
      'MFA_CHALLENGE_CONTEXT_MISSING',
      500,
      'MFA challenge context is incomplete',
    );
  }

  purgeExpiredChallenges();
  const secret = signingSecret();
  const jti = randomUUID();
  const expiresAt = Date.now() + CHALLENGE_TTL_SECONDS * 1000;
  const token = jwt.sign(
    {
      sub: userId,
      purpose: 'mfa_challenge',
      operation,
    },
    secret,
    {
      algorithm: 'HS256',
      audience: AUDIENCE,
      issuer: ISSUER,
      jwtid: jti,
      expiresIn: CHALLENGE_TTL_SECONDS,
    },
  );

  activeChallenges.set(jti, { jti, userId, operation, expiresAt, session });
  return { token, expiresAt };
}

export function validateMfaChallenge(
  token: string,
  expectedOperation: MfaOperation,
  requestedUserId?: string,
): ValidatedMfaChallenge {
  if (!token) {
    throw new MfaChallengeError('MFA_CHALLENGE_REQUIRED', 401, 'MFA challenge is required');
  }

  let payload: JwtPayload;
  try {
    const verified = jwt.verify(token, signingSecret(), {
      algorithms: ['HS256'],
      audience: AUDIENCE,
      issuer: ISSUER,
    });
    if (typeof verified === 'string') throw new Error('Invalid challenge payload');
    payload = verified;
  } catch (error) {
    if (error instanceof MfaChallengeError) throw error;
    throw new MfaChallengeError(
      'MFA_CHALLENGE_INVALID',
      401,
      'MFA challenge is invalid or expired',
    );
  }

  const jti = payload.jti;
  const userId = payload.sub;
  const operation = payload.operation;
  if (
    !jti ||
    !userId ||
    payload.purpose !== 'mfa_challenge' ||
    operation !== expectedOperation
  ) {
    throw new MfaChallengeError(
      'MFA_CHALLENGE_INVALID',
      401,
      'MFA challenge is invalid for this operation',
    );
  }

  const stored = activeChallenges.get(jti);
  if (
    !stored ||
    stored.expiresAt <= Date.now() ||
    stored.userId !== userId ||
    stored.operation !== expectedOperation
  ) {
    activeChallenges.delete(jti);
    throw new MfaChallengeError(
      'MFA_CHALLENGE_INVALID',
      401,
      'MFA challenge is invalid, expired, or already used',
    );
  }

  if (requestedUserId && requestedUserId !== userId) {
    throw new MfaChallengeError(
      'MFA_CHALLENGE_USER_MISMATCH',
      403,
      'MFA challenge is not authorized for the requested user',
    );
  }

  return {
    jti,
    userId,
    operation: expectedOperation,
    expiresAt: stored.expiresAt,
  };
}

export function consumeMfaChallenge(challenge: ValidatedMfaChallenge): MfaPendingSession {
  const stored = activeChallenges.get(challenge.jti);
  if (
    !stored ||
    stored.expiresAt <= Date.now() ||
    stored.userId !== challenge.userId ||
    stored.operation !== challenge.operation
  ) {
    activeChallenges.delete(challenge.jti);
    throw new MfaChallengeError(
      'MFA_CHALLENGE_INVALID',
      401,
      'MFA challenge is invalid, expired, or already used',
    );
  }

  activeChallenges.delete(challenge.jti);
  return stored.session;
}

export function resetMfaChallengesForTests(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('MFA challenge reset is test-only');
  }
  activeChallenges.clear();
}
