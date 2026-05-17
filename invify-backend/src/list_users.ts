// src/list_users.ts
import { supabase } from './db/supabase';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log('Fetching users and tenants...');
  
  // 1. Fetch existing tenants to get a valid tenant_id
  let tenants: any[] | null = null;
  try {
    const res = await supabase.from('tenants').select('*');
    tenants = res.data;
    if (res.error) {
      console.error('Error fetching tenants:', res.error.message);
      return;
    }
  } catch (err: any) {
    console.error('Tenant fetch threw error:', err.message);
    return;
  }

  console.log(`Found ${tenants?.length || 0} tenants:`);
  for (const t of tenants || []) {
    console.log(`- Tenant ID: ${t.id}, Name: ${t.name || t.school_name}`);
  }

  let targetTenantId = tenants && tenants.length > 0 ? tenants[0].id : null;

  console.log('Fetching users from Supabase Auth...');
  let users: any[] = [];
  try {
    const res = await supabase.auth.admin.listUsers();
    if (res.error) {
      console.error('Error fetching users:', res.error.message);
      return;
    }
    users = res.data.users;
  } catch (err: any) {
    console.error('User list threw error:', err.message);
    return;
  }

  console.log(`Found ${users.length} users in Auth.`);
  
  // Case-insensitive search
  const superadminEmail = 'superadmin@IIPS.app';
  const superadminPass = 'AdminPass123!';
  const existingAdmin = users.find((u: any) => u.email?.toLowerCase() === superadminEmail.toLowerCase());

  if (existingAdmin) {
    console.log(`User found with email '${existingAdmin.email}'. Updating password & public profile...`);
    
    // Explicitly update password
    try {
      const { error: updateError } = await supabase.auth.admin.updateUserById(existingAdmin.id, {
        password: superadminPass
      });

      if (updateError) {
        console.error(`Failed to update password for ${existingAdmin.email}:`, updateError.message);
      } else {
        console.log(`Password updated successfully for ${existingAdmin.email}!`);
      }
    } catch (err: any) {
      console.error('Auth password update threw error:', err.message);
    }

    // Seed/Update public profile
    try {
      const { data: profile, error: fetchProfileError } = await supabase
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
        const { error: dbError } = await supabase
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
        } else {
          console.log('Seeded public profile successfully!');
        }
      } else {
        console.log('Public profile exists, updating role and flags...');
        const { error: updateDbError } = await supabase
          .from('users')
          .update({
            name: 'Super Admin',
            role: 'SUPER_ADMIN',
            require_password_reset: false
          })
          .eq('id', existingAdmin.id);

        if (updateDbError) {
          console.error('Failed to update public profile:', updateDbError.message);
        } else {
          console.log('Updated public profile successfully!');
        }
      }
    } catch (err: any) {
      console.error('Profile DB operations threw error:', err.message);
    }
  } else {
    console.log(`User ${superadminEmail} does not exist in Auth. Creating...`);
    try {
      const { data: newAdmin, error: createError } = await supabase.auth.admin.createUser({
        email: superadminEmail.toLowerCase(),
        password: superadminPass,
        email_confirm: true
      });

      if (createError) {
        console.error(`Failed to create ${superadminEmail}:`, createError.message);
        return;
      }

      console.log(`Created ${superadminEmail} in Auth! User ID:`, newAdmin.user.id);
      
      const { error: dbError } = await supabase
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
      } else {
        console.log('Seeded public profile successfully!');
      }
    } catch (err: any) {
      console.error('User creation or public seeding threw error:', err.message);
    }
  }
}

run().catch(err => console.error(err));
