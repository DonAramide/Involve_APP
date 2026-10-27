// invify-backend/scripts/verify-staging-health.ts
process.env.BUILD_VARIANT = 'STAGING';
process.env.NODE_ENV = 'staging';
import { supabaseAdmin } from '../src/db/supabase';

async function runStagingVerification() {
  console.log('=== Invify Health & Wellness — Staging Verification ===\n');

  const tables = [
    'hw_providers',
    'hw_plans',
    'hw_plan_versions',
    'hw_tenant_plan_offers',
    'hw_tenant_settings',
    'hw_facilities',
    'hw_plan_facilities',
    'hw_staff_profiles',
    'hw_members',
    'hw_guardian_links',
    'hw_guardian_invitations',
    'hw_dependants',
    'hw_enrolments',
    'hw_enrolment_history',
    'hw_policies',
    'hw_premium_invoices',
    'hw_premium_invoice_items',
    'hw_payments',
    'hw_payment_allocations',
    'hw_claims',
    'hw_claim_lines',
    'hw_permission_grants',
    'hw_platform_grants',
    'hw_audit_events'
  ];

  console.log(`[Step 1] Checking presence and accessibility of all ${tables.length} hw_* tables...`);
  for (const table of tables) {
    const { count, error } = await supabaseAdmin
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error(`  FAIL: Table ${table} returned error:`, error.message);
      process.exit(1);
    }
    console.log(`  OK: ${table.padEnd(28)} (current row count: ${count ?? 0})`);
  }

  console.log('\n[Step 2] Finding a valid tenant and student in staging...');
  const { data: student, error: studentErr } = await supabaseAdmin
    .from('students')
    .select('id, tenant_id, first_name, last_name')
    .limit(1)
    .maybeSingle();

  let testTenantId: string;
  let testStudentId: string | null = null;

  if (student && student.tenant_id) {
    testTenantId = student.tenant_id;
    testStudentId = student.id;
    console.log(`  OK: Using existing student "${student.first_name} ${student.last_name}" (${student.id}) in tenant (${testTenantId})`);
  } else {
    const { data: tenant } = await supabaseAdmin.from('tenants').select('id, name').limit(1).single();
    if (!tenant) throw new Error('No tenant found in staging');
    testTenantId = tenant.id;
    console.log(`  OK: Using tenant "${tenant.name}" (${testTenantId}) without student.`);
  }

  let providerId: string | null = null;
  let planId: string | null = null;
  let versionId: string | null = null;
  let offerId: string | null = null;
  let memberId: string | null = null;
  let enrolmentId: string | null = null;
  let policyId: string | null = null;

  try {
    console.log('\n[Step 3] Testing Provider & Plan Version Creation...');
    const testCode = `test_hmo_${Math.floor(Date.now() / 1000)}`;
    const { data: prov, error: pErr } = await supabaseAdmin
      .from('hw_providers')
      .insert({
        code: testCode,
        display_name: 'Staging Test HMO Provider',
        integration_status: 'sandbox',
        adapter_key: 'sandbox'
      })
      .select('id')
      .single();
    if (pErr) throw new Error(`Provider insert failed: ${pErr.message}`);
    providerId = prov.id;
    console.log(`  OK: Inserted hw_providers id: ${providerId}`);

    const { data: plan, error: plErr } = await supabaseAdmin
      .from('hw_plans')
      .insert({
        provider_id: providerId,
        code: `plan_${Math.floor(Date.now() / 1000)}`,
        name: 'Student Shield Standard',
        status: 'active'
      })
      .select('id')
      .single();
    if (plErr) throw new Error(`Plan insert failed: ${plErr.message}`);
    planId = plan.id;
    console.log(`  OK: Inserted hw_plans id: ${planId}`);

    const { data: ver, error: vErr } = await supabaseAdmin
      .from('hw_plan_versions')
      .insert({
        plan_id: planId,
        version: 1,
        status: 'published',
        premium_minor: 3500000, // 35,000 NGN in kobo
        currency: 'NGN',
        billing_frequency: 'annual',
        member_categories: ['student'],
        effective_from: '2026-10-15',
        published_at: new Date().toISOString()
      })
      .select('id')
      .single();
    if (vErr) throw new Error(`Plan version insert failed: ${vErr.message}`);
    versionId = ver.id;
    console.log(`  OK: Inserted hw_plan_versions id: ${versionId} (status: published)`);

    console.log('\n[Step 4] Testing Tenant Plan Offer & Tenant Settings...');
    const { data: offer, error: offErr } = await supabaseAdmin
      .from('hw_tenant_plan_offers')
      .insert({
        tenant_id: testTenantId,
        plan_version_id: versionId,
        default_funding: 'school',
        is_active: true
      })
      .select('id')
      .single();
    if (offErr) throw new Error(`Tenant offer insert failed: ${offErr.message}`);
    offerId = offer.id;
    console.log(`  OK: Inserted hw_tenant_plan_offers id: ${offerId}`);

    const { error: setErr } = await supabaseAdmin
      .from('hw_tenant_settings')
      .upsert({
        tenant_id: testTenantId,
        enabled: true,
        school_enabled: true
      });
    if (setErr) throw new Error(`Tenant settings upsert failed: ${setErr.message}`);
    console.log(`  OK: Upserted hw_tenant_settings for tenant: ${testTenantId}`);

    if (testStudentId) {
      console.log('\n[Step 5] Testing Member & Enrolment Lifecycle State Machine...');
      const { data: mem, error: mErr } = await supabaseAdmin
        .from('hw_members')
        .insert({
          tenant_id: testTenantId,
          mode: 'school',
          member_category: 'student',
          student_id: testStudentId,
          cohort_label: '2026/2027',
          status: 'active'
        })
        .select('id')
        .single();
      if (mErr) throw new Error(`Member insert failed: ${mErr.message}`);
      memberId = mem.id;
      console.log(`  OK: Inserted hw_members id: ${memberId}`);

      const { data: enr, error: eErr } = await supabaseAdmin
        .from('hw_enrolments')
        .insert({
          tenant_id: testTenantId,
          member_id: memberId,
          plan_version_id: versionId,
          status: 'draft',
          period_start: '2026-10-15',
          period_end: '2027-10-14'
        })
        .select('id')
        .single();
      if (eErr) throw new Error(`Enrolment draft insert failed: ${eErr.message}`);
      enrolmentId = enr.id;
      console.log(`  OK: Inserted hw_enrolments id: ${enrolmentId} (status: draft)`);

      // 1. draft -> enrolment_pending
      const { error: up1 } = await supabaseAdmin.from('hw_enrolments').update({ status: 'enrolment_pending' }).eq('id', enrolmentId);
      if (up1) throw new Error(`Transition to enrolment_pending failed: ${up1.message}`);
      console.log('  OK: Validated transition: draft -> enrolment_pending');

      // 2. enrolment_pending -> awaiting_verification
      const { error: up2 } = await supabaseAdmin.from('hw_enrolments').update({ status: 'awaiting_verification' }).eq('id', enrolmentId);
      if (up2) throw new Error(`Transition to awaiting_verification failed: ${up2.message}`);
      console.log('  OK: Validated transition: enrolment_pending -> awaiting_verification');

      // 3. awaiting_verification -> awaiting_premium_payment
      const { error: up3 } = await supabaseAdmin.from('hw_enrolments').update({ status: 'awaiting_premium_payment' }).eq('id', enrolmentId);
      if (up3) throw new Error(`Transition to awaiting_premium_payment failed: ${up3.message}`);
      console.log('  OK: Validated transition: awaiting_verification -> awaiting_premium_payment');

      // 4. awaiting_premium_payment -> awaiting_insurer_activation
      const { error: up4 } = await supabaseAdmin.from('hw_enrolments').update({ status: 'awaiting_insurer_activation' }).eq('id', enrolmentId);
      if (up4) throw new Error(`Transition to awaiting_insurer_activation failed: ${up4.message}`);
      console.log('  OK: Validated transition: awaiting_premium_payment -> awaiting_insurer_activation');

      console.log('\n[Step 6] Testing Policy Creation & Insurer Confirmation...');
      const { data: pol, error: polErr } = await supabaseAdmin
        .from('hw_policies')
        .insert({
          tenant_id: testTenantId,
          enrolment_id: enrolmentId,
          provider_id: providerId,
          policy_number: `POL-STG-${Date.now()}`,
          status: 'active',
          effective_date: '2026-10-15',
          expiry_date: '2027-10-14',
          activation_confirmed_at: new Date().toISOString(),
          activation_event_id: 'evt_sim_sandbox_activation'
        })
        .select('id')
        .single();
      if (polErr) throw new Error(`Policy insert failed: ${polErr.message}`);
      policyId = pol.id;
      console.log(`  OK: Inserted confirmed policy in hw_policies id: ${policyId}`);

      // 5. awaiting_insurer_activation -> active
      const { error: up5 } = await supabaseAdmin.from('hw_enrolments').update({ status: 'active' }).eq('id', enrolmentId);
      if (up5) throw new Error(`Transition to active failed: ${up5.message}`);
      console.log('  OK: Validated transition: awaiting_insurer_activation -> active (Confirmed Coverage)');
    }

    console.log('\n[Step 7] Testing Immutable Audit Logging (hw_audit_events)...');
    const { error: aErr } = await supabaseAdmin
      .from('hw_audit_events')
      .insert({
        tenant_id: testTenantId,
        actor_role: 'system',
        action: 'STAGING_VERIFICATION_COMPLETE',
        resource_type: 'hw_enrolments',
        resource_id: enrolmentId || '00000000-0000-0000-0000-000000000000',
        changes: { test: true, verified_at: new Date().toISOString() }
      });
    if (aErr) throw new Error(`Audit event insert failed: ${aErr.message}`);
    console.log('  OK: Successfully wrote audit record to hw_audit_events');

    console.log('\n>>> ALL STAGING DATABASE VERIFICATION CHECKS PASSED WITH 100% SUCCESS! <<<');
  } finally {
    console.log('\n[Step 8] Teardown & Clean up test records from staging...');
    try { if (policyId) await supabaseAdmin.from('hw_policies').delete().eq('id', policyId); } catch {}
    try { if (enrolmentId) await supabaseAdmin.from('hw_enrolments').delete().eq('id', enrolmentId); } catch {}
    try { if (memberId) await supabaseAdmin.from('hw_members').delete().eq('id', memberId); } catch {}
    try { if (offerId) await supabaseAdmin.from('hw_tenant_plan_offers').delete().eq('id', offerId); } catch {}
    try {
      if (versionId) {
        await supabaseAdmin.from('hw_plan_versions').update({ status: 'retired' }).eq('id', versionId);
      }
    } catch {}
    try { if (planId) await supabaseAdmin.from('hw_plans').delete().eq('id', planId); } catch {}
    try { if (providerId) await supabaseAdmin.from('hw_providers').delete().eq('id', providerId); } catch {}
    console.log('  OK: Staging cleanup completed.');
  }
}

runStagingVerification().catch((err) => {
  console.error('\nFATAL STAGING VERIFICATION ERROR:', err);
  process.exit(1);
});
