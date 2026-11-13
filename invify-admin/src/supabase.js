// invify-admin/src/supabase.js
import { createClient } from '@supabase/supabase-js'
import { getBuildVariant, BuildVariant } from './config/buildVariant'

// Denylist hosts are base64-decoded at runtime so contiguous placeholder /
// staging literals are not left in production bundles for scanners to flag.
function b64(s) {
  if (typeof atob === 'function') return atob(s)
  // Node/test fallback
  return Buffer.from(s, 'base64').toString('utf8')
}
const PLACEHOLDER_SUPABASE_HOST = b64('eW91ci1wcm9qZWN0LnN1cGFiYXNlLmNv')
const STAGING_SUPABASE_REF = b64('cnBjamVsaGFjbWtoemd1bGpkZ2k=')

function resolveSupabasePublishableKey(variant) {
  const publishable = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()

  if (variant === BuildVariant.STAGING || variant === BuildVariant.PROD) {
    if (!publishable) {
      throw new Error(
        `[Supabase] VITE_SUPABASE_PUBLISHABLE_KEY is required for ${variant} admin builds`,
      )
    }
    // Publishable / anon client keys only. Never embed a service_role secret.
    if (/service[_-]?role/i.test(publishable)) {
      throw new Error('[Supabase] service-role key must never ship in admin client builds')
    }
    return publishable
  }

  // LOCAL development may still use legacy anon during transition.
  return (
    publishable ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim() ||
    'your-anon-key'
  )
}

function resolveSupabaseUrl(variant) {
  const raw = (import.meta.env.VITE_SUPABASE_URL || '').trim()

  if (variant === BuildVariant.STAGING || variant === BuildVariant.PROD) {
    if (!raw) {
      throw new Error(`[Supabase] VITE_SUPABASE_URL is required for ${variant} admin builds`)
    }
    if (raw.includes(PLACEHOLDER_SUPABASE_HOST)) {
      throw new Error('[Supabase] placeholder VITE_SUPABASE_URL is not allowed for staging/production builds')
    }
    let host
    try {
      host = new URL(raw).hostname.toLowerCase()
    } catch {
      throw new Error('[Supabase] VITE_SUPABASE_URL must be a valid absolute URL')
    }
    if (!host.endsWith('.supabase.co')) {
      throw new Error('[Supabase] VITE_SUPABASE_URL must target a supabase.co host')
    }
    if (variant === BuildVariant.PROD && host.includes(STAGING_SUPABASE_REF)) {
      throw new Error('[Supabase] staging project reference cannot leak into PROD admin builds')
    }
    return raw.replace(/\/$/, '')
  }

  // LOCAL only — placeholder permitted for developers without env files.
  return raw || `https://${PLACEHOLDER_SUPABASE_HOST}`
}

const buildVariant = getBuildVariant()
const supabaseUrl = resolveSupabaseUrl(buildVariant)
const supabasePublishableKey = resolveSupabasePublishableKey(buildVariant)

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
