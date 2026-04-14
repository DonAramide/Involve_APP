import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../domain/entities/financial_transaction.dart';

class StudentTransactionItem extends StatelessWidget {
  final FinancialTransaction transaction;

  const StudentTransactionItem({super.key, required this.transaction});

  @override
  Widget build(BuildContext context) {
    final isCredit = transaction.amount > 0;
    final isDiscount = transaction.metadata['type'] == 'discount';
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDiscount 
                  ? Colors.orange.withOpacity(0.1) 
                  : (isCredit ? Colors.green.withOpacity(0.1) : Colors.red.withOpacity(0.1)),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isDiscount 
                  ? Icons.card_giftcard 
                  : (isCredit ? Icons.add_rounded : Icons.remove_rounded),
              color: isDiscount 
                  ? Colors.orange 
                  : (isCredit ? Colors.green : Colors.red),
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  transaction.description ?? (isCredit ? "Payment" : "Charge"),
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text(
                      DateFormat('MMM dd, yyyy • HH:mm').format(transaction.createdAt),
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade500,
                      ),
                    ),
                    const SizedBox(width: 8),
                    _buildStatusTag(transaction.channel),
                  ],
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${isCredit ? "+" : ""}₦${transaction.amount.toStringAsFixed(0)}',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: isDiscount 
                      ? Colors.orange 
                      : (isCredit ? Colors.green : Colors.black87),
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'SUCCESS',
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                  color: Colors.green.shade700,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusTag(String channel) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        channel.toUpperCase(),
        style: TextStyle(
          fontSize: 8,
          fontWeight: FontWeight.bold,
          color: Colors.grey.shade600,
        ),
      ),
    );
  }
}
