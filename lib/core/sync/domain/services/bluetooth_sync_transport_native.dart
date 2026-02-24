import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import '../models/sync_models.dart';
import 'sync_transport.dart';
import 'bluetooth_constants.dart';

SyncTransport createBluetoothTransport(String bluetoothId, String authToken) {
  return BluetoothSyncTransportNative(bluetoothId: bluetoothId, authToken: authToken);
}

class BluetoothSyncTransportNative implements SyncTransport {
  final String bluetoothId;
  final String authToken;
  BluetoothDevice? _device;
  BluetoothCharacteristic? _dataChar;

  BluetoothSyncTransportNative({required this.bluetoothId, required this.authToken});

  @override
  Future<bool> checkHealth() async {
    return _device != null && (await _device!.connectionState.first) == BluetoothConnectionState.connected;
  }

  Future<void> _ensureConnected() async {
    if (_device != null && (await _device!.connectionState.first) == BluetoothConnectionState.connected) return;
    
    _device = BluetoothDevice.fromId(bluetoothId);
    await _device!.connect();
    
    final services = await _device!.discoverServices();
    final service = services.firstWhere((s) => s.uuid.toString() == BluetoothSyncConstants.serviceUuid);
    _dataChar = service.characteristics.firstWhere((c) => c.uuid.toString() == BluetoothSyncConstants.dataCharUuid);
  }

  @override
  Future<SyncBatch> pullUpdates(DateTime lastSyncTime) async {
    await _ensureConnected();
    
    final completer = Completer<SyncBatch>();
    String accumulatedData = "";

    // 1. Subscribe
    final subscription = _dataChar!.onValueReceived.listen((value) {
      final decoded = utf8.decode(value);
      if (decoded.startsWith(BluetoothSyncConstants.chunkStart)) {
        accumulatedData += decoded.substring(BluetoothSyncConstants.chunkStart.length);
      }
      if (decoded.endsWith(BluetoothSyncConstants.chunkEnd)) {
        accumulatedData = accumulatedData.substring(0, accumulatedData.length - BluetoothSyncConstants.chunkEnd.length);
        final json = jsonDecode(accumulatedData);
        completer.complete(SyncBatch.fromJson(json));
      }
    });

    await _dataChar!.setNotifyValue(true);

    // 2. Send request
    final request = "${BluetoothSyncConstants.msgPull}${lastSyncTime.toIso8601String()}";
    await _dataChar!.write(utf8.encode(request));

    try {
      return await completer.future.timeout(const Duration(seconds: 45));
    } finally {
      subscription.cancel();
      await _dataChar!.setNotifyValue(false);
    }
  }

  @override
  Future<void> pushUpdates(SyncBatch batch) async {
    await _ensureConnected();
    
    final jsonData = jsonEncode(batch.toJson());
    final fullPayload = "${BluetoothSyncConstants.chunkStart}$jsonData${BluetoothSyncConstants.chunkEnd}";
    final bytes = utf8.encode(fullPayload);
    
    // Chunked write
    const chunkSize = 180; 
    for (int i = 0; i < bytes.length; i += chunkSize) {
      final end = (i + chunkSize < bytes.length) ? i + chunkSize : bytes.length;
      await _dataChar!.write(Uint8List.fromList(bytes.sublist(i, end)), withoutResponse: true);
      await Future.delayed(const Duration(milliseconds: 50)); 
    }
  }

  @override
  void dispose() {
    _device?.disconnect();
  }
}
