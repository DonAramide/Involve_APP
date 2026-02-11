import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/printer_bloc.dart';
import '../bloc/printer_state.dart';
import '../widgets/network_printer_config_dialog.dart';
import '../../data/repositories/network_printer_service.dart';

class PrinterSettingsPage extends StatelessWidget {
  const PrinterSettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Printer Configuration')),
      body: BlocBuilder<PrinterBloc, PrinterState>(
        builder: (context, state) {
          return Column(
            children: [
              _buildConnectionStatus(state),
              const Divider(),
              
              // Connection Type Selector
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Connection Type:',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () => _showNetworkPrinterDialog(context),
                            icon: const Icon(Icons.wifi),
                            label: const Text('WiFi Printer'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.blue,
                              foregroundColor: Colors.white,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: state.isScanning 
                                ? null 
                                : () => context.read<PrinterBloc>().add(ScanForDevices()),
                            icon: const Icon(Icons.bluetooth),
                            label: const Text('Bluetooth'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Note: USB printers are auto-detected when connected',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
              ),
              
              const Divider(),
              
              // Device List
              Expanded(
                child: state.devices.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.print_disabled, size: 64, color: Colors.grey[400]),
                            const SizedBox(height: 16),
                            Text(
                              'No printers found',
                              style: TextStyle(color: Colors.grey[600], fontSize: 16),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Tap WiFi or Bluetooth to connect',
                              style: TextStyle(color: Colors.grey, fontSize: 12),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        itemCount: state.devices.length,
                        itemBuilder: (context, index) {
                          final device = state.devices[index];
                          return ListTile(
                            leading: const Icon(Icons.print),
                            title: Text(device.name),
                            subtitle: Text(device.address),
                            trailing: state.connectedDevice?.address == device.address
                                ? const Icon(Icons.check_circle, color: Colors.green)
                                : ElevatedButton(
                                    onPressed: state.isConnecting ? null : () {
                                      context.read<PrinterBloc>().add(ConnectToDevice(device));
                                    },
                                    child: const Text('CONNECT'),
                                  ),
                          );
                        },
                      ),
              ),
              
              // Scan Status
              if (state.isScanning)
                const Padding(
                  padding: EdgeInsets.all(16.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      SizedBox(width: 12),
                      Text('Scanning for Bluetooth printers...'),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  void _showNetworkPrinterDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (dialogContext) => NetworkPrinterConfigDialog(
        onConnect: (ipAddress) async {
          // Create network printer service and connect
          final networkService = NetworkPrinterService();
          final success = await networkService.connectByIp(ipAddress);
          
          if (success && context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Connected to printer at $ipAddress'),
                backgroundColor: Colors.green,
              ),
            );
            
            // TODO: Update PrinterBloc to support network printers
            // For now, this is a standalone connection
          } else if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Failed to connect to network printer'),
                backgroundColor: Colors.red,
              ),
            );
          }
        },
      ),
    );
  }

  Widget _buildConnectionStatus(PrinterState state) {
    return ListTile(
      tileColor: state.connectedDevice != null ? Colors.green[50] : Colors.red[50],
      title: Text(
        state.connectedDevice != null 
            ? 'Connected to: ${state.connectedDevice!.name}' 
            : 'No Printer Connected',
        style: TextStyle(
          fontWeight: FontWeight.bold, 
          color: state.connectedDevice != null ? Colors.green : Colors.red,
        ),
      ),
      subtitle: state.connectedDevice != null
          ? Text('Address: ${state.connectedDevice!.address}')
          : const Text('Select a connection type to get started'),
      trailing: state.connectedDevice != null 
          ? TextButton(
              onPressed: () {
                // TODO: Implement test print
              }, 
              child: const Text('TEST PRINT'),
            ) 
          : null,
    );
  }
}
