// lib/features/admin/presentation/pages/admin_dashboard.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/admin_bloc.dart';
import '../widgets/master_mode_switch.dart';
import 'system_setup_page.dart';

import 'package:intl/intl.dart';

class AdminDashboardPage extends StatefulWidget {
  const AdminDashboardPage({super.key});

  @override
  State<AdminDashboardPage> createState() => _AdminDashboardPageState();
}

class _AdminDashboardPageState extends State<AdminDashboardPage> {
  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() {
    context.read<AdminBloc>().add(LoadAdminDashboard());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Hub'),
        actions: [
          const MasterModeSwitch(),
          const SizedBox(width: 16),
        ],
      ),
      body: BlocBuilder<AdminBloc, AdminState>(
        builder: (context, state) {
          if (state.isLoading) return const Center(child: CircularProgressIndicator());
          
          if (state.error != null && state.metrics.isEmpty) {
            return _buildErrorState(state.error!);
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildMetricSection(context, state.metrics),
                const SizedBox(height: 24),
                _buildQuickActions(context, state.isMasterMode),
                const SizedBox(height: 24),
                _buildRecentAuditLogs(context, state.auditLogs),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildMetricSection(BuildContext context, Map<String, dynamic> metrics) {
    final formatter = NumberFormat.currency(symbol: '₦', decimalDigits: 2);
    
    // Fallback to defaults if metrics are empty (e.g. backend offline)
    final walletValue = metrics['internal_wallet'] != null 
        ? formatter.format(metrics['internal_wallet']) 
        : '₦0.00';
    final revenueValue = metrics['monthly_revenue'] != null 
        ? formatter.format(metrics['monthly_revenue']) 
        : '₦0.00';

    return Row(
      children: [
        Expanded(
          child: _MetricCard(
            title: 'Internal Wallet',
            value: walletValue,
            icon: Icons.account_balance_wallet,
            color: Colors.blue,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _MetricCard(
            title: 'Monthly Revenue',
            value: revenueValue,
            icon: Icons.trending_up,
            color: Colors.green,
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActions(BuildContext context, bool isMaster) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('System Management', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        Wrap(
          spacing: 16,
          runSpacing: 16,
          children: [
            _ActionTile(
              label: 'Quaser Keys',
              icon: Icons.vpn_key,
              onTap: isMaster ? () => _gotoKeys(context) : null,
              isGated: !isMaster,
            ),
            _ActionTile(
              label: 'System Setup',
              icon: Icons.settings_applications,
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SystemSetupPage())),
            ),
            _ActionTile(
              label: 'Audit Logs',
              icon: Icons.history,
              onTap: () => _gotoLogs(context),
            ),
            _ActionTile(
              label: 'Ledger History',
              icon: Icons.list_alt,
              onTap: () {},
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildRecentAuditLogs(BuildContext context, List<Map<String, dynamic>> logs) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Recent Activity', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        Card(
          child: ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: logs.take(5).length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final log = logs[index];
              return ListTile(
                leading: const Icon(Icons.info_outline),
                title: Text(log['action']),
                subtitle: Text(log['timestamp']),
                trailing: const Icon(Icons.chevron_right, size: 16),
              );
            },
          ),
        ),
      ],
    );
  }

  void _gotoKeys(BuildContext context) {
    // Navigator.push...
  }
  void _gotoLogs(BuildContext context) {
     context.read<AdminBloc>().add(LoadAuditLogs());
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.cloud_off, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            const Text('Connection Failed', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(error, textAlign: TextAlign.center, style: const TextStyle(color: Colors.grey)),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadData,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry Connection'),
            ),
            const SizedBox(height: 16),
            if (error.contains('127.0.0.1'))
              const Text(
                'Tip: If using an emulator, ensure the backend is running and reach it via host IP.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic),
              ),
          ],
        ),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _MetricCard({required this.title, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: color.withOpacity(0.1),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color),
            const SizedBox(height: 16),
            Text(title, style: const TextStyle(color: Colors.grey, fontSize: 13)),
            const SizedBox(height: 4),
            Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
      ),
    );
  }
}

class _ActionTile extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback? onTap;
  final bool isGated;

  const _ActionTile({required this.label, required this.icon, this.onTap, this.isGated = false});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 100,
        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 8),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.withOpacity(0.2)),
          borderRadius: BorderRadius.circular(12),
          color: onTap == null ? Colors.grey.withOpacity(0.05) : null,
        ),
        child: Column(
          children: [
            Opacity(
              opacity: onTap == null ? 0.3 : 1.0,
              child: Icon(icon, size: 28),
            ),
            const SizedBox(height: 12),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: onTap == null ? Colors.grey : null,
              ),
              textAlign: TextAlign.center,
            ),
            if (isGated) ...[
              const SizedBox(height: 8),
              const Icon(Icons.lock, size: 12, color: Colors.orange),
            ]
          ],
        ),
      ),
    );
  }
}
