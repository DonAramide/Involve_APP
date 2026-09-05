import fs from 'fs';
import os from 'os';
import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { ApkVaultService } from '../services/apk-vault.service';
import { resolveApkObjectKey } from '../utils/apk-object-key';
import { createContaboS3Client, resolveContaboBucket, resolveContaboEndpoint } from '../utils/contabo-s3';

const APK_MAX_BYTES = 500 * 1024 * 1024;

const diskUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => {
      const safe = String(file.originalname || 'app.apk').replace(/[^\w.\-]+/g, '_');
      cb(null, `invify-apk-${Date.now()}-${safe}`);
    },
  }),
  limits: { fileSize: APK_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    const name = String(file.originalname || '').toLowerCase();
    const type = String(file.mimetype || '').toLowerCase();
    if (
      name.endsWith('.apk') ||
      type === 'application/vnd.android.package-archive' ||
      type === 'application/octet-stream'
    ) {
      cb(null, true);
      return;
    }
    cb(new Error('Only .apk files are allowed'));
  },
});

export const apkUploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
  diskUpload.single('file')(req, res, (err: any) => {
    if (!err) return next();
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      error: err.code === 'LIMIT_FILE_SIZE'
        ? 'APK exceeds the 500 MB upload limit'
        : (err.message || 'APK upload failed'),
    });
  });
};

