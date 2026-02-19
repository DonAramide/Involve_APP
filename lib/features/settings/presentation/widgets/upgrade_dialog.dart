import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/settings_bloc.dart';
import '../bloc/settings_state.dart';

class UpgradeDialog extends StatelessWidget {
  const UpgradeDialog({super.key});

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.star, color: Colors.amber),
          SizedBox(width: 8),
          Text('Upgrade to Pro'),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Text('Service Billing is a premium feature.'),
          SizedBox(height: 16),
          Text('Unlock these benefits:', style: TextStyle(fontWeight: FontWeight.bold)),
          SizedBox(height: 8),
          _BenefitItem('Daily & Hourly Billing'),
          _BenefitItem('Hospitality & Event Support'),
          _BenefitItem('Advanced Receipt Formats'),
          _BenefitItem('Priority Support'),
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
            // Simulate upgrade
            context.read<SettingsBloc>().add(UpgradeProPlan(durationDays: 30));
            Navigator.pop(context);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Welcome to Pro! Feature Unlocked.')),
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
