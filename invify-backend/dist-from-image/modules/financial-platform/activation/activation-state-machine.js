"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivationStateMachine = exports.ConnectionStatus = void 0;
var ConnectionStatus;
(function (ConnectionStatus) {
    ConnectionStatus["UNPROVISIONED"] = "UNPROVISIONED";
    ConnectionStatus["PROVISIONING"] = "PROVISIONING";
    ConnectionStatus["ACTIVE"] = "ACTIVE";
    ConnectionStatus["DEGRADED"] = "DEGRADED";
    ConnectionStatus["SUSPENDING"] = "SUSPENDING";
    ConnectionStatus["SUSPENDED"] = "SUSPENDED";
    ConnectionStatus["FAILED"] = "FAILED";
    ConnectionStatus["DEACTIVATED"] = "DEACTIVATED";
})(ConnectionStatus || (exports.ConnectionStatus = ConnectionStatus = {}));
class ActivationStateMachine {
    static getValidTransitions(currentStatus) {
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
    static canTransition(currentStatus, newStatus) {
        const validTransitions = this.getValidTransitions(currentStatus);
        return validTransitions.includes(newStatus);
    }
}
exports.ActivationStateMachine = ActivationStateMachine;
//# sourceMappingURL=activation-state-machine.js.map