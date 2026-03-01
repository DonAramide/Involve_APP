import 'package:flutter/material.dart';
import 'package:crypto/crypto.dart';
import 'dart:convert';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../features/settings/domain/entities/staff.dart';
import '../../../../features/settings/presentation/bloc/staff_bloc.dart';
import '../../../../features/settings/presentation/bloc/staff_state.dart';
import '../../../../features/settings/presentation/bloc/settings_bloc.dart';
import '../../../../features/settings/presentation/bloc/settings_state.dart';

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
    return BlocBuilder<SettingsBloc, SettingsState>(
      builder: (context, settingsState) {
        final settings = settingsState.settings;
        final isLocked = settings?.isLocked ?? false;
        final failedAttempts = settings?.failedAttempts ?? 0;

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
                    },
                    child: const Text('OK'),
                  ),
                ],
              );
            }

            return AlertDialog(
              title: Text(isLocked ? '🔒 System Locked' : 'Staff Authentication'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (isLocked) ...[
                    const Text(
                      'Too many failed attempts!',
                      style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Enter unlock code to continue:',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12),
                    ),
                    const SizedBox(height: 16),
                  ] else ...[
                    if (failedAttempts > 0) ...[
                      Container(
                        padding: const EdgeInsets.all(8),
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color: Colors.orange.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.orange),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.warning, color: Colors.orange, size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Attempts: $failedAttempts/6',
                                style: const TextStyle(
                                  color: Colors.orange,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
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
                  ],
                  TextField(
                    controller: _codeController,
                    decoration: InputDecoration(
                      labelText: isLocked ? 'Unlock Code' : 'Enter 4-digit Key',
                      errorText: _error ?? (settingsState.error != null && isLocked ? settingsState.error : null),
                    ),
                    obscureText: !isLocked,
                    keyboardType: isLocked ? TextInputType.text : TextInputType.number,
                    maxLength: isLocked ? null : 4,
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('CANCEL'),
                ),
                ElevatedButton(
                  onPressed: (isLocked || _selectedStaff != null) ? _verify : null,
                  child: Text(isLocked ? 'UNLOCK' : 'CONFIRM'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  String _hash(String input) {
    if (input.isEmpty) return "";
    const salt = "STAFF-PIN-INVIFY-2024-PROTECT";
    final bytes = utf8.encode(input + salt);
    return sha256.convert(bytes).toString();
  }

  void _verify() async {
    final settingsBloc = context.read<SettingsBloc>();
    final settings = settingsBloc.state.settings;
    final isLocked = settings?.isLocked ?? false;

    if (isLocked) {
      settingsBloc.add(UnlockSystem(_codeController.text));
      _codeController.clear();
      return;
    }

    if (_selectedStaff == null) return;
    
    if (_hash(_codeController.text) == _selectedStaff!.staffCode) {
      // Clear failed attempts on success
      settingsBloc.add(ResetFailedAttempts());
      Navigator.pop(context, _selectedStaff);
    } else {
      // Record failed attempt in SettingsBloc
      settingsBloc.add(RecordFailedAttempt());
      setState(() {
        _error = 'Invalid Key';
      });
      _codeController.clear();
    }
  }
}
