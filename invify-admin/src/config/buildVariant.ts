export enum BuildVariant {
  LOCAL = 'LOCAL',
  STAGING = 'STAGING',
  PROD = 'PROD'
}

/**
 * Explicit admin build variant.
 * `vite build` sets PROD=true even for `--mode staging`. Prefer MODE / VITE_APP_ENV
 * over that flag so a staging build never throws in the browser.
 */
export function getBuildVariant(): BuildVariant {
  try {
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
    const claimsStaging = mode === 'staging' || appEnv === 'staging'
    const claimsProduction = mode === 'production' || appEnv === 'production'

    if (raw === 'STAGING' || (claimsStaging && raw !== 'PROD' && raw !== 'PRODUCTION')) {
      return BuildVariant.STAGING
    }
    if (raw === 'PROD' || raw === 'PRODUCTION' || claimsProduction) {
      return BuildVariant.PROD
    }
    if (raw === 'LOCAL' || raw === 'DEVELOPMENT' || raw === 'DEV') {
      return BuildVariant.LOCAL
    }
    return BuildVariant.LOCAL
  } catch {
    return BuildVariant.STAGING
  }
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
