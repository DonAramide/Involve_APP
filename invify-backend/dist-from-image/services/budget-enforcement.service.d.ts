export declare class BudgetEnforcementService {
    /**
     * Checks if a campaign or global budget has enough remaining balance.
     */
    static checkBudget(budgetId: string, requiredAmount: number): Promise<boolean>;
    /**
     * Consumes a specific amount from a budget. Should be wrapped in an atomic transaction ideally,
     * but using Supabase rpc for atomic decrement.
     */
    static consumeBudget(budgetId: string, amount: number): Promise<boolean>;
}
