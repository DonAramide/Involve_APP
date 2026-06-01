import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface Agent {
  id: string;
  agentCode: string;
  passwordHash: string; // Storing plain mock passwords for simplicity in prototype
  isFirstLogin: boolean;
  name: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  address?: string;
  passportImage?: string; // base64 or url
  idCard?: string; // base64 or url
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  commissions: number;
  points: number;
  createdAt: Date;
}

// In-memory store for prototype
const mockAgents: Agent[] = [
  {
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
    commissions: 0,
    points: 0,
    createdAt: new Date()
  }
];

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
        commissions: 0,
        points: 0,
        createdAt: new Date()
      };

      mockAgents.push(newAgent);

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
      const { agentCode, password } = req.body;

      const agent = mockAgents.find(a => a.agentCode === agentCode);
      if (!agent) {
        return res.status(401).json({ success: false, message: 'Invalid agent credentials' });
      }

      if (agent.passwordHash !== password) {
        return res.status(401).json({ success: false, message: 'Invalid agent credentials' });
      }

      if (agent.isFirstLogin) {
        return res.status(200).json({ 
          success: true, 
          requirePasswordChange: true,
          message: 'First login detected, password change required.'
        });
      }

      // In real scenario, issue JWT here
      return res.status(200).json({
        success: true,
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
  static async getDashboard(req: Request, res: Response) {
    try {
      // Normally extract agentCode from JWT. Using query param for prototype.
      const agentCode = req.query.agentCode as string;
      
      const agent = mockAgents.find(a => a.agentCode === agentCode);
      if (!agent) {
        return res.status(404).json({ success: false, message: 'Agent not found' });
      }

      // Mock tenants onboarded by this agent
      const tenants = [
        { id: 't1', businessName: 'Retail Fast', industry: 'Retail', status: 'ACTIVE', onboardedAt: new Date().toISOString() },
        { id: 't2', businessName: 'Logistics Beta', industry: 'Logistics', status: 'ONBOARDING', onboardedAt: new Date().toISOString() }
      ];

      return res.status(200).json({
        success: true,
        stats: {
          points: agent.points,
          commissions: agent.commissions,
          totalTenants: tenants.length
        },
        tenants
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
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
        isFirstLogin: a.isFirstLogin,
        points: a.points,
        commissions: a.commissions
      }))
    });
  }

}
