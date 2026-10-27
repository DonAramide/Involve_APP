import 'dart:convert';
import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import '../../domain/entities/service_job.dart';
import '../../domain/entities/service_payment.dart';
import '../../domain/entities/service_customer.dart';
import '../../domain/entities/service_analytics.dart';
import '../../domain/entities/service_material.dart';
import '../../domain/entities/service_description_format.dart';
import '../../domain/repositories/services_repository.dart';
import '../../presentation/utils/job_staff_store.dart';

class ServicesRepositoryImpl implements IServicesRepository {
  final AppDatabase db;
  final _uuid = const Uuid();

  ServicesRepositoryImpl({required this.db});

  @override
  Future<List<ServiceJob>> getJobs({String? status, String? query}) async {
    await _normalizePaidJobs();
    final joinedQuery = db.select(db.serviceJobs).join([
      leftOuterJoin(db.customers, db.customers.id.equalsExp(db.serviceJobs.customerId)),
    ]);

    if (status != null) {
      joinedQuery.where(db.serviceJobs.status.equals(status));
    }
    
    if (query != null && query.isNotEmpty) {
      joinedQuery.where(db.customers.name.like('%$query%') | db.serviceJobs.jobId.like('%$query%'));
    }

    final results = await joinedQuery.get();
    return Future.wait(results.map((row) async {
      final job = row.readTable(db.serviceJobs);
      final customer = row.readTableOrNull(db.customers);
      final assignment = await JobStaffStore.getAssignment(job.id) ??
          await JobStaffStore.getAssignment(job.jobId);
      return _mapJob(
        job,
        customerName: customer?.name,
        staffId: assignment?.staffId,
        staffName: assignment?.staffName,
      );
    }));
  }

  @override
  Future<ServiceJob> getJobById(String id) async {
    await _normalizePaidJobs(jobId: id);
    final row = await (db.select(db.serviceJobs).join([
      leftOuterJoin(db.customers, db.customers.id.equalsExp(db.serviceJobs.customerId)),
    ])..where(db.serviceJobs.id.equals(id))).getSingle();

    final jobTable = row.readTable(db.serviceJobs);
    final customerTable = row.readTableOrNull(db.customers);

    // Fetch items
    final itemRows = await (db.select(db.serviceJobItems)..where((t) => t.jobId.equals(id))).get();
    final items = itemRows.map((r) => ServiceJobItem(
      id: r.id,
      name: r.name,
      category: r.category,
      price: r.price,
      quantity: r.quantity,
    )).toList();

    final assignment = await JobStaffStore.getAssignment(id) ??
        await JobStaffStore.getAssignment(jobTable.jobId);

    return _mapJob(
      jobTable,
      customerName: customerTable?.name,
      items: items,
      staffId: assignment?.staffId,
      staffName: assignment?.staffName,
    );
  }

  @override
  Future<void> createJob({
    required String customerId,
    required String title,
    String? description,
    required double totalAmount,
    double laborAmount = 0.0,
    List<ServiceJobItem>? items,
    DateTime? dueDate,
    Uint8List? image,
    String? warrantyDuration,
  }) async {
    final id = _uuid.v4();
    final counter = await _getNextJobCounter();
    final String formattedJobId = 'INV-SRV-${counter.toString().padLeft(4, '0')}';

    await db.transaction(() async {
      // 1. Insert Job
      await db.into(db.serviceJobs).insert(ServiceJobsCompanion.insert(
        id: id,
        jobId: formattedJobId,
        customerId: customerId,
        title: title,
        description: Value(description),
        totalAmount: totalAmount,
        laborAmount: Value(laborAmount),
        balance: totalAmount,
        dueDate: Value(dueDate),
        image: Value(image),
        createdAt: Value(DateTime.now()),
        warrantyDuration: Value(warrantyDuration),
      ));

      // 2. Insert Items if any
      if (items != null && items.isNotEmpty) {
        for (var item in items) {
          await db.into(db.serviceJobItems).insert(ServiceJobItemsCompanion.insert(
            jobId: id,
            name: item.name,
            category: Value(item.category),
            price: item.price,
            quantity: item.quantity,
          ));
        }
      }
    });

    final latestStaff = await JobStaffStore.getLatestStaff();
    if (latestStaff != null) {
      await JobStaffStore.assignStaff(id, latestStaff.staffId, latestStaff.staffName);
      await JobStaffStore.assignStaff(formattedJobId, latestStaff.staffId, latestStaff.staffName);
    }
  }

  bool _isWalletPaymentMethod(String method) =>
      method == 'Customer Wallet' || method == 'Wallet';

  /// Credit available for wallet pay = abs(negative balance). Owing (positive) = 0 credit.
  double _walletCreditFromBalance(double balance) =>
      balance < 0 ? -balance : 0.0;

