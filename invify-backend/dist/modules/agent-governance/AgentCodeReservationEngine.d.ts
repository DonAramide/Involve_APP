export declare class AgentCodeReservationEngine {
    private readonly reservedNamespaces;
    /**
     * Generates a globally unique 6-character agent code.
     * Format: 3 letters + 3 numbers (e.g., RET102)
     */
    generateCode(prefix?: string): string;
    isReservedNamespace(code: string): boolean;
    validateCodeFormat(code: string): boolean;
}
