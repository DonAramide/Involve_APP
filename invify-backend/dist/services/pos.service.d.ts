import type { KimonoTerminalParams, PosRoutingConfig, PosTransactionResult, MposEmvData } from '../types/pos.types';
export declare class PosService {
    /**
     * AES-256-CBC encryption key derived from POS_ENCRYPTION_KEY env var.
     * Throws at access time if env var is not set — fail fast.
     */
    private static get ENCRYPTION_KEY();
    private static IV_LENGTH;
    private static encryptSecret;
    private static decryptSecret;
    private static mapSecrets;
    static routingConfig: PosRoutingConfig;
    /**
     * Loads POS routing config from Supabase pos_routing_configs table.
     * Async — must be awaited at server bootstrap.
     * Defaults to in-memory config only in LOCAL development mode (NODE_ENV=development and POS_ENCRYPTION_KEY absent).
     */
    static loadConfig(): Promise<void>;
    /**
     * Saves POS routing config to Supabase pos_routing_configs table as an encrypted blob.
     * Inserts a new versioned row — never updates in place (full audit trail).
     * key_version: tracks encryption key rotation.
     * config_version: tracks routing configuration revisions.
     */
    static saveConfig(updatedBy?: string): Promise<void>;
    static tenantCategoryCache: Map<string, string>;
    static cacheTenantCategory: (tenantId: string) => Promise<void>;
    private static kimonoParamsCache;
    private static CACHE_TTL_MS;
    private static transactionHistory;
    static getRoutingConfig(): Promise<PosRoutingConfig>;
    static updateRoutingConfig(newConfig: any, adminId?: string, reason?: string): Promise<PosRoutingConfig>;
    static getTransactionHistory(_tenantId: string): Promise<any[]>;
    static getObservabilityMetrics(): Promise<{
        totalTransactions: number;
        successRate: number;
        hostDistribution: Record<string, number>;
        hostSuccessRate: Record<string, number>;
        hostAvgLatency: Record<string, number>;
        hostFailoverCount: Record<string, number>;
        recentAuditTrail: any[];
    }>;
    /**
     * Main entry point. Called by PosController.
     *
     * emvData matches MposEmvData — individual parsed EMV fields sent by the mPOS
     * device (com.demo.mposaisino EmvDetailResult). No raw TLV blob is required
     * because the mPOS SDK extracts tags separately.
     */
    static processTransaction(params: {
        tenantId: string;
        terminalId: string;
        amount: number;
        emvData: MposEmvData;
        staffName?: string;
        items?: any[];
    }): Promise<PosTransactionResult>;
    static recordDeviceTransaction(params: {
        tenantId: string;
        terminalId: string;
        amount: number;
        emvData: any;
        isDeviceProcessed?: boolean;
        staffName?: string;
        items?: any[];
        deviceStatus?: string;
        transactionResponse?: any;
        tenantProfile?: any;
        deviceInfo?: any;
    }): Promise<{
        paymentSuccess: boolean;
        recordedId: string;
        status: string;
    }>;
    static fetchKimonoParams(terminalId: string, amountKobo?: string, binCode?: string): Promise<KimonoTerminalParams>;
    static clearKimonoParamsCache(terminalId?: string): void;
    /**
     * Builds the CardIccDataInfo payload for Kimono endpoint.
     *
     * Uses individual EMV fields exactly as they come from the mPOS device
     * (EmvDetailResult from com.demo.mposaisino). Fields map 1-to-1 with
     * the TLV tags extracted by the mPOS SDK.
     *
     * @param pan  The resolved PAN (caller already coalesced emvData.pan || emvData.cardNo).
     */
    private static buildKimonoPayload;
    private static processViaKimono;
    private static processViaTcpSocket;
    private static tcpExchange;
    /**
     * Parse a raw ISO8583 response buffer using iso8583-js.
     * Returns the response code (field 39) and the full decoded field map.
     *
     * Falls back to the heuristic extractor if the library throws.
     */
    static parseIsoMessage(raw: Buffer, context?: string): {
        responseCode: string;
        isoFields: Record<string, any>;
    };
    /**
     * Heuristic fallback: scan ASCII-packed ISO8583 response for a 2-char
     * response code near the expected field-39 offset.
     * Only used when iso8583-js throws.
     */
    private static extractField39Heuristic;
    /**
     * Determines the route for a transaction.
     *
     * Rules:
     * 1. If activeHost === 'kimono' (toggle ON) → always use Kimono.
     * 2. If toggle is OFF (not kimono):
     *    - amount in kobo < 5,000,000  (< ₦50,000)  → Medusa
     *    - amount in kobo ≥ 5,000,000  (≥ ₦50,000)  → Kimono
     * 3. Walk failoverOrder if chosen host is inactive.
     */
    static detectCardScheme(pan: string): string;
    static getHostSlaScore(hostCode: string): number;
    static determineRoute(amountNaira: number, tenantId: string, transactionType: string, cardScheme: string, simulatedHealthOverrides?: Record<string, {
        status: 'ONLINE' | 'OFFLINE';
        healthScore: number;
    }>): {
        name: string;
        config: any;
    };
    private static getFailover;
    private static buildCpointHeaders;
    private static httpGet;
    private static httpPost;
    private static getUdfValue;
    private static maskPan;
    private static formatDate;
    private static buildErrorResponse;
    private static isoResponseMessage;
    private static updateTransaction;
}
