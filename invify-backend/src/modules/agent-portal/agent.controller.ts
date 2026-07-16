import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { io } from '../../app';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { supabase } from '../../db/supabase';

import { agentRepository } from './repositories/agent.repository';

const s3Client = new S3Client({
  endpoint: process.env.CONTABO_ENDPOINT || '',
  region: process.env.CONTABO_REGION || 'usc1',
  credentials: {
    accessKeyId: process.env.CONTABO_ACCESS_KEY || '',
    secretAccessKey: process.env.CONTABO_SECRET_KEY || ''
  },
  forcePathStyle: true
});

async function uploadBase64ToContabo(base64Data: string, prefix: string, fileName: string): Promise<string> {
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    if (base64Data.startsWith('http')) return base64Data;
    throw new Error('Invalid file format. Upload requires valid base64 stream.');
  }

  const contentType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  const objectKey = `agents/${prefix}/${fileName}_${Date.now()}.${contentType.split('/')[1] || 'png'}`;
  
  const bucket = process.env.CONTABO_BUCKET;
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    Body: buffer,
    ContentType: contentType,
    ACL: process.env.CONTABO_UPLOAD_PUBLIC_READ === 'true' ? 'public-read' : 'private'
  }));

  let baseUrl = process.env.CONTABO_PUBLIC_BASE_URL;
  if (baseUrl) {
    if (!baseUrl.endsWith('/')) baseUrl += '/';
    return `${baseUrl}${objectKey}`;
  } else {
    let endpointUrl = process.env.CONTABO_ENDPOINT || '';
    if (!endpointUrl.endsWith('/')) endpointUrl += '/';
    const tenantPrefix = '0d205683f3b543beb7298e9b68e26b0f:';
    return `${endpointUrl}${tenantPrefix}${bucket}/${objectKey}`;
  }
}




export interface Agent {
  id: string;
  agentCode: string;
  passwordHash: string;
  isFirstLogin: boolean;
  name: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  address?: string;
  passportImage?: string;
  idCard?: string;
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED';
  commissions: number;
  points: number;
  createdAt: Date;
  commissionSettings?: {
    onboardingFee?: number;
    revSharePercentage?: number;
  };
  suspensionReason?: string;
  requiredAction?: 'NONE' | 'UPLOAD_PASSPORT' | 'UPLOAD_ID' | 'ANSWER_QUESTION';
  actionQuestion?: string;
  actionAnswer?: string;
  territory?: string;
  region?: string;
  operational_area?: string;
}

const defaultMasterAgent: Agent = {
  id: uuidv4(),
  agentCode: 'AAA000',
  passwordHash: 'AAA000',
  isFirstLogin: true,
  name: 'Master Setup Agent',
  email: 'master@invify.app',
  phone: '+2348000000000',
  whatsappNumber: '+2348000000000',
  address: '1 Master Admin Way',
  kycStatus: 'VERIFIED',
  status: 'ACTIVE',
  commissions: 0,
  points: 0,
  createdAt: new Date()
};

// No mock DB fallbacks

export class AgentController {
  
