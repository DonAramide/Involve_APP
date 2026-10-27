import 'dart:async';
import 'package:flutter/foundation.dart';
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
  Timer? _rescanTimer;

  @override
  Stream<List<PeerDevice>> get peerStream => _peerController.stream;

  @override
  Future<void> startDiscovery({
    required String deviceId,
    required String deviceName,
    required bool isMaster,
  }) async {
    // 1. Check/Request Permissions (Assuming handled by app-level permission manager)
    
    _rescanTimer?.cancel();
    _scanSubscription?.cancel();

    // 2. Start Scanning
    _scanSubscription = FlutterBluePlus.onScanResults.listen((results) {
      for (ScanResult r in results) {
        final advertised = r.device.platformName.trim().toUpperCase();
        if (!advertised.startsWith('IV-')) continue;
        final code = advertised.substring(3).trim();
        if (code.length < 4) continue;
        final peer = PeerDevice(
            deviceId: code,
            deviceName: 'Invify $code',
            hardwareId: code,
            bluetoothId: r.device.remoteId.str,
            isBluetooth: true,
            isMaster: false, // Will verify on connection
            lastSeen: DateTime.now(),
          );
          _peers[peer.deviceId] = peer;
          _peerController.add(_peers.values.toList());
      }
    });

    final adapterState = await FlutterBluePlus.adapterState.first.timeout(
      const Duration(seconds: 2),
      onTimeout: () => BluetoothAdapterState.unknown,
    );
    if (adapterState != BluetoothAdapterState.on) {
      debugPrint('[BLE] Adapter is $adapterState — skip peer scan');
      return;
    }

    Future<void> scanOnce() async {
      try {
        if (FlutterBluePlus.isScanningNow) return;
        await FlutterBluePlus.startScan(timeout: const Duration(seconds: 5));
      } catch (e) {
        debugPrint('[BLE] startScan failed: $e');
      }
    }

    unawaited(scanOnce());
    _rescanTimer?.cancel();
    _rescanTimer = Timer.periodic(const Duration(seconds: 12), (_) {
      unawaited(scanOnce());
    });
  }

  @override
  void stopDiscovery() {
    _rescanTimer?.cancel();
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
