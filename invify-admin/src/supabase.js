// invify-admin/src/supabase.js
import { createClient } from '@supabase/supabase-js'
import { getBuildVariant, BuildVariant } from './config/buildVariant'

function resolveSupabasePublishableKey() {
  const variant = getBuildVariant()
  const publishable = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()

  if (variant === BuildVariant.STAGING || variant === BuildVariant.PROD) {
    if (!publishable) {
      throw new Error(
        `[Supabase] VITE_SUPABASE_PUBLISHABLE_KEY is required for ${variant} admin builds`,
      )
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

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL || '').trim() || 'https://your-project.supabase.co'
const supabasePublishableKey = resolveSupabasePublishableKey()

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
