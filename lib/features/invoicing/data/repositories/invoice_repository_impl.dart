import 'package:drift/drift.dart';
import 'dart:convert';
import 'dart:math' as math;
import 'package:uuid/uuid.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import '../../domain/entities/invoice.dart';
import '../../domain/entities/stock_return.dart';
import '../../../stock/domain/entities/item.dart';
import '../../domain/repositories/invoice_repository.dart';
import 'package:involve_app/core/utils/device_info_service.dart';

import 'package:involve_app/features/school_finance/domain/repositories/finance_repository_new.dart';

import 'package:involve_app/core/sync/domain/services/outbox_publisher.dart';
import 'package:involve_app/core/license/storage_service.dart';

class InvoiceRepositoryImpl implements InvoiceRepository {
  final AppDatabase db;
  final FinanceRepository? financeRepository; // Optional injection for payment logic
  final OutboxPublisher? outboxPublisher;
  final _uuid = const Uuid();

  InvoiceRepositoryImpl(this.db, {this.financeRepository, this.outboxPublisher});

  @override
  Future<Map<String, dynamic>> initiateVirtualAccount({
    required double amount,
    String? customerName,
    String? customerPhone,
    String? email,
  }) async {
    if (financeRepository == null) {
      throw Exception('Finance infrastructure not initialized for this repository.');
    }
    return await financeRepository!.initiateVirtualAccount(
      amount: amount,
      customerName: customerName,
      customerPhone: customerPhone,
      email: email,
    );
  }

