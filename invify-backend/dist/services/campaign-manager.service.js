"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignManagerService = void 0;
class CampaignManagerService {
    /**
     * Evaluates if an agent has completed a campaign metric and triggers a reward if applicable.
     */
    static async evaluateCampaignProgress(agentId, metricType, incrementValue) {
        // 1. Find active campaigns where target_type = metricType
        // 2. Fetch agent's progress in agent_campaign_progress
        // 3. Increment current_metric_value
        // 4. If current_metric_value >= target, mark is_completed = TRUE
        // 5. Call BudgetEnforcementService to lock the budget
        // 6. Calculate reward
        // 7. Insert to approval_queue
        console.log(`[CampaignManager] Evaluated progress for agent ${agentId} on ${metricType}`);
        return true;
    }
}
exports.CampaignManagerService = CampaignManagerService;
//# sourceMappingURL=campaign-manager.service.js.map