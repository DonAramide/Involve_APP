import * as fs from 'fs';
import * as path from 'path';

const LOCAL_DB_PATH = path.join(process.cwd(), 'apk_vault_db.json');

function getLocalDB() {
  try {
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      const initial = { vault: [], deploymentLog: [] };
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initial, null, 2));
      return initial;
    }
    return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf-8'));
  } catch (_) {
    return { vault: [], deploymentLog: [] };
  }
}

function saveLocalDB(data: any) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
}

export class ApkVaultService {
  static async getVault() {
    return getLocalDB().vault;
  }

  static async getLogs() {
    return getLocalDB().deploymentLog;
  }

  static async addApk(apkData: any) {
    const db = getLocalDB();
    
    // Enforce 3 slots max
    if (db.vault.length >= 3) {
      throw new Error('Vault is full. Maximum of 3 APKs allowed.');
    }

    const newApk = {
      id: `apk-${Date.now()}`,
      name: apkData.name,
      packageName: apkData.packageName,
      version: apkData.version,
      size: apkData.size,
      status: 'READY',
      uploadProgress: 100,
      installCount: 0,
      uninstallCount: 0,
      versionDistribution: [
        { version: apkData.version, deviceCount: 0 }
      ],
      selectedDeployVersion: apkData.version,
      s3Url: apkData.s3Url,
      createdAt: new Date().toISOString()
    };

    db.vault.push(newApk);
    saveLocalDB(db);
    return newApk;
  }

  static async updateApkSlot(slotId: string, apkData: any) {
    const db = getLocalDB();
    const index = db.vault.findIndex((a: any) => a.id === slotId);
    if (index === -1) throw new Error('APK not found in vault');

    const existing = db.vault[index];
    
    let dist = [...existing.versionDistribution];
    if (!dist.find((v: any) => v.version === apkData.version)) {
      dist.unshift({ version: apkData.version, deviceCount: 0 });
      if (dist.length > 3) dist = dist.slice(0, 3);
    }

    db.vault[index] = {
      ...existing,
      version: apkData.version,
      size: apkData.size,
      s3Url: apkData.s3Url,
      versionDistribution: dist,
      selectedDeployVersion: apkData.version,
      updatedAt: new Date().toISOString()
    };

    saveLocalDB(db);
    return db.vault[index];
  }

  static async updateApkUrl(slotId: string, s3Url: string) {
    const db = getLocalDB();
    const index = db.vault.findIndex((a: any) => a.id === slotId);
    if (index === -1) throw new Error('APK not found in vault');
    db.vault[index].s3Url = s3Url;
    db.vault[index].updatedAt = new Date().toISOString();
    saveLocalDB(db);
    return db.vault[index];
  }

  static async removeApk(slotId: string) {
    const db = getLocalDB();
    const index = db.vault.findIndex((a: any) => a.id === slotId);
    if (index === -1) throw new Error('APK not found in vault');

    const removed = db.vault.splice(index, 1)[0];
    saveLocalDB(db);
    return removed;
  }

  static async logDeployment(logData: any) {
    const db = getLocalDB();
    db.deploymentLog.unshift({
      id: `dep-${Date.now()}`,
      action: logData.action,
      apkName: logData.apkName,
      devices: logData.devices,
      status: logData.status,
      time: new Date().toISOString()
    });
    
    // limit logs
    if (db.deploymentLog.length > 50) {
      db.deploymentLog = db.deploymentLog.slice(0, 50);
    }

    saveLocalDB(db);
  }
}
