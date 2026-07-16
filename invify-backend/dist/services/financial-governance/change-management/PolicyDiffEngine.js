"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyDiffEngine = void 0;
function formatValue(v) {
    if (typeof v === 'number') {
        return v >= 1_000_000
            ? `₦${(v / 1_000_000).toFixed(1)}M`
            : v >= 1_000
                ? `₦${(v / 1_000).toFixed(0)}K`
                : String(v);
    }
    if (Array.isArray(v))
        return `[${v.join(', ')}]`;
    if (typeof v === 'object' && v !== null)
        return JSON.stringify(v);
    return String(v);
}
function pctDelta(oldVal, newVal) {
    if (oldVal === 0)
        return newVal === 0 ? 0 : 100;
    return Math.round(((newVal - oldVal) / Math.abs(oldVal)) * 100);
}
class PolicyDiffEngine {
    static diff(oldPolicy, newPolicy) {
        const oldData = oldPolicy.data;
        const newData = newPolicy.data;
        const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
        const fields = [];
        for (const key of allKeys) {
            const oldVal = oldData[key];
            const newVal = newData[key];
            if (!(key in oldData)) {
                fields.push({
                    field: key,
                    changeType: 'ADDED',
                    oldValue: undefined,
                    newValue: newVal,
                    percentageDelta: null,
                    humanReadable: `+ ${key}: (new) → ${formatValue(newVal)}`,
                });
            }
            else if (!(key in newData)) {
                fields.push({
                    field: key,
                    changeType: 'REMOVED',
                    oldValue: oldVal,
                    newValue: undefined,
                    percentageDelta: null,
                    humanReadable: `- ${key}: ${formatValue(oldVal)} → (removed)`,
                });
            }
            else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                const pct = typeof oldVal === 'number' && typeof newVal === 'number'
                    ? pctDelta(oldVal, newVal) : null;
                const pctStr = pct !== null ? ` (${pct > 0 ? '+' : ''}${pct}%)` : '';
                fields.push({
                    field: key,
                    changeType: 'MODIFIED',
                    oldValue: oldVal,
                    newValue: newVal,
                    percentageDelta: pct,
                    humanReadable: `~ ${key}: ${formatValue(oldVal)} → ${formatValue(newVal)}${pctStr}`,
                });
            }
        }
        const totalChanges = fields.filter((f) => f.changeType !== 'UNCHANGED').length;
        const hasBreakingChanges = fields.some((f) => f.changeType === 'REMOVED' || (f.percentageDelta !== null && Math.abs(f.percentageDelta) >= 50));
        return {
            policyType: oldPolicy.type,
            fromVersion: oldPolicy.version,
            toVersion: newPolicy.version,
            fromPolicyId: oldPolicy.id,
            toPolicyId: newPolicy.id,
            fields,
            totalChanges,
            hasBreakingChanges,
            summary: `${totalChanges} field(s) changed between V${oldPolicy.version} and V${newPolicy.version}.` +
                (hasBreakingChanges ? ' ⚠️ Breaking changes detected.' : ' ✅ No breaking changes.'),
            generatedAt: new Date().toISOString(),
        };
    }
}
exports.PolicyDiffEngine = PolicyDiffEngine;
//# sourceMappingURL=PolicyDiffEngine.js.map