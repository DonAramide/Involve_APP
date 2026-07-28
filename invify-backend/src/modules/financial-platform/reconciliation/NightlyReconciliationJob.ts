export class NightlyReconciliationJob {
  constructor(
    private quasarConnector: any,
    private dbStore: any,
    private investigationQueueService: any,
    private logger: any
  ) {}

  async run(targetDate: string) {
    this.logger.info(`Starting Nightly Reconciliation for ${targetDate}`);

    try {
      // Note: In reality, we'd paginate through all tenants.
      const tenants = await this.dbStore.getActiveTenants();
      
      for (const tenant of tenants) {
        // Fetch settlements from Quasar for this date
        const quasarSettlements = await this.quasarConnector.getSettlements(tenant.id, targetDate);
        
        // Fetch local successfully processed payments
        const localPayments = await this.dbStore.getSucceededPayments(tenant.id, targetDate);
        
        this.compare(tenant.id, quasarSettlements, localPayments);
      }
      
      this.logger.info('Nightly Reconciliation completed successfully');
    } catch (error) {
      this.logger.error('Nightly Reconciliation failed', { error });
    }
  }

  private async compare(tenantId: string, quasarSettlements: any[], localPayments: any[]) {
    // Basic discrepancy logic
    const quasarMap = new Map(quasarSettlements.map(s => [s.intentId, s]));
    
    for (const localPayment of localPayments) {
      const quasarRecord = quasarMap.get(localPayment.id);
      
      if (!quasarRecord) {
        await this.investigationQueueService.flagDiscrepancy({
          tenantId,
          targetType: 'PAYMENT_INTENT',
          targetId: localPayment.id,
          discrepancyType: 'MISSED_WEBHOOK_OR_DELAYED_SETTLEMENT',
          invifyState: localPayment,
          quasarState: null
        });
      } else if (quasarRecord.status !== localPayment.status) {
        await this.investigationQueueService.flagDiscrepancy({
          tenantId,
          targetType: 'PAYMENT_INTENT',
          targetId: localPayment.id,
          discrepancyType: 'STATUS_MISMATCH',
          invifyState: localPayment,
          quasarState: quasarRecord
        });
      }
    }
  }
}
