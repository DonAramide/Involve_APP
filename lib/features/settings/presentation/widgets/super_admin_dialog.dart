import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
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
  String? _errorMessage;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<SettingsBloc, SettingsState>(
      bloc: widget.bloc,
      listener: (context, state) {
        if (state.isDeviceAuthorized && state.error == null) {
          Navigator.pop(context, true);
        }
        if (state.error != null) {
          setState(() {
            _errorMessage = state.error;
          });
        }
      },
      child: AlertDialog(
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
          if (_errorMessage != null) ...[
            const SizedBox(height: 8),
            Text(
              _errorMessage!,
              style: const TextStyle(color: Colors.red, fontSize: 12),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('CANCEL')),
        ElevatedButton(
          onPressed: () {
            setState(() => _errorMessage = null);
            widget.bloc.add(CheckSuperAdminPassword(_controller.text));
          },
          child: const Text('ACTIVATE DEVICE'),
        ),
      ],
      ),
    );
  }
}
