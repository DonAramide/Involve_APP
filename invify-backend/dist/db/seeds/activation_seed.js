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
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || '', process.env.SUPABASE_KEY || '');
async function seed() {
    console.log('Starting M1-M6 Activation Seed...');
    // M1
    const tenantRes = await supabase.from('tenants').upsert({
        id: '11111111-1111-1111-1111-111111111112',
        name: 'Default Tenant',
        type: 'school'
    });
    if (tenantRes.error)
        console.error('Tenant Error:', tenantRes.error);
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: 'agent@invify.io',
        password: 'password123',
        email_confirm: true
    });
    if (authError && !authError.message.includes('already exists')) {
        console.error('Auth Error:', authError);
    }
    const authUserId = authData?.user?.id || '11111111-1111-1111-1111-111111111111';
    const agentRes = await supabase.from('agents').upsert({
        id: '11111111-1111-1111-1111-111111111111',
        email: 'agent@invify.io',
        auth_user_id: authUserId,
        agent_code: 'AG-1000',
        first_name: 'Alpha',
        last_name: 'Agent',
        phone: '08000000000'
    }).select().single();
    if (agentRes.error)
        console.error(agentRes.error);
    await supabase.from('agent_profiles').insert({
        agent_id: '11111111-1111-1111-1111-111111111111',
        address: '123 Main St',
        city: 'Lagos',
        state: 'Lagos'
    });
    // M2
    await supabase.from('agent_leads').insert([
        {
            agent_id: '11111111-1111-1111-1111-111111111111',
            business_name: 'SuperMart',
            contact_person: 'John Doe',
            phone: '08111111111',
            email: 'john@supermart.com',
            status: 'new'
        },
        {
            agent_id: '11111111-1111-1111-1111-111111111111',
            business_name: 'Fast Food Co',
            contact_person: 'Jane Smith',
            phone: '08222222222',
            email: 'jane@fastfood.com',
            status: 'contacted'
        }
    ]);
    // M3
    await supabase.from('agent_wallets').insert({
        agent_id: '11111111-1111-1111-1111-111111111111',
        balance: 50000,
        currency: 'NGN'
    });
    await supabase.from('wallet_ledger').insert([
        {
            agent_id: '11111111-1111-1111-1111-111111111111',
            amount: 50000,
            type: 'credit',
            reference: 'SEED-INITIAL-DEP',
            description: 'Initial Seed Balance'
        }
    ]);
    // M4
    await supabase.from('training_courses').insert([
        { id: 'crs-1', title: 'POS Operations 101', description: 'Learn the basics', module: 'M4' },
        { id: 'crs-2', title: 'Agent Ethics', description: 'Compliance rules', module: 'M4' }
    ]);
    // M5
    await supabase.from('agent_reputations').insert({
        agent_id: 'ag-seed-1',
        score: 85,
        tier: 'Silver'
    });
    await supabase.from('achievement_rules').insert({
        id: 'ach-1',
        name: 'First 10 Leads',
        metric_name: 'total_leads',
        target_value: 10,
        points_reward: 50
    });
    // M6
    await supabase.from('executive_kpi_snapshots').insert({
        period: '2026-06',
        total_revenue: 1000000,
        total_active_tenants: 45,
        active_agents: 12
    });
    console.log('Seed execution completed.');
}
seed().catch(console.error);
//# sourceMappingURL=activation_seed.js.map