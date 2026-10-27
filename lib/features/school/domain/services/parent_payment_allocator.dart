/// How a parent payment is applied across children.
enum ParentPaymentShareMode {
  /// Split in proportion to each child's outstanding (default).
  autoShare,
  /// Clear the smallest outstanding first, then the next, and so on.
  lowestToHighest,
  /// Clear the largest outstanding first, then the next, and so on.
  highestToLowest,
  /// Apply the whole payment to the first child whose outstanding equals it.
  /// If none match, the amount stays as parent credit for staff to map.
  firstMatchAmount,
  /// Do not auto-apply. The full amount becomes parent credit until
  /// management maps it to one or more children.
  managementDecide,
}

extension ParentPaymentShareModeX on ParentPaymentShareMode {
  String get storageValue {
    switch (this) {
      case ParentPaymentShareMode.autoShare:
        return 'auto_share';
      case ParentPaymentShareMode.lowestToHighest:
        return 'lowest_to_highest';
      case ParentPaymentShareMode.highestToLowest:
        return 'highest_to_lowest';
      case ParentPaymentShareMode.firstMatchAmount:
        return 'first_match_amount';
      case ParentPaymentShareMode.managementDecide:
        return 'management_decide';
    }
  }

  String get title {
    switch (this) {
      case ParentPaymentShareMode.autoShare:
        return 'Auto share';
      case ParentPaymentShareMode.lowestToHighest:
        return 'Lowest to highest';
      case ParentPaymentShareMode.highestToLowest:
        return 'Highest to lowest';
      case ParentPaymentShareMode.firstMatchAmount:
        return 'First matching amount';
      case ParentPaymentShareMode.managementDecide:
        return 'Management decides';
    }
  }

  String get description {
    switch (this) {
      case ParentPaymentShareMode.autoShare:
        return 'Split the payment proportionally across every child with outstanding fees.';
      case ParentPaymentShareMode.lowestToHighest:
        return 'Pay the child with the smallest balance first, then the next smallest, until the money runs out.';
      case ParentPaymentShareMode.highestToLowest:
        return 'Pay the child with the largest balance first, then the next largest, until the money runs out.';
      case ParentPaymentShareMode.firstMatchAmount:
        return 'If a child’s outstanding equals the payment, apply it there. Otherwise keep it as parent credit.';
      case ParentPaymentShareMode.managementDecide:
        return 'Add the payment to parent credit. Staff later maps it to one or more children.';
    }
  }

  String fundHint({required double outstanding}) {
    switch (this) {
      case ParentPaymentShareMode.autoShare:
        return outstanding > 0
            ? 'Outstanding ${outstanding.toStringAsFixed(2)} will be shared across children. Extra becomes parent credit.'
            : 'No outstanding. The full amount is added as parent credit.';
      case ParentPaymentShareMode.lowestToHighest:
        return 'Pays the smallest child balance first, then the next, until the money runs out. Extra becomes parent credit.';
      case ParentPaymentShareMode.highestToLowest:
        return 'Pays the largest child balance first, then the next, until the money runs out. Extra becomes parent credit.';
      case ParentPaymentShareMode.firstMatchAmount:
        return 'If a child owes exactly this amount, it is applied there. Otherwise the payment stays as parent credit for staff to map.';
      case ParentPaymentShareMode.managementDecide:
        return 'This payment is added to parent credit. Staff later maps it to one or more children.';
    }
  }

