import 'dart:async';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import '../models/peer_device.dart';
import 'bluetooth_discovery_service.dart';

BluetoothDiscoveryService createBluetoothDiscoveryService() {
  return BluetoothDiscoveryServiceNative();
}

class BluetoothDiscoveryServiceNative implements BluetoothDiscoveryService {
  final _peerController = StreamController<List<PeerDevice>>.broadcast();
  final Map<String, PeerDevice> _peers = {};
  StreamSubscription? _scanSubscription;

  @override
  Stream<List<PeerDevice>> get peerStream => _peerController.stream;

  @override
  Future<void> startDiscovery({
    required String deviceId,
    required String deviceName,
    required bool isMaster,
  }) async {
    // 1. Check/Request Permissions (Assuming handled by app-level permission manager)
    
    // 2. Start Scanning
    _scanSubscription = FlutterBluePlus.onScanResults.listen((results) {
      for (ScanResult r in results) {
        // Remove restrictive "Device" name filter to see all possible peers
        final peer = PeerDevice(
            deviceId: r.device.remoteId.str,
            deviceName: r.device.platformName.isEmpty ? 'Unknown BLE' : r.device.platformName,
            bluetoothId: r.device.remoteId.str,
            isBluetooth: true,
            isMaster: false, // Will verify on connection
            lastSeen: DateTime.now(),
          );
          _peers[peer.deviceId] = peer;
          _peerController.add(_peers.values.toList());
      }
    });

    await FlutterBluePlus.startScan(timeout: const Duration(seconds: 15));
  }

  @override
  void stopDiscovery() {
    FlutterBluePlus.stopScan();
    _scanSubscription?.cancel();
    _peers.clear();
    _peerController.add([]);
  }

  @override
  void dispose() {
    stopDiscovery();
    _peerController.close();
  }
}
