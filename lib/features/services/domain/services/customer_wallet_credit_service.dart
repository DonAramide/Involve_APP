import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:involve_app/features/services/domain/entities/service_customer.dart';
import 'package:involve_app/features/services/domain/repositories/services_repository.dart';
import 'package:involve_app/features/school/domain/entities/school_entities.dart';
import 'package:involve_app/features/school/domain/repositories/school_repository.dart';
import 'package:involve_app/features/invoicing/domain/repositories/invoice_repository.dart';

/// Applies VA deposit socket events to local customer wallets and school students.
class CustomerWalletCreditService {
  CustomerWalletCreditService._();
  static final CustomerWalletCreditService instance =
      CustomerWalletCreditService._();

  static const String prefsKey = 'customer_fund_ledger';
  static const int maxItems = 500;

  IServicesRepository? _repository;
  SchoolRepository? _schoolRepository;
  InvoiceRepository? _invoiceRepository;
  final StreamController<ServiceCustomer> _credits =
      StreamController<ServiceCustomer>.broadcast();
  final StreamController<Student> _studentCredits =
      StreamController<Student>.broadcast();

  Stream<ServiceCustomer> get onWalletCredited => _credits.stream;
  Stream<Student> get onStudentCredited => _studentCredits.stream;

  void bind(IServicesRepository repository) {
    _repository = repository;
  }

  void bindSchool(SchoolRepository repository) {
    _schoolRepository = repository;
  }

  void bindInvoices(InvoiceRepository repository) {
    _invoiceRepository = repository;
  }

  /// Pay open student bills with [amount]; returns unapplied remainder (credit).
  Future<double> _applyDepositToStudentInvoices({
    required int studentId,
    required double amount,
    required String reference,
  }) async {
    final invoiceRepo = _invoiceRepository;
    if (invoiceRepo == null || amount <= 0) return amount;

    final invoices = await invoiceRepo.getInvoicesByStudentId(studentId);
    final unpaid = invoices
        .where((inv) {
          final owing = inv.totalAmount - inv.amountPaid;
          return owing > 0.001 && inv.paymentStatus != 'Paid';
        })
        .toList()
      ..sort((a, b) {
        // Prefer fee bills, then oldest first.
        final aBill = a.invoiceNumber.startsWith('BILL-') ? 0 : 1;
        final bBill = b.invoiceNumber.startsWith('BILL-') ? 0 : 1;
        if (aBill != bBill) return aBill.compareTo(bBill);
        return a.dateCreated.compareTo(b.dateCreated);
      });

    var remaining = amount;
    for (final inv in unpaid) {
      if (remaining <= 0.001) break;
      final owing = inv.totalAmount - inv.amountPaid;
      final pay = remaining < owing ? remaining : owing;
      final newPaid = inv.amountPaid + pay;
      final newBalance = (owing - pay).clamp(0.0, double.infinity);
      await invoiceRepo.updateInvoice(
        inv.copyWith(
          amountPaid: newPaid,
          balanceAmount: newBalance,
          paymentStatus: newBalance <= 0.001 ? 'Paid' : 'Partial',
          paymentMethod: 'Transfer',
        ),
      );
      remaining -= pay;
      debugPrint(
        '[CustomerWalletCredit] Applied ₦$pay to ${inv.invoiceNumber} '
        '(ref=$reference, left=$remaining)',
      );
    }
    return remaining < 0 ? 0.0 : remaining;
  }

