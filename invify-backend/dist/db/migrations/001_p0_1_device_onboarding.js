"use strict";
/**
 * P0-1 Migration: Device Onboarding Schema
 *
 * Adds:
 * - tenants.tenant_code (UNIQUE VARCHAR(20))
 * - tenants: agent_code, location, phone, owner_email, owner_name, support fields, settings
 * - devices: device_category, device_role, status, device_suffix, device_info, theme_color, inventory_record_id
 * - Indexes on frequently queried columns
 *
 * Run: npx ts-node src/db/migrations/001_p0_1_device_onboarding.ts
 */
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
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rpcjelhacmkhzguljdgi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_SERVICE_KEY);
async function runMigration() {
    console.log('[Migration] P0-1 Device Onboarding Schema — Starting...');
    console.log(`[Migration] Target: ${SUPABASE_URL}`);
    // Since we can't run raw SQL directly via PostgREST, we use a probe-and-insert approach.
    // We test each column by attempting to read it; if it fails, we know the column is missing.
    // For actual DDL, we rely on the Supabase Dashboard SQL Editor.
    // This script validates the schema state and outputs the SQL commands needed.
    const requiredTenantColumns = [
        'tenant_code', 'agent_code', 'location', 'phone', 'owner_email', 'owner_name',
        'support_phone', 'support_email', 'support_whatsapp',
        'emergency_lock_code', 'is_emergency_locked', 'settings'
    ];
    const requiredDeviceColumns = [
        'device_category', 'device_role', 'status', 'device_suffix',
        'device_info', 'theme_color', 'inventory_record_id'
    ];
    // Validate tenants columns
    console.log('\n[Migration] Checking tenants table columns...');
    const { data: tenantSample } = await supabase.from('tenants').select('*').limit(0);
    const tenantSampleKeys = tenantSample && tenantSample.length > 0 ? Object.keys(tenantSample[0]) : [];
    // Try to select each column individually to check existence
    const missingTenantCols = [];
    for (const col of requiredTenantColumns) {
        try {
            const { error } = await supabase.from('tenants').select(col).limit(0);
            if (error) {
                missingTenantCols.push(col);
                console.log(`  ❌ tenants.${col} — MISSING`);
            }
            else {
                console.log(`  ✅ tenants.${col} — EXISTS`);
            }
        }
        catch {
            missingTenantCols.push(col);
            console.log(`  ❌ tenants.${col} — MISSING`);
        }
    }
    // Validate devices columns
    console.log('\n[Migration] Checking devices table columns...');
    const missingDeviceCols = [];
    for (const col of requiredDeviceColumns) {
        try {
            const { error } = await supabase.from('devices').select(col).limit(0);
            if (error) {
                missingDeviceCols.push(col);
                console.log(`  ❌ devices.${col} — MISSING`);
            }
            else {
                console.log(`  ✅ devices.${col} — EXISTS`);
            }
        }
        catch {
            missingDeviceCols.push(col);
            console.log(`  ❌ devices.${col} — MISSING`);
        }
    }
    // Output SQL for missing columns
    if (missingTenantCols.length > 0 || missingDeviceCols.length > 0) {
        console.log('\n' + '='.repeat(70));
        console.log('[Migration] SQL REQUIRED — Run the following in Supabase SQL Editor:');
        console.log('='.repeat(70) + '\n');
        const columnDefs = {
            // Tenants
            'tenant_code': 'VARCHAR(20) UNIQUE',
            'agent_code': 'VARCHAR(20)',
            'location': 'TEXT',
            'phone': 'TEXT',
            'owner_email': 'TEXT',
            'owner_name': 'TEXT',
            'support_phone': 'TEXT',
            'support_email': 'TEXT',
            'support_whatsapp': 'TEXT',
            'emergency_lock_code': 'TEXT',
            'is_emergency_locked': 'BOOLEAN DEFAULT FALSE',
            'settings': 'JSONB',
            // Devices
            'device_category': "VARCHAR(20) DEFAULT 'USER_DEVICE'",
            'device_role': "VARCHAR(20) DEFAULT 'PHONE'",
            'status': "VARCHAR(20) DEFAULT 'active'",
            'device_suffix': 'VARCHAR(20)',
            'device_info': 'JSONB',
            'theme_color': 'VARCHAR(20)',
            'inventory_record_id': 'UUID',
        };
        for (const col of missingTenantCols) {
            console.log(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ${col} ${columnDefs[col]};`);
        }
        for (const col of missingDeviceCols) {
            console.log(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS ${col} ${columnDefs[col]};`);
        }
        console.log('\n-- Indexes');
        console.log('CREATE INDEX IF NOT EXISTS idx_tenants_tenant_code ON tenants(tenant_code);');
        console.log('CREATE INDEX IF NOT EXISTS idx_tenants_agent_code ON tenants(agent_code);');
        console.log('CREATE INDEX IF NOT EXISTS idx_tenants_phone ON tenants(phone);');
        console.log('CREATE INDEX IF NOT EXISTS idx_devices_category ON devices(device_category);');
        console.log('CREATE INDEX IF NOT EXISTS idx_devices_inventory_record ON devices(inventory_record_id);');
        console.log('\n' + '='.repeat(70));
        console.log('[Migration] Copy the SQL above and run it in the Supabase SQL Editor.');
        console.log('='.repeat(70));
    }
    else {
        console.log('\n✅ All required columns already exist. Schema is up to date.');
    }
}
runMigration().then(() => {
    console.log('\n[Migration] Done.');
    process.exit(0);
}).catch(err => {
    console.error('[Migration] Fatal error:', err);
    process.exit(1);
});
//# sourceMappingURL=001_p0_1_device_onboarding.js.map