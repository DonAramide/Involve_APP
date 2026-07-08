// src/services/reconciliation.service.ts
import { supabase } from '../db/supabase';
import { GovAuditService } from './gov-audit.service';
import crypto from 'crypto';

export class ReconciliationService {
  
  static async getReport(params: { tenantId: string; status?: string; page?: number; limit?: number; }) {
    const { tenantId, status, page = 1, limit = 50 } = params;
    const offset = (page - 1) * limit;

    try {
      // Fetch cases from DB (which will be populated by the migration/triggers eventually)
      // Since we just ran a migration but there is no data in `reconciliation_cases` yet,
      // we'll fetch from `reconciliation_cases`. If the table is empty, we return empty stats.
      // We will also return a clean unified model.
      const query = supabase
        .from('reconciliation_cases')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        query.eq('status', status.toUpperCase());
      }

      const { data, count, error } = await query.range(offset, offset + limit - 1);

      if (error && error.code !== '42P01') { // Ignore table not found if migration hasn't run
        throw error;
      }

      const cases = data || [];

      // Calculate summary stats dynamically
      const { data: allStats, error: statsError } = await supabase
        .from('reconciliation_cases')
        .select('status, expected_amount, difference_amount')
        .eq('tenant_id', tenantId);

      let summary = {
        totalPayments: 0,
        matched: 0,
        unmatched: 0,
        issues: 0,
        mismatchAmount: 0,
        reconciliationRate: 100.0
      };

      if (!statsError && allStats) {
        summary.totalPayments = allStats.length;
        summary.matched = allStats.filter(c => c.status === 'MATCHED').length;
        summary.unmatched = allStats.filter(c => c.status === 'PENDING').length;
        summary.issues = allStats.filter(c => ['MISMATCH', 'FAILED', 'ESCALATED', 'INVESTIGATING'].includes(c.status)).length;
        
        allStats.filter(c => c.status === 'MISMATCH').forEach(c => {
          summary.mismatchAmount += Math.abs(Number(c.difference_amount) || 0);
        });

        if (summary.totalPayments > 0) {
          summary.reconciliationRate = Number(((summary.matched / summary.totalPayments) * 100).toFixed(1));
        }
      }

      return {
        summary,
        data: cases.map(c => ({
          id: c.case_number,
          txnId: c.transaction_reference,
          ledgerBatchId: c.ledger_batch_id,
          expectedAmount: c.expected_amount,
          actualAmount: c.actual_amount,
          difference: c.difference_amount,
          status: c.status,
          riskScore: c.risk_score,
          createdDate: c.created_at
        })),
        pagination: {
          total: count || 0,
          page,
          limit
        }
      };
    } catch (error: any) {
      console.error('[ReconciliationService] getReport error:', error);
      throw error;
    }
  }

  // ==== Detail Subtabs ====
  
  static async getDetails(caseNumber: string) {
    const { data } = await supabase.from('reconciliation_cases').select('*').eq('case_number', caseNumber).single();
    if (!data) throw new Error('Reconciliation case not found');
    return {
      overview: {
        expectedAmount: data.expected_amount,
        actualAmount: data.actual_amount,
        difference: data.difference_amount,
        priority: data.severity === 'CRITICAL' ? 'High' : 'Normal',
        riskRating: data.risk_score > 80 ? 'Elevated' : 'Standard',
        assignedTo: data.assigned_to || 'Unassigned',
      },
      flow: {
        origin: data.wallet_id || data.card_id || 'Unknown Source',
        provider: data.provider_reference ? 'Payment Gateway' : 'System',
        target: data.ledger_batch_id ? 'Master Ledger' : 'Pending'
      }
    };
  }

  static async getLedger(caseNumber: string) {
    const { data: recon } = await supabase.from('reconciliation_cases').select('transaction_reference').eq('case_number', caseNumber).single();
    if (!recon) throw new Error('Case not found');
    const { data: ledgers } = await supabase.from('ledgers').select('*').eq('reference', recon.transaction_reference);
    if (!ledgers || ledgers.length === 0) {
      return { status: 'NO_DATA', message: 'No associated ledger entries found.' };
    }
    return { status: 'OK', data: ledgers };
  }

  static async getSettlement(caseNumber: string) {
    const { data: recon } = await supabase.from('reconciliation_cases').select('settlement_batch_id').eq('case_number', caseNumber).single();
    if (!recon?.settlement_batch_id) {
      return { status: 'NOT_CONFIGURED', message: 'Settlement matching not yet configured for this flow.' };
    }
    return { status: 'OK', data: { batchId: recon.settlement_batch_id } };
  }

  static async getWallet(caseNumber: string) {
    return { status: 'NOT_CONFIGURED', message: 'Wallet telemetry subtab not yet configured.' };
  }

  static async getCard(caseNumber: string) {
    return { status: 'NOT_CONFIGURED', message: 'Card Network integration not yet configured.' };
  }

  static async getBank(caseNumber: string) {
    return { status: 'NOT_CONFIGURED', message: 'Direct bank node integration not yet configured.' };
  }

  static async getAudit(caseNumber: string) {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('target', caseNumber)
      .order('timestamp', { ascending: false });
    
    return { status: 'OK', data: data || [] };
  }

  static async getTimeline(caseNumber: string) {
    const { data: recon } = await supabase.from('reconciliation_cases').select('id').eq('case_number', caseNumber).single();
    if (!recon) throw new Error('Case not found');
    
    const { data: timeline } = await supabase
      .from('reconciliation_timeline')
      .select('*')
      .eq('case_id', recon.id)
      .order('timestamp', { ascending: true });
    
    if (!timeline || timeline.length === 0) {
      return { status: 'NO_DATA', message: 'No timeline events found.' };
    }
    return { status: 'OK', data: timeline };
  }

  // ==== Commands ====

  static async executeCommand(caseNumber: string, command: string, payload: any, user: any) {
    const { data: recon } = await supabase.from('reconciliation_cases').select('*').eq('case_number', caseNumber).single();
    if (!recon) throw new Error('Reconciliation case not found');

    const previousStatus = recon.status;
    let newStatus = previousStatus;
    let updateData: any = { updated_at: new Date().toISOString() };

    switch (command) {
      case 'ASSIGN':
        updateData.assigned_to = payload.assigneeId;
        updateData.status = 'INVESTIGATING';
        newStatus = 'INVESTIGATING';
        break;
      case 'ESCALATE':
        updateData.status = 'ESCALATED';
        updateData.severity = 'CRITICAL';
        newStatus = 'ESCALATED';
        break;
      case 'RESOLVE':
      case 'FORCE_MATCH':
        updateData.status = 'MATCHED';
        updateData.resolved_by = user.id || null;
        updateData.resolved_at = new Date().toISOString();
        newStatus = 'MATCHED';
        break;
      case 'RETRY':
        updateData.status = 'PENDING';
        newStatus = 'PENDING';
        // A real system would trigger an async job here
        break;
      case 'LOCK':
        updateData.fraud_flags = [...(recon.fraud_flags || []), 'ADMIN_LOCKED'];
        break;
      case 'UNLOCK':
        updateData.fraud_flags = (recon.fraud_flags || []).filter((f: string) => f !== 'ADMIN_LOCKED');
        break;
      default:
        throw new Error('Unknown command');
    }

    // Update DB
    const { error } = await supabase.from('reconciliation_cases').update(updateData).eq('case_number', caseNumber);
    if (error) throw error;

    // Log to Audit
    const correlationId = crypto.randomUUID();
    await GovAuditService.logAction({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      module: 'FINANCIAL',
      action: `RECONCILIATION_${command}`,
      user_email: user.email || 'system@invify.app',
      user_name: user.name || 'System',
      ip_address: payload.ip || '0.0.0.0',
      location: 'System',
      target: caseNumber,
      status: 'success',
      metadata: {
        correlationId,
        previousStatus,
        newStatus,
        reason: payload.reason || 'Admin Command Execution',
        permissionUsed: `reconciliation.${command.toLowerCase()}`
      }
    });

    // We can broadcast WebSocket updates using the central controller if available, 
    // or return the new state to the client which updates optimistically.

    return { success: true, caseNumber, newStatus, correlationId };
  }
}
