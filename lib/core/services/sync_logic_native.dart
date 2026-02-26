import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:drift/drift.dart';
import 'package:sqlite3/sqlite3.dart' as sqlite;

Future<bool> performSync(AppDatabase database, Uint8List backupBytes) async {
  try {
    // 1. Write bytes to a temporary file
    final tempDir = await getTemporaryDirectory();
    final tempFile = File(p.join(tempDir.path, 'temp_sync_${DateTime.now().millisecondsSinceEpoch}.sqlite'));
    await tempFile.writeAsBytes(backupBytes);

    // 2. Open temporary database
    final backupDb = sqlite.sqlite3.open(tempFile.path);
    
    try {
      await database.transaction(() async {
        // --- Staff Sync ---
        final Map<int, int> staffIdMap = {}; // oldId -> newId
        if (_tableExists(backupDb, 'staff')) {
          final backupStaff = backupDb.select('SELECT * FROM staff');
          for (final row in backupStaff) {
            final oldId = row['id'] as int;
            final syncId = row['sync_id'] as String?;
            final name = row['name'] as String;

            // Find match
            StaffTable? existing;
            if (syncId != null) {
              existing = await (database.select(database.staff)..where((s) => s.syncId.equals(syncId))).getSingleOrNull();
            }
            existing ??= await (database.select(database.staff)..where((s) => s.name.equals(name))).getSingleOrNull();

            if (existing != null) {
              staffIdMap[oldId] = existing.id;
              // Update if newer
              final incomingUpdate = row['updated_at'] != null ? DateTime.parse(row['updated_at'] as String) : null;
              if (incomingUpdate != null && (existing.updatedAt == null || incomingUpdate.isAfter(existing.updatedAt!))) {
                await (database.update(database.staff)..where((s) => s.id.equals(existing!.id))).write(
                  StaffCompanion(
                    name: Value(name),
                    staffCode: Value(row['staff_code'] as String),
                    isActive: Value(row['is_active'] == 1),
                    updatedAt: Value(incomingUpdate),
                  )
                );
              }
            } else {
              final newId = await database.into(database.staff).insert(
                StaffCompanion.insert(
                  name: name,
                  staffCode: row['staff_code'] as String,
                  isActive: Value(row['is_active'] == 1),
                  syncId: Value(syncId),
                  updatedAt: Value(row['updated_at'] != null ? DateTime.parse(row['updated_at'] as String) : null),
                  createdAt: Value(row['created_at'] != null ? DateTime.parse(row['created_at'] as String) : null),
                )
              );
              staffIdMap[oldId] = newId;
            }
          }
        }

        // --- Category Sync ---
        final Map<int, int> categoryIdMap = {}; // oldId -> newId
        if (_tableExists(backupDb, 'categories')) {
          final backupCategories = backupDb.select('SELECT * FROM categories');
          for (final row in backupCategories) {
            final oldId = row['id'] as int;
            final name = row['name'] as String;
            final syncId = row['sync_id'] as String?; // Note: Older DBs might not have sync_id on Categories

            CategoryTable? existing;
            if (syncId != null) {
              existing = await (database.select(database.categories)..where((c) => c.syncId.equals(syncId))).getSingleOrNull();
            }
            existing ??= await (database.select(database.categories)..where((c) => c.name.equals(name))).getSingleOrNull();
            
            if (existing != null) {
              categoryIdMap[oldId] = existing.id;
            } else {
              final newId = await database.into(database.categories).insert(
                CategoriesCompanion.insert(
                  name: name,
                  syncId: Value(syncId),
                )
              );
              categoryIdMap[oldId] = newId;
            }
          }
        }

        // --- Item Sync ---
        final Map<int, int> itemIdMap = {}; // oldId -> newId
        if (_tableExists(backupDb, 'items')) {
          final backupItems = backupDb.select('SELECT * FROM items');
          for (final row in backupItems) {
            final oldId = row['id'] as int;
            final name = row['name'] as String;
            final syncId = row['sync_id'] as String?;
            
            final oldCategoryId = row['category_id'] as int?;
            final newCategoryId = oldCategoryId != null ? categoryIdMap[oldCategoryId] : null;

            ItemTable? existing;
            if (syncId != null) {
              existing = await (database.select(database.items)..where((i) => i.syncId.equals(syncId))).getSingleOrNull();
            }
            existing ??= await (database.select(database.items)..where((i) => i.name.equals(name))).getSingleOrNull();
            
            if (existing != null) {
              itemIdMap[oldId] = existing.id;
              // Update if newer
              final incomingUpdate = row['updated_at'] != null ? DateTime.parse(row['updated_at'] as String) : null;
              if (incomingUpdate != null && (existing.updatedAt == null || incomingUpdate.isAfter(existing.updatedAt!))) {
                await (database.update(database.items)..where((i) => i.id.equals(existing!.id))).write(
                  ItemsCompanion(
                    price: Value((row['price'] as num).toDouble()),
                    costPrice: Value((row['cost_price'] as num?)?.toDouble() ?? 0.0),
                    stockQty: Value(row['stock_qty'] as int),
                    minStockQty: Value((row['min_stock_qty'] as num?)?.toDouble() ?? 0.0),
                    image: Value(row['image'] as Uint8List?),
                    categoryId: Value(newCategoryId),
                    updatedAt: Value(incomingUpdate),
                  )
                );
              }
            } else {
              final newId = await database.into(database.items).insert(
                ItemsCompanion.insert(
                  name: name,
                  category: row['category'] as String,
                  price: (row['price'] as num).toDouble(),
                  costPrice: Value((row['cost_price'] as num?)?.toDouble() ?? 0.0),
                  stockQty: Value(row['stock_qty'] as int),
                  minStockQty: Value((row['min_stock_qty'] as num?)?.toDouble() ?? 0.0),
                  image: Value(row['image'] as Uint8List?),
                  categoryId: Value(newCategoryId),
                  syncId: Value(syncId),
                  createdAt: Value(row['created_at'] != null ? DateTime.parse(row['created_at'] as String) : null),
                  updatedAt: Value(row['updated_at'] != null ? DateTime.parse(row['updated_at'] as String) : null),
                )
              );
              itemIdMap[oldId] = newId;
            }
          }
        }

        // --- Invoice Sync ---
        final Map<int, int> invoiceIdMap = {}; // oldId -> newId
        if (_tableExists(backupDb, 'invoices')) {
          final backupInvoices = backupDb.select('SELECT * FROM invoices');
          for (final row in backupInvoices) {
            final oldId = row['id'] as int;
            final invoiceNumber = row['invoice_number'] as String;
            final syncId = row['sync_id'] as String?;
            
            final oldStaffId = row['staff_id'] as int?;
            final newStaffId = oldStaffId != null ? staffIdMap[oldStaffId] : null;

            InvoiceTable? existing;
            if (syncId != null) {
              existing = await (database.select(database.invoices)..where((inv) => inv.syncId.equals(syncId))).getSingleOrNull();
            }
            existing ??= await (database.select(database.invoices)..where((inv) => inv.invoiceNumber.equals(invoiceNumber))).getSingleOrNull();
            
            if (existing != null) {
              invoiceIdMap[oldId] = existing.id;
              final incomingUpdate = row['updated_at'] != null ? DateTime.parse(row['updated_at'] as String) : null;
              if (incomingUpdate != null && (existing.updatedAt == null || incomingUpdate.isAfter(existing.updatedAt!))) {
                await (database.update(database.invoices)..where((inv) => inv.id.equals(existing!.id))).write(
                  InvoicesCompanion(
                    paymentStatus: Value(row['payment_status'] as String),
                    amountPaid: Value((row['amount_paid'] as num).toDouble()),
                    balanceAmount: Value((row['balance_amount'] as num).toDouble()),
                    updatedAt: Value(incomingUpdate),
                  )
                );
              }
            } else {
              final newId = await database.into(database.invoices).insert(
                InvoicesCompanion.insert(
                  invoiceNumber: invoiceNumber,
                  subtotal: (row['subtotal'] as num).toDouble(),
                  taxAmount: (row['tax_amount'] as num).toDouble(),
                  discountAmount: (row['discount_amount'] as num).toDouble(),
                  totalAmount: (row['total_amount'] as num).toDouble(),
                  paymentStatus: row['payment_status'] as String,
                  dateCreated: Value(DateTime.parse(row['date_created'] as String)),
                  amountPaid: Value((row['amount_paid'] as num).toDouble()),
                  balanceAmount: Value((row['balance_amount'] as num).toDouble()),
                  customerName: Value(row['customer_name'] as String?),
                  customerAddress: Value(row['customer_address'] as String?),
                  paymentMethod: Value(row['payment_method'] as String?),
                  staffId: Value(newStaffId),
                  staffName: Value(row['staff_name'] as String?),
                  syncId: Value(syncId),
                  createdAt: Value(row['created_at'] != null ? DateTime.parse(row['created_at'] as String) : null),
                  updatedAt: Value(row['updated_at'] != null ? DateTime.parse(row['updated_at'] as String) : null),
                  totalPrintAmount: Value((row['total_print_amount'] as num?)?.toDouble()),
                )
              );
              invoiceIdMap[oldId] = newId;
            }

            // --- Invoice Items Sync ---
            if (_tableExists(backupDb, 'invoice_items')) {
              final backupInvItems = backupDb.select('SELECT * FROM invoice_items WHERE invoice_id = ?', [oldId]);
              for (final itemRow in backupInvItems) {
                final oldItemId = itemRow['item_id'] as int;
                final newItemId = itemIdMap[oldItemId];
                final iSyncId = itemRow['sync_id'] as String?;
                
                if (newItemId != null) {
                  InvoiceItemTable? existingItem;
                  if (iSyncId != null) {
                    existingItem = await (database.select(database.invoiceItems)..where((ii) => ii.syncId.equals(iSyncId))).getSingleOrNull();
                  }
                  
                  if (existingItem == null) {
                    await database.into(database.invoiceItems).insert(
                      InvoiceItemsCompanion.insert(
                        invoiceId: invoiceIdMap[oldId]!,
                        itemId: newItemId,
                        quantity: itemRow['quantity'] as int,
                        unitPrice: (itemRow['unit_price'] as num).toDouble(),
                        type: Value(itemRow['type'] as String),
                        serviceMeta: Value(itemRow['service_meta'] as String?),
                        syncId: Value(iSyncId),
                        createdAt: Value(itemRow['created_at'] != null ? DateTime.parse(itemRow['created_at'] as String) : null),
                        updatedAt: Value(itemRow['updated_at'] != null ? DateTime.parse(itemRow['updated_at'] as String) : null),
                        printPrice: Value((itemRow['print_price'] as num?)?.toDouble()),
                        returnedQuantity: Value(itemRow['returned_quantity'] as int),
                        isReplacement: Value(itemRow['is_replacement'] == 1),
                      )
                    );
                  }
                }
              }
            }
          }
        }

        // --- Expense Sync ---
        if (_tableExists(backupDb, 'expenses')) {
          final backupExpenses = backupDb.select('SELECT * FROM expenses');
          for (final row in backupExpenses) {
            final syncId = row['sync_id'] as String?;
            
            ExpenseTable? existing;
            if (syncId != null) {
              existing = await (database.select(database.expenses)..where((e) => e.syncId.equals(syncId))).getSingleOrNull();
            }

            if (existing == null) {
              await database.into(database.expenses).insert(
                ExpensesCompanion.insert(
                  amount: (row['amount'] as num).toDouble(),
                  description: row['description'] as String,
                  category: Value(row['category'] as String?),
                  date: Value(DateTime.parse(row['date'] as String)),
                  syncId: Value(syncId),
                  createdAt: Value(row['created_at'] != null ? DateTime.parse(row['created_at'] as String) : null),
                  updatedAt: Value(row['updated_at'] != null ? DateTime.parse(row['updated_at'] as String) : null),
                )
              );
            }
          }
        }

        // --- Stock Returns Sync ---
        if (_tableExists(backupDb, 'stock_returns')) {
          final backupReturns = backupDb.select('SELECT * FROM stock_returns');
          for (final row in backupReturns) {
            final syncId = row['sync_id'] as String?;
            final oldInvoiceId = row['invoice_id'] as int;
            final oldItemId = row['item_id'] as int;
            
            final newInvoiceId = invoiceIdMap[oldInvoiceId];
            final newItemId = itemIdMap[oldItemId];

            if (newInvoiceId != null && newItemId != null) {
              StockReturnTable? existing;
              if (syncId != null) {
                existing = await (database.select(database.stockReturns)..where((sr) => sr.syncId.equals(syncId))).getSingleOrNull();
              }

              if (existing == null) {
                final oldStaffId = row['staff_id'] as int?;
                final newStaffId = oldStaffId != null ? staffIdMap[oldStaffId] : null;

                await database.into(database.stockReturns).insert(
                  StockReturnsCompanion.insert(
                    invoiceId: newInvoiceId,
                    itemId: newItemId,
                    quantity: row['quantity'] as int,
                    amountReturned: (row['amount_returned'] as num?)?.toDouble() ?? 0.0,
                    staffId: newStaffId ?? 0, // Fallback to 0 if not found, but should not happen
                    dateReturned: Value(DateTime.parse(row['date_returned'] as String)),
                    syncId: Value(syncId),
                    createdAt: Value(row['created_at'] != null ? DateTime.parse(row['created_at'] as String) : null),
                    updatedAt: Value(row['updated_at'] != null ? DateTime.parse(row['updated_at'] as String) : null),
                  )
                );
              }
            }
          }
        }

        // --- Stock Increments Sync ---
        if (_tableExists(backupDb, 'stock_increments')) {
          final backupIncrements = backupDb.select('SELECT * FROM stock_increments');
          for (final row in backupIncrements) {
            final syncId = row['sync_id'] as String?;
            final oldItemId = row['item_id'] as int;
            final newItemId = itemIdMap[oldItemId];

            if (newItemId != null) {
              StockIncrementTable? existing;
              if (syncId != null) {
                existing = await (database.select(database.stockIncrements)..where((si) => si.syncId.equals(syncId))).getSingleOrNull();
              }

              if (existing == null) {
                await database.into(database.stockIncrements).insert(
                  StockIncrementsCompanion.insert(
                    itemId: newItemId,
                    quantityAdded: row['quantity_added'] as int,
                    quantityBefore: Value(row['quantity_before'] as int),
                    quantityAfter: Value(row['quantity_after'] as int),
                    dateAdded: Value(DateTime.parse(row['date_added'] as String)),
                    remarks: Value(row['remarks'] as String?),
                    syncId: Value(syncId),
                    createdAt: Value(row['created_at'] != null ? DateTime.parse(row['created_at'] as String) : null),
                    updatedAt: Value(row['updated_at'] != null ? DateTime.parse(row['updated_at'] as String) : null),
                  )
                );
              }
            }
          }
        }
      });
      
      backupDb.dispose();
      await tempFile.delete();
      return true;
    } catch (e) {
      backupDb.dispose();
      if (await tempFile.exists()) await tempFile.delete();
      rethrow;
    }
  } catch (e) {
    debugPrint('Native Sync failed: $e');
    return false;
  }
}

bool _tableExists(sqlite.Database db, String tableName) {
  final result = db.select("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [tableName]);
  return result.isNotEmpty;
}
