/**
 * MULTI-STATE WORKFLOW ORCHESTRATION ENGINE
 * Authoritative lifecycle execution framework enforcing 11 definitive states and human override priorities.
 */

import { generateSequenceId } from '../../contracts';

export const OrchestratorMetadata = {
  owner: "orchestration",
  maintainer: "workflow-runtime-engine",
  schemaVersion: "2.1"
};

export const CanonicalWorkflowStates = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  QUEUED: 'QUEUED',
  EXECUTING: 'EXECUTING',
  WAITING: 'WAITING',
  RETRYING: 'RETRYING',
  PAUSED: 'PAUSED',
  ROLLING_BACK: 'ROLLING_BACK',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};

// Orchestration job factory generating traceable workflow envelopes complete with dependency nodes
export const createOrchestrationJob = (jobParams) => {
  const isGated = jobParams?.requiresSignOff || false;
  
  return {
    workflowId: jobParams?.workflowId || generateSequenceId('WF'),
    targetTenant: jobParams?.tenantScope || 'GLOBAL_TENANT_ROOT',
    state: isGated ? CanonicalWorkflowStates.PENDING_APPROVAL : CanonicalWorkflowStates.QUEUED,
    
    // Dynamic Workflow Dependency Graphs modeling complex target prerequisites
    dependencyGraphNodes: {
      rolloutDependenciesConverged: jobParams?.rolloutConverged ?? true,
      governanceLocksCleared: jobParams?.governanceCleared ?? true,
      prerequisitesSatisfied: true
    },
    
    steps: jobParams?.steps || [
      { stepId: 'STP-1', action: 'VERIFY_INTEGRITY_STATE', status: 'PENDING' },
      { stepId: 'STP-2', action: 'APPLY_REMEDIATION_PATCH', status: 'PENDING' }
    ],
    
    // Human Override Priority Layers attribution register
    humanOverrideContext: {
      hasOperatorTakenOver: false,
      overridingOperatorSignature: null,
      takeoverReasonString: null,
      forcedActionApplied: null
    },
    
    executionTimeline: {
      createdTs: Date.now(),
      startedTs: null,
      completedTs: null,
      lastUpdatedTs: Date.now()
    }
  };
};

// Immediate operator intervention priority gateway bypassing programmatic state sequences
export const applyHumanOverrideCommand = (workflowObj, operatorSignature, commandStr, reasonStr) => {
  if (!workflowObj) return null;
  
  if (!operatorSignature || operatorSignature.length < 8) {
    throw new Error(`[HUMAN_OVERRIDE_REJECTED] Valid operator attribution signature required to assume manual priority.`);
  }
  
  workflowObj.humanOverrideContext = {
    hasOperatorTakenOver: true,
    overridingOperatorSignature: operatorSignature,
    takeoverReasonString: reasonStr || 'SOC administrative intervention triggered.',
    forcedActionApplied: commandStr
  };
  
  workflowObj.executionTimeline.lastUpdatedTs = Date.now();
  
  // Resolve states directly based on command parameters
  switch ((commandStr || '').toUpperCase().trim()) {
    case 'FORCE_CANCEL':
      workflowObj.state = CanonicalWorkflowStates.CANCELLED;
      break;
    case 'FORCE_ROLLBACK':
      workflowObj.state = CanonicalWorkflowStates.ROLLING_BACK;
      break;
    case 'FORCE_PAUSE':
      workflowObj.state = CanonicalWorkflowStates.PAUSED;
      break;
    case 'APPROVE_GATE':
      workflowObj.state = CanonicalWorkflowStates.QUEUED;
      break;
    default:
      workflowObj.state = CanonicalWorkflowStates.WAITING;
      break;
  }
  
  return workflowObj;
};
