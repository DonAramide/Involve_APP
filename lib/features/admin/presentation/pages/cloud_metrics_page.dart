import 'package:flutter/material.dart';
import '../../data/datasources/cloud_metrics_service.dart';
import '../../../../services/socket_service.dart';

class CloudMetricsPage extends StatefulWidget {
  const CloudMetricsPage({super.key});

  @override
  State<CloudMetricsPage> createState() => _CloudMetricsPageState();
}

class _CloudMetricsPageState extends State<CloudMetricsPage> {
  final _cloudService = CloudMetricsService();
  bool _isLoading = true;
  
  Map<String, dynamic>? _overview;
  Map<String, dynamic>? _syncHealth;
  Map<String, dynamic>? _devices;
  Map<String, dynamic>? _alerts;
  Map<String, dynamic>? _feed;
  Map<String, dynamic>? _backups;

  @override
  void initState() {
    super.initState();
    _loadAllMockData();
    _setupSocketListeners();
  }

  void _setupSocketListeners() {
    final socketService = SocketService();
    
    socketService.onEvent('cloud.metrics.updates', (data) {
      if (mounted && data != null) {
        setState(() {
          _overview = Map<String, dynamic>.from(data);
        });
      }
    });

    socketService.onEvent('terminal.status', (data) {
      if (mounted && data != null) {
        setState(() {
          if (_devices != null) {
            _devices = Map<String, dynamic>.from(_devices!)..addAll(Map<String, dynamic>.from(data));
          } else {
            _devices = Map<String, dynamic>.from(data);
          }
        });
      }
    });

    socketService.onEvent('sync.events', (data) {
      if (mounted && data != null) {
        setState(() {
          _syncHealth = Map<String, dynamic>.from(data);
        });
      }
    });

    socketService.onEvent('backup.events', (data) {
      if (mounted && data != null) {
        setState(() {
          _backups = Map<String, dynamic>.from(data);
        });
      }
    });

    // Assume activity feed and alerts can also be updated real-time if backend emits them
  }

  @override
  void dispose() {
    final socketService = SocketService();
    socketService.offEvent('cloud.metrics.updates');
    socketService.offEvent('terminal.status');
    socketService.offEvent('sync.events');
    socketService.offEvent('backup.events');
    super.dispose();
  }

