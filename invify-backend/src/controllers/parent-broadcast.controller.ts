import { Request, Response } from 'express';
import { supabaseAdmin } from '../db/supabase';
import { resolveTenantScope } from '../utils/resolve-tenant-scope';
import { emailService } from '../services/email.service';
import { normalizeSmsPhone, sendPlainSms, smsIsConfigured } from '../services/sms.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE = 1000;
const MAX_RECIPIENTS = 400;

export function collectParentRecipients(rows: any[]) {
  const emails = new Set<string>();
  const phones = new Set<string>();
  let parents = 0;
  for (const row of rows || []) {
    const payload = row?.payload && typeof row.payload === 'object' ? row.payload : row;
    if (!payload || typeof payload !== 'object') continue;
    if (payload.isDeleted === true || payload.is_deleted === true) continue;
    const name = String(payload.fullName || payload.name || '').trim();
    if (!name && !payload.email && !payload.phone) continue;
    parents += 1;
    const email = String(payload.email || '').trim().toLowerCase();
    if (EMAIL_RE.test(email)) emails.add(email);
    const phone = normalizeSmsPhone(payload.phone);
    if (phone) phones.add(phone);
  }
  return {
    parents,
    emails: Array.from(emails).slice(0, MAX_RECIPIENTS),
    phones: Array.from(phones).slice(0, MAX_RECIPIENTS),
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadParents(tenantId: string) {
  const { data, error } = await supabaseAdmin
    .from('school_entities')
    .select('payload')
    .eq('tenant_id', tenantId)
    .eq('entity_type', 'parent')
    .limit(2000);
  if (error) {
    throw new Error(error.message);
  }
  return collectParentRecipients(data || []);
}

async function schoolName(tenantId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('name')
    .eq('id', tenantId)
    .maybeSingle();
  return String(data?.name || 'Your school').trim() || 'Your school';
}

export class ParentBroadcastController {
  static async audience(req: Request, res: Response) {
    try {
      const tenantId = resolveTenantScope(req);
      if (!tenantId) return res.status(401).json({ error: 'School not found for this account.' });
      const audience = await loadParents(tenantId);
      return res.json({
        parents: audience.parents,
        emailRecipients: audience.emails.length,
        smsRecipients: audience.phones.length,
        smsConfigured: smsIsConfigured(),
      });
    } catch (err: any) {
      console.error('[ParentBroadcast] audience:', err?.message || err);
      return res.status(500).json({ error: 'Could not load parents.' });
    }
  }

  static async send(req: Request, res: Response) {
    try {
      const tenantId = resolveTenantScope(req);
      if (!tenantId) return res.status(401).json({ error: 'School not found for this account.' });

      const channels = Array.isArray(req.body?.channels)
        ? req.body.channels.map((c: unknown) => String(c).toLowerCase())
        : [];
      const wantEmail = channels.includes('email');
      const wantSms = channels.includes('sms');
      if (!wantEmail && !wantSms) {
        return res.status(400).json({ error: 'Choose email, SMS, or both.' });
      }

      const message = String(req.body?.message || '').trim();
      if (!message) return res.status(400).json({ error: 'Enter the message to send.' });
      if (message.length > MAX_MESSAGE) {
        return res.status(400).json({ error: `Message must be ${MAX_MESSAGE} characters or less.` });
      }

      const testOnly = req.body?.testOnly === true;
      if (wantSms && !smsIsConfigured()) {
        return res.status(400).json({
          error: 'SMS is not configured on this server yet. You can still send by email.',
        });
      }

      const school = await schoolName(tenantId);
      const subject = String(req.body?.subject || `Message from ${school}`).replace(/\s+/g, ' ').trim().slice(0, 120);
      const audience = testOnly ? null : await loadParents(tenantId);

      const emailTargets = wantEmail
        ? (testOnly
            ? [String(req.body?.testEmail || '').trim().toLowerCase()].filter((e) => EMAIL_RE.test(e))
            : audience!.emails)
        : [];
      const smsTargets = wantSms
        ? (testOnly
            ? [normalizeSmsPhone(req.body?.testPhone)].filter((p): p is string => !!p)
            : audience!.phones)
        : [];

      if (wantEmail && emailTargets.length === 0) {
        return res.status(400).json({
          error: testOnly
            ? 'Enter a valid email address for the test.'
            : 'No parent email addresses are on file. Sync the school from the tablet first.',
        });
      }
      if (wantSms && smsTargets.length === 0) {
        return res.status(400).json({
          error: testOnly
            ? 'Enter a valid phone number for the test SMS.'
            : 'No parent phone numbers are on file. Sync the school from the tablet first.',
        });
      }

      const email = { sent: 0, failed: 0 };
      const sms = { sent: 0, failed: 0 };

      if (wantEmail) {
        for (const to of emailTargets) {
          const ok = await emailService.sendParentNotice(to, subject, message, school);
          if (ok) email.sent += 1;
          else email.failed += 1;
          await delay(120);
        }
      }
      if (wantSms) {
        const smsBody = message.length > 480 ? `${message.slice(0, 477)}...` : message;
        for (const to of smsTargets) {
          const result = await sendPlainSms(to, smsBody);
          if (result.ok) sms.sent += 1;
          else sms.failed += 1;
          await delay(120);
        }
      }

      console.log(
        `[ParentBroadcast] tenant=${tenantId.slice(0, 8)} test=${testOnly} email=${email.sent}/${email.failed} sms=${sms.sent}/${sms.failed}`,
      );

      return res.json({
        success: email.failed === 0 && sms.failed === 0,
        test: testOnly,
        email: wantEmail ? email : undefined,
        sms: wantSms ? sms : undefined,
      });
    } catch (err: any) {
      console.error('[ParentBroadcast] send:', err?.message || err);
      return res.status(500).json({ error: 'The message could not be sent.' });
    }
  }
}
