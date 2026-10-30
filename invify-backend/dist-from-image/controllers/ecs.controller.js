"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EcsController = void 0;
const ecs_service_1 = require("../services/ecs.service");
const ecs_errors_1 = require("../utils/ecs-errors");
const registry_1 = require("../providers/ecs/registry");
class EcsController {
    static async getProviders(req, res) {
        try {
            const providers = registry_1.EcsProviderRegistry.getInstance().getAllProviders();
            const metadata = providers.map(p => p.metadata());
            return res.status(200).json(EcsController.formatSuccess(metadata));
        }
        catch (error) {
            return res.status(500).json(EcsController.formatError(error));
        }
    }
    static async getDefinitions(req, res) {
        try {
            const { namespace } = req.params;
            const provider = registry_1.EcsProviderRegistry.getInstance().getProvider(namespace);
            if (!provider) {
                throw new ecs_errors_1.EcsError(ecs_errors_1.EcsErrorCode.CONFIG_PROVIDER_NOT_REGISTERED, `Provider ${namespace} not found`);
            }
            return res.status(200).json(EcsController.formatSuccess(provider.getDefinitions()));
        }
        catch (error) {
            return res.status(404).json(EcsController.formatError(error));
        }
    }
    static async resolveConfiguration(req, res) {
        try {
            const { namespace } = req.params;
            const environment = req.query.environment || 'PRODUCTION';
            const tenantId = req.query.tenantId;
            const resolvedConfig = await ecs_service_1.ecsService.resolve(namespace, environment, tenantId);
            return res.status(200).json(EcsController.formatSuccess(resolvedConfig, { environment, tenantId }));
        }
        catch (error) {
            return res.status(error instanceof ecs_errors_1.EcsError && error.code === ecs_errors_1.EcsErrorCode.CONFIG_PROVIDER_NOT_REGISTERED ? 404 : 500)
                .json(EcsController.formatError(error));
        }
    }
    static async saveConfiguration(req, res) {
        try {
            const { namespace } = req.params;
            const payload = req.body;
            if (!payload.environment) {
                throw new ecs_errors_1.EcsError(ecs_errors_1.EcsErrorCode.CONFIG_ENVIRONMENT_INVALID, 'Environment is required');
            }
            const saveResult = await ecs_service_1.ecsService.save(namespace, payload.environment, payload.values, payload.tenantId);
            const status = saveResult.failed.length > 0 ? 207 : 200; // 207 Multi-Status if some failed
            return res.status(status).json(EcsController.formatSuccess({
                message: saveResult.summary,
                vault: {
                    saved: saveResult.saved,
                    skipped: saveResult.skipped,
                    failed: saveResult.failed,
                    verified: saveResult.verified,
                }
            }));
        }
        catch (error) {
            const status = error instanceof ecs_errors_1.EcsError && error.code === ecs_errors_1.EcsErrorCode.CONFIG_VALIDATION_FAILED ? 400 : 500;
            return res.status(status).json(EcsController.formatError(error));
        }
    }
    static async runHealthCheck(req, res) {
        try {
            const { namespace } = req.params;
            const provider = registry_1.EcsProviderRegistry.getInstance().getProvider(namespace);
            if (!provider) {
                throw new ecs_errors_1.EcsError(ecs_errors_1.EcsErrorCode.CONFIG_PROVIDER_NOT_REGISTERED, `Provider ${namespace} not found`);
            }
            // Resolve the current config to test with
            const environment = req.query.environment || 'PRODUCTION';
            const resolvedConfig = await ecs_service_1.ecsService.resolve(namespace, environment);
            const healthStatus = await provider.healthCheck(resolvedConfig);
            return res.status(200).json(EcsController.formatSuccess(healthStatus));
        }
        catch (error) {
            return res.status(500).json(EcsController.formatError(error));
        }
    }
    // --- Response Formatters ---
    static formatSuccess(data, metadata) {
        return {
            success: true,
            data,
            metadata,
            timestamp: new Date().toISOString()
        };
    }
    static formatError(error) {
        const isEcsError = error instanceof ecs_errors_1.EcsError;
        return {
            success: false,
            error: {
                code: isEcsError ? error.code : 'INTERNAL_SERVER_ERROR',
                message: error.message || 'An unexpected error occurred',
                details: isEcsError ? error.details : []
            },
            timestamp: new Date().toISOString()
        };
    }
}
exports.EcsController = EcsController;
//# sourceMappingURL=ecs.controller.js.map