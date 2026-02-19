import 'dart:io';
import 'dart:typed_data';
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
        // --- Category Sync ---
        final Map<int, int> categoryIdMap = {}; // oldId -> newId
        
        // Check if categories table exists in backup
        final checkCategories = backupDb.select("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'");
        if (checkCategories.isNotEmpty) {
          final backupCategories = backupDb.select('SELECT id, name FROM categories');
          
          for (final row in backupCategories) {
            final oldId = row['id'] as int;
            final name = row['name'] as String;
            
            // Check if exists locally
            final existing = await (database.select(database.categories)
              ..where((c) => c.name.equals(name))).getSingleOrNull();
            
            if (existing != null) {
              categoryIdMap[oldId] = existing.id;
            } else {
              // Insert new
              final newId = await database.into(database.categories).insert(
                CategoriesCompanion.insert(name: name)
              );
              categoryIdMap[oldId] = newId;
            }
          }
        }

        // --- Item Sync ---
        final Map<int, int> itemIdMap = {}; // oldId -> newId
        final checkItems = backupDb.select("SELECT name FROM sqlite_master WHERE type='table' AND name='items'");
        if (checkItems.isNotEmpty) {
          final backupItems = backupDb.select('SELECT id, name, category, price, stockQty, image, categoryId FROM items');
          
          for (final row in backupItems) {
            final oldId = row['id'] as int;
            final name = row['name'] as String;
            final category = row['category'] as String;
            final price = (row['price'] as num).toDouble();
            final stockQty = row['stockQty'] as int;
            final image = row['image'] as Uint8List?;
            final oldCategoryId = row['categoryId'] as int?;
            
            final newCategoryId = oldCategoryId != null ? categoryIdMap[oldCategoryId] : null;

            // Check if exists locally
            final existing = await (database.select(database.items)
              ..where((i) => i.name.equals(name))).getSingleOrNull();
            
            if (existing != null) {
              itemIdMap[oldId] = existing.id;
            } else {
              final newId = await database.into(database.items).insert(
                ItemsCompanion.insert(
                  name: name,
                  category: category,
                  price: price,
                  stockQty: Value(stockQty),
                  image: Value(image),
                  categoryId: Value(newCategoryId),
                )
              );
              itemIdMap[oldId] = newId;
            }
          }
        }

        // --- Invoice Sync ---
        final checkInvoices = backupDb.select("SELECT name FROM sqlite_master WHERE type='table' AND name='invoices'");
        if (checkInvoices.isNotEmpty) {
          final backupInvoices = backupDb.select('SELECT * FROM invoices');
          for (final row in backupInvoices) {
            final oldInvoiceId = row['id'] as int;
            final invoiceNumber = row['invoiceNumber'] as String;
            
            // Check if invoice number exists locally
            final existing = await (database.select(database.invoices)
              ..where((inv) => inv.invoiceNumber.equals(invoiceNumber))).getSingleOrNull();
            
            if (existing != null) continue; // Skip duplicate invoice

            // Insert Invoice
            final newInvoiceId = await database.into(database.invoices).insert(
              InvoicesCompanion.insert(
                invoiceNumber: invoiceNumber,
                dateCreated: Value(DateTime.parse(row['dateCreated'] as String)),
                subtotal: (row['subtotal'] as num).toDouble(),
                taxAmount: (row['taxAmount'] as num).toDouble(),
                discountAmount: (row['discountAmount'] as num).toDouble(),
                totalAmount: (row['totalAmount'] as num).toDouble(),
                paymentStatus: row['paymentStatus'] as String,
                customerName: Value(row['customerName'] as String?),
                customerAddress: Value(row['customerAddress'] as String?),
                paymentMethod: Value(row['paymentMethod'] as String?),
              )
            );

            // Fetch and insert Invoice Items
            final backupInvItems = backupDb.select('SELECT * FROM invoice_items WHERE invoiceId = ?', [oldInvoiceId]);
            for (final itemRow in backupInvItems) {
              final oldItemId = itemRow['itemId'] as int;
              final newItemId = itemIdMap[oldItemId];
              
              if (newItemId != null) {
                await database.into(database.invoiceItems).insert(
                  InvoiceItemsCompanion.insert(
                    invoiceId: newInvoiceId,
                    itemId: newItemId,
                    quantity: itemRow['quantity'] as int,
                    unitPrice: (itemRow['unitPrice'] as num).toDouble(),
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
