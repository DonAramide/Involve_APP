"use strict";
/**
 * P0-4 Migration: Terminal Inventory Schema Validation
 *
 * Validates existence of:
 * - terminal_inventory new columns: printer_mac_address, printer_model, merchant_id, bank_name
 *
 * Run: npx ts-node src/db/migrations/004_p0_4_terminal_inventory.ts
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
    console.log('[Migration] P0-4 Terminal Inventory Schema — Starting...');
    console.log(`[Migration] Target: ${SUPABASE_URL}`);
    const requiredColumns = [
        'printer_mac_address', 'printer_model', 'merchant_id', 'bank_name'
    ];
    console.log('\n[Migration] Checking terminal_inventory table columns...');
    try {
        const { error } = await supabase.from('terminal_inventory').select(requiredColumns.join(',')).limit(0);
        if (error) {
            console.log('❌ terminal_inventory new columns are MISSING. Details:', error.message);
            printSQLInstructions();
        }
        else {
            console.log('✅ terminal_inventory table columns exist.');
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
ALTER TABLE public.terminal_inventory 
  ADD COLUMN IF NOT EXISTS printer_mac_address VARCHAR(50),
  ADD COLUMN IF NOT EXISTS printer_model       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS merchant_id         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_name           VARCHAR(100);
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
//# sourceMappingURL=004_p0_4_terminal_inventory.js.map