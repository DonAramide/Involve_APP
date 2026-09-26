import 'package:flutter/material.dart';
import 'package:involve_app/features/settings/domain/services/security_service.dart';

/// Prompts for the local System Access password (same as Settings lock).
/// Returns true only when the password is verified.
Future<bool> requireSystemAccess(
  BuildContext context, {
  String purpose = 'Enter the System Access password to post this cash payment.',
}) async {
  final ok = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    useRootNavigator: true,
    builder: (ctx) => _SystemAccessAuthDialog(purpose: purpose),
  );
  return ok == true;
}

class _SystemAccessAuthDialog extends StatefulWidget {
  final String purpose;
  const _SystemAccessAuthDialog({required this.purpose});

  @override
  State<_SystemAccessAuthDialog> createState() => _SystemAccessAuthDialogState();
}

class _SystemAccessAuthDialogState extends State<_SystemAccessAuthDialog> {
  final _controller = TextEditingController();
  bool _visible = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final value = _controller.text;
    if (value.trim().isEmpty) {
      setState(() => _error = 'Enter the System Access password.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    final ok = await SecurityService().verifyPassword(value);
    if (!mounted) return;
    if (ok) {
      Navigator.of(context, rootNavigator: true).pop(true);
      return;
    }
    setState(() {
      _busy = false;
      _error = 'Incorrect System Access password.';
      _controller.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.admin_panel_settings, color: Colors.deepPurple),
          SizedBox(width: 8),
          Expanded(child: Text('System Access')),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            widget.purpose,
            style: TextStyle(
              fontSize: 13,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
            ),
          ),
          const SizedBox(height: 16),
          if (_error != null) ...[
            Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
            const SizedBox(height: 10),
          ],
          TextField(
            controller: _controller,
            obscureText: !_visible,
            autofocus: true,
            enabled: !_busy,
            onSubmitted: (_) => _submit(),
            decoration: InputDecoration(
              labelText: 'System Access password',
              prefixIcon: const Icon(Icons.lock_outline),
              border: const OutlineInputBorder(),
              suffixIcon: IconButton(
                icon: Icon(_visible ? Icons.visibility : Icons.visibility_off),
                onPressed: () => setState(() => _visible = !_visible),
              ),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.of(context, rootNavigator: true).pop(false),
          child: const Text('CANCEL'),
        ),
        FilledButton(
          onPressed: _busy ? null : _submit,
          child: _busy
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('AUTHORISE'),
        ),
      ],
    );
  }
}
