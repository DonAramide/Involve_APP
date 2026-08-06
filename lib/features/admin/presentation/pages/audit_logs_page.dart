// lib/features/admin/presentation/pages/audit_logs_page.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/admin_bloc.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

class AuditLogsPage extends StatefulWidget {
  const AuditLogsPage({super.key});

  @override
  State<AuditLogsPage> createState() => _AuditLogsPageState();
}

class _AuditLogsPageState extends State<AuditLogsPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        context.read<AdminBloc>().add(LoadAuditLogs());
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('System Audit Logs'),
      ),
      body: BlocBuilder<AdminBloc, AdminState>(
        builder: (context, state) {
          if (state.isLoading && state.auditLogs.isEmpty) {
            return const InvifyLoadingIndicator(message: 'FETCHING AUDIT LOGS...');
          }

          final logs = state.auditLogs;

          if (logs.isEmpty) {
            return RefreshIndicator(
              onRefresh: () async {
                context.read<AdminBloc>().add(LoadAuditLogs());
              },
              child: ListView(
                children: const [
                  SizedBox(height: 100),
                  Center(
                    child: Text(
                      'No audit logs found.',
                      style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic),
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              context.read<AdminBloc>().add(LoadAuditLogs());
            },
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: logs.length,
              itemBuilder: (context, index) {
                final log = logs[index];
                final details = log['details'];
                
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 2,
                  child: ExpansionTile(
                    leading: Icon(
                      _getIconForAction(log['action']),
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    title: Text(
                      log['action'].toString().replaceAll('_', ' '),
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Text(
                      log['timestamp'] ?? 'N/A',
                      style: TextStyle(color: Colors.grey[600], fontSize: 12),
                    ),
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Divider(),
                            const SizedBox(height: 8),
                            _buildInfoRow('Terminal ID', log['terminal_id']?.toString() ?? 'N/A'),
                            const SizedBox(height: 6),
                            _buildInfoRow('Status', log['status']?.toString() ?? 'SUCCESS'),
                            if (details != null) ...[
                              const SizedBox(height: 8),
                              const Text(
                                'Payload Details:',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                              const SizedBox(height: 4),
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.grey[100],
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Colors.grey[300]!),
                                ),
                                child: Text(
                                  details.toString(),
                                  style: const TextStyle(
                                    fontFamily: 'Courier',
                                    fontSize: 12,
                                    color: Colors.black87,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }

  IconData _getIconForAction(dynamic action) {
    final act = action.toString().toUpperCase();
    if (act.contains('SYNC')) return Icons.sync;
    if (act.contains('PAYMENT') || act.contains('TRANSACTION')) return Icons.payment;
    if (act.contains('LOGIN') || act.contains('AUTH')) return Icons.lock;
    if (act.contains('SETTING') || act.contains('UPDATE')) return Icons.settings;
    return Icons.info_outline;
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 100,
          child: Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
        ),
      ],
    );
  }
}
