import 'package:flutter/material.dart';

class DeviceAccessDialog extends StatefulWidget {
  const DeviceAccessDialog({super.key});

  @override
  State<DeviceAccessDialog> createState() => _DeviceAccessDialogState();
}

class _DeviceAccessDialogState extends State<DeviceAccessDialog> {
  final _pinController = TextEditingController();
  
  String _getExpectedPin() {
    final now = DateTime.now();
    final dd = now.day.toString().padLeft(2, '0');
    final mm = now.month.toString().padLeft(2, '0');
    final yy = now.year.toString().substring(2);
    
    final dateNum = int.parse('$dd$mm$yy');
    final pin = dateNum * 369;
    
    return pin.toString();
  }

  @override
  void dispose() {
    _pinController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.security, color: Colors.deepPurple),
          SizedBox(width: 8),
          Text('Device Access'),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'One-Time Administrator Verification',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text('Please enter the Device Access PIN to continue.'),
          const SizedBox(height: 16),
          TextField(
            controller: _pinController,
            obscureText: true,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Enter 8-digit PIN',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.pin),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () {
            if (_pinController.text == _getExpectedPin()) {
              Navigator.pop(context, true);
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Invalid Device Access PIN'),
                  backgroundColor: Colors.red,
                ),
              );
            }
          },
          child: const Text('Verify Access'),
        ),
      ],
    );
  }
}
