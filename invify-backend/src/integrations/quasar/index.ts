// src/integrations/quasar/index.ts
/**
 * Quasar Integration — Public barrel export.
 *
 * Consumers import from this single path:
 *   import { QuasarProvisioningService, QuasarPaymentsClient, ... } from '../integrations/quasar';
 */

// Core HTTP client (shared)
export { QuasarApiClient, QuasarApiError } from './quasar-api.client';
export type { QFPResponse, QuasarApiClientOptions, RequestOptions } from './quasar-api.client';

// Platform partner client (provisioning only — backend-to-backend)
export { QuasarPlatformClient, quasarPlatformClient } from './quasar-platform.client';
export type { InvifyVertical, QuasarTenant, QuasarApiKeyResult, CreateTenantParams, CreateApiKeyParams } from './quasar-platform.client';

// Financial / tenant-scoped client (sk_* auth)
export { QuasarPaymentsClient } from './quasar-payments.client';
export type {
  Wallet, WalletBalance, WalletTransaction,
  PaymentIntent, Payment, Transfer,
  WebhookEndpoint,
  CreatePaymentIntentParams, CreateTransferParams, MposBackupParams,
} from './quasar-payments.client';

// Webhook verification + dispatch
export { QuasarWebhookService } from './quasar-webhook.service';
export type { QuasarWebhookPayload, WebhookEventHandler } from './quasar-webhook.service';

// Encrypted integration store (quasar_integrations table)
export { QuasarIntegrationStore } from './quasar-integration.store';
export type { QuasarIntegrationRecord, CreateIntegrationParams, RegisterWebhookParams } from './quasar-integration.store';

// Provisioning orchestrator
export { QuasarProvisioningService } from './quasar-provisioning.service';
export type { ProvisionMerchantParams, ProvisionMerchantResult } from './quasar-provisioning.service';

// Connectivity health monitor
export { QuasarConnectivityHealthService } from './quasar-connectivity-health.service';
export type { QuasarHealthReport, HealthStatus, VerticalCredentialCheck, TenantKeyCheck } from './quasar-connectivity-health.service';
