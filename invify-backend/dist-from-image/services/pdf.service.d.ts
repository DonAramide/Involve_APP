export interface TermBillItem {
    name: string;
    quantity?: number;
    amount: number;
}
export interface TermBillDocument {
    schoolName: string;
    schoolAddress?: string;
    schoolPhone?: string;
    schoolEmail?: string;
    parentName?: string;
    studentName: string;
    admissionNumber?: string;
    className: string;
    invoiceNumber: string;
    items: TermBillItem[];
    total: number;
    dueDate?: string;
    termName?: string;
    academicYearName?: string;
    virtualAccountNumber?: string;
    virtualAccountBank?: string;
    virtualAccountName?: string;
    /** Exclusive: parent dedicated VA, or school bank if the parent has none. */
    paymentAccountKind?: 'parent' | 'school';
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    issuedAt?: string;
}
export declare function buildTermBillSubject(schoolName: string, studentName: string, className?: string): string;
export declare class PDFService {
    /**
     * Generates a professional, NERDC-compliant PDF for a lesson note.
     */
    static generateLessonNotePDF(note: any, tenantName: string): Promise<Buffer>;
    /**
     * Official school term fee bill (A4) for parent email attachment.
     */
    static generateTermBillPDF(bill: TermBillDocument): Promise<Buffer>;
    /**
     * Downloadable terminal activation certificate emailed after support approval.
     */
    static generateTerminalActivationPDF(docInfo: TerminalActivationDocument): Promise<Buffer>;
}
export interface TerminalActivationDocument {
    businessName: string;
    mode?: string;
    plan?: string;
    durationDays?: number;
    expiry?: string;
    activationCode: string;
    deviceSuffix?: string;
}
