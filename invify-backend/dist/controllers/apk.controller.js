"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApkController = exports.apkUploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const client_s3_1 = require("@aws-sdk/client-s3");
const apk_vault_service_1 = require("../services/apk-vault.service");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });
exports.apkUploadMiddleware = upload.single('file');
const s3Client = new client_s3_1.S3Client({
    endpoint: process.env.CONTABO_ENDPOINT || '',
    region: process.env.CONTABO_REGION || 'usc1',
    credentials: {
        accessKeyId: process.env.CONTABO_ACCESS_KEY || '',
        secretAccessKey: process.env.CONTABO_SECRET_KEY || ''
    },
    forcePathStyle: true // Needed for Contabo Object Storage
});
const app_1 = require("../app");
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
            await s3Client.send(new client_s3_1.PutObjectCommand({
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
                if (!baseUrl.endsWith('/'))
                    baseUrl += '/';
                s3Url = `${baseUrl}${objectKey}`;
            }
            else {
                let endpointUrl = process.env.CONTABO_ENDPOINT || '';
                if (!endpointUrl.endsWith('/'))
                    endpointUrl += '/';
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
            const operatorEmail = req.user?.email || 'system_operator';
            if (targetSlotId && targetSlotId !== 'null' && targetSlotId !== 'undefined') {
                result = await apk_vault_service_1.ApkVaultService.updateApkSlot(targetSlotId, apkData, operatorEmail);
            }
            else {
                result = await apk_vault_service_1.ApkVaultService.addApk(apkData, operatorEmail);
            }
            return res.status(200).json(result);
        }
        catch (error) {
            console.error('[ApkController] upload error:', error);
            return res.status(500).json({ error: error.message });
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
            // Broadcast OTA push to targeted devices
            if (targetDevices && targetDevices.length > 0) {
                targetDevices.forEach((deviceId) => {
                    app_1.io.to(`device:${deviceId}`).emit('ota_push_event', {
                        action: 'INSTALL',
                        apkId: apk.id,
                        packageName: apk.packageName,
                        version: targetVersion,
                        url: apk.s3Url,
                        targetDevices: targetDevices
                    });
                });
            }
            else {
                // Fallback to all if no target devices specified
                app_1.io.emit('ota_push_event', {
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