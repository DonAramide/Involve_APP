import { supabaseAdmin } from '../db/supabase';
import { RoutingEngineService } from './routing-engine.service';
import { BankingGatewayService } from './banking-gateway.service';
import { QuasarEventGatewayService } from './quasar-event-gateway.service';
import * as crypto from 'crypto';
import { FinancialVerificationEngine } from './financial-verification/FinancialVerificationEngine';
import { VerificationContext } from './financial-verification/shared/VerificationContext';

export class TransferOrchestrator {
  private static locks: Map<string, { expiresAt: number; timer: NodeJS.Timeout }> = new Map();
  private static verificationEngine = new FinancialVerificationEngine();

  /**
   * Acquire a simulated distributed execution lock with a heartbeat renewal
   */
  static async acquireExecutionLock(lockKey: string): Promise<boolean> {
    const now = Date.now();
    const existing = this.locks.get(lockKey);
    
    if (existing && existing.expiresAt > now) {
      return false; // Lock is already held
    }

    // Set lock with 120s TTL
    const expiresAt = now + 120 * 1000;
    
    // Heartbeat renewal timer every 30 seconds
    const timer = setInterval(() => {
      const lock = this.locks.get(lockKey);
      if (lock) {
        lock.expiresAt = Date.now() + 120 * 1000;
      }
    }, 30 * 1000);

    this.locks.set(lockKey, { expiresAt, timer });
    return true;
  }

  static releaseExecutionLock(lockKey: string) {
    const existing = this.locks.get(lockKey);
    if (existing) {
      clearInterval(existing.timer);
      this.locks.delete(lockKey);
    }
  }

