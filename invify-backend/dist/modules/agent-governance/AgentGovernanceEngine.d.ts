import { AgentEntity, AgentState, OnboardingGeoLineage } from '../../contracts/agents/AgentEntity';
export declare class AgentGovernanceEngine {
    private codeEngine;
    constructor();
    createAgent(businessIdentity: string, operationalSector: string, payoutDestination: string, commissionProfileId: string, geoLineage: OnboardingGeoLineage, requestedPrefix?: string): AgentEntity;
    updateAgentState(agentId: string, newState: AgentState): void;
    suspendAgent(agentId: string, reason: string): void;
    blockAgent(agentId: string, reason: string): void;
    private generateUuid;
}
