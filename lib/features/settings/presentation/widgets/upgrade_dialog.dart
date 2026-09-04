import 'package:flutter/material.dart';
import '../../../activation/presentation/pages/activation_page.dart';

class UpgradeDialog extends StatelessWidget {
  final String? title;
  final String? message;
  const UpgradeDialog({super.key, this.title, this.message});

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          const Icon(Icons.star, color: Colors.amber),
          const SizedBox(width: 8),
          Text(title ?? 'Upgrade Plan'),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(message ?? 'This feature is available on all plans except Basic and Free Tier.'),
          const SizedBox(height: 16),
          const Text('Unlock these benefits:', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const _BenefitItem('Unlimited Staff & Staff Bank/VA Accounts'),
          const _BenefitItem('Daily & Hourly Billing'),
          const _BenefitItem('Hospitality & Event Support'),
          const _BenefitItem('Advanced Receipt Formats'),
          const _BenefitItem('Priority Support'),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('CANCEL'),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.amber,
            foregroundColor: Colors.black,
          ),
          onPressed: () {
            Navigator.pop(context); // Close dialog
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ActivationPage()),
            );
          },
          child: const Text('UPGRADE NOW'),
        ),
      ],
    );
  }
}

class _BenefitItem extends StatelessWidget {
  final String text;
  const _BenefitItem(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        children: [
          const Icon(Icons.check_circle, color: Colors.green, size: 20),
          const SizedBox(width: 8),
          Text(text),
        ],
      ),
    );
  }
}
