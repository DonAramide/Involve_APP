// lib/features/health_insurance/presentation/widgets/child_coverage_card.dart
import 'package:flutter/material.dart';
import '../../domain/entities/health_insurance_entities.dart';
import 'coverage_status_badge.dart';

class ChildCoverageCard extends StatelessWidget {
  final GuardianChild child;
  final HealthEnrolment? enrolment;
  final bool isSelected;
  final VoidCallback onTap;

  const ChildCoverageCard({
    super.key,
    required this.child,
    this.enrolment,
    this.isSelected = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final isVerified = child.isVerified;

    return Card(
      elevation: isSelected ? 3 : 1,
      margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(
          color: isSelected
              ? theme.colorScheme.primary
              : (isDark ? Colors.grey.shade800 : Colors.grey.shade300),
          width: isSelected ? 2 : 1,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              // Avatar with initial
              CircleAvatar(
                radius: 24,
                backgroundColor: isVerified
                    ? theme.colorScheme.primary.withOpacity(0.15)
                    : Colors.amber.withOpacity(0.2),
                child: Text(
                  child.firstName.isNotEmpty ? child.firstName[0].toUpperCase() : 'S',
                  style: TextStyle(
                    color: isVerified ? theme.colorScheme.primary : Colors.amber.shade900,
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                  ),
                ),
              ),
              const SizedBox(width: 14),

              // Student details & status
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            child.fullName.isNotEmpty ? child.fullName : 'Student',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        // Verification pill
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: isVerified
                                ? Colors.green.withOpacity(0.12)
                                : Colors.amber.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                isVerified ? Icons.check_circle : Icons.schedule,
                                size: 11,
                                color: isVerified ? Colors.green : Colors.amber.shade900,
                              ),
                              const SizedBox(width: 3),
                              Text(
                                isVerified ? 'Verified' : 'Pending',
                                style: TextStyle(
                                  color: isVerified ? Colors.green : Colors.amber.shade900,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${child.currentClass.isNotEmpty ? child.currentClass : "Class N/A"} • Adm: ${child.admissionNumber.isNotEmpty ? child.admissionNumber : "N/A"}',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    if (isVerified) ...[
                      CoverageStatusBadge(
                        status: enrolment?.status ?? EnrolmentLifecycleStatus.unknown,
                        policyStatus: enrolment?.policyStatus ?? PolicyLifecycleStatus.unknown,
                      ),
                    ] else ...[
                      Text(
                        'Details restricted until verification',
                        style: TextStyle(
                          fontSize: 11,
                          fontStyle: FontStyle.italic,
                          color: Colors.amber.shade800,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                Icons.chevron_right,
                color: isDark ? Colors.grey.shade600 : Colors.grey.shade400,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
