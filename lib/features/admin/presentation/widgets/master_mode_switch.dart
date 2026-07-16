// lib/features/admin/presentation/widgets/master_mode_switch.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/admin_bloc.dart';

class MasterModeSwitch extends StatelessWidget {
  const MasterModeSwitch({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AdminBloc, AdminState>(
      listener: (context, state) {
        if (state.error != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.error!), backgroundColor: Colors.red),
          );
        }
      },
      builder: (context, state) {
        return Row(
          children: [
            if (state.isMasterMode) ...[
              const Icon(Icons.shield, color: Colors.orange, size: 16),
              const SizedBox(width: 4),
              _CountdownTimer(expiry: state.masterExpiry!),
              const SizedBox(width: 8),
            ],
            Switch(
              value: state.isMasterMode,
              activeColor: Colors.orange,
              onChanged: (val) => _handleToggle(context, val, state.isMasterMode),
            ),
            const Text('Master Mode', style: TextStyle(fontSize: 12)),
          ],
        );
      },
    );
  }

  void _handleToggle(BuildContext context, bool value, bool current) {
    if (current) {
      context.read<AdminBloc>().add(ExitMasterMode());
    } else {
      _showElevationDialog(context);
    }
  }

  void _showElevationDialog(BuildContext context) {
    final passwordController = TextEditingController();
    final otpController = TextEditingController();

    showDialog(
      context: context,
      builder: (diagContext) => AlertDialog(
        title: const Text('Enter Master Mode'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Sensitive operations (API key creation, security settings) require an elevated 15-minute session.',
              style: TextStyle(fontSize: 13, color: Colors.grey),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: passwordController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Verify Password',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: otpController,
              decoration: const InputDecoration(
                labelText: '2FA Code (If enabled)',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(diagContext), child: const Text('CANCEL')),
          ElevatedButton(
            onPressed: () {
              context.read<AdminBloc>().add(
                EnterMasterMode(passwordController.text, otpController.text),
              );
              Navigator.pop(diagContext);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.orange, foregroundColor: Colors.white),
            child: const Text('ELEVATE SESSION'),
          ),
        ],
      ),
    );
  }
}

class _CountdownTimer extends StatefulWidget {
  final DateTime expiry;
  const _CountdownTimer({required this.expiry});

  @override
  State<_CountdownTimer> createState() => _CountdownTimerState();
}

class _CountdownTimerState extends State<_CountdownTimer> {
  late Duration _remaining;

  @override
  void initState() {
    super.initState();
    _updateRemaining();
  }

  void _updateRemaining() {
    setState(() {
      _remaining = widget.expiry.difference(DateTime.now());
    });
    if (_remaining.inSeconds > 0) {
      Future.delayed(const Duration(seconds: 1), _updateRemaining);
    }
  }

  @override
  Widget build(BuildContext context) {
    final minutes = _remaining.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = _remaining.inSeconds.remainder(60).toString().padLeft(2, '0');
    
    return Text(
      '$minutes:$seconds',
      style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.orange, fontSize: 13),
    );
  }
}
