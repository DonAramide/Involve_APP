// invify-backend/src/modules/financial-platform/index.ts

/**
 * Financial Platform Module
 * 
 * Provides the boundary for integrating with Quasar Financial Services (QFS).
 * Responsible for tenant provisioning, credential rotation, health checks,
 * and operational audits.
 */

export * from './infrastructure/CredentialProvider';
export * from './quasar/QuasarPlatformClient';
export * from './activation/FinancialPlatformActivationController';
