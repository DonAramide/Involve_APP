import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:flutter/foundation.dart';
import '../bloc/sync_bloc.dart';
import '../../domain/models/peer_device.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

class DeviceSyncPage extends StatelessWidget {
  const DeviceSyncPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Device Synchronization'),
        centerTitle: true,
        actions: [
          BlocBuilder<SyncBloc, SyncState>(
            builder: (context, state) {
              return IconButton(
                icon: state.isDiscoveryRunning && state.peers.isEmpty 
                    ? const Icon(Icons.sync, color: Colors.white)
                    : const Icon(Icons.refresh),
                onPressed: () => context.read<SyncBloc>().add(RestartDiscovery()),
                tooltip: 'Refresh / Restart Discovery',
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: BlocConsumer<SyncBloc, SyncState>(
        // Only show toast when statusMessage actually changes to a non-null value
        listenWhen: (previous, current) =>
            current.statusMessage != null &&
            current.statusMessage != previous.statusMessage,
        listener: (context, state) {
          ScaffoldMessenger.of(context)
            ..clearSnackBars()
            ..showSnackBar(
              SnackBar(
                content: Text(state.statusMessage!),
                duration: const Duration(seconds: 3),
              ),
            );
        },
        builder: (context, state) {
          final visiblePeers = state.peers
              .where((peer) => state.isMaster ? !peer.isMaster : peer.isMaster)
              .toList();
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (state.isSyncing)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 16.0),
                    child: LinearProgressIndicator(),
                  ),
                if (kIsWeb)
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.orange.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.orange.withOpacity(0.3)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.warning_amber_rounded, color: Colors.orange),
                        SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'WiFi sync is restricted on Web. Use Bluetooth Sync to connect to mobile devices.',
                            style: TextStyle(fontSize: 13, color: Colors.orange),
                          ),
                        ),
                      ],
                    ),
                  ),
                _buildRoleCard(context, state),
                const SizedBox(height: 24),
                _buildStatusCard(context, state),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      state.isMaster ? 'Client devices' : 'Master device',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    if (visiblePeers.isNotEmpty)
                      Text(
                        '${visiblePeers.length} found',
                        style: TextStyle(color: Colors.grey[600], fontSize: 13),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                if (visiblePeers.isEmpty)
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 32.0),
                      child: Column(
                        children: [
                          const Icon(Icons.devices_other, size: 48, color: Colors.grey),
                          const SizedBox(height: 12),
                          Text(state.isMaster ? 'No client devices found' : 'No master device found'),
                          const SizedBox(height: 4),
                          Text(
                            kIsWeb 
                              ? 'Make sure Bluetooth is enabled and devices are nearby'
                              : 'Make sure both devices are on the same WiFi or have Bluetooth on',
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: Colors.grey, fontSize: 12),
                          ),
                          if (state.isDiscoveryRunning) ...[
                            const SizedBox(height: 24),
                            const InvifyLoadingIndicator(message: 'Looking for nearby devices...'),
                            const SizedBox(height: 16),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.wifi, size: 16, color: Colors.blue.withOpacity(0.7)),
                                const SizedBox(width: 8),
                                const Text(
                                  'Scanning via Wi-Fi & Bluetooth...',
                                  style: TextStyle(fontSize: 12, color: Colors.blue, fontWeight: FontWeight.w500),
                                ),
                                const SizedBox(width: 8),
                                Icon(Icons.bluetooth, size: 16, color: Colors.blue.withOpacity(0.7)),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  )
                else
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: visiblePeers.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final peer = visiblePeers[index];
                      return _buildDeviceTile(context, peer, state);
                    },
                  ),
                const SizedBox(height: 24),
                _buildSyncTip(context, state),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildRoleCard(BuildContext context, SyncState state) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white.withOpacity(0.1) : Colors.black.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    state.isMaster ? Icons.dns : Icons.phone_android,
                    color: isDark ? Colors.white : Colors.black,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        state.isMaster ? 'Master Device (Server)' : 'Client Device',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        state.isMaster
                            ? 'This device pulls data from each client. Match the client ID below.'
                            : 'This phone sends its data to the master. The master pulls it. Match the master ID below.',
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: state.isMaster,
                  onChanged: (value) {
                    context.read<SyncBloc>().add(ToggleMasterRole(value));
                  },
                ),
              ],
            ),
            const Divider(height: 28),
            _buildInfoRow(
              context,
              'Device name',
              state.localDeviceName.isEmpty ? 'This device' : state.localDeviceName,
              theme.colorScheme.onSurface,
            ),
            const SizedBox(height: 12),
            _buildInfoRow(
              context,
              'Device ID',
              state.localDeviceId.isEmpty ? '—' : state.localDeviceId,
              theme.colorScheme.primary,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusCard(BuildContext context, SyncState state) {
    final dateFormat = DateFormat('MMM dd, HH:mm');
    final lastSyncStr = state.lastSyncTime != null
        ? dateFormat.format(state.lastSyncTime!)
        : 'Never';

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            _buildInfoRow(
              context,
              'Discovery',
              state.isDiscoveryRunning ? 'Active' : 'Offline',
              state.isDiscoveryRunning ? Colors.green : Colors.grey,
            ),
            const Divider(height: 32),
            _buildInfoRow(
              context,
              'Last Synchronized',
              lastSyncStr,
              Theme.of(context).primaryColor,
            ),
            const SizedBox(height: 20),
            if (state.isMaster)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: (state.isDiscoveryRunning && !state.isSyncing)
                      ? () => context.read<SyncBloc>().add(ManualSyncTriggered())
                      : null,
                  icon: state.isSyncing
                    ? const Icon(Icons.sync, size: 18)
                    : const Icon(Icons.sync),
                  label: Text(state.isSyncing ? 'Pulling...' : 'Pull from clients'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              )
            else
              const Text(
                'Auto sync stays on the master. This phone only sends its data when the master pulls.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: Colors.grey),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(BuildContext context, String label, String value, Color valueColor) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontWeight: FontWeight.w500),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: SelectableText(
            value,
            textAlign: TextAlign.end,
            style: TextStyle(
              color: valueColor,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDeviceTile(BuildContext context, PeerDevice peer, SyncState state) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final canSync = state.isMaster && !peer.isMaster && peer.isOnline;

    return Card(
      elevation: 0,
      color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey[100],
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        isThreeLine: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: CircleAvatar(
          backgroundColor: peer.isOnline
              ? Colors.green.withOpacity(0.15)
              : Colors.grey.withOpacity(0.15),
          child: Icon(
            peer.isBluetooth 
              ? Icons.bluetooth 
              : Icons.wifi,
            color: peer.isOnline ? Colors.green : Colors.grey,
            size: 20,
          ),
        ),
        title: Text(
          peer.deviceName,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          'ID ${peer.confirmId}\n'
          '${peer.isBluetooth ? "Bluetooth" : peer.ip} · ${peer.isMaster ? "Master" : "Client"} · '
          '${peer.isOnline ? "Online" : "Offline"}',
          style: const TextStyle(fontSize: 12),
        ),
        trailing: canSync
            ? FilledButton.tonal(
                onPressed: () {
                  context.read<SyncBloc>().add(SyncWithPeerTriggered(
                        ip: peer.ip,
                        port: peer.port,
                        bluetoothId: peer.bluetoothId,
                        isBluetooth: peer.isBluetooth,
                        authToken: peer.authToken,
                        peerName: peer.deviceName,
                      ));
                },
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
                child: const Text('Pull'),
              )
            : Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: peer.isOnline ? Colors.green : Colors.red,
                  shape: BoxShape.circle,
                ),
              ),
      ),
    );
  }

  Widget _buildSyncTip(BuildContext context, SyncState state) {
    final message = state.isMaster
        ? 'Pull copies all data from each client onto this phone. Nothing is sent back to the client.'
        : 'Leave this phone on. The master pulls all of its data. This phone does not pull from the master.';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue.withOpacity(0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          const Icon(Icons.info_outline, color: Colors.blue, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(fontSize: 13, color: Colors.blue),
            ),
          ),
        ],
      ),
    );
  }
}
