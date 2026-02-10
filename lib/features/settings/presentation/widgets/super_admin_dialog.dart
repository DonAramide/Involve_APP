import 'package:flutter/material.dart';
import '../bloc/settings_bloc.dart';
import '../bloc/settings_state.dart';

class SuperAdminDialog extends StatefulWidget {
  final SettingsBloc bloc;
  const SuperAdminDialog({super.key, required this.bloc});

  @override
  State<SuperAdminDialog> createState() => _SuperAdminDialogState();
}

class _SuperAdminDialogState extends State<SuperAdminDialog> {
  final _controller = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Lifetime Device Activation'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('Enter the Super Admin Password to permanently authorize this device for service.'),
          const SizedBox(height: 20),
          TextField(
            controller: _controller,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Super Admin Password',
              border: OutlineInputBorder(),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('CANCEL')),
        ElevatedButton(
          onPressed: () {
            widget.bloc.add(CheckSuperAdminPassword(_controller.text));
            Navigator.pop(context);
          },
          child: const Text('ACTIVATE DEVICE'),
        ),
      ],
    );
  }
}
