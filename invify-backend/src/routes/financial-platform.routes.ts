import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { checkTenantAccess } from '../middleware/rbac.middleware';

import { FinancialPlatformActivationController } from '../modules/financial-platform/activation/FinancialPlatformActivationController';
import { FinancialPlatformActivationService } from '../modules/financial-platform/activation/FinancialPlatformActivationService';
import { FinancialPlatformRotationController } from '../modules/financial-platform/activation/FinancialPlatformRotationController';
import { FinancialPlatformRotationService } from '../modules/financial-platform/activation/FinancialPlatformRotationService';
import { FinancialPlatformHealthController } from '../modules/financial-platform/health/FinancialPlatformHealthController';
import { FinancialPlatformHealthService } from '../modules/financial-platform/health/FinancialPlatformHealthService';
import { FinancialPlatformAuditController } from '../modules/financial-platform/audit/FinancialPlatformAuditController';
import { FinancialPlatformAuditService } from '../modules/financial-platform/audit/FinancialPlatformAuditService';

import { VaultCredentialProvider } from '../modules/financial-platform/infrastructure/CredentialProvider';
import { SimpleCircuitBreaker, ExponentialBackoffRetryPolicy } from '../modules/financial-platform/infrastructure/ResiliencePolicies';
import { QuasarPlatformClient } from '../modules/financial-platform/quasar/QuasarPlatformClient';
import { ActivationSaga } from '../modules/financial-platform/orchestration/ActivationSaga';
import { RotationSaga } from '../modules/financial-platform/orchestration/RotationSaga';
import { supabase } from '../db/supabase';

// Implementations of required interfaces
class InMemoryActivationLockProvider {
  private locks = new Map<string, number>(); // tenantId -> expiresAt ms

  async acquireLock(tenantId: string, ttlSeconds: number): Promise<boolean> {
    const now = Date.now();
    const expiresAt = this.locks.get(tenantId);
    if (expiresAt && expiresAt > now) return false;
    this.locks.set(tenantId, now + Math.max(ttlSeconds, 1) * 1000);
    return true;
  }

  async releaseLock(tenantId: string): Promise<void> {
    this.locks.delete(tenantId);
  }
}

import { IntegrationVaultService } from '../services/integration-vault.service';

/** Resolve Quasar partner credentials for a vertical (school/retail/services). */
async function resolveQuasarPlatformCreds(verticalRaw?: string) {
  const vertical = String(verticalRaw || 'invify_retail').trim().toLowerCase() || 'invify_retail';

  const verticalMap: Record<string, {
    clientIdEnv: string[];
    secretEnv: string[];
    vaultSecretKeys: string[];
    defaultClientId: string;
  }> = {
    invify_school: {
      clientIdEnv: ['INVIFY_SCHOOL_CLIENT_ID'],
      secretEnv: ['INVIFY_SCHOOL_CLIENT_SECRET'],
      vaultSecretKeys: ['qip.schoolClientSecret'],
      defaultClientId: 'INVIFY_SCHOOL',
    },
    invify_services: {
      clientIdEnv: ['INVIFY_SERVICES_CLIENT_ID'],
      secretEnv: ['INVIFY_SERVICES_CLIENT_SECRET'],
      vaultSecretKeys: ['qip.servicesClientSecret'],
      defaultClientId: 'INVIFY_SERVICES',
    },
    invify_retail: {
      clientIdEnv: ['QUASAR_CLIENT_ID', 'INVIFY_RETAIL_CLIENT_ID'],
      secretEnv: ['QUASAR_CLIENT_SECRET', 'INVIFY_RETAIL_CLIENT_SECRET', 'QUASAR_SERVICE_SECRET'],
      vaultSecretKeys: ['qip.retailClientSecret'],
      defaultClientId: 'INVIFY_RETAIL',
    },
  };

  const cfg = verticalMap[vertical] || verticalMap.invify_retail;

  let clientSecret: string | null = null;
  for (const vaultKey of cfg.vaultSecretKeys) {
    clientSecret =
      (await IntegrationVaultService.getDecryptedCredential('qip', 'STAGING', undefined, vaultKey)) ||
      (await IntegrationVaultService.getDecryptedCredential('qip', 'PRODUCTION', undefined, vaultKey));
    if (clientSecret) break;
  }

  let clientId = cfg.defaultClientId;
  for (const envKey of cfg.clientIdEnv) {
    if (process.env[envKey]) {
      clientId = process.env[envKey] as string;
      break;
    }
  }

  if (!clientSecret) {
    for (const envKey of cfg.secretEnv) {
      if (process.env[envKey]) {
        clientSecret = process.env[envKey] as string;
        break;
      }
    }
  }

  if (!clientSecret) {
    console.warn(
      `[FinancialPlatform] No Quasar client secret for vertical "${vertical}". ` +
        `Set ${cfg.secretEnv[0]} in .env or save ${cfg.vaultSecretKeys[0]} via ECS Workspace.`
    );
    return { clientId, clientSecret: '' };
  }

  console.log(`[FinancialPlatform] Using Quasar partner ${clientId} for vertical ${vertical}`);
  return { clientId, clientSecret };
}

