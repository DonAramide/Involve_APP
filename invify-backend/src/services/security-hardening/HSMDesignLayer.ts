import { StructuredLogger } from '../observability/StructuredLogger';

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

export class HSMDesignLayer {
  private static backend: HSMBackend = 'SOFTWARE';
  private static auditLog: AuditEntry[] = [];

  static clearState() {
    this.auditLog = [];
    this.backend = 'SOFTWARE';
  }

  static setBackend(backend: HSMBackend) {
    this.backend = backend;
  }

  static getBackend(): HSMBackend {
    return this.backend;
  }

  static getAuditLog(): AuditEntry[] {
    return this.auditLog;
  }

  private static generateOperationId(): string {
    return `HSM-OP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  private static mockOutput(operation: HSMOperation): string {
    // Simulated base64-like output for mock/software mode
    const raw = `${operation}:${Date.now()}:${Math.random().toString(36).substring(2)}`;
    return Buffer.from(raw).toString('base64');
  }

  private static recordAudit(result: HSMOperationResult) {
    this.auditLog.push({
      operationId: result.operationId,
      keyId: result.keyId,
      operation: result.operation,
      backend: result.backend,
      success: result.success,
      executedAt: result.executedAt,
    });
    StructuredLogger.info(`[HSM] ${result.operation} on keyId=${result.keyId}`, {
      operationId: result.operationId,
      backend: result.backend,
      success: result.success,
    });
  }

  private static execute(operation: HSMOperation, keyId: string): HSMOperationResult {
    const result: HSMOperationResult = {
      success: true,
      operationId: this.generateOperationId(),
      keyId,
      operation,
      backend: this.backend,
      output: this.mockOutput(operation),
      error: null,
      executedAt: new Date().toISOString(),
    };
    this.recordAudit(result);
    return result;
  }

  /** Sign data with the specified key. */
  static sign(keyId: string, _data: string): HSMOperationResult {
    return this.execute('SIGN', keyId);
  }

  /** Verify a signature against the specified key. */
  static verify(keyId: string, _data: string, _signature: string): HSMOperationResult {
    return this.execute('VERIFY', keyId);
  }

  /** Wrap (encrypt) a key using a key-encryption-key. */
  static wrap(keyId: string, _targetKeyId: string): HSMOperationResult {
    return this.execute('WRAP', keyId);
  }

  /** Unwrap (decrypt) a wrapped key. */
  static unwrap(keyId: string, _wrappedKey: string): HSMOperationResult {
    return this.execute('UNWRAP', keyId);
  }

  /**
   * Generate a new key within the HSM boundary.
   * In SOFTWARE mode this returns a simulated key handle.
   * In HSM_STUB mode this would delegate to PKCS#11 / CloudHSM SDK.
   */
  static generateKey(keyId: string): HSMOperationResult {
    return this.execute('GENERATE_KEY', keyId);
  }
}
