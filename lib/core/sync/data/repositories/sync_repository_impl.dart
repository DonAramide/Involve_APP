import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import '../../domain/models/sync_models.dart';

abstract class SyncRepository {
  Future<SyncMetaTable?> getSyncMeta();
  Future<void> saveSyncMeta(SyncMetaCompanion meta);
  Future<SyncBatch> getDeltaBatch(DateTime since, String deviceId);
  Future<void> applyBatch(SyncBatch batch);
}

class SyncRepositoryImpl implements SyncRepository {
  final AppDatabase db;

  SyncRepositoryImpl(this.db);

  @override
  Future<SyncMetaTable?> getSyncMeta() async {
    return await db.select(db.syncMeta).getSingleOrNull();
  }

  @override
  Future<void> saveSyncMeta(SyncMetaCompanion meta) async {
    final existing = await getSyncMeta();
    if (existing != null) {
      await (db.update(db.syncMeta)..where((t) => t.id.equals(existing.id))).write(meta);
    } else {
      await db.into(db.syncMeta).insert(meta);
    }
  }

  @override
  Future<SyncBatch> getDeltaBatch(DateTime since, String deviceId) async {
    final records = <SyncRecord>[];

    // 1. Items
    final changedItems = await (db.select(db.items)..where((t) => t.updatedAt.isBiggerThanValue(since))).get();
    for (final item in changedItems) {
      records.add(SyncRecord(
        table: 'items',
        data: item.toJson(),
        updatedAt: item.updatedAt ?? DateTime.now(),
        isDeleted: item.isDeleted,
      ));
    }

    // 2. Invoices
    final changedInvoices = await (db.select(db.invoices)..where((t) => t.updatedAt.isBiggerThanValue(since))).get();
    for (final inv in changedInvoices) {
      records.add(SyncRecord(
        table: 'invoices',
        data: inv.toJson(),
        updatedAt: inv.updatedAt ?? DateTime.now(),
        isDeleted: inv.isDeleted,
      ));
    }

    // 3. InvoiceItems
    final changedInvoiceItems = await (db.select(db.invoiceItems)..where((t) => t.updatedAt.isBiggerThanValue(since))).get();
    for (final item in changedInvoiceItems) {
      records.add(SyncRecord(
        table: 'invoice_items',
        data: item.toJson(),
        updatedAt: item.updatedAt ?? DateTime.now(),
        isDeleted: item.isDeleted,
      ));
    }

    // 4. Categories
    final changedCategories = await (db.select(db.categories)..where((t) => t.updatedAt.isBiggerThanValue(since))).get();
    for (final cat in changedCategories) {
      records.add(SyncRecord(
        table: 'categories',
        data: cat.toJson(),
        updatedAt: cat.updatedAt ?? DateTime.now(),
        isDeleted: cat.isDeleted,
      ));
    }

    // 5. Staff
    final changedStaff = await (db.select(db.staff)..where((t) => t.updatedAt.isBiggerThanValue(since))).get();
    for (final s in changedStaff) {
      records.add(SyncRecord(
        table: 'staff',
        data: s.toJson(),
        updatedAt: s.updatedAt ?? DateTime.now(),
        isDeleted: s.isDeleted,
      ));
    }

    return SyncBatch(
      deviceId: deviceId,
      timestamp: DateTime.now(),
      records: records,
    );
  }

  @override
  Future<void> applyBatch(SyncBatch batch) async {
    debugPrint('SyncRepo: Applying batch with ${batch.records.length} records from ${batch.deviceId}');

    // Pass 1: categories first (items.category_id FK depends on them), then items, then staff
    for (final record in batch.records.where((r) => r.table == 'categories')) {
      try { await _applyCategory(record); } catch (e) { debugPrint('SyncRepo: Error applying category: $e\n${record.data}'); rethrow; }
    }
    for (final record in batch.records.where((r) => r.table == 'items')) {
      try { await _applyItem(record); } catch (e) { debugPrint('SyncRepo: Error applying item: $e\n${record.data}'); rethrow; }
    }
    for (final record in batch.records.where((r) => r.table == 'staff')) {
      try { await _applyStaff(record); } catch (e) { debugPrint('SyncRepo: Error applying staff: $e\n${record.data}'); rethrow; }
    }

    // Pass 2: Apply invoices and build a map from remote id -> local id
    final invoiceIdMap = <int, int>{};
    for (final record in batch.records.where((r) => r.table == 'invoices')) {
      try {
        final remoteId = record.data['id'] as int?;
        final localId = await _applyInvoice(record);
        if (remoteId != null && localId != null) {
          invoiceIdMap[remoteId] = localId;
        }
        debugPrint('SyncRepo: Invoice remoteId=$remoteId → localId=$localId');
      } catch (e) {
        debugPrint('SyncRepo: Error applying invoice: $e\n${record.data}');
        rethrow;
      }
    }

    // Pass 3: Apply invoice items using the id map
    for (final record in batch.records.where((r) => r.table == 'invoice_items')) {
      try { await _applyInvoiceItem(record, invoiceIdMap); } catch (e) { debugPrint('SyncRepo: Error applying invoice_item: $e\n${record.data}'); rethrow; }
    }

    debugPrint('SyncRepo: Batch applied successfully. Invoice id map: $invoiceIdMap');
  }

