export declare class WalletRepository {
    getLedger(agentId: string): Promise<import("@supabase/postgrest-js").PostgrestSingleResponse<any[]>>;
    getWallets(): Promise<import("@supabase/postgrest-js").PostgrestSingleResponse<any[]>>;
}
export declare const walletRepository: WalletRepository;
