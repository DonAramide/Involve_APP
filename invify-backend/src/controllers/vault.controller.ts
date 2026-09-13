import { Request, Response } from 'express';
import { IntegrationVaultService } from '../services/integration-vault.service';

export class VaultController {
  
  /**
   * List all integrations.
   * Super Admins see GLOBAL + all TENANT scopes.
   * Operations Admin might only see status and metadata, handled via frontend masking.
   */
  static async listIntegrations(req: Request, res: Response) {
    try {
      const { scope, tenantId } = req.query;
      
      const integrations = await IntegrationVaultService.listIntegrations(
        scope as 'GLOBAL' | 'TENANT' | undefined, 
        tenantId as string | undefined
      );

      return res.status(200).json({ success: true, data: integrations });
    } catch (error: any) {
      console.error('[VaultController] Failed to list integrations:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Registers a new integration container (not credentials).
   */
  static async registerIntegration(req: Request, res: Response) {
    try {
      // Basic RBAC: only Super Admins should do this, assume middleware handles it.
      const payload = req.body;
      const data = await IntegrationVaultService.registerIntegration(payload);
      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      console.error('[VaultController] Failed to register integration:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Adds or rotates a credential securely.
   */
  static async addCredential(req: Request, res: Response) {
    try {
      const { vaultId } = req.params;
      const payload = req.body;
      const operatorId = (req as any).user?.id || null;

      const plaintext =
        payload.plaintext_value ??
        payload.value ??
        payload.secret ??
        payload.clientSecret;

      if (!plaintext || typeof plaintext !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'plaintext_value is required (string). Received undefined — check the request body.'
        });
      }
      if (!payload.key_name) {
        return res.status(400).json({
          success: false,
          error: 'key_name is required.'
        });
      }
      if (!payload.credential_type) {
        return res.status(400).json({
          success: false,
          error: 'credential_type is required.'
        });
      }

      const data = await IntegrationVaultService.addCredential(vaultId, {
        ...payload,
        plaintext_value: plaintext,
        operator_id: operatorId
      });

      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      console.error('[VaultController] Failed to add credential:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Updates an existing credential (name, type, expiry, secret).
   */
  static async updateCredential(req: Request, res: Response) {
    try {
      const { vaultId, credentialId } = req.params;
      const payload = req.body;
      const plaintext =
        payload.plaintext_value ??
        payload.value ??
        payload.secret;

      const data = await IntegrationVaultService.updateCredential(vaultId, credentialId, {
        credential_type: payload.credential_type,
        key_name: payload.key_name,
        expires_at: payload.expires_at,
        plaintext_value: typeof plaintext === 'string' ? plaintext : undefined,
        promote: Boolean(payload.promote),
      });

      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('[VaultController] Failed to update credential:', error.message);
      const status = String(error.message || '').includes('not found') ? 404 : 500;
      return res.status(status).json({ success: false, error: error.message });
    }
  }

  /**
   * Activates a STANDBY credential.
   */
  static async activateCredential(req: Request, res: Response) {
    try {
      const { vaultId, credentialId } = req.params;
      const data = await IntegrationVaultService.activateCredential(vaultId, credentialId);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('[VaultController] Failed to activate credential:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Deletes a credential.
   */
  static async deleteCredential(req: Request, res: Response) {
    try {
      const { vaultId, credentialId } = req.params;
      await IntegrationVaultService.deleteCredential(vaultId, credentialId);
      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('[VaultController] Failed to delete credential:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Tests connection health (dummy ping logic for now, later extended to actual services).
   */
  static async testConnection(req: Request, res: Response) {
    try {
      const { vaultId } = req.params;
      const { serviceIdentifier, environment, keyName } = req.body;
      const sid = String(serviceIdentifier || '').toLowerCase();
      const isQuasar = sid === 'qip' || sid === 'quasar' || sid.includes('quasar');

      if (isQuasar) {
        const {
          testQuasarPartnerVertical,
          verticalFromKeyName,
        } = await import('../integrations/quasar/quasar-partner-credentials');
        const vertical = verticalFromKeyName(keyName);
        if (!vertical) {
          return res.status(400).json({
            success: false,
            error:
              'This row is not a Quasar partner key. Use Test all Quasar credentials, or test INVIFY_SCHOOL / RETAIL / SERVICES client id and secret.',
          });
        }
        const result = await testQuasarPartnerVertical(vertical);
        await IntegrationVaultService.logHealthCheck(
          vaultId,
          environment || 'PRODUCTION',
          result.ok ? 'HEALTHY' : 'DOWN',
          result.latencyMs,
          result.ok ? undefined : result.detail,
        );
        return res.status(result.ok ? 200 : 502).json({
          success: result.ok,
          status: result.ok ? 'HEALTHY' : 'DOWN',
          latency_ms: result.latencyMs,
          vertical: result.vertical,
          source: result.source,
          detail: result.detail,
          httpStatus: result.httpStatus,
        });
      }

      const key = await IntegrationVaultService.getDecryptedCredential(
        serviceIdentifier,
        environment,
        undefined,
        keyName,
        { allowStandby: true },
      );
      if (!key) {
        return res.status(404).json({ success: false, error: 'No credential found to test.' });
      }

      await IntegrationVaultService.logHealthCheck(vaultId, environment, 'HEALTHY', 0);
      return res.status(200).json({
        success: true,
        status: 'HEALTHY',
        latency_ms: 0,
        detail: 'No live probe for this integration type.',
      });
    } catch (error: any) {
      console.error('[VaultController] Connection test failed:', error.message);
      
      if (req.params.vaultId) {
        await IntegrationVaultService.logHealthCheck(req.params.vaultId, req.body.environment || 'PRODUCTION', 'DOWN', 0, error.message);
      }

      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async testQuasarPartners(req: Request, res: Response) {
    try {
      const { testAllQuasarPartnerVerticals } = await import(
        '../integrations/quasar/quasar-partner-credentials'
      );
      const results = await testAllQuasarPartnerVerticals();
      const allOk = results.every((r) => r.ok);
      if (req.params.vaultId) {
        const worst = results.find((r) => !r.ok);
        await IntegrationVaultService.logHealthCheck(
          req.params.vaultId,
          req.body?.environment || 'PRODUCTION',
          allOk ? 'HEALTHY' : 'DOWN',
          results.reduce((sum, r) => sum + (r.latencyMs || 0), 0),
          worst?.detail,
        );
      }
      return res.status(allOk ? 200 : 502).json({ success: allOk, results });
    } catch (error: any) {
      console.error('[VaultController] Quasar partner tests failed:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * PUT /vault/meta-whatsapp
   * Upsert Meta WhatsApp Cloud API credentials into Integration Vault.
   * Body may include any of:
   * PUBLIC_API_BASE_URL, WHATSAPP_GRAPH_API_VERSION, WHATSAPP_ACCESS_TOKEN,
   * WHATSAPP_APP_SECRET, WHATSAPP_WEBHOOK_VERIFY_TOKEN, WHATSAPP_BUSINESS_ACCOUNT_ID,
   * WHATSAPP_PHONE_NUMBER_ID, environment?
   * Never echoes secret values back.
   */
  static async upsertMetaWhatsApp(req: Request, res: Response) {
    try {
      const body = req.body || {};
      const environment = body.environment === 'SANDBOX' ? 'SANDBOX' : 'PRODUCTION';
      const values: Record<string, string> = {};

      for (const key of IntegrationVaultService.META_WHATSAPP_KEYS) {
        if (body[key] != null && String(body[key]).trim() !== '') {
          values[key] = String(body[key]).trim();
        }
      }

      // Accept legacy alias
      if (!values.WHATSAPP_ACCESS_TOKEN && body.META_ACCESS_TOKEN) {
        values.WHATSAPP_ACCESS_TOKEN = String(body.META_ACCESS_TOKEN).trim();
      }

      if (Object.keys(values).length === 0) {
        return res.status(400).json({
          success: false,
          error: `Provide at least one of: ${IntegrationVaultService.META_WHATSAPP_KEYS.join(', ')}`,
        });
      }

      const result = await IntegrationVaultService.upsertMetaWhatsAppCredentials(values, environment);
      const status = await IntegrationVaultService.getMetaWhatsAppStatus(environment);
      const { WhatsAppConfig } = await import('../integrations/whatsapp/WhatsAppConfig');
      const callbackUrl = await WhatsAppConfig.webhookCallbackUrl();

      return res.status(200).json({
        success: true,
        message: 'Meta WhatsApp credentials saved to Integration Vault',
        data: {
          vaultId: result.vaultId,
          environment: result.environment,
          keysStored: result.keys,
          status,
          webhookCallbackUrl: callbackUrl,
        },
      });
    } catch (error: any) {
      console.error('[VaultController] upsertMetaWhatsApp failed:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /vault/meta-whatsapp/status
   * Status-only — never returns plaintext secrets.
   */
  static async getMetaWhatsAppStatus(req: Request, res: Response) {
    try {
      const environment = (req.query.environment as string) === 'SANDBOX' ? 'SANDBOX' : 'PRODUCTION';
      const status = await IntegrationVaultService.getMetaWhatsAppStatus(environment);
      const { WhatsAppConfig } = await import('../integrations/whatsapp/WhatsAppConfig');
      const callbackUrl = await WhatsAppConfig.webhookCallbackUrl();
      return res.status(200).json({
        success: true,
        data: {
          ...status,
          webhookCallbackUrl: callbackUrl,
        },
      });
    } catch (error: any) {
      console.error('[VaultController] getMetaWhatsAppStatus failed:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}
