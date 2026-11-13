import 'package:flutter/material.dart';
import 'package:involve_app/services/terminal_sync_service.dart';

/// Read-only tile showing which Institute Portal the current tenant belongs to.
class InstituteAffiliationTile extends StatelessWidget {
  final TerminalConfig? config;
  final EdgeInsetsGeometry? margin;

  const InstituteAffiliationTile({
    super.key,
    required this.config,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final has = config?.hasInstituteAffiliation == true;
    final label = has ? config!.instituteDisplayLabel : 'Not synced yet';
    final subtitle = has
        ? (config!.instituteIsDefault
            ? 'Platform default institute'
            : 'Affiliated institute for this tenant')
        : 'Pulls from the server on the next terminal sync';

    return Card(
      margin: margin ?? const EdgeInsets.symmetric(vertical: 8),
      elevation: 0,
      color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
      child: ListTile(
        leading: Icon(
          Icons.account_balance_outlined,
          color: theme.colorScheme.primary,
        ),
        title: const Text(
          'Institute',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: theme.colorScheme.onSurface,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 12,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
        isThreeLine: true,
      ),
    );
  }
}
