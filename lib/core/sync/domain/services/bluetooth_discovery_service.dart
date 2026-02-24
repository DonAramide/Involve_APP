import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/peer_device.dart';

/// Abstract class to handle Bluetooth discovery across platforms.
abstract class BluetoothDiscoveryService {
  Stream<List<PeerDevice>> get peerStream;
  
  Future<void> startDiscovery({
    required String deviceId,
    required String deviceName,
    required bool isMaster,
  });

  void stopDiscovery();
  void dispose();
}
