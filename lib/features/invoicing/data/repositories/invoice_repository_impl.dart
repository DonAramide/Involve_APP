import 'package:drift/drift.dart';
import 'dart:convert';
import 'package:uuid/uuid.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import '../../domain/entities/invoice.dart';
import '../../domain/entities/stock_return.dart';
import '../../../stock/domain/entities/item.dart';
import '../../domain/repositories/invoice_repository.dart';
import 'package:involve_app/core/utils/device_info_service.dart';

class InvoiceRepositoryImpl implements InvoiceRepository {
  final AppDatabase db;
  final _uuid = const Uuid();

  InvoiceRepositoryImpl(this.db);

  @override
  Future<void> saveInvoice(Invoice invoice) async {
    final now = DateTime.now();
    final deviceId = await DeviceInfoService.getDeviceSuffix();
    final invoiceSyncId = _uuid.v4();

    await db.transaction(() async {
      final invoiceId = await db.into(db.invoices).insert(
            InvoicesCompanion.insert(
              invoiceNumber: invoice.invoiceNumber,
              dateCreated: Value(invoice.dateCreated),
              subtotal: invoice.subtotal,
              taxAmount: invoice.taxAmount,
              discountAmount: invoice.discountAmount,
              totalAmount: invoice.totalAmount,
              paymentStatus: invoice.paymentStatus,
              amountPaid: Value(invoice.amountPaid),
              balanceAmount: Value(invoice.balanceAmount),
              customerName: Value(invoice.customerName),
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
            ),
          );

      for (final item in invoice.items) {
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
  Future<List<Invoice>> getInvoicesByDateRange(DateTime start, DateTime end) async {
    final query = db.select(db.invoices)
      ..where((t) => t.dateCreated.isBetweenValues(start, end))
      ..orderBy([(t) => OrderingTerm(expression: t.dateCreated, mode: OrderingMode.desc)]);
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
        final itemData = itemRow.readTable(db.items);
        final invoiceItemData = itemRow.readTable(db.invoiceItems);
        
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
        totalAmount: row.totalAmount,
        paymentStatus: row.paymentStatus,
        amountPaid: row.amountPaid,
        balanceAmount: row.balanceAmount,
        customerName: row.customerName,
        customerAddress: row.customerAddress,
        paymentMethod: row.paymentMethod,
        staffId: row.staffId,
        staffName: row.staffName,
        syncId: row.syncId,
        totalPrintAmount: row.totalPrintAmount,
      ));
    }
    return result;
  }

  @override
  Future<bool> checkServiceAvailability(int itemId, DateTime start, DateTime end) async {
    final query = db.select(db.invoiceItems)..where((t) => t.itemId.equals(itemId) & t.type.equals('service'));
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

    // Fetch total returned for this invoice to accurately calculate remaining balance
    final returns = await getStockReturnsByInvoiceId(invoiceId);
    final totalReturned = returns.fold<double>(0, (sum, r) => sum + r.amountReturned);

    final newAmountPaid = invoice.amountPaid + additionalAmount;
    final newBalance = (invoice.totalAmount - newAmountPaid - totalReturned).clamp(0.0, invoice.totalAmount);
    final String newStatus;
    
    if (newBalance <= 0) {
      newStatus = 'Paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'Partial';
    } else {
      newStatus = 'Unpaid';
    }

    await (db.update(db.invoices)..where((t) => t.id.equals(invoiceId))).write(
      InvoicesCompanion(
        amountPaid: Value(newAmountPaid),
        balanceAmount: Value(newBalance),
        paymentStatus: Value(newStatus),
        paymentMethod: Value(method),
        updatedAt: Value(now),
      ),
    );
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
      final double newBalance = (invoiceRow.balanceAmount + netChange).clamp(0.0, double.infinity);
      
      // Note: we don't change amountPaid, only balance and total.
      final String newStatus = newBalance <= 0 ? 'Paid' : (invoiceRow.amountPaid > 0 ? 'Partial' : 'Unpaid');

      await (db.update(db.invoices)..where((t) => t.id.equals(invoiceId))).write(
        InvoicesCompanion(
          totalAmount: Value(newTotal),
          balanceAmount: Value(newBalance),
          paymentStatus: Value(newStatus),
          updatedAt: Value(now),
        ),
      );
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
