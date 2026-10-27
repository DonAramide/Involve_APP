/**
 * Classify the HMO Integration Telemetry response so an empty registry
 * is not shown when the request was denied, failed, or malformed.
 */

export function unwrapPlatformBody(body) {
  if (body && body.success === true && Object.prototype.hasOwnProperty.call(body, 'data')) {
    return body.data
  }
  return body
}

export function capabilityLabels(capabilities) {
  if (Array.isArray(capabilities)) {
    return capabilities.map((item) => String(item)).filter(Boolean)
  }
  if (capabilities && typeof capabilities === 'object') {
    return Object.keys(capabilities).filter((key) => capabilities[key])
  }
  return []
}

export function normalizeProviderHealthPayload(payload) {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.providers)
      ? payload.providers
      : null
  if (!source) return { malformed: true, providers: [] }
  return {
    malformed: false,
    providers: source.map((provider) => {
      const integrationStatus = provider.integrationStatus || provider.integration_status || 'none'
      return {
        ...provider,
        name: provider.name || provider.displayName || provider.display_name || provider.code,
        displayName: provider.displayName || provider.display_name || provider.name || provider.code,
        integrationStatus,
        isSandbox: provider.isSandbox === true || integrationStatus === 'sandbox',
        isActive: typeof provider.isActive === 'boolean'
          ? provider.isActive
          : integrationStatus === 'sandbox' || integrationStatus === 'verified',
        capabilities: capabilityLabels(provider.capabilities),
        telemetryStatus: provider.telemetryStatus || integrationStatus
      }
    })
  }
}

export function classifyTelemetryOutcome({ grantActive, rejected, httpStatus, payload }) {
  if (!grantActive) return 'access_denied'
  if (rejected) {
    if (httpStatus === 401 || httpStatus === 403) return 'access_denied'
    return 'unavailable'
  }
  const normalized = normalizeProviderHealthPayload(payload)
  if (normalized.malformed) return 'malformed'
  if (normalized.providers.length === 0) return 'empty'
  return 'ok'
}
