import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_ble_peripheral/flutter_ble_peripheral.dart';
import 'package:involve_app/core/sync/data/repositories/sync_repository_impl.dart';
import 'bluetooth_constants.dart';

class BluetoothSyncServer {
  final SyncRepository syncRepository;
  final String deviceId;
  
  final _peripheral = FlutterBlePeripheral();
  bool _isRunning = false;

  BluetoothSyncServer({required this.syncRepository, required this.deviceId});

  Future<void> start() async {
    if (kIsWeb) return;
    if (_isRunning) return;

    final advertiseData = AdvertiseData(
      serviceUuid: BluetoothSyncConstants.serviceUuid,
      localName: 'Device $deviceId',
    );

    await _peripheral.start(advertiseData: advertiseData);
    
    // Note: GATT Server characteristic handling depends on the plugin's ability 
    // to provide callbacks for writes/reads. 
    // In a production app, we would use a more robust GATT Server implementation.
    // This is a foundational implementation.
    
    _isRunning = true;
    debugPrint('Bluetooth Sync Server (Advertising) started.');
  }

  Future<void> stop() async {
    await _peripheral.stop();
    _isRunning = false;
  }
}
