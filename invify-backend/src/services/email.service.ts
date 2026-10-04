import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import { IntegrationVaultService } from './integration-vault.service';
import { BuildVariantService } from '../config/build-variant';
import { buildTermBillSubject } from './pdf.service';

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
      const variant = BuildVariantService.getInstance();
      const vaultEnvs = variant.isStaging()
        ? ['STAGING', 'PRODUCTION']
        : variant.isProd()
          ? ['PRODUCTION']
          : ['LOCAL', 'STAGING', 'PRODUCTION'];

      let smtpPass = '';
      let smtpUser = '';
      for (const envName of vaultEnvs) {
        try {
          if (!smtpPass) {
            smtpPass =
              (await IntegrationVaultService.getDecryptedCredential(
                'ZOHO_SMTP',
                envName,
                undefined,
                'SMTP_PASSWORD',
              )) || '';
          }
          if (!smtpUser) {
            smtpUser =
              (await IntegrationVaultService.getDecryptedCredential(
                'ZOHO_SMTP',
                envName,
                undefined,
                'SMTP_USER',
              )) || '';
          }
        } catch (vaultErr: any) {
          console.warn('[EmailService] Vault SMTP lookup failed for', envName, vaultErr?.message || vaultErr);
        }
      }

      if (!smtpPass) smtpPass = process.env.SMTP_PASSWORD || process.env.STAGING_SMTP_PASSWORD || '';
      if (!smtpUser) smtpUser = process.env.SMTP_USER || process.env.STAGING_SMTP_USER || 'support@invify.org';

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

  private async sendMail(
    to: string,
    subject: string,
    rawHtml: string,
    extraAttachments: any[] = [],
    options?: { fromName?: string; skipLogo?: boolean },
  ): Promise<boolean> {
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
      
      const user = (transporter.options as any).auth?.user || 'support@invify.org';

      const fs = require('fs');
      const path = require('path');
      const logoPath = path.resolve(__dirname, '../../../invify-admin/src/assets/logo_transparent.png');
      const attachments: any[] = [...extraAttachments];
      let logoHtml = '';

      if (!options?.skipLogo && fs.existsSync(logoPath)) {
        attachments.push({
          filename: 'logo.png',
          path: logoPath,
          cid: 'invify-logo'
        });
        logoHtml = `<div style="text-align: center; margin-bottom: 20px;"><img src="cid:invify-logo" alt="Invify Logo" style="height: 60px; width: auto;" /></div>`;
      }

      const html = `
        <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color: #333; max-width: 640px; margin: 0 auto; padding: 20px;">
          ${logoHtml}
          ${rawHtml}
        </div>
      `;

      const fromName = (options?.fromName || 'Invify Support').replace(/"/g, '');
      await transporter.sendMail({
        from: `"${fromName}" <${user}>`,
        to,
        subject,
        html,
        attachments
      });
      const attachedNames = attachments.map((item: any) => item.filename).filter(Boolean);
      console.log(
        `[EmailService] Successfully sent email to ${to}` +
          (attachedNames.length ? ` attachments=${attachedNames.join(',')}` : ' attachments=none'),
      );
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
      <p>support@invify.org</p>
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

  private resolveManualPdf(kind: 'school' | 'default'): { path: string; filename: string } | null {
    const fs = require('fs');
    const path = require('path');
    const envKey = kind === 'school' ? 'INVIFY_SCHOOL_MANUAL_PDF' : 'INVIFY_USER_MANUAL_PDF';
    const envPath = String(process.env[envKey] || '').trim();
    const filenames =
      kind === 'school'
        ? ['InvifySchoolManual.pdf', 'INVIFY_MANUAL_SCHOOL_MODE.pdf']
        : ['Invify_User_Manual.pdf', 'INVIFY_MASTER_MANUAL.pdf'];
    const roots = [
      envPath,
      ...filenames.flatMap((name) => [
        path.join(process.cwd(), 'dist', 'assets', name),
        path.join(process.cwd(), 'assets', name),
        path.resolve(__dirname, '../assets', name),
        path.resolve(__dirname, '../../assets', name),
        path.resolve(__dirname, '../../../assets/docs', name),
        path.resolve(__dirname, '../../../invify-admin/src/assets', name),
      ]),
    ].filter(Boolean);

    for (const candidate of roots) {
      try {
        if (candidate && fs.existsSync(candidate)) {
          const filename = path.basename(candidate);
          return { path: candidate, filename };
        }
      } catch {
        /* ignore unreadable path */
      }
    }
    console.warn(
      `[EmailService] ${kind === 'school' ? 'InvifySchoolManual.pdf' : 'Invify_User_Manual.pdf'} not found; sending without that attachment`,
    );
    return null;
  }

  private resolveUserManualPdf(): string | null {
    return this.resolveManualPdf('default')?.path || null;
  }

  private isSchoolMode(mode?: string): boolean {
    const m = String(mode || '').toLowerCase().trim();
    return m === 'school' || m === 'academy' || m.includes('school');
  }

  private userManualAttachment(pdfPath: string | null, filename = 'Invify_User_Manual.pdf'): any[] {
    if (!pdfPath) return [];
    return [{ filename, path: pdfPath }];
  }

  private userManualHtml(hasAttachment: boolean, school = false): string {
    if (hasAttachment && school) {
      return `
        <div style="background-color: #fdfbf7; border-left: 4px solid #ff9800; padding: 14px 18px; margin: 20px 0; border-radius: 0 6px 6px 0;">
          <h4 style="margin: 0 0 6px 0; color: #e65100; font-size: 14px;">📘 Attached: Invify School Mode Manual</h4>
          <p style="margin: 0; font-size: 13px; color: #666;">
            We have attached the <strong>Invify School Manual (PDF)</strong> for your academy. It covers system setup, term billing, student records, receipts, and daily school operations.
          </p>
        </div>
      `;
    }
    if (hasAttachment) {
      return `
        <div style="background-color: #fdfbf7; border-left: 4px solid #ff9800; padding: 14px 18px; margin: 20px 0; border-radius: 0 6px 6px 0;">
          <h4 style="margin: 0 0 6px 0; color: #e65100; font-size: 14px;">📘 Attached: Official User Manual</h4>
          <p style="margin: 0; font-size: 13px; color: #666;">
            We have attached the complete <strong>Invify Master Operations &amp; User Guide (PDF)</strong> to this email. It covers getting started, system configurations, multi-till synchronization, point-of-sale workflows, and daily standard operating procedures.
          </p>
        </div>
      `;
    }
    return `
      <div style="background-color: #f7f9fc; border-left: 4px solid #3949ab; padding: 14px 18px; margin: 20px 0; border-radius: 0 6px 6px 0;">
        <h4 style="margin: 0 0 6px 0; color: #1a237e; font-size: 14px;">User Guide</h4>
        <p style="margin: 0; font-size: 13px; color: #666;">
          Need help getting started? Email <a href="mailto:support@invify.org" style="color: #3949ab;">support@invify.org</a> and we will send the Invify Master Operations &amp; User Guide.
        </p>
      </div>
    `;
  }

  /**
   * Resolve portal login URL from explicit option or BuildVariantService.
   * Production never falls back to staging.
   */
  private resolveLoginUrl(explicit?: string, portal: 'admin' | 'tenant' = 'admin'): string {
    const trimmed = (explicit || '').trim();
    if (trimmed) {
      const variant = BuildVariantService.getInstance();
      if (variant.isProd() && /staging\.invify\.org|rpcjelhacmkhzguljdgi/i.test(trimmed)) {
        throw new Error(
          '[EmailService] Refusing to send production email with a staging login URL',
        );
      }
      return trimmed;
    }
    return BuildVariantService.getInstance().getLoginUrl(portal);
  }

  public async sendWelcomeEmail(
    to: string,
    options?: {
      name?: string;
      role?: string;
      defaultPassword?: string;
      loginUrl?: string;
      businessMode?: string;
    }
  ): Promise<boolean> {
    const subject = options?.defaultPassword
      ? 'Welcome to Invify - Your Account Credentials & User Guide'
      : 'Welcome to Invify';

    const name = options?.name || to.split('@')[0];
    const role = options?.role ? options.role.replace(/_/g, ' ').toUpperCase() : 'STAFF';
    const defaultPassword = options?.defaultPassword;
    const loginUrl = this.resolveLoginUrl(options?.loginUrl);
    const school = this.isSchoolMode(options?.businessMode);
    const manual = this.resolveManualPdf(school ? 'school' : 'default');
    const pdfPath = manual?.path || null;
    const pdfName = manual?.filename || (school ? 'InvifySchoolManual.pdf' : 'Invify_User_Manual.pdf');

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

        ${this.userManualHtml(!!pdfPath, school)}

        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          If you have any questions or need technical support, reach out to your system administrator or email <a href="mailto:support@invify.org" style="color: #3949ab;">support@invify.org</a>.
        </p>

        <p style="font-size: 14px; color: #333; margin-top: 20px;">
          Best regards,<br>
          <strong>Invify Operations & Engineering Team</strong><br>
          <span style="color: #888; font-size: 12px;">support@invify.org</span>
        </p>
      </div>
    `;

    return this.sendMail(to, subject, body, this.userManualAttachment(pdfPath, pdfName));
  }

  private escapeHtml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private agentActionButton(href: string, label: string): string {
    return `
        <div style="text-align: center; margin: 28px 0;">
          <a href="${href}" style="background-color: #00838f; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">
            ${label}
          </a>
        </div>
        <p style="font-size: 12px; color: #888; word-break: break-all;">
          If the button does not work, copy this link into your browser:<br>${href}
        </p>
    `;
  }

  public async sendAgentWelcomeEmail(
    to: string,
    options: { name: string; agentCode: string; setPasswordLink: string; loginUrl: string },
  ): Promise<boolean> {
    const subject = 'Welcome to Invify - Activate Your Agent Account';
    const name = this.escapeHtml(options.name || to.split('@')[0]);
    const agentCode = this.escapeHtml(options.agentCode);
    const loginUrl = this.escapeHtml(options.loginUrl);

    const body = `
      <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #006064; margin-bottom: 8px; font-size: 24px;">Welcome to the Invify Agent Network, ${name}!</h2>
        <p style="font-size: 15px; color: #444;">
          An Invify administrator has created your field agent account. To get started, set your password using the secure link below.
        </p>

        <div style="background-color: #f0f7f8; border: 1px solid #cfe3e6; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #333;">
            <tr>
              <td style="padding: 6px 0; font-weight: bold; width: 140px;">Agent Code:</td>
              <td style="padding: 6px 0; font-family: monospace; font-size: 15px; color: #006064; font-weight: bold;">${agentCode}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Login Email:</td>
              <td style="padding: 6px 0; font-family: monospace; font-size: 15px; color: #006064;">${this.escapeHtml(to)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Agent Portal:</td>
              <td style="padding: 6px 0;"><a href="${loginUrl}" style="color: #00838f; text-decoration: none; font-weight: 600;">${loginUrl}</a></td>
            </tr>
          </table>
        </div>

        ${this.agentActionButton(options.setPasswordLink, 'Set My Password &rarr;')}

        <p style="font-size: 13px; color: #555;">
          ⚠️ For your security this link can be used once and expires after a short time. If it has expired, open the Agent Portal and choose <strong>Forgot Password</strong> to receive a new one.
        </p>

        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          If you were not expecting this email, you can ignore it or contact <a href="mailto:support@invify.org" style="color: #00838f;">support@invify.org</a>.
        </p>

        <p style="font-size: 14px; color: #333; margin-top: 20px;">
          Best regards,<br>
          <strong>Invify Agent Operations</strong><br>
          <span style="color: #888; font-size: 12px;">support@invify.org</span>
        </p>
      </div>
    `;

    return this.sendMail(to, subject, body);
  }

  public async sendAgentPasswordResetEmail(
    to: string,
    options: { name: string; setPasswordLink: string; loginUrl: string },
  ): Promise<boolean> {
    const subject = 'Reset Your Invify Agent Password';
    const name = this.escapeHtml(options.name || to.split('@')[0]);

    const body = `
      <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #006064; margin-bottom: 8px; font-size: 22px;">Password reset requested</h2>
        <p style="font-size: 15px; color: #444;">
          Hello <strong>${name}</strong>, we received a request to reset the password for your Invify agent account.
        </p>

        ${this.agentActionButton(options.setPasswordLink, 'Choose a New Password &rarr;')}

        <p style="font-size: 13px; color: #555;">
          This link can be used once and expires after a short time. After resetting, sign in at
          <a href="${this.escapeHtml(options.loginUrl)}" style="color: #00838f;">${this.escapeHtml(options.loginUrl)}</a>.
        </p>

        <p style="font-size: 13px; color: #777; margin-top: 25px;">
          🔒 If you did not request this, you can ignore this email — your password will not change.
        </p>

        <p style="font-size: 14px; color: #333; margin-top: 20px;">
          Best regards,<br>
          <strong>Invify Agent Operations</strong><br>
          <span style="color: #888; font-size: 12px;">support@invify.org</span>
        </p>
      </div>
    `;

    return this.sendMail(to, subject, body);
  }

  public async sendProfileUpdateEmail(
    to: string,
    options: {
      name?: string;
      role?: string;
      tenantName?: string;
      defaultPassword?: string;
      isActive?: boolean;
      loginUrl?: string;
    }
  ): Promise<boolean> {
    const subject = 'Invify Account Update - Your Profile & Access Level Have Been Updated';
    const name = options?.name || to.split('@')[0];
    const role = options?.role ? options.role.replace(/_/g, ' ').toUpperCase() : 'STAFF';
    const loginUrl = this.resolveLoginUrl(options?.loginUrl);
    const statusText = options?.isActive !== false ? 'ACTIVE' : 'SUSPENDED';
    const defaultPassword = options?.defaultPassword;
    const pdfPath = this.resolveUserManualPdf();

    let passwordRow = '';
    let passwordNotice = '';
    if (defaultPassword) {
      passwordRow = `
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #333;">Default Password:</td>
              <td style="padding: 6px 0; font-family: monospace; font-size: 15px; color: #d32f2f; font-weight: bold;">${defaultPassword}</td>
            </tr>
      `;
      passwordNotice = `
          <p style="margin: 16px 0 0 0; font-size: 13px; color: #555;">
            ⚠️ <strong>First-Time Login Notice:</strong> Please use the default temporary password above to sign in. For your security, you will be required to set your own permanent password upon your first sign-in.
          </p>
      `;
    }

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
            ${passwordRow}
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
          ${passwordNotice}
        </div>

        <div style="text-align: center; margin: 25px 0;">
          <a href="${loginUrl}" style="background-color: #3949ab; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">
            Access Invify Portal &rarr;
          </a>
        </div>

        ${this.userManualHtml(!!pdfPath)}

        <p style="font-size: 13px; color: #777; margin-top: 25px;">
          🔒 <em>Security Notice: If you did not expect this profile update or believe this change was made in error, please contact your organization administrator immediately or email <a href="mailto:support@invify.org" style="color: #3949ab;">support@invify.org</a>.</em>
        </p>

        <p style="font-size: 14px; color: #333; margin-top: 20px;">
          Best regards,<br>
          <strong>Invify Operations & Engineering Team</strong><br>
          <span style="color: #888; font-size: 12px;">support@invify.org</span>
        </p>
      </div>
    `;

    return this.sendMail(to, subject, body, this.userManualAttachment(pdfPath));
  }

  public async sendTenantAlertEmail(
    to: string,
    details: { name?: string; title: string; body: string },
  ): Promise<boolean> {
    const name = details.name || to.split('@')[0];
    const subject = `Invify alert: ${details.title}`;
    const body = `
      <p>Hello <strong>${name}</strong>,</p>
      <h2 style="color: #1a237e; font-size: 20px;">${details.title}</h2>
      <p style="font-size: 15px; color: #444;">${details.body}</p>
      <p style="font-size: 13px; color: #888; margin-top: 24px;">
        You can change these alerts under <strong>My Profile &amp; Security → Alert Notifications</strong> in the tenant portal.
      </p>
      <p>Thank you,<br/>Invify Support<br/>support@invify.org</p>
    `;
    return this.sendMail(to, subject, body);
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
            🚨 <strong>Didn't recognize this activity?</strong> If you did NOT initiate this login, please immediately change your password, revoke active sessions, and contact our security team at <a href="mailto:support@invify.org" style="color: #dc2626; font-weight: bold;">support@invify.org</a>.
          </p>
        </div>

        <p style="font-size: 13px; color: #888; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
          This is an automated security alert from Invify Identity & Access Management (IAM).
        </p>
      </div>
    `;

    return this.sendMail(to, subject, body);
  }

  private formatNgnHtml(amount: number): string {
    const n = Number(amount) || 0;
    return `&#8358;${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  public safePdfFilename(studentName: string, invoiceNumber?: string): string {
    const base = `Fee-Bill-${studentName || 'Student'}-${invoiceNumber || 'bill'}`
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
    return `${base || 'Fee-Bill'}.pdf`;
  }

  /**
   * Individual parent term-fee bill with a downloadable PDF attachment.
   */
  public async sendTermBillEmail(
    to: string,
    bill: {
      schoolName: string;
      schoolAddress?: string;
      schoolPhone?: string;
      schoolEmail?: string;
      parentName?: string;
      studentName: string;
      admissionNumber?: string;
      className: string;
      invoiceNumber: string;
      items: { name: string; quantity?: number; amount: number }[];
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
    },
    pdfBuffer: Buffer,
  ): Promise<boolean> {
    const school = this.escapeHtml(bill.schoolName || 'School');
    const parent = this.escapeHtml(bill.parentName || 'Parent / Guardian');
    const student = this.escapeHtml(bill.studentName || 'Student');
    const className = this.escapeHtml(bill.className || '');
    const admission = this.escapeHtml(bill.admissionNumber || '—');
    const invoiceNo = this.escapeHtml(bill.invoiceNumber || '—');
    const termLabel = [bill.termName, bill.academicYearName].filter(Boolean).map((v) => this.escapeHtml(String(v))).join(' · ');
    const due = this.escapeHtml(bill.dueDate || '');
    const issued = this.escapeHtml(bill.issuedAt || new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    }));

    const itemRows = (Array.isArray(bill.items) ? bill.items : []).map((item) => `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${this.escapeHtml(item.name || 'Fee item')}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #475569;">${Number(item.quantity ?? 1)}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600; color: #0f172a;">${this.formatNgnHtml(Number(item.amount) || 0)}</td>
      </tr>
    `).join('');

    const useParentAccount = !!(bill.virtualAccountNumber || bill.paymentAccountKind === 'parent');
    const useSchoolAccount = !useParentAccount && !!(bill.accountNumber || bill.bankName);
    let paymentBlock = '';
    if (useParentAccount || useSchoolAccount) {
      const heading = useParentAccount ? 'Parent dedicated account' : 'School account';
      const intro = useParentAccount
        ? `Please pay this bill into your dedicated parent account below. Use <strong>${student}</strong> as the payment reference.`
        : `This parent does not have a dedicated account. Please pay into the school account below. Use <strong>${student}</strong> as the payment reference.`;
      const rows = useParentAccount
        ? [
            bill.virtualAccountName ? `<tr><td style="padding: 4px 0; color: #64748b;">Account name</td><td style="padding: 4px 0; font-weight: 600;">${this.escapeHtml(bill.virtualAccountName)}</td></tr>` : '',
            bill.virtualAccountBank ? `<tr><td style="padding: 4px 0; color: #64748b;">Bank</td><td style="padding: 4px 0; font-weight: 600;">${this.escapeHtml(bill.virtualAccountBank)}</td></tr>` : '',
            bill.virtualAccountNumber ? `<tr><td style="padding: 4px 0; color: #64748b;">Account number</td><td style="padding: 4px 0; font-family: monospace; font-weight: 700; font-size: 16px; color: #0e7490;">${this.escapeHtml(bill.virtualAccountNumber)}</td></tr>` : '',
          ].join('')
        : [
            bill.accountName ? `<tr><td style="padding: 4px 0; color: #64748b;">Account name</td><td style="padding: 4px 0; font-weight: 600;">${this.escapeHtml(bill.accountName)}</td></tr>` : '',
            bill.bankName ? `<tr><td style="padding: 4px 0; color: #64748b;">Bank</td><td style="padding: 4px 0; font-weight: 600;">${this.escapeHtml(bill.bankName)}</td></tr>` : '',
            bill.accountNumber ? `<tr><td style="padding: 4px 0; color: #64748b;">Account number</td><td style="padding: 4px 0; font-family: monospace; font-weight: 700; font-size: 16px; color: #0e7490;">${this.escapeHtml(bill.accountNumber)}</td></tr>` : '',
          ].join('');
      paymentBlock = `
        <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 16px 18px; margin: 22px 0;">
          <h3 style="margin: 0 0 8px 0; color: #0f766e; font-size: 14px;">${heading}</h3>
          <p style="margin: 0 0 10px 0; font-size: 13px; color: #334155;">${intro}</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">${rows}</table>
        </div>
      `;
    }

    const subject = buildTermBillSubject(bill.schoolName, bill.studentName, bill.className);
    const body = `
      <div style="border-top: 6px solid #0e7490; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="padding: 22px 22px 8px 22px; text-align: center; background: #f8fafc;">
          <h1 style="margin: 0; font-size: 18px; color: #0f172a; letter-spacing: 0.3px;">${school}</h1>
          ${bill.schoolAddress ? `<p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b;">${this.escapeHtml(bill.schoolAddress)}</p>` : ''}
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">
            ${[bill.schoolPhone, bill.schoolEmail].filter(Boolean).map((v) => this.escapeHtml(String(v))).join(' · ')}
          </p>
          <p style="margin: 14px 0 0 0; font-size: 13px; font-weight: 700; color: #0e7490; letter-spacing: 1px;">OFFICIAL TERM FEE BILL</p>
        </div>
        <div style="padding: 22px;">
          <p style="font-size: 14px; color: #334155; margin-top: 0;">Dear <strong>${parent}</strong>,</p>
          <p style="font-size: 14px; color: #334155;">
            Please find below the term fee bill for <strong>${student}</strong>
            ${className ? ` in <strong>${className}</strong>` : ''}.
            A downloadable PDF copy is attached to this email.
          </p>

          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 16px 0 20px 0;">
            <tr>
              <td style="padding: 4px 0; color: #64748b; width: 140px;">Student</td>
              <td style="padding: 4px 0; font-weight: 600; color: #0f172a;">${student}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;">Admission No.</td>
              <td style="padding: 4px 0; color: #0f172a;">${admission}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;">Class</td>
              <td style="padding: 4px 0; color: #0f172a;">${className || '—'}</td>
            </tr>
            ${termLabel ? `<tr><td style="padding: 4px 0; color: #64748b;">Term</td><td style="padding: 4px 0; color: #0f172a;">${termLabel}</td></tr>` : ''}
            <tr>
              <td style="padding: 4px 0; color: #64748b;">Invoice No.</td>
              <td style="padding: 4px 0; color: #0f172a;">${invoiceNo}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;">Issued</td>
              <td style="padding: 4px 0; color: #0f172a;">${issued}</td>
            </tr>
            ${due ? `<tr><td style="padding: 4px 0; color: #64748b;">Due date</td><td style="padding: 4px 0; color: #0f172a;">${due}</td></tr>` : ''}
          </table>

          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: #0e7490; color: #ffffff;">
                <th style="padding: 9px 10px; text-align: left; font-weight: 600;">Items to pay</th>
                <th style="padding: 9px 10px; text-align: right; font-weight: 600;">Qty</th>
                <th style="padding: 9px 10px; text-align: right; font-weight: 600;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
            <tfoot>
              <tr style="background: #ecfeff;">
                <td colspan="2" style="padding: 10px; font-weight: 700; color: #0e7490;">Total payable</td>
                <td style="padding: 10px; text-align: right; font-weight: 700; color: #0e7490; font-size: 15px;">${this.formatNgnHtml(Number(bill.total) || 0)}</td>
              </tr>
            </tfoot>
          </table>

          ${paymentBlock}

          <p style="font-size: 12px; color: #64748b; margin-top: 8px;">
            📎 <strong>Downloadable bill:</strong> Open the attached PDF to save or print this invoice.
          </p>
          <p style="font-size: 13px; color: #334155; margin-top: 18px;">
            Thank you,<br/>
            <strong>${school}</strong><br/>
            <span style="color: #94a3b8; font-size: 12px;">Sent via Invify School Finance</span>
          </p>
        </div>
      </div>
    `;

    return this.sendMail(
      to,
      subject,
      body,
      [{
        filename: this.safePdfFilename(bill.studentName, bill.invoiceNumber),
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
      { fromName: bill.schoolName || 'School Finance', skipLogo: true },
    );
  }

  public activationPdfFilename(businessName: string): string {
    const base = `Invify-Terminal-Activation-${businessName || 'Tenant'}`
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
    return `${base || 'Invify-Terminal-Activation'}.pdf`;
  }

  /**
   * Approved terminal activation, with a downloadable PDF the tenant can save.
   */
  public async sendTerminalActivationEmail(
    to: string,
    activation: {
      businessName: string;
      mode?: string;
      plan?: string;
      durationDays?: number;
      expiry?: string;
      activationCode: string;
      deviceSuffix?: string;
    },
    pdfBuffer: Buffer,
  ): Promise<boolean> {
    const business = this.escapeHtml(activation.businessName || 'your business');
    const code = this.escapeHtml(activation.activationCode || '');
    const plan = this.escapeHtml(activation.plan || '—');
    const mode = this.escapeHtml(activation.mode || '—');
    const expiry = this.escapeHtml(activation.expiry || '—');
    const days = Number(activation.durationDays) || 0;
    const body = `
      <p>Hello,</p>
      <p>Support has approved a terminal activation for <strong>${business}</strong>.</p>
      <p>The downloadable activation file is attached to this email. The PDF includes the activation key and a QR code of that key. Scan the QR code or type the key on the terminal.</p>
      <p style="font-size: 13px; color: #475569;">Activation key</p>
      <p style="font-family: monospace; font-size: 22px; font-weight: 700; letter-spacing: 2px; color: #0f172a;">${code}</p>
      <table style="font-size: 14px; color: #334155;">
        <tr><td style="padding: 4px 16px 4px 0; color: #64748b;">Mode</td><td>${mode}</td></tr>
        <tr><td style="padding: 4px 16px 4px 0; color: #64748b;">Plan</td><td>${plan}</td></tr>
        <tr><td style="padding: 4px 16px 4px 0; color: #64748b;">Validity</td><td>${days} days</td></tr>
        <tr><td style="padding: 4px 16px 4px 0; color: #64748b;">Expiration</td><td>${expiry}</td></tr>
      </table>
      <p style="font-size: 12px; color: #64748b;">This key works once. Keep the attached file private.</p>
      <p>Thank you,<br/>Invify Support</p>
    `;
    return this.sendMail(
      to,
      `Invify terminal activation for ${activation.businessName || 'your business'}`,
      body,
      [{
        filename: this.activationPdfFilename(activation.businessName),
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    );
  }
}

export const emailService = new EmailService();
