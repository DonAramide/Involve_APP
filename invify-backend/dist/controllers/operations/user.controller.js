"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const operations_facade_1 = require("../../services/operations.facade");
const response_util_1 = require("../../utils/response.util");
class UserController {
    static async listUsers(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(401).json((0, response_util_1.createErrorResponse)(req, 'Unauthorized', 'UNAUTHORIZED'));
            const users = await operations_facade_1.OperationsFacade.listUsers(tenantId);
            return res.status(200).json((0, response_util_1.createResponse)(req, users, { total: users.length, page: 1, pageSize: 50 }));
        }
        catch (error) {
            return res.status(500).json((0, response_util_1.createErrorResponse)(req, error.message, 'LIST_USERS_ERROR'));
        }
    }
    static async createUser(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(401).json((0, response_util_1.createErrorResponse)(req, 'Unauthorized', 'UNAUTHORIZED'));
            const user = await operations_facade_1.OperationsFacade.createUser(tenantId, req.body);
            return res.status(201).json((0, response_util_1.createResponse)(req, user));
        }
        catch (error) {
            return res.status(500).json((0, response_util_1.createErrorResponse)(req, error.message, 'CREATE_USER_ERROR'));
        }
    }
}
exports.UserController = UserController;
//# sourceMappingURL=user.controller.js.map