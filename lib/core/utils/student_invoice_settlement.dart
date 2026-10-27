import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';

/// Open academic debt. Pending/unconfirmed checkouts stay owing until Paid.
double openAcademicDebt(Iterable<Invoice> invoices) {
  var sum = 0.0;
  for (final inv in invoices) {
    if (!inv.countsTowardSales || inv.isRolledForward) continue;
    sum += inv.outstandingAmount;
  }
  return sum;
}

class StudentPayStatusCounts {
  const StudentPayStatusCounts({
    required this.paid,
    required this.owing,
    required this.owingValue,
  });

  final int paid;
  final int owing;
  final double owingValue;
}

/// Paid = no confirmed-outstanding. Pending transfers count as owing.
StudentPayStatusCounts countStudentPayStatus({
  required Iterable<int> studentIds,
  required Iterable<Invoice> invoices,
}) {
  final due = <int, double>{};
  for (final inv in invoices) {
    if (!inv.countsTowardSales || inv.isRolledForward) continue;
    final id = inv.studentId;
    if (id == null) continue;
    due[id] = (due[id] ?? 0) + inv.outstandingAmount;
  }

  var paid = 0;
  var owing = 0;
  var owingValue = 0.0;
  for (final id in studentIds) {
    final amount = due[id] ?? 0;
    if (amount > 0.001) {
      owing++;
      owingValue += amount;
    } else {
      paid++;
    }
  }
  return StudentPayStatusCounts(paid: paid, owing: owing, owingValue: owingValue);
}