  static ParentPaymentShareMode fromStorage(String? raw) {
    switch ((raw ?? '').trim()) {
      case 'lowest_to_highest':
        return ParentPaymentShareMode.lowestToHighest;
      case 'highest_to_lowest':
        return ParentPaymentShareMode.highestToLowest;
      case 'first_match_amount':
        return ParentPaymentShareMode.firstMatchAmount;
      case 'management_decide':
        return ParentPaymentShareMode.managementDecide;
      default:
        return ParentPaymentShareMode.autoShare;
    }
  }
}

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

  /// Split [paymentNaira] across children using [mode].
  /// Excess beyond applied debt becomes parent credit ([creditKobo]).
  static ParentAllocationResult allocate({
    required double paymentNaira,
    required List<ChildOutstanding> children,
    ParentPaymentShareMode mode = ParentPaymentShareMode.autoShare,
  }) {
    final paymentKobo = toKobo(paymentNaira);
    if (paymentKobo < 0) {
      throw ArgumentError('Payment cannot be negative');
    }

    final debts = <({int studentId, int kobo})>[];
    for (final child in children) {
      debts.add((
        studentId: child.studentId,
        kobo: toKobo(child.outstandingNaira).clamp(0, 1 << 62),
      ));
    }

    final totalDebt = debts.fold<int>(0, (sum, d) => sum + d.kobo);
    if (paymentKobo == 0 || totalDebt == 0 || mode == ParentPaymentShareMode.managementDecide) {
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

    switch (mode) {
      case ParentPaymentShareMode.autoShare:
        return _autoShare(paymentKobo: paymentKobo, debts: debts, totalDebt: totalDebt);
      case ParentPaymentShareMode.lowestToHighest:
        return _waterfall(
          paymentKobo: paymentKobo,
          debts: debts,
          totalDebt: totalDebt,
          highestFirst: false,
        );
      case ParentPaymentShareMode.highestToLowest:
        return _waterfall(
          paymentKobo: paymentKobo,
          debts: debts,
          totalDebt: totalDebt,
          highestFirst: true,
        );
      case ParentPaymentShareMode.firstMatchAmount:
        return _firstMatch(paymentKobo: paymentKobo, debts: debts, totalDebt: totalDebt);
      case ParentPaymentShareMode.managementDecide:
        break;
    }
    return _autoShare(paymentKobo: paymentKobo, debts: debts, totalDebt: totalDebt);
  }

  static ParentAllocationResult _autoShare({
    required int paymentKobo,
    required List<({int studentId, int kobo})> debts,
    required int totalDebt,
  }) {
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

    return _result(
      paymentKobo: paymentKobo,
      applied: applied,
      credit: credit,
      totalDebt: totalDebt,
      debts: debts,
      allocated: allocated,
    );
  }

  static ParentAllocationResult _waterfall({
    required int paymentKobo,
    required List<({int studentId, int kobo})> debts,
    required int totalDebt,
    required bool highestFirst,
  }) {
    final order = List<int>.generate(debts.length, (i) => i)
      ..sort((a, b) {
        if (debts[a].kobo != debts[b].kobo) {
          return highestFirst
              ? debts[b].kobo.compareTo(debts[a].kobo)
              : debts[a].kobo.compareTo(debts[b].kobo);
        }
        return debts[a].studentId.compareTo(debts[b].studentId);
      });

    final allocated = List<int>.filled(debts.length, 0);
    var remaining = paymentKobo;
    for (final i in order) {
      if (remaining <= 0) break;
      if (debts[i].kobo <= 0) continue;
      final take = remaining < debts[i].kobo ? remaining : debts[i].kobo;
      allocated[i] = take;
      remaining -= take;
    }

    final applied = paymentKobo - remaining;
    return _result(
      paymentKobo: paymentKobo,
      applied: applied,
      credit: remaining,
      totalDebt: totalDebt,
      debts: debts,
      allocated: allocated,
    );
  }

  static ParentAllocationResult _firstMatch({
    required int paymentKobo,
    required List<({int studentId, int kobo})> debts,
    required int totalDebt,
  }) {
    final allocated = List<int>.filled(debts.length, 0);
    final matches = <int>[];
    for (var i = 0; i < debts.length; i++) {
      if (debts[i].kobo == paymentKobo && debts[i].kobo > 0) {
        matches.add(i);
      }
    }
    matches.sort((a, b) => debts[a].studentId.compareTo(debts[b].studentId));
    if (matches.isEmpty) {
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
    allocated[matches.first] = paymentKobo;
    return _result(
      paymentKobo: paymentKobo,
      applied: paymentKobo,
      credit: 0,
      totalDebt: totalDebt,
      debts: debts,
      allocated: allocated,
    );
  }

  static ParentAllocationResult _result({
    required int paymentKobo,
    required int applied,
    required int credit,
    required int totalDebt,
    required List<({int studentId, int kobo})> debts,
    required List<int> allocated,
  }) {
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
