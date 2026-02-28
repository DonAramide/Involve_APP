import 'dart:async';
import 'package:async/async.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:involve_app/core/sync/domain/models/peer_device.dart';
import 'package:involve_app/core/sync/domain/services/discovery_service.dart';
import 'package:involve_app/core/sync/domain/services/bluetooth_discovery_service.dart';
import 'package:involve_app/core/sync/domain/services/sync_manager.dart';
import 'package:involve_app/core/sync/domain/services/sync_server.dart';
import 'package:involve_app/core/sync/domain/services/bluetooth_sync_server.dart';
import 'package:involve_app/core/sync/data/repositories/sync_repository_impl.dart';
import 'package:involve_app/core/sync/domain/services/bluetooth_discovery_service_stub.dart'
    if (dart.library.io) 'package:involve_app/core/sync/domain/services/bluetooth_discovery_service_native.dart'
    if (dart.library.html) 'package:involve_app/core/sync/domain/services/bluetooth_discovery_service_web.dart';

// ─── Events ───────────────────────────────────────────────────────────────────

abstract class SyncEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class InitializeSync extends SyncEvent {}
class StartDiscoveryRequested extends SyncEvent {}
class StopDiscoveryRequested extends SyncEvent {}
class RestartDiscovery extends SyncEvent {}

class ToggleMasterRole extends SyncEvent {
  final bool isMaster;
  ToggleMasterRole(this.isMaster);
  @override
  List<Object?> get props => [isMaster];
}

class SyncPeersUpdated extends SyncEvent {
  final List<PeerDevice> peers;
  SyncPeersUpdated(this.peers);
  @override
  List<Object?> get props => [peers];
}

class ManualSyncTriggered extends SyncEvent {}

class SyncWithPeerTriggered extends SyncEvent {
  final String? ip;
  final int? port;
  final String? bluetoothId;
  final bool isBluetooth;
  final String peerName;

  SyncWithPeerTriggered({
    this.ip,
    this.port,
    this.bluetoothId,
    this.isBluetooth = false,
    required this.peerName,
  });

  @override
  List<Object?> get props => [ip, port, bluetoothId, isBluetooth, peerName];
}

class SyncStatusChanged extends SyncEvent {
  final bool isSyncing;
  SyncStatusChanged(this.isSyncing);
  @override
  List<Object?> get props => [isSyncing];
}

// ─── State ────────────────────────────────────────────────────────────────────

class SyncState extends Equatable {
  final List<PeerDevice> peers;
  final bool isDiscoveryRunning;
  final bool isMaster;
  final bool isServerRunning;
  final bool isSyncing;
  final DateTime? lastSyncTime;
  final String? statusMessage;

  const SyncState({
    this.peers = const [],
    this.isDiscoveryRunning = false,
    this.isMaster = false,
    this.isServerRunning = false,
    this.isSyncing = false,
    this.lastSyncTime,
    this.statusMessage,
  });

  // Sentinel object — allows copyWith to distinguish "not passed" vs explicit null.
  static const _keep = Object();

  SyncState copyWith({
    List<PeerDevice>? peers,
    bool? isDiscoveryRunning,
    bool? isMaster,
    bool? isServerRunning,
    bool? isSyncing,
    DateTime? lastSyncTime,
    Object? statusMessage = _keep,
  }) {
    return SyncState(
      peers: peers ?? this.peers,
      isDiscoveryRunning: isDiscoveryRunning ?? this.isDiscoveryRunning,
      isMaster: isMaster ?? this.isMaster,
      isServerRunning: isServerRunning ?? this.isServerRunning,
      isSyncing: isSyncing ?? this.isSyncing,
      lastSyncTime: lastSyncTime ?? this.lastSyncTime,
      statusMessage: statusMessage == _keep ? this.statusMessage : statusMessage as String?,
    );
  }

  @override
  List<Object?> get props =>
      [peers, isDiscoveryRunning, isMaster, isServerRunning, isSyncing, lastSyncTime, statusMessage];
}

// ─── Bloc ─────────────────────────────────────────────────────────────────────

class SyncBloc extends Bloc<SyncEvent, SyncState> {
  final DiscoveryService discoveryService;
  final BluetoothDiscoveryService bluetoothDiscoveryService;
  final SyncManager syncManager;
  final SyncServer syncServer;
  final BluetoothSyncServer bluetoothSyncServer;
  final SyncRepository syncRepository;
  final AppDatabase db;
  final String deviceId;
  final _uuid = const Uuid();

