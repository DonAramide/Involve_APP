import { PolicyType } from '../shared/GovernancePolicy';

/** Fine-grained capability string, e.g. "treasury.float", "routing.priority" */
export type GovernanceCapability = string;

const DEFAULT_CAPABILITIES: Array<[GovernanceCapability, PolicyType]> = [
  // Treasury
  ['treasury.float',    'TREASURY'],
  ['treasury.limit',    'TREASURY'],
  ['treasury.reserve',  'TREASURY'],
  ['treasury.window',   'TREASURY'],
  // Liquidity
  ['liquidity.minimum', 'LIQUIDITY'],
  ['liquidity.reserve', 'LIQUIDITY'],
  ['liquidity.coverage','LIQUIDITY'],
  // Settlement
  ['settlement.window',   'SETTLEMENT'],
  ['settlement.currency', 'SETTLEMENT'],
  ['settlement.account',  'SETTLEMENT'],
  ['settlement.schedule', 'SETTLEMENT'],
  // Routing
  ['routing.priority', 'ROUTING'],
  ['routing.failover', 'ROUTING'],
  ['routing.cost',     'ROUTING'],
  ['routing.health',   'ROUTING'],
  // Verification
  ['verification.pipeline', 'VERIFICATION'],
  ['verification.timeout',  'VERIFICATION'],
  ['verification.failfast', 'VERIFICATION'],
  // Risk
  ['risk.threshold',    'RISK'],
  ['risk.manualReview', 'RISK'],
  ['risk.country',      'RISK'],
  ['risk.velocity',     'RISK'],
  // AML
  ['aml.rules',      'AML'],
  ['aml.blacklist',  'AML'],
  ['aml.watchlist',  'AML'],
  ['aml.threshold',  'AML'],
  // Wallet
  ['wallet.currency', 'WALLET'],
  ['wallet.balance',  'WALLET'],
  ['wallet.status',   'WALLET'],
  // Provider
  ['provider.priority', 'PROVIDER'],
  ['provider.enable',   'PROVIDER'],
  ['provider.disable',  'PROVIDER'],
  ['provider.weight',   'PROVIDER'],
  // Certificate
  ['certificate.rotation',   'CERTIFICATE'],
  ['certificate.expiry',     'CERTIFICATE'],
  ['certificate.minimumTls', 'CERTIFICATE'],
  // Secret Rotation
  ['secret.rotation', 'SECRET_ROTATION'],
  ['secret.expiry',   'SECRET_ROTATION'],
  ['secret.version',  'SECRET_ROTATION'],
  // Feature Flags
  ['feature.enable',  'FEATURE_FLAG'],
  ['feature.disable', 'FEATURE_FLAG'],
  ['feature.rollout', 'FEATURE_FLAG'],
];

export class GovernanceCapabilityRegistry {
  /** capability → policyType */
  private static capToPolicy: Map<GovernanceCapability, PolicyType> = new Map(DEFAULT_CAPABILITIES);
  /** policyType → capability[] */
  private static policyToCaps: Map<PolicyType, GovernanceCapability[]> = new Map();

  static {
    this.rebuild();
  }

  private static rebuild() {
    this.policyToCaps.clear();
    for (const [cap, type] of this.capToPolicy.entries()) {
      const list = this.policyToCaps.get(type) ?? [];
      list.push(cap);
      this.policyToCaps.set(type, list);
    }
  }

  static clearMockData() {
    this.capToPolicy = new Map(DEFAULT_CAPABILITIES);
    this.rebuild();
  }

  static register(capability: GovernanceCapability, policyType: PolicyType): void {
    this.capToPolicy.set(capability, policyType);
    const list = this.policyToCaps.get(policyType) ?? [];
    if (!list.includes(capability)) list.push(capability);
    this.policyToCaps.set(policyType, list);
  }

  /** Resolve which PolicyType governs a given capability string. */
  static resolve(capability: GovernanceCapability): PolicyType | null {
    return this.capToPolicy.get(capability) ?? null;
  }

  /** All capabilities owned by a policy type. */
  static getCapabilitiesFor(policyType: PolicyType): GovernanceCapability[] {
    return this.policyToCaps.get(policyType) ?? [];
  }

  static getAllCapabilities(): GovernanceCapability[] {
    return Array.from(this.capToPolicy.keys());
  }

  static getAllMappings(): Array<{ capability: GovernanceCapability; policyType: PolicyType }> {
    return Array.from(this.capToPolicy.entries()).map(([capability, policyType]) => ({
      capability,
      policyType,
    }));
  }
}
