import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/core/utils/device_info_service.dart';
import 'package:involve_app/services/terminal_sync_service.dart';
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
  bool _syncingRecovery = false;
  int _failedAttempts = 0;
  String? _errorMessage;
  bool _hasPopped = false;

  @override
  void initState() {
    super.initState();
    final settings = widget.bloc.state.settings;
    if (settings != null) {
      _isLocked = settings.isLocked;
      _failedAttempts = settings.failedAttempts;
    }
  }

  Future<void> _syncRecoveryPassword() async {
    setState(() {
      _syncingRecovery = true;
      _errorMessage = null;
    });
    try {
      final deviceId = await DeviceInfoService.getDeviceSuffix();
      await TerminalSyncService.syncTerminalConfig(deviceId: deviceId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Checked with server. If your admin generated a password, enter it below.'),
          backgroundColor: Color(0xFF10B981),
        ),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _errorMessage =
            'Could not reach the server. Connect to the internet, then ask your tenant admin to generate a System Password in the web dashboard.';
      });
    } finally {
      if (mounted) setState(() => _syncingRecovery = false);
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

        if (state.error != null) {
          setState(() {
            _errorMessage = state.error;
          });
          _controller.clear();
        }

        if (state.isAuthorized && !_hasPopped) {
          _hasPopped = true;
          Navigator.of(context, rootNavigator: true).pop(true);
        }
      },
      child: AlertDialog(
        title: Text(_isLocked ? '🔒 System Locked' : 'System Access'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_isLocked) ...[
                const Text(
                  'Too many failed attempts!',
                  style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Connect to the internet and contact your tenant admin / check the web dashboard for a generated System Password, then enter it below.',
                  style: TextStyle(fontSize: 12),
                ),
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
                Text(
                  'Forgot password? Connect to the internet and ask your tenant admin to generate a System Password in the web dashboard.',
                  style: TextStyle(fontSize: 11, color: Colors.grey[700]),
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
                obscureText: !_isLocked,
                autofocus: true,
                onSubmitted: (_) => _handleSubmit(),
                decoration: InputDecoration(
                  labelText: _isLocked ? 'Recovery / Unlock Password' : 'System Password',
                  hintText: null,
                  errorText: null,
                ),
              ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: _syncingRecovery ? null : _syncRecoveryPassword,
                  icon: _syncingRecovery
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.cloud_sync, size: 16),
                  label: Text(
                    _syncingRecovery ? 'Checking server...' : 'Sync recovery password',
                    style: const TextStyle(fontSize: 12),
                  ),
                ),
              ),
            ],
          ),
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
      _errorMessage = null;
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