  double _outstandingOnJob(ServiceJobTable job) {
    final remaining = job.totalAmount - job.amountPaid;
    return remaining > 0 ? remaining : 0.0;
  }

  /// Close open jobs once the cost is covered. Does not reopen delivered/cancelled.
  String? _paidOffStatus(String current) {
    switch (current.trim().toLowerCase()) {
      case 'cancelled':
      case 'delivered':
      case 'ready':
        return null;
      default:
        return 'ready';
    }
  }

  Future<Map<String, dynamic>?> _creditCustomerWalletTx({
    required String customerId,
    required double amount,
    required String reference,
    required String source,
    String? jobId,
  }) async {
    if (amount <= 1e-9) return null;
    final customer = await (db.select(db.customers)
          ..where((t) => t.id.equals(customerId)))
        .getSingleOrNull();
    if (customer == null) return null;

    final balanceBefore = customer.balance;
    final balanceAfter = balanceBefore - amount;
    await db.customUpdate(
      'UPDATE customers SET balance = balance - ?, sync_status = ? WHERE id = ?',
      variables: [
        Variable.withReal(amount),
        Variable.withString('pending'),
        Variable.withString(customer.id),
      ],
      updates: {db.customers},
    );

    return {
      'id': _uuid.v4(),
      'customerId': customer.id,
      'customerName': customer.name,
      'amount': amount,
      'type': 'CREDIT',
      'reference': reference,
      'status': 'SUCCESS',
      'createdAt': DateTime.now().toIso8601String(),
      'source': source,
      'jobId': jobId,
      'balanceBefore': balanceBefore,
      'balanceAfter': balanceAfter,
    };
  }

  bool _jobNeedsPaymentNormalize(ServiceJobTable job) {
    if (job.status.toLowerCase() == 'cancelled') return false;
    if (job.amountPaid > job.totalAmount + 1e-9) return true;
    if (job.balance < -1e-9) return true;
    final fullyPaid = job.amountPaid + 1e-9 >= job.totalAmount;
    if (!fullyPaid) return false;
    final status = job.status.toLowerCase();
    return status == 'pending' || status == 'in_progress';
  }

  Future<Map<String, dynamic>?> _normalizeOnePaidJob(ServiceJobTable job) async {
    if (!_jobNeedsPaymentNormalize(job)) return null;

    final excess = job.amountPaid - job.totalAmount;
    final cappedPaid =
        job.amountPaid > job.totalAmount ? job.totalAmount : job.amountPaid;
    final nextStatus = _paidOffStatus(job.status);

    await (db.update(db.serviceJobs)..where((t) => t.id.equals(job.id))).write(
      ServiceJobsCompanion(
        amountPaid: Value(cappedPaid),
        balance: const Value(0.0),
        status: Value(nextStatus ?? job.status),
        syncStatus: const Value('pending'),
      ),
    );

    if (excess <= 1e-9 || job.customerId.isEmpty) return null;
    return _creditCustomerWalletTx(
      customerId: job.customerId,
      amount: excess,
      reference: 'JOB-OVERPAY-SETTLE-${job.id}',
      source: 'job_overpayment',
      jobId: job.id,
    );
  }

  /// Caps overpaid jobs, moves excess to the customer wallet, and closes paid jobs.
  Future<void> _normalizePaidJobs({String? jobId}) async {
    final ledgerEntries = <Map<String, dynamic>>[];

    await db.transaction(() async {
      final jobs = jobId != null
          ? await (db.select(db.serviceJobs)..where((t) => t.id.equals(jobId)))
              .get()
          : await db.select(db.serviceJobs).get();

      for (final job in jobs) {
        final entry = await _normalizeOnePaidJob(job);
        if (entry != null) ledgerEntries.add(entry);
      }
    });

    if (ledgerEntries.isEmpty) return;
    final ledger = await _loadFundLedger();
    for (final entry in ledgerEntries) {
      final ref = entry['reference']?.toString();
      if (ref != null &&
          ledger.any((e) => e['reference']?.toString() == ref)) {
        continue;
      }
      ledger.insert(0, entry);
    }
    await _saveFundLedger(ledger);
  }

