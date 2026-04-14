import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../domain/entities/virtual_account.dart';

class VirtualAccountCard extends StatelessWidget {
  final VirtualAccount account;
  final String studentName;

  const VirtualAccountCard({
    super.key,
    required this.account,
    required this.studentName,
  });

  void _copyToClipboard(BuildContext context) {
    Clipboard.setData(ClipboardData(text: account.accountNumber));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Account number copied to clipboard')),
    );
  }

  void _shareViaWhatsApp(BuildContext context) {
    final String message = Uri.encodeComponent(
      'Payment Details for $studentName:\n'
      'Bank: ${account.bankName}\n'
      'Account Number: ${account.accountNumber}\n'
      'Account Name: Senior Fintech / IIPS\n\n'
      'Pay via this account to update your balance instantly.\n'
      'Portal Link: https://portal.iips.edu.ng/payment/${account.reference}'
    );
    // Note: In production, use url_launcher for better coverage
    // ignore: deprecated_member_use
    // launch('whatsapp://send?text=$message');
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.indigo.shade800, Colors.indigo.shade600],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.indigo.withOpacity(0.3),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'VIRTUAL ACCOUNT',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.2,
                ),
              ),
              Image.network(
                'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Wema_Bank_Logo.svg/1200px-Wema_Bank_Logo.svg.png',
                height: 20,
                errorBuilder: (_, __, ___) => const Icon(Icons.account_balance, color: Colors.white, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    account.accountNumber,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 2,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    account.bankName.toUpperCase(),
                    style: const TextStyle(
                      color: Colors.white60,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
              IconButton(
                onPressed: () => _copyToClipboard(context),
                icon: const Icon(Icons.copy_rounded, color: Colors.white),
                style: IconButton.styleFrom(
                  backgroundColor: Colors.white.withOpacity(0.1),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'ACCOUNT NAME',
                    style: TextStyle(color: Colors.white54, fontSize: 8),
                  ),
                  Text(
                    'SENIOR FINTECH / IIPS',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              ElevatedButton.icon(
                onPressed: () => _shareViaWhatsApp(context),
                icon: const Icon(Icons.share, size: 14),
                label: const Text('SHARE'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.indigo,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  textStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
