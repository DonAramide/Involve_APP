import { SqlQueryClient } from './school-card.sql';
import { CardActor, CardFace, PublicCard, SettingsRow, SubjectType } from './school-card.types';
/**
 * Fail closed. Real requests stay on the unapplied store unless
 * SCHOOL_ID_CARD_SQL=on and the probe below finds the applied schema.
 * This module does not connect at import time. The pool is loaded only
 * inside withConfirmedSchoolCardDatabase, and only after that flag is on.
 * Use getClient() from src/db/pg.ts. Do not use dbQuery: it logs SQL text.
 */
export declare const SCHOOL_CARD_SCHEMA_PROBE = "\nSELECT (\n  to_regclass('public.school_id_cards') IS NOT NULL\n  AND to_regclass('public.school_id_card_settings') IS NOT NULL\n  AND to_regclass('public.school_gate_audit_events') IS NOT NULL\n  AND to_regprocedure('public.school_gate_sha256_hex(text)') IS NOT NULL\n  AND (\n    SELECT count(*)\n    FROM pg_trigger t\n    JOIN pg_class c ON c.oid = t.tgrelid\n    JOIN pg_namespace n ON n.oid = c.relnamespace\n    WHERE n.nspname = 'public'\n      AND c.relname = 'school_id_cards'\n      AND NOT t.tgisinternal\n      AND (\n        (t.tgname = 'trg_school_id_cards_guard' AND NOT t.tgdeferrable)\n        OR (t.tgname = 'trg_school_id_cards_audit' AND t.tgdeferrable AND t.tginitdeferred)\n      )\n  ) = 2\n) AS ready\n";
export declare function schoolCardSqlRequested(): boolean;
export declare function schemaProbeIsReady(row: {
    ready?: unknown;
} | undefined): boolean;
export declare function withConfirmedSchoolCardDatabase<T>(work: (client: SqlQueryClient) => Promise<T>): Promise<T>;
export declare function issueCardThroughDatabase(actor: CardActor | undefined, request: {
    subjectType?: unknown;
    subjectId?: unknown;
    expiresAt?: unknown;
}): Promise<{
    barcodeValue: string;
    card: Record<string, unknown>;
}>;
export declare function replaceCardThroughDatabase(actor: CardActor | undefined, cardId: string): Promise<{
    barcodeValue: string;
    card: Record<string, unknown>;
}>;
export declare function revokeCardThroughDatabase(actor: CardActor | undefined, cardId: string, reason: unknown): Promise<{
    card: {
        id: string;
        status: string;
    };
}>;
export declare function saveSettingsThroughDatabase(actor: CardActor | undefined, patch: Partial<SettingsRow>): Promise<SettingsRow>;
export declare function readSettingsThroughDatabase(actor: CardActor | undefined): Promise<SettingsRow>;
export declare function listCardsThroughDatabase(actor: CardActor | undefined): Promise<PublicCard[]>;
export declare function readMyCardThroughDatabase(actor: CardActor | undefined): Promise<{
    card: PublicCard | null;
    barcodeAvailable: false;
    message: string;
}>;
export declare function listEligibleThroughDatabase(actor: CardActor | undefined): Promise<{
    students: EligiblePerson[];
    staff: EligiblePerson[];
    administrators: EligiblePerson[];
}>;
export declare function previewThroughDatabase(actor: CardActor | undefined, request: {
    subjectType?: unknown;
    subjectId?: unknown;
}): Promise<CardFace>;
export declare function batchThroughDatabase(actor: CardActor | undefined, people: Array<{
    subjectType?: unknown;
    subjectId?: unknown;
}>): Promise<Array<{
    card: PublicCard;
    face: CardFace;
    barcodeValue: string;
}>>;
interface EligiblePerson {
    subjectType: SubjectType;
    subjectId: string;
    name: string;
    printedCode: string;
    detail: string | null;
    cardStatus: 'active' | 'revoked' | 'pending' | 'none';
    activeCardId: string | null;
}
export {};
