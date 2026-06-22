// src/controllers/search.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../db/supabase';

export class SearchController {
  
  public static async performGlobalSearch(req: Request, res: Response): Promise<void> {
    try {
      const query = (req.query.q as string) || '';
      if (!query.trim()) {
        res.status(200).json({ results: [] });
        return;
      }

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

      // 2. Exact Entity ID Lookups from Databases (Supabase)
      let terminals: any[] = [];
      try {
        const { data: termData, error: termErr } = await supabase
          .from('terminal_inventory')
          .select('terminal_id, mpos_terminal_id, terminal_type, bank_name')
          .or(`terminal_id.ilike.%${query}%,mpos_terminal_id.ilike.%${query}%,pos_serial_number.ilike.%${query}%`)
          .limit(3);
        
        if (termErr) throw termErr;
        terminals = termData || [];
      } catch (e) {
        console.error('Error fetching terminals from Supabase for search:', e);
        throw e;
      }

      let tenants: any[] = [];
      try {
        const { data: tenantData, error: tenantErr } = await supabase
          .from('tenants')
          .select('id, name, type, status')
          .or(`id.ilike.%${query}%,name.ilike.%${query}%`)
          .limit(3);
        
        if (tenantErr) throw tenantErr;
        tenants = tenantData || [];
      } catch (e) {
        console.error('Error fetching tenants from Supabase for search:', e);
        throw e;
      }

      // Terminals matching
      terminals.forEach((t: any) => {
        results.push({
          type: 'TERMINAL',
          title: `TRM: ${t.terminal_id || t.mpos_terminal_id}`,
          subtitle: `${t.terminal_type || t.bank_name || 'Terminal'} • Active`,
          icon: 'point_of_sale',
          color: 'green',
          route: '/governance/terminals'
        });
      });

      // Tenants matching
      tenants.forEach((t: any) => {
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
      const qUpper = query.toUpperCase();
      if (qUpper.includes('TXN') || qUpper.includes('LED')) {
        results.push({ type: 'LEDGER', title: qUpper, subtitle: 'Search Ledger Transactions', icon: 'receipt_long', color: 'cyan', route: '/observability/audit' });
      }
      if (qUpper.includes('CMP')) {
        results.push({ type: 'COMPLIANCE', title: qUpper, subtitle: 'EDD Required Search', icon: 'policy', color: 'purple', route: '/governance/compliance' });
      }

      // Default fallback
      if (results.length === 0) {
        results.push({ type: 'GLOBAL', title: `Ask AI to find "${query}"`, subtitle: 'Execute Natural Language Query', icon: 'travel_explore', color: 'purple', route: '/executive/ai-insights' });
      }

      res.status(200).json({ results });
    } catch (error: any) {
      console.error('Global Search Error:', error);
      if (SearchController.isNetworkTimeout(error)) {
        res.status(503).json({ error: 'Database unavailable', retryable: true, retryAfterMs: 2000, results: [] });
        return;
      }
      res.status(500).json({ error: 'Failed to execute smart search', results: [] });
    }
  }

  private static isNetworkTimeout(error: any): boolean {
    return (
      error.message?.includes('fetch failed') ||
      error.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      error.message?.includes('timeout') ||
      error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      process.env.OFFLINE_MOCK_AUTH === 'true'
    );
  }
}
