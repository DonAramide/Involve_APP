"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApkController = exports.apkUploadMiddleware = void 0;
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const multer_1 = __importDefault(require("multer"));
const client_s3_1 = require("@aws-sdk/client-s3");
const apk_vault_service_1 = require("../services/apk-vault.service");
const apk_object_key_1 = require("../utils/apk-object-key");
const contabo_s3_1 = require("../utils/contabo-s3");
const APK_MAX_BYTES = 500 * 1024 * 1024;
const diskUpload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (_req, _file, cb) => cb(null, os_1.default.tmpdir()),
        filename: (_req, file, cb) => {
            const safe = String(file.originalname || 'app.apk').replace(/[^\w.\-]+/g, '_');
            cb(null, `invify-apk-${Date.now()}-${safe}`);
        },
    }),
    limits: { fileSize: APK_MAX_BYTES },
    fileFilter: (_req, file, cb) => {
        const name = String(file.originalname || '').toLowerCase();
        const type = String(file.mimetype || '').toLowerCase();
        if (name.endsWith('.apk') ||
            type === 'application/vnd.android.package-archive' ||
            type === 'application/octet-stream') {
            cb(null, true);
            return;
        }
        cb(new Error('Only .apk files are allowed'));
    },
});
const apkUploadMiddleware = (req, res, next) => {
    diskUpload.single('file')(req, res, (err) => {
        if (!err)
            return next();
        const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return res.status(status).json({
            error: err.code === 'LIMIT_FILE_SIZE'
                ? 'APK exceeds the 500 MB upload limit'
                : (err.message || 'APK upload failed'),
        });
    });
};
exports.apkUploadMiddleware = apkUploadMiddleware;
function storageUploadErrorMessage(error) {
    const raw = String(error?.message || '');
    if (/char ['"][{!]['"] is not expected|deserialization error/i.test(raw)) {
        return 'Contabo Object Storage rejected the upload (S3-compatible APIs do not accept AWS default checksums).';
    }
    return (0, contabo_s3_1.formatContaboNetworkError)(error) || raw || 'APK upload failed';
}
function removeTempApk(filePath) {
    if (!filePath)
        return;
    fs_1.default.unlink(filePath, (cleanupErr) => {
        if (cleanupErr && cleanupErr.code !== 'ENOENT') {
            console.warn('[ApkController] temp APK cleanup failed:', cleanupErr.message);
        }
    });
}
const APK_TRANSFER_TIMEOUT_MS = 30 * 60 * 1000;
function publicApkDownloadUrl(apkId) {
    const base = (process.env.PUBLIC_API_BASE_URL || process.env.BASE_URL || 'https://api.invify.org').replace(/\/+$/, '');
    return `${base}/api/apk/${apkId}/download`;
}
function getIo() {
    // Lazy import avoids a circular load with app.ts that can 500 APK routes.
    return require('../app').io;
}
class ApkController {
    static async getVault(req, res) {
        try {
            const vault = await apk_vault_service_1.ApkVaultService.getVault();
            const logs = await apk_vault_service_1.ApkVaultService.getLogs();
            return res.status(200).json({ vault, logs });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async uploadApk(req, res) {
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
            const bucket = (0, contabo_s3_1.resolveContaboBucket)();
            if (!bucket) {
                return res.status(503).json({
                    error: 'Object storage is not configured (CONTABO_BUCKET is missing).',
                });
            }
            const objectKey = `apks/${packageName}_v${version}_${Date.now()}.apk`;
            const stat = await fs_1.default.promises.stat(tempPath);
            await (0, contabo_s3_1.putContaboObject)({
                bucket,
                key: objectKey,
                filePath: tempPath,
                contentType: 'application/vnd.android.package-archive',
            });
            const s3Url = (0, contabo_s3_1.publicContaboObjectUrl)(objectKey);
            const apkData = {
                name,
                packageName,
                version,
                size: stat.size,
                sizeFormatted: `${(stat.size / 1024 / 1024).toFixed(1)} MB`,
                s3Url
            };
            let result;
            const operatorEmail = req.user?.email || 'system_operator';
            const explicitSlotId = targetSlotId && targetSlotId !== 'null' && targetSlotId !== 'undefined'
                ? String(targetSlotId)
                : '';
            if (explicitSlotId) {
                result = await apk_vault_service_1.ApkVaultService.updateApkSlot(explicitSlotId, apkData, operatorEmail);
            }
            else {
                result = await apk_vault_service_1.ApkVaultService.addApk(apkData, operatorEmail);
            }
            const downloadUrl = publicApkDownloadUrl(result.id);
            return res.status(200).json({
                ...result,
                url: downloadUrl,
                downloadUrl,
                s3Url: result.s3Url || s3Url,
            });
        }
        catch (error) {
            console.error('[ApkController] upload error:', error);
            const isDuplicate = error?.code === '23505' || /already exists|already in the vault/i.test(String(error?.message || ''));
            return res.status(isDuplicate ? 409 : 500).json({
                error: isDuplicate
                    ? `${req.body?.packageName || 'This package'} could not occupy a new slot. Apply the 20260909 vault-slots migration, then retry Upload New APK.`
                    : (storageUploadErrorMessage(error)),
            });
        }
        finally {
            removeTempApk(tempPath);
        }
    }
    static async downloadApk(req, res) {
        req.setTimeout(APK_TRANSFER_TIMEOUT_MS);
        res.setTimeout(APK_TRANSFER_TIMEOUT_MS);
        try {
            const apk = await apk_vault_service_1.ApkVaultService.getApkById(String(req.params.id || ''));
            if (!apk?.s3Url) {
                return res.status(404).json({ error: 'APK not found' });
            }
            const objectKey = (0, apk_object_key_1.resolveApkObjectKey)(apk.s3Url);
            if (!objectKey) {
                if (apk.s3Url.startsWith('http')) {
                    return res.redirect(302, apk.s3Url);
                }
                return res.status(404).json({ error: 'APK storage key is missing' });
            }
            const bucket = (0, contabo_s3_1.resolveContaboBucket)();
            const s3Client = (0, contabo_s3_1.createContaboS3Client)();
            try {
                const object = await s3Client.send(new client_s3_1.GetObjectCommand({
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
                const body = object.Body;
                if (typeof body.pipe === 'function') {
                    body.pipe(res);
                    body.on?.('error', (err) => {
                        console.error('[ApkController] download stream error:', err);
                        if (!res.headersSent) {
                            res.redirect(302, apk.s3Url);
                        }
                        else {
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
            }
            catch (s3Error) {
                console.warn('[ApkController] S3 stream failed, falling back to Contabo S3 public URL redirect:', s3Error?.message);
                if (apk.s3Url && apk.s3Url.startsWith('http')) {
                    return res.redirect(302, apk.s3Url);
                }
                throw s3Error;
            }
        }
        catch (error) {
            console.error('[ApkController] download error:', error);
            if (!res.headersSent) {
                return res.status(500).json({ error: error.message || 'Download failed' });
            }
        }
    }
    static async removeApk(req, res) {
        try {
            const { id } = req.params;
            const removed = await apk_vault_service_1.ApkVaultService.removeApk(id);
            return res.status(200).json(removed);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async updateApkUrl(req, res) {
        try {
            const { id } = req.params;
            const { s3Url } = req.body;
            const operatorEmail = req.user?.email || 'system_operator';
            const result = await apk_vault_service_1.ApkVaultService.updateApkUrl(id, s3Url, operatorEmail);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async deployApk(req, res) {
        try {
            const { apkId, targetDevices, targetVersion } = req.body;
            const vault = await apk_vault_service_1.ApkVaultService.getVault();
            const apk = vault.find((a) => a.id === apkId);
            if (!apk) {
                return res.status(404).json({ error: 'APK not found' });
            }
            const installUrl = publicApkDownloadUrl(apk.id);
            // Broadcast OTA push to targeted devices
            if (targetDevices && targetDevices.length > 0) {
                targetDevices.forEach((deviceId) => {
                    getIo().to(`device:${deviceId}`).emit('ota_push_event', {
                        action: 'INSTALL',
                        apkId: apk.id,
                        packageName: apk.packageName,
                        version: targetVersion,
                        url: installUrl,
                        targetDevices: targetDevices
                    });
                });
            }
            else {
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
            let dist = apk.versionDistribution.find((v) => v.version === targetVersion);
            if (dist) {
                dist.deviceCount += targetDevices.length;
            }
            // Log deployment
            const operatorEmail = req.user?.email || 'system_operator';
            await apk_vault_service_1.ApkVaultService.logDeployment({
                action: 'INSTALL',
                apkName: `${apk.name} v${targetVersion}`,
                devices: targetDevices.length,
                status: 'SUCCESS',
                apkId: apk.id,
                targetVersion
            }, operatorEmail);
            return res.status(200).json({ success: true, message: 'Deployment triggered successfully' });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async uninstallApk(req, res) {
        try {
            const { apkId, targetDevices } = req.body;
            const vault = await apk_vault_service_1.ApkVaultService.getVault();
            const apk = vault.find((a) => a.id === apkId);
            if (!apk) {
                return res.status(404).json({ error: 'APK not found' });
            }
            // Update counts
            apk.uninstallCount += targetDevices.length;
            // Log deployment
            const operatorEmail = req.user?.email || 'system_operator';
            await apk_vault_service_1.ApkVaultService.logDeployment({
                action: 'UNINSTALL',
                apkName: apk.name,
                devices: targetDevices.length,
                status: 'SUCCESS',
                apkId: apk.id
            }, operatorEmail);
            return res.status(200).json({ success: true, message: 'Uninstall triggered successfully' });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}
exports.ApkController = ApkController;
//# sourceMappingURL=apk.controller.js.map