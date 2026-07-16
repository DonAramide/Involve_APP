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
// src/list_users.ts
const supabase_1 = require("./db/supabase");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function run() {
    console.log('Fetching users and tenants...');
    // 1. Fetch existing tenants to get a valid tenant_id
    let tenants = null;
    try {
        const res = await supabase_1.supabase.from('tenants').select('*');
        tenants = res.data;
        if (res.error) {
            console.error('Error fetching tenants:', res.error.message);
            return;
        }
    }
    catch (err) {
        console.error('Tenant fetch threw error:', err.message);
        return;
    }
    console.log(`Found ${tenants?.length || 0} tenants:`);
    for (const t of tenants || []) {
        console.log(`- Tenant ID: ${t.id}, Name: ${t.name || t.school_name}`);
    }
    let targetTenantId = tenants && tenants.length > 0 ? tenants[0].id : null;
    console.log('Fetching users from Supabase Auth...');
    let users = [];
    try {
        const res = await supabase_1.supabase.auth.admin.listUsers();
        if (res.error) {
            console.error('Error fetching users:', res.error.message);
            return;
        }
        users = res.data.users;
    }
    catch (err) {
        console.error('User list threw error:', err.message);
        return;
    }
    console.log(`Found ${users.length} users in Auth.`);
    // Case-insensitive search
    const superadminEmail = 'superadmin@IIPS.app';
    const superadminPass = 'AdminPass123!';
    const existingAdmin = users.find((u) => u.email?.toLowerCase() === superadminEmail.toLowerCase());
    if (existingAdmin) {
        console.log(`User found with email '${existingAdmin.email}'. Updating password & public profile...`);
        // Explicitly update password
        try {
            const { error: updateError } = await supabase_1.supabase.auth.admin.updateUserById(existingAdmin.id, {
                password: superadminPass
            });
            if (updateError) {
                console.error(`Failed to update password for ${existingAdmin.email}:`, updateError.message);
            }
            else {
                console.log(`Password updated successfully for ${existingAdmin.email}!`);
            }
        }
        catch (err) {
            console.error('Auth password update threw error:', err.message);
        }
        // Seed/Update public profile
        try {
            const { data: profile, error: fetchProfileError } = await supabase_1.supabase
                .from('users')
                .select('*')
                .eq('id', existingAdmin.id);
            if (fetchProfileError) {
                console.error('Error checking public profile:', fetchProfileError.message);
                return;
            }
            const hasProfile = profile && profile.length > 0;
            if (!hasProfile) {
                console.log('Missing public profile. Inserting with tenant_id and name:', targetTenantId);
                const { error: dbError } = await supabase_1.supabase
                    .from('users')
                    .insert({
                    id: existingAdmin.id,
                    email: existingAdmin.email,
                    name: 'Super Admin',
                    role: 'SUPER_ADMIN',
                    tenant_id: targetTenantId,
                    require_password_reset: false
                });
                if (dbError) {
                    console.error('Failed to seed public profile:', dbError.message);
                }
                else {
                    console.log('Seeded public profile successfully!');
                }
            }
            else {
                console.log('Public profile exists, updating role and flags...');
                const { error: updateDbError } = await supabase_1.supabase
                    .from('users')
                    .update({
                    name: 'Super Admin',
                    role: 'SUPER_ADMIN',
                    require_password_reset: false
                })
                    .eq('id', existingAdmin.id);
                if (updateDbError) {
                    console.error('Failed to update public profile:', updateDbError.message);
                }
                else {
                    console.log('Updated public profile successfully!');
                }
            }
        }
        catch (err) {
            console.error('Profile DB operations threw error:', err.message);
        }
    }
    else {
        console.log(`User ${superadminEmail} does not exist in Auth. Creating...`);
        try {
            const { data: newAdmin, error: createError } = await supabase_1.supabase.auth.admin.createUser({
                email: superadminEmail.toLowerCase(),
                password: superadminPass,
                email_confirm: true
            });
            if (createError) {
                console.error(`Failed to create ${superadminEmail}:`, createError.message);
                return;
            }
            console.log(`Created ${superadminEmail} in Auth! User ID:`, newAdmin.user.id);
            const { error: dbError } = await supabase_1.supabase
                .from('users')
                .insert({
                id: newAdmin.user.id,
                email: superadminEmail.toLowerCase(),
                name: 'Super Admin',
                role: 'SUPER_ADMIN',
                tenant_id: targetTenantId,
                require_password_reset: false
            });
            if (dbError) {
                console.error('Failed to seed public profile:', dbError.message);
            }
            else {
                console.log('Seeded public profile successfully!');
            }
        }
        catch (err) {
            console.error('User creation or public seeding threw error:', err.message);
        }
    }
}
run().catch(err => console.error(err));
//# sourceMappingURL=list_users.js.map