  @override
  Future<void> addPayment({
    required String jobId,
    required double amount,
    required String method,
    String? reference,
  }) async {
    if (amount <= 1e-9) {
      throw Exception('Enter a payment amount greater than zero.');
    }

    final ledgerEntries = <Map<String, dynamic>>[];

    await db.transaction(() async {
      final job =
          await (db.select(db.serviceJobs)..where((t) => t.id.equals(jobId)))
              .getSingle();
      if (job.status.toLowerCase() == 'cancelled') {
        throw Exception('This job was cancelled. Payment cannot be recorded.');
      }

      final remaining = _outstandingOnJob(job);
      if (remaining <= 1e-9) {
        throw Exception(
            'This job is already paid in full. Extra funds cannot be added to the job.');
      }

      var tendered = amount;
      final isWallet = _isWalletPaymentMethod(method);
      if (isWallet && tendered > remaining + 1e-9) {
        throw Exception(
            'Customer Wallet can only cover the outstanding ₦${remaining.toStringAsFixed(2)}. '
            'Use cash, POS, or transfer so extra funds can go to the customer wallet.');
      }

      final appliedToJob = tendered < remaining ? tendered : remaining;
      final excess = tendered - appliedToJob;

      if (excess > 1e-9 && job.customerId.isEmpty) {
        throw Exception(
            'This payment is more than the outstanding ₦${remaining.toStringAsFixed(2)}. '
            'Assign a customer so the extra can go to their wallet, or enter the outstanding amount.');
      }

      if (isWallet) {
        if (job.customerId.isEmpty) {
          throw Exception(
              'Customer Wallet payment requires a customer on this job.');
        }
        final customer = await (db.select(db.customers)
              ..where((t) => t.id.equals(job.customerId)))
            .getSingleOrNull();
        if (customer == null) {
          throw Exception('Selected customer was not found.');
        }
        final availableCredit = _walletCreditFromBalance(customer.balance);
        if (availableCredit + 1e-9 < appliedToJob) {
          throw Exception(
              'Insufficient wallet credit. Available: ₦${availableCredit.toStringAsFixed(2)}, '
              'Payment: ₦${appliedToJob.toStringAsFixed(2)}.');
        }

        final balanceBefore = customer.balance;
        final balanceAfter = balanceBefore + appliedToJob;
        await db.customUpdate(
          'UPDATE customers SET balance = balance + ?, sync_status = ? WHERE id = ?',
          variables: [
            Variable.withReal(appliedToJob),
            Variable.withString('pending'),
            Variable.withString(customer.id),
          ],
          updates: {db.customers},
        );

        ledgerEntries.add({
          'id': _uuid.v4(),
          'customerId': customer.id,
          'customerName': customer.name,
          'amount': appliedToJob,
          'type': 'DEBIT',
          'reference': reference ?? 'JOB-$jobId',
          'status': 'SUCCESS',
          'createdAt': DateTime.now().toIso8601String(),
          'source': 'service_payment',
          'jobId': jobId,
          'balanceBefore': balanceBefore,
          'balanceAfter': balanceAfter,
        });
      }

      await db.into(db.servicePayments).insert(ServicePaymentsCompanion.insert(
        id: _uuid.v4(),
        jobId: jobId,
        amount: tendered,
        method: method,
        reference: Value(reference),
        createdAt: Value(DateTime.now()),
      ));

      final newPaid = job.amountPaid + appliedToJob;
      final newBalance = job.totalAmount - newPaid;
      final closedStatus = newBalance <= 1e-9 ? _paidOffStatus(job.status) : null;

      await (db.update(db.serviceJobs)..where((t) => t.id.equals(jobId))).write(
        ServiceJobsCompanion(
          amountPaid: Value(newPaid),
          balance: Value(newBalance < 0 ? 0.0 : newBalance),
          status: closedStatus != null ? Value(closedStatus) : const Value.absent(),
          syncStatus: const Value('pending'),
        ),
      );

      if (excess > 1e-9) {
        final credit = await _creditCustomerWalletTx(
          customerId: job.customerId,
          amount: excess,
          reference: reference ?? 'JOB-OVERPAY-$jobId-${DateTime.now().millisecondsSinceEpoch}',
          source: 'job_overpayment',
          jobId: jobId,
        );
        if (credit == null) {
          throw Exception(
              'Could not credit the extra ₦${excess.toStringAsFixed(2)} to the customer wallet.');
        }
        ledgerEntries.add(credit);
      }
    });

    if (ledgerEntries.isEmpty) return;
    final ledger = await _loadFundLedger();
    for (final entry in ledgerEntries) {
      ledger.insert(0, entry);
    }
    await _saveFundLedger(ledger);
  }

  @override
  Future<void> updateJobStatus(String id, String status) async {
    final job = await (db.select(db.serviceJobs)..where((t) => t.id.equals(id))).getSingle();
    final current = job.status.toLowerCase();
    final next = status.trim().toLowerCase();

    if (current == 'cancelled' && next != 'cancelled') {
      throw Exception('A cancelled job cannot be reopened.');
    }

    if (next == 'cancelled') {
      if (job.amountPaid > 1e-9) {
        throw Exception(
          'This job has a payment recorded. Reverse or refund the payment before cancelling.',
        );
      }
      await (db.update(db.serviceJobs)..where((t) => t.id.equals(id))).write(
        ServiceJobsCompanion(
          status: const Value('cancelled'),
          balance: const Value(0.0),
        ),
      );
      return;
    }

    await (db.update(db.serviceJobs)..where((t) => t.id.equals(id))).write(
      ServiceJobsCompanion(
        status: Value(status),
      ),
    );
  }

