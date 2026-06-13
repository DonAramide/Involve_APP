export enum BuildVariant {
  LOCAL = 'LOCAL',
  STAGING = 'STAGING',
  PROD = 'PROD'
}

export function getBuildVariant(): BuildVariant {
  const variant = import.meta.env.VITE_BUILD_VARIANT?.toUpperCase();
  if (variant === 'PROD') return BuildVariant.PROD;
  if (variant === 'STAGING') return BuildVariant.STAGING;
  return BuildVariant.LOCAL;
}

export function isLocal(): boolean {
  return getBuildVariant() === BuildVariant.LOCAL;
}

export function isStaging(): boolean {
  return getBuildVariant() === BuildVariant.STAGING;
}

export function isProd(): boolean {
  return getBuildVariant() === BuildVariant.PROD;
}
