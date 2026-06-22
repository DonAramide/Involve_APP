// Force NODE_ENV to 'test' so app.ts does not bind to port 3004
process.env.NODE_ENV = 'test';

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import supabase client while BUILD_VARIANT is still STAGING
import { supabaseAdmin } from '../src/db/supabase';

// Run tests with STAGING variant and disable offline mock bypass to hit DB
process.env.BUILD_VARIANT = 'STAGING';
process.env.OFFLINE_MOCK_AUTH = 'false';

import request from 'supertest';
import app from '../src/app';
import { AuditArchiveService } from '../src/services/audit-archive.service';
import { ApkVaultService } from '../src/services/apk-vault.service';

async function run() {
  console.log('=== P0-5E PERSISTENCE RUNTIME VALIDATION ===\n');
  const results: Record<string, string> = {};

  const testTenantId = '77777777-7777-7777-7777-777777777777';
  const testTenantCode = 'TKT_TC_123';
  // devices.id is TEXT ("dev-XXXXX" format) — NOT UUID
  const testDeviceId = 'dev-verify-p05e-001';

  // ----------------------------------------------------
  // PREFLIGHT CONNECTIVITY CHECK
  // ----------------------------------------------------
  console.log('--- PREFLIGHT CONNECTIVITY CHECK ---');
  try {
    const { count, error } = await supabaseAdmin.from('tenants').select('*', { count: 'exact', head: true });
    if (error) throw error;
    console.log(`  ✅ Database connectivity confirmed. Current tenant count: ${count}\n`);
  } catch (err: any) {
    console.error(`  ❌ Database connectivity failed! Error: ${err.message || err}`);
    process.exit(1);
  }

  try {
    // ----------------------------------------------------
    // CLEANUP LEGACY TEST RECORDS
    // ----------------------------------------------------
    console.log('Cleaning up test records...');
    await supabaseAdmin.from('complaints').delete().eq('tenant_code', testTenantCode);
    await supabaseAdmin.from('apk_vault').delete().eq('package_name', 'com.invify.testunique');
    await supabaseAdmin.from('apk_vault').delete().eq('package_name', 'com.invify.testattrib');
    await supabaseAdmin.from('apk_deployment_logs').delete().eq('apk_name', 'Test Attrib v1.0');
    await supabaseAdmin.from('audit_log_archive').delete().eq('tenant_code', 'TEST_ARCH_TC');
    await supabaseAdmin.from('audit_logs').delete().eq('tenant_code', 'TEST_ARCH_TC');
    await supabaseAdmin.from('tenants').delete().eq('id', testTenantId);
    await supabaseAdmin.from('devices').delete().eq('id', testDeviceId);

    // Create test tenant (without invalid company_name column)
    await supabaseAdmin.from('tenants').insert({
      id: testTenantId,
      tenant_code: testTenantCode,
      name: 'Test Complaint Tenant',
      status: 'ACTIVE'
    });

    // Create test device — devices.id is TEXT ("dev-XXXXX" format), not UUID
    await supabaseAdmin.from('devices').insert({
      id: testDeviceId,          // TEXT primary key: "dev-verify-p05e-001"
      device_id: 'dev-verify-p05e',
      device_category: 'USER_DEVICE',
      device_role: 'PHONE',
      status: 'ACTIVE'
    });

    // ----------------------------------------------------
    // CHECK 1: Complaints CRUD & tenant_code Consistency Rule
    // ----------------------------------------------------
    console.log('\n1. Verifying Complaints tenant_code Consistency Rule...');
    
    // Create complaint
    const complaintPayload = {
      title: 'POS Connection Dropping',
      description: 'The terminal keeps disconnecting from the server during checkouts.',
      category: 'hardware',
      urgency: 'high',
      tenant_id: testTenantId,
      tenant_name: 'Mutating Name Corp', // should be stored but not relied on for lookup
      device_id: testDeviceId,
      incident_date: new Date().toISOString(),
      tenant_code: 'CLIENT_ATTEMPT' // this must be ignored and overridden by resolver!
    };

    const createRes = await request(app)
      .post('/api/mobile/complaints')
      .send(complaintPayload);

    const complaintId = createRes.body?.data?.id;

    if (createRes.status === 201 && createRes.body?.success) {
      console.log(`  ✅ Complaint created successfully. ID: ${complaintId}`);
      
      // Directly check database state
      const { data: dbRecord, error: dbErr } = await supabaseAdmin
        .from('complaints')
        .select('*')
        .eq('id', complaintId)
        .single();
      
      if (!dbErr && dbRecord) {
        const hasCorrectId = dbRecord.tenant_id === testTenantId;
        const hasCorrectCode = dbRecord.tenant_code === testTenantCode; // resolved from DB, not 'CLIENT_ATTEMPT'
        
        if (hasCorrectId && hasCorrectCode) {
          console.log(`  ✅ Database record validated. tenant_id and tenant_code match tenants table.`);
          results['complaints_consistency_rule'] = 'PASS';
        } else {
          console.error(`  ❌ Database values inconsistent: tenant_id=${dbRecord.tenant_id}, tenant_code=${dbRecord.tenant_code}`);
          results['complaints_consistency_rule'] = 'FAIL';
        }
      } else {
        console.error('  ❌ Failed to fetch complaint row from DB:', dbErr?.message);
        results['complaints_consistency_rule'] = 'FAIL';
      }
    } else {
      console.error('  ❌ Complaint creation route failed:', createRes.status, createRes.body);
      results['complaints_consistency_rule'] = 'FAIL';
    }

    // Lookup complaint by tenant_code
    console.log('  Testing search/lookup by tenant_code...');
    const listRes = await request(app)
      .get(`/api/admin/complaints?tenant_code=${testTenantCode}`)
      .set('Authorization', 'Bearer mock-super-admin'); // authenticate bypass

    if (listRes.status === 200 && listRes.body?.success && listRes.body?.data?.length > 0) {
      const found = listRes.body.data.some((c: any) => c.id === complaintId);
      if (found) {
        console.log('  ✅ SupportController search/lookup by tenant_code succeeded.');
        results['complaints_lookup_search'] = 'PASS';
      } else {
        console.error('  ❌ Complaint not found in search results.');
        results['complaints_lookup_search'] = 'FAIL';
      }
    } else {
      console.error('  ❌ Lookup by tenant_code failed:', listRes.status, listRes.body);
      results['complaints_lookup_search'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 2: APK Vault Attribution & Package Uniqueness
    // ----------------------------------------------------
    console.log('\n2. Verifying APK Vault Attribution & Package Uniqueness...');

    // Test 2a: Package Uniqueness constraint
    console.log('  Testing package uniqueness constraint...');
    const apkData1 = { name: 'Test Unique 1', packageName: 'com.invify.testunique', version: '1.0.0', size: 15302, s3Url: 'http://s3.com/apk1.apk' };
    const apkData2 = { name: 'Test Unique 2', packageName: 'com.invify.testunique', version: '2.0.0', size: 18204, s3Url: 'http://s3.com/apk2.apk' };

    // Clean up first
    await supabaseAdmin.from('apk_vault').delete().eq('package_name', 'com.invify.testunique');

    let errorUnique = null;
    try {
      await ApkVaultService.addApk(apkData1, 'uploader1@invify.app');
      // Attempt duplicate insert
      await ApkVaultService.addApk(apkData2, 'uploader2@invify.app');
    } catch (err: any) {
      errorUnique = err;
    }

    if (errorUnique && (errorUnique.message.includes('unique constraint') || errorUnique.message.includes('duplicate key value') || errorUnique.message.includes('idx_apk_vault_package_name'))) {
      console.log('  ✅ Database unique constraint rejected duplicate package successfully.');
      results['apk_package_uniqueness'] = 'PASS';
    } else {
      console.error('  ❌ Duplicate package was NOT rejected by the database. Error:', errorUnique?.message);
      results['apk_package_uniqueness'] = 'FAIL';
    }

    // Clean up uniqueness test
    await supabaseAdmin.from('apk_vault').delete().eq('package_name', 'com.invify.testunique');

    // Test 2b: Attribution capture
    console.log('  Testing operator attribution...');
    const testOperator = 'ops-manager@invify.app';
    const apkAttribData = { name: 'Test Attrib', packageName: 'com.invify.testattrib', version: '1.0', size: 20010, s3Url: 'http://s3.com/attrib.apk' };

    const addedApk = await ApkVaultService.addApk(apkAttribData, testOperator);
    
    // Check if created_by is populated in DB
    const { data: dbApk } = await supabaseAdmin.from('apk_vault').select('*').eq('id', addedApk.id).single();
    if (dbApk && dbApk.created_by === testOperator) {
      console.log('  ✅ Created_by operator attribution recorded successfully.');
      // apk_operator_attribution PASS set tentatively; confirmed only if performed_by also passes below
      results['apk_operator_attribution'] = 'PASS';
    } else {
      console.error('  ❌ Created_by operator attribution missing or incorrect. Found:', dbApk?.created_by);
      results['apk_operator_attribution'] = 'FAIL';
    }

    // Deploy APK and check performed_by in deployment logs
    console.log('  Testing deployment log performed_by attribution...');
    await ApkVaultService.logDeployment({
      action: 'INSTALL',
      apkName: 'Test Attrib v1.0',
      devices: 5,
      status: 'SUCCESS',
      apkId: addedApk.id,
      targetVersion: '1.0'
    }, testOperator);

    const { data: dbLog } = await supabaseAdmin
      .from('apk_deployment_logs')
      .select('*')
      .eq('apk_name', 'Test Attrib v1.0')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (dbLog && dbLog.performed_by === testOperator && dbLog.devices === 5) {
      console.log('  ✅ Deployment log performed_by attribution recorded successfully.');
      // Both created_by (apk_vault) and performed_by (deployment_logs) confirmed — mark combined check PASS
      if (results['apk_operator_attribution'] === 'PASS') {
        results['apk_operator_attribution'] = 'PASS';
      }
    } else {
      console.error('  ❌ Deployment log attribution missing or incorrect. Found:', dbLog);
      // Override to FAIL if performed_by is wrong even if created_by was correct
      results['apk_operator_attribution'] = 'FAIL';
    }

    // Clean up APK attribution records
    await supabaseAdmin.from('apk_vault').delete().eq('id', addedApk.id);
    await supabaseAdmin.from('apk_deployment_logs').delete().eq('id', dbLog?.id);

    // ----------------------------------------------------
    // CHECK 3: Archive Traceability Validation
    // ----------------------------------------------------
    console.log('\n3. Verifying Audit Archive Traceability & Constraints...');
    
    const sampleLogId = require('crypto').randomUUID();
    const oldTimestamp = new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString(); // 100 hours ago
    
    // Clean up archive/audit logs
    await supabaseAdmin.from('audit_log_archive').delete().eq('original_log_id', sampleLogId);
    await supabaseAdmin.from('audit_logs').delete().eq('id', sampleLogId);

    // Insert old log into audit_logs table
    await supabaseAdmin.from('audit_logs').insert({
      id: sampleLogId,
      timestamp: oldTimestamp,
      module: 'AUTH',
      action: 'LOGIN_FAILURE',
      user_email: 'attacker@danger.com',
      user_name: 'Unknown',
      ip_address: '8.8.8.8',
      location: 'Global',
      target: 'Admin Console',
      status: 'failure',
      metadata: { attemptCount: 5 },
      tenant_id: null,
      tenant_code: 'TEST_ARCH_TC'
    });

    // Run archival
    console.log('  Triggering runArchiving()...');
    const archResult = await AuditArchiveService.runArchiving();
    
    if (archResult.archivedCount > 0) {
      console.log(`  ✅ Pruned and archived ${archResult.archivedCount} records.`);
      
      // Check if original record is deleted from active audit_logs
      const { data: activeLog } = await supabaseAdmin.from('audit_logs').select('*').eq('id', sampleLogId).maybeSingle();
      
      // Check if archive table contains the record
      const { data: archivedLog } = await supabaseAdmin
        .from('audit_log_archive')
        .select('*')
        .eq('original_log_id', sampleLogId)
        .maybeSingle();
      
      if (!activeLog && archivedLog) {
        const matchesOriginalId = archivedLog.original_log_id === sampleLogId;
        const matchesTenantCode = archivedLog.tenant_code === 'TEST_ARCH_TC';
        const hasValidSourceOrigin = archivedLog.source_origin === 'AUDIT_LOG'; // must match enum check constraint
        
        if (matchesOriginalId && matchesTenantCode && hasValidSourceOrigin) {
          console.log('  ✅ Audit log archived with original identity, tenant_code, and source_origin enum preserved.');
          results['archive_traceability'] = 'PASS';
        } else {
          console.error('  ❌ Archive columns do not match expected values:', archivedLog);
          results['archive_traceability'] = 'FAIL';
        }
      } else {
        console.error(`  ❌ Record state mismatch: activeLogExists=${!!activeLog}, archivedLogExists=${!!archivedLog}`);
        results['archive_traceability'] = 'FAIL';
      }
    } else {
      console.error('  ❌ Archival service failed to shift logs.');
      results['archive_traceability'] = 'FAIL';
    }

    // Clean up archive test records
    await supabaseAdmin.from('audit_log_archive').delete().eq('original_log_id', sampleLogId);

  } catch (err: any) {
    console.error('❌ Validation script encountered an error:', err.message);
  } finally {
    // Final cleanup of references
    await supabaseAdmin.from('tenants').delete().eq('id', testTenantId);
    await supabaseAdmin.from('devices').delete().eq('id', testDeviceId);
  }

  // ----------------------------------------------------
  // VERDICT SUMMARY
  // ----------------------------------------------------
  const requiredChecks = [
    'complaints_consistency_rule',
    'complaints_lookup_search',
    'apk_package_uniqueness',
    'apk_operator_attribution',
    'archive_traceability',
  ];

  console.log('\n======================================================');
  console.log('P0-5E VERIFICATION VERDICT');
  console.log('======================================================');
  let overallPass = true;
  for (const check of requiredChecks) {
    const status = results[check] ?? 'NOT RUN';
    const icon = status === 'PASS' ? '✅' : status === 'SKIP' ? '⚠️ ' : '❌';
    console.log(`${icon} ${check.padEnd(35)}: ${status}`);
    if (status !== 'PASS') overallPass = false;
  }
  console.log('======================================================');
  console.log(`OVERALL STATUS: ${overallPass ? 'PASS' : 'FAIL'}`);
  console.log('======================================================');

  // Write JSON results for reporting
  const fs2 = require('fs');
  const resultsPath = 'C:/Users/IIPS/.gemini/antigravity/brain/f6abfa43-41a3-4b4e-8428-774175a2199e/scratch/verify_p05e_results.json';
  fs2.writeFileSync(resultsPath, JSON.stringify({
    migration: 'P0-5E',
    timestamp: new Date().toISOString(),
    results,
    overallPass,
  }, null, 2));
  console.log(`\nResults written to: ${resultsPath}`);

  process.exit(overallPass ? 0 : 1);
}

run().catch(console.error);
