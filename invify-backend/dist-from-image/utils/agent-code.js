"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INVIFY_DEFAULT_AGENT_CODE = void 0;
exports.normalizeAgentCode = normalizeAgentCode;
exports.isInvifyDefaultAgentCode = isInvifyDefaultAgentCode;
exports.isValidAgentCodeFormat = isValidAgentCodeFormat;
exports.lookupAgentCode = lookupAgentCode;
const supabase_1 = require("../db/supabase");
exports.INVIFY_DEFAULT_AGENT_CODE = 'AAA000';
const INACTIVE_STATUSES = new Set(['SUSPENDED', 'TERMINATED']);
function normalizeAgentCode(raw) {
    return String(raw || '').trim().toUpperCase();
}
function isInvifyDefaultAgentCode(code) {
    return normalizeAgentCode(code) === exports.INVIFY_DEFAULT_AGENT_CODE;
}
function isValidAgentCodeFormat(code) {
    return /^[A-Z0-9-]{3,20}$/.test(code);
}
function isMissingTableError(error, tableName) {
    const code = String(error?.code || '');
    const message = String(error?.message || '');
    if (code === 'PGRST205' || code === '42P01' || /schema cache/i.test(message)) {
        return true;
    }
    if (tableName) {
        const regex = new RegExp(`(Could not find the table|relation)\\s+['"]?(public\\.)?${tableName}['"]?`, 'i');
        return regex.test(message);
    }
    return /does not exist/i.test(message);
}
function defaultInvifyLookup(code) {
    return {
        valid: true,
        exists: true,
        isDefault: true,
        code,
        agentName: 'Invify',
        status: 'ACTIVE',
        institutionId: null,
        institutionType: 'INVIFY_DEFAULT',
        hmoProviderId: null,
        hmoProviderCode: null,
        hmoProviderName: null,
        hmoAssignmentMode: 'SELECTABLE',
        overridePolicy: 'OPEN',
        allowedProviders: [],
    };
}
function missingLookup(code) {
    return {
        valid: false,
        exists: false,
        isDefault: isInvifyDefaultAgentCode(code),
        code,
        error: 'This agent code does not exist',
    };
}
async function resolveAuthoritativeInstitutionCode(code) {
    if (isInvifyDefaultAgentCode(code)) {
        return null;
    }
    try {
        const instBuilder = supabase_1.supabaseAdmin
            .from('institutions')
            .select('id, institution_code, legal_name, display_name, institution_type, status, kyc_status, deleted_at')
            .eq('institution_code', code)
            .is('deleted_at', null);
        if (typeof instBuilder?.maybeSingle !== 'function') {
            return null;
        }
        const { data: inst, error: instError } = await instBuilder.maybeSingle();
        if (instError) {
            if (isMissingTableError(instError, 'institutions')) {
                return null;
            }
            throw instError;
        }
        if (!inst || !inst.institution_code) {
            return null;
        }
        const instStatus = String(inst.status || '').toUpperCase();
        const kycStatus = String(inst.kyc_status || '').toUpperCase();
        const instType = String(inst.institution_type || '').toUpperCase();
        const displayName = String(inst.display_name || inst.legal_name || code).trim();
        if (instStatus !== 'ACTIVE' || kycStatus === 'REJECTED') {
            return {
                valid: false,
                exists: true,
                isDefault: false,
                code,
                agentName: displayName,
                status: instStatus || 'INACTIVE',
                institutionId: inst.id,
                institutionType: instType,
                error: 'This institution is not active',
            };
        }
        // Fetch HEALTH_INSURANCE service policy if configured
        let serviceRow = null;
        try {
            const svcBuilder = supabase_1.supabaseAdmin
                .from('institution_services')
                .select('id, service_type, default_provider, allowed_providers, tenant_override_policy, status')
                .eq('institution_id', inst.id)
                .eq('service_type', 'HEALTH_INSURANCE');
            if (typeof svcBuilder?.maybeSingle === 'function') {
                const { data: svcData } = await svcBuilder.maybeSingle();
                serviceRow = svcData || null;
            }
        }
        catch {
            // Optional service metadata fallback
        }
        if (instType === 'HMO') {
            if (kycStatus && kycStatus !== 'VERIFIED') {
                return {
                    valid: false,
                    exists: true,
                    isDefault: false,
                    code,
                    agentName: displayName,
                    status: instStatus,
                    institutionId: inst.id,
                    institutionType: 'HMO',
                    error: 'This HMO institution is not verified',
                };
            }
            if (serviceRow && String(serviceRow.status || '').toUpperCase() !== 'ACTIVE') {
                return {
                    valid: false,
                    exists: true,
                    isDefault: false,
                    code,
                    agentName: displayName,
                    status: String(serviceRow.status || 'INACTIVE').toUpperCase(),
                    institutionId: inst.id,
                    institutionType: 'HMO',
                    error: 'Health insurance service is not active for this institution',
                };
            }
            // Resolve linked hw_providers record
            let providerRow = null;
            try {
                const byInstBuilder = supabase_1.supabaseAdmin
                    .from('hw_providers')
                    .select('id, code, name, integration_status, institution_id')
                    .eq('institution_id', inst.id);
                if (typeof byInstBuilder?.maybeSingle === 'function') {
                    const { data: byInst } = await byInstBuilder.maybeSingle();
                    providerRow = byInst || null;
                }
                if (!providerRow) {
                    const byCodeBuilder = supabase_1.supabaseAdmin
                        .from('hw_providers')
                        .select('id, code, name, integration_status, institution_id')
                        .eq('code', code.toLowerCase());
                    if (typeof byCodeBuilder?.maybeSingle === 'function') {
                        const { data: byCode } = await byCodeBuilder.maybeSingle();
                        providerRow = byCode || null;
                    }
                }
            }
            catch {
                providerRow = null;
            }
            const providerStatus = String(providerRow?.integration_status || '').toLowerCase();
            if (!providerRow || providerStatus === 'suspended' || providerStatus === 'none') {
                return {
                    valid: false,
                    exists: true,
                    isDefault: false,
                    code,
                    agentName: displayName,
                    status: providerStatus ? providerStatus.toUpperCase() : 'UNAVAILABLE',
                    institutionId: inst.id,
                    institutionType: 'HMO',
                    error: 'This HMO provider is not active',
                };
            }
            const overridePolicy = String(serviceRow?.tenant_override_policy || 'LOCKED').toUpperCase() || 'LOCKED';
            const hmoAssignmentMode = overridePolicy === 'LOCKED' ? 'LOCKED' : 'SELECTABLE';
            const allowedProviders = Array.isArray(serviceRow?.allowed_providers)
                ? serviceRow.allowed_providers.map((p) => String(p).toLowerCase())
                : [String(providerRow.code).toLowerCase()];
            return {
                valid: true,
                exists: true,
                isDefault: false,
                code,
                agentName: displayName || providerRow.name,
                status: 'ACTIVE',
                institutionId: inst.id,
                institutionType: 'HMO',
                hmoProviderId: providerRow.id,
                hmoProviderCode: String(providerRow.code).toLowerCase(),
                hmoProviderName: providerRow.name,
                hmoAssignmentMode,
                overridePolicy,
                allowedProviders,
            };
        }
        // BANK / PAYMENT_PROVIDER / AGGREGATOR institution
        const overridePolicy = serviceRow && String(serviceRow.status || '').toUpperCase() === 'ACTIVE'
            ? String(serviceRow.tenant_override_policy || 'OPEN').toUpperCase()
            : 'OPEN';
        const hmoAssignmentMode = overridePolicy === 'LOCKED' ? 'LOCKED' : 'SELECTABLE';
        const allowedProviders = serviceRow && String(serviceRow.status || '').toUpperCase() === 'ACTIVE' && Array.isArray(serviceRow.allowed_providers)
            ? serviceRow.allowed_providers.map((p) => String(p).toLowerCase())
            : [];
        return {
            valid: true,
            exists: true,
            isDefault: false,
            code,
            agentName: displayName,
            status: 'ACTIVE',
            institutionId: inst.id,
            institutionType: instType,
            hmoProviderId: null,
            hmoProviderCode: serviceRow?.default_provider ? String(serviceRow.default_provider).toLowerCase() : null,
            hmoProviderName: null,
            hmoAssignmentMode,
            overridePolicy,
            allowedProviders,
        };
    }
    catch {
        return null;
    }
}
/**
 * Confirms an onboarding agent or institution code against the authoritative
 * institutions registry and agents table.
 * AAA000 is always accepted as Invify's default agent.
 */
