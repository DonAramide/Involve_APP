/// Presentation-only mapping for the post-submit withdrawal receipt.
/// Does not change payout status values from the API.
class WithdrawalConfirmationCopy {
  const WithdrawalConfirmationCopy._();

  static String normalizedStatus(String raw) => raw.trim().toUpperCase();

  static bool isFinalSuccess(String raw) {
    final status = normalizedStatus(raw);
    return status == 'SUCCESS' ||
        status == 'SUCCESSFUL' ||
        status == 'COMPLETED' ||
        status == 'PAID' ||
        status == 'SETTLED';
  }

  static bool isFailed(String raw) {
    final status = normalizedStatus(raw);
    return status == 'FAILED' ||
        status == 'REJECTED' ||
        status == 'CANCELLED' ||
        status == 'CANCELED';
  }

  /// True when the request was accepted but has not been paid out yet.
  static bool isPendingApproval(String raw) =>
      !isFinalSuccess(raw) && !isFailed(raw);

  static String title(String raw) {
    if (isFinalSuccess(raw)) return 'Withdrawal successful';
    if (isFailed(raw)) return 'Withdrawal failed';
    return 'Withdrawal submitted successfully for approval';
  }

  static String message(String raw) {
    if (isFinalSuccess(raw)) {
      return 'Your withdrawal has been processed.';
    }
    if (isFailed(raw)) {
      return 'Your withdrawal request could not be completed.';
    }
    return 'Your withdrawal request has been submitted and is pending approval. You will be notified once it is processed.';
  }

  static String statusLabel(String raw) {
    if (isFinalSuccess(raw)) return 'Successful';
    if (isFailed(raw)) return 'Failed';
    return 'Pending approval';
  }
}
