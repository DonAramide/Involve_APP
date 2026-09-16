import 'package:flutter/material.dart';
import '../../domain/entities/financial_transaction.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/core/utils/invoice_payment_rail.dart';
import '../pages/student_finance_profile.dart';

class GlobalTransactionTile extends StatelessWidget {
  final FinancialTransaction transaction;

  const GlobalTransactionTile({super.key, required this.transaction});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
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
          color: isDark ? theme.cardColor : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isDark ? theme.dividerColor : Colors.grey.withOpacity(0.05)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: (isCredit ? Colors.green : Colors.red).withOpacity(isDark ? 0.2 : 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                isCredit ? Icons.arrow_downward : Icons.arrow_upward,
                color: isCredit ? (isDark ? Colors.greenAccent : Colors.green) : Colors.red,
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
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      _buildChannelTag(transaction.channel),
                      if (isQuasarPaymentRail(classifyInvoicePaymentRail(transaction.channel))) ...[
                        const SizedBox(width: 4),
                        _buildQuasarBadge(),
                      ],
                    ],
                  ),
                  Text(
                    transaction.reference,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.grey.shade400 : Colors.grey.shade500,
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
                    color: isCredit
                        ? (isDark ? Colors.greenAccent : Colors.green)
                        : (isDark ? Colors.white70 : Colors.black87),
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
    final rail = classifyInvoicePaymentRail(channel);
    final label = paymentRailChannelLabel(channel);
    final Color color;
    switch (rail) {
      case InvoicePaymentRail.card:
        color = Colors.purple;
        break;
      case InvoicePaymentRail.vaTransfer:
        color = Colors.indigo;
        break;
      case InvoicePaymentRail.cash:
        color = Colors.orange;
        break;
      case InvoicePaymentRail.bankTransfer:
        color = Colors.blueGrey;
        break;
      case InvoicePaymentRail.wallet:
        color = Colors.teal;
        break;
      case InvoicePaymentRail.other:
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
        label.toUpperCase(),
        style: TextStyle(
          fontSize: 9,
          fontWeight: FontWeight.bold,
          color: color,
        ),
      ),
    );
  }

  Widget _buildQuasarBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.teal.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: Colors.teal.withOpacity(0.25)),
      ),
      child: const Text(
        'QUASAR',
        style: TextStyle(
          fontSize: 9,
          fontWeight: FontWeight.bold,
          color: Colors.teal,
        ),
      ),
    );
  }
}