  @override
  @override
  Future<void> saveInvoice(Invoice invoice, {bool adjustStudentBalance = true}) async {
    final now = DateTime.now();
    final deviceId = await DeviceInfoService.getDeviceSuffix();
    final invoiceSyncId = _uuid.v4();

    await db.transaction(() async {
      String? finalCustomerId = invoice.customerId;

      // Wallet/credit payments require sufficient customer credit before save.
      // Convention: balance < 0 means credit available (= -balance).
      if (invoice.paymentMethod == 'Wallet') {
        if (finalCustomerId == null || finalCustomerId.isEmpty) {
          throw Exception(
              'Customer Wallet payment requires a selected customer.');
        }
        final customer = await (db.select(db.customers)
              ..where((t) => t.id.equals(finalCustomerId!)))
            .getSingleOrNull();
        if (customer == null) {
          throw Exception('Selected customer was not found.');
        }
        final availableCredit =
            customer.balance < 0 ? -customer.balance : 0.0;
        if (availableCredit + 1e-9 < invoice.totalAmount) {
          throw Exception(
              'Insufficient wallet credit. Available: ₦${availableCredit.toStringAsFixed(2)}, '
              'Invoice: ₦${invoice.totalAmount.toStringAsFixed(2)}.');
        }
      }

      if (finalCustomerId == null && invoice.customerName != null && invoice.customerName!.trim().isNotEmpty) {
        finalCustomerId = _uuid.v4();
        await db.into(db.customers).insert(
          CustomersCompanion.insert(
            id: finalCustomerId,
            name: invoice.customerName!.trim(),
            phone: Value(invoice.customerPhone),
            address: Value(invoice.customerAddress),
          ),
        );
      }

      // Snapshot unpaid before wallet auto-apply — customer ledger uses this.
      var paymentStatus = invoice.paymentStatus;
      var amountPaid = invoice.amountPaid;
      var balanceAmount = invoice.balanceAmount;
      var paymentMethod = invoice.paymentMethod;
      final unpaidBeforeWalletApply = balanceAmount;

      // Pay Later / partial cash: auto-apply existing wallet credit onto the invoice
      // so Amount Paid / Status match the net wallet (credit is already in customers.balance).
      if (invoice.paymentMethod != 'Wallet' &&
          finalCustomerId != null &&
          balanceAmount > 1e-9) {
        final customer = await (db.select(db.customers)
              ..where((t) => t.id.equals(finalCustomerId!)))
            .getSingleOrNull();
        final credit =
            customer != null && customer.balance < 0 ? -customer.balance : 0.0;
        if (credit > 1e-9) {
          final applied = math.min(credit, balanceAmount);
          amountPaid += applied;
          balanceAmount =
              (balanceAmount - applied).clamp(0.0, double.infinity);
          paymentStatus = balanceAmount <= 1e-9
              ? 'Paid'
              : (amountPaid > 1e-9 ? 'Partial' : paymentStatus);
          final method = (paymentMethod ?? '').trim();
          if (method.isEmpty || method == 'Deferred') {
            paymentMethod =
                balanceAmount <= 1e-9 ? 'Wallet' : 'Deferred + Wallet';
          } else if (!method.toLowerCase().contains('wallet')) {
            paymentMethod = '$method + Wallet';
          }
        }
      }

      final invoiceId = await db.into(db.invoices).insert(
            InvoicesCompanion.insert(
              invoiceNumber: invoice.invoiceNumber,
              dateCreated: Value(invoice.dateCreated),
              subtotal: invoice.subtotal,
              taxAmount: invoice.taxAmount,
              discountAmount: invoice.discountAmount,
              discountType: Value(invoice.discountType.name),
              totalAmount: invoice.totalAmount,
              paymentStatus: paymentStatus,
              amountPaid: Value(amountPaid),
              balanceAmount: Value(balanceAmount),
              customerName: Value(invoice.customerName),
              customerId: Value(finalCustomerId),
              customerAddress: Value(invoice.customerAddress),
              paymentMethod: Value(paymentMethod),
              staffId: Value(invoice.staffId),
              staffName: Value(invoice.staffName),
              syncId: Value(invoice.syncId ?? invoiceSyncId),
              updatedAt: Value(now),
              createdAt: Value(invoice.dateCreated),
              deviceId: Value(deviceId),
              isDeleted: const Value(false),
              totalPrintAmount: Value(invoice.totalPrintAmount),
              businessMode: Value(invoice.businessMode),
              studentId: Value(invoice.studentId),
              classId: Value(invoice.classId),
              termId: Value(invoice.termId),
              academicYearId: Value(invoice.academicYearId),
              admissionNumber: Value(invoice.admissionNumber),
              className: Value(invoice.className),
              termName: Value(invoice.termName),
              academicYearName: Value(invoice.academicYearName),
              studentImage: Value(invoice.studentImage),
              warrantyDuration: Value(invoice.warrantyDuration),
              changeGiven: Value(invoice.changeGiven),
            ),
          );

      for (final item in invoice.items) {
        int finalItemId = item.item.id ?? -1;

        if (finalItemId < 0) {
          final existingItem = await (db.select(db.items)..where((t) => t.name.equals(item.item.name))).getSingleOrNull();
          if (existingItem != null) {
            finalItemId = existingItem.id;
          } else {
            finalItemId = await db.into(db.items).insert(
              ItemsCompanion.insert(
                name: item.item.name,
                category: item.item.category.name,
                price: item.item.price,
                stockQty: const Value(0),
                type: Value(item.item.type),
                syncId: Value(_uuid.v4()),
                createdAt: Value(now),
                updatedAt: Value(now),
                deviceId: Value(deviceId),
                isDeleted: const Value(false),
                businessMode: Value(item.item.businessMode),
              ),
            );
          }
        }

        await db.into(db.invoiceItems).insert(
              InvoiceItemsCompanion.insert(
                invoiceId: invoiceId,
                itemId: finalItemId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                type: Value(item.type),
                serviceMeta: Value(item.serviceMeta),
                syncId: Value(item.syncId ?? _uuid.v4()),
                printPrice: Value(item.printPrice),
                returnedQuantity: Value(item.returnedQuantity),
                isReplacement: Value(item.isReplacement),
              ),
            );

        // Deduct stock only for products
        if (item.type == 'product') {
          await db.customUpdate(
            'UPDATE items SET stock_qty = stock_qty - ?, updated_at = ? WHERE id = ?',
            variables: [
              Variable.withInt(item.quantity),
              Variable.withDateTime(now),
              Variable.withInt(item.item.id!)
            ],
            updates: {db.items},
          );
        }
      }

      // 3. Carry-forward line items move prior debt onto this invoice.
      // Settle older open INV/BILL rows so Profile / History stop showing them as Unpaid.
      // Student ledger math below already subtracts carry-forward — do not adjust balance here.
      if (invoice.studentId != null && !invoice.invoiceNumber.startsWith('PMT-')) {
        final carryForwardAmount = _carryForwardAmountFromItems(invoice.items);
        if (carryForwardAmount > 0.001) {
          final settleMethod = amountPaid > 0.001
              ? (paymentMethod ?? invoice.paymentMethod ?? 'Cash')
              : 'Rolled Forward';
          await _applyAmountToOpenStudentBills(
            studentId: invoice.studentId!,
            amount: carryForwardAmount,
            excludeInvoiceNumber: invoice.invoiceNumber,
            onlyBefore: invoice.dateCreated,
            paymentMethod: settleMethod,
            now: now,
          );
        }
      }

      // 4. Update Student Balance if student is associated with invoice
      if (adjustStudentBalance && invoice.studentId != null) {
        final double balanceChange;
        
        if (invoice.invoiceNumber.startsWith('PMT-')) {
          // It's a payment receipt - REDUCE the debt
          balanceChange = -invoice.amountPaid;
          print('DEBUG: Payment Receipt detected (${invoice.invoiceNumber}). Reducing balance by: ${invoice.amountPaid}');
        } else {
          // It's a bill (charge) - INCREASE the debt
          // Calculate the increment: Balance Amount - Carry Forward amounts
          // We do this because the UI adds the old balance as a line item ("Previous Term Balance").
          // If we simply add invoice.balanceAmount to student.balance, we double the debt.
          final carryForwardAmount = _carryForwardAmountFromItems(invoice.items);
          balanceChange = balanceAmount - carryForwardAmount;
          print('DEBUG: Bill detected (${invoice.invoiceNumber}). Found Carry Forward: $carryForwardAmount. Final increment: $balanceChange');
        }
        
        await db.customUpdate(
          'UPDATE students SET balance = balance + ?, updated_at = ? WHERE id = ?',
          variables: [
            Variable.withReal(balanceChange),
            Variable.withDateTime(now),
            Variable.withInt(invoice.studentId!)
          ],
          updates: {db.students},
        );
      }

      // 4. Update Customer Balance if customer is associated with invoice
      if (finalCustomerId != null) {
        final double balanceChange;
        
        if (invoice.invoiceNumber.startsWith('PMT-')) {
          // Explicit payment received from customer (reduces their debt)
          balanceChange = -invoice.amountPaid;
        } else if (invoice.paymentMethod == 'Wallet') {
          // Paid using wallet/credit. Invoice is "Paid", but we must add the total to their debt (or reduce their credit)
          balanceChange = invoice.totalAmount;
        } else {
          // Regular invoice: charge the unpaid portion before wallet auto-apply.
          // Auto-applied credit only updates invoice amountPaid/status for display;
          // customers.balance already nets credit when we add this full unpaid amount.
          double carryForwardAmount = _carryForwardAmountFromItems(invoice.items);
          balanceChange = unpaidBeforeWalletApply - carryForwardAmount;
        }
        
        await db.customUpdate(
          'UPDATE customers SET balance = balance + ? WHERE id = ?',
          variables: [
            Variable.withReal(balanceChange),
            Variable.withString(finalCustomerId)
          ],
          updates: {db.customers},
        );
      }

      final isOnlineInvoiceEnabled = await StorageService.isOnlineInvoiceUpdateEnabled();
      if (outboxPublisher != null && isOnlineInvoiceEnabled) {
        await outboxPublisher!.publish<Invoice>(
          db: db, // This passes the transaction context through
          eventName: 'invoice.created',
          aggregateType: 'invoice',
          aggregateId: invoice.syncId ?? invoiceSyncId,
          payload: invoice,
          serializer: (inv) => {
            'invoiceNumber': inv.invoiceNumber,
            'dateCreated': inv.dateCreated.toIso8601String(),
            'subtotal': inv.subtotal,
            'taxAmount': inv.taxAmount,
            'totalAmount': inv.totalAmount,
            'paymentStatus': inv.paymentStatus,
            'amountPaid': inv.amountPaid,
            'balanceAmount': inv.balanceAmount,
            'customerName': inv.customerName,
            'customerId': finalCustomerId, // use final evaluated id
            'syncId': inv.syncId ?? invoiceSyncId,
            'items': inv.items.map((i) => {
              'productSyncId': i.item.syncId,
              'quantity': i.quantity,
              'unitPrice': i.unitPrice,
              'type': i.type,
              'invoiceItemSyncId': i.syncId,
            }).toList(),
          },
        );
      }
    });
  }

