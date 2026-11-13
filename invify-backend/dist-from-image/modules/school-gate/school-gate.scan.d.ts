import { SqlQueryClient } from './school-card.sql';
import { CardActor } from './school-card.types';
/**
 * Gate scans write school_entry_exit_sessions and school_entry_exit_events.
 * Classroom present, absent, and late records are outside this module.
 * The raw barcode is hashed in this process and is not sent to SQL.
 * SCHOOL_ID_CARD_SQL must be on, and the schema probe must pass, before any statement runs.
 */
export declare const SCHOOL_GATE_SCAN_PROBE = "\nSELECT (\n  to_regclass('public.school_id_cards') IS NOT NULL\n  AND to_regclass('public.school_id_card_settings') IS NOT NULL\n  AND to_regclass('public.school_entry_exit_sessions') IS NOT NULL\n  AND to_regclass('public.school_entry_exit_events') IS NOT NULL\n  AND to_regclass('public.school_entry_exit_notifications') IS NOT NULL\n  AND to_regprocedure('public.school_gate_sha256_hex(text)') IS NOT NULL\n  AND (\n    SELECT count(*)\n    FROM pg_trigger t\n    JOIN pg_class c ON c.oid = t.tgrelid\n    JOIN pg_namespace n ON n.oid = c.relnamespace\n    WHERE n.nspname = 'public'\n      AND c.relname = 'school_entry_exit_sessions'\n      AND NOT t.tgisinternal\n      AND t.tgname = 'trg_school_entry_exit_session_event_required'\n      AND t.tgdeferrable\n      AND t.tginitdeferred\n  ) = 1\n) AS ready\n";
export type GateDirection = 'arrival' | 'departure';
export type GateOutcome = 'arrival_accepted' | 'departure_accepted' | 'duplicate_open' | 'duplicate_window' | 'departure_without_session' | 'unknown_token' | 'revoked_card' | 'expired_card' | 'inactive_subject' | 'tracking_disabled';
export interface GateScanResult {
    outcome: GateOutcome;
    sessionId: string | null;
    direction: GateDirection;
    person: {
        subjectType: string;
        printedName: string;
        printedCode: string;
    } | null;
    notificationStatus: 'skipped' | 'queued' | 'not_recorded';
    persisted: true;
}
export interface GateScanInput {
    tenantId: string;
    actorUserId: string;
    direction: GateDirection;
    tokenSha256: string;
    deviceLabel: string | null;
}
export declare function gateTokenHash(raw: unknown): string;
export declare function scanHttpStatus(result: GateScanResult): number;
export declare function scanThroughDatabase(actor: CardActor | undefined, body: Record<string, unknown>): Promise<GateScanResult>;
export declare function executeGateScan(client: SqlQueryClient, input: GateScanInput): Promise<GateScanResult>;
export declare function recordConcurrentDuplicate(client: SqlQueryClient, input: GateScanInput): Promise<GateScanResult>;
export interface GateHistory {
    sessions: Array<{
        id: string;
        subjectType: string;
        printedName: string;
        printedCode: string;
        openedAt: string | null;
        closedAt: string | null;
        voidedAt: string | null;
        state: 'open' | 'closed' | 'voided';
        notifications: Array<{
            direction: string;
            status: string;
            skipReason: string | null;
        }>;
    }>;
    limit: number;
    offset: number;
    total: number;
}
export declare function listGateSessionsThroughDatabase(actor: CardActor | undefined, query: Record<string, unknown>): Promise<GateHistory>;
