import { emitIdentityPing } from '../src/utils/device-identity-ping';

describe('emitIdentityPing', () => {
  test('emits device_identity_ping to the tenant room', async () => {
    const emitted: any[] = [];
    const io = {
      in: () => ({ fetchSockets: async () => [{ id: 'sock-1' }] }),
      to: (room: string) => ({
        emit: (event: string, payload: any) => emitted.push({ room, event, payload }),
      }),
    };

    const result = await emitIdentityPing(io, 'tenant-abc');

    expect(result.room).toBe('tenant:tenant-abc');
    expect(result.onlineSockets).toBe(1);
    expect(emitted[0].event).toBe('device_identity_ping');
    expect(emitted[0].payload.tenantId).toBe('tenant-abc');
    expect(emitted[0].payload.requestId).toBeTruthy();
  });
});