  static async initiateTransfer(params: {
    tenantId: string;
    userId: string;
    beneficiaryId: string;
    amount: number;
    fee: number;
    beneficiaryBankCode: string;
    beneficiaryAccountNumber: string;
  }): Promise<{ transferLogId: string; status: string; provider: string }> {
    const lockKey = `lock:transfer:${params.tenantId}:${params.beneficiaryAccountNumber}`;
    
    // 1. Acquire Lock
    const acquired = await this.acquireExecutionLock(lockKey);
    if (!acquired) {
      throw new Error('Lock acquisition failed. A transaction for this account is already in progress.');
    }

    try {
      const excludeList: string[] = [];

      // 2. Select initial optimal provider
      let provider = await RoutingEngineService.selectOptimalProvider({
        requiredCapability: 'supports_nip_transfer',
        amount: params.amount,
        excludeProviders: excludeList
      });

      // 3. Register baseline financial event
      const eventId = crypto.randomUUID();
      const reference = `REF_TX_${Date.now()}`;
      await supabaseAdmin.from('financial_events').insert({
        id: eventId,
        event_type: 'PAYOUT_WITHDRAWAL',
        state: 'INITIALIZED',
        reference,
        tenant_id: params.tenantId,
        created_by: params.userId
      });

      // 4. Create base transfer log
      const { data: log, error: logErr } = await supabaseAdmin
        .from('bank_transfer_logs')
        .insert({
          tenant_id: params.tenantId,
          financial_event_id: eventId,
          beneficiary_id: params.beneficiaryId,
          provider: provider,
          amount: params.amount,
          fee_amount: params.fee,
          net_amount: params.amount - params.fee,
          status: 'PENDING'
        })
        .select()
        .single();

      if (logErr || !log) {
        throw new Error(`Failed to create transfer logs: ${logErr?.message}`);
      }

      // ==========================================
      // INVIFY INDEPENDENT FINANCIAL VERIFICATION
      // ==========================================
      const { data: initialReq } = await supabaseAdmin
        .from('quasar_verification_requests')
        .select('*')
        .eq('financial_event_id', eventId)
        .maybeSingle();

      const verificationContext = new VerificationContext({
        tenantId: params.tenantId,
        amount: params.amount,
        currency: 'NGN',
        financialEventId: eventId,
        beneficiaryAccountNumber: params.beneficiaryAccountNumber,
        beneficiaryBankCode: params.beneficiaryBankCode,
        provider: provider,
        metadata: {
          nonce: initialReq?.nonce,
          signature: initialReq?.signed_token,
          test_force_liquidity_fail: initialReq?.signed_token === 'force_liquidity_fail'
        }
      });

      const { verdict } = await this.verificationEngine.execute(
        verificationContext,
        'Banking',
        'WITHDRAWAL'
      );

      if (!verdict.passed || verdict.decision !== 'ALLOW') {
        throw new Error(`Invify Verification Rejected: ${verdict.errors.join(', ')}`);
      }

      // ==========================================
      // QUASAR FINANCIAL AUTHORITY AUTHORIZATION CHECK
      // ==========================================
      const { data: request } = await supabaseAdmin
        .from('quasar_verification_requests')
        .select('id')
        .eq('financial_event_id', eventId)
        .maybeSingle();

      if (!request) {
        throw new Error('Quasar Verification Request not found for this transaction.');
      }

      const { data: result, error: resErr } = await supabaseAdmin
        .from('quasar_verification_results')
        .select('*')
        .eq('verification_request_id', request.id)
        .eq('result_status', 'VERIFIED')
        .eq('decision_type', 'APPROVED')
        .is('consumed_at', null)
        .maybeSingle();

      if (resErr || !result) {
        throw new Error('Quasar Authorization has not been approved or is already consumed.');
      }

      // Consume authorization token atomically to prevent double spend/replay
      const { data: consumedResult, error: consumeErr } = await supabaseAdmin
        .from('quasar_verification_results')
        .update({ 
          consumed_at: new Date().toISOString(),
          execution_reference: eventId
        })
        .eq('id', result.id)
        .is('consumed_at', null)
        .select();

      if (consumeErr || !consumedResult || consumedResult.length === 0) {
        throw new Error('Quasar Authorization token has already been consumed.');
      }

      let currentProvider = provider;
      let attemptNumber = 1;
      let executionStatus = 'PENDING';
      let lastProviderReference = '';

      // 5. Transfer execution attempt loop (with failover engine logic)
      while (attemptNumber <= 3) {
        const attemptRef = `ref_att_${currentProvider}_${Date.now()}`;
        
        // Log attempt registry entry
        await supabaseAdmin.from('bank_transfer_attempts').insert({
          transfer_log_id: log.id,
          attempt_number: attemptNumber,
          provider: currentProvider,
          provider_reference: attemptRef,
          status: 'ATTEMPT_PENDING'
        });

        try {
          const adapter = BankingGatewayService.getAdapter(currentProvider as any);
          const response = await adapter.executeTransfer({
            transferLogId: log.id,
            amount: params.amount,
            fee: params.fee,
            beneficiaryBankCode: params.beneficiaryBankCode,
            beneficiaryAccountNumber: params.beneficiaryAccountNumber,
            financialEventId: eventId
          });

          // Evaluate result
          if (response.status === 'SUCCESS') {
            await supabaseAdmin.from('bank_transfer_attempts')
              .update({ status: 'ATTEMPT_SUCCESS' })
              .eq('transfer_log_id', log.id)
              .eq('attempt_number', attemptNumber);

            await supabaseAdmin.from('bank_transfer_logs')
              .update({ status: 'SUCCESS' })
              .eq('id', log.id);

            lastProviderReference = response.providerReference;
            executionStatus = 'SUCCESS';
            break;
          } else {
            throw new Error(`Provider execution returned status: ${response.status}`);
          }

        } catch (err: any) {
          // Record failed attempt
          await supabaseAdmin.from('bank_transfer_attempts')
            .update({ status: 'ATTEMPT_FAILED', error_message: err.message })
            .eq('transfer_log_id', log.id)
            .eq('attempt_number', attemptNumber);

          // Add to exclusions to prevent loop trap
          excludeList.push(currentProvider);

          // Trip health evaluations
          await supabaseAdmin.rpc('evaluate_provider_health', {
            p_provider: currentProvider,
            p_has_failed: true,
            p_latency_ms: 10000
          });

          // Trigger Failover logic to select next provider
          attemptNumber++;
          if (attemptNumber <= 3) {
            try {
              currentProvider = await RoutingEngineService.selectOptimalProvider({
                requiredCapability: 'supports_nip_transfer',
                amount: params.amount,
                excludeProviders: excludeList
              });
              
              // Switch provider on transfer log
              await supabaseAdmin.from('bank_transfer_logs')
                .update({ provider: currentProvider })
                .eq('id', log.id);

            } catch (failoverErr) {
              break;
            }
          }
        }
      }

      // Publish status and trigger journal entries in Quasar Event Gateway
      if (executionStatus === 'SUCCESS') {
        await QuasarEventGatewayService.publishOutboundExecution({
          transferLogId: log.id,
          financialEventId: eventId,
          tenantId: params.tenantId,
          amount: params.amount,
          fee: params.fee,
          reference,
          status: 'SUCCESS',
          provider: currentProvider,
          providerReference: lastProviderReference
        });
      } else {
        await supabaseAdmin.from('bank_transfer_logs')
          .update({ status: 'FAILED' })
          .eq('id', log.id);
        executionStatus = 'FAILED';

        await QuasarEventGatewayService.publishOutboundExecution({
          transferLogId: log.id,
          financialEventId: eventId,
          tenantId: params.tenantId,
          amount: params.amount,
          fee: params.fee,
          reference,
          status: 'FAILED',
          provider: currentProvider,
          providerReference: `REF_ERR_${log.id}`
        });
      }

      return {
        transferLogId: log.id,
        status: executionStatus,
        provider: currentProvider
      };

    } finally {
      this.releaseExecutionLock(lockKey);
    }
  }
}
