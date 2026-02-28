import 'dart:async';
import '../models/peer_device.dart';

class DiscoveryService {
  final _peerController = StreamController<List<PeerDevice>>.broadcast();
  Stream<List<PeerDevice>> get peerStream => _peerController.stream;

  Future<void> startDiscovery({
    required String deviceId,
    required String deviceName,
    required bool isMaster,
    String? authToken,
  }) async {
    // No-op on Web
  }

  void stopDiscovery() {
    // No-op on Web
  }
}
