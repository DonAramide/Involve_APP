import { ActivationStateMachine, ConnectionStatus } from '../activation/activation-state-machine';

describe('ActivationStateMachine', () => {
  it('should allow valid transition from UNPROVISIONED to PROVISIONING', () => {
    expect(ActivationStateMachine.canTransition(ConnectionStatus.UNPROVISIONED, ConnectionStatus.PROVISIONING)).toBe(true);
  });

  it('should allow valid transition from PROVISIONING to ACTIVE', () => {
    expect(ActivationStateMachine.canTransition(ConnectionStatus.PROVISIONING, ConnectionStatus.ACTIVE)).toBe(true);
  });

  it('should reject invalid transition from ACTIVE to PROVISIONING', () => {
    expect(ActivationStateMachine.canTransition(ConnectionStatus.ACTIVE, ConnectionStatus.PROVISIONING)).toBe(false);
  });

  it('should reject invalid transition from DEACTIVATED to ACTIVE', () => {
    expect(ActivationStateMachine.canTransition(ConnectionStatus.DEACTIVATED, ConnectionStatus.ACTIVE)).toBe(false);
  });
});
