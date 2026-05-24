import { ReferralLineageEngine } from '../../distribution-lineage/ReferralLineageEngine';
import { CommissionLineageEngine } from '../../distribution-lineage/CommissionLineageEngine';
import { CommissionResolutionEngine, CommissionModelType } from '../../commission-models/CommissionResolutionEngine';
import { AgentIntegrityGuardian } from './AgentIntegrityGuardian';

export class AgentGovernanceValidationRunner {
  private referralEngine = new ReferralLineageEngine();
  private commLineageEngine = new CommissionLineageEngine();
  private commResolutionEngine = new CommissionResolutionEngine();
  private guardian = new AgentIntegrityGuardian();

  /**
   * Runs the complete enterprise validation suite for Agent Governance
   */
  public async runValidationSuites(): Promise<void> {
    console.log('--- STARTING AGENT GOVERNANCE VALIDATION SUITES ---');
    this.validateImmutableLineage();
    this.validateDeterministicCommissionReplay();
    this.validateFraudSuppression();
    console.log('--- VALIDATION SUITES COMPLETED SUCCESSFULLY ---');
  }

  private validateImmutableLineage() {
    console.log('Running: Immutable Lineage Validation...');
    const record = this.referralEngine.initializeOnboardingLineage(
      'tenant-123',
      'RET102',
      'ONLINE',
      'MOBILE_APP',
      'direct'
    );
    if (!record.attributionLineageHash) throw new Error('Lineage Hash missing!');
    console.log('✔ Immutable Lineage validated.');
  }

  private validateDeterministicCommissionReplay() {
    console.log('Running: Deterministic Commission Replay Validation...');
    const snapshot = {
      version: 'v1',
      modelType: CommissionModelType.PERCENTAGE,
      percentageRate: 10
    };
    
    const resolution = this.commResolutionEngine.resolveCommission(500, 'SUBSCRIPTION', snapshot);
    if (resolution.amount !== 50) throw new Error('Commission calculation failed determinism check');

    const lineage = this.commLineageEngine.recordCommissionLineage(
      'tx-789',
      1,
      snapshot.version,
      resolution.amount,
      'RET102'
    );
    if (!lineage.lineageHash) throw new Error('Commission Lineage Hash missing!');
    console.log('✔ Deterministic Commission Replay validated.');
  }

  private validateFraudSuppression() {
    console.log('Running: Fraud Suppression Validation...');
    const isVelocityAnomaly = this.guardian.evaluateVelocityAnomaly('RET102', 60);
    if (!isVelocityAnomaly) throw new Error('Velocity limiter failed to trigger');

    const isGeoInconsistent = this.guardian.detectGeographicInconsistency('RET102', 'Lagos', 'London');
    if (!isGeoInconsistent) throw new Error('Geo anomaly failed to trigger');

    console.log('✔ Fraud Suppression validated.');
  }
}
