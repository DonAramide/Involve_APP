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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 8),
          child: Text(
            'Business Mode',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.blue),
          ),
        ),
        Card(
          elevation: 0,
          color: Colors.blue.withOpacity(0.05),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: Colors.blue.withOpacity(0.2)),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                const Icon(Icons.business_center, color: Colors.blue),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Operational Mode',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Switch between Retail and School logic',
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
                if (isLocked)
                  const Padding(
                    padding: EdgeInsets.only(right: 8),
                    child: Icon(Icons.lock, color: Colors.grey, size: 16),
                  ),
                DropdownButton<String>(
                  value: settings.businessMode,
                  underline: const SizedBox(),
                  disabledHint: Text(settings.businessMode == 'school' ? 'School Mode' : 'Retail (Default)'),
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
}
