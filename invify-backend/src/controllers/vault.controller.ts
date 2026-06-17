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

      const data = await IntegrationVaultService.addCredential(vaultId, {
        ...payload,
        operator_id: operatorId
      });

      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      console.error('[VaultController] Failed to add credential:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Tests connection health (dummy ping logic for now, later extended to actual services).
   */
  static async testConnection(req: Request, res: Response) {
    try {
      const { vaultId } = req.params;
      const { serviceIdentifier, environment } = req.body;

      // 1. Fetch decrypted active key
      const key = await IntegrationVaultService.getDecryptedCredential(serviceIdentifier, environment);
      if (!key) {
        return res.status(404).json({ success: false, error: 'No active credential found to test.' });
      }

      // 2. Perform live network ping (Mocked here)
      const start = Date.now();
      // await axios.get(...) using key
      await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50)); // simulate latency
      const latency = Date.now() - start;

      // 3. Log health
      await IntegrationVaultService.logHealthCheck(vaultId, environment, 'HEALTHY', latency);

      return res.status(200).json({ success: true, status: 'HEALTHY', latency_ms: latency });
    } catch (error: any) {
      console.error('[VaultController] Connection test failed:', error.message);
      
      if (req.params.vaultId) {
        await IntegrationVaultService.logHealthCheck(req.params.vaultId, req.body.environment || 'PRODUCTION', 'DOWN', 0, error.message);
      }

      return res.status(500).json({ success: false, error: error.message });
    }
  }
}
