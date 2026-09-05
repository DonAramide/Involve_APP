/**
 * Web build version shown on login and overview.
 * On every web fix deploy, bump the patch in invify-admin/package.json by 0.0.1
 * (for example 1.0.1 → 1.0.2). Vite injects that value at build time.
 */
export const WEB_APP_VERSION =
  typeof __WEB_APP_VERSION__ !== 'undefined' && __WEB_APP_VERSION__
    ? String(__WEB_APP_VERSION__)
    : '1.0.1'