  @override
  Future<void> updateInvoice(Invoice invoice) async {
    if (invoice.id == null) return;
    final now = DateTime.now();

    await db.transaction(() async {
      // 1. Update the main invoice record
      await (db.update(db.invoices)..where((t) => t.id.equals(invoice.id!)))
          .write(InvoicesCompanion(
        totalAmount: Value(invoice.totalAmount),
        amountPaid: Value(invoice.amountPaid),
        balanceAmount: Value(invoice.balanceAmount),
        paymentStatus: Value(invoice.paymentStatus),
        paymentMethod: Value(invoice.paymentMethod),
        updatedAt: Value(now),
      ));
    });
  }

  @override
  Future<List<Invoice>> getAllInvoices() async {
    final regularInvoices = await _getInvoicesWithItems(db.select(db.invoices)
      ..orderBy([(t) => OrderingTerm(expression: t.dateCreated, mode: OrderingMode.desc)]));
    final serviceInvoices = await _getServiceJobsAsInvoices();
    final combined = [...regularInvoices, ...serviceInvoices]
      ..sort((a, b) => b.dateCreated.compareTo(a.dateCreated));
    return combined;
  }

  @override
  Future<Invoice?> getInvoiceById(int id) async {
    final query = db.select(db.invoices)..where((t) => t.id.equals(id));
    final results = await _getInvoicesWithItems(query);
    if (results.isNotEmpty) return results.first;

    final serviceInvoices = await _getServiceJobsAsInvoices();
    final match = serviceInvoices.where((inv) => inv.id == id);
    if (match.isNotEmpty) return match.first;

    return null;
  }

  @override
  Future<List<Invoice>> getInvoicesByStudentId(int studentId) async {
    final query = db.select(db.invoices)
      ..where((t) => t.studentId.equals(studentId))
      ..orderBy([(t) => OrderingTerm(expression: t.dateCreated, mode: OrderingMode.desc)]);
    return _getInvoicesWithItems(query);
  }