  // Returns the local id of the saved invoice (null if skipped)
  Future<int?> _applyInvoice(SyncRecord record) async {
    final remote = InvoiceTable.fromJson(record.data);
    if (remote.syncId == null) return null;

    final existing = await (db.select(db.invoices)
          ..where((t) => t.syncId.equals(remote.syncId!)))
        .getSingleOrNull();

    if (existing == null) {
      // Insert without remote id — let SQLite auto-assign a fresh local id
      final localId = await db.into(db.invoices).insert(InvoicesCompanion(
        invoiceNumber: Value(remote.invoiceNumber),
        dateCreated: Value(remote.dateCreated),
        subtotal: Value(remote.subtotal),
        taxAmount: Value(remote.taxAmount),
        discountAmount: Value(remote.discountAmount),
        totalAmount: Value(remote.totalAmount),
        paymentStatus: Value(remote.paymentStatus),
        customerName: Value(remote.customerName),
        customerAddress: Value(remote.customerAddress),
        paymentMethod: Value(remote.paymentMethod),
        staffId: Value(remote.staffId),
        staffName: Value(remote.staffName),
        syncId: Value(remote.syncId),
        updatedAt: Value(remote.updatedAt),
        createdAt: Value(remote.createdAt),
        deviceId: Value(remote.deviceId),
        isDeleted: Value(remote.isDeleted),
      ));
      return localId;
    } else if (remote.updatedAt?.isAfter(
            existing.updatedAt ??
                DateTime.fromMillisecondsSinceEpoch(0)) ??
        false) {
      // Update in place using local id (no id conflict)
      await (db.update(db.invoices)..where((t) => t.id.equals(existing.id)))
          .write(InvoicesCompanion(
        invoiceNumber: Value(remote.invoiceNumber),
        dateCreated: Value(remote.dateCreated),
        subtotal: Value(remote.subtotal),
        taxAmount: Value(remote.taxAmount),
        discountAmount: Value(remote.discountAmount),
        totalAmount: Value(remote.totalAmount),
        paymentStatus: Value(remote.paymentStatus),
        customerName: Value(remote.customerName),
        customerAddress: Value(remote.customerAddress),
        paymentMethod: Value(remote.paymentMethod),
        staffId: Value(remote.staffId),
        staffName: Value(remote.staffName),
        syncId: Value(remote.syncId),
        updatedAt: Value(remote.updatedAt),
        createdAt: Value(remote.createdAt),
        deviceId: Value(remote.deviceId),
        isDeleted: Value(remote.isDeleted),
      ));
      return existing.id;
    }
    return existing.id;
  }

  Future<void> _applyInvoiceItem(SyncRecord record, Map<int, int> invoiceIdMap) async {
    final remote = InvoiceItemTable.fromJson(record.data);
    if (remote.syncId == null) return;

    // Remap invoiceId from the remote device's local id to our local id
    final localInvoiceId = invoiceIdMap[remote.invoiceId] ?? remote.invoiceId;

    final existing = await (db.select(db.invoiceItems)
          ..where((t) => t.syncId.equals(remote.syncId!)))
        .getSingleOrNull();

    if (existing == null) {
      await db.into(db.invoiceItems).insert(InvoiceItemsCompanion(
        invoiceId: Value(localInvoiceId),
        itemId: Value(remote.itemId),
        quantity: Value(remote.quantity),
        unitPrice: Value(remote.unitPrice),
        type: Value(remote.type),
        serviceMeta: Value(remote.serviceMeta),
        syncId: Value(remote.syncId),
        updatedAt: Value(remote.updatedAt),
        createdAt: Value(remote.createdAt),
        deviceId: Value(remote.deviceId),
        isDeleted: Value(remote.isDeleted),
      ));
    } else if (remote.updatedAt?.isAfter(
            existing.updatedAt ??
                DateTime.fromMillisecondsSinceEpoch(0)) ??
        false) {
      await (db.update(db.invoiceItems)
            ..where((t) => t.id.equals(existing.id)))
          .write(InvoiceItemsCompanion(
        invoiceId: Value(localInvoiceId),
        itemId: Value(remote.itemId),
        quantity: Value(remote.quantity),
        unitPrice: Value(remote.unitPrice),
        type: Value(remote.type),
        serviceMeta: Value(remote.serviceMeta),
        syncId: Value(remote.syncId),
        updatedAt: Value(remote.updatedAt),
        deviceId: Value(remote.deviceId),
        isDeleted: Value(remote.isDeleted),
      ));
    }
  }

