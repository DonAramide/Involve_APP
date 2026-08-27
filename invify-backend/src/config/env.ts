import { BuildVariantService } from './build-variant';

export const env = {
  get QUASAR_ADMIN_API_URL() {
    return process.env.QUASAR_ADMIN_API_URL || 'https://admin-api.quasar-finance.internal';
  },
  get QUASAR_ADMIN_API_KEY() {
    const key = process.env.QUASAR_ADMIN_API_KEY;
    if (key) return key;

    const variant = BuildVariantService.getInstance();
    if (variant.isProd() || variant.isStaging()) {
      throw new Error('QUASAR_ADMIN_API_KEY is required in staging/production');
    }
    return 'mock-admin-api-key';
  }
};
