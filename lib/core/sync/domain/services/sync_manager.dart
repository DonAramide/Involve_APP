import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:drift/drift.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:involve_app/core/sync/domain/services/discovery_service.dart';
import 'package:involve_app/core/sync/domain/services/sync_transport.dart';
import 'package:involve_app/core/sync/domain/services/http_sync_transport.dart';
import 'package:involve_app/core/sync/domain/services/bluetooth_sync_transport.dart';
import 'package:involve_app/core/sync/data/repositories/sync_repository_impl.dart';

class SyncManager {
  final AppDatabase database;
  final DiscoveryService discoveryService;
  final SyncRepository syncRepository;
  final String deviceId;
  final String secretToken;
  
  SyncTransport? _transport;
  StreamSubscription? _discoverySubscription;
  Timer? _syncTimer;
  final _statusController = StreamController<bool>.broadcast();
  Stream<bool> get statusStream => _statusController.stream;
  
  bool _isSyncing = false;
  bool get isSyncing => _isSyncing;
  
  set isSyncing(bool value) {
    if (_isSyncing != value) {
      _isSyncing = value;
      _statusController.add(value);
    }
  }

  SyncManager({
    required this.database,
    required this.discoveryService,
    required this.syncRepository,
    required this.deviceId,
    required this.secretToken,
  });

  void startAutoSync() {
    _discoverySubscription = discoveryService.peerStream.listen((peers) {
      final master = peers.where((p) => p.isMaster && p.isOnline).firstOrNull;
      if (master != null && _transport == null) {
        if (master.isBluetooth) {
          _transport = BluetoothSyncTransport(
            bluetoothId: master.bluetoothId!,
            authToken: secretToken,
          );
        } else {
          _transport = HttpSyncTransport(
            baseUrl: 'http://${master.ip}:${master.port}',
            authToken: secretToken,
          );
        }
        _startPeriodicSync();
      } else if (master == null) {
        _transport = null;
        _syncTimer?.cancel();
      }
    });
  }

  void _startPeriodicSync() {
    _syncTimer?.cancel();
    _syncTimer = Timer.periodic(const Duration(minutes: 1), (_) => syncNow());
  }

  Future<void> syncNow() async {
    if (_transport == null || isSyncing) return;

    isSyncing = true;
    try {
      debugPrint('Starting Sync cycle...');
      
      final meta = await syncRepository.getSyncMeta();
      final lastSyncTime = meta?.lastSyncTime ?? DateTime.fromMillisecondsSinceEpoch(0);

      // 1. Gather Local Changes (Delta)
      final localBatch = await syncRepository.getDeltaBatch(lastSyncTime, deviceId);
      if (localBatch.records.isNotEmpty) {
        await _transport!.pushUpdates(localBatch);
      }

      // 2. Pull Updates from Master
      final remoteBatch = await _transport!.pullUpdates(lastSyncTime);
      
      // 3. Process Remote Changes
      await syncRepository.applyBatch(remoteBatch);
      
      // 4. Update state
      await syncRepository.saveSyncMeta(SyncMetaCompanion(
        deviceId: Value(deviceId),
        deviceName: Value('Device $deviceId'),
        lastSyncTime: Value(DateTime.now()),
      ));
      
      debugPrint('Sync completed successfully.');
    } catch (e) {
      debugPrint('Sync Error: $e');
    } finally {
      isSyncing = false;
    }
  }

  void stop() {
    _discoverySubscription?.cancel();
    _syncTimer?.cancel();
    _transport = null;
  }

  /// Performs a one-shot sync with a specific peer device by IP:port.
  /// This is used when the user manually selects a device to sync from
  /// in the Device Sync page.
  Future<void> syncWithPeer(String? ip, int? port, {String? bluetoothId, bool isBluetooth = false}) async {
    if (isSyncing) return;
    isSyncing = true;
    
    final SyncTransport transport = isBluetooth 
      ? BluetoothSyncTransport(bluetoothId: bluetoothId!, authToken: secretToken)
      : HttpSyncTransport(baseUrl: 'http://$ip:$port', authToken: secretToken);

    try {
      debugPrint('Manual sync with peer ${isBluetooth ? bluetoothId : ip}...');

      final meta = await syncRepository.getSyncMeta();
      // Use epoch 0 to pull ALL records from the selected peer,
      // not just the delta since last sync.
      final since = DateTime.fromMillisecondsSinceEpoch(0);
      
      // 1. Push local changes
      final localBatch = await syncRepository.getDeltaBatch(
        meta?.lastSyncTime ?? since,
        deviceId,
      );
      if (localBatch.records.isNotEmpty) {
        await transport.pushUpdates(localBatch);
      }

      // 2. Pull all data from the selected peer
      final remoteBatch = await transport.pullUpdates(since);
      await syncRepository.applyBatch(remoteBatch);

      await syncRepository.saveSyncMeta(SyncMetaCompanion(
        deviceId: Value(deviceId),
        deviceName: Value('Device $deviceId'),
        lastSyncTime: Value(DateTime.now()),
      ));

      debugPrint('Manual peer sync completed.');
    } catch (e) {
      debugPrint('Manual peer sync error: $e');
      rethrow;
    } finally {
      transport.dispose();
      isSyncing = false;
    }
  }

  void dispose() {
    _statusController.close();
  }
}
