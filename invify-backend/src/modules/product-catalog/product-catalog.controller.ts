// invify-backend/src/modules/product-catalog/product-catalog.controller.ts
import { Request, Response } from 'express';
import { productCatalogService } from './product-catalog.service';
import { supabaseAdmin } from '../../db/supabase';

async function extractAgentId(req: Request): Promise<string> {
  const user = (req as any).user;
  if (!user) throw new Error('Unauthorized');
  if (user.agentId || user.agent_id) return user.agentId || user.agent_id;

  const authId = user.id || user.sub;
  if (authId) {
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('auth_user_id', authId)
      .maybeSingle();
    if (agent?.id) return agent.id;
  }

  if (user.email) {
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id')
      .ilike('email', String(user.email).trim())
      .maybeSingle();
    if (agent?.id) return agent.id;
  }

  return authId || 'agent-hmo-default';
}

export class ProductCatalogController {
  /**
   * GET /api/agent/catalog/products
   */
  async getMasterProducts(req: Request, res: Response) {
    try {
      const agentId = await extractAgentId(req);
      const products = await productCatalogService.getPublishedCatalog(agentId);
      res.json({ success: true, data: products });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/agent/catalog/offers
   */
  async getHmoOffers(req: Request, res: Response) {
    try {
      const agentId = await extractAgentId(req);
      const offers = await productCatalogService.getHmoOffers(agentId);
      res.json({ success: true, data: offers });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/agent/catalog/offers
   */
  async configureOfferPrice(req: Request, res: Response) {
    try {
      const agentId = await extractAgentId(req);
      const { productId, hmoAdjustmentKobo, reason } = req.body;
      if (!productId) {
        return res.status(400).json({ success: false, message: 'productId is required.' });
      }
      if (typeof hmoAdjustmentKobo !== 'number') {
        return res.status(400).json({ success: false, message: 'hmoAdjustmentKobo must be a number.' });
      }

      const offer = await productCatalogService.configureOfferPrice(
        agentId,
        productId,
        hmoAdjustmentKobo,
        agentId,
        reason
      );
      res.json({ success: true, data: offer });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/agent/catalog/assignments
   */
  async listAssignments(req: Request, res: Response) {
    try {
      const agentId = await extractAgentId(req);
      const assignments = await productCatalogService.listTenantAssignments(agentId);
      res.json({ success: true, data: assignments });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/agent/catalog/assignments
   */
  async assignProduct(req: Request, res: Response) {
    try {
      const agentId = await extractAgentId(req);
      const { tenantId, productId } = req.body;
      if (!tenantId || !productId) {
        return res.status(400).json({ success: false, message: 'tenantId and productId are required.' });
      }

      const assignment = await productCatalogService.assignProductToTenant(
        agentId,
        tenantId,
        productId,
        agentId
      );
      res.json({ success: true, data: assignment });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * DELETE /api/agent/catalog/assignments/:id
   */
  async revokeAssignment(req: Request, res: Response) {
    try {
      const agentId = await extractAgentId(req);
      const { id } = req.params;
      await productCatalogService.revokeTenantAssignment(agentId, id);
      res.json({ success: true, message: 'Product assignment revoked successfully.' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

export const productCatalogController = new ProductCatalogController();
