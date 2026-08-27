import 'package:flutter/material.dart';
import '../../domain/entities/financial_transaction.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import '../pages/student_finance_profile.dart';

class GlobalTransactionTile extends StatelessWidget {
  final FinancialTransaction transaction;

  const GlobalTransactionTile({super.key, required this.transaction});

  @override
  Widget build(BuildContext context) {
    // Determine student name from metadata or repository data if available
    final String studentName = transaction.metadata['student_name'] ?? 
                             transaction.description ?? 'Student Payment';

    final isCredit = transaction.amount > 0;
    
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => StudentFinanceProfilePage(
              studentId: transaction.metadata['student_id'] ?? '', 
              studentName: studentName,
              walletId: transaction.walletId,
            ),
          ),
        );
      },
      child: Container(


      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.withOpacity(0.05)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: (isCredit ? Colors.green : Colors.red).withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isCredit ? Icons.arrow_downward : Icons.arrow_upward,
              color: isCredit ? Colors.green : Colors.red,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        studentName,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    _buildChannelTag(transaction.channel),
                  ],
                ),
                Text(
                  transaction.reference,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade500,
                  ),
                  overflow: TextOverflow.ellipsis,
                  maxLines: 1,
                ),
              ],
            ),
          ),

                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${isCredit ? "+" : ""}${CurrencyFormatter.formatWithSymbol(transaction.amount)}',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: isCredit ? Colors.green : Colors.black87,
                        fontSize: 15,
                      ),
                    ),
                    Text(
                      DateFormat('HH:mm, dd MMM').format(transaction.createdAt),
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade400,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
  }



  Widget _buildChannelTag(String channel) {
    Color color;
    switch (channel.toLowerCase()) {
      case 'cash':
        color = Colors.orange;
        break;
      case 'pos':
        color = Colors.purple;
        break;
      case 'transfer':
        color = Colors.blue;
        break;
      default:
        color = Colors.grey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Text(
        channel.toUpperCase(),
        style: TextStyle(
          fontSize: 9,
          fontWeight: FontWeight.bold,
          color: color,
        ),
      ),
    );
  }
}


