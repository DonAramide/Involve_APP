import 'package:flutter/material.dart';
import 'package:involve_app/features/school/domain/services/parent_payment_allocator.dart';

class ParentPaymentShareModePicker extends StatelessWidget {
  final String value;
  final ValueChanged<String> onChanged;

  const ParentPaymentShareModePicker({
    super.key,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final selected = ParentPaymentShareModeX.fromStorage(value);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Parent payment sharing',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          'Choose how money paid on a parent account is applied to children with outstanding fees.',
          style: TextStyle(color: Colors.blueGrey.shade700, fontSize: 13),
        ),
        const SizedBox(height: 8),
        ...ParentPaymentShareMode.values.map((mode) {
          return RadioListTile<ParentPaymentShareMode>(
            value: mode,
            groupValue: selected,
            onChanged: (next) {
              if (next != null) onChanged(next.storageValue);
            },
            title: Text(mode.title),
            subtitle: Text(mode.description),
            contentPadding: EdgeInsets.zero,
            dense: true,
          );
        }),
      ],
    );
  }
}
