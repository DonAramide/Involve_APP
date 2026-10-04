import { Request, Response } from 'express';
import { supabaseAdmin } from '../db/supabase';
import { putContaboObject, publicContaboObjectUrl, resolveContaboBucket, rewritePublicContaboUrl } from '../utils/contabo-s3';

const TYPE_ALIASES: Record<string, string> = {
  CAC: 'CAC_CERT',
  CAC_CERT: 'CAC_CERT',
  CAC_CERTIFICATE: 'CAC_CERT',
  CAC_DOCUMENT: 'CAC_CERT',
  GOVT_ID: 'GOVT_ID',
  ID_CARD: 'GOVT_ID',
  VALID_ID: 'GOVT_ID',
  NATIONAL_ID: 'GOVT_ID',
  NIN: 'GOVT_ID',
  PASSPORT: 'GOVT_ID',
  DRIVERS_LICENSE: 'GOVT_ID',
  UTILITY_BILL: 'UTILITY_BILL',
};

function normalizeDocType(raw: any): string {
  const key = String(raw || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  return TYPE_ALIASES[key] || key;
}

function parseSettings(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? { ...raw } : {};
}

function tenantDisplayName(t: any): string {
  const settings = parseSettings(t?.settings);
  return String(
    t?.name ||
      t?.business_name ||
      t?.businessName ||
      t?.owner_name ||
      settings.business_name ||
      settings.businessName ||
      t?.owner_email ||
      t?.email ||
      '',
  ).trim();
}

function tenantDisplayEmail(t: any): string | null {
  const settings = parseSettings(t?.settings);
  const email = String(t?.owner_email || t?.email || settings.email || '').trim();
  return email || null;
}

async function fetchTenants(query: (q: any) => any): Promise<any[]> {
  const full = await query(
    supabaseAdmin
      .from('tenants')
      .select('id, name, business_name, owner_name, owner_email, phone, kyc_status, settings'),
  );
  if (!full.error) return full.data || [];
  console.warn('[TenantKycController] tenants select:', full.error.message);
  const slim = await query(
    supabaseAdmin.from('tenants').select('id, name, owner_email, kyc_status, settings'),
  );
  if (!slim.error) return slim.data || [];
  console.warn('[TenantKycController] tenants slim select:', slim.error.message);
  const min = await query(supabaseAdmin.from('tenants').select('id, name, settings, kyc_status'));
  return min.data || [];
}

async function persistKycMetadata(tenantId: string, type: string, documentUrl: string): Promise<boolean> {
  const { data: tenant, error: readError } = await supabaseAdmin
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .maybeSingle();
  if (readError) {
    console.warn('[TenantKycController] tenant settings read:', readError.message);
  }
  const settings = parseSettings(tenant?.settings);
  const now = new Date().toISOString();
  if (type === 'CAC_CERT') {
    settings.cac_document_url = documentUrl;
    settings.cac_uploaded_at = now;
  }
  if (type === 'GOVT_ID') {
    settings.id_document_url = documentUrl;
    settings.id_uploaded_at = now;
  }
  const updated = await supabaseAdmin
    .from('tenants')
    .update({ settings, kyc_status: 'PENDING', updated_at: now })
    .eq('id', tenantId);
  if (updated.error) {
    console.error('[TenantKycController] tenant settings write:', updated.error.message);
    return false;
  }
  return true;
}

async function loadTenantsByIds(ids: string[]): Promise<Record<string, any>> {
  const tenantsById: Record<string, any> = {};
  const unique = Array.from(new Set(ids.map((id) => String(id || '').trim()).filter(Boolean)));
  if (!unique.length) return tenantsById;

  const found = await fetchTenants((q) => q.in('id', unique));
  for (const t of found) tenantsById[String(t.id)] = t;

  const missing = unique.filter((id) => !tenantsById[id]);
  if (missing.length) {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, name, email')
      .in('id', missing);
    const viaUser = Array.from(
      new Set((users || []).map((u: any) => String(u.tenant_id || '').trim()).filter(Boolean)),
    );
    if (viaUser.length) {
      const extra = await fetchTenants((q) => q.in('id', viaUser));
      for (const t of extra) tenantsById[String(t.id)] = t;
    }
    for (const u of users || []) {
      const tenant = tenantsById[String(u.tenant_id)] || {};
      tenantsById[String(u.id)] = {
        ...tenant,
        id: u.tenant_id || tenant.id,
        owner_email: tenant.owner_email || u.email,
        owner_name: tenant.owner_name || u.name,
        _resolvedFromUserId: u.id,
      };
    }
  }
  return tenantsById;
}

export class TenantKycController {
  static async uploadKyc(req: Request, res: Response) {
    try {
      const authUserId =
        (req.headers['x-tenant-id'] as string) ||
        (req as any).user?.tenantId ||
        (req as any).user?.id;
      if (!authUserId) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Tenant ID required.' });
      }

      const type = normalizeDocType(req.body?.type || req.body?.documentType);
      if (!type) {
        return res.status(400).json({ success: false, message: 'Document type is required' });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, message: 'No document file provided' });
      }

      const bucket = resolveContaboBucket();
      if (!bucket) {
        return res.status(503).json({ success: false, message: 'Object storage is not configured.' });
      }

      const original = String(file.originalname || 'document.bin');
      const ext = (original.includes('.') ? original.slice(original.lastIndexOf('.')) : '.bin').toLowerCase();
      const objectKey = `tenants/${authUserId}/kyc/${type.toLowerCase()}-${Date.now()}${ext}`;
      await putContaboObject({
        bucket,
        key: objectKey,
        body: file.buffer,
        contentType: file.mimetype || 'application/octet-stream',
      });
      const documentUrl = publicContaboObjectUrl(objectKey);

      if (process.env.OFFLINE_LOCAL_AUTH === 'true') {
        return res.status(200).json({
          success: true,
          message: 'KYC document uploaded successfully (Mock Mode)',
          url: documentUrl,
          data: {
            tenant_id: authUserId,
            document_type: type,
            document_url: documentUrl,
            status: 'PENDING',
          },
        });
      }

      const { data: existingRows } = await supabaseAdmin
        .from('tenant_kyc_documents')
        .select('id, document_type')
        .eq('tenant_id', authUserId);
      const existing = (existingRows || []).find(
        (row: any) => normalizeDocType(row.document_type) === type,
      );

      let doc: any = null;
      if (existing?.id) {
        const updated = await supabaseAdmin
          .from('tenant_kyc_documents')
          .update({
            document_url: documentUrl,
            status: 'PENDING',
            rejection_reason: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();
        if (updated.error && /rejection_reason/i.test(String(updated.error.message))) {
          const retry = await supabaseAdmin
            .from('tenant_kyc_documents')
            .update({
              document_url: documentUrl,
              status: 'PENDING',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select()
            .single();
          if (retry.error) {
            console.error('Error updating KYC document:', retry.error);
            const savedToTenant = await persistKycMetadata(authUserId, type, documentUrl);
            if (savedToTenant) {
              return res.status(200).json({
                success: true,
                message: 'KYC document uploaded successfully',
                url: documentUrl,
                data: {
                  id: existing.id,
                  tenant_id: authUserId,
                  document_type: type,
                  document_url: documentUrl,
                  url: documentUrl,
                  status: 'PENDING',
                },
              });
            }
            return res.status(500).json({ success: false, message: retry.error.message || 'Failed to save KYC document' });
          }
          doc = retry.data;
        } else if (updated.error) {
          console.error('Error updating KYC document:', updated.error);
          const savedToTenant = await persistKycMetadata(authUserId, type, documentUrl);
          if (savedToTenant) {
            return res.status(200).json({
              success: true,
              message: 'KYC document uploaded successfully',
              url: documentUrl,
              data: {
                id: existing.id,
                tenant_id: authUserId,
                document_type: type,
                document_url: documentUrl,
                url: documentUrl,
                status: 'PENDING',
              },
            });
          }
          return res.status(500).json({ success: false, message: updated.error.message || 'Failed to save KYC document' });
        } else {
          doc = updated.data;
        }
      } else {
        const inserted = await supabaseAdmin
          .from('tenant_kyc_documents')
          .insert({
            tenant_id: authUserId,
            document_type: type,
            document_url: documentUrl,
            status: 'PENDING',
          })
          .select()
          .single();
        if (inserted.error) {
          console.error('Error inserting KYC document:', inserted.error);
          const savedToTenant = await persistKycMetadata(authUserId, type, documentUrl);
          if (savedToTenant) {
            return res.status(200).json({
              success: true,
              message: 'KYC document uploaded successfully',
              url: documentUrl,
              data: {
                tenant_id: authUserId,
                document_type: type,
                document_url: documentUrl,
                url: documentUrl,
                status: 'PENDING',
              },
            });
          }
          return res.status(500).json({
            success: false,
            message: inserted.error.message || 'Failed to save KYC document',
          });
        }
        doc = inserted.data;
      }

      await persistKycMetadata(authUserId, type, documentUrl);

      return res.status(200).json({
        success: true,
        message: 'KYC document uploaded successfully',
        url: documentUrl,
        data: { ...doc, document_url: documentUrl, url: documentUrl },
      });
    } catch (error: any) {
      console.error('[TenantKycController.uploadKyc] Error:', error.message);
      return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }

  static async getKycDocuments(req: Request, res: Response) {
    try {
      const user = (req as any).user || {};
      const role = String(user.role || '').toLowerCase();
      const isAdmin = ['super_admin', 'admin', 'internal_staff'].includes(role);
      const ownTenantId = user.tenantId || user.id;
      let requestedId = req.params.id;

      if (!isAdmin && requestedId && requestedId !== ownTenantId && requestedId !== user.id) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      const tenantId = isAdmin ? (requestedId || ownTenantId) : ownTenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant ID is required' });
      }

      if (process.env.OFFLINE_LOCAL_AUTH === 'true') {
        return res.status(200).json({ success: true, data: [] });
      }

      const { data, error } = await supabaseAdmin
        .from('tenant_kyc_documents')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[TenantKycController.getKycDocuments] table error:', error.message);
      }

      const docs = [...(data || [])].map((d: any) => {
        const url = rewritePublicContaboUrl(d.document_url);
        return {
          ...d,
          document_type: normalizeDocType(d.document_type),
          document_url: url,
          url,
          rejection_reason: d.rejection_reason || d.notes || null,
        };
      });

      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('settings, kyc_status')
        .eq('id', tenantId)
        .maybeSingle();
      const settings = parseSettings(tenant?.settings);

      const pushIfMissing = (url: string, type: string, stamp?: string) => {
        const trimmed = rewritePublicContaboUrl(String(url || '').trim());
        if (!trimmed) return;
        if (docs.some((d: any) => d.document_url === trimmed || normalizeDocType(d.document_type) === type)) return;
        docs.unshift({
          id: `${type.toLowerCase()}-${stamp || 'settings'}`,
          tenant_id: tenantId,
          document_type: type,
          document_url: trimmed,
          url: trimmed,
          status: tenant?.kyc_status || 'PENDING',
          created_at: stamp || new Date().toISOString(),
        });
      };
      pushIfMissing(settings.cac_document_url, 'CAC_CERT', settings.cac_uploaded_at);
      pushIfMissing(settings.id_document_url, 'GOVT_ID', settings.id_uploaded_at);

      return res.status(200).json({
        success: true,
        data: docs,
      });
    } catch (error: any) {
      console.error('[TenantKycController.getKycDocuments] Error:', error.message);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async listPending(req: Request, res: Response) {
    try {
      const statusFilter = String(req.query.status || 'PENDING').toUpperCase();
      let docs: any[] = [];
      const { data, error } = await supabaseAdmin
        .from('tenant_kyc_documents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) {
        console.warn('[TenantKycController.listPending] table:', error.message);
      } else {
        docs = data || [];
      }

      const docTenantIds = docs.map((d: any) => String(d.tenant_id || '')).filter(Boolean);
      const settingsTenants = await fetchTenants((q) => q.limit(1000));
      const tenantsById = await loadTenantsByIds(docTenantIds);
      for (const t of settingsTenants) {
        if (!tenantsById[String(t.id)]) tenantsById[String(t.id)] = t;
      }

      const rows: any[] = [];
      const seen = new Set<string>();
      const pushRow = (row: any) => {
        const key = `${row.tenantId}:${row.documentType}`;
        if (seen.has(key) && !String(row.id || '').startsWith('settings|')) return;
        if (!seen.has(key)) seen.add(key);
        if (statusFilter && statusFilter !== 'ALL' && String(row.status).toUpperCase() !== statusFilter) return;
        rows.push(row);
      };

      for (const d of docs) {
        const tenant = tenantsById[String(d.tenant_id)] || {};
        const type = normalizeDocType(d.document_type);
        const resolvedTenantId = tenant._resolvedFromUserId ? tenant.id : d.tenant_id;
        pushRow({
          id: d.id,
          tenantId: resolvedTenantId || d.tenant_id,
          tenantName: tenantDisplayName(tenant) || 'Unknown tenant',
          tenantEmail: tenantDisplayEmail(tenant),
          tenantKycStatus: tenant.kyc_status || null,
          documentType: type,
          documentLabel: type === 'CAC_CERT' ? 'CAC certificate' : type === 'GOVT_ID' ? 'Valid ID card' : type.replace(/_/g, ' '),
          url: rewritePublicContaboUrl(d.document_url),
          status: d.status || 'PENDING',
          rejectionReason: d.rejection_reason || d.notes || null,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        });
      }

      for (const t of Object.values(tenantsById)) {
        const settings = parseSettings((t as any).settings);
        const items = [
          { type: 'CAC_CERT', url: settings.cac_document_url, at: settings.cac_uploaded_at },
          { type: 'GOVT_ID', url: settings.id_document_url, at: settings.id_uploaded_at },
        ];
        for (const item of items) {
          const url = String(item.url || '').trim();
          if (!url) continue;
          const tenantId = String((t as any).id || '');
          const key = `${tenantId}:${item.type}`;
          if (seen.has(key)) continue;
          const status = String((t as any).kyc_status || 'PENDING').toUpperCase() === 'APPROVED' ? 'APPROVED' : 'PENDING';
          pushRow({
            id: `settings|${item.type}|${tenantId}`,
            tenantId,
            tenantName: tenantDisplayName(t) || 'Unknown tenant',
            tenantEmail: tenantDisplayEmail(t),
            tenantKycStatus: (t as any).kyc_status || null,
            documentType: item.type,
            documentLabel: item.type === 'CAC_CERT' ? 'CAC certificate' : 'Valid ID card',
            url: rewritePublicContaboUrl(url),
            status,
            rejectionReason: null,
            createdAt: item.at || null,
            updatedAt: item.at || null,
          });
        }
      }

      return res.status(200).json({
        success: true,
        data: rows,
        counts: {
          pending: rows.filter((r: any) => String(r.status).toUpperCase() === 'PENDING').length,
          total: rows.length,
        },
      });
    } catch (error: any) {
      console.error('[TenantKycController.listPending] Error:', error.message);
      return res.status(200).json({ success: true, data: [], counts: { pending: 0, total: 0 } });
    }
  }

  static async reviewDocument(req: Request, res: Response) {
    try {
      const id = String(req.params.id || '').trim();
      const nextStatus = String(req.body?.status || '').toUpperCase();
      if (!id) return res.status(400).json({ success: false, message: 'Document id required' });
      if (!['APPROVED', 'REJECTED', 'PENDING'].includes(nextStatus)) {
        return res.status(400).json({ success: false, message: 'status must be APPROVED, REJECTED, or PENDING' });
      }

      let docId = id;
      if (id.startsWith('settings|')) {
        const parts = id.split('|');
        const type = normalizeDocType(parts[1]);
        const tenantId = parts.slice(2).join('|');
        const { data: tenant } = await supabaseAdmin
          .from('tenants')
          .select('settings')
          .eq('id', tenantId)
          .maybeSingle();
        const settings = parseSettings(tenant?.settings);
        const url = type === 'GOVT_ID' ? settings.id_document_url : settings.cac_document_url;
        if (!url) return res.status(404).json({ success: false, message: 'Document not found' });
        const inserted = await supabaseAdmin
          .from('tenant_kyc_documents')
          .insert({
            tenant_id: tenantId,
            document_type: type,
            document_url: url,
            status: 'PENDING',
          })
          .select('*')
          .single();
        if (inserted.error || !inserted.data) {
          return res.status(500).json({ success: false, message: inserted.error?.message || 'Failed to register document' });
        }
        docId = inserted.data.id;
      }

      const reason = String(req.body?.reason || req.body?.notes || '').trim();
      const patch: any = {
        status: nextStatus,
        updated_at: new Date().toISOString(),
      };
      if (nextStatus === 'REJECTED') patch.rejection_reason = reason || 'Please re-upload a clearer document.';
      if (nextStatus === 'PENDING' || nextStatus === 'APPROVED') patch.rejection_reason = null;

      let { data: doc, error } = await supabaseAdmin
        .from('tenant_kyc_documents')
        .update(patch)
        .eq('id', docId)
        .select('*')
        .maybeSingle();
      if (error && /rejection_reason/i.test(String(error.message))) {
        const retry = await supabaseAdmin
          .from('tenant_kyc_documents')
          .update({ status: nextStatus, updated_at: patch.updated_at })
          .eq('id', docId)
          .select('*')
          .maybeSingle();
        doc = retry.data;
        error = retry.error;
      }
      if (error) throw error;
      if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

      const { data: siblings } = await supabaseAdmin
        .from('tenant_kyc_documents')
        .select('document_type, status')
        .eq('tenant_id', doc.tenant_id);
      const typesApproved = new Set(
        (siblings || [])
          .filter((s: any) => String(s.status).toUpperCase() === 'APPROVED')
          .map((s: any) => normalizeDocType(s.document_type)),
      );
      let tenantKyc = 'PENDING';
      if ((siblings || []).some((s: any) => String(s.status).toUpperCase() === 'REJECTED')) {
        tenantKyc = 'REJECTED';
      } else if (typesApproved.has('CAC_CERT') && typesApproved.has('GOVT_ID')) {
        tenantKyc = 'APPROVED';
      }
      await supabaseAdmin
        .from('tenants')
        .update({ kyc_status: tenantKyc, updated_at: new Date().toISOString() })
        .eq('id', doc.tenant_id);

      return res.status(200).json({
        success: true,
        data: { ...doc, url: doc.document_url, tenantKycStatus: tenantKyc },
      });
    } catch (error: any) {
      console.error('[TenantKycController.reviewDocument] Error:', error.message);
      return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }
}
