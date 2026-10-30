import { SettingsRow, StaffRow, StudentRow, TemplateKey, UserRow } from './school-card.types';
export declare function defaultSettings(tenantId: string, updatedBy: string): SettingsRow;
export declare function validateSettings(row: SettingsRow, approvedSignatureUrls: ReadonlySet<string>): void;
export declare function assertApprovedSignature(url: string, approved: ReadonlySet<string>): void;
export declare function httpsLogo(url: string | null | undefined): string | null;
export declare function printedStudent(student: StudentRow): {
    printedName: string;
    printedCode: string;
    printedDetail: string | null;
};
export declare function printedStaff(staff: StaffRow): {
    printedName: string;
    printedCode: string;
    printedDetail: string | null;
};
export declare function printedAdmin(user: UserRow): {
    printedName: string;
    printedCode: string;
    printedDetail: string | null;
};
export declare function rejectPredictableToken(hash: string, values: Array<string | null | undefined>): void;
export declare function isTemplateKey(value: string): value is TemplateKey;
