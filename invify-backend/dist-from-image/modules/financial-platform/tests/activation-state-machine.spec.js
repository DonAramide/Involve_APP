"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const activation_state_machine_1 = require("../activation/activation-state-machine");
describe('ActivationStateMachine', () => {
    it('should allow valid transition from UNPROVISIONED to PROVISIONING', () => {
        expect(activation_state_machine_1.ActivationStateMachine.canTransition(activation_state_machine_1.ConnectionStatus.UNPROVISIONED, activation_state_machine_1.ConnectionStatus.PROVISIONING)).toBe(true);
    });
    it('should allow valid transition from PROVISIONING to ACTIVE', () => {
        expect(activation_state_machine_1.ActivationStateMachine.canTransition(activation_state_machine_1.ConnectionStatus.PROVISIONING, activation_state_machine_1.ConnectionStatus.ACTIVE)).toBe(true);
    });
    it('should reject invalid transition from ACTIVE to PROVISIONING', () => {
        expect(activation_state_machine_1.ActivationStateMachine.canTransition(activation_state_machine_1.ConnectionStatus.ACTIVE, activation_state_machine_1.ConnectionStatus.PROVISIONING)).toBe(false);
    });
    it('should reject invalid transition from DEACTIVATED to ACTIVE', () => {
        expect(activation_state_machine_1.ActivationStateMachine.canTransition(activation_state_machine_1.ConnectionStatus.DEACTIVATED, activation_state_machine_1.ConnectionStatus.ACTIVE)).toBe(false);
    });
});
//# sourceMappingURL=activation-state-machine.spec.js.map