/// Maps server finance acknowledgements to local outbox row status.
/// Local PENDING is kept until a valid ack (accepted/duplicate/rejected).
String outboxStatusForAck(String? ack) {
  switch ((ack ?? '').trim().toLowerCase()) {
    case 'accepted':
    case 'duplicate':
      return 'COMPLETED';
    case 'rejected':
      return 'DEAD_LETTER';
    case 'reconciliation-required':
      return 'FAILED';
    default:
      return '';
  }
}

bool outboxAckRetryable(String? ack) {
  return (ack ?? '').trim().toLowerCase() == 'reconciliation-required';
}
