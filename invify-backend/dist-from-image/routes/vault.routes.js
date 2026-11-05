"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vault_controller_1 = require("../controllers/vault.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/integrations', vault_controller_1.VaultController.listIntegrations);
router.post('/integrations', vault_controller_1.VaultController.registerIntegration);
router.post('/integrations/:vaultId/credentials', vault_controller_1.VaultController.addCredential);
router.patch('/integrations/:vaultId/credentials/:credentialId', vault_controller_1.VaultController.updateCredential);
router.patch('/integrations/:vaultId/credentials/:credentialId/activate', vault_controller_1.VaultController.activateCredential);
router.delete('/integrations/:vaultId/credentials/:credentialId', vault_controller_1.VaultController.deleteCredential);
router.post('/integrations/:vaultId/test', vault_controller_1.VaultController.testConnection);
router.post('/integrations/:vaultId/test-quasar-partners', vault_controller_1.VaultController.testQuasarPartners);
// Meta WhatsApp Cloud API (Integration Vault)
router.put('/meta-whatsapp', vault_controller_1.VaultController.upsertMetaWhatsApp);
router.get('/meta-whatsapp/status', vault_controller_1.VaultController.getMetaWhatsAppStatus);
exports.default = router;
//# sourceMappingURL=vault.routes.js.map