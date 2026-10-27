import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/features/school/domain/entities/school_entities.dart';
import 'package:involve_app/features/school/domain/services/parent_payment_receipt_service.dart';

enum ParentTxnKind { parentPayment, paidBill }

class ParentTxnRow {
  final ParentTxnKind kind;
  final DateTime at;
  final double amount;
  final String methodLabel;
  final String? reference;
  final int? studentId;
  final ParentPaymentRecord? payment;
  final Invoice? bill;

  const ParentTxnRow({
    required this.kind,
    required this.at,
    required this.amount,
    required this.methodLabel,
    this.reference,
    this.studentId,
    this.payment,
    this.bill,
  });

  bool get isParentPayment => kind == ParentTxnKind.parentPayment;
}

enum ParentTxnKindFilter { all, parentPayments, paidBills }

class ParentTxnQuery {
  final ParentTxnKindFilter kind;
  final int? studentId;
  final String search;
  final DateTime? from;
  final DateTime? to;

  const ParentTxnQuery({
    this.kind = ParentTxnKindFilter.all,
    this.studentId,
    this.search = '',
    this.from,
    this.to,
  });
}

List<ParentTxnRow> buildParentTransactions({
  required List<ParentPaymentRecord> payments,
  required List<Invoice> invoices,
}) {
  final rows = <ParentTxnRow>[];
  for (final payment in payments) {
    rows.add(
      ParentTxnRow(
        kind: ParentTxnKind.parentPayment,
        at: payment.createdAt,
        amount: payment.amount,
        methodLabel: ParentPaymentReceiptService.methodLabel(payment.source),
        reference: payment.reference,
        studentId: payment.allocations.length == 1 ? payment.allocations.first.studentId : null,
        payment: payment,
      ),
    );
  }

  final seen = <String>{};
  for (final invoice in invoices) {
    if (invoice.isPaymentSlip) continue;
    if (invoice.collectedAmount <= 0) continue;
    final key = invoice.syncId ?? invoice.invoiceNumber;
    if (key.isNotEmpty && !seen.add(key)) continue;
    rows.add(
      ParentTxnRow(
        kind: ParentTxnKind.paidBill,
        at: invoice.dateCreated,
        amount: invoice.collectedAmount,
        methodLabel: invoice.paymentMethod?.trim().isNotEmpty == true
            ? invoice.paymentMethod!.trim()
            : 'Bill payment',
        reference: invoice.invoiceNumber,
        studentId: invoice.studentId,
        bill: invoice,
      ),
    );
  }

  rows.sort((a, b) => b.at.compareTo(a.at));
  return rows;
}

List<ParentTxnRow> filterParentTransactions(
  List<ParentTxnRow> rows,
  ParentTxnQuery query,
) {
  final needle = query.search.trim().toLowerCase();
  return rows.where((row) {
    if (query.kind == ParentTxnKindFilter.parentPayments && !row.isParentPayment) {
      return false;
    }
    if (query.kind == ParentTxnKindFilter.paidBills && row.isParentPayment) {
      return false;
    }
    if (query.studentId != null) {
      if (row.studentId == query.studentId) {
        // matched
      } else if (row.payment != null) {
        final hit = row.payment!.allocations.any((a) => a.studentId == query.studentId);
        if (!hit) return false;
      } else {
        return false;
      }
    }
    if (query.from != null && row.at.isBefore(query.from!)) return false;
    if (query.to != null && !row.at.isBefore(query.to!.add(const Duration(days: 1)))) {
      return false;
    }
    if (needle.isEmpty) return true;
    final hay = [
      row.methodLabel,
      row.reference ?? '',
      row.amount.toString(),
      row.bill?.customerName ?? '',
      row.bill?.admissionNumber ?? '',
      row.bill?.displayPaymentStatus ?? '',
      row.isParentPayment ? 'parent payment' : 'paid bill',
    ].join(' ').toLowerCase();
    return hay.contains(needle);
  }).toList();
}
