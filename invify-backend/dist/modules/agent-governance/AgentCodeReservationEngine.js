"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentCodeReservationEngine = void 0;
class AgentCodeReservationEngine {
    reservedNamespaces = ['AAA', 'INV', 'SYS', 'ADM', 'ROT']; // ROOT** is 4 chars, using ROT for 3 char prefix
    /**
     * Generates a globally unique 6-character agent code.
     * Format: 3 letters + 3 numbers (e.g., RET102)
     */
    generateCode(prefix) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const nums = '0123456789';
        let generatedPrefix = prefix ? prefix.toUpperCase().substring(0, 3) : '';
        // Auto-generate prefix if not provided or invalid
        if (generatedPrefix.length < 3) {
            generatedPrefix = '';
            for (let i = 0; i < 3; i++) {
                generatedPrefix += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        }
        // Ensure generated prefix does not collide with reserved namespaces
        if (!prefix && this.isReservedNamespace(generatedPrefix)) {
            return this.generateCode(); // Try again
        }
        let suffix = '';
        for (let i = 0; i < 3; i++) {
            suffix += nums.charAt(Math.floor(Math.random() * nums.length));
        }
        return `${generatedPrefix}${suffix}`;
    }
    isReservedNamespace(code) {
        const prefix = code.substring(0, 3).toUpperCase();
        return this.reservedNamespaces.includes(prefix) || code.toUpperCase().startsWith('ROOT');
    }
    validateCodeFormat(code) {
        // Basic format validation: 6 chars, alphanumeric
        return /^[A-Z0-9]{6}$/i.test(code);
    }
}
exports.AgentCodeReservationEngine = AgentCodeReservationEngine;
//# sourceMappingURL=AgentCodeReservationEngine.js.map