import { supabase } from '../../../db/supabase';
export class WalletRepository {
  async getLedger(agentId: string) { return supabase.from('wallet_ledger').select('*').eq('agent_id', agentId); }
  async getWallets() { return supabase.from('agent_wallets').select('*'); }
}
export const walletRepository = new WalletRepository();
