// lib/features/health_insurance/presentation/pages/policy_details_page.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../domain/entities/health_insurance_entities.dart';
import '../bloc/health_insurance_bloc.dart';
import '../bloc/health_insurance_event.dart';
import '../bloc/health_insurance_state.dart';
import '../widgets/coverage_status_badge.dart';
import 'claims_status_page.dart';

class PolicyDetailsPage extends StatelessWidget {
  static const String routeName = '/health_wellness/policy_details';
  final HealthEnrolment enrolment;

  const PolicyDetailsPage({super.key, required this.enrolment});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final dateFormatter = DateFormat('MMM dd, yyyy');
    final formatter = NumberFormat('#,##0', 'en_US');

    final bool isInsurerConfirmed = enrolment.policyStatus == PolicyLifecycleStatus.active;

    return BlocConsumer<HealthInsuranceBloc, HealthInsuranceState>(
      listener: (context, state) {
        if (state.actionSuccessMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.actionSuccessMessage!),
              backgroundColor: Colors.green,
            ),
          );
        } else if (state.errorMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.errorMessage!),
              backgroundColor: Colors.red,
            ),
          );
        }
      },
      builder: (context, state) {
        // Find latest version of this enrolment from state if updated
        final currentEnrolment = state.enrolments.firstWhere(
          (e) => e.id == enrolment.id,
          orElse: () => enrolment,
        );

        return Scaffold(
          appBar: AppBar(
            title: const Text('Policy & Coverage'),
            actions: [
              IconButton(
                icon: const Icon(Icons.receipt_long),
                tooltip: 'View Claims',
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ClaimsStatusPage(policyId: currentEnrolment.policyId),
                    ),
                  );
                },
              ),
            ],
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Digital Insurance ID Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        isInsurerConfirmed
                            ? const Color(0xFF1B5E20)
                            : const Color(0xFF37474F),
                        isInsurerConfirmed
                            ? const Color(0xFF2E7D32)
                            : const Color(0xFF263238),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.2),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.health_and_safety, color: Colors.white, size: 24),
                              const SizedBox(width: 8),
                              Text(
                                currentEnrolment.providerName.toUpperCase(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                  letterSpacing: 0.8,
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: isInsurerConfirmed
                                  ? Colors.greenAccent.withOpacity(0.25)
                                  : Colors.amberAccent.withOpacity(0.25),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  isInsurerConfirmed ? Icons.verified : Icons.sync,
                                  color: isInsurerConfirmed
                                      ? Colors.lightGreenAccent
                                      : Colors.amberAccent,
                                  size: 13,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  isInsurerConfirmed
                                      ? 'INSURER CONFIRMED'
                                      : 'ACTIVATION PENDING',
                                  style: TextStyle(
                                    color: isInsurerConfirmed
                                        ? Colors.lightGreenAccent
                                        : Colors.amberAccent,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Text(
                        currentEnrolment.memberName.isNotEmpty
                            ? currentEnrolment.memberName
                            : 'Beneficiary',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.3,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${currentEnrolment.memberCategory.toUpperCase()} • ID: ${currentEnrolment.admissionNumber.isNotEmpty ? currentEnrolment.admissionNumber : "N/A"}',
                        style: const TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                      const SizedBox(height: 20),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'POLICY NUMBER',
                                style: TextStyle(
                                  color: Colors.white60,
                                  fontSize: 10,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                currentEnrolment.policyNumber ?? 'POL-PENDING-ACTIVATION',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1,
                                ),
                              ),
                            ],
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              const Text(
                                'COVERAGE ENDS',
                                style: TextStyle(
                                  color: Colors.white60,
                                  fontSize: 10,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                currentEnrolment.periodEnd != null
                                    ? dateFormatter.format(currentEnrolment.periodEnd!)
                                    : 'Ongoing',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Coverage Status Badge
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Lifecycle State:', style: TextStyle(fontSize: 13, color: Colors.grey)),
                    CoverageStatusBadge(
                      status: currentEnrolment.status,
                      policyStatus: currentEnrolment.policyStatus,
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Coverage Details Card
                Card(
                  elevation: 1,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        _detailRow('Insurance Plan', currentEnrolment.planName),
                        const Divider(height: 16),
                        _detailRow('HMO Provider', currentEnrolment.providerName),
                        const Divider(height: 16),
                        _detailRow(
                          'Annual Premium',
                          '₦${formatter.format(currentEnrolment.premiumNaira)}',
                        ),
                        const Divider(height: 16),
                        _detailRow(
                          'Effective From',
                          currentEnrolment.periodStart != null
                              ? dateFormatter.format(currentEnrolment.periodStart!)
                              : 'Pending',
                        ),
                        const Divider(height: 16),
                        _detailRow(
                          'Expiry / Renewal',
                          currentEnrolment.periodEnd != null
                              ? dateFormatter.format(currentEnrolment.periodEnd!)
                              : 'Pending',
                        ),
                        if (currentEnrolment.statusReason != null &&
                            currentEnrolment.statusReason!.isNotEmpty) ...[
                          const Divider(height: 16),
                          _detailRow('Status Notes', currentEnrolment.statusReason!),
                        ],
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Action section
                if (!isInsurerConfirmed) ...[
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.amber.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.amber.shade700, width: 1),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.hourglass_top, color: Colors.amber.shade900, size: 20),
                            const SizedBox(width: 8),
                            Text(
                              'Insurer Activation in Progress',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.amber.shade900,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Enrolment records have been submitted to ${currentEnrolment.providerName}. Insurer policy issuance normally completes within 24 to 48 business hours.',
                          style: TextStyle(
                            fontSize: 12.5,
                            color: isDark ? Colors.grey.shade300 : Colors.grey.shade800,
                          ),
                        ),
                        const SizedBox(height: 12),
                        // Sandbox Activation Test Button (for development / staging verification)
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: state.isActionLoading
                                ? null
                                : () {
                                    context.read<HealthInsuranceBloc>().add(
                                          SimulateSandboxActivationRequest(currentEnrolment.id),
                                        );
                                  },
                            icon: const Icon(Icons.science, size: 16),
                            label: const Text('Simulate Insurer Activation (Sandbox)'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.amber.shade900,
                              side: BorderSide(color: Colors.amber.shade700),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],

                // Claims button
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ClaimsStatusPage(policyId: currentEnrolment.policyId),
                        ),
                      );
                    },
                    icon: const Icon(Icons.local_hospital),
                    label: const Text('VIEW POLICY CLAIMS & USAGE'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: theme.colorScheme.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        );
      },
    );
  }

  static Widget _detailRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: Colors.grey)),
        Text(
          value,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }
}
