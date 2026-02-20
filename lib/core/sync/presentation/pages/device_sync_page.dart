import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:flutter/foundation.dart';
import '../bloc/sync_bloc.dart';
import '../../domain/models/peer_device.dart';

class DeviceSyncPage extends StatelessWidget {
  const DeviceSyncPage({super.key});

  @override
  Widget build(BuildContext context) {
    if (kIsWeb) {
      return Scaffold(
        appBar: AppBar(title: const Text('Sync Status')),
        body: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.cloud_off, size: 64, color: Colors.grey),
              SizedBox(height: 16),
              Text(
                'LAN Sync not supported on Web',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              Padding(
                padding: EdgeInsets.all(24.0),
                child: Text(
                  'Browser security restrictions prevent local network discovery and serving. '
                  'Please use the mobile or desktop app for Offline LAN Synchronization.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Device Synchronization'),
        centerTitle: true,
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
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildRoleCard(context, state),
                const SizedBox(height: 24),
                _buildStatusCard(context, state),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Connected Devices',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    if (state.peers.isNotEmpty)
                      Text(
                        '${state.peers.length} found',
                        style: TextStyle(color: Colors.grey[600], fontSize: 13),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                if (state.peers.isEmpty)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 32.0),
                      child: Column(
                        children: [
                          Icon(Icons.devices_other, size: 48, color: Colors.grey),
                          SizedBox(height: 12),
                          Text('No devices found on local network'),
                          SizedBox(height: 4),
                          Text(
                            'Make sure both devices are on the same WiFi',
                            style: TextStyle(color: Colors.grey, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: state.peers.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final peer = state.peers[index];
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
                            ? 'Other devices can pull data from this device.'
                            : 'Tap a device below to sync from it.',
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
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: state.isDiscoveryRunning
                    ? () => context.read<SyncBloc>().add(ManualSyncTriggered())
                    : null,
                icon: const Icon(Icons.sync),
                label: const Text('Auto Sync Now'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(BuildContext context, String label, String value, Color valueColor) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(fontWeight: FontWeight.w500),
        ),
        Text(
          value,
          style: TextStyle(
            color: valueColor,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildDeviceTile(BuildContext context, PeerDevice peer, SyncState state) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final canSync = peer.isMaster && peer.isOnline && !state.isMaster;

    return Card(
      elevation: 0,
      color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey[100],
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: CircleAvatar(
          backgroundColor: peer.isOnline
              ? Colors.green.withOpacity(0.15)
              : Colors.grey.withOpacity(0.15),
          child: Icon(
            peer.isMaster ? Icons.dns : Icons.smartphone,
            color: peer.isOnline ? Colors.green : Colors.grey,
            size: 20,
          ),
        ),
        title: Text(
          peer.deviceName,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          '${peer.ip} · ${peer.isMaster ? "Master" : "Client"} · '
          '${peer.isOnline ? "Online" : "Offline"}',
          style: const TextStyle(fontSize: 12),
        ),
        trailing: canSync
            ? FilledButton.tonal(
                onPressed: () {
                  context.read<SyncBloc>().add(SyncWithPeerTriggered(
                        ip: peer.ip,
                        port: peer.port,
                        peerName: peer.deviceName,
                      ));
                },
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
                child: const Text('Sync'),
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
    if (state.isMaster) return const SizedBox.shrink();

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
              state.peers.any((p) => p.isMaster && p.isOnline)
                  ? 'Tap "Sync" on the Master device above to pull its full data.'
                  : 'Discovery is running. Make sure the Master device is on the same WiFi.',
              style: const TextStyle(fontSize: 13, color: Colors.blue),
            ),
          ),
        ],
      ),
    );
  }
}
