"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vault_controller_1 = require("../controllers/vault.controller");
const router = (0, express_1.Router)();
// In production, require authenticate middleware:
// router.use(authenticate);
router.get('/integrations', vault_controller_1.VaultController.listIntegrations);
router.post('/integrations', vault_controller_1.VaultController.registerIntegration);
router.post('/integrations/:vaultId/credentials', vault_controller_1.VaultController.addCredential);
router.patch('/integrations/:vaultId/credentials/:credentialId/activate', vault_controller_1.VaultController.activateCredential);
router.delete('/integrations/:vaultId/credentials/:credentialId', vault_controller_1.VaultController.deleteCredential);
router.post('/integrations/:vaultId/test', vault_controller_1.VaultController.testConnection);
exports.default = router;
//# sourceMappingURL=vault.routes.js.map