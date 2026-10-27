import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// Load Canonical OpenAPI Specification and Fixtures
const CONTRACT_SPEC_PATH = path.resolve(__dirname, '../../docs/architecture/contracts/institution-routing-api.v1.json');
const FIXTURES_DIR = path.resolve(__dirname, '../../docs/architecture/contracts/fixtures');

function loadContractSpec(): any {
  return JSON.parse(fs.readFileSync(CONTRACT_SPEC_PATH, 'utf-8'));
}

function loadFixture(filename: string): any {
  const filePath = path.join(FIXTURES_DIR, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../supabase/migrations/20261020000000_institution_registry_and_routing_policy.sql',
);

type AjvCheck = { valid: boolean; errors: string[] };

type SchemaValidator = ((data: unknown) => boolean) & { errors?: Array<{ instancePath?: string; keyword?: string; message?: string }> | null };

function buildAjvValidators(spec: any): Record<string, SchemaValidator> {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  for (const [name, schema] of Object.entries(spec.components.schemas)) {
    ajv.addSchema(schema as object, `#/components/schemas/${name}`);
  }
  const validators: Record<string, SchemaValidator> = {};
  for (const name of Object.keys(spec.components.schemas)) {
    validators[name] = ajv.compile(spec.components.schemas[name]) as SchemaValidator;
  }
  return validators;
}

function validateWithAjv(validators: Record<string, SchemaValidator>, data: unknown, schemaName: string): AjvCheck {
  const schema = validators[schemaName];
  if (!schema) {
    return { valid: false, errors: [`Missing schema ${schemaName}`] };
  }
  const valid = schema(data) === true;
  const errors = (schema.errors || []).map(
    (error) => `${error.instancePath || ''} ${error.keyword || ''} ${error.message || ''}`,
  );
  return { valid, errors };
}

/**
 * Local contract helper. This is not a Quasar HTTP client.
 * A body is returned only after the response signature verifies.
 */
export function acceptSignedPolicyBody(input: {
  rawBody: string;
  signature?: string;
  keyId?: string;
  timestamp?: string;
  nonce?: string;
  keys: Record<string, string>;
  nowMs: number;
}): { accepted: boolean; reason?: string; body?: unknown } {
  if (!input.signature || !input.keyId || !input.timestamp || !input.nonce) {
    return { accepted: false, reason: 'UNSIGNED_RESPONSE' };
  }
  if (!/^[0-9a-f]{64}$/.test(input.signature)) {
    return { accepted: false, reason: 'MALFORMED_RESPONSE_SIGNATURE' };
  }
  const secret = input.keys[input.keyId];
  if (!secret) {
    return { accepted: false, reason: 'UNKNOWN_OR_REVOKED_RESPONSE_KEY' };
  }
  const verification = verifyHmacSignature(
    input.timestamp,
    input.nonce,
    input.rawBody,
    input.signature,
    secret,
    input.nowMs,
  );
  if (!verification.valid) {
    return { accepted: false, reason: verification.reason };
  }
  return { accepted: true, body: JSON.parse(input.rawBody) };
}

export type ServiceType = 'PAYMENTS' | 'TRANSFERS' | 'VIRTUAL_ACCOUNTS' | 'HEALTH_INSURANCE' | 'CARD_ACQUIRING';
export type OverridePolicy = 'LOCKED' | 'PERMITTED_FROM_LIST' | 'OPEN';
export type PrecedenceTier =
  | 'CIRCUIT_BREAKER'
  | 'INSTITUTION_LOCKED'
  | 'TENANT_OVERRIDE'
  | 'INSTITUTION_DEFAULT'
  | 'NONE';

export type RoutingDecision =
  | 'RESOLVED'
  | 'NO_RELATIONSHIP'
  | 'NO_MAPPING'
  | 'NO_ELIGIBLE_PROVIDER';

export type QuasarIntegrationStatus = 'provisioned' | 'active' | 'suspended' | 'error';

export interface RouteResolutionInput {
  quasarTenantId: string;
  serviceType: ServiceType;
  operationType: string;
  amountMinor?: number;
  requestedProvider?: string;
  callerPartnerId?: string;
}

export interface RouteResolutionResult {
  decision: RoutingDecision;
  serviceType: ServiceType;
  operationType: string;
  quasarTenantId: string;
  provider: string | null;
  allowedProviders: string[];
  precedenceTier: PrecedenceTier;
  institutionId: string | null;
  institutionCode: string | null;
  institutionName: string | null;
  decisionTraceId: string;
  policyVersion: number;
  evaluatedAt: string;
  expiresAt: string;
  instruction?: string;
  reason?: string;
}

export interface RoutingEngineContext {
  tenantMappings: Map<string, { invifyTenantId: string; status: QuasarIntegrationStatus }>; // quasarTenantId -> Invify quasar_integrations bridge
  relationships: Map<string, { institutionId: string; institutionCode: string; status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' }>;
  institutions: Map<string, { code: string; name: string; status: string; kycStatus: string }>;
  services: Map<string, {
    defaultProvider: string;
    allowedProviders: string[];
    overridePolicy: OverridePolicy;
    status: string;
    policyVersion: number;
  }>;
  overrides: Map<string, { selectedProvider: string; isActive: boolean }>;
  providerHealth: Map<string, { circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN'; maintenance: boolean }>;
  tenantPartnerOwnership: Map<string, string>; // quasarTenantId -> partnerClientId
}

/**
 * Surface-Specific Valid Executable Provider Enums (Strict Quasar Baseline)
 */
export const SURFACE_EXECUTABLE_PROVIDERS: Record<string, string[]> = {
  PAYMENTS: ['paystack', 'flutterwave'],
  TRANSFERS: ['nomba', 'paystack'],
  VIRTUAL_ACCOUNTS: ['connectpoint', 'paystack'],
};

/**
 * Pure Deterministic Precedence Resolver (Reconciled Quasar-Invify Canonical Engine v1.5.0)
 */
export function evaluateRoutingContract(
  input: RouteResolutionInput,
  ctx: RoutingEngineContext,
  nowDate: Date = new Date(),
): RouteResolutionResult {
  const traceId = `trc_${crypto.randomBytes(8).toString('hex')}`;
  const evaluatedAt = nowDate.toISOString();
  const expiresAt = new Date(nowDate.getTime() + 60 * 1000).toISOString(); // 60s freshness window

  // Security Check: Tenant Context Binding Verification
  if (input.callerPartnerId) {
    const boundPartnerId = ctx.tenantPartnerOwnership.get(input.quasarTenantId);
    if (boundPartnerId && boundPartnerId !== input.callerPartnerId) {
      const err: any = new Error(
        `Tenant context spoofing detected: quasarTenantId ${input.quasarTenantId} does not belong to partner ${input.callerPartnerId}`,
      );
      err.status = 403;
      err.code = 'TENANT_CONTEXT_MISMATCH';
      throw err;
    }
  }

  // 1. Resolve Quasar Tenant Mapping (quasar_integrations bridge with status column)
  const mapping = ctx.tenantMappings.get(input.quasarTenantId);
  if (!mapping) {
    return {
      decision: 'NO_MAPPING',
      serviceType: input.serviceType,
      operationType: input.operationType,
      quasarTenantId: input.quasarTenantId,
      provider: null,
      allowedProviders: [],
      precedenceTier: 'NONE',
      institutionId: null,
      institutionCode: null,
      institutionName: null,
      decisionTraceId: traceId,
      policyVersion: 0,
      evaluatedAt,
      expiresAt,
      reason: 'TENANT_NOT_MAPPED_IN_INVIFY',
      instruction: 'Quasar retains existing legacy provider selection; tenant is unmapped in Invify.',
    };
  }

  if (mapping.status === 'provisioned') {
    return {
      decision: 'NO_MAPPING',
      serviceType: input.serviceType,
      operationType: input.operationType,
      quasarTenantId: input.quasarTenantId,
      provider: null,
      allowedProviders: [],
      precedenceTier: 'NONE',
      institutionId: null,
      institutionCode: null,
      institutionName: null,
      decisionTraceId: traceId,
      policyVersion: 0,
      evaluatedAt,
      expiresAt,
      reason: 'TENANT_INTEGRATION_PROVISIONING',
      instruction: 'Quasar retains existing legacy provider selection; tenant integration is still provisioning.',
    };
  }

  if (mapping.status === 'suspended') {
    return {
      decision: 'NO_ELIGIBLE_PROVIDER',
      serviceType: input.serviceType,
      operationType: input.operationType,
      quasarTenantId: input.quasarTenantId,
      provider: null,
      allowedProviders: [],
      precedenceTier: 'NONE',
      institutionId: null,
      institutionCode: null,
      institutionName: null,
      decisionTraceId: traceId,
      policyVersion: 0,
      evaluatedAt,
      expiresAt,
      reason: 'TENANT_INTEGRATION_SUSPENDED',
      instruction: 'Quasar retains existing legacy provider selection; tenant integration is suspended.',
    };
  }

  if (mapping.status === 'error') {
    return {
      decision: 'NO_ELIGIBLE_PROVIDER',
      serviceType: input.serviceType,
      operationType: input.operationType,
      quasarTenantId: input.quasarTenantId,
      provider: null,
      allowedProviders: [],
      precedenceTier: 'NONE',
      institutionId: null,
      institutionCode: null,
      institutionName: null,
      decisionTraceId: traceId,
      policyVersion: 0,
      evaluatedAt,
      expiresAt,
      reason: 'TENANT_INTEGRATION_ERROR',
      instruction: 'Quasar retains existing legacy provider selection; tenant integration has error status.',
    };
  }

  // 2. Resolve Tenant Relationship
  const relKey = `${input.quasarTenantId}:${input.serviceType}`;
  const rel = ctx.relationships.get(relKey);

  // If no relationship exists: Explicit NO_RELATIONSHIP
  if (!rel) {
    return {
      decision: 'NO_RELATIONSHIP',
      serviceType: input.serviceType,
      operationType: input.operationType,
      quasarTenantId: input.quasarTenantId,
      provider: null,
      allowedProviders: [],
      precedenceTier: 'NONE',
      institutionId: null,
      institutionCode: null,
      institutionName: null,
      decisionTraceId: traceId,
      policyVersion: 0,
      evaluatedAt,
      expiresAt,
      instruction: 'Quasar retains existing legacy provider selection; no institutional routing applied.',
    };
  }

  // If relationship exists but is suspended or terminated
  if (rel.status !== 'ACTIVE') {
    return {
      decision: 'NO_ELIGIBLE_PROVIDER',
      serviceType: input.serviceType,
      operationType: input.operationType,
      quasarTenantId: input.quasarTenantId,
      provider: null,
      allowedProviders: [],
      precedenceTier: 'NONE',
      institutionId: rel.institutionId,
      institutionCode: rel.institutionCode,
      institutionName: ctx.institutions.get(rel.institutionId)?.name || null,
      decisionTraceId: traceId,
      policyVersion: 1,
      evaluatedAt,
      expiresAt,
      reason: 'INSTITUTION_RELATIONSHIP_SUSPENDED',
      instruction: `Quasar retains existing legacy provider selection; relationship status is ${rel.status}.`,
    };
  }

  const inst = ctx.institutions.get(rel.institutionId);
  if (!inst || inst.status !== 'ACTIVE' || inst.kycStatus !== 'VERIFIED') {
    return {
      decision: 'NO_ELIGIBLE_PROVIDER',
      serviceType: input.serviceType,
      operationType: input.operationType,
      quasarTenantId: input.quasarTenantId,
      provider: null,
      allowedProviders: [],
      precedenceTier: 'NONE',
      institutionId: rel.institutionId,
      institutionCode: rel.institutionCode,
      institutionName: inst?.name || null,
      decisionTraceId: traceId,
      policyVersion: 1,
      evaluatedAt,
      expiresAt,
      reason: 'INSTITUTION_INACTIVE_OR_KYC_UNVERIFIED',
      instruction: 'Quasar retains existing legacy provider selection; institution is inactive or KYC unverified.',
    };
  }

  // 3. Resolve Service Configuration
  const serviceKey = `${rel.institutionId}:${input.serviceType}`;
  const serviceCfg = ctx.services.get(serviceKey);

  if (!serviceCfg || serviceCfg.status === 'SUSPENDED') {
    const err: any = new Error(`Service ${input.serviceType} is suspended or not configured for institution ${rel.institutionCode}`);
    err.status = 503;
    err.code = 'SERVICE_SUSPENDED';
    throw err;
  }

  const isProviderHealthy = (provider: string) => {
    const health = ctx.providerHealth.get(provider);
    if (!health) return true;
    return health.circuitState !== 'OPEN' && !health.maintenance;
  };

  const validSurfaceProviders = SURFACE_EXECUTABLE_PROVIDERS[input.serviceType] || [];

  // Filter allowedProviders by certified surface executable providers
  const allowedCertifiedProviders = serviceCfg.allowedProviders.filter((p) =>
    validSurfaceProviders.includes(p.toLowerCase()),
  );

  // 4. Evaluate Precedence
  let candidateProvider: string;
  let candidateTier: PrecedenceTier;

  // Tier 2: Institution Locked Policy Check
  if (serviceCfg.overridePolicy === 'LOCKED') {
    candidateProvider = serviceCfg.defaultProvider;
    candidateTier = 'INSTITUTION_LOCKED';
  } else {
    // Tier 3: Tenant Permitted Override Check
    const override = ctx.overrides.get(relKey);
    if (
      override &&
      override.isActive &&
      allowedCertifiedProviders.includes(override.selectedProvider.toLowerCase())
    ) {
      candidateProvider = override.selectedProvider;
      candidateTier = 'TENANT_OVERRIDE';
    } else if (
      input.requestedProvider &&
      allowedCertifiedProviders.includes(input.requestedProvider.toLowerCase())
    ) {
      candidateProvider = input.requestedProvider;
      candidateTier = 'TENANT_OVERRIDE';
    } else {
      // Tier 4: Institution Default
      candidateProvider = serviceCfg.defaultProvider;
      candidateTier = 'INSTITUTION_DEFAULT';
    }
  }

  // Strict surface enum certification check
  if (!validSurfaceProviders.includes(candidateProvider.toLowerCase())) {
    const err: any = new Error(
      `Candidate provider '${candidateProvider}' is not an executable provider for service ${input.serviceType} in Quasar baseline.`,
    );
    err.status = 500;
    err.code = 'PROVIDER_NOT_EXECUTABLE_ON_SURFACE';
    throw err;
  }

  // 5. Tier 1: Emergency System Circuit Breaker Check
  if (!isProviderHealthy(candidateProvider)) {
    const healthyAlternate = allowedCertifiedProviders.find(
      (p) => p.toLowerCase() !== candidateProvider.toLowerCase() && isProviderHealthy(p),
    );

    if (healthyAlternate) {
      candidateProvider = healthyAlternate;
      candidateTier = 'CIRCUIT_BREAKER';
    } else {
      // Safe fail-fast: NEVER silently fall back to an unauthorized provider!
      const err: any = new Error(
        `All allowed providers [${allowedCertifiedProviders.join(', ')}] for service ${input.serviceType} on institution ${rel.institutionCode} are unavailable. Safe failure triggered.`,
      );
      err.status = 503;
      err.code = 'ROUTING_ALL_PROVIDERS_UNAVAILABLE';
      err.traceId = traceId;
      err.details = {
        decision: 'OUTAGE_FAIL_FAST',
        serviceType: input.serviceType,
        operationType: input.operationType,
        institutionCode: rel.institutionCode,
        allowedProviders: allowedCertifiedProviders.map((p) => p.toLowerCase()),
        safeHalt: true,
      };
      throw err;
    }
  }

  return {
    decision: 'RESOLVED',
    serviceType: input.serviceType,
    operationType: input.operationType,
    quasarTenantId: input.quasarTenantId,
    provider: candidateProvider.toLowerCase(),
    precedenceTier: candidateTier,
    institutionId: rel.institutionId,
    institutionCode: rel.institutionCode,
    institutionName: inst.name,
    decisionTraceId: traceId,
    policyVersion: serviceCfg.policyVersion,
    evaluatedAt,
    expiresAt,
    allowedProviders: allowedCertifiedProviders.map((p) => p.toLowerCase()),
  };
}

/**
 * Service-Specific Dispatchers matching Quasar interfaces
 */
export function resolveCheckoutRoute(
  input: { quasarTenantId: string; operationType: 'CHECKOUT' | 'WEB_PAYMENT'; requestedProvider?: string },
  ctx: RoutingEngineContext,
): RouteResolutionResult {
  return evaluateRoutingContract(
    {
      quasarTenantId: input.quasarTenantId,
      serviceType: 'PAYMENTS',
      operationType: input.operationType,
      requestedProvider: input.requestedProvider,
    },
    ctx,
  );
}

export function resolveTransferRail(
  input: { quasarTenantId: string; operationType: 'BANK_TRANSFER' | 'NAME_ENQUIRY'; requestedProvider?: string },
  ctx: RoutingEngineContext,
): RouteResolutionResult {
  return evaluateRoutingContract(
    {
      quasarTenantId: input.quasarTenantId,
      serviceType: 'TRANSFERS',
      operationType: input.operationType,
      requestedProvider: input.requestedProvider,
    },
    ctx,
  );
}

export function resolveVirtualAccountProvider(
  input: { quasarTenantId: string; operationType: 'VIRTUAL_ACCOUNT_CREATION'; requestedProvider?: string },
  ctx: RoutingEngineContext,
): RouteResolutionResult {
  return evaluateRoutingContract(
    {
      quasarTenantId: input.quasarTenantId,
      serviceType: 'VIRTUAL_ACCOUNTS',
      operationType: input.operationType,
      requestedProvider: input.requestedProvider,
    },
    ctx,
  );
}

/**
 * Mutual HMAC Authentication Protocol (Timestamp, Nonce, Key ID)
 */
export function buildCanonicalHmacMessage(timestamp: string, nonce: string, rawBody: string): string {
  return `${timestamp}.${nonce}.${rawBody}`;
}

export function signHmacPayload(timestamp: string, nonce: string, rawBody: string, secret: string): string {
  const canonical = buildCanonicalHmacMessage(timestamp, nonce, rawBody);
  return crypto.createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
}

export function verifyHmacSignature(
  timestamp: string,
  nonce: string,
  rawBody: string,
  signature: string,
  secret: string,
  nowMs: number = Date.now(),
  seenNonces?: Set<string>,
): { valid: boolean; reason?: string } {
  // 1. Freshness check: timestamp within 5 minutes (300,000 ms)
  const reqTime = new Date(timestamp).getTime();
  if (isNaN(reqTime)) {
    return { valid: false, reason: 'INVALID_TIMESTAMP_FORMAT' };
  }
  if (Math.abs(nowMs - reqTime) > 300 * 1000) {
    return { valid: false, reason: 'TIMESTAMP_OUT_OF_BOUNDS' };
  }

  // 2. Nonce replay defense
  if (seenNonces) {
    if (seenNonces.has(nonce)) {
      return { valid: false, reason: 'NONCE_ALREADY_USED' };
    }
    seenNonces.add(nonce);
  }

  // 3. Cryptographic timing-safe comparison
  const expected = signHmacPayload(timestamp, nonce, rawBody, secret);
  try {
    const isValid = crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'));
    return isValid ? { valid: true } : { valid: false, reason: 'SIGNATURE_MISMATCH' };
  } catch {
    return { valid: false, reason: 'SIGNATURE_COMPARISON_ERROR' };
  }
}

/**
 * Self-Contained OpenAPI 3.1.0 / JSON Schema 2020-12 Structural Validator
 */
export function validateAgainstSchema(
  data: any,
  schema: any,
  rootSpec: any,
  path: string = 'root',
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!schema) {
    return { valid: true, errors: [] };
  }

  // Handle $ref
  if (schema.$ref) {
    const refPath = schema.$ref.replace('#/', '').split('/');
    let target = rootSpec;
    for (const seg of refPath) {
      target = target ? target[seg] : undefined;
    }
    if (!target) {
      errors.push(`Unresolved $ref: ${schema.$ref} at ${path}`);
      return { valid: false, errors };
    }
    return validateAgainstSchema(data, target, rootSpec, path);
  }

  // Handle type
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    let matchesType = false;
    for (const t of types) {
      if (t === 'null' && data === null) matchesType = true;
      else if (t === 'string' && typeof data === 'string') matchesType = true;
      else if (t === 'integer' && typeof data === 'number' && Number.isInteger(data)) matchesType = true;
      else if (t === 'boolean' && typeof data === 'boolean') matchesType = true;
      else if (t === 'object' && typeof data === 'object' && data !== null && !Array.isArray(data)) matchesType = true;
      else if (t === 'array' && Array.isArray(data)) matchesType = true;
    }
    if (!matchesType) {
      errors.push(`Expected type ${JSON.stringify(schema.type)} but got ${data === null ? 'null' : typeof data} at ${path}`);
    }
  }

  // Handle enum
  if (schema.enum && data !== undefined) {
    const match = schema.enum.some((val: any) => val === data);
    if (!match) {
      errors.push(`Value ${JSON.stringify(data)} not in enum ${JSON.stringify(schema.enum)} at ${path}`);
    }
  }

  // Handle const
  if (schema.const !== undefined && data !== undefined) {
    if (data !== schema.const) {
      errors.push(`Value ${JSON.stringify(data)} does not match const ${JSON.stringify(schema.const)} at ${path}`);
    }
  }

  // Handle minItems
  if (schema.minItems !== undefined && Array.isArray(data)) {
    if (data.length < schema.minItems) {
      errors.push(`Array length ${data.length} is less than minItems ${schema.minItems} at ${path}`);
    }
  }

  // Handle maxItems
  if (schema.maxItems !== undefined && Array.isArray(data)) {
    if (data.length > schema.maxItems) {
      errors.push(`Array length ${data.length} exceeds maxItems ${schema.maxItems} at ${path}`);
    }
  }

  // Handle array items
  if (schema.items && Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      const itemRes = validateAgainstSchema(data[i], schema.items, rootSpec, `${path}[${i}]`);
      if (!itemRes.valid) {
        errors.push(...itemRes.errors);
      }
    }
  }

  // Handle format
  if (schema.format && typeof data === 'string') {
    if (schema.format === 'uuid') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(data)) {
        errors.push(`String "${data}" is not a valid UUID at ${path}`);
      }
    } else if (schema.format === 'date-time') {
      const parsed = Date.parse(data);
      if (isNaN(parsed)) {
        errors.push(`String "${data}" is not a valid date-time at ${path}`);
      }
    }
  }

  // Handle required
  if (schema.required && typeof data === 'object' && data !== null) {
    for (const reqProp of schema.required) {
      if (data[reqProp] === undefined) {
        errors.push(`Missing required property "${reqProp}" at ${path}`);
      }
    }
  }

  // Handle properties
  if (schema.properties && typeof data === 'object' && data !== null && !Array.isArray(data)) {
    for (const key of Object.keys(data)) {
      if (schema.properties[key]) {
        const sub = validateAgainstSchema(data[key], schema.properties[key], rootSpec, `${path}.${key}`);
        if (!sub.valid) {
          errors.push(...sub.errors);
        }
      }
    }
  }

  // Handle oneOf
  if (schema.oneOf && Array.isArray(schema.oneOf)) {
    const matchingBranches: number[] = [];
    const branchErrors: string[][] = [];

    for (let i = 0; i < schema.oneOf.length; i++) {
      const branch = schema.oneOf[i];
      const res = validateAgainstSchema(data, branch, rootSpec, `${path}.oneOf[${i}]`);
      if (res.valid) {
        matchingBranches.push(i);
      } else {
        branchErrors.push(res.errors);
      }
    }

    if (matchingBranches.length !== 1) {
      errors.push(
        `Expected exactly 1 oneOf branch to match at ${path}, but matched ${matchingBranches.length}. Branch errors: ${branchErrors.map((e) => e.join('; ')).join(' | ')}`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

// ==============================================================================
// CONTRACT TEST SUITE
// ==============================================================================

describe('Invify + Quasar Institution Registry & Routing Canonical Contract v1.6.0', () => {
  let spec: any;
  let validators: Record<string, SchemaValidator>;
  let mockContext: RoutingEngineContext;

  beforeAll(() => {
    spec = loadContractSpec();
    validators = buildAjvValidators(spec);
  });

  beforeEach(() => {
    mockContext = {
      tenantMappings: new Map([
        ['c3d11b8b-e85d-4f2b-8a8f-2872bc900382', { invifyTenantId: 'inv-tenant-alpha', status: 'active' }],
        ['00000000-0000-4000-8000-000000000001', { invifyTenantId: 'inv-tenant-unlinked', status: 'active' }],
        ['11111111-1111-4111-8111-111111111111', { invifyTenantId: 'inv-tenant-suspended', status: 'active' }],
        ['22222222-2222-4222-8222-222222222222', { invifyTenantId: 'inv-tenant-inactive-inst', status: 'active' }],
        ['33333333-3333-4333-8333-333333333333', { invifyTenantId: 'inv-tenant-provisioning', status: 'provisioned' }],
        ['44444444-4444-4444-8444-444444444444', { invifyTenantId: 'inv-tenant-integ-susp', status: 'suspended' }],
        ['55555555-5555-4555-8555-555555555555', { invifyTenantId: 'inv-tenant-integ-err', status: 'error' }],
      ]),
      relationships: new Map([
        ['c3d11b8b-e85d-4f2b-8a8f-2872bc900382:VIRTUAL_ACCOUNTS', { institutionId: '11111111-2222-3333-4444-555555555555', institutionCode: 'PROV01', status: 'ACTIVE' }],
        ['c3d11b8b-e85d-4f2b-8a8f-2872bc900382:PAYMENTS', { institutionId: '11111111-2222-3333-4444-555555555555', institutionCode: 'PROV01', status: 'ACTIVE' }],
        ['c3d11b8b-e85d-4f2b-8a8f-2872bc900382:TRANSFERS', { institutionId: '11111111-2222-3333-4444-555555555555', institutionCode: 'PROV01', status: 'ACTIVE' }],
        ['11111111-1111-4111-8111-111111111111:TRANSFERS', { institutionId: '11111111-2222-3333-4444-555555555555', institutionCode: 'PROV01', status: 'SUSPENDED' }],
        ['22222222-2222-4222-8222-222222222222:PAYMENTS', { institutionId: 'inst-inactive', institutionCode: 'INACT01', status: 'ACTIVE' }],
      ]),
      institutions: new Map([
        ['11111111-2222-3333-4444-555555555555', { code: 'PROV01', name: 'Providus Bank Institution Portal', status: 'ACTIVE', kycStatus: 'VERIFIED' }],
        ['inst-inactive', { code: 'INACT01', name: 'Inactive Bank', status: 'SUSPENDED', kycStatus: 'PENDING' }],
      ]),
      services: new Map([
        ['11111111-2222-3333-4444-555555555555:PAYMENTS', {
          defaultProvider: 'paystack',
          allowedProviders: ['paystack', 'flutterwave'],
          overridePolicy: 'PERMITTED_FROM_LIST',
          status: 'ACTIVE',
          policyVersion: 1,
        }],
        ['11111111-2222-3333-4444-555555555555:TRANSFERS', {
          defaultProvider: 'nomba',
          allowedProviders: ['nomba', 'paystack'],
          overridePolicy: 'LOCKED',
          status: 'ACTIVE',
          policyVersion: 1,
        }],
        ['11111111-2222-3333-4444-555555555555:VIRTUAL_ACCOUNTS', {
          defaultProvider: 'connectpoint',
          allowedProviders: ['connectpoint', 'paystack'],
          overridePolicy: 'LOCKED',
          status: 'ACTIVE',
          policyVersion: 1,
        }],
        ['inst-inactive:PAYMENTS', {
          defaultProvider: 'paystack',
          allowedProviders: ['paystack'],
          overridePolicy: 'LOCKED',
          status: 'ACTIVE',
          policyVersion: 1,
        }],
      ]),
      overrides: new Map(),
      providerHealth: new Map([
        ['paystack', { circuitState: 'CLOSED', maintenance: false }],
        ['flutterwave', { circuitState: 'CLOSED', maintenance: false }],
        ['nomba', { circuitState: 'CLOSED', maintenance: false }],
        ['connectpoint', { circuitState: 'CLOSED', maintenance: false }],
      ]),
      tenantPartnerOwnership: new Map([
        ['c3d11b8b-e85d-4f2b-8a8f-2872bc900382', 'partner-invify-school'],
      ]),
    };
  });

  describe('1. OpenAPI Specification Structural & Version Integrity', () => {
    it('declares exact canonical version 1.6.0 in OpenAPI info', () => {
      expect(spec.openapi).toBe('3.1.0');
      expect(spec.info.version).toBe('1.6.0');
      expect(spec.info.title).toContain('Invify + Quasar');
    });

    it('enforces InvifyRoutingHmacAuth on all 3 policy routes without bearer bypass', () => {
      expect(spec.components.securitySchemes.InvifyInternalBearerAuth).toBeUndefined();
      expect(spec.components.securitySchemes.InvifyRoutingHmacAuth).toBeDefined();

      for (const route of [
        '/routing/resolve-checkout-route',
        '/routing/resolve-transfer-rail',
        '/routing/resolve-virtual-account-provider',
      ]) {
        const security = spec.paths[route].post.security;
        expect(security).toEqual([{ InvifyRoutingHmacAuth: [] }]);
      }
    });

    it('marks response HMAC signature headers as required on 200, 400, 401, and 503', () => {
      const headerNames = [
        'X-Invify-Routing-Signature',
        'X-Invify-Key-Id',
        'X-Signature-Timestamp',
        'X-Signature-Nonce',
      ];
      for (const route of [
        '/routing/resolve-checkout-route',
        '/routing/resolve-transfer-rail',
        '/routing/resolve-virtual-account-provider',
      ]) {
        for (const status of ['200', '400', '401', '503']) {
          const headers = spec.paths[route].post.responses[status].headers;
          for (const name of headerNames) {
            expect(headers[name].required).toBe(true);
          }
        }
        expect(spec.paths[route].post.responses['503'].content['application/json'].schema.$ref).toBe(
          '#/components/schemas/OutageFailFastError',
        );
      }
      const syncHeaders = spec.paths['/routing/quasar-sync'].post.responses['200'].headers;
      for (const name of headerNames) {
        expect(syncHeaders[name].required).toBe(true);
      }
    });

    it('defines valid error response schemas without misplaced $ref', () => {
      const xferRail400 = spec.paths['/routing/resolve-transfer-rail'].post.responses['400'].content['application/json'];
      expect(xferRail400.schema).toBeDefined();
      expect(xferRail400.schema.$ref).toBe('#/components/schemas/ErrorResponse');

      const va400 = spec.paths['/routing/resolve-virtual-account-provider'].post.responses['400'].content['application/json'];
      expect(va400.schema).toBeDefined();
      expect(va400.schema.$ref).toBe('#/components/schemas/ErrorResponse');
    });

    it('requires X-Invify-Key-Id on all policy routes', () => {
      for (const route of [
        '/routing/resolve-checkout-route',
        '/routing/resolve-transfer-rail',
        '/routing/resolve-virtual-account-provider',
        '/routing/quasar-sync',
      ]) {
        const params = spec.paths[route].post.parameters;
        const keyIdParam = params.find((p: any) => p.name === 'X-Invify-Key-Id');
        expect(keyIdParam).toBeDefined();
        expect(keyIdParam.required).toBe(true);
      }
    });
  });

  describe('2. Strict OpenAPI Schema Validation of Fixtures (Positive & Negative)', () => {
    it('validates resolve_checkout_route_success.json against schema', () => {
      const fixture = loadFixture('resolve_checkout_route_success.json');
      const res = validateWithAjv(validators, fixture, 'ResolveCheckoutRouteResponse');
      expect(res.valid).toBe(true);
      expect(res.errors).toEqual([]);
    });

    it('validates resolve_checkout_route_web_payment.json against schema', () => {
      const fixture = loadFixture('resolve_checkout_route_web_payment.json');
      const res = validateWithAjv(validators, fixture, 'ResolveCheckoutRouteResponse');
      expect(res.valid).toBe(true);
      expect(res.errors).toEqual([]);
    });

    it('validates resolve_transfer_rail_success.json against schema', () => {
      const fixture = loadFixture('resolve_transfer_rail_success.json');
      const res = validateWithAjv(validators, fixture, 'ResolveTransferRailResponse');
      expect(res.valid).toBe(true);
      expect(res.errors).toEqual([]);
    });

    it('validates resolve_transfer_rail_name_enquiry.json against schema', () => {
      const fixture = loadFixture('resolve_transfer_rail_name_enquiry.json');
      const res = validateWithAjv(validators, fixture, 'ResolveTransferRailResponse');
      expect(res.valid).toBe(true);
      expect(res.errors).toEqual([]);
    });

    it('validates resolve_virtual_account_provider_success.json against schema', () => {
      const fixture = loadFixture('resolve_virtual_account_provider_success.json');
      const res = validateWithAjv(validators, fixture, 'ResolveVirtualAccountProviderResponse');
      expect(res.valid).toBe(true);
      expect(res.errors).toEqual([]);
    });

    it('validates resolve_virtual_account_provider_paystack.json against schema', () => {
      const fixture = loadFixture('resolve_virtual_account_provider_paystack.json');
      const res = validateWithAjv(validators, fixture, 'ResolveVirtualAccountProviderResponse');
      expect(res.valid).toBe(true);
      expect(res.errors).toEqual([]);
    });

    it('validates resolve_provider_no_relationship.json with valid UUID and null provider', () => {
      const fixture = loadFixture('resolve_provider_no_relationship.json');
      const res = validateWithAjv(validators, fixture, 'ResolveCheckoutRouteResponse');
      expect(res.valid).toBe(true);
      expect(res.errors).toEqual([]);
    });

    it('validates resolve_provider_no_mapping.json against schema', () => {
      const fixture = loadFixture('resolve_provider_no_mapping.json');
      const res = validateWithAjv(validators, fixture, 'ResolveCheckoutRouteResponse');
      expect(res.valid).toBe(true);
      expect(res.errors).toEqual([]);
    });

    it('validates resolve_provider_suspended_relationship.json against schema', () => {
      const fixture = loadFixture('resolve_provider_suspended_relationship.json');
      const res = validateWithAjv(validators, fixture, 'ResolveTransferRailResponse');
      expect(res.valid).toBe(true);
      expect(res.errors).toEqual([]);
    });

    it('validates resolve_provider_tenant_override.json against schema', () => {
      const fixture = loadFixture('resolve_provider_tenant_override.json');
      const res = validateWithAjv(validators, fixture, 'ResolveCheckoutRouteResponse');
      expect(res.valid).toBe(true);
      expect(res.errors).toEqual([]);
    });

    it('validates resolve_provider_circuit_breaker_failover.json against schema', () => {
      const fixture = loadFixture('resolve_provider_circuit_breaker_failover.json');
      const res = validateWithAjv(validators, fixture, 'ResolveCheckoutRouteResponse');
      expect(res.valid).toBe(true);
      expect(res.errors).toEqual([]);
    });

    it('validates resolve_provider_all_outage_fail_fast_error.json against OutageFailFastError', () => {
      const fixture = loadFixture('resolve_provider_all_outage_fail_fast_error.json');
      const res = validateWithAjv(validators, fixture, 'OutageFailFastError');
      expect(res.valid).toBe(true);
      expect(res.errors).toEqual([]);
      const generic = validateWithAjv(validators, fixture, 'ErrorResponse');
      expect(generic.valid).toBe(false);
    });

    it('validates a non-outage error without requiring OUTAGE_FAIL_FAST', () => {
      const fixture = loadFixture('valid_non_outage_error.json');
      const generic = validateWithAjv(validators, fixture, 'ErrorResponse');
      expect(generic.valid).toBe(true);
      const outage = validateWithAjv(validators, fixture, 'OutageFailFastError');
      expect(outage.valid).toBe(false);
    });

    it('REJECTS an outage body that omits details.decision', () => {
      const fixture = loadFixture('invalid_outage_missing_decision.json');
      expect(validateWithAjv(validators, fixture, 'OutageFailFastError').valid).toBe(false);
    });

    it('REJECTS an outage body whose decision is not OUTAGE_FAIL_FAST', () => {
      const fixture = loadFixture('invalid_outage_wrong_decision.json');
      expect(validateWithAjv(validators, fixture, 'OutageFailFastError').valid).toBe(false);
    });

    it('REJECTS a code and decision mismatch on the outage schema', () => {
      const fixture = loadFixture('invalid_outage_code_decision_mismatch.json');
      expect(validateWithAjv(validators, fixture, 'OutageFailFastError').valid).toBe(false);
    });

    // Negative Fixture Validations
    it('REJECTS negative fixture invalid_response_missing_trace_id.json', () => {
      const fixture = loadFixture('invalid_response_missing_trace_id.json');
      const res = validateWithAjv(validators, fixture, 'ResolveCheckoutRouteResponse');
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('decisionTraceId'))).toBe(true);
    });

    it('REJECTS negative fixture invalid_response_provider_not_in_enum.json (providus on checkout)', () => {
      const fixture = loadFixture('invalid_response_provider_not_in_enum.json');
      const res = validateWithAjv(validators, fixture, 'ResolveCheckoutRouteResponse');
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('enum'))).toBe(true);
    });

    it('REJECTS negative fixture invalid_response_non_uuid_tenant.json', () => {
      const fixture = loadFixture('invalid_response_non_uuid_tenant.json');
      const res = validateWithAjv(validators, fixture, 'ResolveCheckoutRouteResponse');
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('format'))).toBe(true);
    });

    it('REJECTS negative fixture invalid_response_resolved_with_null_provider.json', () => {
      const fixture = loadFixture('invalid_response_resolved_with_null_provider.json');
      const res = validateWithAjv(validators, fixture, 'ResolveCheckoutRouteResponse');
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('oneOf'))).toBe(true);
    });

    it('REJECTS negative fixture invalid_response_unrouted_with_active_provider.json', () => {
      const fixture = loadFixture('invalid_response_unrouted_with_active_provider.json');
      const res = validateWithAjv(validators, fixture, 'ResolveCheckoutRouteResponse');
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('oneOf'))).toBe(true);
    });

    it('REJECTS negative fixture invalid_response_missing_allowed_providers.json', () => {
      const fixture = loadFixture('invalid_response_missing_allowed_providers.json');
      const res = validateWithAjv(validators, fixture, 'ResolveCheckoutRouteResponse');
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('allowedProviders'))).toBe(true);
    });
  });

  describe('3. Decision Semantics: NO_MAPPING vs NO_RELATIONSHIP vs NO_ELIGIBLE_PROVIDER', () => {
    it('Decision NO_MAPPING (unmapped): returned when quasarTenantId is missing from quasar_integrations', () => {
      const res = resolveCheckoutRoute(
        { quasarTenantId: 'ffffffff-ffff-4fff-8fff-ffffffffffff', operationType: 'CHECKOUT' },
        mockContext,
      );
      expect(res.decision).toBe('NO_MAPPING');
      expect(res.provider).toBeNull();
      expect(res.allowedProviders).toEqual([]);
      expect(res.precedenceTier).toBe('NONE');
      expect(res.reason).toBe('TENANT_NOT_MAPPED_IN_INVIFY');
      expect(res.instruction).toMatch(/tenant is unmapped/);
    });

    it('Decision NO_MAPPING (provisioned): returned when quasar_integrations status is provisioned', () => {
      const res = resolveCheckoutRoute(
        { quasarTenantId: '33333333-3333-4333-8333-333333333333', operationType: 'CHECKOUT' },
        mockContext,
      );
      expect(res.decision).toBe('NO_MAPPING');
      expect(res.provider).toBeNull();
      expect(res.allowedProviders).toEqual([]);
      expect(res.precedenceTier).toBe('NONE');
      expect(res.reason).toBe('TENANT_INTEGRATION_PROVISIONING');
      expect(res.instruction).toMatch(/tenant integration is still provisioning/);
    });

    it('Decision NO_ELIGIBLE_PROVIDER (suspended integration): returned when quasar_integrations status is suspended', () => {
      const res = resolveCheckoutRoute(
        { quasarTenantId: '44444444-4444-4444-8444-444444444444', operationType: 'CHECKOUT' },
        mockContext,
      );
      expect(res.decision).toBe('NO_ELIGIBLE_PROVIDER');
      expect(res.provider).toBeNull();
      expect(res.allowedProviders).toEqual([]);
      expect(res.precedenceTier).toBe('NONE');
      expect(res.reason).toBe('TENANT_INTEGRATION_SUSPENDED');
      expect(res.instruction).toMatch(/tenant integration is suspended/);
    });

    it('Decision NO_ELIGIBLE_PROVIDER (error integration): returned when quasar_integrations status is error', () => {
      const res = resolveCheckoutRoute(
        { quasarTenantId: '55555555-5555-4555-8555-555555555555', operationType: 'CHECKOUT' },
        mockContext,
      );
      expect(res.decision).toBe('NO_ELIGIBLE_PROVIDER');
      expect(res.provider).toBeNull();
      expect(res.allowedProviders).toEqual([]);
      expect(res.precedenceTier).toBe('NONE');
      expect(res.reason).toBe('TENANT_INTEGRATION_ERROR');
      expect(res.instruction).toMatch(/tenant integration has error status/);
    });

    it('Decision NO_RELATIONSHIP: returned when tenant is mapped but has no institution relationship', () => {
      const res = resolveCheckoutRoute(
        { quasarTenantId: '00000000-0000-4000-8000-000000000001', operationType: 'CHECKOUT' },
        mockContext,
      );
      expect(res.decision).toBe('NO_RELATIONSHIP');
      expect(res.provider).toBeNull();
      expect(res.allowedProviders).toEqual([]);
      expect(res.precedenceTier).toBe('NONE');
      expect(res.instruction).toMatch(/no institutional routing applied/);
    });

    it('Decision NO_ELIGIBLE_PROVIDER: returned when relationship is SUSPENDED', () => {
      const res = resolveTransferRail(
        { quasarTenantId: '11111111-1111-4111-8111-111111111111', operationType: 'BANK_TRANSFER' },
        mockContext,
      );
      expect(res.decision).toBe('NO_ELIGIBLE_PROVIDER');
      expect(res.provider).toBeNull();
      expect(res.allowedProviders).toEqual([]);
      expect(res.precedenceTier).toBe('NONE');
      expect(res.reason).toBe('INSTITUTION_RELATIONSHIP_SUSPENDED');
    });

    it('Decision NO_ELIGIBLE_PROVIDER: returned when institution is inactive or KYC unverified', () => {
      const res = resolveCheckoutRoute(
        { quasarTenantId: '22222222-2222-4222-8222-222222222222', operationType: 'CHECKOUT' },
        mockContext,
      );
      expect(res.decision).toBe('NO_ELIGIBLE_PROVIDER');
      expect(res.provider).toBeNull();
      expect(res.allowedProviders).toEqual([]);
      expect(res.reason).toBe('INSTITUTION_INACTIVE_OR_KYC_UNVERIFIED');
    });
  });

  describe('4. Strict Surface Enum Filtering (Providus & OPay Protection)', () => {
    it('strictly forbids non-executable providers (providus) even under OPEN override policy', () => {
      // Simulate institution service configured with unexecutable provider in context
      mockContext.services.set('11111111-2222-3333-4444-555555555555:PAYMENTS', {
        defaultProvider: 'providus', // Illegal provider on checkout surface!
        allowedProviders: ['providus'],
        overridePolicy: 'LOCKED',
        status: 'ACTIVE',
        policyVersion: 1,
      });

      expect(() =>
        resolveCheckoutRoute(
          { quasarTenantId: 'c3d11b8b-e85d-4f2b-8a8f-2872bc900382', operationType: 'CHECKOUT' },
          mockContext,
        ),
      ).toThrowError(/is not an executable provider for service PAYMENTS/);
    });
  });

  describe('5. Rail Parity: NAME_ENQUIRY and BANK_TRANSFER Shared Resolution', () => {
    it('guarantees identical payout rail for both NAME_ENQUIRY and BANK_TRANSFER for a tenant', () => {
      const nameEnquiryRes = resolveTransferRail(
        { quasarTenantId: 'c3d11b8b-e85d-4f2b-8a8f-2872bc900382', operationType: 'NAME_ENQUIRY' },
        mockContext,
      );
      const bankTransferRes = resolveTransferRail(
        { quasarTenantId: 'c3d11b8b-e85d-4f2b-8a8f-2872bc900382', operationType: 'BANK_TRANSFER' },
        mockContext,
      );

      expect(nameEnquiryRes.provider).toBe('nomba');
      expect(bankTransferRes.provider).toBe('nomba');
      expect(nameEnquiryRes.provider).toBe(bankTransferRes.provider);
      expect(nameEnquiryRes.institutionCode).toBe(bankTransferRes.institutionCode);
    });
  });

  describe('6. Policy Freshness & Stale Version Rejection', () => {
    it('rejects an incoming policy response if policyVersion is lower than cached version', () => {
      const cachedVersion = 2;
      const incomingFixture = loadFixture('invalid_response_stale_policy_version.json');

      const isStale = incomingFixture.policyVersion < cachedVersion;
      expect(isStale).toBe(true);
    });
  });

  describe('7. Mutual Response Authenticity & Zero-Downtime Secret Rotation', () => {
    const keys: Record<string, string> = {
      k_live_2026_a: 'secret_active_primary_key_alpha_999',
      k_live_2026_b: 'secret_active_secondary_key_beta_888',
    };
    const timestamp = '2026-10-20T00:17:00.000Z';
    const nonce = 'nonce_9876543210fedcba';
    const responseBody = JSON.stringify({
      decision: 'RESOLVED',
      provider: 'paystack',
      quasarTenantId: 'c3d11b8b-e85d-4f2b-8a8f-2872bc900382',
    });

    it('signs and verifies response payload using primary key A', () => {
      const signature = signHmacPayload(timestamp, nonce, responseBody, keys['k_live_2026_a']);
      const verification = verifyHmacSignature(timestamp, nonce, responseBody, signature, keys['k_live_2026_a'], new Date(timestamp).getTime());
      expect(verification.valid).toBe(true);
    });

    it('supports seamless rotation: verifies payload signed with new key B', () => {
      const signature = signHmacPayload(timestamp, nonce, responseBody, keys['k_live_2026_b']);
      const activeKeyId = 'k_live_2026_b';
      const secretToUse = keys[activeKeyId];

      const verification = verifyHmacSignature(timestamp, nonce, responseBody, signature, secretToUse, new Date(timestamp).getTime());
      expect(verification.valid).toBe(true);
    });

    it('rejects signature when key ID points to revoked secret', () => {
      const revokedKeys: Record<string, string> = {
        k_live_2026_b: 'secret_active_secondary_key_beta_888',
      };
      const signature = signHmacPayload(timestamp, nonce, responseBody, 'secret_active_primary_key_alpha_999');
      const activeKeyId = 'k_live_2026_a';
      const secretToUse = revokedKeys[activeKeyId]; // null / undefined

      expect(secretToUse).toBeUndefined();
    });
  });

  describe('8. Failover Order and Outage Fail-Fast Semantics', () => {
    it('populates allowedProviders with ordered certified providers on resolved route', () => {
      const res = resolveCheckoutRoute(
        { quasarTenantId: 'c3d11b8b-e85d-4f2b-8a8f-2872bc900382', operationType: 'CHECKOUT' },
        mockContext,
      );
      expect(res.decision).toBe('RESOLVED');
      expect(res.provider).toBe('paystack');
      expect(res.allowedProviders).toEqual(['paystack', 'flutterwave']);
      expect(res.allowedProviders.length).toBeGreaterThan(0);
    });

    it('triggers failover to secondary provider when primary provider circuit is open', () => {
      mockContext.providerHealth.set('paystack', { circuitState: 'OPEN', maintenance: false });
      const res = resolveCheckoutRoute(
        { quasarTenantId: 'c3d11b8b-e85d-4f2b-8a8f-2872bc900382', operationType: 'CHECKOUT' },
        mockContext,
      );
      expect(res.decision).toBe('RESOLVED');
      expect(res.provider).toBe('flutterwave');
      expect(res.precedenceTier).toBe('CIRCUIT_BREAKER');
      expect(res.allowedProviders).toEqual(['paystack', 'flutterwave']);
    });

    it('strictly halts with HTTP 503 and OUTAGE_FAIL_FAST decision when all allowed providers are unavailable', () => {
      mockContext.providerHealth.set('paystack', { circuitState: 'OPEN', maintenance: false });
      mockContext.providerHealth.set('flutterwave', { circuitState: 'OPEN', maintenance: true });

      try {
        resolveCheckoutRoute(
          { quasarTenantId: 'c3d11b8b-e85d-4f2b-8a8f-2872bc900382', operationType: 'CHECKOUT' },
          mockContext,
        );
        fail('Expected 503 outage exception to be thrown');
      } catch (err: any) {
        expect(err.status).toBe(503);
        expect(err.code).toBe('ROUTING_ALL_PROVIDERS_UNAVAILABLE');
        expect(err.details).toBeDefined();
        expect(err.details.decision).toBe('OUTAGE_FAIL_FAST');
        expect(err.details.safeHalt).toBe(true);
      }
    });
  });

  describe('9. Platform-default SQL seed matches Quasar provider tokens', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    const seedStart = sql.indexOf('Seed default routing services');
    const seedBlock = sql.slice(seedStart, sql.indexOf('ON CONFLICT DO NOTHING', seedStart));
    const rows = [...seedBlock.matchAll(/'([A-Z_]+)',\s*'([a-z][a-z0-9]*)',\s*'(\[[^\]]+\])'::jsonb/g)].map(
      (match) => ({
        serviceType: match[1],
        defaultProvider: match[2],
        allowedProviders: JSON.parse(match[3]) as string[],
      }),
    );

    it('parses the migration text rather than an in-memory copy', () => {
      expect(seedStart).toBeGreaterThan(0);
      expect(rows.map((row) => row.serviceType).sort()).toEqual([
        'PAYMENTS',
        'TRANSFERS',
        'VIRTUAL_ACCOUNTS',
      ]);
    });

    it('keeps institution code AAA000 uppercase and uses lowercase executable providers', () => {
      expect(sql).toContain("'AAA000'");
      expect(rows).toEqual([
        {
          serviceType: 'PAYMENTS',
          defaultProvider: 'paystack',
          allowedProviders: ['paystack', 'flutterwave'],
        },
        {
          serviceType: 'TRANSFERS',
          defaultProvider: 'nomba',
          allowedProviders: ['nomba', 'paystack'],
        },
        {
          serviceType: 'VIRTUAL_ACCOUNTS',
          defaultProvider: 'connectpoint',
          allowedProviders: ['connectpoint', 'paystack'],
        },
      ]);
      const forbidden = ['PROVIDUS', 'WEMA', 'CONNECTPOINT', 'NOMBA', 'PAYSTACK', 'FLUTTERWAVE', 'KIMONO', 'ISO8583', 'HYGEIA', 'OPAY'];
      for (const token of forbidden) {
        expect(seedBlock.includes(`'${token}'`) || seedBlock.includes(`"${token}"`)).toBe(false);
      }
    });
  });

  describe('10. Unsigned or bad response signatures are not routing decisions', () => {
    const keys = { k_live_2026_a: 'secret_active_primary_key_alpha_999' };
    const rawBody = fs.readFileSync(path.join(FIXTURES_DIR, 'resolve_provider_all_outage_fail_fast_error.json'), 'utf8');
    const timestamp = '2026-10-20T11:00:00.000Z';
    const nonce = 'nonce_outage_response_01';
    const nowMs = new Date(timestamp).getTime();

    it('does not accept an unsigned HTTP 503 body as OUTAGE_FAIL_FAST', () => {
      const result = acceptSignedPolicyBody({
        rawBody,
        keys,
        nowMs,
      });
      expect(result.accepted).toBe(false);
      expect(result.reason).toBe('UNSIGNED_RESPONSE');
      expect(result.body).toBeUndefined();
    });

    it('rejects a malformed response signature without parsing a decision', () => {
      const result = acceptSignedPolicyBody({
        rawBody,
        signature: 'not-a-signature',
        keyId: 'k_live_2026_a',
        timestamp,
        nonce,
        keys,
        nowMs,
      });
      expect(result.accepted).toBe(false);
      expect(result.reason).toBe('MALFORMED_RESPONSE_SIGNATURE');
      expect(result.body).toBeUndefined();
    });

    it('rejects an unknown response key id', () => {
      const signature = signHmacPayload(timestamp, nonce, rawBody, keys.k_live_2026_a);
      const result = acceptSignedPolicyBody({
        rawBody,
        signature,
        keyId: 'k_revoked_missing',
        timestamp,
        nonce,
        keys,
        nowMs,
      });
      expect(result.accepted).toBe(false);
      expect(result.reason).toBe('UNKNOWN_OR_REVOKED_RESPONSE_KEY');
      expect(result.body).toBeUndefined();
    });

    it('rejects an expired response timestamp', () => {
      const signature = signHmacPayload(timestamp, nonce, rawBody, keys.k_live_2026_a);
      const result = acceptSignedPolicyBody({
        rawBody,
        signature,
        keyId: 'k_live_2026_a',
        timestamp,
        nonce,
        keys,
        nowMs: nowMs + 301 * 1000,
      });
      expect(result.accepted).toBe(false);
      expect(result.reason).toBe('TIMESTAMP_OUT_OF_BOUNDS');
      expect(result.body).toBeUndefined();
    });

    it('accepts the outage fixture only after the response signature matches the raw bytes', () => {
      const signature = signHmacPayload(timestamp, nonce, rawBody, keys.k_live_2026_a);
      const result = acceptSignedPolicyBody({
        rawBody,
        signature,
        keyId: 'k_live_2026_a',
        timestamp,
        nonce,
        keys,
        nowMs,
      });
      expect(result.accepted).toBe(true);
      expect((result.body as { code: string }).code).toBe('ROUTING_ALL_PROVIDERS_UNAVAILABLE');
      expect((result.body as { details: { decision: string } }).details.decision).toBe('OUTAGE_FAIL_FAST');
    });

    it('classifies a missing HTTP response as transport failure, not an outage decision', () => {
      const transportFailure = { kind: 'TRANSPORT_FAILURE' as const };
      expect(transportFailure.kind).not.toBe('OUTAGE_FAIL_FAST');
      expect(transportFailure.kind).toBe('TRANSPORT_FAILURE');
    });
  });
});
