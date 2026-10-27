/// Explicit finance-command lifecycle. Confirmed collected totals may increase
/// only after [accepted] or [duplicate] acknowledgement.
enum FinanceCommandLifecycle {
  pending,
  accepted,
  rejected,
  duplicate,
  reconciliationRequired,
}

FinanceCommandLifecycle financeCommandLifecycleForAck(String? ack) {
  switch ((ack ?? '').trim().toLowerCase()) {
    case 'accepted':
      return FinanceCommandLifecycle.accepted;
    case 'duplicate':
      return FinanceCommandLifecycle.duplicate;
    case 'rejected':
      return FinanceCommandLifecycle.rejected;
    case 'reconciliation-required':
      return FinanceCommandLifecycle.reconciliationRequired;
    default:
      return FinanceCommandLifecycle.pending;
  }
}

bool financeAckConfirmsLocally(FinanceCommandLifecycle state) =>
    state == FinanceCommandLifecycle.accepted ||
    state == FinanceCommandLifecycle.duplicate;

/// UI: submitted/pending is not confirmed/paid.
String financeCommandUiLabel(FinanceCommandLifecycle state) {
  switch (state) {
    case FinanceCommandLifecycle.pending:
      return 'Submitted';
    case FinanceCommandLifecycle.accepted:
    case FinanceCommandLifecycle.duplicate:
      return 'Paid';
    case FinanceCommandLifecycle.rejected:
      return 'Rejected';
    case FinanceCommandLifecycle.reconciliationRequired:
      return 'Reconciliation required';
  }
}

double confirmedCollectedTotal(Iterable<double> invoiceCollectedAmounts) {
  return invoiceCollectedAmounts.fold<double>(0, (sum, amount) => sum + amount);
}
