import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/features/school_finance/presentation/withdrawal_confirmation_copy.dart';

void main() {
  test('PENDING means submitted for approval, not sent to the bank', () {
    expect(WithdrawalConfirmationCopy.isPendingApproval('PENDING'), isTrue);
    expect(
      WithdrawalConfirmationCopy.title('PENDING'),
      'Withdrawal submitted successfully for approval',
    );
    expect(
      WithdrawalConfirmationCopy.message('PENDING'),
      'Your withdrawal request has been submitted and is pending approval. You will be notified once it is processed.',
    );
    expect(WithdrawalConfirmationCopy.statusLabel('PENDING'), 'Pending approval');
    expect(WithdrawalConfirmationCopy.statusLabel('PENDING'), isNot('Sent to your bank'));
    expect(WithdrawalConfirmationCopy.title('PENDING'), isNot('Withdrawal successful'));
  });

  test('SUCCESS is only used when the backend status is final', () {
    expect(WithdrawalConfirmationCopy.isFinalSuccess('SUCCESS'), isTrue);
    expect(WithdrawalConfirmationCopy.title('SUCCESS'), 'Withdrawal successful');
    expect(WithdrawalConfirmationCopy.statusLabel('SUCCESS'), 'Successful');
    expect(WithdrawalConfirmationCopy.isPendingApproval('SUCCESS'), isFalse);
  });
}
