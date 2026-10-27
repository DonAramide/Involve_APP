// lib/features/health_insurance/presentation/widgets/unverified_warning_banner.dart
import 'package:flutter/material.dart';

class UnverifiedWarningBanner extends StatelessWidget {
  final String studentName;
  final bool isRejected;

  const UnverifiedWarningBanner({
    super.key,
    required this.studentName,
    this.isRejected = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final primaryColor = isRejected ? Colors.red.shade700 : Colors.amber.shade900;
    final bgColor = isDark
        ? (isRejected ? Colors.red.shade900 : Colors.amber.shade900).withOpacity(0.4)
        : (isRejected ? Colors.red.shade50 : Colors.amber.shade50);
    final borderColor = isRejected ? Colors.red.shade400 : Colors.amber.shade600;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor, width: 1.2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isRejected ? Icons.warning_amber_rounded : Icons.shield_outlined,
                color: primaryColor,
                size: 22,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  isRejected
                      ? 'Guardian Relationship Rejected'
                      : 'Relationship Pending School Verification',
                  style: TextStyle(
                    color: primaryColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            isRejected
                ? 'Your requested guardian link for $studentName was reviewed and rejected by the school administration. You cannot access insurance policies, medical summaries, or submit health claims.'
                : 'Your relationship with $studentName has not yet been verified by the school administration. In accordance with child data privacy safeguards, health coverage details, policy documents, and medical claims remain locked until verification is confirmed.',
            style: TextStyle(
              fontSize: 12.5,
              height: 1.4,
              color: isDark ? Colors.grey.shade200 : Colors.grey.shade900,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Icon(Icons.info_outline, size: 14, color: primaryColor),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Contact the school administrative office with proof of guardianship to verify this link.',
                  style: TextStyle(
                    fontSize: 11.5,
                    fontStyle: FontStyle.italic,
                    color: isDark ? Colors.grey.shade300 : Colors.grey.shade800,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
