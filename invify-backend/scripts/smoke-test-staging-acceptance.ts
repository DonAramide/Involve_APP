// invify-backend/scripts/smoke-test-staging-acceptance.ts
process.env.BUILD_VARIANT = 'STAGING';
process.env.NODE_ENV = 'staging';

import { supabaseAdmin } from '../src/db/supabase';
import { HealthPlatformService } from '../src/modules/health-insurance/services/health-platform.service';
import { HealthContext } from '../src/modules/health-insurance/types';

async function runStagingSmokeTest() {
  console.log('================================================================');
  console.log('  INVIFY HEALTH & WELLNESS — STAGING READ-ONLY SMOKE TEST AUDIT');
  console.log('================================================================\n');

  try {
    // 1. Verify Staging DB Connectivity & Table Schemas
    console.log('[Check 1] Verifying presence & accessibility of all 23 hw_* tables in staging...');
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

    for (const table of tables) {
      const { count, error } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error(`  FAIL: Table '${table}' inaccessible:`, error.message);
        throw error;
      }
      console.log(`  VERIFIED: ${table.padEnd(28)} (rows: ${count ?? 0})`);
    }

    // 2. Test Platform Overview Query
    console.log('\n[Check 2] Executing HealthPlatformService.getPlatformOverview()...');
    const platformCtx: HealthContext = {
      tenantId: '00000000-0000-0000-0000-000000000000',
      userId: 'staging-smoke-test-operator',
      permissions: ['platform.integration.health'],
      isPlatformOperator: true,
      isGuardian: false
    };

    const overview = await HealthPlatformService.getPlatformOverview(platformCtx);
    console.log('  VERIFIED: Platform Overview Metrics Retrieved:');
    console.log(`    - Participating Tenants:      ${overview.participatingTenants}`);
    console.log(`    - Total Enrolled Members:     ${overview.totalEnrolledMembers}`);
    console.log(`    - Active Confirmed Policies:  ${overview.activePolicies}`);
    console.log(`    - Policies Expiring (30d):    ${overview.policiesExpiringSoon}`);
    console.log(`    - Configured HMO Providers:   ${overview.configuredProviders}`);
    console.log(`    - Total Premiums Billed:      NGN ${(overview.totalBilledMinor / 100).toLocaleString()}`);
    console.log(`    - Total Premiums Settled:     NGN ${(overview.totalCollectedMinor / 100).toLocaleString()}`);

    // 3. Test Cross-Tenant Directory Query (PII Check)
    console.log('\n[Check 3] Inspecting tenants columns in staging...');
    const { data: sampleTenant } = await supabaseAdmin.from('tenants').select('*').limit(1).maybeSingle();
    if (sampleTenant) {
      console.log('    Tenant columns in staging:', Object.keys(sampleTenant).join(', '));
    }
    console.log('Executing HealthPlatformService.listPlatformTenants()...');
    const tenantsResult = await HealthPlatformService.listPlatformTenants(platformCtx, { limit: 5 });
    console.log(`  VERIFIED: Retrieved ${tenantsResult.tenants.length} tenants (total: ${tenantsResult.total}):`);
    for (const t of tenantsResult.tenants) {
      console.log(`    - [${t.business_mode || 'unknown'}] ${t.name} (enrolled: ${t.enrolledCount}, active: ${t.activePoliciesCount})`);
      // Verify zero student or staff PII exposed
      if ((t as any).student_name || (t as any).students || (t as any).staff || (t as any).guardians) {
        throw new Error('SECURITY VIOLATION: Student or staff PII detected in tenant directory response!');
      }
    }
    console.log('  VERIFIED: Privacy boundary confirmed. Zero student/guardian/staff PII exposed.');

    // 4. Test Provider Health Telemetry
    console.log('\n[Check 4] Executing HealthPlatformService.getProvidersHealth()...');
    const provResult = await HealthPlatformService.getProvidersHealth(platformCtx);
    console.log(`  VERIFIED: Retrieved ${provResult.providers.length} registered HMO provider(s):`);
    for (const p of provResult.providers) {
      console.log(`    - ${p.displayName} [${p.code}] status: ${p.integrationStatus}, sandbox: ${p.isSandbox}, active plans: ${p.activePlansCount}, telemetry: ${p.telemetryStatus}`);
    }

    // 5. Test Coverage Trends
    console.log('\n[Check 5] Executing HealthPlatformService.getCoverageTrends()...');
    const trends = await HealthPlatformService.getCoverageTrends(platformCtx);
    console.log('  VERIFIED: Multi-mode trends:');
    console.log('    - By Mode:     ', JSON.stringify(trends.byMode));
    console.log('    - By Category: ', JSON.stringify(trends.byCategory));
    console.log('    - By Status:   ', JSON.stringify(trends.byStatus));

    // 6. Test Platform Grants & Audit Lineage Query
    console.log('\n[Check 6] Executing HealthPlatformService.listPlatformGrants()...');
    const grants = await HealthPlatformService.listPlatformGrants(platformCtx, {});
    console.log(`  VERIFIED: ${grants.length} platform grants inspected in hw_platform_grants.`);

    console.log('\n[Check 7] Executing HealthPlatformService.listPlatformAuditEvents()...');
    const auditRes = await HealthPlatformService.listPlatformAuditEvents(platformCtx, { limit: 5 });
    console.log(`  VERIFIED: ${auditRes.events.length} immutable audit event(s) retrieved from hw_audit_events.`);

    console.log('\n================================================================');
    console.log('  ALL STAGING READ-ONLY SMOKE CHECKS PASSED SUCCESSFULLY');
    console.log('================================================================\n');
  } catch (err: any) {
    console.error('\nSMOKE TEST ERROR:', err?.message || err);
    process.exit(1);
  }
}

runStagingSmokeTest();
