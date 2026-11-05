"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsController = void 0;
const operations_facade_1 = require("../../services/operations.facade");
const response_util_1 = require("../../utils/response.util");
class SettingsController {
    static async updateSettings(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            const { group } = req.params;
            if (!tenantId)
                return res.status(401).json((0, response_util_1.createErrorResponse)(req, 'Unauthorized', 'UNAUTHORIZED'));
            if (!group)
                return res.status(400).json((0, response_util_1.createErrorResponse)(req, 'Group is required', 'BAD_REQUEST'));
            const settings = await operations_facade_1.OperationsFacade.updateSettingsGroup(tenantId, group, req.body);
            return res.status(200).json((0, response_util_1.createResponse)(req, settings));
        }
        catch (error) {
            return res.status(500).json((0, response_util_1.createErrorResponse)(req, error.message, 'UPDATE_SETTINGS_ERROR'));
        }
    }
}
exports.SettingsController = SettingsController;
//# sourceMappingURL=settings.controller.js.map