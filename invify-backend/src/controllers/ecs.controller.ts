import { Request, Response } from 'express';
import { ecsService } from '../services/ecs.service';
import { EcsSaveRequestDto, EcsApiResponse } from '../dtos/ecs.dto';
import { EcsError, EcsErrorCode } from '../utils/ecs-errors';
import { EcsProviderRegistry } from '../providers/ecs/registry';

export class EcsController {

  static async getProviders(req: Request, res: Response) {
    try {
      const providers = EcsProviderRegistry.getInstance().getAllProviders();
      const metadata = providers.map(p => p.metadata());
      
      return res.status(200).json(EcsController.formatSuccess(metadata));
    } catch (error: any) {
      return res.status(500).json(EcsController.formatError(error));
    }
  }

  static async getDefinitions(req: Request, res: Response) {
    try {
      const { namespace } = req.params;
      const provider = EcsProviderRegistry.getInstance().getProvider(namespace);
      if (!provider) {
        throw new EcsError(EcsErrorCode.CONFIG_PROVIDER_NOT_REGISTERED, `Provider ${namespace} not found`);
      }
      
      return res.status(200).json(EcsController.formatSuccess(provider.getDefinitions()));
    } catch (error: any) {
      return res.status(404).json(EcsController.formatError(error));
    }
  }

  static async resolveConfiguration(req: Request, res: Response) {
    try {
      const { namespace } = req.params;
      const environment = (req.query.environment as string) || 'PRODUCTION';
      const tenantId = req.query.tenantId as string | undefined;

      const resolvedConfig = await ecsService.resolve(namespace, environment, tenantId);
      
      return res.status(200).json(EcsController.formatSuccess(resolvedConfig, { environment, tenantId }));
    } catch (error: any) {
      return res.status(error instanceof EcsError && error.code === EcsErrorCode.CONFIG_PROVIDER_NOT_REGISTERED ? 404 : 500)
        .json(EcsController.formatError(error));
    }
  }

  static async saveConfiguration(req: Request, res: Response) {
    try {
      const { namespace } = req.params;
      const payload: EcsSaveRequestDto = req.body;

      if (!payload.environment) {
        throw new EcsError(EcsErrorCode.CONFIG_ENVIRONMENT_INVALID, 'Environment is required');
      }

      const saveResult = await ecsService.save(namespace, payload.environment, payload.values, payload.tenantId);

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
    } catch (error: any) {
      const status = error instanceof EcsError && error.code === EcsErrorCode.CONFIG_VALIDATION_FAILED ? 400 : 500;
      return res.status(status).json(EcsController.formatError(error));
    }
  }

  static async runHealthCheck(req: Request, res: Response) {
    try {
      const { namespace } = req.params;
      const provider = EcsProviderRegistry.getInstance().getProvider(namespace);
      
      if (!provider) {
        throw new EcsError(EcsErrorCode.CONFIG_PROVIDER_NOT_REGISTERED, `Provider ${namespace} not found`);
      }

      // Resolve the current config to test with
      const environment = (req.query.environment as string) || 'PRODUCTION';
      const resolvedConfig = await ecsService.resolve(namespace, environment);
      
      const healthStatus = await provider.healthCheck(resolvedConfig);
      
      return res.status(200).json(EcsController.formatSuccess(healthStatus));
    } catch (error: any) {
      return res.status(500).json(EcsController.formatError(error));
    }
  }

  // --- Response Formatters ---
  
  private static formatSuccess<T>(data: T, metadata?: Record<string, any>): EcsApiResponse<T> {
    return {
      success: true,
      data,
      metadata,
      timestamp: new Date().toISOString()
    };
  }

  private static formatError(error: any): EcsApiResponse<null> {
    const isEcsError = error instanceof EcsError;
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
