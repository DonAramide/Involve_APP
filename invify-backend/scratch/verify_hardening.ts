// 1. Force NODE_ENV to 'test' so app.ts does not bind to a port
process.env.NODE_ENV = 'test';

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('--- ENVIRONMENT VARIABLES CHECK ---');
console.log('STAGING_SUPABASE_URL:', process.env.STAGING_SUPABASE_URL);
console.log('STAGING_SUPABASE_SERVICE_KEY length:', process.env.STAGING_SUPABASE_SERVICE_KEY ? process.env.STAGING_SUPABASE_SERVICE_KEY.length : 0);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_KEY length:', process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.length : 0);

// Run tests with STAGING variant and disable offline mock bypass to hit DB
process.env.BUILD_VARIANT = 'STAGING';
process.env.OFFLINE_MOCK_AUTH = 'false';

import { supabase, supabaseAdmin } from '../src/db/supabase';
console.log('supabaseUrl resolved to:', (supabaseAdmin as any).supabaseUrl);
console.log('-------------------------------------\n');

import request from 'supertest';
import app from '../src/app';

async function run() {
  console.log('=== ARCHITECTURAL HARDENING VERIFICATION REPORT ===\n');
  const results: Record<string, string> = {};

  // ----------------------------------------------------
  // PREFLIGHT CONNECTIVITY CHECK
  // ----------------------------------------------------
  console.log('--- PREFLIGHT CONNECTIVITY CHECK ---');
  try {
    const { count, error } = await supabaseAdmin.from('tenants').select('*', { count: 'exact', head: true });
    if (error) {
      throw error;
    }
    console.log(`  ✅ Database connectivity confirmed. Current tenant count: ${count}\n`);
  } catch (err: any) {
    console.error(`  ❌ CRITICAL: Database connectivity failed! Error: ${err.message || err}`);
    console.error('  FAILING FAST: Hardening verification cannot proceed without database access.\n');
    process.exit(1);
  }

  try {
    // Cleanup any existing test records first to prevent PK conflicts
    await supabaseAdmin.from('devices').delete().in('id', [
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003'
    ]);
    await supabaseAdmin.from('devices').delete().in('device_id', [
      'test-device-invalid-cat',
      'test-device-invalid-role',
      'test-device-valid-check'
    ]);
    await supabaseAdmin.from('tenants').delete().eq('tenant_code', 'VERIFY_TC_123');

    // ----------------------------------------------------
    // CHECK 1: device_role / device_category Constraints
    // ----------------------------------------------------
    console.log('1. Verifying Device Enumeration Constraints...');
    
    // Test 1a: Invalid category (valid role)
    console.log('  Testing invalid device_category...');
    const { error: errorCat } = await supabaseAdmin
      .from('devices')
      .insert({
        id: '00000000-0000-0000-0000-000000000001',
        device_id: 'test-device-invalid-cat',
        device_category: 'INVALID_CATEGORY',
        device_role: 'PHONE',
        status: 'ACTIVE'
      });

    if (errorCat && (errorCat.message.includes('chk_device_category') || errorCat.message.includes('violates check constraint'))) {
      results['device_category_validation'] = 'PASS';
      console.log('  ✅ Invalid device_category rejected successfully.');
    } else {
      results['device_category_validation'] = 'FAIL';
      console.log('  ❌ Invalid device_category was NOT rejected properly. Error:', errorCat?.message);
    }

    // Test 1b: Invalid role (valid category)
    console.log('  Testing invalid device_role...');
    const { error: errorRole } = await supabaseAdmin
      .from('devices')
      .insert({
        id: '00000000-0000-0000-0000-000000000002',
        device_id: 'test-device-invalid-role',
        device_category: 'USER_DEVICE',
        device_role: 'LAPTOP',
        status: 'ACTIVE'
      });

    if (errorRole && (errorRole.message.includes('chk_device_role') || errorRole.message.includes('violates check constraint'))) {
      results['device_role_validation'] = 'PASS';
      console.log('  ✅ Invalid device_role rejected successfully.');
    } else {
      results['device_role_validation'] = 'FAIL';
      console.log('  ❌ Invalid device_role was NOT rejected properly. Error:', errorRole?.message);
    }

    // Test 1c: Valid category & role
    console.log('  Testing valid device category & role...');
    const validDevicePayload = {
      id: '00000000-0000-0000-0000-000000000003',
      device_id: 'test-device-valid-check',
      device_category: 'USER_DEVICE',
      device_role: 'PHONE',
      status: 'ACTIVE'
    };
    
    // Cleanup first
    await supabaseAdmin.from('devices').delete().eq('device_id', 'test-device-valid-check');
    
    const { error: errorValid } = await supabaseAdmin
      .from('devices')
      .insert(validDevicePayload);

    if (!errorValid) {
      console.log('  ✅ Valid device inserted successfully.');
      await supabaseAdmin.from('devices').delete().eq('device_id', 'test-device-valid-check');
    } else {
      console.log('  ⚠️ Valid device insert failed:', errorValid.message);
    }

    // ----------------------------------------------------
    // CHECK 2: Tenant Code Immutability (Database)
    // ----------------------------------------------------
    console.log('\n2. Verifying tenant_code Immutability (Database)...');
    const tempTenantId = '99999999-9999-9999-9999-999999999999';
    
    // Clean up first
    await supabaseAdmin.from('tenants').delete().eq('id', tempTenantId);

    const { error: tenantInsertError } = await supabaseAdmin
      .from('tenants')
      .insert({
        id: tempTenantId,
        name: 'Verification Hardening Tenant',
        type: 'retail',
        tenant_code: 'VERIFY_TC_123',
        agent_code: 'AGENT_123',
        status: 'pending'
      });

    if (tenantInsertError) {
      console.error('  Failed to insert test tenant:', tenantInsertError.message);
      results['tenant_code_immutability'] = 'FAIL (Insert failed)';
    } else {
      // Attempt to update tenant_code
      const { error: tenantUpdateError } = await supabaseAdmin
        .from('tenants')
        .update({ tenant_code: 'VERIFY_TC_UPDATED' })
        .eq('id', tempTenantId);

      if (tenantUpdateError && (tenantUpdateError.message.includes('tenant_code is immutable') || tenantUpdateError.message.includes('prevent_tenant_codes_update'))) {
        results['tenant_code_immutability'] = 'PASS';
        console.log('  ✅ tenant_code update rejected by database trigger.');
      } else {
        results['tenant_code_immutability'] = 'FAIL';
        console.log('  ❌ tenant_code update was NOT rejected. Error:', tenantUpdateError?.message);
      }
    }

    // ----------------------------------------------------
    // CHECK 3: Tenant Code Uniqueness (Database)
    // ----------------------------------------------------
    console.log('\n3. Verifying tenant_code Uniqueness...');
    const duplicateTenantId = '99999999-9999-9999-9999-999999999998';
    
    await supabaseAdmin.from('tenants').delete().eq('id', duplicateTenantId);

    const { error: duplicateError } = await supabaseAdmin
      .from('tenants')
      .insert({
        id: duplicateTenantId,
        name: 'Duplicate Tenant',
        type: 'retail',
        tenant_code: 'VERIFY_TC_123', // duplicate of tempTenant
        agent_code: 'AGENT_999',
        status: 'pending'
      });

    if (duplicateError && (duplicateError.code === '23505' || duplicateError.message.includes('duplicate key value violates unique constraint'))) {
      results['tenant_code_uniqueness'] = 'PASS';
      console.log('  ✅ Duplicate tenant_code rejected by unique constraint.');
    } else {
      results['tenant_code_uniqueness'] = 'FAIL';
      console.log('  ❌ Duplicate tenant_code was NOT rejected. Error:', duplicateError?.message);
    }

    // ----------------------------------------------------
    // CHECK 4: Agent Code Immutability (Database & Application)
    // ----------------------------------------------------
    console.log('\n4. Verifying agent_code Immutability... ');
    
    // 4a. Update agent_code on tenant
    const { error: tenantAgentUpdateError } = await supabaseAdmin
      .from('tenants')
      .update({ agent_code: 'AGENT_UPDATED' })
      .eq('id', tempTenantId);

    if (tenantAgentUpdateError && (tenantAgentUpdateError.message.includes('agent_code attribution is immutable') || tenantAgentUpdateError.message.includes('prevent_tenant_codes_update'))) {
      results['tenant_agent_code_immutability'] = 'PASS';
      console.log('  ✅ tenant.agent_code update rejected by database trigger.');
    } else {
      results['tenant_agent_code_immutability'] = 'FAIL';
      console.log('  ❌ tenant.agent_code update was NOT rejected. Error:', tenantAgentUpdateError?.message);
    }

    // 4b. Update agent_code on agent profile (Conditional on table existence)
    const { error: checkAgentsTable } = await supabaseAdmin.from('agents').select('id').limit(1);
    
    if (!checkAgentsTable) {
      console.log('  agents table exists. Testing agents.agent_code immutability...');
      const tempAgentId = '88888888-8888-8888-8888-888888888888';
      
      await supabaseAdmin.from('agents').delete().eq('id', tempAgentId);

      // Create a dummy auth user to satisfy FK
      const testEmail = 'verify_agent_hardening@example.com';
      let authUserId = '77777777-7777-7777-7777-777777777777';
      
      const { data: listUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = listUsers?.users.find(u => u.email === testEmail);
      if (existingUser) {
        authUserId = existingUser.id;
      } else {
        const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
          email: testEmail,
          password: 'TestPassword123!',
          email_confirm: true
        });
        if (newUser?.user) authUserId = newUser.user.id;
      }

      const { error: agentInsertError } = await supabaseAdmin
        .from('agents')
        .insert({
          id: tempAgentId,
          auth_user_id: authUserId,
          agent_code: 'AGENT_TC_123',
          first_name: 'Verification',
          last_name: 'Agent',
          email: testEmail,
          phone: '08000000999'
        });

      if (agentInsertError) {
        console.error('  Failed to insert test agent:', agentInsertError.message);
        results['agents_table_immutability'] = 'FAIL (Insert failed)';
      } else {
        const { error: agentUpdateError } = await supabaseAdmin
          .from('agents')
          .update({ agent_code: 'AGENT_TC_UPDATED' })
          .eq('id', tempAgentId);

        if (agentUpdateError && (agentUpdateError.message.includes('agent_code is immutable') || agentUpdateError.message.includes('prevent_agent_code_update'))) {
          results['agents_table_immutability'] = 'PASS';
          console.log('  ✅ agents.agent_code update rejected by database trigger.');
        } else {
          results['agents_table_immutability'] = 'FAIL';
          console.log('  ❌ agents.agent_code update was NOT rejected. Error:', agentUpdateError?.message);
        }
      }
      
      // Cleanup agent
      await supabaseAdmin.from('agents').delete().eq('id', tempAgentId);
    } else {
      console.log('  agents table is not defined or not accessible. Skipping agents.agent_code trigger test.');
      results['agents_table_immutability'] = 'SKIP';
    }

    // ----------------------------------------------------
    // CHECK 5: updateTenant Strips tenant_code and agent_code (API)
    // ----------------------------------------------------
    console.log('\n5. Verifying updateTenant endpoint strips tenant_code & agent_code...');
    
    // We send a request to update the tenant's name, but also pass updated tenant_code and agent_code
    const resUpdate = await request(app)
      .patch(`/admin/tenants/${tempTenantId}`)
      .set('Authorization', 'Bearer mock-super-admin-token')
      .send({
        name: 'Updated Tenant Name via API',
        tenant_code: 'SPOOFED_CODE',
        agent_code: 'SPOOFED_AGENT'
      });

    if (resUpdate.status === 200) {
      // Fetch tenant from db to verify name was updated but codes remain the same
      const { data: dbTenant } = await supabaseAdmin
        .from('tenants')
        .select('*')
        .eq('id', tempTenantId)
        .single();

      if (dbTenant && dbTenant.name === 'Updated Tenant Name via API' && dbTenant.tenant_code === 'VERIFY_TC_123' && dbTenant.agent_code === 'AGENT_123') {
        results['update_tenant_api_protection'] = 'PASS';
        console.log('  ✅ API successfully updated allowed fields and silently stripped tenant_code and agent_code.');
      } else {
        results['update_tenant_api_protection'] = 'FAIL';
        console.log('  ❌ API update failed or did not strip fields properly. Data:', dbTenant);
      }
    } else {
      results['update_tenant_api_protection'] = 'FAIL';
      console.log('  ❌ API returned error status:', resUpdate.status, resUpdate.body);
    }

    // ----------------------------------------------------
    // CHECK 6: Onboarding Response Alignment (API)
    // ----------------------------------------------------
    console.log('\n6. Verifying Onboarding responses return tenantCode...');
    const randomEmail = `h_verify_${Math.floor(Math.random() * 1000000)}@example.com`;
    const randomPhone = `080${Math.floor(10000000 + Math.random() * 90000000)}`;

    const resRegister = await request(app)
      .post('/auth/register')
      .send({
        firstName: 'Hardening',
        lastName: 'Tester',
        email: randomEmail,
        phone: randomPhone,
        password: 'Password123!',
        emailVerified: true
      });

    if (resRegister.status === 201 && resRegister.body.success === true) {
      const { tenantId, tenantCode } = resRegister.body;
      if (tenantId && tenantCode) {
        results['onboarding_response_alignment'] = 'PASS';
        console.log(`  ✅ Onboarding register returned tenantId: ${tenantId} and tenantCode: ${tenantCode}`);
        
        // Clean up registered tenant/user
        const { data: userProfile } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', randomEmail)
          .single();

        if (userProfile) {
          await supabaseAdmin.from('users').delete().eq('id', userProfile.id);
          await supabaseAdmin.auth.admin.deleteUser(userProfile.id);
        }
        await supabaseAdmin.from('tenants').delete().eq('id', tenantId);
      } else {
        results['onboarding_response_alignment'] = 'FAIL (Missing fields)';
        console.log('  ❌ Onboarding response missing tenantId or tenantCode:', resRegister.body);
      }
    } else {
      results['onboarding_response_alignment'] = 'FAIL';
      console.log('  ❌ Onboarding registration failed. Status:', resRegister.status, resRegister.body);
    }

    // ----------------------------------------------------
    // Cleanup Verification Records
    // ----------------------------------------------------
    console.log('\nCleaning up verification records...');
    await supabaseAdmin.from('tenants').delete().eq('id', tempTenantId);
    await supabaseAdmin.from('devices').delete().in('id', [
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003'
    ]);
    console.log('Done.');

  } catch (error: any) {
    console.error('\nVerification encountered unexpected error:', error.message);
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

  // We write the result to a JSON file so that our main agent can parse it and compile the report
  const fs = require('fs');
  fs.writeFileSync('C:/Users/IIPS/.gemini/antigravity/brain/f6abfa43-41a3-4b4e-8428-774175a2199e/scratch/verify_hardening_results.json', JSON.stringify({ results, overallPass }, null, 2));

  // Exit process to clear any pending timers or timeouts (like the one in app.ts)
  process.exit(overallPass ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