  Future<List<Map<String, dynamic>>> loadLedger() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(prefsKey) ?? '[]';
    try {
      final list = jsonDecode(raw) as List<dynamic>;
      return list
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> _saveLedger(List<Map<String, dynamic>> items) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      prefsKey,
      jsonEncode(items.take(maxItems).toList()),
    );
  }

  Future<List<Map<String, dynamic>>> fundsForCustomer(String customerId) async {
    final all = await loadLedger();
    return all
        .where((e) => e['customerId']?.toString() == customerId)
        .toList();
  }

  Future<bool> hasProcessedReference(String reference) async {
    final ledger = await loadLedger();
    // notify-only entries never updated a local balance — allow a real credit retry
    return ledger.any((e) {
      if (e['reference']?.toString() != reference) return false;
      return e['source']?.toString() != 'catchup_notify_only';
    });
  }

  Future<void> _recordLedgerEntry({
    required String reference,
    required double amount,
    String? customerId,
    String? studentId,
    String? admissionNumber,
    String? senderName,
    Map<String, dynamic>? metadata,
    String? createdAt,
    String source = 'live',
  }) async {
    if (await hasProcessedReference(reference)) return;
    final ledger = await loadLedger();
    ledger.insert(0, {
      'id': reference,
      'reference': reference,
      'amount': amount,
      'type': 'CREDIT',
      'status': 'SUCCESS',
      'createdAt': createdAt ?? DateTime.now().toIso8601String(),
      'source': source,
      'senderName': senderName ?? 'Unknown Sender',
      if (customerId != null) 'customerId': customerId,
      if (studentId != null) 'studentId': studentId,
      if (admissionNumber != null) 'admissionNumber': admissionNumber,
      if (metadata != null) 'metadata': metadata,
    });
    await _saveLedger(ledger);
  }

  /// Record a reference as processed without changing wallet balance
  /// (used by catch-up when no local customer/student VA matched).
  Future<void> markReferenceNotified({
    required String reference,
    required double amount,
    String? senderName,
    Map<String, dynamic>? metadata,
    String? createdAt,
  }) async {
    await _recordLedgerEntry(
      reference: reference,
      amount: amount,
      senderName: senderName,
      metadata: metadata,
      createdAt: createdAt,
      source: 'catchup_notify_only',
    );
  }

  /// Handle payment.success payload from Socket.IO / realtime.
  /// Credits retail customers first; if unmatched, credits school students by VA.
  /// Returns true when a local wallet/student balance was updated.
  Future<bool> applyPaymentSuccess(dynamic data) async {
    try {
      final map = data is Map
          ? Map<String, dynamic>.from(data as Map)
          : <String, dynamic>{};
      final amountRaw = map['amount'];
      final amount = amountRaw is num
          ? amountRaw.toDouble()
          : double.tryParse('$amountRaw') ?? 0;
      if (amount <= 0) return false;

      final reference = (map['reference'] ?? '').toString().trim();
      if (reference.isEmpty) return false;

      if (await hasProcessedReference(reference)) {
        debugPrint('[CustomerWalletCredit] Duplicate ignored: $reference');
        return false;
      }

      Map<String, dynamic> metadata = {};
      final metadataRaw = map['metadata'];
      if (metadataRaw is Map) {
        metadata = Map<String, dynamic>.from(metadataRaw);
      } else if (metadataRaw is String && metadataRaw.isNotEmpty) {
        try {
          final decoded = jsonDecode(metadataRaw);
          if (decoded is Map) metadata = Map<String, dynamic>.from(decoded);
        } catch (_) {}
      }

      final customerId = (map['customerId'] ??
              metadata['customerId'] ??
              metadata['customer_id'])
          ?.toString();
      final studentId = (map['studentId'] ??
              metadata['studentId'] ??
              metadata['student_id'])
          ?.toString();
      final admissionNumber = (metadata['admissionNumber'] ??
              metadata['admission_number'])
          ?.toString();
      final va = (metadata['virtualAccountNumber'] ??
              metadata['accountNumber'] ??
              metadata['virtual_account_number'] ??
              map['virtualAccountNumber'] ??
              map['accountNumber'])
          ?.toString()
          .trim();
      final senderName = (metadata['senderName'] ??
              metadata['studentName'] ??
              'Unknown Sender')
          .toString();
      final senderBank =
          (metadata['senderBank'] ?? metadata['bankName'] ?? '').toString();

      // 1) Retail / service customer wallet
      final repo = _repository;
      if (repo != null) {
        final updated = await repo.creditCustomerWalletFromDeposit(
          amount: amount,
          reference: reference,
          customerId: customerId,
          virtualAccountNumber: va,
          senderName: senderName,
          senderBank: senderBank,
        );

        if (updated != null) {
          _credits.add(updated);
          debugPrint(
            '[CustomerWalletCredit] Credited ${updated.name} ₦$amount '
            '(ref=$reference, balance=${updated.balance})',
          );
          return true;
        }
      } else {
        debugPrint('[CustomerWalletCredit] Services repository not bound yet');
      }

      // 2) School student VA credit — pay open bills first, remainder → creditBalance
      final schoolRepo = _schoolRepository;
      if (schoolRepo != null) {
        Student? matched;
        if (va != null && va.isNotEmpty) {
          matched = await schoolRepo.getStudentByVirtualAccount(va);
        }
        if (matched == null &&
            admissionNumber != null &&
            admissionNumber.trim().isNotEmpty) {
          matched =
              await schoolRepo.getStudentByAdmissionNumber(admissionNumber.trim());
        }
        if (matched == null && studentId != null && studentId.trim().isNotEmpty) {
          final key = studentId.trim();
          if (key.startsWith('stu-')) {
            matched = await schoolRepo.getStudentByAdmissionNumber(key.substring(4));
          } else {
            matched = await schoolRepo.getStudentByAdmissionNumber(key);
          }
        }

        Student? student;
        if (matched?.id != null) {
          // Bills drive the red "Balance" on the Students list — update them first.
          final leftover = await _applyDepositToStudentInvoices(
            studentId: matched!.id!,
            amount: amount,
            reference: reference,
          );

          double invoiceDebt = 0;
          final invoiceRepo = _invoiceRepository;
          if (invoiceRepo != null) {
            final invoices =
                await invoiceRepo.getInvoicesByStudentId(matched.id!);
            invoiceDebt = invoices.fold<double>(0, (sum, inv) {
              final owing = inv.totalAmount - inv.amountPaid;
              return sum + (owing > 0 ? owing : 0);
            });
          } else {
            // Fallback: old path against students.balance only
            student = await schoolRepo.creditStudentFromDeposit(
              amount: amount,
              reference: reference,
              virtualAccountNumber: va,
              admissionNumber: admissionNumber,
              studentKey: studentId,
            );
          }

          if (student == null) {
            student = matched.copyWith(
              balance: invoiceDebt,
              creditBalance: matched.creditBalance + leftover,
            );
            await schoolRepo.updateStudent(student);
          }
        } else {
          student = await schoolRepo.creditStudentFromDeposit(
            amount: amount,
            reference: reference,
            virtualAccountNumber: va,
            admissionNumber: admissionNumber,
            studentKey: studentId,
          );
        }

        if (student != null) {
          // Drop any prior notify-only stub so a real credit can be recorded.
          final ledger = await loadLedger();
          ledger.removeWhere(
            (e) =>
                e['reference']?.toString() == reference &&
                e['source']?.toString() == 'catchup_notify_only',
          );
          await _saveLedger(ledger);

          await _recordLedgerEntry(
            reference: reference,
            amount: amount,
            studentId: student.id?.toString(),
            admissionNumber: student.admissionNumber,
            customerId: customerId,
            senderName: senderName,
            metadata: {
              ...metadata,
              'studentName': student.fullName,
              'admissionNumber': student.admissionNumber,
            },
            source: 'student_wallet',
          );
          _studentCredits.add(student);
          debugPrint(
            '[CustomerWalletCredit] Credited student ${student.fullName} ₦$amount '
            '(balance=${student.balance}, credit=${student.creditBalance}, ref=$reference)',
          );
          return true;
        }
      } else {
        debugPrint('[CustomerWalletCredit] School repository not bound yet');
      }

      return false;
    } catch (e, st) {
      debugPrint('[CustomerWalletCredit] apply failed: $e\n$st');
      return false;
    }
  }
}
