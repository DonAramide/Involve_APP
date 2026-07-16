"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileService = exports.ProfileService = void 0;
const supabase_1 = require("../../../db/supabase");
class ProfileService {
    async getProfile(authUserId) {
        const { data: agent, error } = await supabase_1.supabase
            .from('agents')
            .select('id, agent_code, first_name, last_name, email, phone_number, status, territory, created_at')
            .eq('auth_user_id', authUserId)
            .single();
        if (error || !agent)
            throw new Error('Agent not found');
        const { data: profile } = await supabase_1.supabase
            .from('agent_profiles')
            .select('residential_address, bvn_masked, mfa_enabled, photo_url')
            .eq('agent_id', agent.id)
            .single();
        return { ...agent, profile: profile || {} };
    }
    async updateProfile(authUserId, payload) {
        const { data: agent } = await supabase_1.supabase.from('agents').select('id, first_name, last_name, phone_number, email').eq('auth_user_id', authUserId).single();
        if (!agent)
            throw new Error('Agent not found');
        if (payload.first_name || payload.last_name || payload.phone_number || payload.email) {
            await supabase_1.supabase.from('agents').update({
                first_name: payload.first_name || agent.first_name,
                last_name: payload.last_name || agent.last_name,
                phone_number: payload.phone_number || agent.phone_number,
                email: payload.email || agent.email
            }).eq('id', agent.id);
        }
        if (payload.residential_address !== undefined || payload.photo_url) {
            const { data: existing } = await supabase_1.supabase.from('agent_profiles').select('id').eq('agent_id', agent.id).single();
            const profilePayload = {};
            if (payload.residential_address !== undefined)
                profilePayload['residential_address'] = payload.residential_address;
            if (payload.photo_url)
                profilePayload['photo_url'] = payload.photo_url;
            if (existing) {
                await supabase_1.supabase.from('agent_profiles').update(profilePayload).eq('agent_id', agent.id);
            }
            else {
                profilePayload['agent_id'] = agent.id;
                await supabase_1.supabase.from('agent_profiles').insert(profilePayload);
            }
        }
        return this.getProfile(authUserId);
    }
    async uploadKycDocument(authUserId, type, url) {
        const { data: agent } = await supabase_1.supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
        if (!agent)
            throw new Error('Agent not found');
        const { data, error } = await supabase_1.supabase.from('agent_kyc_documents').insert({
            agent_id: agent.id,
            document_type: type,
            status: 'SUBMITTED',
            file_url: url
        }).select().single();
        if (error)
            throw new Error('Failed to save KYC document');
        return data;
    }
    async getKycDocuments(authUserId) {
        const { data: agent } = await supabase_1.supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
        if (!agent)
            throw new Error('Agent not found');
        const { data, error } = await supabase_1.supabase.from('agent_kyc_documents').select('*').eq('agent_id', agent.id);
        if (error)
            throw new Error('Failed to fetch KYC documents');
        return data || [];
    }
}
exports.ProfileService = ProfileService;
exports.profileService = new ProfileService();
//# sourceMappingURL=profile.service.js.map