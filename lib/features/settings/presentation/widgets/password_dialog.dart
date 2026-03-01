import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
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
  bool _isLocked = false;
  int _failedAttempts = 0;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    // Check if system is locked
    final settings = widget.bloc.state.settings;
    if (settings != null) {
      _isLocked = settings.isLocked;
      _failedAttempts = settings.failedAttempts;
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<SettingsBloc, SettingsState>(
      bloc: widget.bloc,
      listener: (context, state) {
        if (state.settings != null) {
          setState(() {
            _isLocked = state.settings!.isLocked;
            _failedAttempts = state.settings!.failedAttempts;
          });
        }
        
        // Update error message
        if (state.error != null) {
          setState(() {
            _errorMessage = state.error;
          });
          // Clear text field on error
          _controller.clear();
        }
        
        // Close dialog on successful unlock/authorization
        if (state.isAuthorized) {
          Navigator.of(context, rootNavigator: true).pop(true);
        }
      },
      child: AlertDialog(
        title: Text(_isLocked ? '🔒 System Locked' : 'System Access'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_isLocked) ...[
              const Text(
                'Too many failed attempts!',
                style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Enter unlock code:',
                style: TextStyle(fontSize: 12),
              ),
              const SizedBox(height: 4),
              const SizedBox(height: 8),
            ] else if (_failedAttempts > 0) ...[
              Container(
                padding: const EdgeInsets.all(8),
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
                        'Failed attempts: $_failedAttempts/6',
                        style: const TextStyle(
                          color: Colors.orange,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
            ],
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
              const SizedBox(height: 8),
            ],
            TextField(
              controller: _controller,
              obscureText: !_isLocked, // Show text for unlock code
              autofocus: true,
              onSubmitted: (_) => _handleSubmit(),
              decoration: InputDecoration(
                labelText: _isLocked ? 'Unlock Code' : 'System Password',
                hintText: null,
                errorText: null, // Clear default error text
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('CANCEL'),
          ),
          ElevatedButton(
            onPressed: _handleSubmit,
            child: Text(_isLocked ? 'UNLOCK' : 'VERIFY'),
          ),
        ],
      ),
    );
  }

  void _handleSubmit() {
    setState(() {
      _errorMessage = null; // Clear previous error
    });
    
    if (_isLocked) {
      widget.bloc.add(UnlockSystem(_controller.text));
    } else {
      widget.bloc.add(VerifySystemPassword(_controller.text));
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