  @override
  Future<List<Invoice>> getInvoicesByDateRange(DateTime start, DateTime end) async {
    final regularInvoices = await _getInvoicesWithItems(db.select(db.invoices)
      ..where((t) => t.dateCreated.isBetweenValues(start, end))
      ..orderBy([(t) => OrderingTerm(expression: t.dateCreated, mode: OrderingMode.desc)]));
    final serviceInvoices = await _getServiceJobsAsInvoices(start: start, end: end);
    final combined = [...regularInvoices, ...serviceInvoices]
      ..sort((a, b) => b.dateCreated.compareTo(a.dateCreated));
    return combined;
  }

  @override
  Future<List<String>> getAllCustomerNames() async {
    final query = db.selectOnly(db.invoices, distinct: true)
      ..addColumns([db.invoices.customerName])
      ..where(db.invoices.customerName.isNotNull())
      ..where(db.invoices.isDeleted.equals(false));
    
    final rows = await query.get();
    final names = rows
        .map((r) => r.read(db.invoices.customerName)!)
        .where((name) => name.trim().isNotEmpty)
        .toSet();

    try {
      final customers = await db.select(db.customers).get();
      for (final c in customers) {
        if (c.name.trim().isNotEmpty) names.add(c.name.trim());
      }
    } catch (_) {}

    return names.toList()..sort();
  }

  @override
  Future<List<Invoice>> getInvoicesByCustomerName(String customerName, {DateTime? start, DateTime? end}) async {
    final query = db.select(db.invoices)
      ..where((t) => t.customerName.equals(customerName));
    
    if (start != null && end != null) {
      query.where((t) => t.dateCreated.isBetweenValues(start, end));
    }
    
    query.orderBy([(t) => OrderingTerm(expression: t.dateCreated, mode: OrderingMode.desc)]);
    
    final regularInvoices = await _getInvoicesWithItems(query);
    final serviceInvoices = await _getServiceJobsAsInvoices(start: start, end: end, customerName: customerName);
    final combined = [...regularInvoices, ...serviceInvoices]
      ..sort((a, b) => b.dateCreated.compareTo(a.dateCreated));
    return combined;
  }

  Future<List<Invoice>> _getServiceJobsAsInvoices({
    DateTime? start,
    DateTime? end,
    String? customerName,
  }) async {
    try {
      final query = db.select(db.serviceJobs);
      if (start != null && end != null) {
        query.where((t) => t.createdAt.isBetweenValues(start, end));
      }
      final jobs = await (query..orderBy([(t) => OrderingTerm(expression: t.createdAt, mode: OrderingMode.desc)])).get();

      if (jobs.isEmpty) return [];

      final customers = await db.select(db.customers).get();
      final customerMap = {for (var c in customers) c.id: c.name};

      final List<Invoice> result = [];

      for (final job in jobs) {
        final cName = customerMap[job.customerId] ?? 'Client';
        if (customerName != null &&
            customerName.trim().isNotEmpty &&
            !cName.toLowerCase().contains(customerName.trim().toLowerCase())) {
          continue;
        }

        final jobItems = await (db.select(db.serviceJobItems)..where((t) => t.jobId.equals(job.id))).get();
        final payments = await (db.select(db.servicePayments)
              ..where((t) => t.jobId.equals(job.id))
              ..orderBy([(t) => OrderingTerm(expression: t.createdAt, mode: OrderingMode.desc)]))
            .get();
        final latestMethod = payments.isNotEmpty ? payments.first.method : (job.amountPaid > 0 ? 'Cash' : null);

        final items = <InvoiceItem>[];
        if (job.laborAmount > 0) {
          items.add(InvoiceItem(
            item: Item(
              id: 0,
              name: 'Workmanship / Labor',
              category: ItemCategory.service,
              price: job.laborAmount,
              stockQty: 1,
              type: 'service',
            ),
            quantity: 1,
            unitPrice: job.laborAmount,
            type: 'service',
          ));
        }
        for (final it in jobItems) {
          items.add(InvoiceItem(
            item: Item(
              id: it.id,
              name: it.name,
              category: ItemCategory.service,
              price: it.price,
              stockQty: it.quantity.toInt() > 0 ? it.quantity.toInt() : 1,
              type: 'service',
              serviceCategory: it.category,
            ),
            quantity: it.quantity.toInt() > 0 ? it.quantity.toInt() : 1,
            unitPrice: it.price,
            type: 'service',
          ));
        }
        if (items.isEmpty) {
          items.add(InvoiceItem(
            item: Item(
              id: 0,
              name: job.title.isNotEmpty ? job.title : 'Service Job',
              category: ItemCategory.service,
              price: job.totalAmount,
              stockQty: 1,
              type: 'service',
            ),
            quantity: 1,
            unitPrice: job.totalAmount,
            type: 'service',
          ));
        }

        final isPaid = job.balance <= 0;
        final paymentStatus = isPaid ? 'Paid' : (job.amountPaid > 0 ? 'Partial' : 'Unpaid');

        result.add(Invoice(
          id: job.id.hashCode.abs(),
          invoiceNumber: job.jobId,
          dateCreated: job.createdAt,
          items: items,
          subtotal: job.totalAmount,
          taxAmount: 0.0,
          discountAmount: 0.0,
          discountType: DiscountType.amount,
          totalAmount: job.totalAmount,
          paymentStatus: paymentStatus,
          amountPaid: job.amountPaid,
          balanceAmount: job.balance,
          customerName: cName,
          customerId: job.customerId,
          paymentMethod: latestMethod,
          businessMode: 'services',
          warrantyDuration: job.warrantyDuration,
        ));
      }

      return result;
    } catch (_) {
      return [];
    }
  }

