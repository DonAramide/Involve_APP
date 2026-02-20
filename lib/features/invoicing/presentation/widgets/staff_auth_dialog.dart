import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../features/settings/domain/entities/staff.dart';
import '../../../../features/settings/presentation/bloc/staff_bloc.dart';
import '../../../../features/settings/presentation/bloc/staff_state.dart';

class StaffAuthDialog extends StatefulWidget {
  const StaffAuthDialog({super.key});

  @override
  State<StaffAuthDialog> createState() => _StaffAuthDialogState();
}

class _StaffAuthDialogState extends State<StaffAuthDialog> {
  Staff? _selectedStaff;
  final _codeController = TextEditingController();
  String? _error;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<StaffBloc, StaffState>(
      builder: (context, state) {
        if (state.staffList.isEmpty) {
          return AlertDialog(
            title: const Text('Staff Authentication'),
            content: const Text(
              'No staff members found. Please go to Settings > Staff Management to add staff before using this feature.',
              style: TextStyle(color: Colors.red),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('CANCEL'),
              ),
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(context); // Close dialog
                  // Note: User will need to navigate to settings manually from dashboard
                  // or we can try to push settings, but better to just cancel and let them go there.
                },
                child: const Text('OK'),
              ),
            ],
          );
        }

        return AlertDialog(
          title: const Text('Staff Authentication'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<Staff>(
                value: _selectedStaff,
                decoration: const InputDecoration(labelText: 'Select Staff'),
                items: state.staffList.map((s) => DropdownMenuItem(
                  value: s,
                  child: Text(s.name),
                )).toList(),
                onChanged: (val) => setState(() => _selectedStaff = val),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _codeController,
                decoration: InputDecoration(
                  labelText: 'Enter 4-digit Key',
                  errorText: _error,
                ),
                obscureText: true,
                keyboardType: TextInputType.number,
                maxLength: 4,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('CANCEL'),
            ),
            ElevatedButton(
              onPressed: _selectedStaff == null ? null : _verify,
              child: const Text('CONFIRM'),
            ),
          ],
        );
      },
    );
  }

  void _verify() async {
    if (_selectedStaff == null) return;
    
    if (_codeController.text == _selectedStaff!.staffCode) {
      Navigator.pop(context, _selectedStaff);
    } else {
      setState(() {
        _error = 'Invalid Key';
      });
    }
  }
}
