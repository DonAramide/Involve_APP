export declare function mintLegacyServiceRoleJwt(jwtSecret: string): string;
export declare function resolvePostgrestServiceKey(serviceKey: string, jwtSecret: string): string;
/**
 * New sb_secret keys are API keys, not JWTs. supabase-js puts the second
 * createClient argument in `apikey`; a minted HS256 JWT is rejected there.
 * Use the secret key as apikey and (when minting is possible) put the JWT
 * only on Authorization so PostgREST still sees role=service_role.
 */
export declare function privilegedAdminCreateClientArgs(serviceKey: string, jwtSecret: string): {
    apiKey: string;
    options: {
        global?: {
            headers: {
                Authorization: string;
            };
        };
    };
};