  @override
  Future<List<ServiceCustomer>> getCustomers({String? query}) async {
    final queryBuilder = db.select(db.customers);
    if (query != null && query.trim().isNotEmpty) {
      final clean = query.trim();
      queryBuilder.where((t) => t.name.like('%$clean%') | t.phone.like('%$clean%'));
    }
    final results = await queryBuilder.get();
    return results.map((row) => _mapCustomer(row)).toList();
  }

  @override
  Future<ServiceCustomer?> getCustomerById(String id) async {
    final row = await (db.select(db.customers)..where((t) => t.id.equals(id)))
        .getSingleOrNull();
    if (row == null) return null;
    return _mapCustomer(row);
  }

  @override
  Future<ServiceCustomer?> getCustomerByPhone(String phone) async {
    final clean = phone.trim();
    if (clean.isEmpty) return null;
    final digits = clean.replaceAll(RegExp(r'\D'), '');

    final all = await (db.select(db.customers)..where((t) => t.phone.isNotNull())).get();
    for (final row in all) {
      final rowPhone = (row.phone ?? '').trim();
      if (rowPhone.isEmpty) continue;
      if (rowPhone.toLowerCase() == clean.toLowerCase()) {
        return _mapCustomer(row);
      }
      final rowDigits = rowPhone.replaceAll(RegExp(r'\D'), '');
      if (rowDigits.isNotEmpty && digits.isNotEmpty) {
        if (rowDigits == digits) {
          return _mapCustomer(row);
        }
        if (rowDigits.length >= 10 && digits.length >= 10) {
          final rowSuffix = rowDigits.substring(rowDigits.length - 10);
          final digitsSuffix = digits.substring(digits.length - 10);
          if (rowSuffix == digitsSuffix) {
            return _mapCustomer(row);
          }
        }
      }
    }
    return null;
  }

  @override
  Future<ServiceCustomer?> getCustomerByVirtualAccount(String accountNumber) async {
    final va = accountNumber.trim();
    if (va.isEmpty) return null;
    final row = await (db.select(db.customers)
          ..where((t) => t.virtualAccountNumber.equals(va)))
        .getSingleOrNull();
    if (row == null) return null;
    return _mapCustomer(row);
  }

  static const String _fundLedgerPrefsKey = 'customer_fund_ledger';

