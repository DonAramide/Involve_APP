"use strict";
/**
 * Published HMO catalogue shaping for a bank distribution channel.
 * A plan is distributable only when the plan is active and it has a published version.
 * Draft and retired versions are not offered for new bank activation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BANK_PRICE_POLICY_MESSAGE = void 0;
exports.shapePublishedCatalogue = shapePublishedCatalogue;
exports.filterCatalogue = filterCatalogue;
exports.paginate = paginate;
exports.catalogueCategories = catalogueCategories;
exports.offeringViews = offeringViews;
const finance_summary_1 = require("./finance-summary");
exports.BANK_PRICE_POLICY_MESSAGE = 'Platform reference prices are the published premium_minor values. No minimum, maximum, or permitted bank adjustment is stored, so a bank price is not accepted.';
function providerOf(row) {
    const raw = row?.hw_providers;
    return Array.isArray(raw) ? raw[0] : raw;
}
function publishedVersion(row) {
    if (!row || row.status !== 'published')
        return null;
    const premiumMinor = (0, finance_summary_1.integerMinor)(row.premium_minor);
    if (premiumMinor === null || premiumMinor < 0)
        return null;
    const categories = Array.isArray(row.member_categories) ? row.member_categories.map(String) : [];
    return {
        versionId: String(row.id),
        version: Number(row.version),
        premiumMinor,
        currency: String(row.currency || 'NGN'),
        billingFrequency: String(row.billing_frequency || ''),
        memberCategories: categories,
        benefits: row.benefits ?? [],
        exclusions: row.exclusions ?? [],
        eligibilityRules: row.eligibility_rules ?? {},
        effectiveFrom: row.effective_from || null,
        effectiveTo: row.effective_to || null,
        publishedAt: row.published_at || null,
    };
}
function shapePublishedCatalogue(rows) {
    const plans = [];
    for (const row of rows || []) {
        if (!row || row.status !== 'active')
            continue;
        const provider = providerOf(row);
        if (!provider?.id || !provider.display_name)
            continue;
        const versions = (Array.isArray(row.hw_plan_versions) ? row.hw_plan_versions : [])
            .map(publishedVersion)
            .filter((version) => Boolean(version))
            .sort((a, b) => b.version - a.version);
        if (versions.length === 0)
            continue;
        plans.push({
            planId: String(row.id),
            planCode: String(row.code || ''),
            planName: String(row.name || ''),
            providerId: String(provider.id),
            providerCode: String(provider.code || ''),
            providerName: String(provider.display_name),
            licenceReference: provider.licence_reference || null,
            integrationStatus: provider.integration_status || null,
            versions,
        });
    }
    return plans.sort((a, b) => a.providerName.localeCompare(b.providerName) || a.planName.localeCompare(b.planName));
}
function filterCatalogue(plans, search) {
    const needle = String(search || '').replace(/[%_\\]/g, '').trim().toLowerCase().slice(0, 64);
    if (!needle)
        return plans;
    return plans.filter((plan) => {
        const haystack = [
            plan.providerName,
            plan.providerCode,
            plan.planName,
            plan.planCode,
            ...plan.versions.flatMap((version) => version.memberCategories),
        ].join(' ').toLowerCase();
        return haystack.includes(needle);
    });
}
function paginate(rows, pageInput, limitInput) {
    const page = Math.max(1, Number(pageInput) || 1);
    const limit = Math.min(50, Math.max(1, Number(limitInput) || 20));
    const start = (page - 1) * limit;
    return {
        page,
        limit,
        total: rows.length,
        data: rows.slice(start, start + limit),
    };
}
function catalogueCategories(plans) {
    const counts = new Map();
    for (const plan of plans) {
        const seen = new Set();
        for (const version of plan.versions) {
            for (const category of version.memberCategories) {
                if (seen.has(category))
                    continue;
                seen.add(category);
                counts.set(category, (counts.get(category) || 0) + 1);
            }
        }
    }
    return Array.from(counts.entries())
        .map(([category, planCount]) => ({ category, planCount }))
        .sort((a, b) => a.category.localeCompare(b.category));
}
function offeringViews(plans, owned = []) {
    const byVersion = new Map();
    for (const row of owned || []) {
        const versionId = String(row.planVersionId || row.plan_version_id || '');
        if (!versionId)
            continue;
        byVersion.set(versionId, { id: row.id ? String(row.id) : null, isActive: Boolean(row.isActive ?? row.is_active) });
    }
    const rows = [];
    for (const plan of plans) {
        for (const version of plan.versions) {
            const ownedRow = byVersion.get(version.versionId);
            rows.push({
                planId: plan.planId,
                planCode: plan.planCode,
                planName: plan.planName,
                providerId: plan.providerId,
                providerName: plan.providerName,
                versionId: version.versionId,
                version: version.version,
                publicationStatus: 'published',
                memberCategories: version.memberCategories,
                benefits: version.benefits,
                exclusions: version.exclusions,
                referencePremiumMinor: version.premiumMinor,
                currency: version.currency,
                bankPriceMinor: null,
                offeringId: ownedRow?.id || null,
                offeringStatus: !ownedRow ? 'not_offered' : (ownedRow.isActive ? 'active' : 'inactive'),
                activeForBank: Boolean(ownedRow?.isActive),
            });
        }
    }
    return rows;
}
//# sourceMappingURL=bank-hmo-catalogue.js.map