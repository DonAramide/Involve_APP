import { Request, Response } from 'express';
import { supabaseAdmin } from '../db/supabase';
import { putContaboObject, publicContaboObjectUrl, resolveContaboBucket } from '../utils/contabo-s3';

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

export class TenantKycController {
  static async uploadKyc(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.tenantId || (req as any).user?.id;
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

      const { data: doc, error: insertError } = await supabaseAdmin
        .from('tenant_kyc_documents')
        .insert({
          tenant_id: authUserId,
          document_type: type,
          document_url: documentUrl,
          status: 'PENDING',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting KYC document:', insertError);
        return res.status(500).json({ success: false, message: 'Failed to save KYC document' });
      }

      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('settings')
        .eq('id', authUserId)
        .maybeSingle();
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
      await supabaseAdmin
        .from('tenants')
        .update({ settings, kyc_status: 'PENDING', updated_at: now })
        .eq('id', authUserId);

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

      const docs = [...(data || [])].map((d: any) => ({
        ...d,
        document_type: normalizeDocType(d.document_type),
        url: d.document_url,
      }));

      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('settings, kyc_status')
        .eq('id', tenantId)
        .maybeSingle();
      const settings = parseSettings(tenant?.settings);

      const pushIfMissing = (url: string, type: string, stamp?: string) => {
        const trimmed = String(url || '').trim();
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
      const role = String((req as any).user?.role || '').toLowerCase();
      if (!['super_admin', 'admin', 'internal_staff'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      const statusFilter = String(req.query.status || 'PENDING').toUpperCase();
      let query = supabaseAdmin
        .from('tenant_kyc_documents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (statusFilter && statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter);
      }
      const { data, error } = await query;
      if (error) {
        console.error('[TenantKycController.listPending]', error.message);
        return res.status(500).json({ success: false, message: error.message });
      }

      const docs = data || [];
      const tenantIds = Array.from(new Set(docs.map((d: any) => String(d.tenant_id)).filter(Boolean)));
      let tenantsById: Record<string, any> = {};
      if (tenantIds.length) {
        const { data: tenants } = await supabaseAdmin
          .from('tenants')
          .select('id, name, email, phone, kyc_status')
          .in('id', tenantIds);
        for (const t of tenants || []) tenantsById[String(t.id)] = t;
      }

      const rows = docs.map((d: any) => {
        const tenant = tenantsById[String(d.tenant_id)] || {};
        const type = normalizeDocType(d.document_type);
        return {
          id: d.id,
          tenantId: d.tenant_id,
          tenantName: tenant.name || 'Unknown tenant',
          tenantEmail: tenant.email || null,
          tenantKycStatus: tenant.kyc_status || null,
          documentType: type,
          documentLabel: type === 'CAC_CERT' ? 'CAC certificate' : type === 'GOVT_ID' ? 'Valid ID card' : type.replace(/_/g, ' '),
          url: d.document_url,
          status: d.status || 'PENDING',
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        };
      });

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
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async reviewDocument(req: Request, res: Response) {
    try {
      const role = String((req as any).user?.role || '').toLowerCase();
      if (!['super_admin', 'admin', 'internal_staff'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      const id = String(req.params.id || '').trim();
      const nextStatus = String(req.body?.status || '').toUpperCase();
      if (!id) return res.status(400).json({ success: false, message: 'Document id required' });
      if (!['APPROVED', 'REJECTED', 'PENDING'].includes(nextStatus)) {
        return res.status(400).json({ success: false, message: 'status must be APPROVED, REJECTED, or PENDING' });
      }

      const { data: doc, error } = await supabaseAdmin
        .from('tenant_kyc_documents')
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .maybeSingle();
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
