export type HSMBackend = 'SOFTWARE' | 'HSM_STUB';
export type HSMOperation = 'SIGN' | 'VERIFY' | 'WRAP' | 'UNWRAP' | 'GENERATE_KEY';
export interface HSMOperationResult {
    success: boolean;
    operationId: string;
    keyId: string;
    operation: HSMOperation;
    backend: HSMBackend;
    /** Simulated output (base64-like string) */
    output: string | null;
    error: string | null;
    executedAt: string;
}
interface AuditEntry {
    operationId: string;
    keyId: string;
    operation: HSMOperation;
    backend: HSMBackend;
    success: boolean;
    executedAt: string;
}
export declare class HSMDesignLayer {
    private static backend;
    private static auditLog;
    static clearState(): void;
    static setBackend(backend: HSMBackend): void;
    static getBackend(): HSMBackend;
    static getAuditLog(): AuditEntry[];
    private static generateOperationId;
    private static simulatedOutput;
    private static recordAudit;
    private static execute;
    /** Sign data with the specified key. */
    static sign(keyId: string, _data: string): HSMOperationResult;
    /** Verify a signature against the specified key. */
    static verify(keyId: string, _data: string, _signature: string): HSMOperationResult;
    /** Wrap (encrypt) a key using a key-encryption-key. */
    static wrap(keyId: string, _targetKeyId: string): HSMOperationResult;
    /** Unwrap (decrypt) a wrapped key. */
    static unwrap(keyId: string, _wrappedKey: string): HSMOperationResult;
    /**
     * Generate a new key within the HSM boundary.
     * In SOFTWARE mode this returns a simulated key handle.
     * In HSM_STUB mode this would delegate to PKCS#11 / CloudHSM SDK.
     */
    static generateKey(keyId: string): HSMOperationResult;
}
export {};
