/**
 * Socket.io tenant room helpers (G13).
 *
 * Replacement authorization model (replaces unrestricted room `all`):
 * - `tenant:{id}` — merchant traffic, including emergency_lock (already emitted here).
 * - `device:{id}` — only JWT/device-owner claim or server-persisted identity for that tenant.
 * - `ops:platform` — authenticated platform operators (canOperateAcrossTenants).
 * - `ops:devices` — authenticated device-owner sockets (POS/fleet signals).
 * Client-supplied tenantId, deviceId, plan, type, and business names never authorize rooms.
 */

export const PLATFORM_OPS_ROOM = 'ops:platform';
export const DEVICE_FLEET_ROOM = 'ops:devices';

export type JoinRoomInput = {
  plan?: unknown;
  type?: unknown;
  deviceId?: unknown;
  businessName?: unknown;
  tenantId?: unknown;
};

export type SocketRoomAuth = {
  authTenantId?: string | null;
  jwtDeviceId?: string | null;
  isPlatformOps?: boolean;
  isDeviceOwner?: boolean;
};

function usableId(value: unknown): string {
  return String(value || '').trim();
}

/**
 * Rooms a socket may join. Client payload is ignored for authorization.
 */
export function roomsForAuthenticatedSocket(
  authTenantId: string | undefined | null,
  _clientData: JoinRoomInput = {},
  auth: SocketRoomAuth = {},
): string[] {
  const rooms: string[] = [];
  const tenant = usableId(auth.authTenantId ?? authTenantId);
  if (tenant) rooms.push(`tenant:${tenant}`);

  const jwtDevice = usableId(auth.jwtDeviceId);
  if (jwtDevice) rooms.push(`device:${jwtDevice}`);

  if (auth.isPlatformOps) rooms.push(PLATFORM_OPS_ROOM);
  if (auth.isDeviceOwner) rooms.push(DEVICE_FLEET_ROOM);

  return rooms;
}

/** Location broadcasts use the authenticated socket tenant, never the payload. */
export function authoritativeLocationTenantId(
  authTenantId: string | undefined | null,
  _clientTenantId?: unknown,
): string {
  const tenant = usableId(authTenantId);
  return tenant || 'unknown';
}

export function isLoopbackAddress(ip: string | undefined | null): boolean {
  const raw = String(ip || '').replace(/^::ffff:/, '').trim();
  return raw === '127.0.0.1' || raw === '::1' || raw === 'localhost';
}
