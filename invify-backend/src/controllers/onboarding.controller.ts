// src/controllers/onboarding.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../db/supabase';

export class OnboardingController {
  /**
   * POST /public/onboarding/signup
   * Bridges Supabase Auth with the Invify multi-tenant DB schema.
   * This is a public/unauthenticated endpoint used during Step 1 of onboarding.
   */
  static async signup(req: Request, res: Response) {
    try {
      const { userId, email, schoolName, referralCode } = req.body;

      if (!userId || !email || !schoolName) {
        return res.status(400).json({ error: 'Missing required onboarding data' });
      }

      // --- ATOMIC SETUP ---
      // 1. Create Tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({ 
          name: schoolName, 
          type: 'school', 
          plan: 'free', 
          status: 'active' 
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // --- Referral Attribution ---
      if (referralCode) {
        const { ReferralService } = require('../services/referral.service');
        await ReferralService.trackSignup(tenant.id, email, referralCode);
      }

      // 2. Create User Record (Owner)
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          tenant_id: tenant.id,
          name: schoolName + " Admin",
          email: email,
          role: 'owner'
        });

      if (userError) {
        // Rollback Tenant (Manual cleanup since no cross-table transactions in this layer easily)
        await supabase.from('tenants').delete().eq('id', tenant.id);
        throw userError;
      }

      // 3. Create Wallet
      await supabase.from('wallets').insert({ tenant_id: tenant.id, balance: 0 });

      // 4. Create Default Subscription (Rolling 30-day free)
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 100); // Effectivly infinite for free

      await supabase.from('subscriptions').insert({
        tenant_id: tenant.id,
        plan: 'free',
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString()
      });

      return res.status(201).json({
        message: 'Onboarding environment provisioned successfully',
        tenantId: tenant.id,
        role: 'owner'
      });

    } catch (error: any) {
      console.error('[OnboardingController] Signup Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }
}
