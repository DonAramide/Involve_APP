import type { KimonoTerminalParams, PosRoutingConfig, PosTransactionResult, MposEmvData, PosHostConfig } from '../types/pos.types';
export declare class PosService {
    /** key_version=1: plaintext-era rows. key_version=2+: field-level AES via POS_ENCRYPTION_KEY. */
    static readonly CURRENT_KEY_VERSION = 2;
    static readonly SECRET_MASK = "[SECRET_MASKED]";
    /**
     * AES-256-CBC encryption key derived from POS_ENCRYPTION_KEY env var.
     * Throws at access time if env var is not set — fail fast.
     */
    private static get ENCRYPTION_KEY();
    private static IV_LENGTH;
    private static isEncryptedSecretFormat;
    private static encryptSecret;
    private static decryptSecret;
    private static mapSecrets;
    /**
     * Server-side redaction for API responses. Never returns decrypted secrets to clients.
     * Does not mutate the in-memory routingConfig used by POS internals.
     */
    static sanitizeRoutingConfigForClient(config: PosRoutingConfig): PosRoutingConfig;
    static routingConfig: PosRoutingConfig;
    /**
     * Loads POS routing config from Supabase pos_routing_configs table.
     * Async — must be awaited at server bootstrap.
     * Defaults to in-memory config only in LOCAL development mode (NODE_ENV=development and POS_ENCRYPTION_KEY absent).
     */
    static loadConfig(): Promise<void>;
    /** Best-effort restore from legacy pos_routing_config.json (pre-Supabase). */
    static tryHydrateFromLegacyJson(): boolean;
    /**
     * If live NIBSS CTMK was overwritten with UI placeholder `[SECRET_MASKED]` (or wiped),
     * restore CTMK / port from legacy pos_routing_config.json so devices can key-exchange.
     */
    static repairNibssSecretsFromLegacy(): boolean;
    static tryHydrateProfilesFromLegacyJson(): boolean;
    /** Latest persisted config_version (updated on load/save). */
    static configVersion: number;
    /**
     * Saves POS routing config to Supabase pos_routing_configs table as an encrypted blob.
     * Inserts a new versioned row — never updates in place (full audit trail).
     * key_version: tracks encryption key rotation.
     * config_version: tracks routing configuration revisions.
     */
    static saveConfig(updatedBy?: string): Promise<number>;
    /**
     * Keep pos_routing_config.json aligned with routing structure for hydrate/compat.
     * Never persists decrypted secrets — secrets are masked before write.
     */
    static mirrorConfigToLegacyJson(): void;
    static getConfigVersion(): number;
    /**
     * Resolve the terminal group used for Group-scoped profiles.
     * Prefer Express Pay host terminalGroup, then any host that defines one,
     * then "Default" when a Group profile targets Default (common platform setup).
     */
    static resolveTerminalGroup(): string | null;
    /**
     * Pick the most specific routing profile:
     * Tenant → Agent → Group → Category (legacy category field included).
     */
    static resolveTenantRoutingProfile(ctx: {
        tenantId?: string | null;
        agentCode?: string | null;
        terminalGroup?: string | null;
        category?: string | null;
    }): any | null;
    static tenantCategoryCache: Map<string, string>;
    static tenantContextCache: Map<string, {
        category: string;
        agentCode: string | null;
    }>;
    static cacheTenantCategory: (tenantId: string) => Promise<void>;
    private static kimonoParamsCache;
    private static CACHE_TTL_MS;
    private static transactionHistory;
    private static newTxId;
    /** Deterministic UUID so card webhook retries upsert the same attempt row. */
    static cardReferenceToAttemptId(tenantId: string, reference: string): string;
    private static mapCardWebhookStatus;
    private static hostFromCardMode;
    /**
     * Apply Quasar card.transaction.* webhook to the tenant POS attempt.
     * Idempotent: updates existing row matched by reference / RRN+STAN; never creates duplicates.
     * Does NOT credit wallets or post ledger.
     */
    static applyCardWebhookUpdate(params: {
        tenantId: string;
        event: string;
        data: Record<string, any>;
    }): Promise<{
        updated: boolean;
        duplicate: boolean;
        created: boolean;
        attemptId: string;
        status: string;
    }>;
    private static mapAttemptRow;
    /** Durable write — must use UUID ids (table PK is UUID). */
    private static persistAttempt;
    /** Fill blank NIBSS IP/port with production switch defaults (admin drawer shows these without Save). */
    static applyNibssHostDefaults(): void;
    static getRoutingConfig(): Promise<PosRoutingConfig>;
    /**
     * Resolve an incoming secret field for update.
     * - `[SECRET_MASKED]` or empty/missing → keep existing (never persist the placeholder)
     * - any other value → treat as intentional replacement
     * Only apply to known secret fields (ctmk / authToken / kimono keys / fallback token).
     */
    private static resolveIncomingSecret;
    static updateRoutingConfig(newConfig: any, adminId?: string, reason?: string): Promise<{
        configVersion: number;
        broadcasted: boolean;
        activeHost: "medusa" | "nibss" | "kimono" | "express_pay";
        failoverOrder: Array<"medusa" | "nibss" | "kimono" | "express_pay">;
        splitThresholdNaira: number;
        thresholdRulesMatrix: import("../types/pos.types").ThresholdRule[];
        tenantRoutingProfiles: import("../types/pos.types").TenantRoutingProfile[];
        hosts: PosHostConfig[];
    }>;
    static getTransactionHistory(tenantId: string): Promise<any[]>;
    /** Attach tenant display names for Switch Board UI. */
    private static enrichHistoryWithTenantNames;
    static getObservabilityMetrics(): Promise<{
        totalTransactions: number;
        successRate: number;
        hostDistribution: Record<string, number>;
        hostSuccessRate: Record<string, number>;
        hostAvgLatency: Record<string, number>;
        hostFailoverCount: Record<string, number>;
        deviceProcessedCount: number;
        switchboardProcessedCount: number;
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
        latitude?: number;
        longitude?: number;
        field120?: string;
        geofencing?: Record<string, unknown>;
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
        latitude?: number;
        longitude?: number;
        field120?: string;
        geofencing?: Record<string, unknown>;
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
    /**
     * Attempt Quasar /pos/card-transaction for ISO hosts.
     * Returns null when Quasar is not configured / disabled so caller can use local switchboard.
     */
    private static tryProcessViaQuasar;
    /**
     * Quasar TCP TLS verify flag for iso_tcp.
     * Route: tlsRejectUnauthorized | tls_reject_unauthorized
     * Env: QUASAR_ISO_TLS_REJECT_UNAUTHORIZED=true|false
     * Default when ssl and unset: false (Accelerex/NIBSS IP certs fail Node CA store).
     */
    private static resolveQuasarIsoTlsRejectUnauthorized;
    private static resolveQuasarPosEncryptionKey;
    /** Prefer device-packed ISO fields (minus DE55) when hex is present. */
    private static extractRrnStanFromEmv;
    /** NIBSS field 54 additional amount, formatted as naira. */
    private static additionalAmountNaira;
    /**
     * Unpack device PosPackager hex (same layout Quasar uses).
     * Does NOT use iso8583-js (that package has no `.parse` — class + unWrapMsg only).
     */
    private static fieldsFromPackedIsoHex;
    /** Convert PosPackager numeric-key map → Quasar string-key field map (binary → hex). */
    private static isoFieldsToQuasarMap;
    /** Optional structured field map from device (when packed hex absent). */
    private static normalizeEmvIsoFieldMap;
    /** Build ISO fields for Quasar (exclude DE55 — sent via icc_token). */
    private static buildIsoFieldsFromEmv;
    private static processViaTcpSocket;
    private static tcpExchange;
    /**
     * Parse a raw ISO8583 response buffer using PosPackager unpack.
     * Returns the response code (field 39) and the full decoded field map.
     *
     * Falls back to the heuristic extractor if unpack throws.
     */
    static parseIsoMessage(raw: Buffer, context?: string): {
        responseCode: string;
        isoFields: Record<string, any>;
    };
    /**
     * Heuristic fallback: scan ASCII-packed ISO8583 response for a 2-char
     * response code near the expected field-39 offset.
     * Only used when PosPackager unpack throws.
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
    static determineRoute(amountNaira: number, tenantId?: string, transactionType?: string, cardScheme?: string, simulatedHealthOverrides?: Record<string, {
        status: 'ONLINE' | 'OFFLINE';
        healthScore: number;
    }>, routingContext?: {
        category?: string | null;
        agentCode?: string | null;
        terminalGroup?: string | null;
    }): {
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
    /** Map internal/ops errors to cashier-facing copy. Technical detail stays in server logs. */
    private static toTenantFacingMessage;
    private static isoResponseMessage;
    private static updateTransaction;
}
