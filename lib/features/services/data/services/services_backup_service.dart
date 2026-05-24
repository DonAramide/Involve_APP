import 'dart:convert';
import 'package:drift/drift.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:share_plus/share_plus.dart';
import 'package:intl/intl.dart';

class ServicesBackupService {
  final AppDatabase db;

  ServicesBackupService({required this.db});

  Future<void> exportToJson() async {
    final customers = await db.select(db.customers).get();
    final jobs = await db.select(db.serviceJobs).get();
    final payments = await db.select(db.servicePayments).get();

    final data = {
      'export_date': DateTime.now().toIso8601String(),
      'customers': customers.map((c) => {
        'id': c.id,
        'name': c.name,
        'phone': c.phone,
        'email': c.email,
        'createdAt': c.createdAt.toIso8601String(),
      }).toList(),
      'jobs': jobs.map((j) => {
        'id': j.id,
        'jobId': j.jobId,
        'customerId': j.customerId,
        'title': j.title,
        'description': j.description,
        'totalAmount': j.totalAmount,
        'amountPaid': j.amountPaid,
        'balance': j.balance,
        'status': j.status,
        'dueDate': j.dueDate?.toIso8601String(),
        'createdAt': j.createdAt.toIso8601String(),
      }).toList(),
      'payments': payments.map((p) => {
        'id': p.id,
        'jobId': p.jobId,
        'amount': p.amount,
        'method': p.method,
        'reference': p.reference,
        'createdAt': p.createdAt.toIso8601String(),
      }).toList(),
    };

    final jsonString = const JsonEncoder.withIndent('  ').convert(data);
    
    final timestamp = DateFormat('yyyyMMdd_HHmm').format(DateTime.now());
    final fileName = 'invify_services_backup_$timestamp.json';

    await Share.shareXFiles(
      [XFile.fromData(utf8.encode(jsonString), name: fileName, mimeType: 'application/json')],
      subject: 'Invify Services Backup',
    );
  }
}
