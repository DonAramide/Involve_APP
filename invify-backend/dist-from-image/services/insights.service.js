"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightsService = void 0;
// src/services/insights.service.ts
const supabase_1 = require("../db/supabase");
class InsightsService {
    /**
     * Generates actionable insights for a specific class.
     */
    static async getClassInsights(tenantId, classLevel) {
        const { data: rawStats, error } = await supabase_1.supabase.rpc('get_class_engagement_stats', {
            p_tenant_id: tenantId,
            p_class_level: classLevel
        });
        if (error)
            throw error;
        if (!rawStats)
            return null;
        const insights = [];
        // 1. Attendance Drop Alert (15% drop logic)
        const trend = rawStats.attendance_trend || [];
        if (trend.length >= 2) {
            const todayRate = trend[trend.length - 1].rate;
            const avgPrevious = trend.slice(0, trend.length - 1).reduce((acc, val) => acc + val.rate, 0) / (trend.length - 1);
            if (avgPrevious - todayRate >= 15) {
                const dropDate = new Date(trend[trend.length - 1].date);
                const dayName = dropDate.toLocaleDateString(undefined, { weekday: 'long' });
                insights.push({
                    type: 'warning',
                    icon: 'trending_down',
                    message: `Attendance dropped significantly on ${dayName} (${Math.round(todayRate)}% vs ${Math.round(avgPrevious)}% avg).`
                });
            }
        }
        // 2. Frequent Absentees
        const absentees = rawStats.frequent_absentees || [];
        if (absentees.length > 0) {
            insights.push({
                type: 'danger',
                icon: 'group_remove',
                message: `${absentees.length} student(s) frequently absent. Highest: ${absentees[0].full_name} (${absentees[0].absence_count} absences).`
            });
        }
        // 3. Curriculum Coverage (Assuming week 5 currently for MVP logic if we can't infer it, or just plain relative tracking)
        // We could just report the max week:
        const coverage = rawStats.core_coverage || [];
        for (const cov of coverage) {
            // Just an example static check: if they are behind week 4
            // A better dynamic way would be comparing across subjects or to calendar
            // For MVP: simply report the current status.
            if (cov.weeks_completed < 3) {
                insights.push({
                    type: 'info',
                    icon: 'menu_book',
                    message: `You are only on Week ${cov.weeks_completed} for ${cov.subject}. Try generating the next lesson.`
                });
            }
            else {
                insights.push({
                    type: 'success',
                    icon: 'check_circle',
                    message: `Great progress in ${cov.subject} (Week ${cov.weeks_completed} completed).`
                });
            }
        }
        // Fallback positive nudge
        if (insights.length === 0) {
            insights.push({
                type: 'success',
                icon: 'stars',
                message: 'Class attendance and lesson generation are looking stable.'
            });
        }
        return {
            stats: rawStats,
            messages: insights
        };
    }
}
exports.InsightsService = InsightsService;
//# sourceMappingURL=insights.service.js.map