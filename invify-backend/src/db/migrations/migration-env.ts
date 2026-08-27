/**
 * Resolve Supabase credentials for migration runners from the process environment.
 * Never embed API keys in migration source.
 */
export function resolveMigrationSupabaseCredentials(): { url: string; serviceKey: string } {
  const variant = process.env.BUILD_VARIANT || 'LOCAL';

  if (variant === 'STAGING') {
    const url = process.env.STAGING_SUPABASE_URL || '';
    const serviceKey = process.env.STAGING_SUPABASE_SECRET_KEY || '';
    if (!url || !serviceKey) {
      throw new Error(
        'Staging migrations require STAGING_SUPABASE_URL and STAGING_SUPABASE_SECRET_KEY in the execution environment',
      );
    }
    return { url, serviceKey };
  }

  if (variant === 'PROD') {
    const url = process.env.PROD_SUPABASE_URL || '';
    const serviceKey = process.env.PROD_SUPABASE_SECRET_KEY || '';
    if (!url || !serviceKey) {
      throw new Error('Production migrations require PROD_SUPABASE_URL and PROD_SUPABASE_SECRET_KEY');
    }
    return { url, serviceKey };
  }

  // LOCAL / default
  const url = process.env.LOCAL_SUPABASE_URL || process.env.DEV_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceKey =
    process.env.LOCAL_SUPABASE_SERVICE_KEY ||
    process.env.DEV_SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';

  if (!url || !serviceKey) {
    throw new Error('Local migrations require LOCAL_SUPABASE_URL and LOCAL_SUPABASE_SERVICE_KEY (or legacy SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }

  return { url, serviceKey };
}
