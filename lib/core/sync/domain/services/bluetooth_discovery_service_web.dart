import 'dart:async';
import 'package:flutter_web_bluetooth/flutter_web_bluetooth.dart';
import '../models/peer_device.dart';
import 'bluetooth_discovery_service.dart';

BluetoothDiscoveryService createBluetoothDiscoveryService() {
  return BluetoothDiscoveryServiceWeb();
}

class BluetoothDiscoveryServiceWeb implements BluetoothDiscoveryService {
  final _peerController = StreamController<List<PeerDevice>>.broadcast();
  final Map<String, PeerDevice> _peers = {};

  @override
  Stream<List<PeerDevice>> get peerStream => _peerController.stream;

  @override
  Future<void> startDiscovery({
    required String deviceId,
    required String deviceName,
    required bool isMaster,
  }) async {
    // Web Bluetooth requires a user gesture. 
    // This will be triggered by a "Find Bluetooth Devices" button in the UI.
    try {
      final isSupported = await FlutterWebBluetooth.instance.isAvailable.first;
      if (!isSupported) {
        throw Exception('Bluetooth not supported on this browser.');
      }

      final device = await FlutterWebBluetooth.instance.requestDevice(
        RequestOptionsBuilder.acceptAllDevices(),
      );

      final peer = PeerDevice(
        deviceId: device.id,
        deviceName: device.name ?? 'Unknown Device',
        bluetoothId: device.id,
        isBluetooth: true,
        isMaster: false, // We'll verify this upon connection
        lastSeen: DateTime.now(),
      );

      _peers[device.id] = peer;
      _peerController.add(_peers.values.toList());
    } catch (e) {
      // Silently fail or log to a better service
    }
  }

  @override
  void stopDiscovery() {
    _peers.clear();
    _peerController.add([]);
  }

  @override
  void dispose() {
    stopDiscovery();
    _peerController.close();
  }
}
