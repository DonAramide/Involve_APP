import { EcsConfigurationDefinition } from '../base.provider';

export const ContaboEcsDefinitions: EcsConfigurationDefinition[] = [
  { key: 'contabo.endpoint', valueType: 'string', isRequired: true, isSecretReference: false, isEditable: true, restartRequired: false, displayOrder: 1 },
  { key: 'contabo.region', valueType: 'string', isRequired: true, isSecretReference: false, isEditable: true, restartRequired: false, displayOrder: 2 },
  { key: 'contabo.bucket', valueType: 'string', isRequired: true, isSecretReference: false, isEditable: true, restartRequired: false, displayOrder: 3 },
  { key: 'contabo.accessKey', valueType: 'string', isRequired: true, isSecretReference: false, isEditable: true, restartRequired: false, displayOrder: 4 },
  { key: 'contabo.secretKey', valueType: 'string', isRequired: false, isSecretReference: true, isEditable: true, restartRequired: false, displayOrder: 5 },
  { key: 'contabo.contaboUploadPublicRead', valueType: 'boolean', isRequired: true, isSecretReference: false, isEditable: true, restartRequired: false, displayOrder: 6 },
  { key: 'contabo.objectStorageUploadPublicRead', valueType: 'boolean', isRequired: true, isSecretReference: false, isEditable: true, restartRequired: false, displayOrder: 7 }
];
