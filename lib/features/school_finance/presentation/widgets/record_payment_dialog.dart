import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:involve_app/features/settings/domain/entities/settings.dart';
import 'package:involve_app/core/utils/terminology.dart';

class RecordPaymentDialog extends StatefulWidget {
  final String studentId;
  final String studentName;

  const RecordPaymentDialog({
    super.key,
    required this.studentId,
    required this.studentName,
  });

  static Future<Map<String, dynamic>?> show(BuildContext context, {required String studentId, required String studentName}) {
    return showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => RecordPaymentDialog(studentId: studentId, studentName: studentName),
    );
  }

  @override
  State<RecordPaymentDialog> createState() => _RecordPaymentDialogState();
}

class _RecordPaymentDialogState extends State<RecordPaymentDialog> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();
  String _selectedMethod = 'Cash';

  @override
  Widget build(BuildContext context) {
    final settings = context.read<SettingsBloc>().state.settings;
    final memberLabel = settings?.customerLabel ?? 'Customer';

    return AlertDialog(
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Record Payment', style: TextStyle(fontWeight: FontWeight.bold)),
          Text(
            '${widget.studentName} ($memberLabel)',
            style: TextStyle(fontSize: 14, color: Colors.grey.shade600, fontWeight: FontWeight.normal),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Payment Method', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 8),
              Row(
                children: [
                  _methodChip('Cash', Icons.money),
                  const SizedBox(width: 8),
                  _methodChip('Transfer', Icons.account_balance),
                  const SizedBox(width: 8),
                  _methodChip('POS', Icons.payment),
                ],
              ),
              const SizedBox(height: 20),
              TextFormField(
                controller: _amountController,
                decoration: InputDecoration(
                  labelText: 'Amount (₦)',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  prefixText: '₦ ',
                ),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.isEmpty) return 'Enter amount';
                  if (double.tryParse(value) == null) return 'Invalid amount';
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _noteController,
                decoration: InputDecoration(
                  labelText: 'Note (Optional)',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  hintText: settings?.businessMode == 'school' 
                      ? 'e.g. Paid for Term 2' 
                      : 'e.g. Partial payment for ${settings?.productLabel.toLowerCase() ?? "goods"}',
                ),
                maxLines: 2,
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _submit,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: const Text('Confirm Payment'),
        ),
      ],
    );
  }

  Widget _methodChip(String label, IconData icon) {
    final isSelected = _selectedMethod == label;
    return GestureDetector(
      onTap: () => setState(() => _selectedMethod = label),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? Colors.blue : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(icon, size: 16, color: isSelected ? Colors.white : Colors.grey),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: isSelected ? Colors.white : Colors.black87,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _submit() {
    if (_formKey.currentState!.validate()) {
      Navigator.pop(context, {
        'amount': double.parse(_amountController.text),
        'method': _selectedMethod.toLowerCase(),
        'note': _noteController.text,
      });
    }
  }
}
