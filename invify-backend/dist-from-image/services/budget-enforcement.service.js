"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetEnforcementService = void 0;
const supabase_1 = require("../db/supabase");
class BudgetEnforcementService {
    /**
     * Checks if a campaign or global budget has enough remaining balance.
     */
    static async checkBudget(budgetId, requiredAmount) {
        const { data: budget, error } = await supabase_1.supabaseAdmin
            .from('commission_budgets')
            .select('remaining_amount, total_amount, used_amount')
            .eq('id', budgetId)
            .single();
        if (error || !budget) {
            console.error('[BudgetEnforcement] Failed to lookup budget:', budgetId);
            return false;
        }
        if (budget.remaining_amount < requiredAmount) {
            console.warn(`[BudgetEnforcement] Budget ${budgetId} exceeded. Remaining: ${budget.remaining_amount}, Required: ${requiredAmount}`);
            return false;
        }
        return true;
    }
    /**
     * Consumes a specific amount from a budget. Should be wrapped in an atomic transaction ideally,
     * but using Supabase rpc for atomic decrement.
     */
    static async consumeBudget(budgetId, amount) {
        // Assuming we create an RPC 'consume_commission_budget' in Phase 1 SQL
        const { data, error } = await supabase_1.supabaseAdmin.rpc('consume_commission_budget', {
            p_budget_id: budgetId,
            p_amount: amount
        });
        if (error) {
            console.error('[BudgetEnforcement] Failed to consume budget:', error);
            return false;
        }
        return data === true;
    }
}
exports.BudgetEnforcementService = BudgetEnforcementService;
//# sourceMappingURL=budget-enforcement.service.js.map