import 'package:flutter/foundation.dart';
import 'package:get_it/get_it.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/core/services/finance_api_client.dart';
import 'package:involve_app/core/utils/app_config.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/features/school/domain/entities/school_entities.dart';
import 'package:involve_app/features/settings/domain/entities/settings.dart';
import 'package:involve_app/features/settings/domain/services/security_service.dart';

class TermBillEmailResult {
  final int sent;
  final int skipped;
  final int failed;
  final int total;
  final String? error;

  const TermBillEmailResult({
    required this.sent,
    required this.skipped,
    required this.failed,
    required this.total,
    this.error,
  });

  bool get hasWork => total > 0;
}

/// Sends each class term bill to that student's parent email (PDF attached).
class TermBillEmailService {
  static FinanceApiClient _client() {
    final sl = GetIt.instance;
    if (!sl.isRegistered<FinanceApiClient>()) {
      sl.registerSingleton<FinanceApiClient>(FinanceApiClient(
        baseUrl: AppConfig.baseUrl,
        getToken: () async => await SecurityService().getOfflineToken(),
        getTenantId: () async => await SecurityService().getTenantId(),
      ));
    }
    return sl<FinanceApiClient>();
  }

  static SchoolParent? parentFor(Student student, List<SchoolParent> parents) {
    if (student.parentId != null) {
      for (final parent in parents) {
        if (parent.id == student.parentId) return parent;
      }
    }
    final key = student.parentKey;
    if (key == '|') return null;
    for (final parent in parents) {
      if (parent.parentKey == key) return parent;
    }
    return null;
  }

  static String? parentEmail(Student student, List<SchoolParent> parents) {
    final parent = parentFor(student, parents);
    final email = (parent?.email ?? '').trim();
    if (email.contains('@') && email.contains('.')) return email;
    return null;
  }

  /// Parent dedicated account first; school bank account if the parent has none.
  static Map<String, String?> payAccountFor({
    required Student student,
    SchoolParent? parent,
    AppSettings? settings,
  }) {
    final parentVa = (parent?.virtualAccountNumber ?? '').trim();
    if (parentVa.isNotEmpty) {
      return {
        'kind': 'parent',
        'accountNumber': parentVa,
        'bankName': (parent?.virtualAccountBank ?? '').trim(),
        'accountName': (parent?.virtualAccountName ?? '').trim(),
      };
    }

    ParentVaAccount? listed;
    if (parent != null) {
      for (final va in parent.virtualAccounts) {
        if (va.accountNumber.trim().isEmpty) continue;
        if (va.isCanonical) {
          listed = va;
          break;
        }
        listed ??= va;
      }
    }
    if (listed != null) {
      return {
        'kind': 'parent',
        'accountNumber': listed.accountNumber.trim(),
        'bankName': (listed.bankName ?? parent?.virtualAccountBank ?? '').trim(),
        'accountName': (listed.accountName ?? parent?.virtualAccountName ?? '').trim(),
      };
    }

    final studentVa = (student.virtualAccountNumber ?? '').trim();
    if (studentVa.isNotEmpty) {
      return {
        'kind': 'parent',
        'accountNumber': studentVa,
        'bankName': (student.virtualAccountBank ?? '').trim(),
        'accountName': '',
      };
    }

    final schoolAcc = (settings?.accountNumber ?? '').trim();
    if (schoolAcc.isNotEmpty) {
      return {
        'kind': 'school',
        'accountNumber': schoolAcc,
        'bankName': (settings?.bankName ?? '').trim(),
        'accountName': (settings?.accountName ?? '').trim(),
      };
    }

    return {'kind': null, 'accountNumber': null, 'bankName': null, 'accountName': null};
  }

  static Future<TermBillEmailResult> emailClassBills({
    required List<Invoice> invoices,
    required List<Student> students,
    required List<SchoolParent> parents,
    required AppSettings? settings,
    Term? term,
    AcademicYear? year,
    String? className,
  }) async {
    final dateFmt = DateFormat('dd MMM yyyy');
    final dueDate = term?.endDate != null ? dateFmt.format(term!.endDate) : null;
    final issuedAt = dateFmt.format(DateTime.now());
    final schoolName = (settings?.organizationName ?? '').trim().isEmpty
        ? 'School'
        : settings!.organizationName.trim();

    final bills = <Map<String, dynamic>>[];
    for (final invoice in invoices) {
      Student? student;
      for (final candidate in students) {
        if (candidate.id == invoice.studentId) {
          student = candidate;
          break;
        }
      }
      if (student == null) continue;
      final parent = parentFor(student, parents);
      final email = parentEmail(student, parents);
      if (email == null) continue;

      final pay = payAccountFor(student: student, parent: parent, settings: settings);
      final isParentAccount = pay['kind'] == 'parent';
      final isSchoolAccount = pay['kind'] == 'school';

      bills.add({
        'to': email,
        'parentName': parent?.fullName ?? student.parentName,
        'studentName': student.fullName,
        'admissionNumber': student.admissionNumber,
        'className': invoice.className ?? className,
        'invoiceNumber': invoice.invoiceNumber,
        'items': invoice.items
            .map((item) => {
                  'name': item.item.name,
                  'quantity': item.quantity,
                  'amount': item.total,
                })
            .toList(),
        'total': invoice.totalAmount,
        'dueDate': dueDate,
        'issuedAt': issuedAt,
        if (isParentAccount) ...{
          'paymentAccountKind': 'parent',
          'virtualAccountNumber': pay['accountNumber'],
          'virtualAccountBank': pay['bankName'],
          'virtualAccountName': pay['accountName'],
        },
        if (isSchoolAccount) ...{
          'paymentAccountKind': 'school',
          'bankName': pay['bankName'],
          'accountNumber': pay['accountNumber'],
          'accountName': pay['accountName'],
        },
      });
    }

    if (bills.isEmpty) {
      return TermBillEmailResult(
        sent: 0,
        skipped: invoices.length,
        failed: 0,
        total: invoices.length,
      );
    }

    try {
      final response = await _client().post('/api/school/term-bills/email', data: {
        'schoolName': schoolName,
        'schoolAddress': settings?.address,
        'schoolPhone': settings?.phone,
        'schoolEmail': settings?.email,
        'termName': term?.name ?? invoices.first.termName,
        'academicYearName': year?.name ?? invoices.first.academicYearName,
        'bankName': settings?.bankName,
        'accountNumber': settings?.accountNumber,
        'accountName': settings?.accountName,
        'bills': bills,
      });
      final data = response.data is Map ? Map<String, dynamic>.from(response.data as Map) : <String, dynamic>{};
      final emailed = (data['sent'] as num?)?.toInt() ?? 0;
      final failed = (data['failed'] as num?)?.toInt() ?? 0;
      final skippedInRequest = (data['skipped'] as num?)?.toInt() ?? 0;
      final skippedNoPayload = invoices.length - bills.length;
      return TermBillEmailResult(
        sent: emailed,
        skipped: skippedInRequest + skippedNoPayload,
        failed: failed,
        total: invoices.length,
      );
    } catch (e) {
      debugPrint('[TermBillEmail] Failed to send class bills: $e');
      return TermBillEmailResult(
        sent: 0,
        skipped: invoices.length - bills.length,
        failed: bills.length,
        total: invoices.length,
        error: e.toString(),
      );
    }
  }
}
