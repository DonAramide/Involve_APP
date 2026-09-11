/// Integer-kobo allocation for parent virtual-account deposits.
/// Never uses floating-point for the split; Naira is converted with bankers-safe rounding.
class ChildOutstanding {
  final int studentId;
  final double outstandingNaira;

  const ChildOutstanding({
    required this.studentId,
    required this.outstandingNaira,
  });
}

class ChildAllocation {
  final int studentId;
  final int outstandingBeforeKobo;
  final int allocatedKobo;
  final int outstandingAfterKobo;

  const ChildAllocation({
    required this.studentId,
    required this.outstandingBeforeKobo,
    required this.allocatedKobo,
    required this.outstandingAfterKobo,
  });

  double get outstandingBeforeNaira => ParentPaymentAllocator.toNaira(outstandingBeforeKobo);
  double get allocatedNaira => ParentPaymentAllocator.toNaira(allocatedKobo);
  double get outstandingAfterNaira => ParentPaymentAllocator.toNaira(outstandingAfterKobo);
}

class ParentAllocationResult {
  final int paymentKobo;
  final int appliedKobo;
  final int creditKobo;
  final int parentOutstandingBeforeKobo;
  final int parentOutstandingAfterKobo;
  final List<ChildAllocation> allocations;

  const ParentAllocationResult({
    required this.paymentKobo,
    required this.appliedKobo,
    required this.creditKobo,
    required this.parentOutstandingBeforeKobo,
    required this.parentOutstandingAfterKobo,
    required this.allocations,
  });

  double get paymentNaira => ParentPaymentAllocator.toNaira(paymentKobo);
  double get appliedNaira => ParentPaymentAllocator.toNaira(appliedKobo);
  double get creditNaira => ParentPaymentAllocator.toNaira(creditKobo);
  double get parentOutstandingBeforeNaira =>
      ParentPaymentAllocator.toNaira(parentOutstandingBeforeKobo);
  double get parentOutstandingAfterNaira =>
      ParentPaymentAllocator.toNaira(parentOutstandingAfterKobo);
}

class ParentPaymentAllocator {
  ParentPaymentAllocator._();

  static int toKobo(double naira) => (naira * 100).round();

  static double toNaira(int kobo) => kobo / 100.0;

  /// Proportional split of [paymentNaira] across children by outstanding.
  /// Excess beyond total outstanding becomes parent credit ([creditKobo]).
  static ParentAllocationResult allocate({
    required double paymentNaira,
    required List<ChildOutstanding> children,
  }) {
    final paymentKobo = toKobo(paymentNaira);
    if (paymentKobo < 0) {
      throw ArgumentError('Payment cannot be negative');
    }

    final debts = <({int studentId, int kobo})>[];
    for (final child in children) {
      final kobo = toKobo(child.outstandingNaira);
      if (kobo > 0) {
        debts.add((studentId: child.studentId, kobo: kobo));
      } else {
        debts.add((studentId: child.studentId, kobo: 0));
      }
    }

    final totalDebt = debts.fold<int>(0, (sum, d) => sum + d.kobo);
    if (paymentKobo == 0 || totalDebt == 0) {
      return ParentAllocationResult(
        paymentKobo: paymentKobo,
        appliedKobo: 0,
        creditKobo: paymentKobo,
        parentOutstandingBeforeKobo: totalDebt,
        parentOutstandingAfterKobo: totalDebt,
        allocations: debts
            .map(
              (d) => ChildAllocation(
                studentId: d.studentId,
                outstandingBeforeKobo: d.kobo,
                allocatedKobo: 0,
                outstandingAfterKobo: d.kobo,
              ),
            )
            .toList(),
      );
    }

    final applied = paymentKobo < totalDebt ? paymentKobo : totalDebt;
    final credit = paymentKobo - applied;

    final allocated = List<int>.filled(debts.length, 0);
    var assigned = 0;
    for (var i = 0; i < debts.length; i++) {
      if (debts[i].kobo <= 0) continue;
      final share = (debts[i].kobo * applied) ~/ totalDebt;
      allocated[i] = share;
      assigned += share;
    }

    var remainder = applied - assigned;
    if (remainder > 0) {
      final order = List<int>.generate(debts.length, (i) => i)
        ..sort((a, b) {
          final leftoverA = debts[a].kobo - allocated[a];
          final leftoverB = debts[b].kobo - allocated[b];
          if (leftoverB != leftoverA) return leftoverB.compareTo(leftoverA);
          if (debts[b].kobo != debts[a].kobo) {
            return debts[b].kobo.compareTo(debts[a].kobo);
          }
          return debts[a].studentId.compareTo(debts[b].studentId);
        });
      for (final i in order) {
        if (remainder <= 0) break;
        final room = debts[i].kobo - allocated[i];
        if (room <= 0) continue;
        allocated[i] += 1;
        remainder -= 1;
      }
    }

    final allocations = <ChildAllocation>[];
    for (var i = 0; i < debts.length; i++) {
      allocations.add(
        ChildAllocation(
          studentId: debts[i].studentId,
          outstandingBeforeKobo: debts[i].kobo,
          allocatedKobo: allocated[i],
          outstandingAfterKobo: debts[i].kobo - allocated[i],
        ),
      );
    }

    final allocatedSum = allocated.fold<int>(0, (s, v) => s + v);
    if (allocatedSum != applied) {
      throw StateError(
        'Allocation mismatch: applied=$applied allocatedSum=$allocatedSum',
      );
    }

    return ParentAllocationResult(
      paymentKobo: paymentKobo,
      appliedKobo: applied,
      creditKobo: credit,
      parentOutstandingBeforeKobo: totalDebt,
      parentOutstandingAfterKobo: totalDebt - applied,
      allocations: allocations,
    );
  }
}
