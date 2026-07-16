import 'package:drift/drift.dart';
import 'dart:convert';
import 'package:uuid/uuid.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import '../../domain/entities/invoice.dart';
import '../../domain/entities/stock_return.dart';
import '../../../stock/domain/entities/item.dart';
import '../../domain/repositories/invoice_repository.dart';
import 'package:involve_app/core/utils/device_info_service.dart';

import 'package:involve_app/features/school_finance/domain/repositories/finance_repository_new.dart';

import 'package:involve_app/core/sync/domain/services/outbox_publisher.dart';

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
  Future<void> saveInvoice(Invoice invoice) async {
    final now = DateTime.now();
    final deviceId = await DeviceInfoService.getDeviceSuffix();
    final invoiceSyncId = _uuid.v4();

    await db.transaction(() async {
      String? finalCustomerId = invoice.customerId;

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

      final invoiceId = await db.into(db.invoices).insert(
            InvoicesCompanion.insert(
              invoiceNumber: invoice.invoiceNumber,
              dateCreated: Value(invoice.dateCreated),
              subtotal: invoice.subtotal,
              taxAmount: invoice.taxAmount,
              discountAmount: invoice.discountAmount,
              discountType: Value(invoice.discountType.name),
              totalAmount: invoice.totalAmount,
              paymentStatus: invoice.paymentStatus,
              amountPaid: Value(invoice.amountPaid),
              balanceAmount: Value(invoice.balanceAmount),
              customerName: Value(invoice.customerName),
              customerId: Value(finalCustomerId),
              customerAddress: Value(invoice.customerAddress),
              paymentMethod: Value(invoice.paymentMethod),
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

      // 3. Update Student Balance if student is associated with invoice
      if (invoice.studentId != null) {
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
          double carryForwardAmount = 0.0;
          for (final item in invoice.items) {
            if (item.item.name == 'Previous Term Balance') {
              carryForwardAmount += (item.unitPrice * item.quantity);
            }
          }
          balanceChange = invoice.balanceAmount - carryForwardAmount;
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
          // Regular invoice, add whatever wasn't paid (the balance) to their debt
          double carryForwardAmount = 0.0;
          for (final item in invoice.items) {
            if (item.item.name == 'Previous Term Balance' || item.item.name == 'Previous Balance') {
              carryForwardAmount += (item.unitPrice * item.quantity);
            }
          }
          balanceChange = invoice.balanceAmount - carryForwardAmount;
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

      if (outboxPublisher != null) {
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
    return _getInvoicesWithItems(db.select(db.invoices)
      ..orderBy([(t) => OrderingTerm(expression: t.dateCreated, mode: OrderingMode.desc)]));
  }

  @override
  Future<Invoice?> getInvoiceById(int id) async {
    final query = db.select(db.invoices)..where((t) => t.id.equals(id));
    final results = await _getInvoicesWithItems(query);
    if (results.isEmpty) return null;
    return results.first;
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
    final query = db.select(db.invoices)
      ..where((t) => t.dateCreated.isBetweenValues(start, end))
      ..orderBy([(t) => OrderingTerm(expression: t.dateCreated, mode: OrderingMode.desc)]);
    return _getInvoicesWithItems(query);
  }

  @override
  Future<List<String>> getAllCustomerNames() async {
    final query = db.selectOnly(db.invoices, distinct: true)
      ..addColumns([db.invoices.customerName])
      ..where(db.invoices.customerName.isNotNull())
      ..where(db.invoices.isDeleted.equals(false));
    
    final rows = await query.get();
    return rows
        .map((r) => r.read(db.invoices.customerName)!)
        .where((name) => name.trim().isNotEmpty)
        .toList()
      ..sort();
  }

  @override
  Future<List<Invoice>> getInvoicesByCustomerName(String customerName, {DateTime? start, DateTime? end}) async {
    final query = db.select(db.invoices)
      ..where((t) => t.customerName.equals(customerName));
    
    if (start != null && end != null) {
      query.where((t) => t.dateCreated.isBetweenValues(start, end));
    }
    
    query.orderBy([(t) => OrderingTerm(expression: t.dateCreated, mode: OrderingMode.desc)]);
    
    return _getInvoicesWithItems(query);
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

  // New method for partial payments
  Future<void> recordPayment(int invoiceId, double additionalAmount, String method) async {
    final now = DateTime.now();
    final invoice = await getInvoiceById(invoiceId);
    if (invoice == null) return;

    final newAmountPaid = invoice.amountPaid + additionalAmount;
    final newBalance = (invoice.totalAmount - newAmountPaid).clamp(0.0, double.infinity);
    final String newStatus;
    
    if (newBalance <= 0) {
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
