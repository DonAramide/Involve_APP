import { Request, Response } from 'express';
import { getQuasarService } from '../integrations/quasar/factory';
import { AuditService } from '../services/audit.service';
import { customerService } from '../services/customer.service';
import { CustomerStatus } from '../types/customer.dto';

export class CustomerController {
  /**
   * POST /api/finance/customer-virtual-account/:customerId
   */
  static async getVirtualAccount(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
      const tenantId = (req as any).user?.tenantId;
      const { name, email, phone } = req.body;

      if (!customerId) return res.status(400).json({ error: "Customer ID is required" });
      if (!tenantId) return res.status(401).json({ error: "Unauthorized: Tenant context missing" });

      const quasar = await getQuasarService(tenantId);
      const reference = `VA-CUST-${customerId.substring(0, 8)}-${Date.now()}`;
      
      const quasarAccount = await quasar.createVirtualAccount({
        childId: customerId, 
        parentId: tenantId,  
        email: email || `customer-${customerId.substring(0, 8)}@invify.com`,
        firstName: name?.split(' ')[0] || 'Valued',
        lastName: name?.split(' ').slice(1).join(' ') || 'Customer',
        metadata: { source: 'customer_provisioning', phone: phone }
      });

      await AuditService.log({
        eventType: 'virtual_account.created' as any,
        reference,
        tenantId: tenantId,
        payload: { customerId, accountNumber: quasarAccount.accountNumber, bankName: quasarAccount.bankName }
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

  static async searchCustomers(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized: Tenant context missing" });

      const options = {
        page: parseInt(req.query.page as string) || 1,
        pageSize: parseInt(req.query.pageSize as string) || 50,
        search: req.query.search as string,
        sort: req.query.sort as string,
        direction: req.query.direction as 'asc' | 'desc',
        status: req.query.status as CustomerStatus,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string
      };

      const result = await customerService.searchCustomers(tenantId, options);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('[CustomerController] searchCustomers Error:', error.message);
      return res.status(500).json({ error: "Failed to search customers" });
    }
  }

  static async getCustomerSummary(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const customerId = req.params.id;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const summary = await customerService.getCustomerSummary(tenantId, customerId);
      if (!summary) return res.status(404).json({ error: "Customer not found" });

      return res.status(200).json(summary);
    } catch (error: any) {
      console.error('[CustomerController] getCustomerSummary Error:', error.message);
      return res.status(500).json({ error: "Failed to fetch customer summary" });
    }
  }

  static async createCustomer(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const customer = await customerService.createCustomer(tenantId, req.body);
      return res.status(201).json(customer);
    } catch (error: any) {
      console.error('[CustomerController] createCustomer Error:', error.message);
      return res.status(500).json({ error: "Failed to create customer" });
    }
  }

  static async updateCustomer(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const customerId = req.params.id;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const customer = await customerService.updateCustomer(tenantId, customerId, req.body);
      return res.status(200).json(customer);
    } catch (error: any) {
      console.error('[CustomerController] updateCustomer Error:', error.message);
      return res.status(500).json({ error: "Failed to update customer" });
    }
  }
}