  Future<List<Map<String, dynamic>>> _loadFundLedger() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_fundLedgerPrefsKey) ?? '[]';
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

  Future<void> _saveFundLedger(List<Map<String, dynamic>> items) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _fundLedgerPrefsKey,
      jsonEncode(items.take(500).toList()),
    );
  }

  @override
  Future<List<Map<String, dynamic>>> getCustomerFundTransactions(
      String customerId) async {
    final all = await _loadFundLedger();
    return all
        .where((e) => e['customerId']?.toString() == customerId)
        .toList();
  }

  @override
  Future<ServiceCustomer?> creditCustomerWalletFromDeposit({
    required double amount,
    required String reference,
    String? customerId,
    String? virtualAccountNumber,
    String? senderName,
    String? senderBank,
    String? createdAt,
  }) async {
    if (amount <= 0 || reference.trim().isEmpty) return null;

    final ledger = await _loadFundLedger();
    if (ledger.any((e) => e['reference']?.toString() == reference)) {
      debugPrint('[ServicesRepo] Duplicate VA credit ignored: $reference');
      return null;
    }

    ServiceCustomer? customer;
    if (customerId != null && customerId.isNotEmpty) {
      customer = await getCustomerById(customerId);
    }
    if (customer == null &&
        virtualAccountNumber != null &&
        virtualAccountNumber.trim().isNotEmpty) {
      customer = await getCustomerByVirtualAccount(virtualAccountNumber.trim());
    }
    if (customer == null) return null;

    final balanceBefore = customer.balance;
    // Auto-debit: reduce owing first; remainder becomes wallet credit.
    final owingBefore = balanceBefore > 0 ? balanceBefore : 0.0;
    final appliedToDebt =
        owingBefore > 0 ? (amount < owingBefore ? amount : owingBefore) : 0.0;
    final remainingAsCredit = amount - appliedToDebt;
    final balanceAfter = balanceBefore - amount;

    await db.customUpdate(
      'UPDATE customers SET balance = balance - ?, sync_status = ? WHERE id = ?',
      variables: [
        Variable.withReal(amount),
        Variable.withString('pending'),
        Variable.withString(customer.id),
      ],
      updates: {db.customers},
    );

    final entry = {
      'id': const Uuid().v4(),
      'customerId': customer.id,
      'customerName': customer.name,
      'amount': amount,
      'type': 'CREDIT',
      'reference': reference,
      'virtualAccountNumber':
          virtualAccountNumber ?? customer.virtualAccountNumber,
      'senderName': senderName ?? 'Unknown Sender',
      'senderBank': senderBank ?? '',
      'status': 'SUCCESS',
      'createdAt': createdAt ?? DateTime.now().toIso8601String(),
      'source': 'va_deposit',
      'balanceBefore': balanceBefore,
      'balanceAfter': balanceAfter,
      'appliedToDebt': appliedToDebt,
      'remainingAsCredit': remainingAsCredit,
      'autoDebit': appliedToDebt > 0,
    };
    ledger.insert(0, entry);
    await _saveFundLedger(ledger);

    return getCustomerById(customer.id);
  }

  @override
  Future<ServiceCustomer> createCustomer({
    required String name,
    String? phone,
    String? email,
    String? address,
    Uint8List? image,
  }) async {
    final trimmedPhone = phone?.trim();
    if (trimmedPhone != null && trimmedPhone.isNotEmpty) {
      final existing = await getCustomerByPhone(trimmedPhone);
      if (existing != null) {
        throw Exception('A customer with phone number "$trimmedPhone" already exists (${existing.name}).');
      }
    }

    final id = const Uuid().v4();
    await db.into(db.customers).insert(CustomersCompanion.insert(
      id: id,
      name: name.trim(),
      phone: Value(trimmedPhone),
      email: Value(email?.trim()),
      address: Value(address?.trim()),
      image: Value(image),
      createdAt: Value(DateTime.now()),
    ));
    
    final row = await (db.select(db.customers)..where((t) => t.id.equals(id))).getSingle();
    return _mapCustomer(row);
  }

  @override
  Future<ServiceCustomer> ensureWalkInCustomer() async {
    final rows = await db.select(db.customers).get();
    for (final row in rows) {
      if (ServiceCustomer.isWalkInName(row.name)) {
        return _mapCustomer(row);
      }
    }
    return createCustomer(name: ServiceCustomer.walkInName);
  }

  @override
  Future<void> updateCustomerVirtualAccount(String customerId, String accountNumber, String bankName, {String? accountName}) async {
    await (db.update(db.customers)..where((t) => t.id.equals(customerId))).write(
      CustomersCompanion(
        virtualAccountNumber: Value(accountNumber),
        virtualAccountBank: Value(bankName),
        virtualAccountName: accountName != null ? Value(accountName) : const Value.absent(),
        syncStatus: const Value('pending'),
      ),
    );
  }

  @override
  Future<void> updateCustomerBasicInfo({
    required String id,
    String? name,
    String? phone,
    String? email,
    String? address,
  }) async {
    final trimmedPhone = phone?.trim();
    if (trimmedPhone != null && trimmedPhone.isNotEmpty) {
      final existing = await getCustomerByPhone(trimmedPhone);
      if (existing != null && existing.id != id) {
        throw Exception('A customer with phone number "$trimmedPhone" already exists (${existing.name}).');
      }
    }

    await (db.update(db.customers)..where((t) => t.id.equals(id))).write(
      CustomersCompanion(
        name: name != null ? Value(name.trim()) : const Value.absent(),
        phone: trimmedPhone != null ? Value(trimmedPhone) : const Value.absent(),
        email: email != null ? Value(email?.trim()) : const Value.absent(),
        address: address != null ? Value(address?.trim()) : const Value.absent(),
        syncStatus: const Value('pending'),
      ),
    );
  }

  @override
  Future<List<ServicePayment>> getJobPayments(String jobId) async {
    final results = await (db.select(db.servicePayments)
          ..where((t) => t.jobId.equals(jobId))
          ..orderBy([(t) => OrderingTerm(expression: t.createdAt, mode: OrderingMode.desc)]))
        .get();
    return results.map(_mapPayment).toList();
  }

  @override
  Future<List<String>> getJobPresets() async {
    final rows = await db.select(db.serviceJobPresets).get();
    return rows.map((r) => r.name).toList();
  }

  @override
  Future<void> addJobPreset(String name) async {
    await db.into(db.serviceJobPresets).insert(
      ServiceJobPresetsCompanion.insert(name: name),
      mode: InsertMode.insertOrReplace,
    );
  }

  @override
  Future<void> deleteJobPreset(String name) async {
    await (db.delete(db.serviceJobPresets)..where((t) => t.name.equals(name))).go();
  }

  // --- Materials ---

  @override
  Future<List<ServiceMaterial>> getMaterials({String? category}) async {
    final query = db.select(db.serviceMaterials);
    if (category != null && category.isNotEmpty) {
      query.where((t) => t.category.equals(category));
    }
    final results = await query.get();
    return results.map<ServiceMaterial>((r) => ServiceMaterial(
      id: r.id,
      name: r.name,
      category: r.category,
      defaultPrice: r.defaultPrice,
      image: r.image,
    )).toList();
  }

  @override
  Future<void> addMaterial({required String name, required String category, required double price, Uint8List? image}) async {
    await db.into(db.serviceMaterials).insert(ServiceMaterialsCompanion.insert(
      name: name,
      category: category,
      defaultPrice: price,
      image: Value(image),
    ));
  }

  @override
  Future<void> updateMaterial({required int id, required String name, required String category, required double price, Uint8List? image}) async {
    await (db.update(db.serviceMaterials)..where((t) => t.id.equals(id))).write(ServiceMaterialsCompanion(
      name: Value(name),
      category: Value(category),
      defaultPrice: Value(price),
      image: Value(image),
    ));
  }

  @override
  Future<void> deleteMaterial(int id) async {
    await (db.delete(db.serviceMaterials)..where((t) => t.id.equals(id))).go();
  }

  @override
  Future<List<String>> getMaterialCategories() async {
    final results = await db.select(db.serviceMaterialCategories).get();
    return results.map((r) => r.name).toList();
  }

  @override
  Future<List<ServiceMaterialCategoryTable>> getFullMaterialCategories() async {
    return await db.select(db.serviceMaterialCategories).get();
  }

  @override
  Future<void> addMaterialCategory(String name) async {
    await db.into(db.serviceMaterialCategories).insert(ServiceMaterialCategoriesCompanion.insert(
      name: name,
    ));
  }

  @override
  Future<void> updateMaterialCategory({required int id, required String name}) async {
    await (db.update(db.serviceMaterialCategories)..where((t) => t.id.equals(id))).write(ServiceMaterialCategoriesCompanion(
      name: Value(name),
    ));
  }

  @override
  Future<void> deleteMaterialCategory(int id) async {
    await (db.delete(db.serviceMaterialCategories)..where((t) => t.id.equals(id))).go();
  }

  // Labor Presets
  @override
  Future<List<ServiceLaborPresetTable>> getLaborPresets() async {
    return await db.select(db.serviceLaborPresets).get();
  }

  @override
  Future<void> addLaborPreset({required String name, required double amount}) async {
    await db.into(db.serviceLaborPresets).insert(ServiceLaborPresetsCompanion.insert(
      name: name,
      amount: amount,
    ));
  }

  @override
  Future<void> updateLaborPreset({required int id, required String name, required double amount}) async {
    await (db.update(db.serviceLaborPresets)..where((t) => t.id.equals(id))).write(
      ServiceLaborPresetsCompanion(
        name: Value(name),
        amount: Value(amount),
      ),
    );
  }

  @override
  Future<void> deleteLaborPreset(int id) async {
    await (db.delete(db.serviceLaborPresets)..where((t) => t.id.equals(id))).go();
  }

  @override
  Future<void> addServiceExpense({required double amount, required String description, required String category}) async {
    await db.into(db.expenses).insert(ExpensesCompanion.insert(
      amount: amount,
      description: description,
      category: Value(category),
      date: Value(DateTime.now()),
    ));
  }

  @override
  Future<List<ServiceExpenseCategoryTable>> getServiceExpenseCategories() async {
    return await db.select(db.serviceExpenseCategories).get();
  }

  @override
  Future<void> addServiceExpenseCategory(String name) async {
    await db.into(db.serviceExpenseCategories).insert(ServiceExpenseCategoriesCompanion.insert(
      name: name,
    ));
  }

  @override
  Future<void> updateServiceExpenseCategory({required int id, required String name}) async {
    await (db.update(db.serviceExpenseCategories)..where((t) => t.id.equals(id))).write(
      ServiceExpenseCategoriesCompanion(
        name: Value(name),
      ),
    );
  }

  @override
  Future<void> deleteServiceExpenseCategory(int id) async {
    await (db.delete(db.serviceExpenseCategories)..where((t) => t.id.equals(id))).go();
  }

  ServiceDescriptionFormatCategory _mapDescriptionCategory(
      ServiceDescriptionFormatCategoryTable row) {
    return ServiceDescriptionFormatCategory(id: row.id, name: row.name);
  }

  ServiceDescriptionFormatField _mapDescriptionField(
      ServiceDescriptionFormatFieldTable row) {
    return ServiceDescriptionFormatField(
      id: row.id,
      categoryId: row.categoryId,
      name: row.name,
      fieldType: row.fieldType,
      sortOrder: row.sortOrder,
    );
  }

  @override
  Future<List<ServiceDescriptionFormatBundle>> getDescriptionFormatBundles() async {
    final categories = await (db.select(db.serviceDescriptionFormatCategories)
          ..orderBy([(t) => OrderingTerm.asc(t.name)]))
        .get();
    final fields = await (db.select(db.serviceDescriptionFormatFields)
          ..orderBy([(t) => OrderingTerm.asc(t.sortOrder)]))
        .get();
    return categories
        .map((c) => ServiceDescriptionFormatBundle(
              category: _mapDescriptionCategory(c),
              fields: fields
                  .where((f) => f.categoryId == c.id)
                  .map(_mapDescriptionField)
                  .toList(),
            ))
        .toList();
  }

  @override
  Future<List<ServiceDescriptionFormatCategory>> getDescriptionFormatCategories() async {
    final rows = await (db.select(db.serviceDescriptionFormatCategories)
          ..orderBy([(t) => OrderingTerm.asc(t.name)]))
        .get();
    return rows.map(_mapDescriptionCategory).toList();
  }

  @override
  Future<ServiceDescriptionFormatCategory> addDescriptionFormatCategory(String name) async {
    final trimmed = name.trim();
    if (trimmed.isEmpty) {
      throw Exception('Please enter a category name.');
    }
    final id = await db.into(db.serviceDescriptionFormatCategories).insert(
          ServiceDescriptionFormatCategoriesCompanion.insert(name: trimmed),
        );
    return ServiceDescriptionFormatCategory(id: id, name: trimmed);
  }

  @override
  Future<void> updateDescriptionFormatCategory({required int id, required String name}) async {
    final trimmed = name.trim();
    if (trimmed.isEmpty) {
      throw Exception('Please enter a category name.');
    }
    await (db.update(db.serviceDescriptionFormatCategories)..where((t) => t.id.equals(id)))
        .write(ServiceDescriptionFormatCategoriesCompanion(name: Value(trimmed)));
  }

  @override
  Future<void> deleteDescriptionFormatCategory(int id) async {
    await (db.delete(db.serviceDescriptionFormatFields)
          ..where((t) => t.categoryId.equals(id)))
        .go();
    await (db.delete(db.serviceDescriptionFormatCategories)..where((t) => t.id.equals(id)))
        .go();
  }

  @override
  Future<List<ServiceDescriptionFormatField>> getDescriptionFormatFields(int categoryId) async {
    final rows = await (db.select(db.serviceDescriptionFormatFields)
          ..where((t) => t.categoryId.equals(categoryId))
          ..orderBy([(t) => OrderingTerm.asc(t.sortOrder)]))
        .get();
    return rows.map(_mapDescriptionField).toList();
  }

  @override
  Future<void> addDescriptionFormatField({
    required int categoryId,
    required String name,
    required String fieldType,
  }) async {
    final trimmed = name.trim();
    if (trimmed.isEmpty) {
      throw Exception('Please enter a format name.');
    }
    final type = DescriptionFieldType.isValid(fieldType)
        ? fieldType
        : DescriptionFieldType.text;
    final existing = await (db.select(db.serviceDescriptionFormatFields)
          ..where((t) => t.categoryId.equals(categoryId)))
        .get();
    final nextOrder = existing.isEmpty
        ? 0
        : existing.map((e) => e.sortOrder).reduce((a, b) => a > b ? a : b) + 1;
    await db.into(db.serviceDescriptionFormatFields).insert(
          ServiceDescriptionFormatFieldsCompanion.insert(
            categoryId: categoryId,
            name: trimmed,
            fieldType: Value(type),
            sortOrder: Value(nextOrder),
          ),
        );
  }

  @override
  Future<void> updateDescriptionFormatField({
    required int id,
    required String name,
    required String fieldType,
  }) async {
    final trimmed = name.trim();
    if (trimmed.isEmpty) {
      throw Exception('Please enter a format name.');
    }
    final type = DescriptionFieldType.isValid(fieldType)
        ? fieldType
        : DescriptionFieldType.text;
    await (db.update(db.serviceDescriptionFormatFields)..where((t) => t.id.equals(id)))
        .write(ServiceDescriptionFormatFieldsCompanion(
          name: Value(trimmed),
          fieldType: Value(type),
        ));
  }

  @override
  Future<void> deleteDescriptionFormatField(int id) async {
    await (db.delete(db.serviceDescriptionFormatFields)..where((t) => t.id.equals(id))).go();
  }

  @override
  Future<ServiceAnalytics> getServicesAnalytics(DateTime start, DateTime end) async {
    // 0. Fetch custom service expense categories
    final srvCats = await db.select(db.serviceExpenseCategories).get();
    final srvCatNames = srvCats.map((c) => c.name).toList();
    if (!srvCatNames.contains('Services')) srvCatNames.add('Services');

    // 1. Fetch all service payments in range
    final payments = await (db.select(db.servicePayments)
          ..where((t) => t.createdAt.isBetweenValues(start, end)))
        .get();
    
    final grossRevenue = payments.fold(0.0, (sum, p) => sum + p.amount);

    // 2. Fetch service-related expenses
    final expenses = await (db.select(db.expenses)
          ..where((t) => t.date.isBetweenValues(start, end))
          ..where((t) => t.category.isIn(srvCatNames)))
        .get();
    
    final totalExpenses = expenses.fold(0.0, (sum, e) => sum + e.amount);

    // 3. Build Expense Breakdown
    final breakdown = <String, double>{};
    for (var e in expenses) {
      final desc = e.description; // Using description as key since category is 'Services'
      breakdown[desc] = (breakdown[desc] ?? 0) + e.amount;
    }

    // 4. Build Revenue Trend (Filling gaps with zero)
    final trendMap = <DateTime, double>{};
    
    // Pre-fill all days in range with 0.0
    var currentDate = DateTime(start.year, start.month, start.day);
    final normalizedEnd = DateTime(end.year, end.month, end.day);
    
    while (currentDate.isBefore(normalizedEnd) || currentDate.isAtSameMomentAs(normalizedEnd)) {
      trendMap[currentDate] = 0.0;
      currentDate = currentDate.add(const Duration(days: 1));
    }

    for (var p in payments) {
      final date = DateTime(p.createdAt.year, p.createdAt.month, p.createdAt.day);
      trendMap[date] = (trendMap[date] ?? 0) + p.amount;
    }
    
    final trend = trendMap.entries
        .map((e) => RevenueDataPoint(e.key, e.value))
        .toList()
      ..sort((a, b) => a.date.compareTo(b.date));

    return ServiceAnalytics(
      grossRevenue: grossRevenue,
      totalExpenses: totalExpenses,
      netProfit: grossRevenue - totalExpenses,
      revenueTrend: trend,
      expenseBreakdown: breakdown,
    );
  }

  // --- Helpers ---

  Future<int> _getNextJobCounter() async {
    const type = 'INV-SRV';
    // Avoid INSERT ... ON CONFLICT (UPSERT): drift_sqflite uses the device
    // SQLite, and Android 9 / API 28 and below ship SQLite < 3.24 which
    // rejects ON CONFLICT DO UPDATE with "near ON: syntax error".
    final existing = await (db.select(db.localCounters)
          ..where((t) => t.type.equals(type)))
        .getSingleOrNull();

    final nextValue = (existing?.lastValue ?? 0) + 1;

    if (existing == null) {
      await db.into(db.localCounters).insert(LocalCountersCompanion.insert(
        type: type,
        lastValue: Value(nextValue),
      ));
    } else {
      await (db.update(db.localCounters)..where((t) => t.type.equals(type)))
          .write(LocalCountersCompanion(lastValue: Value(nextValue)));
    }

    return nextValue;
  }

  ServiceJob _mapJob(
    ServiceJobTable row, {
    String? customerName,
    List<ServiceJobItem> items = const [],
    int? staffId,
    String? staffName,
  }) {
    return ServiceJob(
      id: row.id,
      jobId: row.jobId,
      customerId: row.customerId,
      customerName: customerName,
      title: row.title,
      description: row.description,
      totalAmount: row.totalAmount,
      amountPaid: row.amountPaid,
      laborAmount: row.laborAmount,
      balance: row.balance,
      status: row.status,
      items: items,
      dueDate: row.dueDate,
      image: row.image,
      createdAt: row.createdAt,
      warrantyDuration: row.warrantyDuration,
      staffId: staffId,
      staffName: staffName,
    );
  }

  ServiceCustomer _mapCustomer(CustomerTable row) {
    return ServiceCustomer(
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      image: row.image,
      balance: row.balance,
      virtualAccountNumber: row.virtualAccountNumber,
      virtualAccountName: row.virtualAccountName,
      virtualAccountBank: row.virtualAccountBank,
      createdAt: row.createdAt,
    );
  }

  ServicePayment _mapPayment(ServicePaymentTable row) {
    return ServicePayment(
      id: row.id,
      jobId: row.jobId,
      amount: row.amount,
      method: row.method,
      reference: row.reference,
      createdAt: row.createdAt,
    );
  }
}
