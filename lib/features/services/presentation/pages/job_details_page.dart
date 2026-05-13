import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import '../bloc/services_bloc.dart';
import '../bloc/services_event.dart';
import '../bloc/services_state.dart';
import '../../domain/entities/service_job.dart';
import '../templates/service_pdf_generator.dart';
import '../../../settings/presentation/bloc/settings_bloc.dart';
import '../../../settings/presentation/bloc/settings_state.dart';

class JobDetailsPage extends StatelessWidget {
  final ServiceJob job;
  const JobDetailsPage({super.key, required this.job});

  @override
  Widget build(BuildContext context) {
    final currencySymbol = context.read<SettingsBloc>().state.settings?.currency ?? '₦';

    return Scaffold(
      appBar: AppBar(title: Text(job.jobId)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(context),
            if (job.image != null) ...[
              const SizedBox(height: 24),
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.memory(
                  job.image!,
                  width: double.infinity,
                  height: 200,
                  fit: BoxFit.cover,
                ),
              ),
            ],
            const SizedBox(height: 24),
            _buildBalanceCard(context, currencySymbol),
            const SizedBox(height: 24),
            const Text('Actions', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _buildQuickActions(context, currencySymbol),
            const SizedBox(height: 24),
            const Text('Job Log', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _buildJobLog(context, currencySymbol),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                job.title,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
            ),
            _buildStatusChip(job.status),
          ],
        ),
        const SizedBox(height: 8),
        Text(job.description ?? 'No description provided', style: TextStyle(color: Colors.grey[600])),
        const SizedBox(height: 16),
        Row(
          children: [
            const Icon(Icons.calendar_today, size: 16, color: Colors.blue),
            const SizedBox(width: 8),
            Text('Due: ${job.dueDate?.toLocal().toString().split(' ')[0] ?? 'Not Set'}'),
            if (job.warrantyDuration != null) ...[
              const SizedBox(width: 16),
              const Icon(Icons.security, size: 16, color: Colors.green),
              const SizedBox(width: 4),
              Text('Warranty: ${job.warrantyDuration}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
            ],
          ],
        ),
      ],
    );
  }

  Widget _buildBalanceCard(BuildContext context, String symbol) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Theme.of(context).primaryColor, Theme.of(context).primaryColor.withOpacity(0.8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).primaryColor.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          const Text('Remaining Balance', style: TextStyle(color: Colors.white70, fontSize: 16)),
          const SizedBox(height: 8),
          Text(
            CurrencyFormatter.formatWithSymbol(job.balance, symbol: symbol),
            style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildSimpleStat('Total Cost', CurrencyFormatter.formatWithSymbol(job.totalAmount, symbol: symbol)),
              _buildSimpleStat('Paid', CurrencyFormatter.formatWithSymbol(job.amountPaid, symbol: symbol)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSimpleStat(String label, String value) {
    return Column(
      children: [
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildQuickActions(BuildContext context, String symbol) {
    return Row(
      children: [
        Expanded(
          child: ElevatedButton.icon(
            onPressed: () => _showPaymentDialog(context, symbol),
            icon: const Icon(Icons.add_card),
            label: const Text('Add Payment'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            children: [
              OutlinedButton.icon(
                onPressed: () => _showStatusPicker(context),
                icon: const Icon(Icons.edit_road, size: 18),
                label: const Text('Status'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  minimumSize: const Size(double.infinity, 48),
                ),
              ),
              const SizedBox(height: 8),
              BlocBuilder<SettingsBloc, SettingsState>(
                builder: (context, settingsState) {
                  return Column(
                    children: [
                      OutlinedButton.icon(
                        onPressed: () {
                          context.read<ServicesBloc>().add(PrintServiceReceiptEvent(
                                job: job,
                                payments: const [], // Bloc will fetch real ones
                                settings: settingsState.settings,
                              ));
                        },
                        icon: const Icon(Icons.print, size: 18),
                        label: const Text('Print Receipt'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          minimumSize: const Size(double.infinity, 48),
                        ),
                      ),
                      const SizedBox(height: 8),
                      ElevatedButton.icon(
                        onPressed: () async {
                          final payments = await context.read<ServicesBloc>().getJobPayments(job.id);
                          await ServiceJobPdfGenerator.generateAndShow(
                            job: job,
                            payments: payments,
                            settings: settingsState.settings,
                          );
                        },
                        icon: const Icon(Icons.share, size: 18),
                        label: const Text('Preview / Share PDF'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue[800],
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          minimumSize: const Size(double.infinity, 48),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildJobLog(BuildContext context, String symbol) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (job.items.isNotEmpty || job.laborAmount > 0) ...[
          const Text('Bill Breakdown', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.grey[50], borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey[200]!)),
            child: Column(
              children: [
                if (job.laborAmount > 0)
                  _buildItemRow('Workmanship', job.laborAmount, symbol),
                ...job.items.map((i) => _buildItemRow('${i.name} (x${i.quantity.toInt()})', i.price * i.quantity, symbol)),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
        const Text('Job Logs', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 12),
        _buildLogItem(
          context,
          'Job Created',
          'Initial creation of the job entry',
          job.createdAt,
          Icons.fiber_new,
          Colors.blue,
        ),
        if (job.amountPaid > 0)
          _buildLogItem(
            context,
            'Payment Received',
            '${CurrencyFormatter.formatWithSymbol(job.amountPaid, symbol: symbol)} has been recorded against this job',
            DateTime.now(), // Placeholder for real payment date
            Icons.payment,
            Colors.green,
          ),
      ],
    );
  }

  Widget _buildLogItem(BuildContext context, String title, String sub, DateTime date, IconData icon, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle),
            child: Icon(icon, color: color, size: 16),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(sub, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                Text(
                  '${date.toLocal().toString().split('.')[0]}',
                  style: TextStyle(color: Colors.grey[400], fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showPaymentDialog(BuildContext context, String symbol) {
    final amountCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Payment'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: amountCtrl,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'Amount ($symbol)', 
                prefixText: '$symbol ',
                border: const OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              final amt = double.tryParse(amountCtrl.text);
              if (amt != null && amt > 0) {
                context.read<ServicesBloc>().add(AddServicePayment(
                  jobId: job.id,
                  amount: amt,
                  method: 'Cash',
                ));
                Navigator.pop(context);
                Navigator.pop(context); // Return to list/dashboard to refresh
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment recorded!')));
              }
            },
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
  }

  void _showStatusPicker(BuildContext context) {
    final statuses = ['pending', 'in_progress', 'ready', 'delivered'];
    showModalBottomSheet(
      context: context,
      builder: (context) => Column(
        mainAxisSize: MainAxisSize.min,
        children: statuses.map((s) => ListTile(
          title: Text(s.toUpperCase()),
          onTap: () {
            context.read<ServicesBloc>().add(UpdateJobStatusEvent(job.id, s));
            Navigator.pop(context);
            Navigator.pop(context);
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Status updated to $s')));
          },
        )).toList(),
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color color;
    switch (status) {
      case 'pending': color = Colors.grey; break;
      case 'in_progress': color = Colors.orange; break;
      case 'ready': color = Colors.green; break;
      case 'delivered': color = Colors.blue; break;
      default: color = Colors.grey;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
      child: Text(status.toUpperCase(), style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildItemRow(String label, double amount, String symbol) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13)),
          Text(CurrencyFormatter.formatWithSymbol(amount, symbol: symbol), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        ],
      ),
    );
  }
}
