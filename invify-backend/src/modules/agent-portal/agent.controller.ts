import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
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

const LOCAL_TENANTS_DB_PATH = path.join(process.cwd(), 'tenants_db.json');
const LOCAL_AGENTS_DB_PATH = path.join(process.cwd(), 'agents_db.json');

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

let mockAgents: Agent[] = [];
if (fs.existsSync(LOCAL_AGENTS_DB_PATH)) {
  mockAgents = JSON.parse(fs.readFileSync(LOCAL_AGENTS_DB_PATH, 'utf-8'));
} else {
  mockAgents = [defaultMasterAgent];
  fs.writeFileSync(LOCAL_AGENTS_DB_PATH, JSON.stringify(mockAgents, null, 2));
}

const saveAgents = () => fs.writeFileSync(LOCAL_AGENTS_DB_PATH, JSON.stringify(mockAgents, null, 2));

export class AgentController {
  
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

      if (mockAgents.find(a => a.agentCode === agentCode)) {
        return res.status(400).json({ success: false, message: 'Agent code already exists' });
      }

      const newAgent: Agent = {
        id: uuidv4(),
        agentCode,
        passwordHash: agentCode, // Default password is the code
        isFirstLogin: true,
        name,
        email,
        phone,
        whatsappNumber,
        address,
        passportImage,
        idCard,
        kycStatus: 'PENDING',
        status: 'ACTIVE',
        commissions: 0,
        points: 0,
        createdAt: new Date()
      };

      mockAgents.push(newAgent);
      saveAgents();

