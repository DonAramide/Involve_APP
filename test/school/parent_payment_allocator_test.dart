import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/features/school/domain/services/parent_payment_allocator.dart';

void main() {
  group('ParentPaymentAllocator', () {
    test('single student partial payment', () {
      final result = ParentPaymentAllocator.allocate(
        paymentNaira: 50,
        children: const [
          ChildOutstanding(studentId: 1, outstandingNaira: 100),
        ],
      );
      expect(result.appliedKobo, 5000);
      expect(result.creditKobo, 0);
      expect(result.allocations.single.allocatedKobo, 5000);
      expect(result.allocations.single.outstandingAfterKobo, 5000);
      expect(result.parentOutstandingAfterKobo, 5000);
    });

    test('three children 20+30+50 pay 50 → 10+15+25', () {
      final result = ParentPaymentAllocator.allocate(
        paymentNaira: 50,
        children: const [
          ChildOutstanding(studentId: 1, outstandingNaira: 20),
          ChildOutstanding(studentId: 2, outstandingNaira: 30),
          ChildOutstanding(studentId: 3, outstandingNaira: 50),
        ],
      );
      expect(result.parentOutstandingBeforeKobo, 10000);
      expect(result.appliedKobo, 5000);
      expect(result.creditKobo, 0);
      expect(
        result.allocations.map((a) => a.allocatedKobo).toList(),
        [1000, 1500, 2500],
      );
      expect(
        result.allocations.fold<int>(0, (s, a) => s + a.allocatedKobo),
        result.appliedKobo,
      );
      expect(
        result.allocations.map((a) => a.outstandingAfterKobo).toList(),
        [1000, 1500, 2500],
      );
      expect(result.parentOutstandingAfterKobo, 5000);
    });

    test('full payment clears all children', () {
      final result = ParentPaymentAllocator.allocate(
        paymentNaira: 100,
        children: const [
          ChildOutstanding(studentId: 1, outstandingNaira: 20),
          ChildOutstanding(studentId: 2, outstandingNaira: 30),
          ChildOutstanding(studentId: 3, outstandingNaira: 50),
        ],
      );
      expect(result.appliedKobo, 10000);
      expect(result.creditKobo, 0);
      expect(
        result.allocations.every((a) => a.outstandingAfterKobo == 0),
        isTrue,
      );
      expect(result.parentOutstandingAfterKobo, 0);
    });

    test('decimal amounts reconcile exactly', () {
      final result = ParentPaymentAllocator.allocate(
        paymentNaira: 10,
        children: const [
          ChildOutstanding(studentId: 1, outstandingNaira: 10.01),
          ChildOutstanding(studentId: 2, outstandingNaira: 10.01),
          ChildOutstanding(studentId: 3, outstandingNaira: 10.01),
        ],
      );
      expect(
        result.allocations.fold<int>(0, (s, a) => s + a.allocatedKobo),
        result.appliedKobo,
      );
      expect(result.appliedKobo, 1000);
      expect(result.creditKobo, 0);
    });

    test('overpayment clears debt and stores parent credit', () {
      final result = ParentPaymentAllocator.allocate(
        paymentNaira: 150,
        children: const [
          ChildOutstanding(studentId: 1, outstandingNaira: 20),
          ChildOutstanding(studentId: 2, outstandingNaira: 30),
          ChildOutstanding(studentId: 3, outstandingNaira: 50),
        ],
      );
      expect(result.appliedKobo, 10000);
      expect(result.creditKobo, 5000);
      expect(
        result.allocations.every((a) => a.outstandingAfterKobo == 0),
        isTrue,
      );
      expect(result.parentOutstandingAfterKobo, 0);
    });

    test('zero outstanding sends entire payment to parent credit', () {
      final result = ParentPaymentAllocator.allocate(
        paymentNaira: 40,
        children: const [
          ChildOutstanding(studentId: 1, outstandingNaira: 0),
          ChildOutstanding(studentId: 2, outstandingNaira: 0),
        ],
      );
      expect(result.appliedKobo, 0);
      expect(result.creditKobo, 4000);
      expect(result.parentOutstandingAfterKobo, 0);
    });

    test('lowest to highest clears smallest debts first', () {
      final result = ParentPaymentAllocator.allocate(
        paymentNaira: 50,
        children: const [
          ChildOutstanding(studentId: 1, outstandingNaira: 20),
          ChildOutstanding(studentId: 2, outstandingNaira: 30),
          ChildOutstanding(studentId: 3, outstandingNaira: 50),
        ],
        mode: ParentPaymentShareMode.lowestToHighest,
      );
      expect(result.appliedKobo, 5000);
      expect(result.creditKobo, 0);
      expect(
        result.allocations.map((a) => a.allocatedKobo).toList(),
        [2000, 3000, 0],
      );
    });

    test('highest to lowest clears largest debts first', () {
      final result = ParentPaymentAllocator.allocate(
        paymentNaira: 50,
        children: const [
          ChildOutstanding(studentId: 1, outstandingNaira: 20),
          ChildOutstanding(studentId: 2, outstandingNaira: 30),
          ChildOutstanding(studentId: 3, outstandingNaira: 50),
        ],
        mode: ParentPaymentShareMode.highestToLowest,
      );
      expect(
        result.allocations.map((a) => a.allocatedKobo).toList(),
        [0, 0, 5000],
      );
    });

    test('first match applies to the child whose outstanding equals payment', () {
      final result = ParentPaymentAllocator.allocate(
        paymentNaira: 30,
        children: const [
          ChildOutstanding(studentId: 1, outstandingNaira: 20),
          ChildOutstanding(studentId: 2, outstandingNaira: 30),
          ChildOutstanding(studentId: 3, outstandingNaira: 50),
        ],
        mode: ParentPaymentShareMode.firstMatchAmount,
      );
      expect(result.appliedKobo, 3000);
      expect(result.creditKobo, 0);
      expect(
        result.allocations.map((a) => a.allocatedKobo).toList(),
        [0, 3000, 0],
      );
    });

    test('first match with no equal outstanding keeps parent credit', () {
      final result = ParentPaymentAllocator.allocate(
        paymentNaira: 40,
        children: const [
          ChildOutstanding(studentId: 1, outstandingNaira: 20),
          ChildOutstanding(studentId: 2, outstandingNaira: 30),
        ],
        mode: ParentPaymentShareMode.firstMatchAmount,
      );
      expect(result.appliedKobo, 0);
      expect(result.creditKobo, 4000);
      expect(result.parentOutstandingAfterKobo, 5000);
    });

    test('management decide parks the full payment as parent credit', () {
      final result = ParentPaymentAllocator.allocate(
        paymentNaira: 80,
        children: const [
          ChildOutstanding(studentId: 1, outstandingNaira: 20),
          ChildOutstanding(studentId: 2, outstandingNaira: 30),
        ],
        mode: ParentPaymentShareMode.managementDecide,
      );
      expect(result.appliedKobo, 0);
      expect(result.creditKobo, 8000);
      expect(result.parentOutstandingAfterKobo, 5000);
      expect(
        result.allocations.every((a) => a.allocatedKobo == 0),
        isTrue,
      );
    });
  });
}
