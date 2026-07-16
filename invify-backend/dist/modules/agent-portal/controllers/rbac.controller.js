"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RbacController = void 0;
const rbac_service_1 = require("../services/rbac.service");
class RbacController {
    static async listRoles(req, res) {
        try {
            res.status(200).json({ success: true, data: await rbac_service_1.rbacService.listRoles() });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
}
exports.RbacController = RbacController;
//# sourceMappingURL=rbac.controller.js.map