// lib/features/health_insurance/presentation/pages/plan_details_page.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../domain/entities/health_insurance_entities.dart';
import 'enrolment_flow_page.dart';

class PlanDetailsPage extends StatelessWidget {
  static const String routeName = '/health_wellness/plan_details';
  final TenantPlanOffer offer;

  const PlanDetailsPage({super.key, required this.offer});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final plan = offer.plan;
    final formatter = NumberFormat('#,##0', 'en_US');
    final formattedPrice = formatter.format(plan.premiumNaira);

    return Scaffold(
      appBar: AppBar(
        title: Text(plan.name),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero card with pricing and provider
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    theme.colorScheme.primary,
                    Color.lerp(theme.colorScheme.primary, Colors.black, 0.25)!,
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          plan.providerName.toUpperCase(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'Version ${plan.version}',
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Text(
                    plan.name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        '₦$formattedPrice',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '/${plan.billingFrequency}',
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                  if (offer.sharedSplit > 0) ...[
                    const SizedBox(height: 8),
                    Text(
                      '• School subsidises ${offer.sharedSplit}% of the annual premium',
                      style: const TextStyle(
                        color: Colors.lightGreenAccent,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Plan overview
            Text(
              'Coverage Overview',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            Card(
              elevation: 1,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _infoRow(context, 'Billing Frequency', plan.billingFrequency.toUpperCase()),
                    const Divider(height: 16),
                    _infoRow(
                      context,
                      'Eligible Categories',
                      plan.memberCategories.isNotEmpty
                          ? plan.memberCategories.map((c) => c.toUpperCase()).join(', ')
                          : 'STUDENTS & STAFF',
                    ),
                    const Divider(height: 16),
                    _infoRow(context, 'Currency', plan.currency),
                    const Divider(height: 16),
                    _infoRow(
                      context,
                      'Funding Arrangement',
                      offer.defaultFunding.replaceAll('_', ' ').toUpperCase(),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Covered Benefits
            Text(
              'Covered Benefits',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            Card(
              elevation: 1,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _benefitRow('Inpatient Admission & Care', 'Covered at accredited partner hospitals', true),
                    const Divider(height: 16),
                    _benefitRow('Outpatient Specialist Consultations', 'General medicine, paediatrics & pathology', true),
                    const Divider(height: 16),
                    _benefitRow('24/7 Emergency Medical Response', 'School premises & transit emergency coverage', true),
                    const Divider(height: 16),
                    _benefitRow(
                      'Prescription Medication',
                      'Full formulary prescribed medications covered',
                      true,
                    ),
                    if (plan.benefits.containsKey('dental') && plan.benefits['dental'] == true) ...[
                      const Divider(height: 16),
                      _benefitRow('Dental Care', 'Preventative scaling, polishing & routine dental', true),
                    ],
                    if (plan.benefits.containsKey('optical') && plan.benefits['optical'] == true) ...[
                      const Divider(height: 16),
                      _benefitRow('Optical / Eye Care', 'Annual eye examination & corrective lenses', true),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Exclusions
            Text(
              'Plan Exclusions',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            Card(
              elevation: 1,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (plan.exclusions.isNotEmpty)
                      ...plan.exclusions.map((ex) => Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(Icons.cancel, size: 16, color: Colors.red),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    ex,
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: isDark ? Colors.grey.shade300 : Colors.grey.shade800,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ))
                    else ...[
                      _exclusionItem('Cosmetic or aesthetic surgical procedures'),
                      _exclusionItem('Unprescribed over-the-counter alternative therapies'),
                      _exclusionItem('Pre-existing chronic conditions without declaration'),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),

            // Enrol button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => EnrolmentFlowPage(selectedOffer: offer),
                    ),
                  );
                },
                icon: const Icon(Icons.add_task),
                label: const Text('PROCEED WITH ENROLMENT'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: theme.colorScheme.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  static Widget _infoRow(BuildContext context, String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: Colors.grey)),
        Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
      ],
    );
  }

  static Widget _benefitRow(String title, String subtitle, bool covered) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          covered ? Icons.check_circle : Icons.remove_circle_outline,
          color: covered ? Colors.green : Colors.grey,
          size: 18,
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 2),
              Text(subtitle, style: const TextStyle(fontSize: 11.5, color: Colors.grey)),
            ],
          ),
        ),
      ],
    );
  }

  static Widget _exclusionItem(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.cancel, size: 16, color: Colors.red),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 13))),
        ],
      ),
    );
  }
}
