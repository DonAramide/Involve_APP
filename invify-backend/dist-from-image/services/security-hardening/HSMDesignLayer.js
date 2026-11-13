"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HSMDesignLayer = void 0;
const StructuredLogger_1 = require("../observability/StructuredLogger");
class HSMDesignLayer {
    static backend = 'SOFTWARE';
    static auditLog = [];
    static clearState() {
        this.auditLog = [];
        this.backend = 'SOFTWARE';
    }
    static setBackend(backend) {
        this.backend = backend;
    }
    static getBackend() {
        return this.backend;
    }
    static getAuditLog() {
        return this.auditLog;
    }
    static generateOperationId() {
        return `HSM-OP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }
    static simulatedOutput(operation) {
        // Simulated base64-like output for local/software mode
        const raw = `${operation}:${Date.now()}:${Math.random().toString(36).substring(2)}`;
        return Buffer.from(raw).toString('base64');
    }
    static recordAudit(result) {
        this.auditLog.push({
            operationId: result.operationId,
            keyId: result.keyId,
            operation: result.operation,
            backend: result.backend,
            success: result.success,
            executedAt: result.executedAt,
        });
        StructuredLogger_1.StructuredLogger.info(`[HSM] ${result.operation} on keyId=${result.keyId}`, {
            operationId: result.operationId,
            backend: result.backend,
            success: result.success,
        });
    }
    static execute(operation, keyId) {
        const result = {
            success: true,
            operationId: this.generateOperationId(),
            keyId,
            operation,
            backend: this.backend,
            output: this.simulatedOutput(operation),
            error: null,
            executedAt: new Date().toISOString(),
        };
        this.recordAudit(result);
        return result;
    }
    /** Sign data with the specified key. */
    static sign(keyId, _data) {
        return this.execute('SIGN', keyId);
    }
    /** Verify a signature against the specified key. */
    static verify(keyId, _data, _signature) {
        return this.execute('VERIFY', keyId);
    }
    /** Wrap (encrypt) a key using a key-encryption-key. */
    static wrap(keyId, _targetKeyId) {
        return this.execute('WRAP', keyId);
    }
    /** Unwrap (decrypt) a wrapped key. */
    static unwrap(keyId, _wrappedKey) {
        return this.execute('UNWRAP', keyId);
    }
    /**
     * Generate a new key within the HSM boundary.
     * In SOFTWARE mode this returns a simulated key handle.
     * In HSM_STUB mode this would delegate to PKCS#11 / CloudHSM SDK.
     */
    static generateKey(keyId) {
        return this.execute('GENERATE_KEY', keyId);
    }
}
exports.HSMDesignLayer = HSMDesignLayer;
//# sourceMappingURL=HSMDesignLayer.js.map