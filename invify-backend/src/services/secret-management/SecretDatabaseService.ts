import { supabaseAdmin } from '../../db/supabase';

export interface ProviderSecretVersion {
  id: string;
  provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA';
  key_version: string;
  vault_key_reference: string;
  status: 'ACTIVE' | 'ROTATING' | 'RETIRED' | 'COMPROMISED' | 'REVOKED';
  environment: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface ProviderSecretAudit {
  id: string;
  provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA' | null;
  key_version: string | null;
  action: 'READ' | 'ROTATE' | 'REVOKE' | 'ERROR';
  operator: string;
  status: 'SUCCESS' | 'FAILED';
  details: string;
  created_at: string;
}

export interface ProviderSecretRotationJob {
  id: string;
  provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA';
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  scheduled_at: string;
  executed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export class SecretDatabaseService {
  // In-memory fallback storage
  private static inMemoryVersions: ProviderSecretVersion[] = [];
  private static inMemoryAudits: ProviderSecretAudit[] = [];
  private static inMemoryRotationJobs: ProviderSecretRotationJob[] = [];

  // Bypass in-memory in production to enable horizontal scaling and durability.
  private static useInMemory = process.env.NODE_ENV !== 'production';

  static clearInMemoryData() {
    this.inMemoryVersions = [];
    this.inMemoryAudits = [];
    this.inMemoryRotationJobs = [];
  }

  // --- Versions ---
  static async getVersions(provider: string, env: string): Promise<ProviderSecretVersion[]> {
    if (this.useInMemory) {
      return this.inMemoryVersions.filter(v => v.provider === provider && v.environment === env);
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('provider_secret_versions')
        .select('*')
        .eq('provider', provider)
        .eq('environment', env);
      if (error) throw error;
      return data || [];
    } catch {
      return this.inMemoryVersions.filter(v => v.provider === provider && v.environment === env);
    }
  }

  static async insertVersion(version: Partial<ProviderSecretVersion>): Promise<ProviderSecretVersion> {
    const record: ProviderSecretVersion = {
      id: version.id || require("crypto").randomUUID().substring(2),
      provider: version.provider!,
      key_version: version.key_version!,
      vault_key_reference: version.vault_key_reference!,
      status: version.status || 'ACTIVE',
      environment: version.environment || 'staging',
      is_active: version.is_active !== undefined ? version.is_active : true,
      expires_at: version.expires_at || null,
      created_at: version.created_at || new Date().toISOString(),
    };
    if (this.useInMemory) {
      this.inMemoryVersions.push(record);
      return record;
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('provider_secret_versions')
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch {
      this.inMemoryVersions.push(record);
      return record;
    }
  }

  static async updateVersion(id: string, updates: Partial<ProviderSecretVersion>): Promise<void> {
    if (this.useInMemory) {
      const idx = this.inMemoryVersions.findIndex(v => v.id === id);
      if (idx !== -1) {
        this.inMemoryVersions[idx] = { ...this.inMemoryVersions[idx], ...updates };
      }
      return;
    }
    try {
      const { error } = await supabaseAdmin
        .from('provider_secret_versions')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    } catch {
      const idx = this.inMemoryVersions.findIndex(v => v.id === id);
      if (idx !== -1) {
        this.inMemoryVersions[idx] = { ...this.inMemoryVersions[idx], ...updates };
      }
    }
  }

  // --- Audits ---
  static async insertAudit(audit: Partial<ProviderSecretAudit>): Promise<ProviderSecretAudit> {
    const record: ProviderSecretAudit = {
      id: audit.id || require("crypto").randomUUID().substring(2),
      provider: audit.provider || null,
      key_version: audit.key_version || null,
      action: audit.action!,
      operator: audit.operator || 'system',
      status: audit.status || 'SUCCESS',
      details: audit.details || '',
      created_at: new Date().toISOString(),
    };
    if (this.useInMemory) {
      this.inMemoryAudits.push(record);
      return record;
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('provider_secret_audit')
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch {
      this.inMemoryAudits.push(record);
      return record;
    }
  }

  static async getAudits(): Promise<ProviderSecretAudit[]> {
    if (this.useInMemory) {
      return this.inMemoryAudits;
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('provider_secret_audit')
        .select('*');
      if (error) throw error;
      return data || [];
    } catch {
      return this.inMemoryAudits;
    }
  }

  // --- Rotation Jobs ---
  static async insertRotationJob(job: Partial<ProviderSecretRotationJob>): Promise<ProviderSecretRotationJob> {
    const record: ProviderSecretRotationJob = {
      id: job.id || require("crypto").randomUUID().substring(2),
      provider: job.provider!,
      status: job.status || 'PENDING',
      scheduled_at: job.scheduled_at || new Date().toISOString(),
      executed_at: job.executed_at || null,
      error_message: job.error_message || null,
      created_at: new Date().toISOString(),
    };
    if (this.useInMemory) {
      this.inMemoryRotationJobs.push(record);
      return record;
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('provider_secret_rotation_jobs')
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch {
      this.inMemoryRotationJobs.push(record);
      return record;
    }
  }

  static async updateRotationJob(id: string, updates: Partial<ProviderSecretRotationJob>): Promise<void> {
    if (this.useInMemory) {
      const idx = this.inMemoryRotationJobs.findIndex(j => j.id === id);
      if (idx !== -1) {
        this.inMemoryRotationJobs[idx] = { ...this.inMemoryRotationJobs[idx], ...updates };
      }
      return;
    }
    try {
      const { error } = await supabaseAdmin
        .from('provider_secret_rotation_jobs')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    } catch {
      const idx = this.inMemoryRotationJobs.findIndex(j => j.id === id);
      if (idx !== -1) {
        this.inMemoryRotationJobs[idx] = { ...this.inMemoryRotationJobs[idx], ...updates };
      }
    }
  }

  static async getRotationJobs(): Promise<ProviderSecretRotationJob[]> {
    if (this.useInMemory) {
      return this.inMemoryRotationJobs;
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('provider_secret_rotation_jobs')
        .select('*');
      if (error) throw error;
      return data || [];
    } catch {
      return this.inMemoryRotationJobs;
    }
  }
}
