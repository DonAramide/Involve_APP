import { Request, Response } from 'express';
import { supabase } from '../db/supabase';
import { S3Service } from '../services/s3.service';

export class TenantKycController {
  static async uploadKyc(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.tenantId || (req as any).user?.id;
      if (!authUserId) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Tenant ID required.' });
      }

      const { type } = req.body;
      if (!type) {
        return res.status(400).json({ success: false, message: 'Document type is required' });
      }

      // Check if file was uploaded via multer
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, message: 'No document file provided' });
      }

      // 1. Upload to Contabo S3
      const documentUrl = await S3Service.uploadFile(
        file.buffer, 
        file.originalname, 
        file.mimetype, 
        `tenants/kyc/${authUserId}`
      );

      if (process.env.OFFLINE_LOCAL_AUTH === 'true') {
        return res.status(200).json({
          success: true,
          message: 'KYC document uploaded successfully (Mock Mode)',
          data: {
            tenant_id: authUserId,
            document_type: type,
            document_url: documentUrl,
            status: 'PENDING'
          }
        });
      }

      // 2. Insert into tenant_kyc_documents table
      const { data: doc, error: insertError } = await supabase.from('tenant_kyc_documents').insert({
        tenant_id: authUserId,
        document_type: type,
        document_url: documentUrl,
        status: 'PENDING'
      }).select().single();

      if (insertError) {
        console.error('Error inserting KYC document:', insertError);
        return res.status(500).json({ success: false, message: 'Failed to save KYC document' });
      }

      // 3. Update the tenant's overall KYC status
      await supabase.from('tenants').update({ kyc_status: 'PENDING' }).eq('id', authUserId);

      return res.status(200).json({
        success: true,
        message: 'KYC document uploaded successfully',
        data: doc
      });
    } catch (error: any) {
      console.error('[TenantKycController.uploadKyc] Error:', error.message);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async getKycDocuments(req: Request, res: Response) {
    try {
      const tenantId = req.params.id || (req as any).user?.id;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant ID is required' });
      }

      if (process.env.OFFLINE_LOCAL_AUTH === 'true') {
        return res.status(200).json({
          success: true,
          data: []
        });
      }

      const { data, error } = await supabase.from('tenant_kyc_documents').select('*').eq('tenant_id', tenantId);

      if (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch KYC documents' });
      }

      return res.status(200).json({
        success: true,
        data: data || []
      });
    } catch (error: any) {
      console.error('[TenantKycController.getKycDocuments] Error:', error.message);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}
