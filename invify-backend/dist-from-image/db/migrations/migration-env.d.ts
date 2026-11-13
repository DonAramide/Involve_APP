/**
 * Resolve Supabase credentials for migration runners from the process environment.
 * Never embed API keys in migration source.
 */
export declare function resolveMigrationSupabaseCredentials(): {
    url: string;
    serviceKey: string;
};