  @override
  Future<void> reconcileWalletCreditOnCustomerInvoices(String customerId) async {
    if (customerId.isEmpty) return;

    final customer = await (db.select(db.customers)
          ..where((t) => t.id.equals(customerId)))
        .getSingleOrNull();
    if (customer == null) return;

    // Only needed when net balance is owing (credit already consumed into debt).
    if (customer.balance <= 1e-9) return;

    final openInvoices = await (db.select(db.invoices)
          ..where((t) =>
              t.isDeleted.equals(false) &
              t.balanceAmount.isBiggerThanValue(0) &
              (t.customerId.equals(customerId) |
                  t.customerName.equals(customer.name)))
          ..orderBy([
            (t) => OrderingTerm(
                expression: t.dateCreated, mode: OrderingMode.asc)
          ]))
        .get();
    if (openInvoices.isEmpty) return;

    final unpaidOnInvoices =
        openInvoices.fold<double>(0, (s, i) => s + i.balanceAmount);
    // Hidden credit already netted into customers.balance but not shown as paid.
    var hiddenCredit = unpaidOnInvoices - customer.balance;
    if (hiddenCredit <= 1e-9) return;

    final now = DateTime.now();
    for (final inv in openInvoices) {
      if (hiddenCredit <= 1e-9) break;
      final apply = math.min(hiddenCredit, inv.balanceAmount);
      if (apply <= 1e-9) continue;

      final newPaid = inv.amountPaid + apply;
      final newBal =
          (inv.balanceAmount - apply).clamp(0.0, double.infinity);
      final newStatus = newBal <= 1e-9
          ? 'Paid'
          : (newPaid > 1e-9 ? 'Partial' : inv.paymentStatus);
      final method = (inv.paymentMethod ?? '').trim();
      final newMethod = method.isEmpty || method == 'Deferred'
          ? (newBal <= 1e-9 ? 'Wallet' : 'Deferred + Wallet')
          : (!method.toLowerCase().contains('wallet')
              ? '$method + Wallet'
              : method);

      await (db.update(db.invoices)..where((t) => t.id.equals(inv.id)))
          .write(
        InvoicesCompanion(
          amountPaid: Value(newPaid),
          balanceAmount: Value(newBal),
          paymentStatus: Value(newStatus),
          paymentMethod: Value(newMethod),
          updatedAt: Value(now),
        ),
      );
      hiddenCredit -= apply;
    }
  }

  Future<List<Invoice>> _getInvoicesWithItems(SimpleSelectStatement<$InvoicesTable, InvoiceTable> query) async {
    final invoiceRows = await (query..where((t) => t.isDeleted.equals(false))).get();
    final List<Invoice> result = [];

    for (final row in invoiceRows) {
      final itemsQuery = db.select(db.invoiceItems).join([
        leftOuterJoin(db.items, db.items.id.equalsExp(db.invoiceItems.itemId)),
      ])..where(db.invoiceItems.invoiceId.equals(row.id));

      final itemRows = await itemsQuery.get();
      
      final invoiceItems = itemRows.map((itemRow) {
        final itemData = itemRow.readTable(this.db.items);
        final invoiceItemData = itemRow.readTable(this.db.invoiceItems);
        
        return InvoiceItem(
          id: invoiceItemData.id,
          item: Item(
            id: itemData.id,
            name: itemData.name,
            category: ItemCategory.values.byName(itemData.category),
            categoryId: itemData.categoryId,
            price: itemData.price,
            stockQty: itemData.stockQty,
            image: itemData.image,
            type: itemData.type,
            billingType: itemData.billingType,
            serviceCategory: itemData.serviceCategory,
            requiresTimeTracking: itemData.requiresTimeTracking,
            businessMode: itemData.businessMode,
            syncId: itemData.syncId,
          ),
          quantity: invoiceItemData.quantity,
          unitPrice: invoiceItemData.unitPrice,
          type: invoiceItemData.type,
          serviceMeta: invoiceItemData.serviceMeta,
          syncId: invoiceItemData.syncId,
          printPrice: invoiceItemData.printPrice,
          returnedQuantity: invoiceItemData.returnedQuantity,
          isReplacement: invoiceItemData.isReplacement,
        );
      }).toList();

      result.add(Invoice(
        id: row.id,
        invoiceNumber: row.invoiceNumber,
        dateCreated: row.dateCreated,
        items: invoiceItems,
        subtotal: row.subtotal,
        taxAmount: row.taxAmount,
        discountAmount: row.discountAmount,
        discountType: DiscountType.values.byName(row.discountType ?? 'amount'),
        totalAmount: row.totalAmount,
        paymentStatus: row.paymentStatus,
        amountPaid: row.amountPaid,
        balanceAmount: row.balanceAmount,
        customerName: row.customerName,
        customerId: row.customerId,
        customerAddress: row.customerAddress,
        paymentMethod: row.paymentMethod,
        staffId: row.staffId,
        staffName: row.staffName,
        syncId: row.syncId,
        totalPrintAmount: row.totalPrintAmount,
        businessMode: row.businessMode,
        studentId: row.studentId,
        classId: row.classId,
        termId: row.termId,
        academicYearId: row.academicYearId,
        admissionNumber: row.admissionNumber,
        className: row.className,
        termName: row.termName,
        academicYearName: row.academicYearName,
        studentImage: row.studentImage,
        warrantyDuration: row.warrantyDuration,
        changeGiven: row.changeGiven,
      ));
    }
    return result;
  }

