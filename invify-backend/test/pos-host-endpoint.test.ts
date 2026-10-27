import {
  DEFAULT_NIBSS_IP,
  DEFAULT_NIBSS_PORT,
  resolvePosHosts,
} from '../src/services/pos-host-endpoint';

describe('resolvePosHosts', () => {
  it('uses the NIBSS host even when isActive is false', () => {
    const resolved = resolvePosHosts({
      activeHost: 'nibss',
      hosts: [
        { hostCode: 'express_pay', ip: '', port: 4018, isActive: true, priority: 1 },
        { hostCode: 'nibss', ip: '196.6.103.18', port: 5001, isActive: false, priority: 2, sslEnabled: true },
      ],
    });
    expect(resolved.primaryHost.hostCode).toBe('nibss');
    expect(resolved.nibssEndpoint.nibssIp).toBe('196.6.103.18');
    expect(resolved.nibssEndpoint.nibssPort).toBe(5001);
    expect(resolved.primaryHost.ip).toBe('196.6.103.18');
  });

  it('fills production NIBSS defaults when Switch Board left IP/port blank', () => {
    const resolved = resolvePosHosts({
      activeHost: 'nibss',
      hosts: [
        { hostCode: 'nibss', ip: '', port: 0, isActive: true, priority: 1, hostname: '' },
      ],
    });
    expect(resolved.nibssEndpoint.nibssIp).toBe(DEFAULT_NIBSS_IP);
    expect(resolved.nibssEndpoint.nibssPort).toBe(DEFAULT_NIBSS_PORT);
    expect(resolved.primaryHost.ip).toBe(DEFAULT_NIBSS_IP);
    expect(resolved.primaryHost.port).toBe(DEFAULT_NIBSS_PORT);
  });

  it('reads ipAddress alias', () => {
    const resolved = resolvePosHosts({
      activeHost: 'nibss',
      hosts: [{ hostCode: 'nibss', ipAddress: '10.1.2.3', port: '5001', isActive: true }],
    });
    expect(resolved.nibssEndpoint.nibssIp).toBe('10.1.2.3');
    expect(resolved.nibssEndpoint.nibssPort).toBe(5001);
  });
});
