/**
 * AUTHORITATIVE REVENUE RECONCILIATION ENGINE
 * Continually audits expected platform fees, gateway payouts, clearing balances, and user wallets.
 * Detects accounting variances and creates structured reconciliation matrices.
 */

export class RevenueReconciliationEngine {
  /**
   * Bounded decimal rounding tool.
   */
  static safeRound(value, decimals = 2) {
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  /**
   * Reconciles a single transaction's financial flow.
   * Asserts: expectedFee + merchantPayout === baseTransactionAmount
   */
  static reconcileTransaction(params) {
    const {
      amount,
      expectedFee,
      actualSettlement, // Payout from the processor (e.g. Stripe/Paystack)
      walletCredit,     // Credit applied to user's wallet
      pendingFees       // Fees logged but not yet collected
    } = params;

    const netSettlementReceived = this.safeRound(actualSettlement - expectedFee, 2);
    const expectedWalletCredit = this.safeRound(amount - expectedFee, 2);

    // Compute Variances
    const walletVariance = this.safeRound(walletCredit - expectedWalletCredit, 2);
    const gatewayVariance = this.safeRound(actualSettlement - amount, 2);
    const balanceDiscrepancy = this.safeRound((expectedFee + walletCredit + pendingFees) - amount, 2);

    const isReconciled = walletVariance === 0 && gatewayVariance === 0 && balanceDiscrepancy === 0;

    return {
      transactionId: params.transactionId || `TX-REC-${Date.now().toString(36).toUpperCase()}`,
      timestamp: Date.now(),
      isReconciled,
      variances: {
        walletVariance,
        gatewayVariance,
        balanceDiscrepancy
      },
      status: isReconciled ? "RECONCILED" : "DISCREPANCY_DETECTED",
      reconciliationMessage: isReconciled
        ? "Reconciliation passed. Double-entry balances perfect."
        : `Accounting Discrepancy Found: Wallet Variance (${walletVariance}), Balance Leakage (${balanceDiscrepancy}).`
    };
  }

  /**
   * Performs high-scale global portfolio reconciliation analysis.
   */
  static reconcileGlobalLedger(expectedVolume, actualGatewayPayouts, globalWalletBalances, totalFeesCollected) {
    const unaccountedVariance = this.safeRound(actualGatewayPayouts - (globalWalletBalances + totalFeesCollected), 2);
    const leakageRatio = expectedVolume > 0 ? this.safeRound((unaccountedVariance / expectedVolume) * 100, 4) : 0;

    const healthy = Math.abs(unaccountedVariance) < 0.01; // Accounting bounds limit

    return {
      auditedAt: Date.now(),
      expectedVolume,
      actualGatewayPayouts,
      globalWalletBalances,
      totalFeesCollected,
      unaccountedVariance,
      leakageRatio,
      status: healthy ? "COMPLIANT" : "AUDIT_WARNING",
      recommendation: healthy
        ? "Platform ledger compliant. No corrective remediation required."
        : `Ledger Leakage Alert: ₦${unaccountedVariance} is unaccounted for in splits. Initiate dual-approval key exchange.`
    };
  }
}
