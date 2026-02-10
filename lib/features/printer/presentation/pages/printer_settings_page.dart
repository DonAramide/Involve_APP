import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/printer_bloc.dart';
import '../bloc/printer_state.dart';

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
              Expanded(
                child: ListView.builder(
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
              Padding(
                padding: const EdgeInsets.all(20.0),
                child: ElevatedButton.icon(
                  onPressed: state.isScanning ? null : () => context.read<PrinterBloc>().add(ScanForDevices()),
                  icon: state.isScanning 
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.search),
                  label: const Text('SCAN FOR PRINTERS'),
                  style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 50)),
                ),
              ),
            ],
          );
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
        style: TextStyle(fontWeight: FontWeight.bold, color: state.connectedDevice != null ? Colors.green : Colors.red),
      ),
      trailing: state.connectedDevice != null 
          ? TextButton(onPressed: () {}, child: const Text('TEST PRINT')) 
          : null,
    );
  }
}