  @override
  Future<bool> checkServiceAvailability(int itemId, DateTime start, DateTime end) async {
    final query = this.db.select(this.db.invoiceItems)..where((t) => t.itemId.equals(itemId) & t.type.equals('service'));
    final items = await query.get();

    for (final item in items) {
      if (item.serviceMeta != null) {
        try {
          final meta = jsonDecode(item.serviceMeta!) as Map<String, dynamic>;
          final bookedStartStr = meta['startDate'];
          final bookedEndStr = meta['endDate'];
          
          if (bookedStartStr != null && bookedEndStr != null) {
            final bookedStart = DateTime.parse(bookedStartStr);
            final bookedEnd = DateTime.parse(bookedEndStr);
            
            if (start.isBefore(bookedEnd) && end.isAfter(bookedStart)) {
              return false;
            }
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }
    return true;
  }

  @override
  Future<void> updatePaymentInfo(int invoiceId, String method, String status) async {
    // This method is now replaced by the logic in history_bloc if we want to be more specific,
    // but for backward compatibility and simple updates:
    final now = DateTime.now();
    await (db.update(db.invoices)..where((t) => t.id.equals(invoiceId))).write(
      InvoicesCompanion(
        paymentMethod: Value(method),
        paymentStatus: Value(status),
        updatedAt: Value(now),
      ),
    );
  }

  /// Line items that represent debt rolled from prior open bills.
  static bool isCarryForwardLineName(String? name) {
    final n = (name ?? '').trim().toLowerCase();
    return n == 'previous term balance' ||
        n == 'previous balance' ||
        n == 'outstanding balance';
  }

  double _carryForwardAmountFromItems(List<InvoiceItem> items) {
    var total = 0.0;
    for (final item in items) {
      if (isCarryForwardLineName(item.item.name)) {
        total += item.unitPrice * item.quantity;
      }
    }
    return total;
  }

  /// Apply [amount] to older open student INV/BILL rows (FIFO, BILL- first).
  /// Does not change students.balance — callers own ledger math.
  Future<double> _applyAmountToOpenStudentBills({
    required int studentId,
    required double amount,
    String? excludeInvoiceNumber,
    DateTime? onlyBefore,
    required String paymentMethod,
    required DateTime now,
  }) async {
    if (amount <= 0.001) return 0.0;

    final rows = await (db.select(db.invoices)
          ..where((t) =>
              t.studentId.equals(studentId) & t.isDeleted.equals(false)))
        .get();

    final open = rows.where((r) {
      if (excludeInvoiceNumber != null &&
          r.invoiceNumber == excludeInvoiceNumber) {
        return false;
      }
      if (r.invoiceNumber.startsWith('PMT-')) return false;
      if (onlyBefore != null && !r.dateCreated.isBefore(onlyBefore)) {
        return false;
      }
      final owing = r.totalAmount - r.amountPaid;
      return owing > 0.001;
    }).toList()
      ..sort((a, b) {
        final aBill = a.invoiceNumber.startsWith('BILL-') ? 0 : 1;
        final bBill = b.invoiceNumber.startsWith('BILL-') ? 0 : 1;
        if (aBill != bBill) return aBill.compareTo(bBill);
        return a.dateCreated.compareTo(b.dateCreated);
      });

    var remaining = amount;
    var applied = 0.0;

    for (final row in open) {
      if (remaining <= 0.001) break;
      final owing = row.totalAmount - row.amountPaid;
      final pay = remaining < owing ? remaining : owing;
      if (pay <= 0.001) continue;

      final newPaid = row.amountPaid + pay;
      final newBalance =
          (row.totalAmount - newPaid).clamp(0.0, double.infinity);
      final newStatus = newBalance <= 0.001
          ? 'Paid'
          : (newPaid > 0 ? 'Partial' : 'Unpaid');

      await (db.update(db.invoices)..where((t) => t.id.equals(row.id))).write(
        InvoicesCompanion(
          amountPaid: Value(newPaid),
          balanceAmount: Value(newBalance),
          paymentStatus: Value(newStatus),
          paymentMethod: Value(paymentMethod),
          updatedAt: Value(now),
        ),
      );
      remaining -= pay;
      applied += pay;
    }

    return applied;
  }

  @override
  Future<bool> reconcileStudentCarryForwardSettlements(int studentId) async {
    final invoices = await getInvoicesByStudentId(studentId);
    if (invoices.isEmpty) return false;

    // Newest first so older bills are settled by later carry-forward invoices.
    final withCarry = invoices
        .where((inv) =>
            !inv.invoiceNumber.startsWith('PMT-') &&
            _carryForwardAmountFromItems(inv.items) > 0.001)
        .toList()
      ..sort((a, b) => a.dateCreated.compareTo(b.dateCreated));

    if (withCarry.isEmpty) return false;

    var changed = false;
    await db.transaction(() async {
      final now = DateTime.now();
      for (final inv in withCarry) {
        final cf = _carryForwardAmountFromItems(inv.items);
        final settleMethod = inv.amountPaid > 0.001
            ? (inv.paymentMethod ?? 'Cash')
            : 'Rolled Forward';
        final applied = await _applyAmountToOpenStudentBills(
          studentId: studentId,
          amount: cf,
          excludeInvoiceNumber: inv.invoiceNumber,
          onlyBefore: inv.dateCreated,
          paymentMethod: settleMethod,
          now: now,
        );
        if (applied > 0.001) changed = true;
      }
    });

    return changed;
  }

  // New method for partial payments
  @override
  Future<void> recordPayment(int invoiceId, double additionalAmount, String method) async {
    final now = DateTime.now();
    final invoice = await getInvoiceById(invoiceId);
    if (invoice == null) return;

    final newAmountPaid = invoice.amountPaid + additionalAmount;
    final newBalance = (invoice.totalAmount - newAmountPaid).clamp(0.0, double.infinity);
    final String newStatus;
    
    if (method == 'Transfer') {
      newStatus = 'Pending';
    } else if (newBalance <= 0) {
      newStatus = 'Paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'Partial';
    } else {
      newStatus = 'Unpaid';
    }

    await db.transaction(() async {
      await (db.update(db.invoices)..where((t) => t.id.equals(invoiceId))).write(
        InvoicesCompanion(
          amountPaid: Value(newAmountPaid),
          balanceAmount: Value(newBalance),
          paymentStatus: Value(newStatus),
          paymentMethod: Value(method),
          updatedAt: Value(now),
        ),
      );

      // Propagate balance update to student master balance
      if (invoice.studentId != null) {
        await db.customUpdate(
          'UPDATE students SET balance = balance - ?, updated_at = ? WHERE id = ?',
          variables: [
            Variable.withReal(additionalAmount),
            Variable.withDateTime(now),
            Variable.withInt(invoice.studentId!)
          ],
          updates: {db.students},
        );
      }

      // Propagate balance update to customer master balance
      if (invoice.customerId != null) {
        await db.customUpdate(
          'UPDATE customers SET balance = balance - ? WHERE id = ?',
          variables: [
            Variable.withReal(additionalAmount),
            Variable.withString(invoice.customerId!)
          ],
          updates: {db.customers},
        );
      }
    });
  }

  @override
  Future<void> returnItems({
    required int invoiceId,
    required List<ReturnItem> items,
    required int staffId,
    List<InvoiceItem>? replacements,
  }) async {
    final now = DateTime.now();
    final deviceId = await DeviceInfoService.getDeviceSuffix();

    await db.transaction(() async {
      double totalReturnedAmount = 0;
      double totalReplacementAmount = 0;

      // 1. Process Returns/Replacements (Original Items)
      for (final item in items) {
        totalReturnedAmount += item.amount;
        
        // Record the return entry
        await db.into(db.stockReturns).insert(
              StockReturnsCompanion.insert(
                invoiceId: invoiceId,
                itemId: item.itemId,
                quantity: item.quantity,
                amountReturned: item.amount,
                staffId: staffId,
                dateReturned: Value(now),
                syncId: Value(_uuid.v4()),
                updatedAt: Value(now),
                createdAt: Value(now),
                deviceId: Value(deviceId),
              ),
            );

        // Increment stock for the returned item
        await db.customUpdate(
          'UPDATE items SET stock_qty = stock_qty + ?, updated_at = ? WHERE id = ?',
          variables: [
            Variable.withInt(item.quantity),
            Variable.withDateTime(now),
            Variable.withInt(item.itemId)
          ],
          updates: {db.items},
        );

        // Update returned_quantity in invoice_items
        await db.customUpdate(
          'UPDATE invoice_items SET returned_quantity = returned_quantity + ?, updated_at = ? WHERE invoice_id = ? AND item_id = ?',
          variables: [
            Variable.withInt(item.quantity),
            Variable.withDateTime(now),
            Variable.withInt(invoiceId),
            Variable.withInt(item.itemId)
          ],
          updates: {db.invoiceItems},
        );
      }

      // 2. Process Replacements (New Items)
      if (replacements != null && replacements.isNotEmpty) {
        for (final item in replacements) {
          totalReplacementAmount += item.total;
          
          // Insert the replacement item into invoice_items
          await db.into(db.invoiceItems).insert(
                InvoiceItemsCompanion.insert(
                  invoiceId: invoiceId,
                  itemId: item.item.id!,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  type: Value(item.type),
                  serviceMeta: Value(item.serviceMeta),
                  syncId: Value(item.syncId ?? _uuid.v4()),
                  updatedAt: Value(now),
                  createdAt: Value(now),
                  deviceId: Value(deviceId),
                  isDeleted: const Value(false),
                  printPrice: Value(item.printPrice),
                  isReplacement: const Value(true),
                ),
              );

          // Decrement stock for the replacement item
          if (item.type == 'product') {
            await db.customUpdate(
              'UPDATE items SET stock_qty = stock_qty - ?, updated_at = ? WHERE id = ?',
              variables: [
                Variable.withInt(item.quantity),
                Variable.withDateTime(now),
                Variable.withInt(item.item.id!)
              ],
              updates: {db.items},
            );
          }
        }
      }

      // 3. Update Invoice Summary (Net Impact)
      final invoiceRow = await (db.select(db.invoices)..where((t) => t.id.equals(invoiceId))).getSingle();
      
      final double netChange = totalReplacementAmount - totalReturnedAmount;
      final double newTotal = (invoiceRow.totalAmount + netChange).clamp(0.0, double.infinity);
      
      // Calculate how much of the refund (if any) should come out of amountPaid
      // If netChange is negative and |netChange| > balanceAmount, 
      // the excess should reduce amountPaid.
      double newAmountPaid = invoiceRow.amountPaid;
      if (netChange < 0) {
        final double surplusRefund = (-netChange) - invoiceRow.balanceAmount;
        if (surplusRefund > 0) {
          newAmountPaid = (invoiceRow.amountPaid - surplusRefund).clamp(0.0, double.infinity);
        }
      }
      
      final double newBalance = (newTotal - newAmountPaid).clamp(0.0, double.infinity);
      final String newStatus = newBalance <= 0 ? 'Paid' : (newAmountPaid > 0 ? 'Partial' : 'Unpaid');

      await (db.update(db.invoices)..where((t) => t.id.equals(invoiceId))).write(
        InvoicesCompanion(
          totalAmount: Value(newTotal),
          amountPaid: Value(newAmountPaid),
          balanceAmount: Value(newBalance),
          paymentStatus: Value(newStatus),
          updatedAt: Value(now),
        ),
      );

      // Propagate balance update to student master balance
      if (invoiceRow.studentId != null) {
        final double balanceChange = newBalance - invoiceRow.balanceAmount;
        if (balanceChange != 0) {
          await db.customUpdate(
            'UPDATE students SET balance = balance + ?, updated_at = ? WHERE id = ?',
            variables: [
              Variable.withReal(balanceChange),
              Variable.withDateTime(now),
              Variable.withInt(invoiceRow.studentId!)
            ],
            updates: {db.students},
          );
        }
      }

      // Propagate balance update to customer master balance
      if (invoiceRow.customerId != null) {
        final double balanceChange = newBalance - invoiceRow.balanceAmount;
        if (balanceChange != 0) {
          await db.customUpdate(
            'UPDATE customers SET balance = balance + ? WHERE id = ?',
            variables: [
              Variable.withReal(balanceChange),
              Variable.withString(invoiceRow.customerId!)
            ],
            updates: {db.customers},
          );
        }
      }
    });
  }

  @override
  Future<List<StockReturn>> getStockReturnsByDateRange(DateTime start, DateTime end) async {
    final query = db.select(db.stockReturns)..where((t) => t.dateReturned.isBetweenValues(start, end));
    final rows = await query.get();

    return rows.map((row) => StockReturn(
      id: row.id,
      invoiceId: row.invoiceId,
      itemId: row.itemId,
      quantity: row.quantity,
      amountReturned: row.amountReturned,
      staffId: row.staffId,
      dateReturned: row.dateReturned,
      syncId: row.syncId,
    )).toList();
  }

  @override
  Future<List<StockReturn>> getStockReturnsByInvoiceId(int invoiceId) async {
    final query = db.select(db.stockReturns)..where((t) => t.invoiceId.equals(invoiceId));
    final rows = await query.get();

    return rows.map((row) => StockReturn(
      id: row.id,
      invoiceId: row.invoiceId,
      itemId: row.itemId,
      quantity: row.quantity,
      amountReturned: row.amountReturned,
      staffId: row.staffId,
      dateReturned: row.dateReturned,
      syncId: row.syncId,
    )).toList();
  }
}
