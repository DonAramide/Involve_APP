import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import { IntegrationVaultService } from './integration-vault.service';
import { BuildVariantService } from '../config/build-variant';

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

  private async sendMail(to: string, subject: string, rawHtml: string, extraAttachments: any[] = []): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();
      
      // We can inspect the transporter's options to know if auth was provided
      const pass = (transporter.options as any).auth?.pass;

      if (!pass) {
        const variant = BuildVariantService.getInstance();
        if (variant.isProd() || variant.isStaging()) {
          throw new Error('SMTP credentials are required in staging/production');
        }
        console.warn(`[EmailService] Missing SMTP_PASSWORD in Vault & Env. Mocking email to ${to}: ${subject}`);
        return true;
      }
      
      const user = (transporter.options as any).auth?.user || 'support@iips.app';

      const fs = require('fs');
      const path = require('path');
      const logoPath = path.resolve(__dirname, '../../../invify-admin/src/assets/logo_transparent.png');
      const attachments: any[] = [...extraAttachments];
      let logoHtml = '';

      if (fs.existsSync(logoPath)) {
        attachments.push({
          filename: 'logo.png',
          path: logoPath,
          cid: 'invify-logo'
        });
        logoHtml = `<div style="text-align: center; margin-bottom: 20px;"><img src="cid:invify-logo" alt="Invify Logo" style="height: 60px; width: auto;" /></div>`;
      }

      const html = `
        <div style="font-family: 'Times New Roman', Times, serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${logoHtml}
          ${rawHtml}
        </div>
      `;

      await transporter.sendMail({
        from: `"Invify Support" <${user}>`,
        to,
        subject,
        html,
        attachments
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

  public async sendWelcomeEmail(
    to: string,
    options?: {
      name?: string;
      role?: string;
      defaultPassword?: string;
      loginUrl?: string;
    }
  ): Promise<boolean> {
    const subject = options?.defaultPassword
      ? 'Welcome to Invify - Your Account Credentials & User Guide'
      : 'Welcome to Invify';

    const name = options?.name || to.split('@')[0];
    const role = options?.role ? options.role.replace(/_/g, ' ').toUpperCase() : 'STAFF';
    const defaultPassword = options?.defaultPassword;
    const loginUrl = options?.loginUrl || 'https://staging.invify.org/admin/login';

    let credentialsBlock = '';
    if (defaultPassword) {
      credentialsBlock = `
        <div style="background-color: #f0f4f8; border: 1px solid #d0dbe5; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="margin-top: 0; color: #1a237e; font-size: 18px; font-weight: 600;">🔐 Your Login Credentials</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #333;">
            <tr>
              <td style="padding: 6px 0; font-weight: bold; width: 140px;">Portal URL:</td>
              <td style="padding: 6px 0;"><a href="${loginUrl}" style="color: #3949ab; text-decoration: none; font-weight: 600;">${loginUrl}</a></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Login Email:</td>
              <td style="padding: 6px 0; font-family: monospace; font-size: 15px; color: #0d47a1;">${to}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Default Password:</td>
              <td style="padding: 6px 0; font-family: monospace; font-size: 15px; color: #d32f2f; font-weight: bold;">${defaultPassword}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Assigned Role:</td>
              <td style="padding: 6px 0;"><span style="background: #e8eaf6; color: #283593; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 12px;">${role}</span></td>
            </tr>
          </table>
          <p style="margin: 16px 0 0 0; font-size: 13px; color: #555;">
            ⚠️ <strong>Important Security Notice:</strong> For your security, you will be required to change this default password upon your first sign-in.
          </p>
        </div>

        <div style="text-align: center; margin: 25px 0;">
          <a href="${loginUrl}" style="background-color: #3949ab; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">
            Sign In to Invify Platform &rarr;
          </a>
        </div>
      `;
    }

    const body = `
      <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #1a237e; margin-bottom: 8px; font-size: 24px;">Welcome to Invify, ${name}!</h2>
        <p style="font-size: 15px; color: #444;">
          Your account has been successfully provisioned on the Invify Enterprise Business Platform.
        </p>

        ${credentialsBlock}

        <div style="background-color: #fdfbf7; border-left: 4px solid #ff9800; padding: 14px 18px; margin: 20px 0; border-radius: 0 6px 6px 0;">
          <h4 style="margin: 0 0 6px 0; color: #e65100; font-size: 14px;">📘 Attached: Official User Manual</h4>
          <p style="margin: 0; font-size: 13px; color: #666;">
            We have attached the complete <strong>Invify Master Operations & User Guide (PDF)</strong> to this email. It covers getting started, system configurations, multi-till synchronization, point-of-sale workflows, and daily standard operating procedures.
          </p>
        </div>

        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          If you have any questions or need technical support, reach out to your system administrator or email <a href="mailto:support@iips.app" style="color: #3949ab;">support@iips.app</a>.
        </p>

        <p style="font-size: 14px; color: #333; margin-top: 20px;">
          Best regards,<br>
          <strong>Invify Operations & Engineering Team</strong><br>
          <span style="color: #888; font-size: 12px;">support@iips.app</span>
        </p>
      </div>
    `;

    const fs = require('fs');
    const path = require('path');
    const adminPdfPath = path.resolve(__dirname, '../../../invify-admin/src/assets/Invify_User_Manual.pdf');
    const docsPdfPath = path.resolve(__dirname, '../../../assets/docs/Invify_User_Manual.pdf');
    const resolvedPdfPath = fs.existsSync(adminPdfPath) ? adminPdfPath : (fs.existsSync(docsPdfPath) ? docsPdfPath : null);

    const extraAttachments: any[] = [];
    if (resolvedPdfPath) {
      extraAttachments.push({
        filename: 'Invify_User_Manual.pdf',
        path: resolvedPdfPath
      });
    }

    return this.sendMail(to, subject, body, extraAttachments);
  }

  public async sendProfileUpdateEmail(
    to: string,
    options: {
      name?: string;
      role?: string;
      tenantName?: string;
      isActive?: boolean;
      loginUrl?: string;
    }
  ): Promise<boolean> {
    const subject = 'Invify Account Update - Your Profile & Access Level Have Been Updated';
    const name = options?.name || to.split('@')[0];
    const role = options?.role ? options.role.replace(/_/g, ' ').toUpperCase() : 'STAFF';
    const loginUrl = options?.loginUrl || 'https://staging.invify.org/admin/login';
    const statusText = options?.isActive !== false ? 'ACTIVE' : 'SUSPENDED';

    const body = `
      <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #1a237e; margin-bottom: 8px; font-size: 24px;">Account Identity Updated</h2>
        <p style="font-size: 15px; color: #444;">
          Hello <strong>${name}</strong>, your account profile and access configuration on the Invify Platform have been updated by an administrator.
        </p>

        <div style="background-color: #f0f4f8; border: 1px solid #d0dbe5; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="margin-top: 0; color: #1a237e; font-size: 18px; font-weight: 600;">👤 Updated Profile Overview</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #333;">
            <tr>
              <td style="padding: 6px 0; font-weight: bold; width: 140px;">Full Name:</td>
              <td style="padding: 6px 0; color: #0d47a1; font-weight: 600;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Account Email:</td>
              <td style="padding: 6px 0; font-family: monospace; font-size: 15px; color: #0d47a1;">${to}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Access Level / Role:</td>
              <td style="padding: 6px 0;"><span style="background: #e8eaf6; color: #283593; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 12px;">${role}</span></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Account Status:</td>
              <td style="padding: 6px 0;"><span style="background: ${statusText === 'ACTIVE' ? '#e8f5e9' : '#ffebee'}; color: ${statusText === 'ACTIVE' ? '#2e7d32' : '#c62828'}; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 12px;">${statusText}</span></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Portal URL:</td>
              <td style="padding: 6px 0;"><a href="${loginUrl}" style="color: #3949ab; text-decoration: none; font-weight: 600;">${loginUrl}</a></td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 25px 0;">
          <a href="${loginUrl}" style="background-color: #3949ab; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">
            Access Invify Portal &rarr;
          </a>
        </div>

        <div style="background-color: #fdfbf7; border-left: 4px solid #ff9800; padding: 14px 18px; margin: 20px 0; border-radius: 0 6px 6px 0;">
          <h4 style="margin: 0 0 6px 0; color: #e65100; font-size: 14px;">📘 Attached: Official User Manual</h4>
          <p style="margin: 0; font-size: 13px; color: #666;">
            We have re-attached the complete <strong>Invify Master Operations & User Guide (PDF)</strong> for your reference regarding platform modules, permissions, and best practices.
          </p>
        </div>

        <p style="font-size: 13px; color: #777; margin-top: 25px;">
          🔒 <em>Security Notice: If you did not expect this profile update or believe this change was made in error, please contact your organization administrator immediately or email <a href="mailto:support@iips.app" style="color: #3949ab;">support@iips.app</a>.</em>
        </p>

        <p style="font-size: 14px; color: #333; margin-top: 20px;">
          Best regards,<br>
          <strong>Invify Operations & Engineering Team</strong><br>
          <span style="color: #888; font-size: 12px;">support@iips.app</span>
        </p>
      </div>
    `;

    const fs = require('fs');
    const path = require('path');
    const adminPdfPath = path.resolve(__dirname, '../../../invify-admin/src/assets/Invify_User_Manual.pdf');
    const docsPdfPath = path.resolve(__dirname, '../../../assets/docs/Invify_User_Manual.pdf');
    const resolvedPdfPath = fs.existsSync(adminPdfPath) ? adminPdfPath : (fs.existsSync(docsPdfPath) ? docsPdfPath : null);

    const extraAttachments: any[] = [];
    if (resolvedPdfPath) {
      extraAttachments.push({
        filename: 'Invify_User_Manual.pdf',
        path: resolvedPdfPath
      });
    }

    return this.sendMail(to, subject, body, extraAttachments);
  }

  public async sendLoginAlertEmail(
    to: string,
    details: {
      name?: string;
      ipAddress: string;
      deviceId?: string;
      userAgent?: string;
      location?: string;
      loginTime?: string;
      portal?: string;
    }
  ): Promise<boolean> {
    const subject = '🔔 Security Alert: New Login to Your Invify Account';
    const name = details.name || to.split('@')[0];
    const ip = details.ipAddress || 'Unknown IP';
    const device = details.deviceId || 'Web Client';
    const userAgent = details.userAgent || 'Unknown Device/Browser';
    const location = details.location || 'Unknown Location';
    const time = details.loginTime || new Date().toUTCString();
    const portal = details.portal || 'Invify Enterprise Portal';

    const body = `
      <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #1a237e; margin: 0; font-size: 22px;">🔔 Security Alert: New Sign-in Detected</h2>
          <p style="color: #666; font-size: 14px; margin-top: 4px;">A new login session was established on your account.</p>
        </div>

        <p style="font-size: 15px; color: #444;">
          Hello <strong>${name}</strong>,
        </p>
        <p style="font-size: 14px; color: #444;">
          We noticed a recent sign-in to your Invify account. Here are the session details:
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #333;">
            <tr>
              <td style="padding: 6px 0; font-weight: bold; width: 140px; color: #555;">Date & Time:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${time}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #555;">IP Address:</td>
              <td style="padding: 6px 0; font-family: monospace; font-size: 14px; color: #0d47a1; font-weight: bold;">${ip}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #555;">Location:</td>
              <td style="padding: 6px 0; color: #334155;">${location}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #555;">Device / Client ID:</td>
              <td style="padding: 6px 0; color: #334155; font-family: monospace;">${device}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #555;">Browser / System:</td>
              <td style="padding: 6px 0; color: #64748b; font-size: 12.5px;">${userAgent}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #555;">Target Portal:</td>
              <td style="padding: 6px 0;"><span style="background: #e8eaf6; color: #283593; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 12px;">${portal}</span></td>
            </tr>
          </table>
        </div>

        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px 16px; margin: 18px 0; border-radius: 0 6px 6px 0;">
          <p style="margin: 0; font-size: 13.5px; color: #166534;">
            ✅ <strong>Was this you?</strong> If you just logged in, you can safely ignore this notification.
          </p>
        </div>

        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin: 18px 0; border-radius: 0 6px 6px 0;">
          <p style="margin: 0; font-size: 13.5px; color: #991b1b;">
            🚨 <strong>Didn't recognize this activity?</strong> If you did NOT initiate this login, please immediately change your password, revoke active sessions, and contact our security team at <a href="mailto:support@iips.app" style="color: #dc2626; font-weight: bold;">support@iips.app</a>.
          </p>
        </div>

        <p style="font-size: 13px; color: #888; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
          This is an automated security alert from Invify Identity & Access Management (IAM).
        </p>
      </div>
    `;

    return this.sendMail(to, subject, body);
  }
}

export const emailService = new EmailService();
