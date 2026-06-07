import { supabaseAdmin } from '../src/db/supabase';

async function seed() {
  console.log('Seeding commission program rules...');
  
  const { data: versions, error: verErr } = await supabaseAdmin
    .from('commission_plan_versions')
    .select('id, version_number');

  if (verErr || !versions) {
    console.error('Error fetching plan versions:', verErr);
    return;
  }

  for (const ver of versions) {
    // Check if rule exists
    const { data: existing, error: existErr } = await supabaseAdmin
      .from('commission_program_rules')
      .select('id')
      .eq('plan_version_id', ver.id)
      .limit(1)
      .maybeSingle();

    if (existErr) {
      console.error(`Error checking rule for version ${ver.id}:`, existErr);
      continue;
    }

    if (!existing) {
      console.log(`Seeding rule for version ${ver.id}...`);
      const { error: insErr } = await supabaseAdmin
        .from('commission_program_rules')
        .insert({
          plan_version_id: ver.id,
          tenant_onboarding_bonus: 5000,
          tenant_activation_bonus: 10000,
          card_rev_share_pct: 10,
          transfer_rev_share_pct: 10,
          ussd_rev_share_pct: 10,
          va_rev_share_pct: 10,
          bill_rev_share_pct: 10
        });

      if (insErr) {
        console.error(`Failed to insert rule for version ${ver.id}:`, insErr.message);
      } else {
        console.log(`✅ Rule seeded for version ${ver.id}`);
      }
    } else {
      console.log(`Rule already exists for version ${ver.id}`);
    }
  }

  // Seed category rules if empty
  const { count: catCount } = await supabaseAdmin
    .from('merchant_category_commission_rules')
    .select('*', { count: 'exact', head: true });

  if (catCount === 0) {
    console.log('Seeding default merchant category overrides...');
    const { data: categories } = await supabaseAdmin
      .from('merchant_categories')
      .select('id, name');

    const { data: activeVersion } = await supabaseAdmin
      .from('commission_plan_versions')
      .select('id')
      .eq('status', 'ACTIVE')
      .limit(1)
      .maybeSingle();

    if (categories && categories.length > 0 && activeVersion) {
      const categoryId = categories[0].id;
      const { error: catErr } = await supabaseAdmin
        .from('merchant_category_commission_rules')
        .insert({
          plan_version_id: activeVersion.id,
          category_id: categoryId,
          tenant_onboarding_bonus: 8000,
          tenant_activation_bonus: 12000,
          card_rev_share_pct: 12,
          transfer_rev_share_pct: 8
        });

      if (catErr) {
        console.error('Failed to seed category rule:', catErr);
      } else {
        console.log('✅ Seeded default merchant category exception override');
      }
    }
  }

  // Seed performance rules if empty
  const { count: perfCount } = await supabaseAdmin
    .from('performance_target_rules')
    .select('*', { count: 'exact', head: true });

  if (perfCount === 0) {
    console.log('Seeding performance target rules...');
    const { data: activeVersion } = await supabaseAdmin
      .from('commission_plan_versions')
      .select('id')
      .eq('status', 'ACTIVE')
      .limit(1)
      .maybeSingle();

    if (activeVersion) {
      const { error: perfErr } = await supabaseAdmin
        .from('performance_target_rules')
        .insert({
          plan_version_id: activeVersion.id,
          tier_level: 2,
          tenant_threshold: 5,
          bonus_amount: 15000,
          card_rev_share_pct: 12,
          validity_days: 30
        });

      if (perfErr) {
        console.error('Failed to seed performance rule:', perfErr);
      } else {
        console.log('✅ Seeded default performance milestone target rule');
      }
    }
  }

  // Seed terminal rules if empty
  const { count: termCount } = await supabaseAdmin
    .from('terminal_target_rules')
    .select('*', { count: 'exact', head: true });

  if (termCount === 0) {
    console.log('Seeding terminal target rules...');
    const { error: termErr } = await supabaseAdmin
      .from('terminal_target_rules')
      .insert({
        frequency: 'MONTHLY',
        terminal_target: 3,
        reward_type: 'CASH_BONUS',
        reward_value: 20000
      });

    if (termErr) {
      console.error('Failed to seed terminal rule:', termErr);
    } else {
      console.log('✅ Seeded default terminal target rule');
    }
  }
}

seed().catch(console.error);
