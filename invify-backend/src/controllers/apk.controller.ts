import { Request, Response } from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ApkVaultService } from '../services/apk-vault.service';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });
export const apkUploadMiddleware = upload.single('file');

const s3Client = new S3Client({
  endpoint: process.env.CONTABO_ENDPOINT || '',
  region: process.env.CONTABO_REGION || 'usc1',
  credentials: {
    accessKeyId: process.env.CONTABO_ACCESS_KEY || '',
    secretAccessKey: process.env.CONTABO_SECRET_KEY || ''
  },
  forcePathStyle: true // Needed for Contabo Object Storage
});

import { io } from '../app';

export class ApkController {

  static async getVault(req: Request, res: Response) {
    try {
      const vault = await ApkVaultService.getVault();
      const logs = await ApkVaultService.getLogs();
      return res.status(200).json({ vault, logs });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async uploadApk(req: Request, res: Response) {
    try {
      const file = req.file;
      const { name, packageName, version, targetSlotId } = req.body;

      if (!file) {
        return res.status(400).json({ error: 'No APK file provided' });
      }

      if (!name || !packageName || !version) {
        return res.status(400).json({ error: 'name, packageName, and version are required' });
      }

      const bucket = process.env.CONTABO_BUCKET;
      const objectKey = `apks/${packageName}_v${version}_${Date.now()}.apk`;

      // Upload to Contabo S3
      await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: file.buffer,
        ContentType: 'application/vnd.android.package-archive',
        ACL: process.env.CONTABO_UPLOAD_PUBLIC_READ === 'true' ? 'public-read' : 'private'
      }));

      // Construct public URL. Contabo URL is usually https://<endpoint>/<bucket>/<key>
      let baseUrl = process.env.CONTABO_PUBLIC_BASE_URL;
      let s3Url = '';
      if (baseUrl) {
          if (!baseUrl.endsWith('/')) baseUrl += '/';
          s3Url = `${baseUrl}${objectKey}`;
      } else {
          let endpointUrl = process.env.CONTABO_ENDPOINT || '';
          if (!endpointUrl.endsWith('/')) endpointUrl += '/';
          s3Url = `${endpointUrl}${bucket}/${objectKey}`;
      }

      const apkData = {
        name,
        packageName,
        version,
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        s3Url
      };

      let result;
      if (targetSlotId && targetSlotId !== 'null' && targetSlotId !== 'undefined') {
        result = await ApkVaultService.updateApkSlot(targetSlotId, apkData);
      } else {
        result = await ApkVaultService.addApk(apkData);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('[ApkController] upload error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async removeApk(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const removed = await ApkVaultService.removeApk(id);
      return res.status(200).json(removed);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async updateApkUrl(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { s3Url } = req.body;
      const result = await ApkVaultService.updateApkUrl(id, s3Url);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async deployApk(req: Request, res: Response) {
    try {
      const { apkId, targetDevices, targetVersion } = req.body;
      
      const vault = await ApkVaultService.getVault();
      const apk = vault.find((a: any) => a.id === apkId);
      
      if (!apk) {
        return res.status(404).json({ error: 'APK not found' });
      }

      // Broadcast OTA push to targeted devices
      if (targetDevices && targetDevices.length > 0) {
        targetDevices.forEach((deviceId: string) => {
          io.to(`device:${deviceId}`).emit('ota_push_event', {
            action: 'INSTALL',
            apkId: apk.id,
            packageName: apk.packageName,
            version: targetVersion,
            url: apk.s3Url,
            targetDevices: targetDevices
          });
        });
      } else {
        // Fallback to all if no target devices specified
        io.emit('ota_push_event', {
          action: 'INSTALL',
          apkId: apk.id,
          packageName: apk.packageName,
          version: targetVersion,
          url: apk.s3Url,
          targetDevices: targetDevices
        });
      }
      
      // Update counts
      apk.installCount += targetDevices.length;
      let dist = apk.versionDistribution.find((v: any) => v.version === targetVersion);
      if (dist) {
        dist.deviceCount += targetDevices.length;
      }

      // Log deployment
      await ApkVaultService.logDeployment({
        action: 'INSTALL',
        apkName: `${apk.name} v${targetVersion}`,
        devices: targetDevices.length,
        status: 'SUCCESS'
      });

      return res.status(200).json({ success: true, message: 'Deployment triggered successfully' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async uninstallApk(req: Request, res: Response) {
    try {
      const { apkId, targetDevices } = req.body;
      
      const vault = await ApkVaultService.getVault();
      const apk = vault.find((a: any) => a.id === apkId);
      
      if (!apk) {
        return res.status(404).json({ error: 'APK not found' });
      }

      // Update counts
      apk.uninstallCount += targetDevices.length;

      // Log deployment
      await ApkVaultService.logDeployment({
        action: 'UNINSTALL',
        apkName: apk.name,
        devices: targetDevices.length,
        status: 'SUCCESS'
      });

      return res.status(200).json({ success: true, message: 'Uninstall triggered successfully' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