  Future<void> _loadAllMockData() async {
    setState(() => _isLoading = true);
    
    final results = await Future.wait([
      _cloudService.getOverview(),
      _cloudService.getSyncHealth(),
      _cloudService.getDevices(),
      _cloudService.getAlerts(),
      _cloudService.getActivityFeed(),
      _cloudService.getBackups(),
    ]);

    if (mounted) {
      setState(() {
        _overview = results[0];
        _syncHealth = results[1];
        _devices = results[2];
        _alerts = results[3];
        _feed = results[4];
        _backups = results[5];
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Cloud Metrics', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            if (_overview != null)
              Row(
                children: [
                  Icon(
                    Icons.wifi, 
                    size: 12, 
                    color: _overview!['connectionQuality'] == 'Excellent' ? Colors.green : Colors.orange
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${_overview!['connectionQuality']} (${_overview!['latencyMs']}ms)', 
                    style: const TextStyle(fontSize: 11, color: Colors.grey)
                  ),
                ],
              )
          ],
        ),
        centerTitle: false,
        actions: [
          if (_overview != null && _overview!['offlineModeActive'] == true)
            Container(
              margin: const EdgeInsets.only(right: 12),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(color: Colors.red.shade100, borderRadius: BorderRadius.circular(20)),
              child: Row(
                children: [
                  Icon(Icons.wifi_off, color: Colors.red.shade800, size: 16),
                  const SizedBox(width: 6),
                  Text('OFFLINE', style: TextStyle(color: Colors.red.shade800, fontWeight: FontWeight.bold, fontSize: 12)),
                ],
              ),
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadAllMockData,
            tooltip: 'Refresh Metrics',
          )
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildCriticalAboveTheFoldCard(),
                  const SizedBox(height: 12),
                  _buildOfflineOperationsSummary(),
                  const SizedBox(height: 12),
                  _buildAlertsSection(),
                  const SizedBox(height: 12),
                  _buildLiveActivitySection(),
                ],
              ),
            ),
    );
  }

  Widget _buildCriticalAboveTheFoldCard() {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                _buildCompactHealthRing(),
                const SizedBox(width: 24),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildMetricRow(
                        'Sync Status', 
                        _syncHealth?['syncStatus']?.toString().toUpperCase() ?? 'UNKNOWN', 
                        _syncHealth?['syncStatus'] == 'healthy' ? Colors.green : Colors.orange,
                        Icons.cloud_sync,
                      ),
                      const Divider(height: 8),
                      _buildMetricRow(
                        'Last Sync', 
                        _formatTimeAgo(_syncHealth?['lastSyncTime']), 
                        Colors.blueGrey,
                        Icons.access_time,
                      ),
                      const Divider(height: 8),
                      _buildMetricRow(
                        'Backup Status', 
                        _backups?['backupStatus']?.toString().toUpperCase() ?? 'N/A', 
                        _backups?['backupStatus'] == 'healthy' ? Colors.green : Colors.red,
                        Icons.backup,
                      ),
                      const Divider(height: 8),
                      _buildMetricRow(
                        'Last Backup', 
                        _formatTimeAgo(_backups?['lastBackupTime']), 
                        Colors.blueGrey,
                        Icons.restore,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color: Colors.grey.withOpacity(0.05),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildHardwareStatus('Devices', '${_overview?['devicesOnline']}/${_overview?['totalDevices']}', Icons.devices, Colors.indigo),
                  _buildHardwareStatus('Terminals', '${_overview?['activeTerminals']}', Icons.point_of_sale, Colors.blue),
                  _buildHardwareStatus('MPOS', _devices?['mpos']?['status'] ?? 'N/A', Icons.contactless, _devices?['mpos']?['status'] == 'connected' ? Colors.green : Colors.red),
                  _buildHardwareStatus('Printer', _devices?['printer']?['status'] ?? 'N/A', Icons.print, _devices?['printer']?['status'] == 'connected' ? Colors.green : Colors.red),
                ],
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildCompactHealthRing() {
    final score = _overview?['systemHealthScore'] ?? 0;
    return GestureDetector(
      onTap: () => _showHealthDetailsDialog(),
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: 70,
            height: 70,
            child: CircularProgressIndicator(
              value: score / 100,
              strokeWidth: 8,
              backgroundColor: Colors.grey.shade200,
              color: score > 90 ? Colors.green : (score > 70 ? Colors.orange : Colors.red),
            ),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('$score%', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const Text('Health', style: TextStyle(fontSize: 10, color: Colors.grey, decoration: TextDecoration.underline)),
            ],
          ),
        ],
      ),
    );
  }

  void _showHealthDetailsDialog() {
    final details = _overview?['healthDetails'] ?? {};
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Health Score Breakdown'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildDialogScoreRow('Sync Health', details['sync'] ?? 0),
            const SizedBox(height: 8),
            _buildDialogScoreRow('Terminal Health', details['terminal'] ?? 0),
            const SizedBox(height: 8),
            _buildDialogScoreRow('Backup Health', details['backup'] ?? 0),
            const SizedBox(height: 8),
            _buildDialogScoreRow('Connectivity', details['connectivity'] ?? 0),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close'))
        ],
      ),
    );
  }

  Widget _buildDialogScoreRow(String label, int score) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label),
        Text('$score%', style: TextStyle(fontWeight: FontWeight.bold, color: score > 90 ? Colors.green : Colors.orange)),
      ],
    );
  }

  Widget _buildOfflineOperationsSummary() {
    final ops = _syncHealth?['offlineOps'] ?? {};
    final totalPending = (ops['sales'] ?? 0) + (ops['invoices'] ?? 0) + (ops['inventory'] ?? 0);

    return Card(
      elevation: 0,
      color: totalPending > 0 ? Colors.orange.shade50 : Colors.green.shade50,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: totalPending > 0 ? Colors.orange.shade200 : Colors.green.shade200)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Offline Operations Queue', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                Icon(totalPending > 0 ? Icons.cloud_off : Icons.cloud_done, size: 18, color: totalPending > 0 ? Colors.orange : Colors.green),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildQueueItem('Sales Pending', ops['sales'] ?? 0),
                _buildQueueItem('Invoices Pending', ops['invoices'] ?? 0),
                _buildQueueItem('Inventory Pending', ops['inventory'] ?? 0),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQueueItem(String label, int count) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('$count', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
      ],
    );
  }

  Widget _buildMetricRow(String label, String value, Color color, IconData icon) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Icon(icon, size: 14, color: Colors.grey.shade600),
            const SizedBox(width: 8),
            Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
          ],
        ),
        Text(value, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color)),
      ],
    );
  }

  Widget _buildHardwareStatus(String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Icon(icon, size: 20, color: color),
        const SizedBox(height: 4),
        Text(value.toUpperCase(), style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
      ],
    );
  }

  Widget _buildAlertsSection() {
    final alerts = _alerts?['alerts'] as List? ?? [];
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Required Actions', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        if (alerts.isEmpty)
          Card(
            color: Colors.green.shade50,
            elevation: 0,
            child: const ListTile(
              dense: true,
              leading: Icon(Icons.check_circle, color: Colors.green),
              title: Text('All systems operational.', style: TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('No action required at this time.'),
            ),
          )
        else
          ...alerts.map((alert) {
            final isWarning = alert['severity'] == 'warning';
            return Card(
              color: isWarning ? Colors.orange.shade50 : Colors.red.shade50,
              elevation: 0,
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                dense: true,
                leading: Icon(isWarning ? Icons.warning_amber : Icons.error_outline, color: isWarning ? Colors.orange : Colors.red),
                title: Text(alert['message'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: Text(alert['recommendation'], style: TextStyle(fontSize: 12, color: Colors.grey.shade800)),
                trailing: alert['actionLabel'] != null 
                    ? ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isWarning ? Colors.orange : Colors.red,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
                        ),
                        onPressed: () {}, 
                        child: Text(alert['actionLabel'], style: const TextStyle(fontSize: 12))
                      ) 
                    : null,
              ),
            );
          }),
      ],
    );
  }

  Widget _buildLiveActivitySection() {
    if (_feed == null) return const SizedBox.shrink();
    final activities = _feed?['activities'] as List? ?? [];
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Live Activity Feed', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
            Row(
              children: [
                const Icon(Icons.circle, color: Colors.green, size: 10),
                const SizedBox(width: 4),
                Text('Connected', style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
              ],
            )
          ],
        ),
        const SizedBox(height: 8),
        Card(
          elevation: 1,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: activities.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final act = activities[index];
              return ListTile(
                dense: true,
                leading: _getActivityIcon(act['category']),
                title: Text(act['message'], style: const TextStyle(fontSize: 13)),
                trailing: Text(_formatTimeAgo(act['timestamp']), style: const TextStyle(fontSize: 11, color: Colors.grey)),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _getActivityIcon(String? category) {
    switch (category) {
      case 'sync': return const Text('🔄', style: TextStyle(fontSize: 18));
      case 'invoice': return const Text('🧾', style: TextStyle(fontSize: 18));
      case 'printer': return const Text('🖨', style: TextStyle(fontSize: 18));
      case 'terminal': return const Text('💳', style: TextStyle(fontSize: 18));
      case 'inventory': return const Text('📦', style: TextStyle(fontSize: 18));
      case 'alert': return const Text('⚠', style: TextStyle(fontSize: 18));
      default: return const Icon(Icons.event, color: Colors.grey, size: 20);
    }
  }

  String _formatTimeAgo(String? isoString) {
    if (isoString == null) return 'N/A';
    try {
      final date = DateTime.parse(isoString);
      final diff = DateTime.now().difference(date);
      if (diff.inSeconds < 60) return '${diff.inSeconds}s ago';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      return '${diff.inDays}d ago';
    } catch (_) {
      return 'Unknown';
    }
  }
}
