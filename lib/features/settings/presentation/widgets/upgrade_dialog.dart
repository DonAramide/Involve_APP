import 'package:flutter/material.dart';
import '../../../activation/presentation/pages/activation_page.dart';
import '../../domain/entities/user_plan.dart';

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
          Text(
            message ??
                'Choose a plan to unlock online features and multi-device sync.',
          ),
          const SizedBox(height: 16),
          const Text('Plans:', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const _BenefitItem(UserPlan.basicSummary),
          const _BenefitItem(UserPlan.standardSummary),
          const _BenefitItem(UserPlan.premiumSummary),
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
            Navigator.pop(context);
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check_circle, color: Colors.green, size: 20),
          const SizedBox(width: 8),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}