const mockVaultClient = {
  async read(key: string) {
    if (key === 'quasarPlatform' || key.startsWith('quasarPlatform:')) {
      const vertical = key.includes(':') ? key.split(':')[1] : 'invify_retail';
      return resolveQuasarPlatformCreds(vertical);
    }
    if (key.startsWith('quasarTenant/')) {
      const tenantId = key.split('/')[1];
      const tenantServiceId = `quasarTenant:${tenantId}`;
      // Try tenant-scoped identifier first (new format), fall back to generic (legacy)
      const apiKeySecret =
        await IntegrationVaultService.getDecryptedCredential(tenantServiceId, 'PRODUCTION', tenantId, 'apiKeySecret')
        || await IntegrationVaultService.getDecryptedCredential(tenantServiceId, 'STAGING', tenantId, 'apiKeySecret')
        || await IntegrationVaultService.getDecryptedCredential('quasarTenant', 'PRODUCTION', tenantId, 'apiKeySecret')
        || await IntegrationVaultService.getDecryptedCredential('quasarTenant', 'STAGING', tenantId, 'apiKeySecret');
      if (!apiKeySecret) {
        return null;
      }
      const quasarTenantId =
        await IntegrationVaultService.getDecryptedCredential(tenantServiceId, 'PRODUCTION', tenantId, 'quasarTenantId')
        || await IntegrationVaultService.getDecryptedCredential(tenantServiceId, 'STAGING', tenantId, 'quasarTenantId')
        || await IntegrationVaultService.getDecryptedCredential('quasarTenant', 'PRODUCTION', tenantId, 'quasarTenantId')
        || await IntegrationVaultService.getDecryptedCredential('quasarTenant', 'STAGING', tenantId, 'quasarTenantId');
      return { apiKeySecret, tenantId: quasarTenantId, environment: 'PRODUCTION' };
    }
    return null;
  },
  async write(key: string, value: any) {
    // Determine target integration
    if (key === 'quasarPlatform') {
      let vault = (await IntegrationVaultService.listIntegrations('GLOBAL')).find(i => i.service_identifier === 'quasarPlatform');
      if (!vault) {
        vault = await IntegrationVaultService.registerIntegration({
          service_identifier: 'quasarPlatform',
          name: 'Quasar Platform Gateway',
          category: 'PAYMENT_GATEWAY',
          scope: 'GLOBAL'
        });
      }
      if (value.clientId) {
        await IntegrationVaultService.addCredential(vault.id, {
          credential_type: 'API_KEY',
          environment: 'PRODUCTION',
          plaintext_value: value.clientId,
          key_name: 'clientId',
          rotate_existing: true
        });
      }
      if (value.clientSecret) {
        await IntegrationVaultService.addCredential(vault.id, {
          credential_type: 'API_KEY',
          environment: 'PRODUCTION',
          plaintext_value: value.clientSecret,
          key_name: 'clientSecret',
          rotate_existing: true
        });
      }
    } else if (key.startsWith('quasarTenant/')) {
      const tenantId = key.split('/')[1];
      // Use tenant-scoped service_identifier to avoid unique constraint collision across tenants
      const tenantServiceId = `quasarTenant:${tenantId}`;
      let vault = (await IntegrationVaultService.listIntegrations('TENANT', tenantId)).find(i => i.service_identifier === tenantServiceId || i.service_identifier === 'quasarTenant');
      if (!vault) {
        vault = await IntegrationVaultService.registerIntegration({
          service_identifier: tenantServiceId,
          name: 'Quasar Merchant Gateway',
          category: 'PAYMENT_GATEWAY',
          scope: 'TENANT',
          tenant_id: tenantId
        });
      }
      if (value.apiKeySecret) {
        await IntegrationVaultService.addCredential(vault.id, {
          credential_type: 'API_KEY',
          environment: 'PRODUCTION',
          plaintext_value: value.apiKeySecret,
          key_name: 'apiKeySecret',
          rotate_existing: true
        });
      }
      if (value.tenantId) {
        await IntegrationVaultService.addCredential(vault.id, {
          credential_type: 'API_KEY',
          environment: 'PRODUCTION',
          plaintext_value: value.tenantId,
          key_name: 'quasarTenantId',
          rotate_existing: true
        });
      }
      if (value.apiKeyPublic) {
        await IntegrationVaultService.addCredential(vault.id, {
          credential_type: 'API_KEY',
          environment: 'PRODUCTION',
          plaintext_value: value.apiKeyPublic,
          key_name: 'apiKeyPublic',
          rotate_existing: true
        });
      }
    }
  },
  async delete(key: string) {
    if (key === 'quasarPlatform') {
      const vault = (await IntegrationVaultService.listIntegrations('GLOBAL')).find(i => i.service_identifier === 'quasarPlatform');
      if (vault) {
        // Demote or delete credentials
        const { supabaseAdmin } = require('../db/supabase');
        await supabaseAdmin.from('integration_credentials').delete().eq('vault_id', vault.id);
      }
    } else if (key.startsWith('quasarTenant/')) {
      const tenantId = key.split('/')[1];
      const tenantServiceId = `quasarTenant:${tenantId}`;
      const vault = (await IntegrationVaultService.listIntegrations('TENANT', tenantId)).find(i => i.service_identifier === tenantServiceId || i.service_identifier === 'quasarTenant');
      if (vault) {
        const { supabaseAdmin } = require('../db/supabase');
        await supabaseAdmin.from('integration_credentials').delete().eq('vault_id', vault.id);
      }
    }
  }
};

