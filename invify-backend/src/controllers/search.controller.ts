// src/controllers/search.controller.ts
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { supabase } from '../db/supabase';

const TERMINAL_DB_PATH = path.join(process.cwd(), 'terminal_inventory_db.json');
const TENANTS_DB_PATH = path.join(process.cwd(), 'tenants_db.json');

export class SearchController {
  
  public static async performGlobalSearch(req: Request, res: Response): Promise<void> {
    try {
      const query = (req.query.q as string) || '';
      if (!query.trim()) {
        res.status(200).json({ results: [] });
        return;
      }

      const q = query.toUpperCase();
      const qLower = query.toLowerCase();
      let results: any[] = [];

      // 1. Natural Language Routing
      if (qLower.includes('find settlement batch') || qLower.includes('show settlement') || qLower.includes('settlements')) {
        results.push({ type: 'AI COMMAND', title: 'Open Settlement Workspace', subtitle: 'Applying filter: Settlement Batches', icon: 'auto_awesome', color: 'purple', route: '/finance/settlements' });
      }
      if (qLower.includes('show high risk tenants') || qLower.includes('risky tenants') || qLower.includes('risk')) {
        results.push({ type: 'AI COMMAND', title: 'View Tenant Health', subtitle: 'Applying filter: High Risk', icon: 'auto_awesome', color: 'purple', route: '/finance/tenant-health' });
      }
      if (qLower.includes('open fraud case') || qLower.includes('fraud')) {
        results.push({ type: 'AI COMMAND', title: 'Investigate Fraud Case', subtitle: 'Routing to Fraud Center', icon: 'auto_awesome', color: 'purple', route: '/finance/fraud' });
      }
      if (qLower.includes('wallet') || qLower.includes('show wallet')) {
        results.push({ type: 'AI COMMAND', title: 'Inspect Wallet', subtitle: 'Routing to Wallet Operations', icon: 'auto_awesome', color: 'purple', route: '/finance/wallets' });
      }
      if (qLower.includes('revenue') || qLower.includes('show merchant revenue')) {
        results.push({ type: 'AI COMMAND', title: 'Analyze Merchant Revenue', subtitle: 'Routing to Revenue Operations', icon: 'auto_awesome', color: 'purple', route: '/finance/revenue' });
      }
      if (qLower.includes('commission') || qLower.includes('agent fee') || qLower.includes('payout') || qLower.includes('incentive')) {
        results.push({ type: 'AI COMMAND', title: 'Incentive Management Defaults', subtitle: 'Global Default Commission Rates & Overrides', icon: 'settings', color: 'green', route: '/admin/agents/commissions?tab=defaults' });
      }
      if (qLower.includes('approval') || qLower.includes('payout queue') || qLower.includes('approve commission')) {
        results.push({ type: 'AI COMMAND', title: 'Commission Approval Queue', subtitle: 'Approve, Reject, or Reverse Agent Payouts', icon: 'grading', color: 'green', route: '/admin/agents/commissions?tab=approvals' });
      }
      if (qLower.includes('audit') || qLower.includes('ledger') || qLower.includes('clawback')) {
        results.push({ type: 'AI COMMAND', title: 'Commission Audit & History', subtitle: 'Lifecycle Events Log, Ledgers, and Clawbacks', icon: 'history', color: 'green', route: '/admin/agents/commissions?tab=audit' });
      }
      if (qLower.includes('progress') || qLower.includes('tier') || qLower.includes('performance')) {
        results.push({ type: 'AI COMMAND', title: 'Agent Incentive Progress', subtitle: 'Tenants onboarded, terminals deployed, and active plan tracking', icon: 'trending_up', color: 'green', route: '/admin/agents/commissions?tab=progress' });
      }
      if (qLower.includes('plan') || qLower.includes('rules') || qLower.includes('target')) {
        results.push({ type: 'AI COMMAND', title: 'Incentive Plans & Targets', subtitle: 'Program Versions, MC Category exceptions, and Target thresholds', icon: 'assignment', color: 'green', route: '/admin/agents/commissions?tab=plans' });
      }
      if (qLower.includes('campaign') || qLower.includes('budget') || qLower.includes('roi')) {
        results.push({ type: 'AI COMMAND', title: 'Campaigns & Budgets Workspace', subtitle: 'Budget utilization, ROI metrics, and Campaign alerts', icon: 'campaign', color: 'green', route: '/admin/agents/commissions?tab=budgets' });
      }
      if (qLower.includes('simulate') || qLower.includes('simulator') || qLower.includes('dry-run')) {
        results.push({ type: 'AI COMMAND', title: 'Deterministic Commission Simulator', subtitle: 'Simulate onboarding payouts & revshare splits in-memory', icon: 'psychology', color: 'green', route: '/admin/agents/commissions?tab=simulator' });
      }
      if (qLower.includes('bill') || qLower.includes('invoice')) {
        results.push({ type: 'AI COMMAND', title: 'Billing Center', subtitle: 'Manage Billing and Invoices', icon: 'receipt', color: 'green', route: '/finance/billing' });
      }

      // 2. Exact Entity ID Lookups from Databases (Offline / Supabase Fallback)
      // We will read the local DBs for simplicity if offline auth is true, else try supabase.
      // For this implementation, we will query the local JSONs for fast responses as fallback.
      
      // Load Terminals
      let terminals: any[] = [];
      try {
        if (fs.existsSync(TERMINAL_DB_PATH)) {
          const tData = JSON.parse(fs.readFileSync(TERMINAL_DB_PATH, 'utf-8'));
          terminals = [
            ...(tData.terminal_ids || []),
            ...(tData.mpos_devices || []),
            ...(tData.tablets || [])
          ];
        }
      } catch (e) {
        console.error('Error reading terminals DB', e);
      }

      // Load Tenants
      let tenants: any[] = [];
      try {
        if (fs.existsSync(TENANTS_DB_PATH)) {
          const tData = JSON.parse(fs.readFileSync(TENANTS_DB_PATH, 'utf-8'));
          // tenants_db.json is an array at the root
          tenants = Array.isArray(tData) ? tData : (tData.tenants || []);
        }
      } catch (e) {
        console.error('Error reading tenants DB', e);
      }

      // Terminals matching
      const matchingTerminals = terminals.filter((t: any) => 
        (t.tid && t.tid.toUpperCase().includes(q)) || 
        (t.serial_number && t.serial_number.toUpperCase().includes(q)) ||
        (t.device_id && t.device_id.toUpperCase().includes(q))
      );

      matchingTerminals.slice(0, 3).forEach((t: any) => {
        results.push({
          type: 'TERMINAL',
          title: `TRM: ${t.tid || t.serial_number || t.device_id}`,
          subtitle: `${t.device_model || t.model || t.bank_name || 'Terminal'} • Active`,
          icon: 'point_of_sale',
          color: 'green',
          route: '/governance/terminals'
        });
      });

      // Tenants matching
      const matchingTenants = tenants.filter((t: any) => 
        (t.id && t.id.toUpperCase().includes(q)) || 
        (t.name && t.name.toUpperCase().includes(q))
      );

      matchingTenants.slice(0, 3).forEach((t: any) => {
        results.push({
          type: 'TENANT',
          title: `TENANT: ${t.name}`,
          subtitle: `${t.type || 'Standard'} • ${t.status || 'Active'}`,
          icon: 'storefront',
          color: 'indigo',
          route: `/admin/orchestration`
        });
      });

      // 3. Fallbacks for other specific prefixes
      if (q.includes('TXN') || q.includes('LED')) {
        results.push({ type: 'LEDGER', title: q, subtitle: 'Search Ledger Transactions', icon: 'receipt_long', color: 'cyan', route: '/observability/audit' });
      }
      if (q.includes('CMP')) {
        results.push({ type: 'COMPLIANCE', title: q, subtitle: 'EDD Required Search', icon: 'policy', color: 'purple', route: '/governance/compliance' });
      }

      // Default fallback
      if (results.length === 0) {
        results.push({ type: 'GLOBAL', title: `Ask AI to find "${query}"`, subtitle: 'Execute Natural Language Query', icon: 'travel_explore', color: 'purple', route: '/executive/ai-insights' });
      }

      res.status(200).json({ results });
    } catch (error) {
      console.error('Global Search Error:', error);
      res.status(500).json({ error: 'Failed to execute smart search', results: [] });
    }
  }
}
