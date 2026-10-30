"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rbacService = exports.RbacService = void 0;
const rbac_repository_1 = require("../repositories/rbac.repository");
class RbacService {
    async listRoles() { return rbac_repository_1.rbacRepository.listRoles(); }
}
exports.RbacService = RbacService;
exports.rbacService = new RbacService();
//# sourceMappingURL=rbac.service.js.map