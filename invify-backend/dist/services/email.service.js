"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const nodemailer = __importStar(require("nodemailer"));
const dotenv = __importStar(require("dotenv"));
const integration_vault_service_1 = require("./integration-vault.service");
dotenv.config();
class EmailService {
    transporter = null;
    isInitializing = false;
    async getTransporter() {
        if (this.transporter)
            return this.transporter;
        if (this.isInitializing) {
            // Small wait loop if concurrently initializing
            while (this.isInitializing && !this.transporter) {
                await new Promise(r => setTimeout(r, 100));
            }
            if (this.transporter)
                return this.transporter;
        }
        this.isInitializing = true;
        try {
            // 1. Try to fetch from Enterprise Integration Vault
            let smtpPass = await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential('ZOHO_SMTP', 'PRODUCTION', undefined, 'SMTP_PASSWORD');
            let smtpUser = await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential('ZOHO_SMTP', 'PRODUCTION', undefined, 'SMTP_USER');
            // 2. Fallback to .env if missing in Vault
            if (!smtpPass)
                smtpPass = process.env.SMTP_PASSWORD || '';
            if (!smtpUser)
                smtpUser = process.env.SMTP_USER || 'support@iips.app';
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
        }
        finally {
            this.isInitializing = false;
        }
    }
    async sendMail(to, subject, rawHtml, extraAttachments = []) {
        try {
            const transporter = await this.getTransporter();
            // We can inspect the transporter's options to know if auth was provided
            const pass = transporter.options.auth?.pass;
            if (!pass) {
                console.warn(`[EmailService] Missing SMTP_PASSWORD in Vault & Env. Mocking email to ${to}: ${subject}`);
                return true;
            }
            const user = transporter.options.auth?.user || 'support@iips.app';
            const fs = require('fs');
            const path = require('path');
            const logoPath = path.resolve(__dirname, '../../../invify-admin/src/assets/logo_transparent.png');
            const attachments = [...extraAttachments];
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
        }
        catch (error) {
            console.error(`[EmailService] Failed to send email to ${to}:`, error.message);
            return false; // Decide if we want to throw error or return false
        }
    }
    async sendVerificationCode(to, otp) {
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
    async sendPasswordResetCode(to, otp) {
        const subject = 'Reset Your Password';
        const body = `
      <p>Your password reset code is:</p>
      <h2 style="color: #000;">${otp}</h2>
      <p>This code expires in 10 minutes.</p>
    `;
        return this.sendMail(to, subject, body);
    }
    async sendWelcomeEmail(to) {
        const subject = 'Welcome to Invify';
        const body = `
      <h1 style="text-align: center; font-weight: normal; font-size: 32px; margin-bottom: 20px;">Welcome</h1>
      <p style="text-align: center; font-size: 16px;">
        Thank you for signing up for Invify emails. Now that we have your details, you'll be the first to hear about:
      </p>
      <div style="text-align: center; margin: 20px 0;">
        <p style="font-weight: bold; margin: 5px 0;">&#8226; New products & exclusive launches</p>
        <p style="font-weight: bold; margin: 5px 0;">&#8226; In-store & online events</p>
        <p style="font-weight: bold; margin: 5px 0;">&#8226; Special offers & competitions</p>
        <p style="font-weight: bold; margin: 5px 0;">&#8226; News updates & styling tips</p>
      </div>
      <p style="text-align: center; font-size: 16px;">
        ...plus so much more, all delivered direct to your inbox every week!
      </p>
      <div style="text-align: center; margin: 40px 0 20px 0;">
        <h2 style="font-family: 'Brush Script MT', cursive; font-size: 36px; font-weight: normal; margin: 0; color: #555;">Love, Invify</h2>
      </div>
      <p style="text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 20px; margin-top: 40px;">
        A quick reminder, to ensure our emails reach your inbox, please add support@iips.app to your address book.
      </p>
    `;
        const fs = require('fs');
        const path = require('path');
        const pdfPath = path.resolve(__dirname, '../../../invify-admin/src/assets/Invify_User_Manual.pdf');
        const extraAttachments = [];
        if (fs.existsSync(pdfPath)) {
            extraAttachments.push({
                filename: 'Invify_User_Manual.pdf',
                path: pdfPath
            });
        }
        return this.sendMail(to, subject, body, extraAttachments);
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
//# sourceMappingURL=email.service.js.map