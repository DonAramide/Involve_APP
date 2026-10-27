export const ORIGIN_INVIFY = 'INVIFY_UPLOAD';
export const ORIGIN_CUSTOMER = 'CUSTOMER_INCOMING';

export type DeviceOriginLabel = 'INVIFY_UPLOADED' | 'CUSTOMER_INCOMING';

export function parseDeviceInfo(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? { ...raw } : {};
}

function taggedOrigin(info: Record<string, any>): string {
  return String(info.origin || info.source || '').trim().toUpperCase();
}

export function originOfDevice(row: any): DeviceOriginLabel {
  const info = parseDeviceInfo(row?.device_info);
  const tagged = taggedOrigin(info);
  if (tagged === 'INVIFY_UPLOAD' || tagged === 'INVIFY_UPLOADED') return 'INVIFY_UPLOADED';
  if (tagged === 'CUSTOMER_INCOMING') return 'CUSTOMER_INCOMING';
  if (String(row?.device_category || '').toUpperCase() === 'COMPANY_DEVICE') return 'INVIFY_UPLOADED';
  if (!row?.tenant_id) return 'INVIFY_UPLOADED';
  return 'CUSTOMER_INCOMING';
}

export function mergeDeviceInfo(existing: any, incoming: any, origin: string): Record<string, any> {
  return {
    ...parseDeviceInfo(existing),
    ...parseDeviceInfo(incoming),
    origin,
    source: origin,
  };
}
