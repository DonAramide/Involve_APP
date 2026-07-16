export declare class EmailService {
    private transporter;
    private isInitializing;
    private getTransporter;
    private sendMail;
    sendVerificationCode(to: string, otp: string): Promise<boolean>;
    sendPasswordResetCode(to: string, otp: string): Promise<boolean>;
    sendWelcomeEmail(to: string): Promise<boolean>;
}
export declare const emailService: EmailService;
