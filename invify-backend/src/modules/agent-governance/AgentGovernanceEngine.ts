import { AgentEntity, AgentState, OnboardingGeoLineage } from '../../contracts/agents/AgentEntity';
import { AgentCodeReservationEngine } from './AgentCodeReservationEngine';

export class AgentGovernanceEngine {
  private codeEngine: AgentCodeReservationEngine;

  constructor() {
    this.codeEngine = new AgentCodeReservationEngine();
  }

  public createAgent(
    businessIdentity: string,
    operationalSector: string,
    payoutDestination: string,
    commissionProfileId: string,
    geoLineage: OnboardingGeoLineage,
    requestedPrefix?: string
  ): AgentEntity {
    
    if (requestedPrefix && this.codeEngine.isReservedNamespace(requestedPrefix)) {
      throw new Error(`Prefix ${requestedPrefix} is reserved and cannot be used.`);
    }

    const agentCode = this.codeEngine.generateCode(requestedPrefix);
    
    // In a real implementation, we would check the DB to ensure agentCode is globally unique
    // and regenerate if there is a collision.

    const newAgent: AgentEntity = {
      id: this.generateUuid(),
      agentCode,
      businessIdentity,
      state: AgentState.PENDING_APPROVAL,
      geoLineage,
      trustScore: {
        score: 100,
        fraudHistoryScore: 0,
        onboardingQualityScore: 100,
        retentionScore: 100,
        disputeCount: 0,
        suspiciousPatternsDetected: 0
      },
      operationalSector,
      payoutDestination,
      commissionProfileId,
      rbacPermissions: ['agent:basic'],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // TODO: Persist agent to database
    return newAgent;
  }

  public updateAgentState(agentId: string, newState: AgentState): void {
    // TODO: Fetch agent from DB, update state, and persist
    console.log(`Agent ${agentId} state updated to ${newState}`);
  }

  public suspendAgent(agentId: string, reason: string): void {
    this.updateAgentState(agentId, AgentState.SUSPENDED);
    // TODO: Log suspension reason to audit trail
  }

  public blockAgent(agentId: string, reason: string): void {
    this.updateAgentState(agentId, AgentState.BLOCKED);
    // TODO: Trigger fraud/security alerts if blocked
  }

  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
