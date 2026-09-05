import 'package:flutter/material.dart';
import '../../domain/entities/settings.dart';

class BusinessModeSelector extends StatelessWidget {
  final AppSettings settings;
  final bool isLocked;
  final Function(String) onModeChanged;

  const BusinessModeSelector({
    super.key,
    required this.settings,
    this.isLocked = false,
    required this.onModeChanged,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Text(
            'Business Mode',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: scheme.primary),
          ),
        ),
        Card(
          elevation: 0,
          color: scheme.primary.withValues(alpha: isDark ? 0.16 : 0.05),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: scheme.primary.withValues(alpha: isDark ? 0.45 : 0.2)),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Icon(Icons.business_center, color: scheme.primary),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Operational Mode',
                        style: TextStyle(fontWeight: FontWeight.bold, color: scheme.onSurface),
                      ),
                      Text(
                        'Switch between Retail, School, and Services logic',
                        style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                ),
                if (isLocked)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: Icon(Icons.lock, color: scheme.onSurfaceVariant, size: 16),
                  ),
                DropdownButton<String>(
                  value: _selectableMode(settings.businessMode),
                  underline: const SizedBox(),
                  dropdownColor: scheme.surfaceContainerHighest,
                  style: TextStyle(color: scheme.onSurface),
                  disabledHint: Text(
                    _modeLabel(settings.businessMode),
                    style: TextStyle(color: scheme.onSurface),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'retail', child: Text('Retail (Default)')),
                    DropdownMenuItem(value: 'school', child: Text('School Mode')),
                    DropdownMenuItem(value: 'services', child: Text('Services Mode')),
                  ],
                  onChanged: isLocked ? null : (val) {
                    if (val != null) onModeChanged(val);
                  },
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  String _selectableMode(String mode) {
    final normalized = mode.toLowerCase().trim().replaceAll(RegExp(r'[\s-]+'), '_');
    if (normalized == 'service' || normalized == 'hospitality' || normalized == 'invify_services') {
      return 'services';
    }
    if (normalized == 'school' || normalized == 'education' || normalized == 'invify_school') {
      return 'school';
    }
    if (normalized == 'services') return 'services';
    return 'retail';
  }

  String _modeLabel(String mode) {
    switch (_selectableMode(mode)) {
      case 'school':
        return 'School Mode';
      case 'services':
        return 'Services Mode';
      default:
        return 'Retail (Default)';
    }
  }
}
