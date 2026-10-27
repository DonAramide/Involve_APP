import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:drift/drift.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:involve_app/core/sync/domain/models/peer_device.dart';
import 'package:involve_app/core/sync/domain/services/discovery_service.dart';
import 'package:involve_app/core/sync/domain/services/sync_transport.dart';
import 'package:involve_app/core/sync/domain/services/http_sync_transport.dart';
import 'package:involve_app/core/sync/domain/services/bluetooth_sync_transport.dart';
import 'package:involve_app/core/sync/data/repositories/sync_repository_impl.dart';

class SyncManager {
  final AppDatabase database;
  final DiscoveryService discoveryService;
  final SyncRepository syncRepository;
  final String deviceId;
  final String secretToken;
  
  StreamSubscription? _discoverySubscription;
  Timer? _syncTimer;
  final _statusController = StreamController<bool>.broadcast();
  Stream<bool> get statusStream => _statusController.stream;
  
  bool _isSyncing = false;
  bool _pullFromClients = false;
  List<PeerDevice> _clients = [];
  bool get isSyncing => _isSyncing;
  
  set isSyncing(bool value) {
    if (_isSyncing != value) {
      _isSyncing = value;
      _statusController.add(value);
    }
  }

  SyncManager({
    required this.database,
    required this.discoveryService,
    required this.syncRepository,
    required this.deviceId,
    required this.secretToken,
  });

  /// Only the master pulls. Clients keep their data available and do not sync on their own.
  void startAutoSync({required bool pullFromClients}) {
    _discoverySubscription?.cancel();
    _syncTimer?.cancel();
    _pullFromClients = pullFromClients;
    if (!pullFromClients) return;

    _discoverySubscription = discoveryService.peerStream.listen((peers) {
      notePeers(peers);
    });
    _syncTimer = Timer.periodic(const Duration(minutes: 1), (_) {
      syncNow().catchError((Object error) {
        debugPrint('Sync Error: $error');
      });
    });
  }

  void notePeers(List<PeerDevice> peers) {
    _clients = peers.where((peer) => !peer.isMaster && peer.isOnline).toList();
  }

  Future<void> syncNow() async {
    if (!_pullFromClients || isSyncing) return;
    if (_clients.isEmpty) return;

    isSyncing = true;
    try {
      for (final client in List<PeerDevice>.from(_clients)) {
        await _pullPeer(client);
      }
      await syncRepository.saveSyncMeta(SyncMetaCompanion(
        deviceId: Value(deviceId),
        deviceName: Value('Device $deviceId'),
        lastSyncTime: Value(DateTime.now()),
      ));
      debugPrint('Pulled client data onto the master.');
    } catch (e) {
      debugPrint('Sync Error: $e');
      rethrow;
    } finally {
      isSyncing = false;
    }
  }

  void stop() {
    _discoverySubscription?.cancel();
    _syncTimer?.cancel();
    _pullFromClients = false;
    _clients = [];
  }

  /// Master copies every record from one client. Nothing is written back to the client.
  Future<void> syncWithPeer(
    String? ip,
    int? port, {
    String? bluetoothId,
    bool isBluetooth = false,
    String? authToken,
  }) async {
    if (isSyncing) return;
    isSyncing = true;
    try {
      await _pullPeer(PeerDevice(
        deviceId: isBluetooth ? (bluetoothId ?? '') : (ip ?? ''),
        deviceName: 'Client',
        ip: ip,
        port: port,
        bluetoothId: bluetoothId,
        isBluetooth: isBluetooth,
        isMaster: false,
        authToken: authToken,
        lastSeen: DateTime.now(),
      ));
      await syncRepository.saveSyncMeta(SyncMetaCompanion(
        deviceId: Value(deviceId),
        deviceName: Value('Device $deviceId'),
        lastSyncTime: Value(DateTime.now()),
      ));
    } finally {
      isSyncing = false;
    }
  }

  Future<void> _pullPeer(PeerDevice peer) async {
    final token = (peer.authToken ?? secretToken).trim();
    if (!peer.isBluetooth && (peer.ip == null || peer.port == null)) {
      throw Exception('Client has no network address');
    }
    final SyncTransport transport = peer.isBluetooth
        ? BluetoothSyncTransport(bluetoothId: peer.bluetoothId!, authToken: token)
        : HttpSyncTransport(baseUrl: 'http://${peer.ip}:${peer.port}', authToken: token);
    try {
      final remoteBatch = await transport.pullUpdates(DateTime.fromMillisecondsSinceEpoch(0));
      await syncRepository.applyBatch(remoteBatch);
    } finally {
      transport.dispose();
    }
  }

  void dispose() {
    _statusController.close();
  }
}
