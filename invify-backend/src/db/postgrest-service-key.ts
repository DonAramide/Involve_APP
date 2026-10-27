import jwt from 'jsonwebtoken';

export function mintLegacyServiceRoleJwt(jwtSecret: string): string {
  return jwt.sign(
    { iss: 'supabase', role: 'service_role' },
    jwtSecret,
    { algorithm: 'HS256', expiresIn: '87600h' },
  );
}

export function resolvePostgrestServiceKey(serviceKey: string, jwtSecret: string): string {
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
export function privilegedAdminCreateClientArgs(
  serviceKey: string,
  jwtSecret: string,
): {
  apiKey: string;
  options: { global?: { headers: { Authorization: string } } };
} {
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
