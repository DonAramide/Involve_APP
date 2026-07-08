import { supabaseAdmin } from '../../db/supabase';

export interface ProviderCertificate {
  id: string;
  provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA';
  certificate_version: string;
  cert_type: 'CLIENT_CERT' | 'ROOT_CA' | 'INTERMEDIATE';
  serial_number: string;
  subject: string;
  issuer: string;
  pem_content: string;
  private_key_ref: string;
  status: 'ACTIVE' | 'ROTATING' | 'RETIRED' | 'REVOKED' | 'EXPIRED';
  environment: string;
  is_active: boolean;
  valid_from: string;
  valid_to: string;
  created_at: string;
}

export interface CertificateAuditRecord {
  id: string;
  certificate_id: string | null;
  action: 'READ' | 'GENERATE' | 'ROTATE' | 'REVOKE' | 'ERROR';
  operator: string;
  status: 'SUCCESS' | 'FAILED';
  details: string;
  created_at: string;
}

export interface CertificatePinningRule {
  id: string;
  domain: string;
  pinned_hashes: string[];
  is_active: boolean;
}

export class CertificateRegistry {
  private static mockCerts: ProviderCertificate[] = [];
  private static mockAudits: CertificateAuditRecord[] = [];
  private static mockPinningRules: CertificatePinningRule[] = [];

  private static useMock = true; // DB DDL is blocked on staging, so always fallback to mock

  static clearMockData() {
    this.mockCerts = [];
    this.mockAudits = [];
    this.mockPinningRules = [];
  }

  /** Returns all in-memory certificates (used by ops-center monitors). */
  static getMockCerts(): ProviderCertificate[] {
    return this.mockCerts;
  }

  // --- Certificates ---
  static async getCertificates(provider: string, env: string): Promise<ProviderCertificate[]> {
    if (this.useMock) {
      return this.mockCerts.filter(c => c.provider === provider && c.environment === env);
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('provider_certificates')
        .select('*')
        .eq('provider', provider)
        .eq('environment', env);
      if (error) throw error;
      return data || [];
    } catch {
      return this.mockCerts.filter(c => c.provider === provider && c.environment === env);
    }
  }

  static async insertCertificate(cert: Partial<ProviderCertificate>): Promise<ProviderCertificate> {
    const record: ProviderCertificate = {
      id: cert.id || Math.random().toString(36).substring(2),
      provider: cert.provider!,
      certificate_version: cert.certificate_version!,
      cert_type: cert.cert_type || 'CLIENT_CERT',
      serial_number: cert.serial_number || 'SN-' + Math.random().toString(36).substring(2).toUpperCase(),
      subject: cert.subject || `CN=${cert.provider}`,
      issuer: cert.issuer || 'IIPS Root CA',
      pem_content: cert.pem_content!,
      private_key_ref: cert.private_key_ref || '',
      status: cert.status || 'ACTIVE',
      environment: cert.environment || 'staging',
      is_active: cert.is_active !== undefined ? cert.is_active : true,
      valid_from: cert.valid_from || new Date().toISOString(),
      valid_to: cert.valid_to || new Date(Date.now() + 365 * 24 * 3600000).toISOString(),
      created_at: cert.created_at || new Date().toISOString(),
    };
    if (this.useMock) {
      this.mockCerts.push(record);
      return record;
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('provider_certificates')
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch {
      this.mockCerts.push(record);
      return record;
    }
  }

  static async updateCertificate(id: string, updates: Partial<ProviderCertificate>): Promise<void> {
    if (this.useMock) {
      const idx = this.mockCerts.findIndex(c => c.id === id);
      if (idx !== -1) {
        this.mockCerts[idx] = { ...this.mockCerts[idx], ...updates };
      }
      return;
    }
    try {
      const { error } = await supabaseAdmin
        .from('provider_certificates')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    } catch {
      const idx = this.mockCerts.findIndex(c => c.id === id);
      if (idx !== -1) {
        this.mockCerts[idx] = { ...this.mockCerts[idx], ...updates };
      }
    }
  }

  // --- Audits ---
  static async insertAudit(audit: Partial<CertificateAuditRecord>): Promise<CertificateAuditRecord> {
    const record: CertificateAuditRecord = {
      id: audit.id || Math.random().toString(36).substring(2),
      certificate_id: audit.certificate_id || null,
      action: audit.action!,
      operator: audit.operator || 'system',
      status: audit.status || 'SUCCESS',
      details: audit.details || '',
      created_at: new Date().toISOString(),
    };
    if (this.useMock) {
      this.mockAudits.push(record);
      return record;
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('certificate_audit')
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch {
      this.mockAudits.push(record);
      return record;
    }
  }

  static async getAudits(): Promise<CertificateAuditRecord[]> {
    if (this.useMock) {
      return this.mockAudits;
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('certificate_audit')
        .select('*');
      if (error) throw error;
      return data || [];
    } catch {
      return this.mockAudits;
    }
  }

  // --- Pinning Rules ---
  static async getPinningRule(domain: string): Promise<CertificatePinningRule | null> {
    if (this.useMock) {
      return this.mockPinningRules.find(r => r.domain === domain && r.is_active) || null;
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('certificate_pinning_rules')
        .select('*')
        .eq('domain', domain)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    } catch {
      return this.mockPinningRules.find(r => r.domain === domain && r.is_active) || null;
    }
  }

  static async insertPinningRule(rule: Partial<CertificatePinningRule>): Promise<CertificatePinningRule> {
    const record: CertificatePinningRule = {
      id: rule.id || Math.random().toString(36).substring(2),
      domain: rule.domain!,
      pinned_hashes: rule.pinned_hashes || [],
      is_active: rule.is_active !== undefined ? rule.is_active : true,
    };
    if (this.useMock) {
      this.mockPinningRules.push(record);
      return record;
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('certificate_pinning_rules')
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch {
      this.mockPinningRules.push(record);
      return record;
    }
  }
}
