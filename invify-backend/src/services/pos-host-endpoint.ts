/** NIBSS production switch (ISO 8583). Admin host drawer uses these as empty-IP defaults. */
export const DEFAULT_NIBSS_IP = '196.6.103.18';
export const DEFAULT_NIBSS_PORT = 5001;

export function nonEmptyHostValue(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s || s === '—' || s.toLowerCase() === 'null') return null;
  return s;
}

export function hostCodeOf(host: any): string {
  return String(host?.hostCode || '').toLowerCase();
}

export function pickHostIp(host: any): string | null {
  if (!host || typeof host !== 'object') return null;
  for (const key of ['ip', 'ipAddress', 'hostIp', 'hostname', 'host']) {
    const v = nonEmptyHostValue(host[key]);
    if (v) return v;
  }
  return null;
}

export function pickHostPort(host: any): number | null {
  if (!host || typeof host !== 'object') return null;
  const s = nonEmptyHostValue(host.port ?? host.portNumber);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export type PosHostResolution = {
  allHosts: any[];
  activeHosts: any[];
  activeCode: string;
  primaryHost: any | null;
  secondaryHost: any | null;
  tertiaryHost: any | null;
  expressPay: any | undefined;
  kimono: any | undefined;
  nibssEndpoint: { nibssIp: string | null; nibssPort: number | null; nibssSsl: boolean };
};

/**
 * Build the host payload for terminal sync.
 * Looks up the configured activeHost in ALL hosts (not only isActive),
 * so NIBSS IP/port still sync when the NIBSS row is selected but not flagged active.
 * Empty NIBSS IP/port (admin drawer shows defaults without Save) use production switch defaults.
 */
export function resolvePosHosts(routingConfig: any): PosHostResolution {
  const allHosts = routingConfig?.hosts || [];
  const activeHosts = allHosts
    .filter((h: any) => h.isActive)
    .sort((a: any, b: any) => (a.priority || 99) - (b.priority || 99));
  const activeCode = String(routingConfig?.activeHost || '').toLowerCase();

  const nibssHost = allHosts.find((h: any) => hostCodeOf(h) === 'nibss') || null;
  const expressPay =
    allHosts.find((h: any) => hostCodeOf(h) === 'express_pay') ||
    activeHosts.find((h: any) => hostCodeOf(h) === 'express_pay');
  const kimono =
    allHosts.find((h: any) => hostCodeOf(h) === 'kimono') ||
    activeHosts.find((h: any) => hostCodeOf(h) === 'kimono');

  let primaryHost =
    allHosts.find((h: any) => hostCodeOf(h) === activeCode) ||
    activeHosts[0] ||
    null;

  const nibssSelected = activeCode === 'nibss' || hostCodeOf(primaryHost) === 'nibss';
  let nibssIp = pickHostIp(nibssHost) || (hostCodeOf(primaryHost) === 'nibss' ? pickHostIp(primaryHost) : null);
  let nibssPort =
    pickHostPort(nibssHost) || (hostCodeOf(primaryHost) === 'nibss' ? pickHostPort(primaryHost) : null);

  if (nibssSelected) {
    if (!nibssIp) nibssIp = DEFAULT_NIBSS_IP;
    if (nibssPort == null) nibssPort = DEFAULT_NIBSS_PORT;
  }

  if (nibssSelected) {
    primaryHost = {
      ...(nibssHost || primaryHost || {}),
      hostCode: (nibssHost || primaryHost)?.hostCode || 'nibss',
      hostName: (nibssHost || primaryHost)?.hostName || 'NIBSS',
      ip: nibssIp,
      port: nibssPort,
      sslEnabled: (nibssHost || primaryHost)?.sslEnabled ?? true,
    };
  }

  const secondaryHost = activeHosts.find((h: any) => h !== primaryHost && hostCodeOf(h) !== hostCodeOf(primaryHost)) || null;
  const tertiaryHost =
    activeHosts.find(
      (h: any) =>
        h !== primaryHost &&
        h !== secondaryHost &&
        hostCodeOf(h) !== hostCodeOf(primaryHost) &&
        hostCodeOf(h) !== hostCodeOf(secondaryHost),
    ) || null;

  return {
    allHosts,
    activeHosts,
    activeCode,
    primaryHost,
    secondaryHost,
    tertiaryHost,
    expressPay,
    kimono,
    nibssEndpoint: {
      nibssIp: nibssIp || null,
      nibssPort: nibssPort ?? null,
      nibssSsl: !!((nibssHost || primaryHost)?.sslEnabled ?? nibssSelected),
    },
  };
}