function storageUploadErrorMessage(error: any): string {
  const raw = String(error?.message || '');
  if (/char ['"][{!]['"] is not expected|deserialization error/i.test(raw)) {
    return 'Contabo Object Storage rejected the upload (S3-compatible APIs do not accept AWS default checksums).';
  }
  return raw || 'APK upload failed';
}

function apkPutObjectInput(bucket: string, objectKey: string, body: Buffer) {
  const input: Record<string, unknown> = {
    Bucket: bucket,
    Key: objectKey,
    Body: body,
    ContentLength: body.byteLength,
    ContentType: 'application/vnd.android.package-archive',
  };
  if (process.env.CONTABO_UPLOAD_PUBLIC_READ === 'true') {
    input.ACL = 'public-read';
  }
  return input;
}

function removeTempApk(filePath?: string) {
  if (!filePath) return;
  fs.unlink(filePath, (cleanupErr) => {
    if (cleanupErr && (cleanupErr as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('[ApkController] temp APK cleanup failed:', cleanupErr.message);
    }
  });
}

const APK_TRANSFER_TIMEOUT_MS = 15 * 60 * 1000;

function publicApkDownloadUrl(apkId: string): string {
  const base = (process.env.PUBLIC_API_BASE_URL || process.env.BASE_URL || '').replace(/\/+$/, '');
  return base ? `${base}/api/apk/${apkId}/download` : `/api/apk/${apkId}/download`;
}

function getIo() {
  // Lazy import avoids a circular load with app.ts that can 500 APK routes.
  return require('../app').io;
}

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
    req.setTimeout(APK_TRANSFER_TIMEOUT_MS);
    res.setTimeout(APK_TRANSFER_TIMEOUT_MS);
    const file = req.file;
    const tempPath = file?.path;
    try {
      const { name, packageName, version, targetSlotId } = req.body;

      if (!file || !tempPath) {
        return res.status(400).json({ error: 'No APK file provided' });
      }

      if (!name || !packageName || !version) {
        return res.status(400).json({ error: 'name, packageName, and version are required' });
      }

      const bucket = resolveContaboBucket();
      if (!bucket) {
        return res.status(503).json({
          error: 'Object storage is not configured (CONTABO_BUCKET is missing).',
        });
      }
      const objectKey = `apks/${packageName}_v${version}_${Date.now()}.apk`;
      const body = await fs.promises.readFile(tempPath);

      const s3Client = createContaboS3Client();
      await s3Client.send(new PutObjectCommand(apkPutObjectInput(bucket, objectKey, body) as any));

      // Construct public URL with Contabo tenant ID format: https://<endpoint>/<tenantId>:<bucket>/<key>
      let baseUrl = process.env.CONTABO_PUBLIC_BASE_URL;
      let s3Url = '';
      if (baseUrl) {
        if (!baseUrl.endsWith('/')) baseUrl += '/';
        s3Url = `${baseUrl}${objectKey}`;
      } else {
        let endpointUrl = resolveContaboEndpoint();
        if (!endpointUrl.endsWith('/')) endpointUrl += '/';
        const tenantId = (process.env.CONTABO_TENANT_ID || process.env.CONTABO_CUSTOMER_ID || '0d205683f3b543beb7298e9b68e26b0f').trim();
        const bucketPath = tenantId && !bucket?.includes(':') ? `${tenantId}:${bucket}` : bucket;
        s3Url = `${endpointUrl}${bucketPath}/${objectKey}`;
      }

      const apkData = {
        name,
        packageName,
        version,
        size: body.byteLength,
        sizeFormatted: `${(body.byteLength / 1024 / 1024).toFixed(1)} MB`,
        s3Url
      };

      let result;
      const operatorEmail = (req as any).user?.email || 'system_operator';
      const vault = await ApkVaultService.getVault();
      const existingForPackage = vault.find(
        (a: any) => String(a.packageName || '').toLowerCase() === String(packageName).toLowerCase(),
      );
      const slotId =
        targetSlotId && targetSlotId !== 'null' && targetSlotId !== 'undefined'
          ? targetSlotId
          : existingForPackage?.id;

      if (slotId) {
        result = await ApkVaultService.updateApkSlot(slotId, apkData, operatorEmail);
      } else {
        result = await ApkVaultService.addApk(apkData, operatorEmail);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('[ApkController] upload error:', error);
      const isDuplicate = error?.code === '23505' || /already exists|already in the vault/i.test(String(error?.message || ''));
      return res.status(isDuplicate ? 409 : 500).json({
        error: isDuplicate
          ? `${req.body?.packageName || 'This package'} is already in the vault. Use Upload New Version on that slot.`
          : (storageUploadErrorMessage(error)),
      });
    } finally {
      removeTempApk(tempPath);
    }
  }

  static async downloadApk(req: Request, res: Response) {
    req.setTimeout(APK_TRANSFER_TIMEOUT_MS);
    res.setTimeout(APK_TRANSFER_TIMEOUT_MS);
    try {
      const apk = await ApkVaultService.getApkById(String(req.params.id || ''));
      if (!apk?.s3Url) {
        return res.status(404).json({ error: 'APK not found' });
      }

      const objectKey = resolveApkObjectKey(apk.s3Url);
      if (!objectKey) {
        if (apk.s3Url.startsWith('http')) {
          return res.redirect(302, apk.s3Url);
        }
        return res.status(404).json({ error: 'APK storage key is missing' });
      }

      const bucket = resolveContaboBucket();
      const s3Client = createContaboS3Client();
      
      try {
        const object = await s3Client.send(new GetObjectCommand({
          Bucket: bucket,
          Key: objectKey,
        }));
        if (!object.Body) {
          if (apk.s3Url.startsWith('http')) {
            return res.redirect(302, apk.s3Url);
          }
          return res.status(404).json({ error: 'APK file is empty' });
        }

        const filename = `${apk.packageName || 'app'}_v${apk.version || '0'}.apk`
          .replace(/[^\w.\-]+/g, '_');
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        if (object.ContentLength) {
          res.setHeader('Content-Length', String(object.ContentLength));
        }
        res.setHeader('Cache-Control', 'public, max-age=300');

        const body = object.Body as { pipe?: Function; transformToByteArray?: () => Promise<Uint8Array> };
        if (typeof body.pipe === 'function') {
          body.pipe(res);
          (body as any).on?.('error', (err: Error) => {
            console.error('[ApkController] download stream error:', err);
            if (!res.headersSent) {
              res.redirect(302, apk.s3Url);
            } else {
              res.end();
            }
          });
          return;
        }

        const bytes = await body.transformToByteArray?.();
        if (!bytes) {
          return res.redirect(302, apk.s3Url);
        }
        return res.send(Buffer.from(bytes));
      } catch (s3Error: any) {
        console.warn('[ApkController] S3 stream failed, falling back to Contabo S3 public URL redirect:', s3Error?.message);
        if (apk.s3Url && apk.s3Url.startsWith('http')) {
          return res.redirect(302, apk.s3Url);
        }
        throw s3Error;
      }
    } catch (error: any) {
      console.error('[ApkController] download error:', error);
      if (!res.headersSent) {
        return res.status(500).json({ error: error.message || 'Download failed' });
      }
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
      const operatorEmail = (req as any).user?.email || 'system_operator';
      const result = await ApkVaultService.updateApkUrl(id, s3Url, operatorEmail);
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

      const installUrl = publicApkDownloadUrl(apk.id);

      // Broadcast OTA push to targeted devices
      if (targetDevices && targetDevices.length > 0) {
        targetDevices.forEach((deviceId: string) => {
          getIo().to(`device:${deviceId}`).emit('ota_push_event', {
            action: 'INSTALL',
            apkId: apk.id,
            packageName: apk.packageName,
            version: targetVersion,
            url: installUrl,
            targetDevices: targetDevices
          });
        });
      } else {
        // Fallback to all if no target devices specified
        getIo().emit('ota_push_event', {
          action: 'INSTALL',
          apkId: apk.id,
          packageName: apk.packageName,
          version: targetVersion,
          url: installUrl,
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
      const operatorEmail = (req as any).user?.email || 'system_operator';
      await ApkVaultService.logDeployment({
        action: 'INSTALL',
        apkName: `${apk.name} v${targetVersion}`,
        devices: targetDevices.length,
        status: 'SUCCESS',
        apkId: apk.id,
        targetVersion
      }, operatorEmail);

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
      const operatorEmail = (req as any).user?.email || 'system_operator';
      await ApkVaultService.logDeployment({
        action: 'UNINSTALL',
        apkName: apk.name,
        devices: targetDevices.length,
        status: 'SUCCESS',
        apkId: apk.id
      }, operatorEmail);

      return res.status(200).json({ success: true, message: 'Uninstall triggered successfully' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
