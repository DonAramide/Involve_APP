// src/controllers/onboarding.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../db/supabase';
import * as fs from 'fs';
import * as path from 'path';
import { verificationService } from '../services/verification.service';

const LOCAL_TENANTS_DB_PATH = path.join(process.cwd(), 'tenants_db.json');

function readTenantsDb(): any[] {
  if (!fs.existsSync(LOCAL_TENANTS_DB_PATH)) return [];
  try { return JSON.parse(fs.readFileSync(LOCAL_TENANTS_DB_PATH, 'utf-8')); } catch (_) { return []; }
}

function writeTenantsDb(tenants: any[]): void {
  fs.writeFileSync(LOCAL_TENANTS_DB_PATH, JSON.stringify(tenants, null, 2));
}

function generateTenantCode(phone: string | undefined | null): string {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  if (cleanPhone.length >= 10) {
    const last10 = cleanPhone.slice(-10);
    return last10.split('').reverse().join('');
  }
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}


export class OnboardingController {

  /**
   * POST /public/onboarding/signup
   * Legacy backward-compatible endpoint.
   */
  static async signup(req: Request, res: Response) {
    try {
      const { userId, email, schoolName, businessMode, referralCode } = req.body;
      if (!userId || !email || !schoolName) {
        return res.status(400).json({ error: 'Missing required onboarding data' });
      }

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({ name: schoolName, type: businessMode || 'school', plan: 'free', status: 'pending' })
        .select()
        .single();

      if (tenantError) throw tenantError;

      if (referralCode) {
        const { ReferralService } = require('../services/referral.service');
        await ReferralService.trackSignup(tenant.id, email, referralCode);
      }

      const { error: userError } = await supabase.from('users').insert({
        id: userId, tenant_id: tenant.id,
        name: schoolName + ' Admin', email, role: 'owner', require_password_reset: true
      });

      if (userError) {
        await supabase.from('tenants').delete().eq('id', tenant.id);
        throw userError;
      }

      await supabase.from('wallets').insert({ tenant_id: tenant.id, balance: 0 });

      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 100);
      await supabase.from('subscriptions').insert({
        tenant_id: tenant.id, plan: 'free', status: 'active',
        start_date: new Date().toISOString(), end_date: endDate.toISOString()
      });

      return res.status(201).json({ message: 'Onboarding environment provisioned successfully', tenantId: tenant.id, role: 'owner' });
    } catch (error: any) {
      console.error('[OnboardingController] Signup Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /public/onboarding/provision
   * High-Grade Atomic Provisioning Engine for enterprise customers.
   */
  static async provision(req: Request, res: Response) {
    try {
      const { email, password, businessName, industry, phone, modules, plan, quota, branding, paymentMethod, transactionId } = req.body;

      if (!email || !businessName || !industry) {
        return res.status(400).json({ error: 'Missing mandatory enterprise parameters' });
      }

      const tenantCode = generateTenantCode(phone);

      if (process.env.OFFLINE_MOCK_AUTH === 'true') {
        console.log('[OnboardingController] Simulating atomic onboarding provisioning offline.');
        const tenants = readTenantsDb();
        const tenantId = `tenant-${require('crypto').randomUUID()}`;
        const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const startingBalance = plan === 'enterprise' ? 100000 : 50000;

        tenants.unshift({
          id: tenantId, name: businessName, type: industry,
          plan: plan || 'premium', status: 'active', tenant_code: tenantCode, phone: phone || null, created_at: new Date().toISOString()
        });
        writeTenantsDb(tenants);

        return res.status(201).json({
          message: 'Stripe-grade Enterprise Provisioning sequence completed successfully.',
          tenantId, userId, role: 'owner',
          walletBalance: startingBalance, subscriptionPlan: plan || 'premium', activeModules: modules || [industry]
        });
      }

      console.log(`[OnboardingController] Beginning atomic provisioning for: ${businessName} (${email})`);

      const mockSettings = {
        enabledModules: modules || [industry],
        customBrandColor: branding?.primaryColor || '#6366f1',
        tagline: branding?.tagline || 'Pioneering absolute retail & tuition intelligence.',
        footnote: branding?.footnote || 'Thank you for transacting with Invify Pro.',
        quotas: quota || { terminals: 6, dailyTx: 500, operators: 20 },
        paymentMethod: paymentMethod || 'Stripe',
        transactionId: transactionId || `tx_atlas_${Date.now()}`,
        cacNumber: req.body.cacNumber || null
      };

      let tenant: any = null;
      let tenantError: any = null;
      let currentTenantCode = tenantCode;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const { data, error } = await supabase
          .from('tenants')
          .insert({ name: businessName, type: industry, plan: plan || 'premium', status: 'pending', settings: mockSettings, phone: phone || null, tenant_code: currentTenantCode })
          .select().single();
        tenant = data;
        tenantError = error;
        if (!tenantError) {
          break;
        }
        const isUniqueViolation = tenantError.code === '23505' || tenantError.message?.includes('unique') || tenantError.message?.includes('duplicate');
        if (isUniqueViolation && attempt < 3) {
          console.warn(`[OnboardingController] Unique constraint collision on tenant_code "${currentTenantCode}" in provision (attempt ${attempt}/3). Regenerating code...`);
          currentTenantCode = `${tenantCode.substring(0, 15)}${Math.floor(Math.random() * 100)}`;
        } else {
          break;
        }
      }

      if (tenantError) {
        console.error('[OnboardingController] Provision insert failed after retry exhaustion:', tenantError.message);
        return res.status(409).json({ error: 'Provisioning failed due to tenant code conflict. Please try again.' });
      }


      let generatedVa: any = null;
      try {
        const platformApiKey = process.env.QUASER_API_KEY || 'demo-key';
        const QuasarServiceModule = require('../integrations/quasar/quasar.service').QuasarService;
        const quasar = new QuasarServiceModule(platformApiKey);
        const va = await quasar.createVirtualAccount({
          childId: tenant.id, parentId: 'platform-admin-owner-id', currency: 'NGN',
          email: email || `billing@tenant-${tenant.id.substring(0, 8)}.invify.app`,
          firstName: businessName.split(' ')[0],
          lastName: businessName.split(' ').slice(1).join(' ') || 'Business',
          parentShareBps: 0, metadata: { type: 'tenant_operating_account' }
        });
        generatedVa = va;
        await supabase.from('tenants').update({
          virtual_account_number: va.accountNumber,
          virtual_account_bank: va.bankName,
          virtual_account_status: 'ACTIVE'
        }).eq('id', tenant.id);
      } catch (vaError: any) {
        console.error('[OnboardingController] VA generation failed (non-fatal):', vaError.message);
      }

      let userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      try {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email, password: password || '123456', email_confirm: true,
          user_metadata: { role: 'owner', tenantId: tenant.id }
        });
        if (!authError && authData.user) {
          userId = authData.user.id;
        } else {
          userId = email === 'olive@invify.com' ? 'c3d11b8b-e85d-4f2b-8a8f-2872bc900382' : require('crypto').randomUUID();
        }
      } catch (_) {
        userId = email === 'olive@invify.com' ? 'c3d11b8b-e85d-4f2b-8a8f-2872bc900382' : require('crypto').randomUUID();
      }

      const { error: userError } = await supabase.from('users').insert({
        id: userId, tenant_id: tenant.id,
        name: `${businessName} Owner`, email, role: 'owner', require_password_reset: true
      });
      if (userError) {
        await supabase.from('tenants').delete().eq('id', tenant.id);
        throw userError;
      }

      const startingBalance = plan === 'enterprise' ? 100000 : 50000;
      await supabase.from('wallets').insert({ tenant_id: tenant.id, balance: startingBalance });

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      await supabase.from('subscriptions').insert({
        tenant_id: tenant.id, plan: plan || 'premium', status: 'active',
        start_date: new Date().toISOString(), end_date: endDate.toISOString()
      });

      console.log(`[TELEMETRY] Tenant Provisioned. ID: ${tenant.id}. Industry: ${industry}. Plan: ${plan}.`);

      return res.status(201).json({
        message: 'Stripe-grade Enterprise Provisioning sequence completed successfully.',
        tenantId: tenant.id, userId, role: 'owner',
        walletBalance: startingBalance, subscriptionPlan: plan, activeModules: modules || [industry],
        virtualAccount: generatedVa ? {
          accountName: generatedVa.accountName || businessName.toUpperCase(),
          accountNumber: generatedVa.accountNumber, bankName: generatedVa.bankName
        } : null
      });
    } catch (error: any) {
      console.error('[OnboardingController] Provisioning Sequence Aborted:', error.message);
      return res.status(500).json({ error: `Atomic setup failed: ${error.message}` });
    }
  }

  /**
   * POST /auth/send-email-otp
   */
  public static async sendEmailOtp(req: Request, res: Response): Promise<void> {
    try {
      const { email, purpose = 'SIGNUP' } = req.body;
      if (!email || typeof email !== 'string') {
        res.status(400).json({ error: 'Valid email is required.' });
        return;
      }
      await verificationService.sendOTP(email, 'EMAIL', purpose);
      res.status(200).json({ success: true, message: 'Verification code sent' });
    } catch (error: any) {
      console.error('[OnboardingController] sendEmailOtp error:', error.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * POST /auth/verify-email-otp
   */
  public static async verifyEmailOtp(req: Request, res: Response): Promise<void> {
    try {
      const { email, code, purpose = 'SIGNUP' } = req.body;
      if (!email || !code) {
        res.status(400).json({ error: 'Email and code are required.' });
        return;
      }
      const isValid = await verificationService.verifyOTP(email, code, 'EMAIL', purpose);
      if (isValid) {
        res.status(200).json({ success: true, message: 'Email verified successfully.' });
      } else {
        res.status(400).json({ success: false, error: 'Invalid or expired verification code.' });
      }
    } catch (error: any) {
      console.error('[OnboardingController] verifyEmailOtp error:', error.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * POST /auth/send-whatsapp-otp
   */
  public static async sendWhatsappOtp(req: Request, res: Response): Promise<void> {
    try {
      const { phone, purpose = 'SIGNUP' } = req.body;
      if (!phone || typeof phone !== 'string') {
        res.status(400).json({ error: 'Valid phone number is required.' });
        return;
      }
      await verificationService.sendOTP(phone, 'WHATSAPP', purpose);
      res.status(200).json({ success: true, message: 'Verification code sent' });
    } catch (error: any) {
      console.error('[OnboardingController] sendWhatsappOtp error:', error.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * POST /auth/verify-whatsapp-otp
   */
  public static async verifyWhatsappOtp(req: Request, res: Response): Promise<void> {
    try {
      const { phone, code, purpose = 'SIGNUP' } = req.body;
      if (!phone || !code) {
        res.status(400).json({ error: 'Phone and code are required.' });
        return;
      }
      const isValid = await verificationService.verifyOTP(phone, code, 'WHATSAPP', purpose);
      if (isValid) {
        res.status(200).json({ success: true, message: 'WhatsApp number verified successfully.' });
      } else {
        res.status(400).json({ success: false, error: 'Invalid or expired verification code.' });
      }
    } catch (error: any) {
      console.error('[OnboardingController] verifyWhatsappOtp error:', error.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * POST /auth/register
   * Registers a new user and provisions their tenant in tenants_db.json (staging) or Supabase (live).
   */
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const { firstName, lastName, email, phone, password, businessName, industry, isTrial, emailVerified, phoneVerified } = req.body;

      if (!email || !password) {
        res.status(400).json({ success: false, error: 'Missing required fields' });
        return;
      }

      const emailVerificationRequired = process.env.AUTH_EMAIL_VERIFICATION_REQUIRED !== 'false';
      const whatsappVerificationRequired = process.env.AUTH_WHATSAPP_VERIFICATION_REQUIRED === 'true';

      if (emailVerificationRequired && !emailVerified) {
        res.status(400).json({ success: false, error: 'Email verification is required to complete registration.' });
        return;
      }
      if (whatsappVerificationRequired && !phoneVerified) {
        res.status(400).json({ success: false, error: 'WhatsApp verification is required to complete registration.' });
        return;
      }

      const tenantId = `tenant-${require('crypto').randomUUID()}`;
      const tenantName = businessName || `${firstName} ${lastName}'s Business`;
      const plan = isTrial ? 'trial' : 'standard';
      const tenantCode = generateTenantCode(phone);

      console.log(`[OnboardingController] Registering user ${firstName} ${lastName} (${email}) — Business: ${tenantName}`);

      if (process.env.OFFLINE_MOCK_AUTH === 'true') {
        const tenants = readTenantsDb();

        // Prevent duplicate registrations for the same email
        const existing = tenants.find((t: any) => t.owner_email === email);
        if (existing) {
          console.warn(`[OnboardingController] Tenant for ${email} already exists. Skipping duplicate.`);
          res.status(201).json({ success: true, message: 'Account already exists.', tenantId: existing.id });
          return;
        }

        const newTenant = {
          id: tenantId,
          name: tenantName,
          type: industry || 'retail',
          plan,
          status: 'active',
          owner_email: email,
          owner_name: `${firstName} ${lastName}`,
          phone: phone || null,
          tenant_code: tenantCode,
          created_at: new Date().toISOString(),
          subscription_end_date: isTrial
            ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };

        tenants.push(newTenant);
        writeTenantsDb(tenants);
        console.log(`[OnboardingController] Tenant "${tenantName}" saved to tenants_db.json. Total: ${tenants.length}`);
      } else {
        // Live mode — write to Supabase
        let tenantError: any = null;
        let currentTenantCode = tenantCode;
        for (let attempt = 1; attempt <= 3; attempt++) {
          const { error } = await supabase.from('tenants').insert({
            id: tenantId,
            name: tenantName,
            type: industry || 'retail',
            plan,
            status: 'active',
            phone: phone || null,
            tenant_code: currentTenantCode
          });
          tenantError = error;
          if (!tenantError) {
            break;
          }
          const isUniqueViolation = tenantError.code === '23505' || tenantError.message?.includes('unique') || tenantError.message?.includes('duplicate');
          if (isUniqueViolation && attempt < 3) {
            console.warn(`[OnboardingController] Unique constraint collision on tenant_code "${currentTenantCode}" in register (attempt ${attempt}/3). Regenerating code...`);
            currentTenantCode = `${tenantCode.substring(0, 15)}${Math.floor(Math.random() * 100)}`;
          } else {
            break;
          }
        }

        if (tenantError) {
          console.error('[OnboardingController] Supabase tenant insert failed after retry exhaustion:', tenantError.message);
          res.status(409).json({ success: false, error: 'Registration failed: Tenant code conflict could not be resolved. Please try again with a different phone number.' });
          return;
        }
      }

      try {
        const { emailService } = require('../services/email.service');
        await emailService.sendWelcomeEmail(email);
      } catch (emailErr: any) {
        console.warn('[OnboardingController] Welcome email failed (non-fatal):', emailErr.message);
      }

      res.status(201).json({ success: true, message: 'Account created successfully.', tenantId });
    } catch (error: any) {
      console.error('[OnboardingController] register error:', error.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
