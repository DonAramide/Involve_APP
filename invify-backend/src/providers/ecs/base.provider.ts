export interface EcsConfigurationDefinition {
  key: string;
  valueType: 'string' | 'number' | 'boolean' | 'json';
  defaultValue?: any;
  description?: string;
  validationRule?: string;
  isSecretReference: boolean;
  isRequired: boolean;
  isEditable: boolean;
  restartRequired: boolean;
  displayOrder: number;
}

export interface EcsHealthStatus {
  status: 'connected' | 'warning' | 'failed';
  message: string;
  timestamp: Date;
}

export interface EcsProviderMetadata {
  namespace: string;
  displayName: string;
  category: string;
  supportsSecrets: boolean;
  supportsHealthChecks: boolean;
  version: string;
}

export interface BaseEcsProvider {
  namespace: string;
  displayName: string;
  description: string;
  supportsSecrets: boolean;
  
  initialize?(): Promise<void>;
  metadata(): EcsProviderMetadata;
  getDefinitions(): EcsConfigurationDefinition[];
  validate(values: Record<string, any>): Promise<{ valid: boolean; errors?: string[] }>;
  healthCheck(resolvedConfig: Record<string, any>): Promise<EcsHealthStatus>;
  migrate(): Promise<void>;
}


