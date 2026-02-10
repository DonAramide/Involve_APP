import 'package:flutter/material.dart';
import '../bloc/settings_bloc.dart';
import '../bloc/settings_state.dart';

class PasswordDialog extends StatefulWidget {
  final SettingsBloc bloc;
  const PasswordDialog({super.key, required this.bloc});

  @override
  State<PasswordDialog> createState() => _PasswordDialogState();
}

class _PasswordDialogState extends State<PasswordDialog> {
  final _controller = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('System Access'),
      content: TextField(
        controller: _controller,
        obscureText: true,
        decoration: const InputDecoration(
          labelText: 'Enter System Password',
          hintText: 'Default is empty',
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('CANCEL')),
        ElevatedButton(
          onPressed: () {
            widget.bloc.add(VerifySystemPassword(_controller.text));
            Navigator.pop(context);
          },
          child: const Text('UNLOCK'),
        ),
      ],
    );
  }
}
