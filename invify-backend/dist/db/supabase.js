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
exports.supabaseAdmin = exports.supabase = void 0;
// src/db/supabase.ts
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const build_variant_1 = require("../config/build-variant");
const { url: supabaseUrl, key: supabaseKey, serviceRoleKey } = build_variant_1.BuildVariantService.getInstance().getSupabaseConfig();
if (!supabaseUrl || !supabaseKey) {
    console.warn('[Supabase] Missing credentials for active build variant');
}
else {
    console.log(`[Supabase] Active environment target URL: ${supabaseUrl}`);
}
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl || '', supabaseKey || '');
exports.supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl || '', serviceRoleKey || supabaseKey || '', {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});
//# sourceMappingURL=supabase.js.map