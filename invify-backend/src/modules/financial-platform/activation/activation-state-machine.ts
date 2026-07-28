export enum ConnectionStatus {
  UNPROVISIONED = 'UNPROVISIONED',
  PROVISIONING = 'PROVISIONING',
  ACTIVE = 'ACTIVE',
  DEGRADED = 'DEGRADED',
  SUSPENDING = 'SUSPENDING',
  SUSPENDED = 'SUSPENDED',
  FAILED = 'FAILED',
  DEACTIVATED = 'DEACTIVATED'
}

export class ActivationStateMachine {
  static getValidTransitions(currentStatus: ConnectionStatus): ConnectionStatus[] {
    switch (currentStatus) {
      case ConnectionStatus.UNPROVISIONED:
        return [ConnectionStatus.PROVISIONING];
      case ConnectionStatus.PROVISIONING:
        return [ConnectionStatus.ACTIVE, ConnectionStatus.UNPROVISIONED];
      case ConnectionStatus.ACTIVE:
        return [ConnectionStatus.DEGRADED, ConnectionStatus.SUSPENDING, ConnectionStatus.SUSPENDED, ConnectionStatus.DEACTIVATED];
      case ConnectionStatus.DEGRADED:
        return [ConnectionStatus.ACTIVE, ConnectionStatus.SUSPENDING, ConnectionStatus.SUSPENDED, ConnectionStatus.DEACTIVATED];
      case ConnectionStatus.SUSPENDING:
        return [ConnectionStatus.SUSPENDED, ConnectionStatus.FAILED];
      case ConnectionStatus.SUSPENDED:
        return [ConnectionStatus.ACTIVE, ConnectionStatus.DEACTIVATED];
      case ConnectionStatus.FAILED:
        return [ConnectionStatus.UNPROVISIONED, ConnectionStatus.PROVISIONING];
      case ConnectionStatus.DEACTIVATED:
        return [];
      default:
        return [];
    }
  }

  static canTransition(currentStatus: ConnectionStatus, newStatus: ConnectionStatus): boolean {
    const validTransitions = this.getValidTransitions(currentStatus);
    return validTransitions.includes(newStatus);
  }
}
