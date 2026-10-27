// lib/features/health_insurance/presentation/widgets/claim_card.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../domain/entities/health_insurance_entities.dart';

class ClaimCard extends StatelessWidget {
  final HealthClaim claim;
  final VoidCallback? onTap;

  const ClaimCard({
    super.key,
    required this.claim,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final formatter = NumberFormat('#,##0.00', 'en_US');
    final formattedAmount = formatter.format(claim.authorisedAmountNaira);
    final dateFormatter = DateFormat('MMM dd, yyyy');

    Color statusColor;
    String statusLabel;
    IconData statusIcon;

    switch (claim.status) {
      case ClaimStatus.paid:
        statusColor = Colors.green;
        statusLabel = 'Paid';
        statusIcon = Icons.check_circle;
        break;
      case ClaimStatus.preAuthorized:
        statusColor = Colors.blue;
        statusLabel = 'Pre-Authorized';
        statusIcon = Icons.task_alt;
        break;
      case ClaimStatus.adjudicated:
        statusColor = Colors.teal;
        statusLabel = 'Adjudicated';
        statusIcon = Icons.fact_check;
        break;
      case ClaimStatus.submitted:
        statusColor = Colors.amber.shade800;
        statusLabel = 'Under Review';
        statusIcon = Icons.hourglass_empty;
        break;
      case ClaimStatus.rejected:
        statusColor = Colors.red;
        statusLabel = 'Rejected';
        statusIcon = Icons.cancel;
        break;
      case ClaimStatus.unknown:
        statusColor = Colors.grey;
        statusLabel = 'Recorded';
        statusIcon = Icons.receipt;
    }

    return Card(
      elevation: 1,
      margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
          width: 1,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top row: Claim reference + status pill
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    claim.claimReference,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      letterSpacing: 0.3,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(statusIcon, size: 12, color: statusColor),
                        const SizedBox(width: 4),
                        Text(
                          statusLabel,
                          style: TextStyle(
                            color: statusColor,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),

              // Facility & Member
              Text(
                claim.facilityName,
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? Colors.grey.shade300 : Colors.grey.shade800,
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (claim.memberName.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  'Beneficiary: ${claim.memberName}',
                  style: TextStyle(
                    fontSize: 11.5,
                    color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                  ),
                ),
              ],
              const SizedBox(height: 8),

              // Bottom row: Date + Amount
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    claim.statusDate != null
                        ? dateFormatter.format(claim.statusDate!)
                        : (claim.submittedDate != null
                            ? dateFormatter.format(claim.submittedDate!)
                            : 'Date unavailable'),
                    style: TextStyle(
                      fontSize: 11.5,
                      color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                    ),
                  ),
                  Text(
                    '₦$formattedAmount',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ],
              ),

              // Rejection Reason
              if (claim.status == ClaimStatus.rejected &&
                  claim.rejectionReason != null &&
                  claim.rejectionReason!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Colors.red.withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline, size: 14, color: Colors.red),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          claim.rejectionReason!,
                          style: const TextStyle(
                            fontSize: 11,
                            color: Colors.red,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
