"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletRepository = exports.WalletRepository = void 0;
const supabase_1 = require("../../../db/supabase");
class WalletRepository {
    async getLedger(agentId) { return supabase_1.supabase.from('wallet_ledger').select('*').eq('agent_id', agentId); }
    async getWallets() { return supabase_1.supabase.from('agent_wallets').select('*'); }
}
exports.WalletRepository = WalletRepository;
exports.walletRepository = new WalletRepository();
//# sourceMappingURL=wallet.repository.js.map