  /**
   * Request password reset for an agent
   */
  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:3000/agent/reset-password',
      });

      if (error) {
        return res.status(400).json({ success: false, message: error.message });
      }

      return res.json({ success: true, message: 'Password reset instructions have been sent to your email.' });
    } catch (err: any) {
      console.error('[AgentForgotPassword] Error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // ==========================================
  // ADMIN ROUTES
  // ==========================================
  
  /**
   * Onboard a new agent (called by Super Admin)
   */
  static async onboardAgent(req: Request, res: Response) {
    try {
      const { agentCode, name, email, phone, whatsappNumber, address, passportImage, idCard } = req.body;
      
      if (!agentCode || !name || !email) {
        return res.status(400).json({ success: false, message: 'Agent code, name, and email are required' });
      }

      const { data: existing } = await supabase.from('agents').select('id').eq('agent_code', agentCode).single();
      if (existing) {
        return res.status(400).json({ success: false, message: 'Agent code already exists' });
      }

      // Create Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: agentCode, // Default password
        email_confirm: true,
        user_metadata: { role: 'AGENT', name }
      });

      if (authError || !authData.user) {
        return res.status(500).json({ success: false, message: 'Failed to create agent authentication record: ' + authError?.message });
      }

      const firstName = name.split(' ')[0] || name;
      const lastName = name.split(' ').slice(1).join(' ') || 'Agent';

      // Insert into agents table
      const { data: agentData, error: dbError } = await supabase.from('agents').insert({
        auth_user_id: authData.user.id,
        agent_code: agentCode,
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        status: 'ACTIVE'
      }).select().single();

      if (dbError || !agentData) {
        return res.status(500).json({ success: false, message: 'Failed to create agent record in database' });
      }

      // Insert into agent_profiles
      await supabase.from('agent_profiles').insert({
        agent_id: agentData.id,
        address: address || '',
        kyc_status: 'PENDING'
      });

      return res.status(201).json({ 
        success: true, 
        message: 'Agent onboarded successfully',
        agent: {
          id: agentData.id,
          agentCode: agentData.agent_code,
          name: `${agentData.first_name} ${agentData.last_name}`
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ==========================================
  // AGENT PORTAL ROUTES
  // ==========================================

  /**
   * Agent Login logic
   */
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }

      // Check Maintenance Mode Global Lockout
      let is_maintenance_locked = false;
      let maintenance_message = 'System is currently under maintenance. Please try again later.';
      
      try {
         const { data, error } = await supabase.from('system_configurations').select('config_key, config_value').in('config_key', ['is_maintenance_locked', 'maintenance_message']);
         if (!error && data && data.length > 0) {
            for (const row of data) {
               if (row.config_key === 'is_maintenance_locked') is_maintenance_locked = row.config_value === true || row.config_value === 'true';
               if (row.config_key === 'maintenance_message') maintenance_message = row.config_value;
            }
         }
      } catch(dbErr) {
         is_maintenance_locked = false;
      }

      if (is_maintenance_locked) {
        return res.status(403).json({
          success: false,
          message: maintenance_message
        });
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError || !authData.session) {
        return res.status(401).json({ success: false, message: 'Invalid agent credentials' });
      }

      const { data: agent, error: agentError } = await supabase.from('agents').select('*').eq('auth_user_id', authData.user.id).single();
      
      if (agentError || !agent) {
        return res.status(403).json({ success: false, message: 'Access forbidden. Agent profile not found.' });
      }

      if (agent.status === 'PENDING') {
        return res.status(403).json({ success: false, message: 'Your account is pending review by Invify Staff. You will be notified once approved.' });
      }

      if (agent.status === 'SUSPENDED') {
        return res.status(403).json({ success: false, message: 'Your account has been suspended.' });
      }

      await supabase.from('agent_sessions').insert({
        agent_id: agent.id,
        token: authData.session.access_token,
        ip_address: req.ip || '',
        browser: req.headers['user-agent'] || '',
        status: 'ACTIVE'
      });

      return res.status(200).json({
        success: true,
        token: authData.session.access_token,
        agent: {
          id: agent.id,
          email: agent.email,
          agentCode: agent.agent_code,
          name: `${agent.first_name} ${agent.last_name}`
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Public Agent Registration
   */
  static async register(req: Request, res: Response) {
    try {
      const { fullName, email, phone, password, whatsappNumber, address, passportImage, idCard, agentCode } = req.body;

      if (!fullName || !email || !password) {
        return res.status(400).json({ success: false, message: 'Full name, email, and password are required' });
      }

      const { data: existing } = await supabase.from('agents').select('id').eq('email', email).single();
      if (existing) {
        return res.status(400).json({ success: false, message: 'An agent with this email already exists' });
      }

      // Generate a temporary code until approved
      const tempCode = `AGT-${Math.floor(1000 + Math.random() * 9000)}`;

      let passportUrl = '';
      let idCardUrl = '';

      // 1. Upload KYC assets to Contabo S3 Storage
      if (passportImage && passportImage.startsWith('data:')) {
        try {
          passportUrl = await uploadBase64ToContabo(passportImage, 'passports', `${email.replace(/[@.]/g, '_')}_passport`);
        } catch (s3Err: any) {
          console.error('[AgentRegister] Passport S3 Upload Error:', s3Err.message);
        }
      }

      if (idCard && idCard.startsWith('data:')) {
        try {
          idCardUrl = await uploadBase64ToContabo(idCard, 'ids', `${email.replace(/[@.]/g, '_')}_id`);
        } catch (s3Err: any) {
          console.error('[AgentRegister] ID Card S3 Upload Error:', s3Err.message);
        }
      }

      // 2. Write to Supabase auth & tables (agents & agent_profiles)
      const hasSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_KEY;
      let supabaseUserId: string | undefined = undefined;
      if (hasSupabase) {
        try {
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
              role: 'AGENT',
              name: fullName
            }
          });

          supabaseUserId = authData?.user?.id;
          if (authError || !supabaseUserId) {
            console.warn('[AgentRegister] Supabase Auth creation warning (using fallback UUID):', authError?.message);
            supabaseUserId = uuidv4();
          }

          const firstName = fullName.split(' ')[0] || fullName;
          const lastName = fullName.split(' ').slice(1).join(' ') || 'Agent';

          const { data: dbAgent, error: dbAgentError } = await supabase
            .from('agents')
            .insert({
              auth_user_id: supabaseUserId,
              agent_code: agentCode || tempCode,
              email: email,
              first_name: firstName,
              last_name: lastName,
              phone: phone,
              status: 'PENDING'
            })
            .select()
            .single();

          if (dbAgentError) {
            console.error('[AgentRegister] Supabase Agents table insert failed:', dbAgentError.message);
          } else if (dbAgent) {
            const { error: profileError } = await supabase
              .from('agent_profiles')
              .insert({
                agent_id: dbAgent.id,
                address: address || '',
                profile_photo_url: passportUrl || '',
                kyc_status: 'PENDING'
              });

            if (profileError) {
              console.error('[AgentRegister] Supabase Agent Profiles table insert failed:', profileError.message);
            }
          }
        } catch (supabaseErr: any) {
          console.error('[AgentRegister] Supabase integration error:', supabaseErr.message);
        }
      }

      return res.status(201).json({ 
        success: true, 
        message: 'Registration successful. Please wait for Invify Staff approval.',
        agent: {
          id: supabaseUserId || tempCode,
          email: email,
          name: fullName
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * First-time password change
   */
  static async changePassword(req: Request, res: Response) {
    try {
      const { agentCode, oldPassword, newPassword } = req.body;

      // Resolve email from agentCode
      const { data: existing } = await supabase.from('agents').select('email').eq('agent_code', agentCode).single();
      if (!existing) return res.status(401).json({ success: false, message: 'Invalid credentials' });

      // Authenticate old password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: existing.email, password: oldPassword });
      if (authError || !authData.session) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        return res.status(500).json({ success: false, message: 'Failed to update password' });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Password changed successfully. You can now log in.',
        token: authData.session.access_token,
        agent: {
          agentCode,
          name: authData.user.user_metadata?.name || 'Agent'
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get agent dashboard stats and onboarded tenants
   */
  /**
   * Get Field Agent Portal Operations Dashboard Data
   */
  /**
   * Get Field Agent Portal Operations Dashboard Data
   */
  static async getDashboard(req: Request, res: Response) {
    try {
      const authUser = (req as any).user;
      if (!authUser || !authUser.id) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // 1. Resolve Agent
      const { data: agent, error } = await supabase.from('agents').select('*').eq('auth_user_id', authUser.id).single();
      
      if (error || !agent) {
        return res.status(403).json({ success: false, message: 'Agent profile not found. Access forbidden.' });
      }

      const agentId = agent.id;

      // 2. Fetch Core Data (Fault Tolerant)
      
      // Tenants
      const { data: tenants } = await supabase.from('agent_tenants').select('*').eq('agent_id', agentId);
      const allTenants = tenants || [];
      const now = new Date();
      
      const thisMonthTenants = allTenants.filter((t: any) => new Date(t.created_at).getMonth() === now.getMonth() && new Date(t.created_at).getFullYear() === now.getFullYear());
      const lastMonth = new Date(); lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthTenants = allTenants.filter((t: any) => new Date(t.created_at).getMonth() === lastMonth.getMonth() && new Date(t.created_at).getFullYear() === lastMonth.getFullYear());
      
      const calcGrowth = (curr: number, prev: number) => {
        if (prev === 0 && curr === 0) return 'Insufficient History';
        if (prev === 0 && curr > 0) return 'New Metric';
        const growth = Math.round(((curr - prev) / prev) * 100);
        return growth > 0 ? `↑ ${growth}% compared to last month` : (growth < 0 ? `↓ ${Math.abs(growth)}% compared to last month` : 'No change');
      };

      // Leads / Pipeline
      let pipeline = {
        prospects: 0,
        contacted: 0,
        kycSubmitted: 0,
        approved: 0,
        activated: 0,
        limitedMode: false
      };

      const { data: leads, error: leadsErr } = await supabase.from('agent_leads').select('*').eq('agent_id', agentId);
      if (leadsErr) {
        pipeline.limitedMode = true;
        pipeline.kycSubmitted = allTenants.filter((t: any) => t.status === 'PENDING').length;
        pipeline.approved = allTenants.filter((t: any) => t.status === 'APPROVED').length;
        pipeline.activated = allTenants.filter((t: any) => t.status === 'ACTIVE').length;
      } else {
        const allLeads = leads || [];
        pipeline.prospects = allLeads.filter((l: any) => l.status === 'NEW').length;
        pipeline.contacted = allLeads.filter((l: any) => l.status === 'CONTACTED').length;
        pipeline.kycSubmitted = allTenants.filter((t: any) => t.status === 'PENDING').length;
        pipeline.approved = allTenants.filter((t: any) => t.status === 'APPROVED').length;
        pipeline.activated = allTenants.filter((t: any) => t.status === 'ACTIVE').length;
      }

      // Wallet & Commissions
      const { data: wallet } = await supabase.from('agent_wallets').select('*').eq('agent_id', agentId).single();
      const { data: ledger } = await supabase.from('wallet_ledger').select('*').eq('agent_id', agentId).order('created_at', { ascending: false }).limit(5);
      const { data: commissions } = await supabase.from('commission_events').select('*').eq('agent_id', agentId).order('created_at', { ascending: false });
      
      // Reputation
      const { data: reputation } = await supabase.from('agent_reputation_summary').select('*').eq('agent_id', agentId).single();
      const { count: rankCount } = await supabase.from('agent_reputation_summary').select('agent_id', { count: 'exact', head: true }).gt('trust_score', reputation?.trust_score || 0);
      const rank = (rankCount || 0) + 1;
      
      // Terminals & Devices
      let terminalMetrics = { assigned: 0, activated: 0, pending: 0, offline: 0, activationRate: 0, syncSuccessRate: 100, lastAssigned: null };
      const { data: terminals, error: termErr } = await supabase.from('pos_terminals').select('*').eq('agent_id', agentId).order('created_at', { ascending: false });
      if (!termErr && terminals && terminals.length > 0) {
        terminalMetrics.assigned = terminals.length;
        terminalMetrics.activated = terminals.filter((t: any) => t.status === 'ACTIVE').length;
        terminalMetrics.pending = terminals.filter((t: any) => t.status === 'PENDING').length;
        terminalMetrics.offline = terminals.filter((t: any) => t.status === 'OFFLINE').length;
        terminalMetrics.activationRate = Math.round((terminalMetrics.activated / terminalMetrics.assigned) * 100);
        terminalMetrics.syncSuccessRate = Math.round(((terminalMetrics.assigned - terminalMetrics.offline) / terminalMetrics.assigned) * 100);
        terminalMetrics.lastAssigned = terminals[0].created_at;
      }

      let deviceMetrics = { assigned: 0, activated: 0, pending: 0, offline: 0, activationRate: 0, deploymentSuccess: 0, offlineRate: 0, lastActivated: null };
      const { data: devices, error: devErr } = await supabase.from('agent_devices').select('*').eq('agent_id', agentId).order('created_at', { ascending: false });
      if (!devErr && devices && devices.length > 0) {
        deviceMetrics.assigned = devices.length;
        deviceMetrics.activated = devices.filter((d: any) => d.status === 'ACTIVE').length;
        deviceMetrics.pending = devices.filter((d: any) => d.status === 'PENDING').length;
        deviceMetrics.offline = devices.filter((d: any) => d.status === 'OFFLINE').length;
        deviceMetrics.activationRate = Math.round((deviceMetrics.activated / deviceMetrics.assigned) * 100);
        deviceMetrics.deploymentSuccess = Math.round(((deviceMetrics.assigned - deviceMetrics.pending) / deviceMetrics.assigned) * 100);
        deviceMetrics.offlineRate = Math.round((deviceMetrics.offline / deviceMetrics.assigned) * 100);
        deviceMetrics.lastActivated = devices.find((d: any) => d.status === 'ACTIVE')?.created_at || devices[0].created_at;
      }

      // Territory Logic
      let territoryName = agent.territory || agent.region || agent.operational_area;
      if (!territoryName && allTenants.length > 0) {
        // Derive from portfolio
        const terrCounts = allTenants.reduce((acc: any, t: any) => {
          const loc = t.city || t.state || t.region;
          if (loc) { acc[loc] = (acc[loc] || 0) + 1; }
          return acc;
        }, {});
        if (Object.keys(terrCounts).length > 0) {
          territoryName = Object.keys(terrCounts).reduce((a, b) => terrCounts[a] > terrCounts[b] ? a : b);
        }
      }
      if (!territoryName) territoryName = 'Territory Not Assigned';

      // Attendance
      let attendance = { enabled: true, status: 'Active', checkIn: '08:00 AM', location: 'Unknown', hours: '0h', score: 100, message: '' };
      const { data: attData, error: attErr } = await supabase.from('agent_attendance').select('*').eq('agent_id', agentId).single();
      if (attErr) {
        attendance = { enabled: false, status: 'Offline', checkIn: '', location: '', hours: '', score: 0, message: 'Attendance tracking will be enabled once the Workforce Management module is deployed.' };
      }

      const recentMerchants = allTenants.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

      const payload = {
        success: true,
        kpis: {
          totalMerchants: { value: allTenants.length, trend: 'Insufficient History' },
          thisMonth: { value: thisMonthTenants.length, trend: calcGrowth(thisMonthTenants.length, lastMonthTenants.length) },
          activeDevices: { value: deviceMetrics.activated, trend: 'Insufficient History' },
          activeTerminals: { value: terminalMetrics.activated, trend: 'Insufficient History' },
          earnedCommissions: { value: wallet?.total_earned || 0, trend: calcGrowth(wallet?.total_earned || 0, 0) },
          availableBalance: { value: wallet?.available_balance || 0, trend: 'No change' },
          reputationScore: { value: reputation?.score || 0, trend: 'No change' }
        },
        targets: {
          monthlyTarget: 50,
          completed: thisMonthTenants.length,
          remaining: Math.max(50 - thisMonthTenants.length, 0),
          percentage: Math.min(Math.round((thisMonthTenants.length / 50) * 100), 100)
        },
        pipeline: pipeline,
        tasks: [
          ...(pipeline.kycSubmitted > 0 ? [{ id: 1, title: 'Upload KYC', text: `${pipeline.kycSubmitted} merchants awaiting KYC`, priority: 'High', actionKey: 'upload_kyc' }] : []),
          ...(terminalMetrics.pending > 0 ? [{ id: 2, title: 'Assign Terminal', text: `${terminalMetrics.pending} pending terminal assignments`, priority: 'Medium', actionKey: 'assign_terminal' }] : []),
        ],
        alerts: [
          ...(terminalMetrics.offline > 0 ? [{ id: 1, text: `${terminalMetrics.offline} terminals offline`, severity: 'Warning' }] : []),
          ...(pipeline.kycSubmitted > 5 ? [{ id: 2, text: `KYC Backlog: ${pipeline.kycSubmitted} items`, severity: 'Critical' }] : []),
        ],
        deployments: {
          terminals: terminalMetrics,
          devices: deviceMetrics
        },
        wallet: {
          summary: {
            availableBalance: wallet?.available_balance || 0,
            pendingEarnings: wallet?.pending_balance || 0,
            totalEarnings: wallet?.total_earned || 0
          },
          ledger: ledger || [],
          recentCommissions: (commissions || []).slice(0, 5)
        },
        portfolioHealth: {
          healthy: allTenants.filter((t: any) => t.status === 'ACTIVE').length,
          attentionRequired: allTenants.filter((t: any) => t.status === 'SUSPENDED' || t.status === 'PENDING').length,
          dormant: allTenants.filter((t: any) => t.status === 'DORMANT').length,
        },
        territory: {
          name: territoryName,
          merchants: allTenants.length,
          active: allTenants.filter((t: any) => t.status === 'ACTIVE').length,
          pending: allTenants.filter((t: any) => t.status === 'PENDING').length
        },
        attendance: attendance,
        recentMerchants: recentMerchants,
        analytics: {
          merchantGrowth: [], // Kept empty to trigger new empty state logic
          commissionTrend: [],
          activationFunnel: [
            pipeline.prospects + pipeline.contacted + pipeline.kycSubmitted + pipeline.approved + pipeline.activated,
            pipeline.kycSubmitted + pipeline.approved + pipeline.activated,
            pipeline.approved + pipeline.activated,
            pipeline.activated
          ]
        },
        reputation: {
          trust_score: reputation?.trust_score || 0,
          level_name: reputation?.level_name || 'New Agent',
          rank: rank || '-'
        },
        quickActions: [
          { label: 'Create Lead', route: '/agent/coming-soon/create-lead', icon: 'person_add' },
          { label: 'Register Merchant', route: '/agent/coming-soon/register-merchant', icon: 'storefront' },
          { label: 'Upload KYC', route: '/agent/coming-soon/upload-kyc', icon: 'file_upload' },
          { label: 'Assign Device', route: '/agent/coming-soon/assign-device', icon: 'devices' },
          { label: 'Assign Terminal', route: '/agent/coming-soon/assign-terminal', icon: 'point_of_sale' },
          { label: 'Request Withdrawal', route: '/agent/coming-soon/request-withdrawal', icon: 'payments' },
          { label: 'Support Ticket', route: '/agent/coming-soon/support-ticket', icon: 'support_agent' }
        ]
      };

      return res.status(200).json(payload);
    } catch (err: any) {
      console.error('[getDashboard] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to load dashboard data' });
    }
  }

  static async assignHardware(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { data: agent } = await supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
      if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
      const agentId = agent.id;

      const { type, tenantId, serialNumber } = req.body;
      if (!tenantId || !serialNumber) {
        return res.status(400).json({ success: false, message: 'Tenant and Serial Number are required' });
      }

      if (type === 'DEVICE') {
        // Check if device already exists in devices
        const { data: existingDevice } = await supabase
          .from('devices')
          .select('id')
          .eq('device_id', serialNumber)
          .maybeSingle();

        if (existingDevice) {
          const { error } = await supabase
            .from('devices')
            .update({
              tenant_id: tenantId,
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingDevice.id);
          if (error) throw new Error('Failed to update device assignment: ' + error.message);
        } else {
          const { error } = await supabase
            .from('devices')
            .insert({
              tenant_id: tenantId,
              device_id: serialNumber,
              device_name: 'Agent-Assigned Device',
              status: 'active'
            });
          if (error) throw new Error('Failed to create device assignment: ' + error.message);
        }
      } else if (type === 'TERMINAL') {
        // Check if terminal exists in terminal_inventory
        const { data: existingTerminal } = await supabase
          .from('terminal_inventory')
          .select('id')
          .or(`pos_serial_number.eq.${serialNumber},terminal_id.eq.${serialNumber}`)
          .maybeSingle();

        if (existingTerminal) {
          const { error } = await supabase
            .from('terminal_inventory')
            .update({
              assigned_tenant_id: tenantId,
              assignment_status: 'assigned',
              assigned_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingTerminal.id);
          if (error) throw new Error('Failed to update terminal assignment: ' + error.message);
        } else {
          const { error } = await supabase
            .from('terminal_inventory')
            .insert({
              terminal_id: serialNumber,
              pos_serial_number: serialNumber,
              assigned_tenant_id: tenantId,
              assignment_status: 'assigned',
              assigned_at: new Date().toISOString(),
              terminal_type: 'N3'
            });
          if (error) throw new Error('Failed to create terminal assignment: ' + error.message);
        }
      } else {
        return res.status(400).json({ success: false, message: 'Invalid hardware type' });
      }

      return res.status(200).json({ success: true, message: 'Hardware assigned successfully' });
    } catch (err: any) {
      console.error('[AssignHardware] Error:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async syncHardware(req: Request, res: Response) {
    try {
      // Dummy sync endpoint for the UI to hit
      return res.status(200).json({ success: true, message: 'Hardware sync initiated' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateAgentStatus(req: Request, res: Response) {
    return res.status(501).json({ success: false, message: 'Manager Portal Not Implemented' });
  }

  static async updateAgentKyc(req: Request, res: Response) {
    return res.status(501).json({ success: false, message: 'Manager Portal Not Implemented' });
  }

  static async getAgentCommissions(req: Request, res: Response) {
    return res.status(501).json({ success: false, message: 'Manager Portal Not Implemented' });
  }

  static async updateAgentCommissions(req: Request, res: Response) {
    return res.status(501).json({ success: false, message: 'Manager Portal Not Implemented' });
  }

  static async messageAgent(req: Request, res: Response) {
    return res.status(501).json({ success: false, message: 'Manager Portal Not Implemented' });
  }

  static async messageAgentTenants(req: Request, res: Response) {
    return res.status(501).json({ success: false, message: 'Manager Portal Not Implemented' });
  }

  static async resolveSuspension(req: Request, res: Response) {
    try {
      const { email, passportImage, idCard, answer, address, phone, whatsappNumber } = req.body;
      
      if (!email) {
        return res.status(400).json({ success: false, message: 'Agent email is required.' });
      }

      // Check if mock mode is active
      if (process.env.OFFLINE_LOCAL_AUTH === 'true') {
        return res.status(200).json({
          success: true,
          message: 'Suspension resolution successfully submitted (Mock Mode)'
        });
      }

      // 1. Fetch the Agent
      const { data: agent, error: agentErr } = await supabase
        .from('agents')
        .select('*')
        .eq('email', email)
        .single();

      if (agentErr || !agent) {
        return res.status(404).json({ success: false, message: 'Agent not found.' });
      }

      // 2. Upload images to S3
      let passportUrl = '';
      let idCardUrl = '';

      if (passportImage && passportImage.startsWith('data:')) {
        try {
          passportUrl = await uploadBase64ToContabo(passportImage, 'passports', `${email.replace(/[@.]/g, '_')}_passport`);
        } catch (s3Err: any) {
          console.error('[ResolveSuspension] Passport Upload Error:', s3Err.message);
        }
      }
      if (idCard && idCard.startsWith('data:')) {
        try {
          idCardUrl = await uploadBase64ToContabo(idCard, 'ids', `${email.replace(/[@.]/g, '_')}_id`);
        } catch (s3Err: any) {
          console.error('[ResolveSuspension] ID Card Upload Error:', s3Err.message);
        }
      }

      // 3. Update the agent status to ACTIVE
      const oldStatus = agent.status;
      const { error: updateAgentErr } = await supabase
        .from('agents')
        .update({
          status: 'ACTIVE',
          phone: phone || agent.phone
        })
        .eq('id', agent.id);

      if (updateAgentErr) {
        throw updateAgentErr;
      }

      // 4. Log status history change
      await supabase
        .from('agent_status_history')
        .insert({
          agent_id: agent.id,
          old_status: oldStatus,
          new_status: 'ACTIVE',
          changed_by: agent.id, // Agent self-resolution
          reason: `Suspension resolved. Answer submitted: ${answer || 'N/A'}`
        });

      // 5. Update agent profile
      const profileUpdates: any = {
        kyc_status: 'VERIFIED'
      };
      if (address) profileUpdates.address = address;
      if (passportUrl) profileUpdates.profile_photo_url = passportUrl;

      const { error: profileErr } = await supabase
        .from('agent_profiles')
        .upsert({
          agent_id: agent.id,
          ...profileUpdates,
          updated_at: new Date().toISOString()
        });

      if (profileErr) {
        console.error('[ResolveSuspension] Agent Profile update failed:', profileErr.message);
      }

      // 6. Log audit event
      try {
        await agentRepository.logAudit(
          agent.id,
          'AGENT',
          agent.id,
          'RESOLVE_SUSPENSION',
          { old_status: oldStatus },
          { new_status: 'ACTIVE', answer, idCardUrl, passportUrl },
          req.ip || '',
          (req.headers['user-agent'] as string) || ''
        );
      } catch (auditErr: any) {
        console.error('[ResolveSuspension] Audit log failed:', auditErr.message);
      }

      return res.status(200).json({
        success: true,
        message: 'Suspension successfully resolved and account activated.'
      });

    } catch (err: any) {
      console.error('[ResolveSuspension] Error:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

}
