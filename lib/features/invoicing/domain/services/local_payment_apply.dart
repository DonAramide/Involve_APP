import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/core/utils/invoice_payment_legs.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/features/invoicing/domain/services/parent_wallet_payment.dart';
import 'package:involve_app/features/invoicing/domain/services/payment_balance_effect.dart';

class RecordedPaymentPlan {
  const RecordedPaymentPlan({
    required this.status,
    required this.amountPaid,
    required this.balance,
    required this.storedMethod,
    required this.reduceOpenBalances,
    this.alreadyApplied = false,
  });

  final String status;
  final double amountPaid;
  final double balance;
  final String storedMethod;
  final bool reduceOpenBalances;
  final bool alreadyApplied;
}

bool _awaitsServerAck(String method, Invoice invoice) {
  if (isUnconfirmedTransferMethod(method)) return true;
  return isSchoolParentWalletPayment(
    method,
    businessMode: invoice.businessMode,
    studentId: invoice.studentId,
  );
}

/// Local projection of a payment before server acknowledgement.
/// Parent-wallet and unconfirmed transfers do not increase confirmed paid totals.
RecordedPaymentPlan planRecordedPayment({
  required Invoice invoice,
  required double additionalAmount,
  required String method,
  String? commandId,
  DateTime? now,
}) {
  final when = now ?? DateTime.now();
  final prior = displayPaymentLegs(invoice);
  if (commandId != null &&
      commandId.length >= 16 &&
      prior.any((leg) => leg.commandId == commandId)) {
    return RecordedPaymentPlan(
      status: invoice.paymentStatus,
      amountPaid: invoice.amountPaid,
      balance: invoice.balanceAmount,
      storedMethod: invoice.paymentMethod ?? method,
      reduceOpenBalances: false,
      alreadyApplied: true,
    );
  }

  final confirmedPrior = confirmedPaymentLegs(invoice);
  final awaitsAck = _awaitsServerAck(method, invoice);
  final newAmountPaid =
      CurrencyFormatter.roundMoney(invoice.amountPaid + additionalAmount);
  final newBalance = CurrencyFormatter.roundMoney(
    (invoice.totalAmount - newAmountPaid).clamp(0.0, double.infinity),
  );

  if (awaitsAck) {
    final legs = [
      ...prior.isNotEmpty ? prior : confirmedPrior,
      InvoicePaymentLeg(
        amount: additionalAmount,
        method: method,
        confirmed: false,
        receivedAt: when,
        commandId: commandId,
      ),
    ];
    final storedMethod = encodePaymentLegs(legs);
    if (confirmedPrior.isNotEmpty) {
      return RecordedPaymentPlan(
        status: 'Partial',
        amountPaid: invoice.amountPaid,
        balance: invoice.balanceAmount,
        storedMethod: storedMethod,
        reduceOpenBalances: false,
      );
    }
    return RecordedPaymentPlan(
      status: 'Pending',
      amountPaid: invoice.amountPaid,
      balance: invoice.balanceAmount,
      storedMethod: storedMethod,
      reduceOpenBalances: false,
    );
  }

  final legs = [
    ...confirmedPrior,
    InvoicePaymentLeg(
      amount: additionalAmount,
      method: method,
      receivedAt: when,
      commandId: commandId,
    ),
  ];
  final storedMethod = encodePaymentLegs(legs);
  final String status;
  if (newBalance <= 0) {
    status = 'Paid';
  } else if (newAmountPaid > 0) {
    status = 'Partial';
  } else {
    status = 'Unpaid';
  }
  return RecordedPaymentPlan(
    status: status,
    amountPaid: newAmountPaid,
    balance: newBalance,
    storedMethod: storedMethod,
    reduceOpenBalances: shouldReduceOpenBalances(
      method,
      businessMode: invoice.businessMode,
      studentId: invoice.studentId,
    ),
  );
}
