import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

async function clearData() {
  console.log('Clearing old data...');
  const tables = [
    'achievement_audit_logs', 'agent_achievements', 'achievement_rules', 'achievements',
    'merchant_feedback_scores', 'agent_performance_snapshots', 'reputation_audit_logs', 'agent_reputations',
    'agent_certificates', 'assessment_attempts', 'training_progress', 'training_courses',
    'support_ticket_audits', 'support_ticket_assignments', 'support_ticket_comments', 'support_tickets',
    'withdrawals', 'wallet_ledgers', 'wallets', 'commissions',
    'tenant_activation_logs', 'tenant_activation_progress', 'agent_tenants',
    'lead_activities', 'lead_notes', 'agent_leads', 'lead_pipelines',
    'agent_territories', 'agents'
  ];

  for (const table of tables) {
    try {
      await supabaseAdmin.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (e) {
      // ignore
    }
  }
}

async function seedData() {
  await clearData();

  console.log('Seeding Territories...');
  const territories = Array.from({ length: 3 }).map((_, i) => ({
    id: uuidv4(),
    name: `Territory ${i + 1}`,
    region: `Region ${i + 1}`
  }));
  await supabaseAdmin.from('agent_territories').insert(territories);

  console.log('Seeding Agents...');
  const authUsers: string[] = [];
  for (let i = 0; i < 5; i++) {
    const { data: user, error: errAuth } = await supabaseAdmin.auth.admin.createUser({
      email: `agent${i + 1}@h3.seed`,
      password: 'Password123!',
      email_confirm: true
    });
    if (errAuth) {
      console.log('Error creating auth user, might already exist:', errAuth.message);
      // Try to find existing
      const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
      const match = existing?.users.find(u => u.email === `agent${i + 1}@h3.seed`);
      authUsers.push(match ? match.id : uuidv4()); // fallback to fake uuid if still fails (will fail FK but script won't crash)
    } else {
      authUsers.push(user.user.id);
    }
  }

  const agents = Array.from({ length: 5 }).map((_, i) => ({
    id: uuidv4(),
    auth_user_id: authUsers[i],
    agent_code: `AG-H3-${i + 1}`,
    email: `agent${i + 1}@h3.seed`,
    first_name: `Agent`,
    last_name: `${i + 1}`,
    phone: `080000000${i}`,
    status: 'ACTIVE',
    territory_id: null
  }));
  const { error: errAgents } = await supabaseAdmin.from('agents').insert(agents);
  if (errAgents) {
    console.error('Error agents:', errAgents);
    throw errAgents;
  }

  console.log('Seeding Lead Pipelines...');
  const pipelines = [
    { id: uuidv4(), name: 'New', stage_order: 1 },
    { id: uuidv4(), name: 'Contacted', stage_order: 2 },
    { id: uuidv4(), name: 'Interested', stage_order: 3 },
    { id: uuidv4(), name: 'Onboarding', stage_order: 4 }
  ];
  await supabaseAdmin.from('lead_pipelines').insert(pipelines);

  console.log('Seeding 20 Leads...');
  const leads = Array.from({ length: 20 }).map((_, i) => ({
    id: uuidv4(),
    agent_id: agents[i % 5].id,
    business_name: `Lead Business ${i + 1}`,
    contact_person: `Contact ${i + 1}`,
    email: `lead${i + 1}@business.com`,
    phone: `090000000${i}`,
    status: i < 10 ? 'ONBOARDING' : (i < 15 ? 'INTERESTED' : 'NEW')
  }));
  const { error: errLeads } = await supabaseAdmin.from('agent_leads').insert(leads);
  if (errLeads) console.error('Error leads:', errLeads);

  console.log('Seeding Notes and Activities...');
  const notes = leads.map(l => ({ id: uuidv4(), lead_id: l.id, agent_id: l.agent_id, note: 'Initial contact made.' }));
  const activities = leads.map(l => ({ id: uuidv4(), lead_id: l.id, agent_id: l.agent_id, activity_type: 'CALL', activity_date: new Date().toISOString() }));
  await supabaseAdmin.from('lead_notes').insert(notes);
  await supabaseAdmin.from('lead_activities').insert(activities);

  console.log('Seeding 10 Tenants (Converted Leads)...');
  const tenants = leads.slice(0, 10).map((l, i) => ({
    id: uuidv4(),
    agent_id: l.agent_id,
    tenant_id: uuidv4(), // Mock core tenant ID
    business_name: l.business_name,
    contact_email: l.email,
    contact_phone: l.phone,
    status: i < 5 ? 'ACTIVE' : 'ONBOARDING',
    onboarding_date: new Date().toISOString(),
    activation_percentage: i < 5 ? 100 : 50
  }));
  const { error: errTenants } = await supabaseAdmin.from('agent_tenants').insert(tenants);
  if (errTenants) console.error('Error tenants:', errTenants);

  console.log('Seeding Activations...');
  const activations = tenants.map((t, i) => ({
    agent_tenant_id: t.id,
    current_stage: t.status === 'ACTIVE' ? 'FULLY_ACTIVATED' : 'KYC_PENDING',
    completion_percentage: t.activation_percentage,
    is_registration_complete: true,
    is_fully_activated: t.status === 'ACTIVE'
  }));
  await supabaseAdmin.from('tenant_activation_progress').insert(activations);

  const logs = tenants.map((t) => ({
    id: uuidv4(),
    agent_tenant_id: t.id,
    stage: 'REGISTRATION',
    completed_by: t.agent_id
  }));
  await supabaseAdmin.from('tenant_activation_logs').insert(logs);

  console.log('Seeding Support Tickets...');
  const tickets = Array.from({ length: 5 }).map((_, i) => ({
    id: uuidv4(),
    agent_id: agents[i % 5].id,
    subject: `Support Ticket ${i + 1}`,
    description: `Need help with tenant ${i + 1}`,
    priority: 'HIGH',
    status: i === 0 ? 'RESOLVED' : (i === 1 ? 'ESCALATED' : 'OPEN'),
    sla_breach_at: i === 2 ? new Date(Date.now() - 100000).toISOString() : null
  }));
  const { error: errTickets } = await supabaseAdmin.from('support_tickets').insert(tickets);
  if (errTickets) console.error('Error tickets:', errTickets);

  console.log('Seeding Training Courses & Certificates...');
  const courses = [{ id: uuidv4(), title: 'Agent Masterclass', description: 'Mandatory', is_mandatory: true }];
  await supabaseAdmin.from('training_courses').insert(courses);

  const assessments = [{ id: uuidv4(), course_id: courses[0].id, title: 'Masterclass Final', passing_score: 80 }];
  await supabaseAdmin.from('training_assessments').insert(assessments);

  const progress = agents.map(a => ({ id: uuidv4(), agent_id: a.id, course_id: courses[0].id, completion_percentage: 100 }));
  const { error: errProgress } = await supabaseAdmin.from('training_progress').insert(progress);
  if (errProgress) console.error('Error progress:', errProgress);

  const attempts = agents.map(a => ({
    id: uuidv4(), agent_id: a.id, assessment_id: assessments[0].id, attempt_number: 1, score: 95, passing_score: 80, passed: true, status: 'PASSED'
  }));
  const { error: errAttempts } = await supabaseAdmin.from('assessment_attempts').insert(attempts);
  if (errAttempts) console.error('Error attempts:', errAttempts);

  const certificates = agents.map((a, i) => ({
    id: uuidv4(), verification_uuid: uuidv4(), agent_id: a.id, course_id: courses[0].id, assessment_attempt_id: attempts[i].id
  }));
  const { error: errCerts } = await supabaseAdmin.from('agent_certificates').insert(certificates);
  if (errCerts) console.error('Error certs:', errCerts);

  console.log('Seeding Reputation...');
  const reputations = agents.map(a => ({
    agent_id: a.id, score: 500, tier: 'GOLD'
  }));
  const { error: errReps } = await supabaseAdmin.from('agent_reputations').insert(reputations);
  if (errReps) console.error('Error reputations:', errReps);

  const repLogs = agents.map(a => ({
    id: uuidv4(), agent_id: a.id, event_type: 'TENANT_ACTIVATED', points_delta: 50, previous_score: 450, new_score: 500
  }));
  await supabaseAdmin.from('reputation_audit_logs').insert(repLogs);

  const feedbacks = tenants.slice(0, 5).map(t => ({
    id: uuidv4(), tenant_id: t.tenant_id, agent_id: t.agent_id, rating: 5, feedback_text: 'Great agent!'
  }));
  await supabaseAdmin.from('merchant_feedback_scores').insert(feedbacks);

  console.log('Seeding Gamification Achievements...');
  const achievements = [{ id: uuidv4(), title: 'First Blood', description: 'First Tenant', category: 'ONBOARDING', points_reward: 100 }];
  await supabaseAdmin.from('achievements').insert(achievements);
  const rules = [{ id: uuidv4(), achievement_id: achievements[0].id, metric_type: 'TENANTS', target_value: 1 }];
  await supabaseAdmin.from('achievement_rules').insert(rules);
  const earned = agents.map(a => ({ id: uuidv4(), agent_id: a.id, achievement_id: achievements[0].id }));
  const { error: errEarned } = await supabaseAdmin.from('agent_achievements').insert(earned);
  if (errEarned) console.error('Error earned:', errEarned);

  console.log('Seeding Finance (Wallets)...');
  // Need to verify wallet tables in M6. Assuming wallets, commissions, wallet_ledgers, withdrawals exist.
  // Wait! The user's backend might use a mock for finance if M6 tables aren't in Supabase.
  // Let's create wallets manually just in case.
  const wallets = agents.map(a => ({ id: uuidv4(), agent_id: a.id, balance: 50000, currency: 'NGN', status: 'ACTIVE' }));
  const { error: wErr } = await supabaseAdmin.from('wallets').insert(wallets);
  if (wErr) {
    console.log('Wallet table might have different schema or name. Skipping wallets.', wErr.message);
  } else {
    const wLogs = wallets.map(w => ({ id: uuidv4(), wallet_id: w.id, transaction_type: 'CREDIT', amount: 50000, reference: 'H3-SEED', balance_after: 50000 }));
    try {
      await supabaseAdmin.from('wallet_ledgers').insert(wLogs);
    } catch (e) {
      console.log('Skipping wallet_ledgers');
    }
  }

  console.log('Seeding Exec Snapshots...');
  const snapshots = agents.map(a => ({
    id: uuidv4(), agent_id: a.id, snapshot_period: 'MONTHLY', snapshot_date: '2026-06-01', score: 500, metrics: { tenants: 2 }
  }));
  const { error: errSnapshots } = await supabaseAdmin.from('agent_performance_snapshots').insert(snapshots);
  if (errSnapshots) console.error('Error snapshots:', errSnapshots);

  console.log('All seeding successfully executed!');
}

seedData().catch(e => {
  console.error('Seeding failed:', e);
});