const mockAuditLogger = {
  async log(eventName: string, payload: any, context: any) {
    console.log(`[Audit] ${eventName}`, payload);
    try {
      const { error } = await supabase.from('audit_logs').insert({
        tenant_id: context.tenantId || null,
        module: 'FINANCIAL_PLATFORM',
        action: eventName,
        user_email: context.actorId || 'system',
        user_name: context.actorId || 'system',
        status: /FAIL|ERROR/i.test(eventName) ? 'FAILED' : 'SUCCESS',
        metadata: payload || {},
        target: payload?.quasarTenantId || payload?.tenantId || context.tenantId || null
      });
      if (error) {
        console.error('Failed to write audit log to database', error.message);
      }
    } catch (err: any) {
      console.error('Failed to write audit log to database', err.message);
    }
  }
};

const mockEventPublisher = {
  async publish(eventName: string, payload: any, context: any) {
    console.log(`[Event] ${eventName}`, payload);
  }
};

const mockMetricsExporter = {
  incrementCounter(metricName: string, tags?: any) {
    console.log(`[Metric Counter] ${metricName}`, tags);
  },
  recordDuration(metricName: string, durationMs: number, tags?: any) {
    console.log(`[Metric Duration] ${metricName} took ${durationMs}ms`, tags);
  }
};

// Wiring dependencies
const credentialProvider = new VaultCredentialProvider(mockVaultClient);
const circuitBreaker = new SimpleCircuitBreaker();
const retryPolicy = new ExponentialBackoffRetryPolicy();

const quasarClient = new QuasarPlatformClient(credentialProvider, circuitBreaker, retryPolicy);

const lockProvider = new InMemoryActivationLockProvider();

const activationSaga = new ActivationSaga(
  quasarClient,
  mockVaultClient,
  mockAuditLogger,
  mockEventPublisher,
  mockMetricsExporter
);

const rotationSaga = new RotationSaga(
  quasarClient,
  mockVaultClient,
  mockAuditLogger,
  mockEventPublisher,
  mockMetricsExporter
);

const activationService = new FinancialPlatformActivationService(lockProvider, activationSaga);
const rotationService = new FinancialPlatformRotationService(lockProvider, rotationSaga);
const healthService = new FinancialPlatformHealthService(quasarClient, credentialProvider, circuitBreaker, mockVaultClient);
const auditService = new FinancialPlatformAuditService();