  StreamSubscription? _peerSubscription;
  StreamSubscription? _statusSubscription;

  SyncBloc({
    required this.discoveryService,
    required this.bluetoothDiscoveryService,
    required this.syncManager,
    required this.syncServer,
    required this.bluetoothSyncServer,
    required this.syncRepository,
    required this.db,
    required this.deviceId,
  }) : super(const SyncState()) {
    on<InitializeSync>(_onInitialize);
    on<StartDiscoveryRequested>(_onStartDiscovery);
    on<StopDiscoveryRequested>(_onStopDiscovery);
    on<ToggleMasterRole>(_onToggleRole);
    on<SyncPeersUpdated>(_onPeersUpdated);
    on<ManualSyncTriggered>(_onManualSync);
    on<SyncWithPeerTriggered>(_onSyncWithPeer);
    on<SyncStatusChanged>(_onStatusChanged);
    on<RestartDiscovery>(_onRestartDiscovery);
  }

  Future<void> _onInitialize(InitializeSync event, Emitter<SyncState> emit) async {
    // Sanitize legacy records: backfill syncId and updatedAt for any records missing them
    if (!kIsWeb) await _backfillSyncIds();

    final meta = await syncRepository.getSyncMeta();
    final isMaster = meta?.isMaster ?? false;

    emit(state.copyWith(
      isMaster: isMaster,
      lastSyncTime: meta?.lastSyncTime,
    ));

    if (isMaster) {
      if (!kIsWeb) await syncServer.start(8080);
      await bluetoothSyncServer.start();
    }

    _statusSubscription?.cancel();
    _statusSubscription = syncManager.statusStream.listen((isSyncing) {
      add(SyncStatusChanged(isSyncing));
    });

    add(StartDiscoveryRequested());
  }

  /// Backfills missing syncId and updatedAt on legacy records so they are
  /// picked up by the delta-sync logic going forward.
  Future<void> _backfillSyncIds() async {
    final now = DateTime.now();

    // Items
    final items = await (db.select(db.items)..where((t) => t.syncId.isNull())).get();
    for (final item in items) {
      await (db.update(db.items)..where((t) => t.id.equals(item.id))).write(
        ItemsCompanion(syncId: Value(_uuid.v4()), updatedAt: Value(now), createdAt: Value(now)),
      );
    }

    // Invoices
    final invoices = await (db.select(db.invoices)..where((t) => t.syncId.isNull())).get();
    for (final inv in invoices) {
      await (db.update(db.invoices)..where((t) => t.id.equals(inv.id))).write(
        InvoicesCompanion(syncId: Value(_uuid.v4()), updatedAt: Value(now), createdAt: Value(inv.dateCreated)),
      );
    }

    // InvoiceItems
    final invoiceItems = await (db.select(db.invoiceItems)..where((t) => t.syncId.isNull())).get();
    for (final ii in invoiceItems) {
      await (db.update(db.invoiceItems)..where((t) => t.id.equals(ii.id))).write(
        InvoiceItemsCompanion(syncId: Value(_uuid.v4()), updatedAt: Value(now), createdAt: Value(now)),
      );
    }

    // Categories
    final categories = await (db.select(db.categories)..where((t) => t.syncId.isNull())).get();
    for (final cat in categories) {
      await (db.update(db.categories)..where((t) => t.id.equals(cat.id))).write(
        CategoriesCompanion(syncId: Value(_uuid.v4()), updatedAt: Value(now), createdAt: Value(now)),
      );
    }

    // Staff
    final staff = await (db.select(db.staff)..where((t) => t.syncId.isNull())).get();
    for (final s in staff) {
      await (db.update(db.staff)..where((t) => t.id.equals(s.id))).write(
        StaffCompanion(syncId: Value(_uuid.v4()), updatedAt: Value(now), createdAt: Value(now)),
      );
    }

    if (items.isNotEmpty || invoices.isNotEmpty || invoiceItems.isNotEmpty || categories.isNotEmpty || staff.isNotEmpty) {
      debugPrint('SyncBloc: Backfilled syncIds for ${items.length} items, ${invoices.length} invoices, '
          '${invoiceItems.length} invoice items, ${categories.length} categories, ${staff.length} staff.');
    }
  }

