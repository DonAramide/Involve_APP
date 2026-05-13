import 'dart:typed_data';
import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import '../../domain/entities/service_job.dart';
import '../../domain/entities/service_payment.dart';
import '../../domain/entities/service_customer.dart';
import '../../domain/entities/service_analytics.dart';
import '../../domain/entities/service_material.dart';
import '../../domain/repositories/services_repository.dart';

class ServicesRepositoryImpl implements IServicesRepository {
  final AppDatabase db;
  final _uuid = const Uuid();

  ServicesRepositoryImpl({required this.db});

  @override
  Future<List<ServiceJob>> getJobs({String? status, String? query}) async {
    final joinedQuery = db.select(db.serviceJobs).join([
      leftOuterJoin(db.serviceCustomers, db.serviceCustomers.id.equalsExp(db.serviceJobs.customerId)),
    ]);

    if (status != null) {
      joinedQuery.where(db.serviceJobs.status.equals(status));
    }
    
    if (query != null && query.isNotEmpty) {
      joinedQuery.where(db.serviceCustomers.name.like('%$query%') | db.serviceJobs.jobId.like('%$query%'));
    }

    final results = await joinedQuery.get();
    return results.map((row) {
      final job = row.readTable(db.serviceJobs);
      final customer = row.readTableOrNull(db.serviceCustomers);
      return _mapJob(job, customerName: customer?.name);
    }).toList();
  }

  @override
  Future<ServiceJob> getJobById(String id) async {
    final row = await (db.select(db.serviceJobs).join([
      leftOuterJoin(db.serviceCustomers, db.serviceCustomers.id.equalsExp(db.serviceJobs.customerId)),
    ])..where(db.serviceJobs.id.equals(id))).getSingle();

    final jobTable = row.readTable(db.serviceJobs);
    final customerTable = row.readTableOrNull(db.serviceCustomers);

    // Fetch items
    final itemRows = await (db.select(db.serviceJobItems)..where((t) => t.jobId.equals(id))).get();
    final items = itemRows.map((r) => ServiceJobItem(
      id: r.id,
      name: r.name,
      category: r.category,
      price: r.price,
      quantity: r.quantity,
    )).toList();

    return _mapJob(jobTable, customerName: customerTable?.name, items: items);
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
  }

  @override
  Future<void> addPayment({
    required String jobId,
    required double amount,
    required String method,
    String? reference,
  }) async {
    await db.transaction(() async {
      // 1. Create Payment
      await db.into(db.servicePayments).insert(ServicePaymentsCompanion.insert(
        id: _uuid.v4(),
        jobId: jobId,
        amount: amount,
        method: method,
        reference: Value(reference),
        createdAt: Value(DateTime.now()),
      ));

      // 2. Update Job
      final job = await (db.select(db.serviceJobs)..where((t) => t.id.equals(jobId))).getSingle();
      final newPaid = job.amountPaid + amount;
      final newBalance = job.totalAmount - newPaid;

      await (db.update(db.serviceJobs)..where((t) => t.id.equals(jobId))).write(
        ServiceJobsCompanion(
          amountPaid: Value(newPaid),
          balance: Value(newBalance),
        ),
      );
    });
  }

  @override
  Future<void> updateJobStatus(String id, String status) async {
    await (db.update(db.serviceJobs)..where((t) => t.id.equals(id))).write(
      ServiceJobsCompanion(
        status: Value(status),
      ),
    );
  }

  @override
  Future<List<ServiceCustomer>> getCustomers({String? query}) async {
    final queryBuilder = db.select(db.serviceCustomers);
    if (query != null && query.isNotEmpty) {
      queryBuilder.where((t) => t.name.like('%$query%'));
    }
    final results = await queryBuilder.get();
    return results.map((row) => _mapCustomer(row)).toList();
  }

  @override
  Future<ServiceCustomer> createCustomer({
    required String name,
    String? phone,
    String? email,
    String? address,
    Uint8List? image,
  }) async {
    final id = const Uuid().v4();
    final row = await db.into(db.serviceCustomers).insertReturning(ServiceCustomersCompanion.insert(
      id: id,
      name: name,
      phone: Value(phone),
      email: Value(email),
      address: Value(address),
      image: Value(image),
      createdAt: Value(DateTime.now()),
    ));
    return _mapCustomer(row);
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
    )).toList();
  }

  @override
  Future<void> addMaterial({required String name, required String category, required double price}) async {
    await db.into(db.serviceMaterials).insert(ServiceMaterialsCompanion.insert(
      name: name,
      category: category,
      defaultPrice: price,
    ));
  }

  @override
  Future<void> updateMaterial({required int id, required String name, required String category, required double price}) async {
    await (db.update(db.serviceMaterials)..where((t) => t.id.equals(id))).write(ServiceMaterialsCompanion(
      name: Value(name),
      category: Value(category),
      defaultPrice: Value(price),
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
    final existing = await (db.select(db.localCounters)..where((t) => t.type.equals(type))).getSingleOrNull();
    
    final nextValue = (existing?.lastValue ?? 0) + 1;
    
    await db.into(db.localCounters).insertOnConflictUpdate(LocalCountersCompanion(
      type: const Value(type),
      lastValue: Value(nextValue),
    ));
    
    return nextValue;
  }

  ServiceJob _mapJob(ServiceJobTable row, {String? customerName, List<ServiceJobItem> items = const []}) {
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
    );
  }

  ServiceCustomer _mapCustomer(ServiceCustomerTable row) {
    return ServiceCustomer(
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      image: row.image,
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
