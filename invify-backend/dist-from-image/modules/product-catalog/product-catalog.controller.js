"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productCatalogController = exports.ProductCatalogController = void 0;
const product_catalog_service_1 = require("./product-catalog.service");
const supabase_1 = require("../../db/supabase");
async function extractAgentId(req) {
    const user = req.user;
    if (!user)
        throw new Error('Unauthorized');
    if (user.agentId || user.agent_id)
        return user.agentId || user.agent_id;
    const authId = user.id || user.sub;
    if (authId) {
        const { data: agent } = await supabase_1.supabaseAdmin
            .from('agents')
            .select('id')
            .eq('auth_user_id', authId)
            .maybeSingle();
        if (agent?.id)
            return agent.id;
    }
    if (user.email) {
        const { data: agent } = await supabase_1.supabaseAdmin
            .from('agents')
            .select('id')
            .ilike('email', String(user.email).trim())
            .maybeSingle();
        if (agent?.id)
            return agent.id;
    }
    return authId || 'agent-hmo-default';
}
class ProductCatalogController {
    /**
     * GET /api/agent/catalog/products
     */
    async getMasterProducts(req, res) {
        try {
            const agentId = await extractAgentId(req);
            const products = await product_catalog_service_1.productCatalogService.getPublishedCatalog(agentId);
            res.json({ success: true, data: products });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    /**
     * GET /api/agent/catalog/offers
     */
    async getHmoOffers(req, res) {
        try {
            const agentId = await extractAgentId(req);
            const offers = await product_catalog_service_1.productCatalogService.getHmoOffers(agentId);
            res.json({ success: true, data: offers });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    /**
     * POST /api/agent/catalog/offers
     */
    async configureOfferPrice(req, res) {
        try {
            const agentId = await extractAgentId(req);
            const { productId, hmoAdjustmentKobo, reason } = req.body;
            if (!productId) {
                return res.status(400).json({ success: false, message: 'productId is required.' });
            }
            if (typeof hmoAdjustmentKobo !== 'number') {
                return res.status(400).json({ success: false, message: 'hmoAdjustmentKobo must be a number.' });
            }
            const offer = await product_catalog_service_1.productCatalogService.configureOfferPrice(agentId, productId, hmoAdjustmentKobo, agentId, reason);
            res.json({ success: true, data: offer });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    /**
     * GET /api/agent/catalog/assignments
     */
    async listAssignments(req, res) {
        try {
            const agentId = await extractAgentId(req);
            const assignments = await product_catalog_service_1.productCatalogService.listTenantAssignments(agentId);
            res.json({ success: true, data: assignments });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    /**
     * POST /api/agent/catalog/assignments
     */
    async assignProduct(req, res) {
        try {
            const agentId = await extractAgentId(req);
            const { tenantId, productId } = req.body;
            if (!tenantId || !productId) {
                return res.status(400).json({ success: false, message: 'tenantId and productId are required.' });
            }
            const assignment = await product_catalog_service_1.productCatalogService.assignProductToTenant(agentId, tenantId, productId, agentId);
            res.json({ success: true, data: assignment });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    /**
     * DELETE /api/agent/catalog/assignments/:id
     */
    async revokeAssignment(req, res) {
        try {
            const agentId = await extractAgentId(req);
            const { id } = req.params;
            await product_catalog_service_1.productCatalogService.revokeTenantAssignment(agentId, id);
            res.json({ success: true, message: 'Product assignment revoked successfully.' });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
}
exports.ProductCatalogController = ProductCatalogController;
exports.productCatalogController = new ProductCatalogController();
//# sourceMappingURL=product-catalog.controller.js.map