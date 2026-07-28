import { EcsConfigurationDefinition } from '../base.provider';

export const QipEcsDefinitions: EcsConfigurationDefinition[] = [
  { key: 'qip.quasarIp', valueType: 'string', isRequired: true, isSecretReference: false, isEditable: true, restartRequired: false, displayOrder: 1 },
  { key: 'qip.quasarPort', valueType: 'number', isRequired: true, isSecretReference: false, isEditable: true, restartRequired: false, displayOrder: 2 },
  { key: 'qip.serviceId', valueType: 'string', isRequired: true, isSecretReference: false, isEditable: true, restartRequired: false, displayOrder: 3 },
  { key: 'qip.retailClientId', valueType: 'string', isRequired: true, isSecretReference: false, isEditable: true, restartRequired: false, displayOrder: 4 },
  { key: 'qip.schoolClientId', valueType: 'string', isRequired: true, isSecretReference: false, isEditable: true, restartRequired: false, displayOrder: 5 },
  { key: 'qip.servicesClientId', valueType: 'string', isRequired: true, isSecretReference: false, isEditable: true, restartRequired: false, displayOrder: 6 },
  { key: 'qip.serviceSecret', valueType: 'string', isRequired: false, isSecretReference: true, isEditable: true, restartRequired: false, displayOrder: 7 },
  { key: 'qip.retailClientSecret', valueType: 'string', isRequired: false, isSecretReference: true, isEditable: true, restartRequired: false, displayOrder: 8 },
  { key: 'qip.schoolClientSecret', valueType: 'string', isRequired: false, isSecretReference: true, isEditable: true, restartRequired: false, displayOrder: 9 },
  { key: 'qip.servicesClientSecret', valueType: 'string', isRequired: false, isSecretReference: true, isEditable: true, restartRequired: false, displayOrder: 10 }
];
