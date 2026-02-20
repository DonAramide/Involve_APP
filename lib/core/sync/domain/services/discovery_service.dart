import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:network_info_plus/network_info_plus.dart';
import '../models/peer_device.dart';

class DiscoveryService {
  static const int broadcastPort = 5555;
  final _peerController = StreamController<List<PeerDevice>>.broadcast();
  final Map<String, PeerDevice> _peers = {};
  Timer? _broadcastTimer;
  Timer? _cleanupTimer;
  RawDatagramSocket? _socket;
  
  Stream<List<PeerDevice>> get peerStream => _peerController.stream;

  Future<void> startDiscovery({
    required String deviceId,
    required String deviceName,
    required bool isMaster,
    String? authToken,
  }) async {
    if (kIsWeb) return;
    if (_socket != null) return;

    try {
      _socket = await RawDatagramSocket.bind(InternetAddress.anyIPv4, broadcastPort, reuseAddress: true);
      _socket?.broadcastEnabled = true;

      _socket?.listen((RawSocketEvent event) {
        if (event == RawSocketEvent.read) {
          final datagram = _socket?.receive();
          if (datagram != null) {
            _handlePacket(datagram.data);
          }
        }
      });

      _broadcastTimer = Timer.periodic(const Duration(seconds: 5), (_) async {
        final ip = await NetworkInfo().getWifiIP();
        if (ip == null) return;

        final identity = PeerDevice(
          deviceId: deviceId,
          deviceName: deviceName,
          ip: ip,
          port: 8080, // Target sync port
          isMaster: isMaster,
          authToken: authToken,
          lastSeen: DateTime.now(),
        );

        final data = jsonEncode(identity.toJson());
        _socket?.send(utf8.encode(data), InternetAddress('255.255.255.255'), broadcastPort);
      });

      _cleanupTimer = Timer.periodic(const Duration(seconds: 10), (_) {
        final now = DateTime.now();
        _peers.removeWhere((id, peer) => now.difference(peer.lastSeen).inSeconds > 10);
        _peerController.add(_peers.values.toList());
      });
    } catch (e) {
      debugPrint('Discovery Error: $e');
    }
  }

  void _handlePacket(Uint8List data) {
    try {
      final json = jsonDecode(utf8.decode(data));
      final peer = PeerDevice.fromJson(json);
      _peers[peer.deviceId] = peer;
      _peerController.add(_peers.values.toList());
    } catch (e) {
      // Ignore invalid packets
    }
  }

  void stopDiscovery() {
    _broadcastTimer?.cancel();
    _cleanupTimer?.cancel();
    _socket?.close();
    _socket = null;
    _peers.clear();
    _peerController.add([]);
  }

  void dispose() {
    stopDiscovery();
    _peerController.close();
  }
}
