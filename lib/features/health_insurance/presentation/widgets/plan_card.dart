// lib/features/health_insurance/presentation/widgets/plan_card.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../domain/entities/health_insurance_entities.dart';

class PlanCard extends StatelessWidget {
  final TenantPlanOffer offer;
  final VoidCallback? onTap;
  final VoidCallback? onEnrolTap;

  const PlanCard({
    super.key,
    required this.offer,
    this.onTap,
    this.onEnrolTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final plan = offer.plan;
    final formatter = NumberFormat('#,##0', 'en_US');
    final formattedPrice = formatter.format(plan.premiumNaira);

    return Card(
      elevation: 2,
      margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(
          color: theme.colorScheme.primary.withOpacity(0.2),
          width: 1,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Provider + Tier badge
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.blue.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      plan.providerName.toUpperCase(),
                      style: const TextStyle(
                        color: Colors.blue,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  if (offer.sharedSplit > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'School Contributes ${offer.sharedSplit}%',
                        style: const TextStyle(
                          color: Colors.green,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 10),

              // Plan Name
              Text(
                plan.name,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),

              // Price
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    '₦$formattedPrice',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '/${plan.billingFrequency}',
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Divider(height: 1),
              const SizedBox(height: 12),

              // Benefits Summary Pills
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  _benefitChip(Icons.local_hospital, 'Inpatient Care', true),
                  _benefitChip(Icons.medical_services, 'Outpatient Consults', true),
                  _benefitChip(Icons.emergency, '24/7 Emergency', true),
                  if (plan.benefits.containsKey('dental') && plan.benefits['dental'] == true)
                    _benefitChip(Icons.clean_hands, 'Dental Included', true),
                  if (plan.benefits.containsKey('optical') && plan.benefits['optical'] == true)
                    _benefitChip(Icons.visibility, 'Optical Included', true),
                ],
              ),
              const SizedBox(height: 14),

              // Actions
              Row(
                children: [
                  OutlinedButton.icon(
                    onPressed: onTap,
                    icon: const Icon(Icons.info_outline, size: 16),
                    label: const Text('Details'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      visualDensity: VisualDensity.compact,
                    ),
                  ),
                  const Spacer(),
                  if (onEnrolTap != null)
                    ElevatedButton.icon(
                      onPressed: onEnrolTap,
                      icon: const Icon(Icons.add_task, size: 16),
                      label: const Text('Enrol Now'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: theme.colorScheme.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        visualDensity: VisualDensity.compact,
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _benefitChip(IconData icon, String label, bool covered) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: covered ? Colors.teal.withOpacity(0.08) : Colors.grey.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: covered ? Colors.teal : Colors.grey),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: covered ? Colors.teal.shade800 : Colors.grey.shade700,
            ),
          ),
        ],
      ),
    );
  }
}
