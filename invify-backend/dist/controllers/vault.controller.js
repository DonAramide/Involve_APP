"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultController = void 0;
const integration_vault_service_1 = require("../services/integration-vault.service");
class VaultController {
    /**
     * List all integrations.
     * Super Admins see GLOBAL + all TENANT scopes.
     * Operations Admin might only see status and metadata, handled via frontend masking.
     */
    static async listIntegrations(req, res) {
        try {
            const { scope, tenantId } = req.query;
            const integrations = await integration_vault_service_1.IntegrationVaultService.listIntegrations(scope, tenantId);
            return res.status(200).json({ success: true, data: integrations });
        }
        catch (error) {
            console.error('[VaultController] Failed to list integrations:', error.message);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    /**
     * Registers a new integration container (not credentials).
     */
    static async registerIntegration(req, res) {
        try {
            // Basic RBAC: only Super Admins should do this, assume middleware handles it.
            const payload = req.body;
            const data = await integration_vault_service_1.IntegrationVaultService.registerIntegration(payload);
            return res.status(201).json({ success: true, data });
        }
        catch (error) {
            console.error('[VaultController] Failed to register integration:', error.message);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    /**
     * Adds or rotates a credential securely.
     */
    static async addCredential(req, res) {
        try {
            const { vaultId } = req.params;
            const payload = req.body;
            const operatorId = req.user?.id || null;
            const data = await integration_vault_service_1.IntegrationVaultService.addCredential(vaultId, {
                ...payload,
                operator_id: operatorId
            });
            return res.status(201).json({ success: true, data });
        }
        catch (error) {
            console.error('[VaultController] Failed to add credential:', error.message);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    /**
     * Activates a STANDBY credential.
     */
    static async activateCredential(req, res) {
        try {
            const { vaultId, credentialId } = req.params;
            const data = await integration_vault_service_1.IntegrationVaultService.activateCredential(vaultId, credentialId);
            return res.status(200).json({ success: true, data });
        }
        catch (error) {
            console.error('[VaultController] Failed to activate credential:', error.message);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    /**
     * Deletes a credential.
     */
    static async deleteCredential(req, res) {
        try {
            const { vaultId, credentialId } = req.params;
            await integration_vault_service_1.IntegrationVaultService.deleteCredential(vaultId, credentialId);
            return res.status(200).json({ success: true });
        }
        catch (error) {
            console.error('[VaultController] Failed to delete credential:', error.message);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    /**
     * Tests connection health (dummy ping logic for now, later extended to actual services).
     */
    static async testConnection(req, res) {
        try {
            const { vaultId } = req.params;
            const { serviceIdentifier, environment } = req.body;
            // 1. Fetch decrypted active key
            const key = await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential(serviceIdentifier, environment);
            if (!key) {
                return res.status(404).json({ success: false, error: 'No active credential found to test.' });
            }
            // 2. Perform live network ping (Mocked here)
            const start = Date.now();
            // await axios.get(...) using key
            await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50)); // simulate latency
            const latency = Date.now() - start;
            // 3. Log health
            await integration_vault_service_1.IntegrationVaultService.logHealthCheck(vaultId, environment, 'HEALTHY', latency);
            return res.status(200).json({ success: true, status: 'HEALTHY', latency_ms: latency });
        }
        catch (error) {
            console.error('[VaultController] Connection test failed:', error.message);
            if (req.params.vaultId) {
                await integration_vault_service_1.IntegrationVaultService.logHealthCheck(req.params.vaultId, req.body.environment || 'PRODUCTION', 'DOWN', 0, error.message);
            }
            return res.status(500).json({ success: false, error: error.message });
        }
    }
}
exports.VaultController = VaultController;
//# sourceMappingURL=vault.controller.js.map