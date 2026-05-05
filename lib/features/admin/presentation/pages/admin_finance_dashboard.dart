// lib/features/admin/presentation/pages/admin_finance_dashboard.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/admin_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:involve_app/features/settings/domain/entities/settings.dart';
import 'package:involve_app/core/utils/terminology.dart';
import 'package:intl/intl.dart';

class AdminFinanceDashboardPage extends StatelessWidget {
  const AdminFinanceDashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AdminBloc, AdminState>(
      builder: (context, state) {
        return Scaffold(
          appBar: AppBar(title: const Text('Internal Ledger Analytics')),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildBalanceOverview(context, state.metrics),
                const SizedBox(height: 24),
                _buildRevenueStreamChart(context),
                const SizedBox(height: 24),
                _buildRecentTransactions(context),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildBalanceOverview(BuildContext context, Map<String, dynamic> metrics) {
    final formatter = NumberFormat.compactCurrency(symbol: '₦', decimalDigits: 1);
    
    final wallet = metrics['internal_wallet'] ?? 0.0;
    final cash = metrics['cash_on_hand'] ?? 0.0;
    final pending = metrics['pending_quasar'] ?? 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Source of Truth: Internal Ledger', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.blue)),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _BalanceTile(label: 'Total Wallet', amount: formatter.format(wallet), color: Colors.blue)),
            const SizedBox(width: 12),
            Expanded(child: _BalanceTile(label: 'Cash on Hand', amount: formatter.format(cash), color: Colors.green)),
            const SizedBox(width: 12),
            Expanded(child: _BalanceTile(label: 'Pending Quaser', amount: formatter.format(pending), color: Colors.orange)),
          ],
        ),
      ],
    );
  }

  Widget _buildRevenueStreamChart(BuildContext context) {
    return Container(
      height: 200,
      decoration: BoxDecoration(
        color: Colors.grey.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.withOpacity(0.1)),
      ),
      child: const Center(child: Text('Revenue Trend Graph (Last 30 Days)', style: TextStyle(color: Colors.grey))),
    );
  }

  Widget _buildRecentTransactions(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Ledger Entries', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            TextButton(onPressed: () {}, child: const Text('VIEW ALL')),
          ],
        ),
        const SizedBox(height: 12),
        BlocBuilder<SettingsBloc, SettingsState>(
          builder: (context, state) {
            final settings = state.settings;
            final label = settings?.saleLabel ?? 'Sale';
            final customerLabel = settings?.customerLabel ?? 'Customer';
            
            return ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: 4,
              separatorBuilder: (_, __) => const Divider(),
              itemBuilder: (context, index) {
                return ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.swap_horiz)),
                  title: Text(label),
                  subtitle: Text('Cash • Mar 12, 10:45 AM'),
                  trailing: const Text('+₦50,000.00', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                );
              },
            );
          },
        ),
      ],
    );
  }
}

class _BalanceTile extends StatelessWidget {
  final String label;
  final String amount;
  final Color color;

  const _BalanceTile({required this.label, required this.amount, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        border: Border.all(color: color.withOpacity(0.2)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
          const SizedBox(height: 4),
          Text(amount, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }
}
