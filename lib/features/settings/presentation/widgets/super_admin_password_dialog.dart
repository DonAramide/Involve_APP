import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/settings_bloc.dart';
import '../bloc/settings_state.dart';

class SuperAdminPasswordDialog extends StatefulWidget {
  final SettingsBloc bloc;
  const SuperAdminPasswordDialog({super.key, required this.bloc});

  @override
  State<SuperAdminPasswordDialog> createState() => _SuperAdminPasswordDialogState();
}

class _SuperAdminPasswordDialogState extends State<SuperAdminPasswordDialog> {
  final _controller = TextEditingController();
  bool _passwordVisible = false;

  @override
  Widget build(BuildContext context) {
    return BlocListener<SettingsBloc, SettingsState>(
      bloc: widget.bloc,
      listener: (context, state) {
        // Update error message
        if (state.error != null && state.error!.contains('super admin')) {
          setState(() {
            _errorMessage = state.error;
          });
          // Clear text field on error
          _controller.clear();
        }
        
        // Close dialog on successful authorization
        if (state.isSuperAdminAuthorized && state.error == null) {
          Navigator.pop(context, true); // Return true to indicate success
        }
      },
      child: AlertDialog(
        title: Row(
          children: const [
            Icon(Icons.admin_panel_settings, color: Colors.deepPurple),
            SizedBox(width: 8),
            Text('Super Admin Access'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'This field is protected. Enter super admin password to edit.',
              style: TextStyle(fontSize: 13, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            if (_errorMessage != null) ...[
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error, color: Colors.red, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(color: Colors.red),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],
            TextField(
              controller: _controller,
              obscureText: !_passwordVisible,
              autofocus: true,
              onSubmitted: (_) => _handleSubmit(),
              decoration: InputDecoration(
                labelText: 'Super Admin Password',
                hintText: 'Enter super admin password',
                prefixIcon: const Icon(Icons.lock),
                suffixIcon: IconButton(
                  icon: Icon(
                    _passwordVisible ? Icons.visibility : Icons.visibility_off,
                  ),
                  onPressed: () {
                    setState(() {
                      _passwordVisible = !_passwordVisible;
                    });
                  },
                ),
                border: const OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('CANCEL'),
          ),
          ElevatedButton(
            onPressed: _handleSubmit,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.deepPurple,
            ),
            child: const Text('VERIFY'),
          ),
        ],
      ),
    );
  }

  void _handleSubmit() {
    setState(() {
      _errorMessage = null; // Clear previous error
    });
    
    widget.bloc.add(VerifySuperAdminPassword(_controller.text));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
