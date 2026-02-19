import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/printer_bloc.dart';
import '../bloc/printer_state.dart';
import '../widgets/network_printer_config_dialog.dart';
import '../../../invoicing/domain/templates/invoice_template.dart';
import '../../domain/repositories/printer_service.dart';
import '../../data/repositories/network_printer_service.dart';

class PrinterSettingsPage extends StatefulWidget {
  const PrinterSettingsPage({super.key});

  @override
  State<PrinterSettingsPage> createState() => _PrinterSettingsPageState();
}

class _PrinterSettingsPageState extends State<PrinterSettingsPage> {
  @override
  void initState() {
    super.initState();
    // Check connection status when entering the page
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PrinterBloc>().add(CheckConnectionStatus());
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Printer Configuration')),
      body: BlocBuilder<PrinterBloc, PrinterState>(
        builder: (context, state) {
          if (state.error != null) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(state.error!), backgroundColor: Colors.red),
              );
              // We should probably clear the error in the Bloc too, but for now just show it
            });
          }

          return Column(
            children: [
              _buildConnectionStatus(context, state),
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
                              backgroundColor: Theme.of(context).colorScheme.primary,
                              foregroundColor: Colors.white,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: (kIsWeb || state.isScanning) 
                                ? null 
                                : () => context.read<PrinterBloc>().add(ScanForDevices()),
                            icon: const Icon(Icons.bluetooth),
                            label: Text(kIsWeb ? 'Bluetooth (Native)' : 'Bluetooth'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      kIsWeb 
                        ? 'Note: Bluetooth and USB printers are not supported in browsers.' 
                        : 'Note: USB printers are auto-detected when connected',
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
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
        onConnect: (ipAddress) {
          context.read<PrinterBloc>().add(ConnectToDevice(
            PrinterDevice(name: 'WiFi Printer', address: ipAddress)
          ));
        },
      ),
    );
  }

  Widget _buildConnectionStatus(BuildContext context, PrinterState state) {
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
                context.read<PrinterBloc>().add(
                  PrintCommandsEvent([
                    TextCommand('*** TEST PRINT ***', isBold: true, align: 'center'),
                    TextCommand('Printer Connected Successfully', align: 'center'),
                    DividerCommand(),
                    TextCommand('Date: ${DateTime.now().toString().split('.')[0]}', align: 'center'),
                    TextCommand('Thank you for choosing Invify', align: 'center'),
                    DividerCommand(),
                  ], 58)
                );
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Test print sent!')),
                );
              }, 
              child: const Text('TEST PRINT'),
            ) 
          : null,
    );
  }
}
