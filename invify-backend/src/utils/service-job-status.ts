export type ServiceJobBucket = 'active' | 'ready' | 'other';

export function serviceJobStatusBucket(raw: unknown): ServiceJobBucket {
  const status = String(raw || '').toLowerCase().trim();
  if (status === 'in_progress' || status === 'pending' || status === 'partial' || status === 'unpaid') {
    return 'active';
  }
  if (status === 'ready' || status === 'completed' || status === 'paid' || status === 'done' || status === 'delivered') {
    return 'ready';
  }
  return 'other';
}

export function isMissingRelationError(error: { message?: string; code?: string } | null | undefined): boolean {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '');
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    code === '42703' ||
    message.includes('does not exist') ||
    message.includes('could not find the table')
  );
}
