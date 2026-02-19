import 'package:flutter/material.dart';
import '../../../printer/data/repositories/network_printer_service.dart';
import '../../../../core/license/storage_service.dart';

/// Dialog for configuring WiFi/Network printer
class NetworkPrinterConfigDialog extends StatefulWidget {
  final Function(String ipAddress) onConnect;

  const NetworkPrinterConfigDialog({
    super.key,
    required this.onConnect,
  });

  @override
  State<NetworkPrinterConfigDialog> createState() => _NetworkPrinterConfigDialogState();
}

class _NetworkPrinterConfigDialogState extends State<NetworkPrinterConfigDialog> {
  final _ipController = TextEditingController();
  final _portController = TextEditingController(text: '9100');
  bool _isTesting = false;
  String? _testResult;

  @override
  void initState() {
    super.initState();
    _loadLastIp();
  }

  Future<void> _loadLastIp() async {
    final lastIp = await StorageService.getLastPrinterIp();
    if (lastIp != null && mounted) {
      _ipController.text = lastIp;
    }
  }

  @override
  void dispose() {
    _ipController.dispose();
    _portController.dispose();
    super.dispose();
  }

  Future<void> _testConnection() async {
    setState(() {
      _isTesting = true;
      _testResult = null;
    });

    final ip = _ipController.text.trim();
    final port = int.tryParse(_portController.text) ?? 9100;

    if (ip.isEmpty) {
      setState(() {
        _testResult = 'Please enter an IP address';
        _isTesting = false;
      });
      return;
    }

    // Validate IP format
    final ipRegex = RegExp(r'^(\d{1,3}\.){3}\d{1,3}$');
    if (!ipRegex.hasMatch(ip)) {
      setState(() {
        _testResult = 'Invalid IP address format';
        _isTesting = false;
      });
      return;
    }

    // Test connection
    final success = await NetworkPrinterService.testConnection(ip, port: port);

    setState(() {
      _testResult = success
          ? '✅ Connection successful!'
          : '❌ Connection failed. Check IP and network.';
      _isTesting = false;
    });
  }

  void _connect() {
    final ip = _ipController.text.trim();
    if (ip.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter an IP address')),
      );
      return;
    }

    StorageService.saveLastPrinterIp(ip);
    widget.onConnect(ip);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Configure WiFi Printer'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Enter your Xprinter\'s IP address:',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            
            // IP Address field
            TextField(
              controller: _ipController,
              decoration: const InputDecoration(
                labelText: 'IP Address',
                hintText: '192.168.1.100',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.wifi),
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            
            // Port field
            TextField(
              controller: _portController,
              decoration: const InputDecoration(
                labelText: 'Port',
                hintText: '9100',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.settings_ethernet),
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),
            
            // Test button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isTesting ? null : _testConnection,
                icon: _isTesting
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.network_check),
                label: Text(_isTesting ? 'Testing...' : 'Test Connection'),
              ),
            ),
            
            // Test result
            if (_testResult != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: _testResult!.startsWith('✅')
                      ? Colors.green.withOpacity(0.1)
                      : Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: _testResult!.startsWith('✅')
                        ? Colors.green
                        : Colors.red,
                  ),
                ),
                child: Text(
                  _testResult!,
                  style: TextStyle(
                    color: _testResult!.startsWith('✅')
                        ? Colors.green.shade700
                        : Colors.red.shade700,
                  ),
                ),
              ),
            ],
            
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 8),
            
            // Help text
            const Text(
              'How to find your printer\'s IP:',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
            ),
            const SizedBox(height: 4),
            const Text(
              '1. Print a self-test page (hold feed button)\n'
              '2. Look for "IP Address" on the printout\n'
              '3. Or check your router\'s connected devices',
              style: TextStyle(fontSize: 11, color: Colors.grey),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _connect,
          child: const Text('Connect'),
        ),
      ],
    );
  }
}
