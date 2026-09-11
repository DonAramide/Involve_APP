import { randomUUID } from 'crypto';

export function buildIdentityPingPayload(tenantId?: string | null) {
  return {
    requestId: randomUUID(),
    tenantId: tenantId || null,
    ts: new Date().toISOString(),
  };
}

export async function emitIdentityPing(
  io: { in: (room: string) => { fetchSockets: () => Promise<unknown[]> }; to: (room: string) => { emit: (event: string, payload: unknown) => void } },
  tenantId: string,
): Promise<{ onlineSockets: number; requestId: string; room: string }> {
  const room = `tenant:${tenantId}`;
  const payload = buildIdentityPingPayload(tenantId);
  const sockets = await io.in(room).fetchSockets();
  io.to(room).emit('device_identity_ping', payload);
  return { onlineSockets: sockets.length, requestId: payload.requestId, room };
}
