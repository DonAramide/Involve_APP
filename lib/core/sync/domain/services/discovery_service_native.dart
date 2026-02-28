import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import '../models/peer_device.dart';

class DiscoveryService {
  RawDatagramSocket? _socket;
  Timer? _broadcastTimer;
  final _peerController = StreamController<List<PeerDevice>>.broadcast();
  final Map<String, PeerDevice> _discoveredPeers = {};

  Stream<List<PeerDevice>> get peerStream => _peerController.stream;

  Future<void> startDiscovery({
    required String deviceId,
    required String deviceName,
    required bool isMaster,
    String? authToken,
  }) async {
    if (kIsWeb) return;

    try {
      _socket = await RawDatagramSocket.bind(InternetAddress.anyIPv4, 8888, reuseAddress: true);
      _socket!.multicastLoopback = true;
      _socket!.broadcastEnabled = true;

      _socket!.listen((RawSocketEvent event) {
        if (event == RawSocketEvent.read) {
          final datagram = _socket!.receive();
          if (datagram != null) {
            _handlePacket(datagram.data, datagram.address.address, deviceId);
          }
        }
      });

      _broadcastTimer = Timer.periodic(const Duration(seconds: 5), (_) => _sendAnnouncement(deviceId, deviceName, isMaster, authToken));
      
      // Cleanup stale peers
      Timer.periodic(const Duration(seconds: 15), (_) {
        final now = DateTime.now();
        final initialCount = _discoveredPeers.length;
        _discoveredPeers.removeWhere((id, peer) => !peer.isOnline);
        if (_discoveredPeers.length != initialCount) {
          _peerController.add(_discoveredPeers.values.toList());
        }
      });

    } catch (e) {
      debugPrint('Discovery Error: $e');
    }
  }

  void _sendAnnouncement(String deviceId, String deviceName, bool isMaster, String? authToken) {
    if (_socket == null) return;
    
    final announcement = {
      'deviceId': deviceId,
      'deviceName': deviceName,
      'isMaster': isMaster,
      'port': 8080,
      'authToken': authToken,
      'timestamp': DateTime.now().toIso8601String(),
    };

    final bytes = utf8.encode(jsonEncode(announcement));
    _socket!.send(bytes, InternetAddress('255.255.255.255'), 8888);
  }

  void _handlePacket(Uint8List data, String ip, String selfId) {
    try {
      final json = jsonDecode(utf8.decode(data));
      final id = json['deviceId'];
      if (id == selfId) return;

      _discoveredPeers[id] = PeerDevice(
        deviceId: id,
        deviceName: json['deviceName'] ?? 'Unknown',
        ip: ip,
        port: json['port'],
        isMaster: json['isMaster'] ?? false,
        authToken: json['authToken'],
        lastSeen: DateTime.now(),
      );
      
      _peerController.add(_discoveredPeers.values.toList());
    } catch (e) {
      // Ignore malformed packets
    }
  }

  void stopDiscovery() {
    _broadcastTimer?.cancel();
    _socket?.close();
    _socket = null;
  }
}
