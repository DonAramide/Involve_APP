/**
 * Postgres transaction adapter for school ID cards.
 * It does not import the database pool and it does not read a connection string.
 * The HTTP gate loads a transaction client only after SCHOOL_ID_CARD_SQL=on and a schema probe.
 * dbQuery must not run these statements because it logs SQL text.
 */
export interface SqlQueryClient {
    query(text: string, params?: readonly unknown[]): Promise<{
        rows: unknown[];
        rowCount: number | null;
    }>;
}
export interface SqlStatement {
    text: string;
    params: readonly unknown[];
}
export declare const SCHOOL_CARD_PERSISTENCE_PREREQUISITE: string;
export declare function schoolCardPersistenceStatus(): {
    operational: false;
    code: 'SCHOOL_GATE_SCHEMA_UNAPPLIED';
    prerequisite: string;
};
export declare function runSchoolCardTransaction<T>(client: SqlQueryClient, work: (query: SqlQueryClient['query']) => Promise<T>): Promise<T>;
export interface CardSqlWrite {
    id: string;
    tenantId: string;
    subjectType: string;
    studentId: string | null;
    staffId: string | null;
    adminUserId: string | null;
    tokenSha256: string;
    expiresAt: string | null;
    replacesCardId: string | null;
    printedName: string;
    printedCode: string;
    printedDetail: string | null;
    issuedBy: string;
}
export declare function cardInsertStatement(card: CardSqlWrite): SqlStatement;
export declare function replacementStatements(card: CardSqlWrite, previousId: string, reason: string): SqlStatement[];
export declare function executeCardReplacement(client: SqlQueryClient, card: CardSqlWrite, previousId: string, reason: string): Promise<void>;
export declare function executeCardIssue(client: SqlQueryClient, card: CardSqlWrite): Promise<void>;
export declare function executeCardRevoke(client: SqlQueryClient, tenantId: string, cardId: string, actorId: string, reason: string): Promise<void>;
export declare function executeSettingsSave(client: SqlQueryClient, row: {
    tenantId: string;
    updatedBy: string;
    studentTemplate: string;
    staffTemplate: string;
    adminTemplate: string;
    paperSize: string;
    cardWidthMm: number;
    cardHeightMm: number;
    printOrientation: string;
    logoPlacement: string;
    accentColor: string;
    showAddress: boolean;
    showClassOrDepartment: boolean;
    showStatus: boolean;
    showIssueDate: boolean;
    showExpiry: boolean;
    disclaimer: string;
    signatureImageUrl: string | null;
    signatoryName: string | null;
    signatoryDesignation: string | null;
    lostFoundPhone: string | null;
    lostFoundEmail: string | null;
    notifyStudentArrival: boolean;
    notifyStudentDeparture: boolean;
    notifyStaffArrival: boolean;
    notifyStaffDeparture: boolean;
    trackAdminEntry: boolean;
    duplicateScanWindowSeconds: number;
}): Promise<void>;
