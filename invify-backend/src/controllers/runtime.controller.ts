import { Request, Response } from 'express';
import { RuntimeConfigService } from '../services/runtime.service';
import { SYSTEM_TENANT_UUID } from '../config/constants';

export class RuntimeController {
  /**
   * GET /api/v1/runtime/config
   * Returns the consolidated TenantRuntimeConfig for the authenticated user's tenant.
   */
  static async getConfig(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      
      // The user object should contain tenantId from the authenticate middleware
      // For enterprise structure, we usually get this directly from the JWT or context
      const tenantId = user?.tenantId || (req.query.tenantId as string);

      if (!tenantId || tenantId === SYSTEM_TENANT_UUID) {
        // Return a default system-level configuration for Global Admins and Agents
        // who do not belong to a specific tenant but need a hydrated runtime store.
        return res.status(200).json({
          tenant: { id: 'system', name: 'System Administration', businessMode: 'Admin', status: 'active', version: '2.0.0' },
          subscription: { tier: 'Enterprise', status: 'active', validUntil: '2099-12-31' },
          capabilities: { quasarEnabled: true, multiBranch: true, advancedReports: true, offlineMode: true, apiAccess: true },
          quotas: { maxTerminals: 9999, activeTerminals: 0 },
          integrations: { whatsapp: true, smtp: true, paymentProviders: [] },
          branding: { primaryColor: '#1976D2', logoUrl: '', receiptFooter: '', invoiceFooter: '' },
          realtime: { channels: [] }
        });
      }

      const config = await RuntimeConfigService.getConfig(tenantId);
      
      return res.status(200).json(config);
    } catch (error: any) {
      console.error('[RuntimeController] Error resolving runtime config:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }
}
