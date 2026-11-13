/** Outgoing platform mail. Distinct from support@iips.app (human approver login). */
export const PLATFORM_MAIL_FROM = 'noreply@iips.app';
export const PLATFORM_MAIL_REPLY_TO = 'support@iips.app';

export function resolveSmtpUser(env: NodeJS.ProcessEnv = process.env): string {
  return String(env.SMTP_USER || env.STAGING_SMTP_USER || PLATFORM_MAIL_FROM).trim();
}

export function resolveMailFrom(env: NodeJS.ProcessEnv = process.env, smtpUser?: string): string {
  return String(env.MAIL_FROM || env.STAGING_MAIL_FROM || smtpUser || PLATFORM_MAIL_FROM).trim();
}

export function resolveMailReplyTo(env: NodeJS.ProcessEnv = process.env): string {
  return String(env.MAIL_REPLY_TO || env.STAGING_MAIL_REPLY_TO || PLATFORM_MAIL_REPLY_TO).trim();
}

export function formatMailFromHeader(fromName: string, address: string): string {
  const name = String(fromName || 'Invify').replace(/"/g, '');
  return `"${name}" <${address}>`;
}
