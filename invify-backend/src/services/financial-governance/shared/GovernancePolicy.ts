// ─── Core governance policy types ────────────────────────────────────────────

export type PolicyType =
  | 'TREASURY'
  | 'LIQUIDITY'
  | 'SETTLEMENT'
  | 'ROUTING'
  | 'VERIFICATION'
  | 'RISK'
  | 'AML'
  | 'WALLET'
  | 'PROVIDER'
  | 'CERTIFICATE'
  | 'SECRET_ROTATION'
  | 'FEATURE_FLAG';

export type PolicyStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ACTIVE'
  | 'SUPERSEDED'
  | 'EXPIRED'
  | 'REVOKED';

export interface GovernancePolicy {
  id: string;
  type: PolicyType;
  /** Monotonically increasing integer per policy type */
  version: number;
  status: PolicyStatus;
  createdBy: string;
  approvedBy: string[];
  /** ISO-8601 date from which this policy becomes effective */
  effectiveDate: string;
  /** ISO-8601 expiry date, or null for indefinite */
  expiryDate: string | null;
  /** ID of the policy version this supersedes */
  previousVersion: string | null;
  /** ID of the policy version to roll back to */
  rollbackVersion: string | null;
  changeReason: string;
  /** Policy-specific configuration blob */
  data: Record<string, any>;
  activatedAt: string | null;
  createdAt: string;
  /** SHA-like content hash for immutability verification */
  hash: string;
}

/** Compute a deterministic content hash from policy fields */
export function computePolicyHash(
  type: PolicyType,
  version: number,
  data: Record<string, any>,
  createdBy: string,
  effectiveDate: string
): string {
  const raw = `${type}:${version}:${JSON.stringify(data)}:${createdBy}:${effectiveDate}`;
  return Buffer.from(raw).toString('base64').substring(0, 16).toUpperCase();
}

/** Generate a unique policy ID */
export function generatePolicyId(type: PolicyType, version: number): string {
  return `POL-${type}-V${version}-${Date.now().toString(36).toUpperCase()}`;
}
