export interface EcsSaveRequestDto {
  environment: string;
  tenantId?: string;
  values: Record<string, any>;
}

export interface EcsApiResponse<T = any> {
  success: boolean;
  data?: T;
  metadata?: Record<string, any>;
  error?: {
    code: string;
    message: string;
    details?: string[];
  };
  timestamp: string;
}
