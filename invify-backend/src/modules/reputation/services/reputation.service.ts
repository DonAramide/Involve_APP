import { supabase } from '../../../db/supabase';

const RUBRIC: Record<string, number> = {
  'TENANT_ACTIVATED': 100,
  'CERTIFICATION_EARNED': 50,
  'SUPPORT_TICKET_SLA_BREACH': -50,
  'CLAWBACK_PENALTY': -100,
  'MERCHANT_FEEDBACK': 20,
  'REPUTATION_DECAY': -10
};

function calculateTier(score: number): 'NOVICE' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' {
  if (score >= 2000) return 'DIAMOND';
  if (score >= 1000) return 'PLATINUM';
  if (score >= 600) return 'GOLD';
  if (score >= 300) return 'SILVER';
  if (score >= 100) return 'BRONZE';
  return 'NOVICE';
}

export class ReputationService {
  async processEvent(eventType: string, referenceId: string | null, agentId: string) {
    try {
      console.log(`[ReputationService] Processing event ${eventType} for agent ${agentId}`);

      // 1. Idempotency Check (if referenceId is provided)
      if (referenceId) {
        const { data: existingLog, error: checkError } = await supabase
          .from('reputation_audit_logs')
          .select('id')
          .eq('agent_id', agentId)
          .eq('event_type', eventType)
          .eq('reference_id', referenceId)
          .maybeSingle();

        if (existingLog) {
          console.log(`[ReputationService] Event ${eventType} for reference ${referenceId} already processed. Skipping.`);
          return;
        }
      }

      // 2. Calculate points delta based on rubric
      const delta = RUBRIC[eventType] || 0;
      if (delta === 0) {
        console.warn(`[ReputationService] No points delta mapped for event type: ${eventType}`);
      }

      // 3. Fetch current reputation score
      let previousScore = 0;
      const { data: currentRep, error: repError } = await supabase
        .from('agent_reputations')
        .select('*')
        .eq('agent_id', agentId)
        .maybeSingle();

      if (currentRep) {
        previousScore = currentRep.score || 0;
      } else {
        // Create an initial record if not exists
        const { error: insertError } = await supabase
          .from('agent_reputations')
          .insert({
            agent_id: agentId,
            score: 0,
            tier: 'NOVICE'
          });
        if (insertError) {
          console.error('[ReputationService] Failed to insert initial reputation:', insertError.message);
        }
      }

      // 4. Calculate new score (Validate CHECK(score >= 0))
      let newScore = previousScore + delta;
      if (newScore < 0) {
        newScore = 0; // CHECK constraint protection
      }

      const newTier = calculateTier(newScore);

      // 5. Update agent_reputations and tier calculations
      const { error: updateError } = await supabase
        .from('agent_reputations')
        .upsert({
          agent_id: agentId,
          score: newScore,
          tier: newTier,
          last_calculated_at: new Date().toISOString()
        });

      if (updateError) {
        throw new Error(`Failed to update agent reputation: ${updateError.message}`);
      }

      // Also sync score and tier back to the main agents table if it has those fields
      try {
        await supabase
          .from('agents')
          .update({
            points: newScore
          })
          .eq('id', agentId);
      } catch (agentsSyncErr: any) {
        console.warn('[ReputationService] Could not sync score back to agents table:', agentsSyncErr.message);
      }

      // 6. Log to reputation_audit_logs
      const { error: logError } = await supabase
        .from('reputation_audit_logs')
        .insert({
          agent_id: agentId,
          event_type: eventType,
          reference_id: referenceId,
          points_delta: delta,
          previous_score: previousScore,
          new_score: newScore,
          reason: `Reputation updated due to ${eventType}`
        });

      if (logError) {
        console.error('[ReputationService] Failed to write audit log:', logError.message);
      }

      console.log(`[ReputationService] Reputation updated successfully for agent ${agentId}. Score: ${previousScore} -> ${newScore} (${newTier})`);

    } catch (err: any) {
      console.error('[ReputationService] processEvent Error:', err.message);
      throw err;
    }
  }
}

export const reputationService = new ReputationService();
