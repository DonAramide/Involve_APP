import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/sync_models.dart';
import 'sync_transport.dart';
import 'bluetooth_sync_transport_stub.dart'
  if (dart.library.io) 'bluetooth_sync_transport_native.dart'
  if (dart.library.html) 'bluetooth_sync_transport_web.dart';

class BluetoothSyncTransport implements SyncTransport {
  final String bluetoothId;
  final String authToken;
  late final SyncTransport _delegate;

  BluetoothSyncTransport({required this.bluetoothId, required this.authToken}) {
    _delegate = createBluetoothTransport(bluetoothId, authToken);
  }

  @override
  Future<bool> checkHealth() => _delegate.checkHealth();

  @override
  Future<SyncBatch> pullUpdates(DateTime lastSyncTime) => _delegate.pullUpdates(lastSyncTime);

  @override
  Future<void> pushUpdates(SyncBatch batch) => _delegate.pushUpdates(batch);

  @override
  void dispose() => _delegate.dispose();
}
