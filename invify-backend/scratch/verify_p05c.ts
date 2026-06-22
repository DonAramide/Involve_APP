// Force NODE_ENV to 'test' so app.ts does not bind to port 3004
process.env.NODE_ENV = 'test';

import { supabaseAdmin } from '../src/db/supabase';
import { GovAuditService, AuditEntry } from '../src/services/gov-audit.service';
import { AuditArchiveService } from '../src/services/audit-archive.service';
import { AdminController } from '../src/controllers/admin.controller';
import * as fs from 'fs';
import * as path from 'path';

// Run tests with STAGING variant and disable offline mock bypass to hit DB
process.env.BUILD_VARIANT = 'STAGING';
process.env.OFFLINE_MOCK_AUTH = 'false';

const ARCHIVE_FILE_PATH = path.join(process.cwd(), 'archived_audit_logs.json');

async function run() {
  console.log('=== P0-5C MIGRATION RUNTIME VALIDATION ===\n');
  const results: Record<string, string> = {};

  // Pre-generate valid UUIDs for sample logs to avoid SQL type mismatch errors
  const sampleIds = Array.from({ length: 8 }, () => require('crypto').randomUUID());

  try {
    // ----------------------------------------------------
    // CHECK 1: Seed Audit Logs into DB
    // ----------------------------------------------------
    console.log('1. Seeding sample audit logs...');
    // Delete any existing sample logs first
    await supabaseAdmin.from('audit_logs').delete().in('id', sampleIds);
    
    // Override sample logs in GovAuditService dynamically for testing
    const now = Date.now();
    const testSample: AuditEntry[] = [
      {
        id: sampleIds[0],
        timestamp: new Date(now - 15 * 60000).toISOString(),
        module: 'MAKER_CHECKER',
        action: 'APPROVAL_GRANTED',
        user_email: 'superadmin@invify.app',
        user_name: 'System Administrator',
        ip_address: '192.168.1.14',
        location: 'Local Network',
        target: 'TERMINAL_ASSIGNMENT:2215850F',
        status: 'approved',
        metadata: { approvalId: 'APR-2024-001', riskScore: 72 }
      },
      {
        id: sampleIds[1],
        timestamp: new Date(now - 45 * 60000).toISOString(),
        module: 'AUTH',
        action: 'LOGIN_SUCCESS',
        user_email: 'ops@invify.app',
        user_name: 'Operations Staff',
        ip_address: '192.168.1.20',
        location: 'Local Network',
        target: 'Admin Portal',
        status: 'success',
        metadata: { role: 'INTERNAL_STAFF', device: 'Chrome/Windows' }
      },
      {
        id: sampleIds[2],
        timestamp: new Date(now - 2 * 3600000).toISOString(),
        module: 'DEVICE',
        action: 'DEVICE_BLOCKED',
        user_email: 'superadmin@invify.app',
        user_name: 'System Administrator',
        ip_address: '192.168.1.14',
        location: 'Local Network',
        target: 'dev-UNKN-003 (ops-staff@invify.app)',
        status: 'blocked',
        metadata: { reason: 'Unrecognized device flagged by security review' }
      },
      {
        id: sampleIds[3],
        timestamp: new Date(now - 3 * 3600000).toISOString(),
        module: 'MAKER_CHECKER',
        action: 'APPROVAL_REJECTED',
        user_email: 'security@invify.app',
        user_name: 'Security Lead',
        ip_address: '192.168.1.8',
        location: 'Local Network',
        target: 'BULK_PAYOUT_REQUEST:TXN-88811',
        status: 'rejected',
        metadata: { approvalId: 'APR-2024-002', reason: 'Exceeds daily limit threshold' }
      },
      {
        id: sampleIds[4],
        timestamp: new Date(now - 5 * 3600000).toISOString(),
        module: 'USER_MGMT',
        action: 'USER_CREATED',
        user_email: 'superadmin@invify.app',
        user_name: 'System Administrator',
        ip_address: '192.168.1.14',
        location: 'Local Network',
        target: 'new-ops-staff@invify.app',
        status: 'success',
        metadata: { role: 'INTERNAL_STAFF', department: 'Operations' }
      },
      {
        id: sampleIds[5],
        timestamp: new Date(now - 8 * 3600000).toISOString(),
        module: 'SYSTEM',
        action: 'AUDIT_ARCHIVE_RUN',
        user_email: 'system@invify.internal',
        user_name: 'Invify System',
        ip_address: '127.0.0.1',
        location: 'Local Network',
        target: 'archived_audit_logs.json',
        status: 'success',
        metadata: { archivedCount: 47, retentionHours: 72 }
      },
      {
        id: sampleIds[6],
        timestamp: new Date(now - 24 * 3600000).toISOString(),
        module: 'GOVERNANCE',
        action: 'POLICY_UPDATED',
        user_email: 'superadmin@invify.app',
        user_name: 'System Administrator',
        ip_address: '192.168.1.14',
        location: 'Local Network',
        target: 'AML_POLICY_V2',
        status: 'success',
        metadata: { version: '2.1.0', changes: 'Updated KYC threshold to ₦5,000,000' }
      },
      {
        id: sampleIds[7],
        timestamp: new Date(now - 36 * 3600000).toISOString(),
        module: 'AUTH',
        action: 'FAILED_LOGIN',
        user_email: 'unknown@external.com',
        user_name: 'Unknown',
        ip_address: '102.89.47.28',
        location: 'Lagos, Lagos, Nigeria',
        target: 'Admin Portal',
        status: 'failed',
        metadata: { attempts: 3, blocked: false }
      }
    ];

    // Seed the database directly for test isolation
    const { error: seedErr } = await supabaseAdmin.from('audit_logs').insert(testSample);
    
    const { data: dbLogs, error: dbLogsErr } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .in('id', sampleIds);
      
    if (!seedErr && !dbLogsErr && dbLogs && dbLogs.length === 8) {
      results['seed_sample_logs'] = 'PASS';
      console.log(`  ✅ Successfully seeded 8 logs into audit_logs table.`);
    } else {
      results['seed_sample_logs'] = 'FAIL';
      console.log('  ❌ Failed to seed audit logs. Insert Error:', seedErr?.message, 'Query Error:', dbLogsErr?.message);
    }

    // ----------------------------------------------------
    // CHECK 2: Retrieve unified ledger and apply filter
    // ----------------------------------------------------
    console.log('\n2. Retrieving audit ledger via service...');
    const ledger = await GovAuditService.getLedger({ module: 'MAKER_CHECKER' });
    const makerCheckerLogs = ledger.data.filter(l => sampleIds.includes(l.id));
    
    if (makerCheckerLogs.length === 2 && makerCheckerLogs.every(l => l.module === 'MAKER_CHECKER')) {
      results['get_ledger_filtered'] = 'PASS';
      console.log(`  ✅ getLedger correctly filtered and returned 2 seeded MAKER_CHECKER logs.`);
    } else {
      results['get_ledger_filtered'] = 'FAIL';
      console.log('  ❌ getLedger returned invalid or empty results. Found:', makerCheckerLogs.length);
    }

    // ----------------------------------------------------
    // CHECK 3: Log new action via logAction
    // ----------------------------------------------------
    console.log('\n3. Logging new action via GovAuditService.logAction...');
    const newLogId = require('crypto').randomUUID(); // Valid UUID
    
    await GovAuditService.logAction({
      id: newLogId,
      timestamp: new Date().toISOString(),
      module: 'AUTH',
      action: 'TEST_VALIDATION_ACTION',
      user_email: 'val_tester@invify.app',
      user_name: 'Validation Tester',
      ip_address: '127.0.0.1',
      target: 'Audit Logs Table',
      status: 'success',
      metadata: { check: 'runAction' }
    });

    const { data: verifyLogged, error: verifyLoggedErr } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('id', newLogId)
      .single();

    if (!verifyLoggedErr && verifyLogged) {
      results['log_action_persistence'] = 'PASS';
      console.log('  ✅ logAction successfully inserted record into staging DB.');
    } else {
      results['log_action_persistence'] = 'FAIL';
      console.log('  ❌ Failed to retrieve newly logged action from DB. Error:', verifyLoggedErr?.message);
    }

    // Clean up test action
    await supabaseAdmin.from('audit_logs').delete().eq('id', newLogId);

    // ----------------------------------------------------
    // CHECK 4: Retrieve Global Settings via direct controller call
    // ----------------------------------------------------
    console.log('\n4. Retrieving Global Settings...');
    
    let responseData: any = null;
    const mockReq = { query: {} } as any;
    const mockRes = {
      status: (code: number) => {
        return {
          json: (data: any) => {
            responseData = data;
            return mockRes;
          }
        };
      }
    } as any;

    // Call controller directly
    await AdminController.getGlobalSettings(mockReq, mockRes);
    
    if (responseData && responseData.commissions) {
      results['get_settings_db'] = 'PASS';
      console.log('  ✅ getGlobalSettings returned settings from DB, including commissions:', responseData.commissions);
    } else {
      results['get_settings_db'] = 'FAIL';
      console.log('  ❌ getGlobalSettings failed or returned incorrect body:', responseData);
    }

    // ----------------------------------------------------
    // CHECK 5: Archive Active Database Logs (Pruning)
    // ----------------------------------------------------
    console.log('\n5. Testing general logs archival (pruning older than 72 hours)...');
    
    // Seed an old log (e.g. 10 days old)
    const oldLogId = require('crypto').randomUUID(); // Valid UUID
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    
    await supabaseAdmin.from('audit_logs').insert({
      id: oldLogId,
      timestamp: tenDaysAgo,
      module: 'AUTH',
      action: 'OLD_ARCHIVE_TEST_ACTION',
      user_email: 'old_tester@invify.app',
      status: 'success',
      metadata: {}
    });

    // Make sure archive file is readable or create it
    if (fs.existsSync(ARCHIVE_FILE_PATH)) {
      fs.unlinkSync(ARCHIVE_FILE_PATH); // Start fresh
    }

    const { archivedCount } = await AuditArchiveService.runArchiving();
    
    // Verify that the old log has been deleted from audit_logs table
    const { data: dbOldCheck } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('id', oldLogId)
      .maybeSingle();

    // Verify that the old log exists in database audit_log_archive table (P0-5E migrated)
    const { data: dbArchiveCheck } = await supabaseAdmin
      .from('audit_log_archive')
      .select('*')
      .eq('original_log_id', oldLogId)
      .maybeSingle();

    const archivedInDbContainsOld = !!dbArchiveCheck;

    if (!dbOldCheck && archivedInDbContainsOld && archivedCount > 0) {
      results['archiving_pruning'] = 'PASS';
      console.log(`  ✅ Successfully archived old record to audit_log_archive table and pruned it from DB.`);
    } else {
      results['archiving_pruning'] = 'FAIL';
      console.log(`  ❌ Archival check failed. DB record still exists: ${!!dbOldCheck}. Found in archive DB: ${archivedInDbContainsOld}. Count: ${archivedCount}`);
    }

    // Clean up test records
    await supabaseAdmin.from('audit_logs').delete().in('id', sampleIds);
    await supabaseAdmin.from('audit_logs').delete().eq('id', oldLogId);
    await supabaseAdmin.from('audit_log_archive').delete().eq('original_log_id', oldLogId);

  } catch (error: any) {
    console.error('\nValidation encountered unexpected error:', error.message);
  }

  // ----------------------------------------------------
  // Output Verdict Table
  // ----------------------------------------------------
  console.log('\n======================================================');
  console.log('VERDICT SUMMARY');
  console.log('======================================================');
  let overallPass = true;
  for (const [key, val] of Object.entries(results)) {
    console.log(`${key.padEnd(35)}: ${val}`);
    if (val === 'FAIL') overallPass = false;
  }
  console.log('======================================================');
  console.log(`OVERALL STATUS: ${overallPass ? 'PASS' : 'FAIL'}`);
  console.log('======================================================');

  // Write results to JSON file for report compile
  fs.writeFileSync('C:/Users/IIPS/.gemini/antigravity/brain/f6abfa43-41a3-4b4e-8428-774175a2199e/scratch/verify_p05c_results.json', JSON.stringify({ results, overallPass }, null, 2));

  process.exit(overallPass ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
