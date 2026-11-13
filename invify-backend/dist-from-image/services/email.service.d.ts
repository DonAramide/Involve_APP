export declare class EmailService {
    private transporter;
    private isInitializing;
    private getTransporter;
    private sendMail;
    sendVerificationCode(to: string, otp: string): Promise<boolean>;
    sendPasswordResetCode(to: string, otp: string): Promise<boolean>;
    private resolveManualPdf;
    private resolveUserManualPdf;
    private isSchoolMode;
    private userManualAttachment;
    private userManualHtml;
    /**
     * Resolve portal login URL from explicit option or BuildVariantService.
     * Production never falls back to staging.
     */
    private resolveLoginUrl;
    sendWelcomeEmail(to: string, options?: {
        name?: string;
        role?: string;
        defaultPassword?: string;
        loginUrl?: string;
        businessMode?: string;
    }): Promise<boolean>;
    private escapeHtml;
    private agentActionButton;
    sendAgentWelcomeEmail(to: string, options: {
        name: string;
        agentCode: string;
        setPasswordLink: string;
        loginUrl: string;
    }): Promise<boolean>;
    sendAgentPasswordResetEmail(to: string, options: {
        name: string;
        setPasswordLink: string;
        loginUrl: string;
    }): Promise<boolean>;
    sendProfileUpdateEmail(to: string, options: {
        name?: string;
        role?: string;
        tenantName?: string;
        defaultPassword?: string;
        isActive?: boolean;
        loginUrl?: string;
    }): Promise<boolean>;
    sendTenantAlertEmail(to: string, details: {
        name?: string;
        title: string;
        body: string;
    }): Promise<boolean>;
    sendLoginAlertEmail(to: string, details: {
        name?: string;
        ipAddress: string;
        deviceId?: string;
        userAgent?: string;
        location?: string;
        loginTime?: string;
        portal?: string;
    }): Promise<boolean>;
    private formatNgnHtml;
    safePdfFilename(studentName: string, invoiceNumber?: string): string;
    /**
     * Individual parent term-fee bill with a downloadable PDF attachment.
     */
    sendTermBillEmail(to: string, bill: {
        schoolName: string;
        schoolAddress?: string;
        schoolPhone?: string;
        schoolEmail?: string;
        parentName?: string;
        studentName: string;
        admissionNumber?: string;
        className: string;
        invoiceNumber: string;
        items: {
            name: string;
            quantity?: number;
            amount: number;
        }[];
        total: number;
        dueDate?: string;
        termName?: string;
        academicYearName?: string;
        virtualAccountNumber?: string;
        virtualAccountBank?: string;
        virtualAccountName?: string;
        paymentAccountKind?: 'parent' | 'school';
        bankName?: string;
        accountNumber?: string;
        accountName?: string;
        issuedAt?: string;
    }, pdfBuffer: Buffer): Promise<boolean>;
    /**
     * School-to-parent broadcast notice email with HTML escaping and school sender attribution.
     */
    sendParentNotice(to: string, subject: string, message: string, schoolName: string): Promise<boolean>;
    activationPdfFilename(businessName: string): string;
    /**
     * Approved terminal activation, with a downloadable PDF the tenant can save.
     */
    sendTerminalActivationEmail(to: string, activation: {
        businessName: string;
        mode?: string;
        plan?: string;
        durationDays?: number;
        expiry?: string;
        activationCode: string;
        deviceSuffix?: string;
    }, pdfBuffer: Buffer): Promise<boolean>;
}
export declare const emailService: EmailService;