async function lookupAgentCode(raw) {
    const code = normalizeAgentCode(raw);
    if (!code) {
        return {
            valid: false,
            exists: false,
            isDefault: false,
            code: '',
            error: 'Agent code is required',
        };
    }
    if (!isValidAgentCodeFormat(code)) {
        return {
            valid: false,
            exists: false,
            isDefault: isInvifyDefaultAgentCode(code),
            code,
            error: 'Enter a valid agent code',
        };
    }
    // 1. Check authoritative institutions registry first for non-default codes (e.g. MHMO, BANK codes)
    const institutionLookup = await resolveAuthoritativeInstitutionCode(code);
    if (institutionLookup) {
        return institutionLookup;
    }
    // 2. Check agents table
    try {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('agents')
            .select('id, agent_code, first_name, last_name, status, deleted_at')
            .eq('agent_code', code)
            .is('deleted_at', null)
            .maybeSingle();
        if (error) {
            if (isMissingTableError(error, 'agents') && isInvifyDefaultAgentCode(code)) {
                return defaultInvifyLookup(code);
            }
            if (isMissingTableError(error, 'agents')) {
                return missingLookup(code);
            }
            throw error;
        }
        if (data) {
            const status = String(data.status || '').toUpperCase();
            const agentName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || null;
            const isDefault = isInvifyDefaultAgentCode(code);
            if (INACTIVE_STATUSES.has(status)) {
                return {
                    valid: false,
                    exists: true,
                    isDefault,
                    code,
                    agentName,
                    status,
                    error: 'This agent is not active',
                };
            }
            return {
                valid: true,
                exists: true,
                isDefault,
                code,
                agentName: isDefault ? (agentName || 'Invify') : agentName,
                status,
                institutionId: null,
                institutionType: isDefault ? 'INVIFY_DEFAULT' : 'AGENT',
                hmoProviderId: null,
                hmoProviderCode: null,
                hmoProviderName: null,
                hmoAssignmentMode: 'SELECTABLE',
                overridePolicy: 'OPEN',
                allowedProviders: [],
            };
        }
    }
    catch (error) {
        if (isInvifyDefaultAgentCode(code)) {
            return defaultInvifyLookup(code);
        }
        throw error;
    }
    if (isInvifyDefaultAgentCode(code)) {
        return defaultInvifyLookup(code);
    }
    return missingLookup(code);
}
//# sourceMappingURL=agent-code.js.map