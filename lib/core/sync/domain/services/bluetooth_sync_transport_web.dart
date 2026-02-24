import 'dart:async';
import 'dart:typed_data';
import 'dart:convert';
import 'package:flutter_web_bluetooth/flutter_web_bluetooth.dart';
import '../models/sync_models.dart';
import 'sync_transport.dart';
import 'bluetooth_constants.dart';

SyncTransport createBluetoothTransport(String bluetoothId, String authToken) {
  return BluetoothSyncTransportWeb(bluetoothId: bluetoothId, authToken: authToken);
}

class BluetoothSyncTransportWeb implements SyncTransport {
  final String bluetoothId;
  final String authToken;
  BluetoothDevice? _device;
  BluetoothCharacteristic? _dataChar;

  BluetoothSyncTransportWeb({required this.bluetoothId, required this.authToken});

  @override
  Future<bool> checkHealth() async {
    // Basic connectivity check
    return _device != null && (await _device!.connected.first);
  }

  Future<void> _ensureConnected() async {
    if (_device != null && (await _device!.connected.first)) return;
    
    // In Web, we'd ideally have the device from discovery.
    // For now, this is a placeholder for the connection logic.
    // Web Bluetooth requires user gesture for the initial requestDevice call, 
    // but subsequent connections to a KNOWN device might be limited.
  }

  @override
  Future<SyncBatch> pullUpdates(DateTime lastSyncTime) async {
    await _ensureConnected();
    
    final completer = Completer<SyncBatch>();
    String accumulatedData = "";

    // 1. Subscribe to notifications
    final subscription = _dataChar!.value.listen((value) {
      final decoded = utf8.decode(value.buffer.asUint8List());
      if (decoded.startsWith(BluetoothSyncConstants.chunkStart)) {
        accumulatedData += decoded.substring(BluetoothSyncConstants.chunkStart.length);
      }
      if (decoded.endsWith(BluetoothSyncConstants.chunkEnd)) {
        accumulatedData = accumulatedData.substring(0, accumulatedData.length - BluetoothSyncConstants.chunkEnd.length);
        final json = jsonDecode(accumulatedData);
        completer.complete(SyncBatch.fromJson(json));
      }
    });

    // 2. Send request
    final request = "${BluetoothSyncConstants.msgPull}${lastSyncTime.toIso8601String()}";
    await _dataChar!.writeValueWithoutResponse(utf8.encode(request));

    try {
      return await completer.future.timeout(const Duration(seconds: 30));
    } finally {
      subscription.cancel();
    }
  }

  @override
  Future<void> pushUpdates(SyncBatch batch) async {
    await _ensureConnected();
    
    final jsonData = jsonEncode(batch.toJson());
    final fullPayload = "${BluetoothSyncConstants.chunkStart}$jsonData${BluetoothSyncConstants.chunkEnd}";
    final bytes = utf8.encode(fullPayload);
    
    // Chunked write
    const chunkSize = 180; // Safe for most MTUs
    for (int i = 0; i < bytes.length; i += chunkSize) {
      final end = (i + chunkSize < bytes.length) ? i + chunkSize : bytes.length;
      await _dataChar!.writeValueWithoutResponse(Uint8List.fromList(bytes.sublist(i, end)));
      await Future.delayed(const Duration(milliseconds: 50)); // Flow control
    }
  }

  @override
  void dispose() {
    _device?.disconnect();
  }
}
