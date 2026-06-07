// src/services/audit-archive.service.ts
import * as fs from 'fs';
import * as path from 'path';
import { supabase } from '../db/supabase';

const GLOBAL_SETTINGS_PATH = path.join(process.cwd(), 'global_settings.json');
const ARCHIVE_FILE_PATH = path.join(process.cwd(), 'archived_audit_logs.json');
const TERMINAL_DB_PATH = path.join(process.cwd(), 'terminal_inventory_db.json');

async function getGlobalSettings() {
  try {
    const { data, error } = await supabase.from('system_configurations')
      .select('config_value')
      .eq('config_key', 'audit_retention_hours')
      .single();
    if (!error && data) {
      return { audit_retention_hours: parseInt(data.config_value, 10) };
    }
  } catch(dbErr) {}

  // Fallback
  try {
    if (fs.existsSync(GLOBAL_SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(GLOBAL_SETTINGS_PATH, 'utf-8'));
    }
  } catch (_) {}
  return { audit_retention_hours: 72 };
}

function getArchiveDB() {
  try {
    if (!fs.existsSync(ARCHIVE_FILE_PATH)) {
      const initial = { archived_at: new Date().toISOString(), logs: [] };
      fs.writeFileSync(ARCHIVE_FILE_PATH, JSON.stringify(initial, null, 2));
      return initial;
    }
    return JSON.parse(fs.readFileSync(ARCHIVE_FILE_PATH, 'utf-8'));
  } catch (_) {
    return { archived_at: new Date().toISOString(), logs: [] };
  }
}

function saveArchiveDB(data: any) {
  fs.writeFileSync(ARCHIVE_FILE_PATH, JSON.stringify(data, null, 2));
}

export class AuditArchiveService {
  /**
   * Run the archival process. Logs older than configured X hours are shifted
   * to archived_audit_logs.json and pruned from active databases/local mock JSON files.
   */
  static async runArchiving(): Promise<{ archivedCount: number }> {
    const settings = await getGlobalSettings();
    const retentionHours = settings.audit_retention_hours || 72;
    const cutoffTime = new Date(Date.now() - retentionHours * 60 * 60 * 1000);
    const cutoffIso = cutoffTime.toISOString();

    let archivedCount = 0;
    const archiveDb = getArchiveDB();

    console.log(`[AuditArchive] Starting archival run. Cutoff time: ${cutoffIso} (Retention: ${retentionHours} hours)`);

    // 1. Archive local mock terminal logs
    try {
      if (fs.existsSync(TERMINAL_DB_PATH)) {
        const terminalDb = JSON.parse(fs.readFileSync(TERMINAL_DB_PATH, 'utf-8'));
        const activeLogs: any[] = [];
        const logsToArchive: any[] = [];

        if (terminalDb.audit_log && Array.isArray(terminalDb.audit_log)) {
          terminalDb.audit_log.forEach((log: any) => {
            const logTime = new Date(log.created_at || log.timestamp || Date.now());
            if (logTime < cutoffTime) {
              logsToArchive.push({ ...log, source_origin: 'terminal_audit_log_local' });
            } else {
              activeLogs.push(log);
            }
          });

          if (logsToArchive.length > 0) {
            terminalDb.audit_log = activeLogs;
            fs.writeFileSync(TERMINAL_DB_PATH, JSON.stringify(terminalDb, null, 2));
            archiveDb.logs.push(...logsToArchive);
            archivedCount += logsToArchive.length;
            console.log(`[AuditArchive] Archived ${logsToArchive.length} local terminal audit records.`);
          }
        }
      }
    } catch (err: any) {
      console.error('[AuditArchive] Error archiving local terminal logs:', err.message);
    }

    // 2. Archive online Supabase terminal logs if available
    try {
      const { data: onlineTermLogs, error: fetchErr } = await supabase
        .from('terminal_audit_log')
        .select('*')
        .lt('created_at', cutoffIso);

      if (!fetchErr && onlineTermLogs && onlineTermLogs.length > 0) {
        // Append to archive file
        const mapped = onlineTermLogs.map(l => ({ ...l, source_origin: 'terminal_audit_log_online' }));
        archiveDb.logs.push(...mapped);

        // Delete from active database
        const ids = onlineTermLogs.map(l => l.id);
        const { error: delErr } = await supabase.from('terminal_audit_log').delete().in('id', ids);

        if (!delErr) {
          archivedCount += onlineTermLogs.length;
          console.log(`[AuditArchive] Archived ${onlineTermLogs.length} online terminal audit records.`);
        }
      }
    } catch (err: any) {
      console.warn('[AuditArchive] Supabase terminal logs archival bypassed (connection/offline):', err.message);
    }

    // 3. Archive online Supabase general audit logs if available
    try {
      const { data: onlineGeneralLogs, error: fetchErr } = await supabase
        .from('audit_logs')
        .select('*')
        .lt('timestamp', cutoffIso);

      if (!fetchErr && onlineGeneralLogs && onlineGeneralLogs.length > 0) {
        const mapped = onlineGeneralLogs.map(l => ({ ...l, source_origin: 'audit_logs_online' }));
        archiveDb.logs.push(...mapped);

        const ids = onlineGeneralLogs.map(l => l.id);
        const { error: delErr } = await supabase.from('audit_logs').delete().in('id', ids);

        if (!delErr) {
          archivedCount += onlineGeneralLogs.length;
          console.log(`[AuditArchive] Archived ${onlineGeneralLogs.length} online general audit records.`);
        }
      }
    } catch (err: any) {
      console.warn('[AuditArchive] Supabase general logs archival bypassed:', err.message);
    }

    // Save modifications to archive file
    if (archivedCount > 0) {
      archiveDb.archived_at = new Date().toISOString();
      saveArchiveDB(archiveDb);
    }

    console.log(`[AuditArchive] Archival run complete. Shifted ${archivedCount} total entries to file archived_audit_logs.json.`);
    return { archivedCount };
  }
}
