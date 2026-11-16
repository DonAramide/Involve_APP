import { Request, Response } from 'express';
import { supabaseAdmin } from '../db/supabase';
import { resolveTenantScope } from '../utils/resolve-tenant-scope';
import { emailService } from '../services/email.service';
import { normalizeSmsPhone, sendPlainSms, smsIsConfigured } from '../services/sms.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE = 1000;
const MAX_RECIPIENTS = 400;

export function collectCustomerRecipients(rows: any[]) {
  const emails = new Set<string>();
  const phones = new Set<string>();
  let customers = 0;
  for (const row of rows || []) {
    if (!row || typeof row !== 'object') continue;
    const status = String(row.status || 'ACTIVE').trim().toUpperCase();
    if (status === 'DELETED' || status === 'INACTIVE' || status === 'ARCHIVED') continue;
    if (row.is_deleted === true || row.isDeleted === true) continue;
    const name = String(row.name || row.fullName || '').trim();
    const email = String(row.email || '').trim().toLowerCase();
    const phone = normalizeSmsPhone(row.phone);
    if (!name && !email && !phone) continue;
    customers += 1;
    if (EMAIL_RE.test(email)) emails.add(email);
    if (phone) phones.add(phone);
  }
  return {
    customers,
    emails: Array.from(emails).slice(0, MAX_RECIPIENTS),
    phones: Array.from(phones).slice(0, MAX_RECIPIENTS),
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadCustomers(tenantId: string) {
  const { data, error } = await supabaseAdmin
    .from('customers')
    // No customers.status column on staging baseline; soft-default in collectCustomerRecipients.
    .select('id, name, email, phone')
    .eq('tenant_id', tenantId)
    .limit(2000);
  if (error) {
    throw new Error(error.message);
  }
  return collectCustomerRecipients(data || []);
}

async function businessName(tenantId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('name')
    .eq('id', tenantId)
    .maybeSingle();
  return String(data?.name || 'Your business').trim() || 'Your business';
}

export class CustomerBroadcastController {
  static async audience(req: Request, res: Response) {
    try {
      const tenantId = resolveTenantScope(req);
      if (!tenantId) return res.status(401).json({ error: 'Business not found for this account.' });
      const audience = await loadCustomers(tenantId);
      return res.json({
        customers: audience.customers,
        emailRecipients: audience.emails.length,
        smsRecipients: audience.phones.length,
        smsConfigured: smsIsConfigured(),
      });
    } catch (err: any) {
      console.error('[CustomerBroadcast] audience:', err?.message || err);
      return res.status(500).json({ error: 'Could not load customers.' });
    }
  }

  static async send(req: Request, res: Response) {
    try {
      const tenantId = resolveTenantScope(req);
      if (!tenantId) return res.status(401).json({ error: 'Business not found for this account.' });

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

      const business = await businessName(tenantId);
      const subject = String(req.body?.subject || `Message from ${business}`).replace(/\s+/g, ' ').trim().slice(0, 120);
      const audience = testOnly ? null : await loadCustomers(tenantId);

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
            : 'No customer email addresses are on file. Add emails on the customer records first.',
        });
      }
      if (wantSms && smsTargets.length === 0) {
        return res.status(400).json({
          error: testOnly
            ? 'Enter a valid phone number for the test SMS.'
            : 'No customer phone numbers are on file. Add phones on the customer records first.',
        });
      }

      const email = { sent: 0, failed: 0 };
      const sms = { sent: 0, failed: 0 };

      if (wantEmail) {
        for (const to of emailTargets) {
          const ok = await emailService.sendCustomerNotice(to, subject, message, business);
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
        `[CustomerBroadcast] tenant=${tenantId.slice(0, 8)} test=${testOnly} email=${email.sent}/${email.failed} sms=${sms.sent}/${sms.failed}`,
      );

      return res.json({
        success: email.failed === 0 && sms.failed === 0,
        test: testOnly,
        email: wantEmail ? email : undefined,
        sms: wantSms ? sms : undefined,
      });
    } catch (err: any) {
      console.error('[CustomerBroadcast] send:', err?.message || err);
      return res.status(500).json({ error: 'The message could not be sent.' });
    }
  }
}
