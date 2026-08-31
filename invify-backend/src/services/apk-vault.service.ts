// src/services/apk-vault.service.ts
import { supabaseAdmin as supabase } from '../db/supabase';

// Helper functions to safely convert between human-readable size string and integer bytes for PostgreSQL INTEGER column
function parseSizeToBytes(size: any): number {
  if (typeof size === 'number') {
    return Math.round(size);
  }
  if (typeof size === 'string') {
    const mbMatch = size.match(/([\d.]+)\s*MB/i);
    if (mbMatch) {
      return Math.round(parseFloat(mbMatch[1]) * 1024 * 1024);
    }
    const kbMatch = size.match(/([\d.]+)\s*KB/i);
    if (kbMatch) {
      return Math.round(parseFloat(kbMatch[1]) * 1024);
    }
    const gbMatch = size.match(/([\d.]+)\s*GB/i);
    if (gbMatch) {
      return Math.round(parseFloat(gbMatch[1]) * 1024 * 1024 * 1024);
    }
    const digits = size.replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : 0;
  }
  return 0;
}

function formatBytesToHuman(bytes: any): string {
  if (bytes === null || bytes === undefined || bytes === '') return '—';
  if (typeof bytes === 'string') {
    if (bytes.includes('MB') || bytes.includes('KB') || bytes.includes('GB') || bytes.includes('B')) {
      return bytes;
    }
    const num = parseFloat(bytes);
    if (isNaN(num)) return bytes;
    bytes = num;
  }
  if (typeof bytes === 'number') {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${bytes} B`;
  }
  return '—';
}

export class ApkVaultService {
  static async getVault() {
    const { data, error } = await supabase
      .from('apk_vault')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('[ApkVaultService] getVault error:', error.message);
      return [];
    }
    
    // Map database columns to camelCase expected by client
    return (data || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      packageName: a.package_name,
      version: a.version,
      size: formatBytesToHuman(a.size),
      status: a.status,
      uploadProgress: Number(a.upload_progress) || 0,
      installCount: a.install_count,
      uninstallCount: a.uninstall_count,
      versionDistribution: a.version_distribution,
      selectedDeployVersion: a.selected_deploy_version,
      s3Url: a.s3_url,
      downloadUrl: `/api/apk/${a.id}/download`,
      createdBy: a.created_by,
      updatedBy: a.updated_by,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    }));
  }

  static async getApkById(id: string) {
    const vault = await this.getVault();
    return vault.find((a: any) => String(a.id) === String(id)) || null;
  }

  static async getLogs() {
    const { data, error } = await supabase
      .from('apk_deployment_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('[ApkVaultService] getLogs error:', error.message);
      return [];
    }
    
    return (data || []).map((l: any) => ({
      id: l.id,
      action: l.action,
      apkName: l.apk_name,
      devices: l.devices,
      status: l.status,
      performedBy: l.performed_by,
      time: l.created_at
    }));
  }

  static async addApk(apkData: any, operatorEmail: string = 'system') {
    // Enforce 3 slots max
    const vault = await this.getVault();
    if (vault.length >= 3) {
      throw new Error('Vault is full. Maximum of 3 APKs allowed.');
    }

    const id = `apk-${Date.now()}`;
    const newApk = {
      id,
      name: apkData.name,
      package_name: apkData.packageName,
      version: apkData.version,
      size: parseSizeToBytes(apkData.size ?? apkData.sizeBytes),
      status: 'READY',
      upload_progress: 100,
      install_count: 0,
      uninstall_count: 0,
      version_distribution: [
        { version: apkData.version, deviceCount: 0 }
      ],
      selected_deploy_version: apkData.version,
      s3_url: apkData.s3Url,
      created_by: operatorEmail,
      updated_by: operatorEmail
    };

    const { data, error } = await supabase
      .from('apk_vault')
      .insert([newApk])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error(
          `${apkData.packageName} is already in the vault. Use Upload New Version on that slot.`,
        );
      }
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      packageName: data.package_name,
      version: data.version,
      size: formatBytesToHuman(data.size),
      status: data.status,
      uploadProgress: data.upload_progress,
      installCount: data.install_count,
      uninstallCount: data.uninstall_count,
      versionDistribution: data.version_distribution,
      selectedDeployVersion: data.selected_deploy_version,
      s3Url: data.s3_url,
      createdBy: data.created_by,
      updatedBy: data.updated_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  static async updateApkSlot(slotId: string, apkData: any, operatorEmail: string = 'system') {
    const { data: existing, error: findError } = await supabase
      .from('apk_vault')
      .select('*')
      .eq('id', slotId)
      .maybeSingle();

    if (findError || !existing) {
      throw new Error('APK not found in vault');
    }

    let dist = [...(existing.version_distribution || [])];
    if (!dist.find((v: any) => v.version === apkData.version)) {
      dist.unshift({ version: apkData.version, deviceCount: 0 });
      if (dist.length > 3) dist = dist.slice(0, 3);
    }

    const { data, error } = await supabase
      .from('apk_vault')
      .update({
        version: apkData.version,
        size: parseSizeToBytes(apkData.size ?? apkData.sizeBytes),
        s3_url: apkData.s3Url,
        version_distribution: dist,
        selected_deploy_version: apkData.version,
        updated_by: operatorEmail,
        updated_at: new Date().toISOString()
      })
      .eq('id', slotId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      packageName: data.package_name,
      version: data.version,
      size: formatBytesToHuman(data.size),
      status: data.status,
      uploadProgress: data.upload_progress,
      installCount: data.install_count,
      uninstallCount: data.uninstall_count,
      versionDistribution: data.version_distribution,
      selectedDeployVersion: data.selected_deploy_version,
      s3Url: data.s3_url,
      createdBy: data.created_by,
      updatedBy: data.updated_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  static async updateApkUrl(slotId: string, s3Url: string, operatorEmail: string = 'system') {
    const { data, error } = await supabase
      .from('apk_vault')
      .update({
        s3_url: s3Url,
        updated_by: operatorEmail,
        updated_at: new Date().toISOString()
      })
      .eq('id', slotId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      packageName: data.package_name,
      version: data.version,
      size: formatBytesToHuman(data.size),
      status: data.status,
      uploadProgress: data.upload_progress,
      installCount: data.install_count,
      uninstallCount: data.uninstall_count,
      versionDistribution: data.version_distribution,
      selectedDeployVersion: data.selected_deploy_version,
      s3Url: data.s3_url,
      createdBy: data.created_by,
      updatedBy: data.updated_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  static async removeApk(slotId: string) {
    const { data: existing, error: findError } = await supabase
      .from('apk_vault')
      .select('*')
      .eq('id', slotId)
      .maybeSingle();

    if (findError || !existing) {
      throw new Error('APK not found in vault');
    }

    const { error } = await supabase
      .from('apk_vault')
      .delete()
      .eq('id', slotId);

    if (error) {
      throw error;
    }

    return {
      id: existing.id,
      name: existing.name,
      packageName: existing.package_name,
      version: existing.version,
      size: formatBytesToHuman(existing.size),
      status: existing.status,
      uploadProgress: existing.upload_progress,
      installCount: existing.install_count,
      uninstallCount: existing.uninstall_count,
      versionDistribution: existing.version_distribution,
      selectedDeployVersion: existing.selected_deploy_version,
      s3Url: existing.s3_url,
      createdBy: existing.created_by,
      updatedBy: existing.updated_by,
      createdAt: existing.created_at,
      updatedAt: existing.updated_at
    };
  }

  static async logDeployment(logData: any, operatorEmail: string = 'system') {
    const { action, apkName, devices, status, apkId, targetVersion } = logData;
    
    // Save to deployment logs table
    const { error: logErr } = await supabase
      .from('apk_deployment_logs')
      .insert([{
        id: `dep-${Date.now()}`,
        action,
        apk_name: apkName,
        devices: devices || 0,
        status,
        performed_by: operatorEmail
      }]);
    
    if (logErr) {
      console.error('[ApkVaultService] logDeployment insert error:', logErr.message);
    }

    // Update active install/uninstall counts directly in database
    if (apkId) {
      const { data: apk, error: fetchErr } = await supabase
        .from('apk_vault')
        .select('*')
        .eq('id', apkId)
        .maybeSingle();

      if (!fetchErr && apk) {
        if (action === 'INSTALL') {
          const newInstallCount = (apk.install_count || 0) + (devices || 0);
          let dist = [...(apk.version_distribution || [])];
          const verDist = dist.find((v: any) => v.version === targetVersion);
          if (verDist) {
            verDist.deviceCount += (devices || 0);
          } else {
            dist.unshift({ version: targetVersion, deviceCount: devices || 0 });
            if (dist.length > 3) dist = dist.slice(0, 3);
          }
          await supabase
            .from('apk_vault')
            .update({
              install_count: newInstallCount,
              version_distribution: dist,
              updated_by: operatorEmail,
              updated_at: new Date().toISOString()
            })
            .eq('id', apkId);
        } else if (action === 'UNINSTALL') {
          const newUninstallCount = (apk.uninstall_count || 0) + (devices || 0);
          await supabase
            .from('apk_vault')
            .update({
              uninstall_count: newUninstallCount,
              updated_by: operatorEmail,
              updated_at: new Date().toISOString()
            })
            .eq('id', apkId);
        }
      }
    }
  }
}
