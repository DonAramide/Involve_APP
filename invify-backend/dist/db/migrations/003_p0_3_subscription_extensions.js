"use strict";
/**
 * P0-3 Migration: Subscription Extensions Schema Validation
 *
 * Validates existence of:
 * - subscription_events table
 * - columns: id, subscription_id, tenant_id, event_type, days_added, performed_by, created_at
 *
 * Run: npx ts-node src/db/migrations/003_p0_3_subscription_extensions.ts
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
    console.log('[Migration] P0-3 Subscription Extensions Schema — Starting...');
    console.log(`[Migration] Target: ${SUPABASE_URL}`);
    const requiredColumns = [
        'id', 'subscription_id', 'tenant_id', 'event_type', 'days_added', 'performed_by', 'created_at'
    ];
    console.log('\n[Migration] Checking subscription_events table...');
    try {
        const { error } = await supabase.from('subscription_events').select(requiredColumns.join(',')).limit(0);
        if (error) {
            console.log('❌ subscription_events table or some columns are MISSING. Details:', error.message);
            printSQLInstructions();
        }
        else {
            console.log('✅ subscription_events table and all required columns exist.');
        }
    }
    catch (err) {
        console.log('❌ Failed to connect or query table. Details:', err.message);
        printSQLInstructions();
    }
}
function printSQLInstructions() {
    console.log('\n' + '='.repeat(70));
    console.log('[Migration] SQL REQUIRED — Run the following in Supabase SQL Editor:');
    console.log('='.repeat(70) + '\n');
    console.log(`
-- Create subscription_events table conforming to P0-3 requirements
CREATE TABLE IF NOT EXISTS public.subscription_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    event_type      VARCHAR(20) NOT NULL, -- 'CREATED', 'EXTENDED', 'UPGRADED', 'DOWNGRADED', 'SUSPENDED', 'EXPIRED'
    days_added      INTEGER DEFAULT 0,
    performed_by    TEXT NOT NULL, -- Email of the operator/admin
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and add policy
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.subscription_events FOR ALL TO service_role USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_events_sub ON public.subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_tenant ON public.subscription_events(tenant_id);
  `);
    console.log('='.repeat(70));
}
runMigration().then(() => {
    console.log('\n[Migration] Done.');
    process.exit(0);
}).catch(err => {
    console.error('[Migration] Fatal error:', err);
    process.exit(1);
});
//# sourceMappingURL=003_p0_3_subscription_extensions.js.map