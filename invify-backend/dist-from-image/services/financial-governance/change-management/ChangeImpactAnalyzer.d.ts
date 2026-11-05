import { PolicyType } from '../shared/GovernancePolicy';
export type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export interface DomainImpact {
    domain: string;
    affectedCapabilities: string[];
    impactLevel: ImpactLevel;
    reason: string;
}
export interface ImpactAnalysis {
    policyType: PolicyType;
    directDomains: string[];
    cascadingDomains: DomainImpact[];
    overallImpactLevel: ImpactLevel;
    dependencyGraph: Record<string, string[]>;
    rollbackRequired: boolean;
    estimatedRiskNote: string;
    analysedAt: string;
}
export declare class ChangeImpactAnalyzer {
    static analyze(policyType: PolicyType, proposedData: Record<string, any>): ImpactAnalysis;
    private static getCapabilities;
}
