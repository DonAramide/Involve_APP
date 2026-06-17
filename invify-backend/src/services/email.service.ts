import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import { IntegrationVaultService } from './integration-vault.service';

dotenv.config();

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isInitializing = false;

  private async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) return this.transporter;

    if (this.isInitializing) {
      // Small wait loop if concurrently initializing
      while (this.isInitializing && !this.transporter) {
        await new Promise(r => setTimeout(r, 100));
      }
      if (this.transporter) return this.transporter;
    }

    this.isInitializing = true;
    try {
      // 1. Try to fetch from Enterprise Integration Vault
      let smtpPass = await IntegrationVaultService.getDecryptedCredential('ZOHO_SMTP', 'PRODUCTION', undefined, 'SMTP_PASSWORD');
      let smtpUser = await IntegrationVaultService.getDecryptedCredential('ZOHO_SMTP', 'PRODUCTION', undefined, 'SMTP_USER');
      
      // 2. Fallback to .env if missing in Vault
      if (!smtpPass) smtpPass = process.env.SMTP_PASSWORD || '';
      if (!smtpUser) smtpUser = process.env.SMTP_USER || 'support@iips.app';

      this.transporter = nodemailer.createTransport({
        host: 'smtp.zoho.com',
        port: 587,
        secure: false, // TLS true means STARTTLS for port 587
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      return this.transporter;
    } finally {
      this.isInitializing = false;
    }
  }

  private async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();
      
      // We can inspect the transporter's options to know if auth was provided
      const pass = (transporter.options as any).auth?.pass;

      if (!pass) {
        console.warn(`[EmailService] Missing SMTP_PASSWORD in Vault & Env. Mocking email to ${to}: ${subject}`);
        return true;
      }
      
      const user = (transporter.options as any).auth?.user || 'support@iips.app';

      await transporter.sendMail({
        from: `"Invify Support" <${user}>`,
        to,
        subject,
        html,
      });
      console.log(`[EmailService] Successfully sent email to ${to}`);
      return true;
    } catch (error: any) {
      console.error(`[EmailService] Failed to send email to ${to}:`, error.message);
      return false; // Decide if we want to throw error or return false
    }
  }

  public async sendVerificationCode(to: string, otp: string): Promise<boolean> {
    const subject = 'Verify Your Email Address';
    const body = `
      <p>Hello,</p>
      <p>Welcome to Invify.</p>
      <p>Your email verification code is:</p>
      <h2 style="color: #000;">${otp}</h2>
      <p>This verification code will expire in 10 minutes.</p>
      <p>If you did not request this code, please ignore this email.</p>
      <br />
      <p>Thank you,</p>
      <p>Invify Support</p>
      <p>support@iips.app</p>
    `;
    return this.sendMail(to, subject, body);
  }

  public async sendPasswordResetCode(to: string, otp: string): Promise<boolean> {
    const subject = 'Reset Your Password';
    const body = `
      <p>Your password reset code is:</p>
      <h2 style="color: #000;">${otp}</h2>
      <p>This code expires in 10 minutes.</p>
    `;
    return this.sendMail(to, subject, body);
  }

  public async sendWelcomeEmail(to: string): Promise<boolean> {
    const subject = 'Welcome to Invify';
    const body = `
      <p>Your account has been successfully activated.</p>
    `;
    return this.sendMail(to, subject, body);
  }
}

export const emailService = new EmailService();
