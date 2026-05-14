// invify-admin/src/forecasting-models/TraceabilityMetadata.js

/**
 * Traceability Metadata structure templates supporting sealed replay validation frameworks.
 */
export const FORECAST_TRACE_METADATA = {
  storageStrategy: 'RollingBufferWindow',
  maxTraceLifetimeMs: 86400000, // 24 hours
  mandatoryContextHeaders: ['tenantId', 'operatorSessionToken', 'causalAttributionHash']
}