import { DeactivationSaga } from '../modules/financial-platform/orchestration/DeactivationSaga';
import { FinancialPlatformDeactivationService } from '../modules/financial-platform/activation/FinancialPlatformDeactivationService';
import { FinancialPlatformDeactivationController } from '../modules/financial-platform/activation/FinancialPlatformDeactivationController';

const deactivationSaga = new DeactivationSaga(
  quasarClient,
  mockVaultClient,
  mockAuditLogger,
  mockEventPublisher,
  mockMetricsExporter
);

const deactivationService = new FinancialPlatformDeactivationService(lockProvider, deactivationSaga);
const deactivationController = new FinancialPlatformDeactivationController(deactivationService);

import { FinancialPlatformChangeVerticalService } from '../modules/financial-platform/activation/FinancialPlatformChangeVerticalService';
import { FinancialPlatformChangeVerticalController } from '../modules/financial-platform/activation/FinancialPlatformChangeVerticalController';

const changeVerticalService = new FinancialPlatformChangeVerticalService(
  lockProvider,
  activationSaga,
  mockVaultClient,
  mockAuditLogger,
);
const changeVerticalController = new FinancialPlatformChangeVerticalController(changeVerticalService);

const activationController = new FinancialPlatformActivationController(activationService);
const rotationController = new FinancialPlatformRotationController(rotationService);
const healthController = new FinancialPlatformHealthController(healthService);
const auditController = new FinancialPlatformAuditController(auditService);

const router = Router();

// Express routes
router.post('/tenants/:id/financial-platform/activate', authenticate, checkTenantAccess, (req, res) => activationController.activate(req, res));
router.post('/tenants/:id/financial-platform/rotate', authenticate, checkTenantAccess, (req, res) => rotationController.rotate(req, res));
router.post('/tenants/:id/financial-platform/deactivate', authenticate, checkTenantAccess, (req, res) => deactivationController.deactivate(req, res));
router.post('/tenants/:id/financial-platform/change-vertical', authenticate, checkTenantAccess, (req, res) => changeVerticalController.changeVertical(req, res));
router.get('/tenants/:id/financial-platform/health', authenticate, checkTenantAccess, (req, res) => healthController.getHealth(req, res));
router.get('/tenants/:id/financial-platform/audit', authenticate, checkTenantAccess, (req, res) => auditController.getAuditLog(req, res));

/**
 * GET /tenants/:id/financial-platform/credentials
 * Returns the NON-SECRET public key and webhook URL for the tenant.
 * The secret key is NEVER returned — only the public key (apiKeyPublic) is exposed.
 */
router.get('/tenants/:id/financial-platform/credentials', authenticate, checkTenantAccess, async (req, res) => {
  const tenantId = req.params.id;
  try {
    const tenantServiceId = `quasarTenant:${tenantId}`;

    // Read public key (safe to expose)
    const publicKey =
      await IntegrationVaultService.getDecryptedCredential(tenantServiceId, 'PRODUCTION', tenantId, 'apiKeyPublic')
      || await IntegrationVaultService.getDecryptedCredential(tenantServiceId, 'STAGING', tenantId, 'apiKeyPublic')
      || await IntegrationVaultService.getDecryptedCredential('quasarTenant', 'PRODUCTION', tenantId, 'apiKeyPublic')
      || await IntegrationVaultService.getDecryptedCredential('quasarTenant', 'STAGING', tenantId, 'apiKeyPublic')
      || null;

    // Read webhook URL from quasar_integrations table directly
    const { supabaseAdmin } = require('../db/supabase');
    const { data: integration } = await supabaseAdmin
      .from('quasar_integrations')
      .select('quasar_webhook_endpoint_id, quasar_environment, quasar_tenant_id')
      .eq('invify_tenant_id', tenantId)
      .maybeSingle();

    return res.json({
      publicKey: publicKey || null,
      webhookEndpointId: integration?.quasar_webhook_endpoint_id || null,
      environment: integration?.quasar_environment || null,
      provisioned: !!publicKey,
    });
  } catch (err: any) {
    console.error('[FinancialPlatform] /credentials fetch failed:', err.message);
    return res.status(500).json({ error: 'Failed to fetch credentials' });
  }
});

export default router;
