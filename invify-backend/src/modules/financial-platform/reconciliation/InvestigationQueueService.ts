export class InvestigationQueueService {
  constructor(private dbStore: any, private logger: any) {}

  async flagDiscrepancy(payload: {
    tenantId: string;
    targetType: string;
    targetId: string;
    discrepancyType: string;
    invifyState: any;
    quasarState: any;
  }) {
    this.logger.warn(`Flagging discrepancy: ${payload.discrepancyType}`, { 
      tenantId: payload.tenantId, 
      targetId: payload.targetId 
    });

    return await this.dbStore.createReconciliationRecord({
      tenantId: payload.tenantId,
      targetType: payload.targetType,
      targetId: payload.targetId,
      discrepancyType: payload.discrepancyType,
      invifyState: payload.invifyState,
      quasarState: payload.quasarState,
      status: 'OPEN'
    });
  }

  async resolveDiscrepancy(recordId: string, resolutionNotes: string) {
    this.logger.info(`Resolving discrepancy ${recordId}`, { resolutionNotes });
    
    return await this.dbStore.updateReconciliationRecord(recordId, {
      status: 'RESOLVED',
      resolvedAt: new Date().toISOString(),
      resolutionNotes
    });
  }
}
