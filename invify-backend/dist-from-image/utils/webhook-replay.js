"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookReplayUtility = void 0;
const supabase_1 = require("../db/supabase");
const http_client_1 = require("./http-client");
/**
 * Utility to replay webhooks that failed and were persisted in the Dead Letter Queue.
 */
class WebhookReplayUtility {
    static async replayPending(batchSize = 100) {
        console.log(`[Webhook Replay] Starting replay for up to ${batchSize} pending events...`);
        const { data: events, error } = await supabase_1.supabase
            .from('webhook_dead_letters')
            .select('*')
            .eq('status', 'PENDING')
            .order('created_at', { ascending: true })
            .limit(batchSize);
        if (error || !events || events.length === 0) {
            console.log(`[Webhook Replay] No pending webhooks found.`);
            return;
        }
        console.log(`[Webhook Replay] Found ${events.length} webhooks to replay.`);
        const client = new http_client_1.EnterpriseHttpClient({ providerName: 'WebhookReplayUtility' });
        for (const event of events) {
            console.log(`[Webhook Replay] Replaying event ID ${event.id} to ${event.provider}`);
            try {
                // Construct standard local URL or forward to internal processing
                const baseUrl = process.env.BASE_URL || 'http://localhost:3004';
                const url = `${baseUrl}${event.endpoint}`;
                // Send internally (we assume signatures are bypassed or we reconstruct headers if needed, 
                // but typically a replay hits a specific internal endpoint or resends exactly)
                // For RC1, we hit the endpoint. If HMAC validation fails, we should actually process it directly 
                // via controllers. Since this is an internal replay, we might need a dedicated bypass.
                // For now, this is a placeholder implementation.
                await client.post(url, event.payload, {
                    headers: {
                        'x-replay-auth': process.env.REPLAY_SECRET || 'secret'
                        // In a full implementation, we'd restore original HMAC headers or bypass auth for internal replay requests
                    }
                });
                // Mark as REPLAYED
                await supabase_1.supabase
                    .from('webhook_dead_letters')
                    .update({ status: 'REPLAYED', last_retry_at: new Date().toISOString() })
                    .eq('id', event.id);
                console.log(`[Webhook Replay] Successfully replayed ID ${event.id}`);
            }
            catch (err) {
                console.error(`[Webhook Replay] Failed to replay ID ${event.id}:`, err.message);
                const newRetryCount = (event.retry_count || 0) + 1;
                const newStatus = newRetryCount >= 3 ? 'FAILED' : 'PENDING';
                await supabase_1.supabase
                    .from('webhook_dead_letters')
                    .update({
                    retry_count: newRetryCount,
                    status: newStatus,
                    error_message: err.message,
                    last_retry_at: new Date().toISOString()
                })
                    .eq('id', event.id);
            }
        }
        console.log(`[Webhook Replay] Replay batch complete.`);
    }
}
exports.WebhookReplayUtility = WebhookReplayUtility;
//# sourceMappingURL=webhook-replay.js.map