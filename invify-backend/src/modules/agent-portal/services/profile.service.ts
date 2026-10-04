import { supabaseAdmin } from '../../../db/supabase';

function maskBvn(value: any): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (raw.includes('*')) return raw;
  return raw.length >= 4 ? `***${raw.slice(-4)}` : raw;
}

function normalizeProfile(agent: any, profile: any, territoryName?: string | null) {
  const first = String(agent.first_name || '').trim();
  const last = String(agent.last_name || '').trim();
  const name = String(agent.full_name || `${first} ${last}`).trim();
  const phone = agent.phone || agent.phone_number || null;
  const address = profile?.address || profile?.residential_address || '';
  const photo = profile?.profile_photo_url || profile?.photo_url || null;
  return {
    ...agent,
    name,
    first_name: first,
    last_name: last,
    phone,
    phone_number: phone,
    territory: territoryName || agent.territory || null,
    profile: {
      ...(profile || {}),
      residential_address: address,
      address,
      photo_url: photo,
      profile_photo_url: photo,
      bvn_masked: maskBvn(profile?.bvn_masked || profile?.bvn),
      mfa_enabled: Boolean(profile?.mfa_enabled),
      kyc_status: profile?.kyc_status || 'PENDING',
    },
  };
}

export class ProfileService {
  async findAgent(authUserId: string, email?: string) {
    if (authUserId) {
      const byAuth = await supabaseAdmin
        .from('agents')
        .select('id, agent_code, first_name, last_name, email, phone, status, territory_id, created_at, auth_user_id')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
      if (byAuth.error) throw new Error(byAuth.error.message);
      if (byAuth.data) return byAuth.data;
    }

    const normalizedEmail = String(email || '').trim();
    if (normalizedEmail) {
      const byEmail = await supabaseAdmin
        .from('agents')
        .select('id, agent_code, first_name, last_name, email, phone, status, territory_id, created_at, auth_user_id')
        .ilike('email', normalizedEmail)
        .maybeSingle();
      if (byEmail.error) throw new Error(byEmail.error.message);
      if (byEmail.data) return byEmail.data;
    }

    throw new Error('Agent not found');
  }

  async getProfile(authUserId: string, email?: string) {
    const agent = await this.findAgent(authUserId, email);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('agent_profiles')
      .select('*')
      .eq('agent_id', agent.id)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);

    let territoryName: string | null = null;
    if (agent.territory_id) {
      const { data: territory } = await supabaseAdmin
        .from('agent_territories')
        .select('name, territory_code')
        .eq('id', agent.territory_id)
        .maybeSingle();
      territoryName = territory?.name || territory?.territory_code || null;
    }

    return normalizeProfile(agent, profile, territoryName);
  }

  async updateProfile(authUserId: string, payload: any, email?: string) {
    const agent = await this.findAgent(authUserId, email);

    const firstName = payload.first_name ?? agent.first_name;
    const lastName = payload.last_name ?? agent.last_name;
    const nextEmail = payload.email ?? agent.email;
    const nextPhone = payload.phone_number ?? payload.phone ?? agent.phone;

    const { error: agentError } = await supabaseAdmin
      .from('agents')
      .update({
        first_name: firstName,
        last_name: lastName,
        email: nextEmail,
        phone: nextPhone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agent.id);
    if (agentError) throw new Error(agentError.message);

    const profilePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    const address = payload.residential_address ?? payload.address;
    if (address !== undefined) profilePayload.address = address;
    const photo = payload.photo_url ?? payload.profile_photo_url;
    if (photo) profilePayload.profile_photo_url = photo;
    if (payload.bvn_masked !== undefined) profilePayload.bvn = payload.bvn_masked;
    if (payload.bvn !== undefined) profilePayload.bvn = payload.bvn;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('agent_profiles')
      .select('agent_id')
      .eq('agent_id', agent.id)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);

    if (existing) {
      if (Object.keys(profilePayload).length > 1) {
        const { error } = await supabaseAdmin
          .from('agent_profiles')
          .update(profilePayload)
          .eq('agent_id', agent.id);
        if (error) throw new Error(error.message);
      }
    } else {
      const { error } = await supabaseAdmin.from('agent_profiles').insert({
        agent_id: agent.id,
        ...profilePayload,
      });
      if (error) throw new Error(error.message);
    }

    return this.getProfile(authUserId, nextEmail || email);
  }

  async uploadKycDocument(authUserId: string, type: string, url: string, email?: string) {
    const agent = await this.findAgent(authUserId, email);

    const { data, error } = await supabaseAdmin.from('agent_kyc_documents').insert({
      agent_id: agent.id,
      document_type: type,
      status: 'SUBMITTED',
      file_url: url,
    }).select().single();

    if (error) throw new Error(error.message || 'Failed to save KYC document');
    return data;
  }

  async getKycDocuments(authUserId: string, email?: string) {
    const agent = await this.findAgent(authUserId, email);

    const { data, error } = await supabaseAdmin
      .from('agent_kyc_documents')
      .select('*')
      .eq('agent_id', agent.id);
    if (error) throw new Error(error.message || 'Failed to fetch KYC documents');
    return data || [];
  }
}
export const profileService = new ProfileService();
