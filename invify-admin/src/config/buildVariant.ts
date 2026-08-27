export enum BuildVariant {
  LOCAL = 'LOCAL',
  STAGING = 'STAGING',
  PROD = 'PROD'
}

/**
 * Explicit admin build variant.
 * Production Vite builds (MODE=production / PROD) require VITE_BUILD_VARIANT=PROD.
 * Staging builds require VITE_BUILD_VARIANT=STAGING (or MODE=staging).
 */
export function getBuildVariant(): BuildVariant {
  const raw = (
    import.meta.env.VITE_BUILD_VARIANT ||
    import.meta.env.VITE_DASHBOARD_DATA_MODE ||
    ''
  )
    .toString()
    .trim()
    .toUpperCase()

  const mode = (import.meta.env.MODE || '').toLowerCase()
  const appEnv = (import.meta.env.VITE_APP_ENV || '').toLowerCase()
  const claimsProduction =
    import.meta.env.PROD === true || mode === 'production' || appEnv === 'production'
  const claimsStaging = mode === 'staging' || appEnv === 'staging'

  if (raw === 'PROD' || raw === 'PRODUCTION') {
    return BuildVariant.PROD
  }
  if (raw === 'STAGING') {
    return BuildVariant.STAGING
  }
  if (raw === 'LOCAL' || raw === 'DEVELOPMENT' || raw === 'DEV') {
    if (claimsProduction) {
      throw new Error(
        '[AdminBuildVariant] Refusing LOCAL while production MODE is set. Set VITE_BUILD_VARIANT=PROD.',
      )
    }
    return BuildVariant.LOCAL
  }

  if (claimsProduction) {
    throw new Error(
      '[AdminBuildVariant] VITE_BUILD_VARIANT=PROD is required for production builds.',
    )
  }
  if (claimsStaging) {
    return BuildVariant.STAGING
  }
  return BuildVariant.LOCAL
}

export function isLocal(): boolean {
  return getBuildVariant() === BuildVariant.LOCAL
}

export function isStaging(): boolean {
  return getBuildVariant() === BuildVariant.STAGING
}

export function isProd(): boolean {
  return getBuildVariant() === BuildVariant.PROD
}
