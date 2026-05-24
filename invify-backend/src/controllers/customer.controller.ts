import { Request, Response } from 'express';
import { getQuasarService } from '../integrations/quasar/factory';
import { AuditService } from '../services/audit.service';
import { supabase } from '../db/supabase';

export class CustomerController {
  /**
   * POST /api/finance/customer-virtual-account/:customerId
   * Provisions or retrieves a customer's virtual account.
   */
  static async getVirtualAccount(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
      const tenantId = (req as any).user?.tenantId;
      const { name, email, phone } = req.body;

      if (!customerId) {
        return res.status(400).json({ error: "Customer ID is required" });
      }

      if (!tenantId) {
        return res.status(401).json({ error: "Unauthorized: Tenant context missing" });
      }

      // 1. Resolve Quasar Service (Multi-Tenant)
      const quasar = await getQuasarService(tenantId);

      // 2. Call Quasar SDK
      const reference = `VA-CUST-${customerId.substring(0, 8)}-${Date.now()}`;
      
      const quasarAccount = await quasar.createVirtualAccount({
        childId: customerId, // Mapping customerId to childId field for Quasar endUsers interface
        parentId: tenantId,  // Mapping tenantId to parentId field
        email: email || `customer-${customerId.substring(0, 8)}@invify.com`,
        firstName: name?.split(' ')[0] || 'Valued',
        lastName: name?.split(' ').slice(1).join(' ') || 'Customer',
        metadata: {
          source: 'customer_provisioning',
          phone: phone
        }
      });

      // 3. Audit Log (Success)
      await AuditService.log({
        eventType: 'virtual_account.created' as any,
        reference,
        tenantId: tenantId,
        payload: { 
          customerId, 
          accountNumber: quasarAccount.accountNumber,
          bankName: quasarAccount.bankName
        }
      });

      return res.status(200).json({
        accountNumber: quasarAccount.accountNumber,
        bankName: quasarAccount.bankName,
        accountName: (quasarAccount as any).accountName || name
      });

    } catch (error: any) {
      console.error('[CustomerController] getVirtualAccount Error:', error.message);
      return res.status(500).json({ error: "Failed to provision customer virtual account" });
    }
  }
}
