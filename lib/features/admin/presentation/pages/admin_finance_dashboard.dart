// lib/features/admin/presentation/pages/admin_finance_dashboard.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/admin_bloc.dart';

class AdminFinanceDashboardPage extends StatelessWidget {
  const AdminFinanceDashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Internal Ledger Analytics')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildBalanceOverview(context),
            const SizedBox(height: 24),
            _buildRevenueStreamChart(context),
            const SizedBox(height: 24),
            _buildRecentTransactions(context),
          ],
        ),
      ),
    );
  }

  Widget _buildBalanceOverview(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Source of Truth: Internal Ledger', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.blue)),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _BalanceTile(label: 'Total Wallet', amount: '₦5.4M', color: Colors.blue)),
            const SizedBox(width: 12),
            Expanded(child: _BalanceTile(label: 'Cash on Hand', amount: '₦1.2M', color: Colors.green)),
            const SizedBox(width: 12),
            Expanded(child: _BalanceTile(label: 'Pending Quaser', amount: '₦800k', color: Colors.orange)),
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
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: 4,
          separatorBuilder: (_, __) => const Divider(),
          itemBuilder: (context, index) {
            return ListTile(
              leading: const CircleAvatar(child: Icon(Icons.swap_horiz)),
              title: const Text('Student Fee Payment'),
              subtitle: const Text('Cash • Mar 12, 10:45 AM'),
              trailing: const Text('+₦50,000.00', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
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