  Future<void> _applyItem(SyncRecord record) async {
    final remote = ItemTable.fromJson(record.data);
    if (remote.syncId == null) return;

    final existing = await (db.select(db.items)
          ..where((t) => t.syncId.equals(remote.syncId!)))
        .getSingleOrNull();

    if (existing == null) {
      await db.into(db.items).insert(ItemsCompanion(
        name: Value(remote.name),
        category: Value(remote.category),
        categoryId: Value(remote.categoryId),
        price: Value(remote.price),
        stockQty: Value(remote.stockQty),
        image: Value(remote.image),
        type: Value(remote.type),
        billingType: Value(remote.billingType),
        serviceCategory: Value(remote.serviceCategory),
        requiresTimeTracking: Value(remote.requiresTimeTracking),
        syncId: Value(remote.syncId),
        updatedAt: Value(remote.updatedAt),
        createdAt: Value(remote.createdAt),
        deviceId: Value(remote.deviceId),
        isDeleted: Value(remote.isDeleted),
      ));
    } else if (remote.updatedAt?.isAfter(
            existing.updatedAt ??
                DateTime.fromMillisecondsSinceEpoch(0)) ??
        false) {
      await (db.update(db.items)..where((t) => t.id.equals(existing.id)))
          .write(ItemsCompanion(
        name: Value(remote.name),
        category: Value(remote.category),
        categoryId: Value(remote.categoryId),
        price: Value(remote.price),
        stockQty: Value(remote.stockQty),
        image: Value(remote.image),
        type: Value(remote.type),
        billingType: Value(remote.billingType),
        serviceCategory: Value(remote.serviceCategory),
        requiresTimeTracking: Value(remote.requiresTimeTracking),
        syncId: Value(remote.syncId),
        updatedAt: Value(remote.updatedAt),
        createdAt: Value(remote.createdAt),
        deviceId: Value(remote.deviceId),
        isDeleted: Value(remote.isDeleted),
      ));
    }
  }

  Future<void> _applyCategory(SyncRecord record) async {
    final remote = CategoryTable.fromJson(record.data);
    if (remote.syncId == null) return;

    final existing = await (db.select(db.categories)
          ..where((t) => t.syncId.equals(remote.syncId!)))
        .getSingleOrNull();

    if (existing == null) {
      await db.into(db.categories).insert(CategoriesCompanion(
        name: Value(remote.name),
        syncId: Value(remote.syncId),
        updatedAt: Value(remote.updatedAt),
        createdAt: Value(remote.createdAt),
        deviceId: Value(remote.deviceId),
        isDeleted: Value(remote.isDeleted),
      ));
    } else if (remote.updatedAt?.isAfter(
            existing.updatedAt ??
                DateTime.fromMillisecondsSinceEpoch(0)) ??
        false) {
      await (db.update(db.categories)..where((t) => t.id.equals(existing.id)))
          .write(CategoriesCompanion(
        name: Value(remote.name),
        syncId: Value(remote.syncId),
        updatedAt: Value(remote.updatedAt),
        createdAt: Value(remote.createdAt),
        deviceId: Value(remote.deviceId),
        isDeleted: Value(remote.isDeleted),
      ));
    }
  }

  Future<void> _applyStaff(SyncRecord record) async {
    final remote = StaffTable.fromJson(record.data);
    if (remote.syncId == null) return;

    final existing = await (db.select(db.staff)
          ..where((t) => t.syncId.equals(remote.syncId!)))
        .getSingleOrNull();

    if (existing == null) {
      await db.into(db.staff).insert(StaffCompanion(
        name: Value(remote.name),
        staffCode: Value(remote.staffCode),
        isActive: Value(remote.isActive),
        syncId: Value(remote.syncId),
        updatedAt: Value(remote.updatedAt),
        createdAt: Value(remote.createdAt),
        deviceId: Value(remote.deviceId),
        isDeleted: Value(remote.isDeleted),
      ));
    } else if (remote.updatedAt?.isAfter(
            existing.updatedAt ??
                DateTime.fromMillisecondsSinceEpoch(0)) ??
        false) {
      await (db.update(db.staff)..where((t) => t.id.equals(existing.id)))
          .write(StaffCompanion(
        name: Value(remote.name),
        staffCode: Value(remote.staffCode),
        isActive: Value(remote.isActive),
        syncId: Value(remote.syncId),
        updatedAt: Value(remote.updatedAt),
        createdAt: Value(remote.createdAt),
        deviceId: Value(remote.deviceId),
        isDeleted: Value(remote.isDeleted),
      ));
    }
  }
}
