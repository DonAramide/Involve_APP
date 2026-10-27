// lib/features/health_insurance/presentation/widgets/coverage_status_badge.dart
import 'package:flutter/material.dart';
import '../../domain/entities/health_insurance_entities.dart';

class CoverageStatusBadge extends StatelessWidget {
  final EnrolmentLifecycleStatus status;
  final PolicyLifecycleStatus policyStatus;

  const CoverageStatusBadge({
    super.key,
    required this.status,
    this.policyStatus = PolicyLifecycleStatus.unknown,
  });

  @override
  Widget build(BuildContext context) {
    String label;
    Color color;
    IconData icon;

    if (status == EnrolmentLifecycleStatus.active &&
        policyStatus == PolicyLifecycleStatus.active) {
      label = 'Active Coverage';
      color = Colors.green;
      icon = Icons.verified_user;
    } else if (status == EnrolmentLifecycleStatus.awaitingInsurerActivation ||
        policyStatus == PolicyLifecycleStatus.pendingActivation) {
      label = 'Awaiting Insurer Activation';
      color = Colors.amber.shade800;
      icon = Icons.hourglass_top;
    } else if (status == EnrolmentLifecycleStatus.awaitingPremiumPayment) {
      label = 'Awaiting Premium Payment';
      color = Colors.deepOrange;
      icon = Icons.payment;
    } else if (status == EnrolmentLifecycleStatus.pendingVerification) {
      label = 'Pending School Verification';
      color = Colors.blueGrey;
      icon = Icons.pending_actions;
    } else if (status == EnrolmentLifecycleStatus.enrolmentPending) {
      label = 'Draft / Incomplete';
      color = Colors.grey;
      icon = Icons.edit_note;
    } else if (status == EnrolmentLifecycleStatus.lapsed ||
        policyStatus == PolicyLifecycleStatus.lapsed) {
      label = 'Coverage Lapsed';
      color = Colors.red.shade700;
      icon = Icons.event_busy;
    } else if (status == EnrolmentLifecycleStatus.cancelled ||
        policyStatus == PolicyLifecycleStatus.cancelled) {
      label = 'Policy Cancelled';
      color = Colors.red;
      icon = Icons.cancel;
    } else if (status == EnrolmentLifecycleStatus.rejected) {
      label = 'Enrolment Rejected';
      color = Colors.red.shade900;
      icon = Icons.block;
    } else {
      label = 'Not Enrolled';
      color = Colors.grey.shade600;
      icon = Icons.info_outline;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.5), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}