      return res.status(201).json({ 
        success: true, 
        message: 'Agent onboarded successfully',
        agent: {
          id: newAgent.id,
          agentCode: newAgent.agentCode,
          name: newAgent.name
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
      const settingsPath = path.join(process.cwd(), 'global_settings.json');
      if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        if (settings.is_maintenance_locked) {
          return res.status(403).json({
            success: false,
            message: settings.maintenance_message || 'System is currently under maintenance. Please try again later.'
          });
        }
      }

      const agent = mockAgents.find(a => a.email?.toLowerCase() === email.toLowerCase());
      if (!agent) {
        return res.status(401).json({ success: false, message: 'Invalid agent credentials' });
      }

      if (agent.passwordHash !== password) {
        return res.status(401).json({ success: false, message: 'Invalid agent credentials' });
      }

      if (agent.status === 'PENDING_APPROVAL') {
        return res.status(403).json({ success: false, message: 'Your account is pending review by Invify Staff. You will be notified once approved.' });
      }

      if (agent.status === 'SUSPENDED') {
        return res.status(403).json({ 
          success: false, 
          message: agent.suspensionReason || 'Your account has been suspended.',
          requiredAction: agent.requiredAction || 'NONE',
          actionQuestion: agent.actionQuestion || ''
        });
      }

      if (agent.isFirstLogin && agent.agentCode === agent.passwordHash) {
        return res.status(200).json({ 
          success: true, 
          requirePasswordChange: true,
          agentCode: agent.agentCode,
          message: 'First login detected, password change required.'
        });
      }

      // In real scenario, issue JWT here
      return res.status(200).json({
        success: true,
        token: `mock-agent-token-${agent.id}`,
        agent: {
          id: agent.id,
          email: agent.email,
          agentCode: agent.agentCode,
          name: agent.name
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

      if (mockAgents.find(a => a.email?.toLowerCase() === email.toLowerCase())) {
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

          let supabaseUserId = authData?.user?.id;
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

      // 3. Save to memory DB for local state representation
      const newAgent: Agent = {
        id: uuidv4(),
        agentCode: agentCode || tempCode,
        passwordHash: password,
        isFirstLogin: false, // Since they set it during signup
        name: fullName,
        email,
        phone,
        whatsappNumber,
        address,
        passportImage: passportUrl || passportImage,
        idCard: idCardUrl || idCard,
        kycStatus: 'PENDING',
        status: 'PENDING_APPROVAL',
        commissions: 0,
        points: 0,
        createdAt: new Date()
      };

      mockAgents.push(newAgent);
      saveAgents();

      return res.status(201).json({ 
        success: true, 
        message: 'Registration successful. Please wait for Invify Staff approval.',
        agent: {
          id: newAgent.id,
          email: newAgent.email,
          name: newAgent.name
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

      const agent = mockAgents.find(a => a.agentCode === agentCode);
      if (!agent || agent.passwordHash !== oldPassword) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      agent.passwordHash = newPassword;
      agent.isFirstLogin = false;
      saveAgents();

      return res.status(200).json({ 
        success: true, 
        message: 'Password changed successfully. You can now log in.',
        token: `mock-agent-token-${agent.id}`,
        agent: {
          agentCode: agent.agentCode,
          name: agent.name
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
      let agent = mockAgents.find(a => a.id === authUser.id || a.email?.toLowerCase() === authUser.email?.toLowerCase());
      if (!agent) {
        try {
          const { data: dbAgent } = await supabase
            .from('agents')
            .select('*')
            .eq('auth_user_id', authUser.id)
            .single();
          if (dbAgent) {
            agent = dbAgent;
          }
        } catch (_) {}
      }

      if (!agent) {
        return res.status(404).json({ success: false, message: 'Agent profile not found' });
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
      const { data: reputation } = await supabase.from('agent_reputations').select('*').eq('agent_id', agentId).single();
      
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

  static async listAgents(req: Request, res: Response) {
    return res.status(200).json({
      success: true,
      agents: mockAgents.map(a => ({
        id: a.id,
        agentCode: a.agentCode,
        name: a.name,
        email: a.email,
        phone: a.phone,
        whatsappNumber: a.whatsappNumber,
        kycStatus: a.kycStatus,
        status: a.status,
        isFirstLogin: a.isFirstLogin,
        points: a.points,
        commissions: a.commissions
      }))
    });
  }

  static async getAgentProfile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const agent = mockAgents.find(a => a.id === id);
      if (!agent) {
        return res.status(404).json({ success: false, message: 'Agent not found' });
      }

      // Read actual tenants from database
      const allTenants = fs.existsSync(LOCAL_TENANTS_DB_PATH) 
        ? JSON.parse(fs.readFileSync(LOCAL_TENANTS_DB_PATH, 'utf-8'))
        : [];
      
      // Filter tenants by agent_code
      const agentTenants = allTenants.filter((t: any) => 
        t.agent_code === agent.agentCode
      );

      const tenants = agentTenants.map((t: any) => ({
        id: t.id,
        businessName: t.name,
        industry: t.type,
        status: (t.status || 'ACTIVE').toUpperCase(),
        onboardedAt: t.created_at || new Date().toISOString()
      }));

      return res.status(200).json({
        success: true,
        agent,
        tenants
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateAgentStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, suspensionReason, requiredAction, actionQuestion, actionAnswer } = req.body;
      const agent = mockAgents.find(a => a.id === id);
      if (!agent) {
        return res.status(404).json({ success: false, message: 'Agent not found' });
      }

      if (status !== 'ACTIVE' && status !== 'SUSPENDED' && status !== 'PENDING_APPROVAL') {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }

      agent.status = status;
      if (status === 'SUSPENDED') {
        agent.suspensionReason = suspensionReason || 'Your account has been suspended.';
        agent.requiredAction = requiredAction || 'NONE';
        agent.actionQuestion = actionQuestion || '';
        agent.actionAnswer = actionAnswer || '';
      } else {
        agent.suspensionReason = undefined;
        agent.requiredAction = undefined;
        agent.actionQuestion = undefined;
        agent.actionAnswer = undefined;
      }
      saveAgents();
      return res.status(200).json({ success: true, message: `Agent status updated to ${status}`, agent });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateAgentKyc(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { kycStatus } = req.body;
      const agent = mockAgents.find(a => a.id === id);
      if (!agent) {
        return res.status(404).json({ success: false, message: 'Agent not found' });
      }

      if (kycStatus !== 'PENDING' && kycStatus !== 'VERIFIED' && kycStatus !== 'REJECTED') {
        return res.status(400).json({ success: false, message: 'Invalid KYC status' });
      }

      agent.kycStatus = kycStatus;
      saveAgents();
      return res.status(200).json({ success: true, message: `Agent KYC status updated to ${kycStatus}`, agent });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getAgentCommissions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const agent = mockAgents.find(a => a.id === id);
      if (!agent) {
        return res.status(404).json({ success: false, message: 'Agent not found' });
      }
      return res.status(200).json({ success: true, commissionSettings: agent.commissionSettings || {} });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateAgentCommissions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { onboardingFee, revSharePercentage } = req.body;
      const agent = mockAgents.find(a => a.id === id);
      if (!agent) {
        return res.status(404).json({ success: false, message: 'Agent not found' });
      }
      
      agent.commissionSettings = {
        onboardingFee: onboardingFee !== undefined ? onboardingFee : agent.commissionSettings?.onboardingFee,
        revSharePercentage: revSharePercentage !== undefined ? revSharePercentage : agent.commissionSettings?.revSharePercentage
      };
      saveAgents();
      
      return res.status(200).json({ success: true, commissionSettings: agent.commissionSettings });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async messageAgent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { message } = req.body;
      const agent = mockAgents.find(a => a.id === id);
      if (!agent) {
        return res.status(404).json({ success: false, message: 'Agent not found' });
      }
      
      // Simulate dispatching via WebSockets
      console.log(`\n==============================================`);
      console.log(`[PUSH NOTIFICATION DISPATCHER]`);
      console.log(`TARGET: Agent ${agent.agentCode} (${agent.name})`);
      console.log(`DEVICE/PHONE: ${agent.phone || 'Unknown'}`);
      console.log(`PAYLOAD: "${message}"`);
      console.log(`==============================================\n`);
      
      return res.status(200).json({ 
        success: true, 
        message: `High-priority push notification delivered to ${agent.name}'s mobile app.` 
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async messageAgentTenants(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { message } = req.body;
      const agent = mockAgents.find(a => a.id === id);
      if (!agent) {
        return res.status(404).json({ success: false, message: 'Agent not found' });
      }
      
      // Read actual tenants to count how many are receiving the broadcast
      const allTenants = fs.existsSync(LOCAL_TENANTS_DB_PATH) 
        ? JSON.parse(fs.readFileSync(LOCAL_TENANTS_DB_PATH, 'utf-8'))
        : [];
      
      const agentTenants = allTenants.filter((t: any) => 
        t.agent_code === agent.agentCode || (!t.agent_code && agent.agentCode === 'AAA000')
      );
      
      // Simulate broadcasting to tenants
      console.log(`\n==============================================`);
      console.log(`[TERMINAL BROADCAST ENGINE]`);
      console.log(`ROUTING: Agent ${agent.agentCode} Fleet`);
      console.log(`TARGET COUNT: ${agentTenants.length} active terminals`);
      console.log(`PAYLOAD: "${message}"`);
      console.log(`==============================================\n`);
      
      // ACTUALLY EMIT TO ALL SOCKETS BELONGING TO THESE TENANTS
      agentTenants.forEach((tenant: any) => {
        const room = `tenant:${tenant.id}`;
        io.to(room).emit('app_broadcast', {
          message: message,
          sender: `Agent ${agent.agentCode}`,
          timestamp: new Date().toISOString()
        });
      });
      
      return res.status(200).json({ 
        success: true, 
        message: `System broadcast successfully queued for ${agentTenants.length} terminals managed by ${agent.agentCode}.` 
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async resolveSuspension(req: Request, res: Response) {
    try {
      const { email, passportImage, idCard, answer, address, phone, whatsappNumber } = req.body;

      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const agent = mockAgents.find(a => a.email?.toLowerCase() === email.toLowerCase());
      if (!agent) {
        return res.status(404).json({ success: false, message: 'Agent not found' });
      }

      if (agent.status !== 'SUSPENDED') {
        return res.status(400).json({ success: false, message: 'Agent is not suspended' });
      }

      let fileUrl = '';
      let actionFulfilled = false;

      if (passportImage) {
        fileUrl = await uploadBase64ToContabo(passportImage, 'passports', `${email.replace(/[@.]/g, '_')}_passport`);
        agent.passportImage = fileUrl;
        agent.kycStatus = 'PENDING';
        actionFulfilled = true;
      }
      if (idCard) {
        fileUrl = await uploadBase64ToContabo(idCard, 'ids', `${email.replace(/[@.]/g, '_')}_id`);
        agent.idCard = fileUrl;
        agent.kycStatus = 'PENDING';
        actionFulfilled = true;
      }
      if (answer) {
        agent.actionAnswer = answer;
        actionFulfilled = true;
      }
      if (address) {
        agent.address = address;
        actionFulfilled = true;
      }
      if (phone) {
        agent.phone = phone;
        actionFulfilled = true;
      }
      if (whatsappNumber) {
        agent.whatsappNumber = whatsappNumber;
        actionFulfilled = true;
      }

      if (!actionFulfilled) {
        return res.status(400).json({ success: false, message: 'Invalid action or missing required file/answer' });
      }

      // Update agent status to PENDING_APPROVAL so the admin can approve
      agent.status = 'PENDING_APPROVAL';
      agent.requiredAction = 'NONE'; // clear action as it has been fulfilled
      
      // Save changes locally
      const LOCAL_AGENTS_DB_PATH = path.join(process.cwd(), 'agents_db.json');
      fs.writeFileSync(LOCAL_AGENTS_DB_PATH, JSON.stringify(mockAgents, null, 2));

      // Write to Supabase if enabled
      const hasSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_KEY;
      if (hasSupabase) {
        try {
          const agentUpdates: any = { status: 'PENDING' };
          if (phone) agentUpdates.phone = phone;
          
          const { data: dbAgent, error: dbError } = await supabase
            .from('agents')
            .update(agentUpdates)
            .eq('email', email)
            .select()
            .single();

          if (!dbError && dbAgent) {
            const profileUpdates: any = { kyc_status: 'PENDING' };
            if (agent.passportImage) profileUpdates.profile_photo_url = agent.passportImage;
            if (address) profileUpdates.address = address;
            
            await supabase
              .from('agent_profiles')
              .update(profileUpdates)
              .eq('agent_id', dbAgent.id);
          }
        } catch (supabaseErr: any) {
          console.error('[ResolveSuspension] Supabase Sync Error:', supabaseErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Action submitted successfully. Your profile is now pending review.'
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

}
