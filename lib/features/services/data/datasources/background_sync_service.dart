import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'services_remote_data_source.dart';
import 'package:drift/drift.dart';

class BackgroundSyncService {
  final AppDatabase db;
  final ServicesRemoteDataSource remoteDataSource;
  Timer? _syncTimer;
  bool _isSyncing = false;

  BackgroundSyncService({
    required this.db,
    required this.remoteDataSource,
  });

  void start() {
    _syncTimer?.cancel();
    _syncTimer = Timer.periodic(const Duration(minutes: 2), (_) => syncNow());
    // Initial sync
    syncNow();
  }

  Future<void> syncNow() async {
    if (_isSyncing) return;
    _isSyncing = true;

    try {
      debugPrint('Starting Services Sync...');

      // 1. Sync Customers
      final pendingCustomers = await (db.select(db.serviceCustomers)
            ..where((t) => t.syncStatus.equals('pending')))
          .get();
      if (pendingCustomers.isNotEmpty) {
        await remoteDataSource.syncCustomers(pendingCustomers.map((c) => c.toJson()).toList());
        for (final c in pendingCustomers) {
          await (db.update(db.serviceCustomers)..where((t) => t.id.equals(c.id)))
              .write(const ServiceCustomersCompanion(syncStatus: Value('synced')));
        }
      }

      // 2. Sync Jobs
      final pendingJobs = await (db.select(db.serviceJobs)
            ..where((t) => t.syncStatus.equals('pending')))
          .get();
      if (pendingJobs.isNotEmpty) {
        await remoteDataSource.syncJobs(pendingJobs.map((j) => j.toJson()).toList());
        for (final j in pendingJobs) {
          await (db.update(db.serviceJobs)..where((t) => t.id.equals(j.id)))
              .write(const ServiceJobsCompanion(syncStatus: Value('synced')));
        }
      }

      // 3. Sync Payments
      final pendingPayments = await (db.select(db.servicePayments)
            ..where((t) => t.syncStatus.equals('pending')))
          .get();
      if (pendingPayments.isNotEmpty) {
        await remoteDataSource.syncPayments(pendingPayments.map((p) => p.toJson()).toList());
        for (final p in pendingPayments) {
          await (db.update(db.servicePayments)..where((t) => t.id.equals(p.id)))
              .write(const ServicePaymentsCompanion(syncStatus: Value('synced')));
        }
      }

      debugPrint('Services Sync completed.');
    } catch (e) {
      debugPrint('Services Sync Error: $e');
    } finally {
      _isSyncing = false;
    }
  }

  void stop() {
    _syncTimer?.cancel();
  }
}
