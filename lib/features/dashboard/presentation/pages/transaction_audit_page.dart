import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../school_finance/domain/repositories/finance_repository_new.dart';
import '../../../school_finance/data/models/finance_models.dart';
import '../../../../core/utils/currency_formatter.dart';

class TransactionAuditPage extends StatefulWidget {
  const TransactionAuditPage({Key? key}) : super(key: key);

  @override
  _TransactionAuditPageState createState() => _TransactionAuditPageState();
}

class _TransactionAuditPageState extends State<TransactionAuditPage> {
  List<TransactionAuditModel> _transactions = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchAuditLedger();
  }

  Future<void> _fetchAuditLedger() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final repo = context.read<FinanceRepository>();
      final data = await repo.getTransactionAuditLedger();
      setState(() {
        _transactions = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  void _showTransactionDetails(TransactionAuditModel tx) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Text('POS Transaction Details'),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Status: ${tx.status}', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text('Staff: ${tx.staffName}'),
                Text('Amount: ${CurrencyFormatter.format(tx.amount)}'),
                Text('Date: ${DateFormat('MMM dd, yyyy HH:mm').format(tx.date)}'),
                const SizedBox(height: 16),
                Text('Items:', style: TextStyle(fontWeight: FontWeight.bold)),
                ...tx.items.map((i) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Text('- ${i['name'] ?? 'Unknown Item'} x${i['quantity'] ?? 1}'),
                )).toList(),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            )
          ],
        ),
      );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'success':
      case 'successful':
        return Colors.green;
      case 'pending':
        return Colors.orange;
      case 'aborted':
      case 'declined':
      case 'failed':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Transaction Audit Ledger'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchAuditLedger,
          )
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Error: $_error', style: const TextStyle(color: Colors.red)),
                      ElevatedButton(
                        onPressed: _fetchAuditLedger,
                        child: const Text('Retry'),
                      )
                    ],
                  ),
                )
              : _transactions.isEmpty
                  ? const Center(child: Text('No transactions found in ledger.'))
                  : ListView.builder(
                      itemCount: _transactions.length,
                      itemBuilder: (context, index) {
                        final tx = _transactions[index];
                        return Card(
                          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: _getStatusColor(tx.status).withOpacity(0.1),
                              child: Icon(
                                tx.type == 'POS' ? Icons.point_of_sale : Icons.receipt,
                                color: _getStatusColor(tx.status),
                              ),
                            ),
                            title: Text(
                              '${CurrencyFormatter.format(tx.amount)} - ${tx.paymentMethod}',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Staff: ${tx.staffName}'),
                                Text(
                                  tx.status,
                                  style: TextStyle(
                                    color: _getStatusColor(tx.status),
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                Text(
                                  DateFormat('MMM dd, yyyy HH:mm').format(tx.date),
                                  style: const TextStyle(fontSize: 12),
                                ),
                              ],
                            ),
                            isThreeLine: true,
                            trailing: ElevatedButton(
                              onPressed: () => _showTransactionDetails(tx),
                              child: const Text('View'),
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}
