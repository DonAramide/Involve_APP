import { supabaseAdmin } from '../src/db/supabase';

async function run() {
  console.log('--- SEEDING PRODUCTION-GRADE M7 INCENTIVE SCHEMAS ---');

  // 1. Fetch active program version to link rules
  const { data: versions, error: verErr } = await supabaseAdmin
    .from('commission_plan_versions')
    .select('id, program_id')
    .eq('status', 'ACTIVE')
    .limit(1);

  if (verErr || !versions || versions.length === 0) {
    console.error('No active plan version found! Please activate a plan version first.', verErr);
    return;
  }

  const activeVersionId = versions[0].id;
  console.log(`Active plan version found: ${activeVersionId}`);

  // 2. Define production-grade merchant categories
  const categoriesToSeed = [
    { name: 'Standard Retail', description: 'General retail shops and supermarkets' },
    { name: 'Agency Banking & POS', description: 'Financial services agents and POS merchants' },
    { name: 'Logistics & Transport', description: 'Delivery, transport, and taxi operators' },
    { name: 'Utilities & Government Payments', description: 'Power grid distributors, water utilities, and government levies' },
    { name: 'Education & School Fees', description: 'Schools, colleges, and educational service institutions' },
    { name: 'Health & Medical Services', description: 'Hospitals, clinics, and pharmaceutical retailers' },
    { name: 'Entertainment & Hospitality', description: 'Hotels, cinemas, restaurants, and bars' }
  ];

  console.log('Fetching existing Merchant Categories...');
  const { data: existingCategories, error: getCatErr } = await supabaseAdmin
    .from('merchant_categories')
    .select('id, name');

  if (getCatErr) {
    console.error('Failed to fetch existing categories:', getCatErr.message);
    return;
  }

  const seededCategories = [...(existingCategories || [])];

  for (const cat of categoriesToSeed) {
    const found = seededCategories.find(c => c.name.toLowerCase() === cat.name.toLowerCase());
    if (found) {
      console.log(`Category already exists: ${found.name} (${found.id})`);
    } else {
      const { data, error } = await supabaseAdmin
        .from('merchant_categories')
        .insert({ name: cat.name, description: cat.description })
        .select()
        .single();

      if (error) {
        console.error(`Failed to insert category ${cat.name}:`, error.message);
      } else {
        console.log(`Inserted category: ${data.name} (${data.id})`);
        seededCategories.push(data);
      }
    }
  }

  // 3. Define and seed Category Exception Rules
  console.log('Upserting Category-Specific Exception Rules...');
  const categoryRules = [
    {
      category_name: 'Standard Retail',
      tenant_onboarding_bonus: 5000,
      tenant_activation_bonus: 10000,
      card_rev_share_pct: 10.00,
      transfer_rev_share_pct: 8.00,
      ussd_rev_share_pct: 12.00,
      va_rev_share_pct: 5.00,
      bill_rev_share_pct: 10.00
    },
    {
      category_name: 'Agency Banking & POS',
      tenant_onboarding_bonus: 8000,
      tenant_activation_bonus: 12000,
      card_rev_share_pct: 12.00,
      transfer_rev_share_pct: 8.00,
      ussd_rev_share_pct: 15.00,
      va_rev_share_pct: 6.00,
      bill_rev_share_pct: 8.00
    },
    {
      category_name: 'Education & School Fees',
      tenant_onboarding_bonus: 10000,
      tenant_activation_bonus: 25000,
      card_rev_share_pct: 15.00,
      transfer_rev_share_pct: 10.00,
      ussd_rev_share_pct: 15.00,
      va_rev_share_pct: 8.00,
      bill_rev_share_pct: 12.00
    },
    {
      category_name: 'Logistics & Transport',
      tenant_onboarding_bonus: 6000,
      tenant_activation_bonus: 12000,
      card_rev_share_pct: 11.50,
      transfer_rev_share_pct: 9.00,
      ussd_rev_share_pct: 12.00,
      va_rev_share_pct: 7.00,
      bill_rev_share_pct: 10.00
    }
  ];

  for (const rule of categoryRules) {
    const matchedCategory = seededCategories.find(c => c.name.toLowerCase() === rule.category_name.toLowerCase());
    if (!matchedCategory) {
      console.warn(`Category not found in seeded list: ${rule.category_name}`);
      continue;
    }

    const { data: existing } = await supabaseAdmin
      .from('merchant_category_commission_rules')
      .select('id')
      .eq('plan_version_id', activeVersionId)
      .eq('category_id', matchedCategory.id)
      .limit(1)
      .maybeSingle();

    const payload = {
      plan_version_id: activeVersionId,
      category_id: matchedCategory.id,
      tenant_onboarding_bonus: rule.tenant_onboarding_bonus,
      tenant_activation_bonus: rule.tenant_activation_bonus,
      card_rev_share_pct: rule.card_rev_share_pct,
      transfer_rev_share_pct: rule.transfer_rev_share_pct,
      ussd_rev_share_pct: rule.ussd_rev_share_pct,
      va_rev_share_pct: rule.va_rev_share_pct,
      bill_rev_share_pct: rule.bill_rev_share_pct
    };

    if (existing) {
      const { error } = await supabaseAdmin
        .from('merchant_category_commission_rules')
        .update(payload)
        .eq('id', existing.id);
      if (error) console.error(`Error updating rule for ${rule.category_name}:`, error.message);
      else console.log(`Updated rule for ${rule.category_name}`);
    } else {
      const { error } = await supabaseAdmin
        .from('merchant_category_commission_rules')
        .insert(payload);
      if (error) console.error(`Error inserting rule for ${rule.category_name}:`, error.message);
      else console.log(`Created rule for ${rule.category_name}`);
    }
  }

  // 4. Define and seed Performance Target Rules
  console.log('Upserting Performance Target Rules...');
  const performanceTiers = [
    { tier_level: 2, tenant_threshold: 5, bonus_amount: 15000, card_rev_share_pct: 12.00, validity_days: 30 },
    { tier_level: 3, tenant_threshold: 10, bonus_amount: 35000, card_rev_share_pct: 14.00, validity_days: 30 },
    { tier_level: 4, tenant_threshold: 20, bonus_amount: 80000, card_rev_share_pct: 16.00, validity_days: 30 }
  ];

  for (const pt of performanceTiers) {
    const { data: existing } = await supabaseAdmin
      .from('performance_target_rules')
      .select('id')
      .eq('plan_version_id', activeVersionId)
      .eq('tier_level', pt.tier_level)
      .limit(1)
      .maybeSingle();

    const payload = {
      plan_version_id: activeVersionId,
      tier_level: pt.tier_level,
      tenant_threshold: pt.tenant_threshold,
      bonus_amount: pt.bonus_amount,
      card_rev_share_pct: pt.card_rev_share_pct,
      validity_days: pt.validity_days
    };

    if (existing) {
      const { error } = await supabaseAdmin
        .from('performance_target_rules')
        .update(payload)
        .eq('id', existing.id);
      if (error) console.error(`Error updating performance tier ${pt.tier_level}:`, error.message);
      else console.log(`Updated performance tier ${pt.tier_level}`);
    } else {
      const { error } = await supabaseAdmin
        .from('performance_target_rules')
        .insert(payload);
      if (error) console.error(`Error inserting performance tier ${pt.tier_level}:`, error.message);
      else console.log(`Created performance tier ${pt.tier_level}`);
    }
  }

  // 5. Define and seed Terminal Target Rules
  console.log('Upserting Terminal Target Rules...');
  const terminalTargets = [
    { frequency: 'MONTHLY', terminal_target: 3, reward_type: 'CASH_BONUS', reward_value: 20000 },
    { frequency: 'MONTHLY', terminal_target: 5, reward_type: 'CASH_BONUS', reward_value: 40000 },
    { frequency: 'MONTHLY', terminal_target: 10, reward_type: 'CASH_BONUS', reward_value: 100000 }
  ];

  for (const tt of terminalTargets) {
    const { data: existing } = await supabaseAdmin
      .from('terminal_target_rules')
      .select('id')
      .eq('frequency', tt.frequency)
      .eq('terminal_target', tt.terminal_target)
      .limit(1)
      .maybeSingle();

    const payload = {
      frequency: tt.frequency,
      terminal_target: tt.terminal_target,
      reward_type: tt.reward_type,
      reward_value: tt.reward_value
    };

    if (existing) {
      const { error } = await supabaseAdmin
        .from('terminal_target_rules')
        .update(payload)
        .eq('id', existing.id);
      if (error) console.error(`Error updating terminal target ${tt.terminal_target}:`, error.message);
      else console.log(`Updated terminal target ${tt.terminal_target}`);
    } else {
      const { error } = await supabaseAdmin
        .from('terminal_target_rules')
        .insert(payload);
      if (error) console.error(`Error inserting terminal target ${tt.terminal_target}:`, error.message);
      else console.log(`Created terminal target ${tt.terminal_target}`);
    }
  }

  console.log('--- PRODUCTION SEEDING COMPLETED ---');
}

run().catch(console.error);
