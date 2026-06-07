import { supabaseAdmin } from '../db/supabase';

export class AnalyticsRefreshWorker {
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  public start() {
    if (this.intervalId) return;
    console.log('[AnalyticsRefreshWorker] Starting background worker...');
    
    // Check immediately, then every 5 minutes (300,000 ms)
    this.processQueue();
    this.intervalId = setInterval(() => this.processQueue(), 5 * 60 * 1000);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private async processQueue() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      // 1. Check if there is any pending refresh request in analytics_refresh_queue
      const { data: queueItems, error: queueError } = await supabaseAdmin
        .from('analytics_refresh_queue')
        .select('*')
        .eq('status', 'PENDING')
        .limit(1);

      if (queueError) {
        console.error('[AnalyticsRefreshWorker] Error checking queue:', queueError);
        return;
      }

      if (!queueItems || queueItems.length === 0) {
        // No refresh needed
        return;
      }

      console.log('[AnalyticsRefreshWorker] Found pending refresh request. Executing refresh_analytics_mvs()...');

      // 2. Execute RPC
      const startTime = Date.now();
      const { error: rpcError } = await supabaseAdmin.rpc('refresh_analytics_mvs');

      const durationMs = Date.now() - startTime;

      if (rpcError) {
        console.error('[AnalyticsRefreshWorker] Failed to refresh views:', rpcError);
        // We log failure but might leave it pending or mark failed based on policy.
        // Let's mark failed and log it.
        await this.logRefreshResult('FAILED', durationMs, rpcError.message);
        
        // Mark queue items as failed
        await supabaseAdmin
          .from('analytics_refresh_queue')
          .update({ status: 'FAILED', processed_at: new Date().toISOString() })
          .eq('status', 'PENDING');
        return;
      }

      // 3. Mark queue items as processed
      await supabaseAdmin
        .from('analytics_refresh_queue')
        .update({ status: 'COMPLETED', processed_at: new Date().toISOString() })
        .eq('status', 'PENDING');

      // 4. Log to analytics_refresh_log
      await this.logRefreshResult('SUCCESS', durationMs);
      
      console.log(`[AnalyticsRefreshWorker] Refresh completed successfully in ${durationMs}ms`);

    } catch (err) {
      console.error('[AnalyticsRefreshWorker] Unexpected error in worker:', err);
    } finally {
      this.isRunning = false;
    }
  }

  private async logRefreshResult(status: string, durationMs: number, errorMessage?: string) {
    try {
      const { error } = await supabaseAdmin.from('analytics_refresh_log').insert({
        status,
        duration_ms: durationMs,
        error_message: errorMessage || null,
        executed_at: new Date().toISOString()
      });
      if (error) {
        console.error('[AnalyticsRefreshWorker] Supabase error writing to log:', error);
      }
    } catch (e) {
      console.error('[AnalyticsRefreshWorker] Exception writing to log:', e);
    }
  }
}

// Singleton instance
export const analyticsRefreshWorker = new AnalyticsRefreshWorker();