  Future<void> _onStartDiscovery(StartDiscoveryRequested event, Emitter<SyncState> emit) async {
    if (!kIsWeb) {
      await discoveryService.startDiscovery(
        deviceId: deviceId,
        deviceName: 'Device $deviceId',
        isMaster: state.isMaster,
        authToken: 'PRO-TOKEN-123',
      );
    }

    await bluetoothDiscoveryService.startDiscovery(
      deviceId: deviceId,
      deviceName: 'Device $deviceId',
      isMaster: state.isMaster,
    );

    _peerSubscription?.cancel();
    
    // Merge both streams
    _peerSubscription = StreamGroup.merge([
      discoveryService.peerStream,
      bluetoothDiscoveryService.peerStream,
    ]).listen((peers) {
      add(SyncPeersUpdated(peers));
    });

    syncManager.startAutoSync();

    emit(state.copyWith(isDiscoveryRunning: true));
  }

  Future<void> _onStopDiscovery(StopDiscoveryRequested event, Emitter<SyncState> emit) async {
    discoveryService.stopDiscovery();
    bluetoothDiscoveryService.stopDiscovery();
    _peerSubscription?.cancel();
    syncManager.stop();
    emit(state.copyWith(isDiscoveryRunning: false, peers: []));
  }

  Future<void> _onRestartDiscovery(RestartDiscovery event, Emitter<SyncState> emit) async {
    add(StopDiscoveryRequested());
    await Future.delayed(const Duration(milliseconds: 500));
    add(StartDiscoveryRequested());
  }

  Future<void> _onToggleRole(ToggleMasterRole event, Emitter<SyncState> emit) async {
    // 1. Stop current
    add(StopDiscoveryRequested());
    if (state.isMaster) {
      if (!kIsWeb) syncServer.stop();
      await bluetoothSyncServer.stop();
    }

    // 2. Update DB
    if (!kIsWeb) {
      await syncRepository.saveSyncMeta(SyncMetaCompanion(
        deviceId: Value(deviceId),
        deviceName: Value('Device $deviceId'),
        isMaster: Value(event.isMaster),
      ));
    }

    // 3. Start new
    emit(state.copyWith(isMaster: event.isMaster));
    if (event.isMaster) {
      if (!kIsWeb) await syncServer.start(8080);
      await bluetoothSyncServer.start();
    }
    add(StartDiscoveryRequested());
  }

  void _onPeersUpdated(SyncPeersUpdated event, Emitter<SyncState> emit) {
    // Only update peers — deliberately NOT inheriting statusMessage to avoid stale toasts.
    emit(SyncState(
      peers: event.peers,
      isDiscoveryRunning: state.isDiscoveryRunning,
      isMaster: state.isMaster,
      isServerRunning: state.isServerRunning,
      lastSyncTime: state.lastSyncTime,
      statusMessage: null, // Always clear on peer update — prevents repeated toasts
    ));
  }

  Future<void> _onManualSync(ManualSyncTriggered event, Emitter<SyncState> emit) async {
    emit(state.copyWith(statusMessage: 'Syncing...'));
    await syncManager.syncNow();
    final meta = await syncRepository.getSyncMeta();
    emit(state.copyWith(
      statusMessage: 'Sync Complete ✓',
      lastSyncTime: meta?.lastSyncTime,
    ));
    await Future.delayed(const Duration(seconds: 2));
    emit(state.copyWith(statusMessage: null));
  }

  Future<void> _onSyncWithPeer(SyncWithPeerTriggered event, Emitter<SyncState> emit) async {
    emit(state.copyWith(statusMessage: 'Syncing with ${event.peerName}...'));
    try {
      await syncManager.syncWithPeer(
        event.ip, 
        event.port,
        bluetoothId: event.bluetoothId,
        isBluetooth: event.isBluetooth,
      );
      final meta = await syncRepository.getSyncMeta();
      emit(state.copyWith(
        statusMessage: '✓ Synced with ${event.peerName}',
        lastSyncTime: meta?.lastSyncTime,
      ));
    } catch (e) {
      emit(state.copyWith(statusMessage: '✗ Sync failed: ${e.toString()}'));
    }
    await Future.delayed(const Duration(seconds: 3));
    emit(state.copyWith(statusMessage: null));
  }

  void _onStatusChanged(SyncStatusChanged event, Emitter<SyncState> emit) {
    emit(state.copyWith(isSyncing: event.isSyncing));
  }

  @override
  Future<void> close() {
    _peerSubscription?.cancel();
    _statusSubscription?.cancel();
    return super.close();
  }
}
