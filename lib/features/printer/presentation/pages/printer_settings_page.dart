import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/printer_bloc.dart';
import '../bloc/printer_state.dart';
import '../widgets/network_printer_config_dialog.dart';
import '../../../invoicing/domain/templates/invoice_template.dart';
import '../../domain/repositories/printer_service.dart';
import '../../../settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';
import 'package:involve_app/core/license/storage_service_native.dart';
import 'package:involve_app/services/mpos_service.dart';

class PrinterSettingsPage extends StatefulWidget {
  const PrinterSettingsPage({super.key});

  @override
  State<PrinterSettingsPage> createState() => _PrinterSettingsPageState();
}

class _PrinterSettingsPageState extends State<PrinterSettingsPage> {
  final TextEditingController _mposTerminalIdController = TextEditingController();
  final MposService _mposService = MposService();

  @override
  void initState() {
    super.initState();
    // Check connection status when entering the page
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PrinterBloc>().add(CheckConnectionStatus());
    });
    _loadMposTerminalId();
  }

  Future<void> _loadMposTerminalId() async {
    final terminalId = await StorageService.getMposTerminalId();
    if (terminalId != null && mounted) {
      _mposTerminalIdController.text = terminalId;
    }
  }

  @override
  void dispose() {
    _mposTerminalIdController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Device Configuration'),
          bottom: const TabBar(
            tabs: [
              Tab(icon: Icon(Icons.print), text: 'Receipt Printer'),
              Tab(icon: Icon(Icons.point_of_sale), text: 'POS Terminal'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            // PRINTER TAB
            BlocBuilder<PrinterBloc, PrinterState>(
              builder: (context, state) {
                if (state.error != null) {
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(state.error!), backgroundColor: Colors.red),
                    );
                  });
                }

                return Column(
                  children: [
                    if (state.isAutoConnecting)
                      Container(
                        color: Colors.blue[50],
                        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                        child: const Row(
                          children: [
                            Icon(Icons.sync, size: 16, color: Colors.blue),
                            SizedBox(width: 12),
                            Text('Auto-connecting to last used printer...', style: TextStyle(fontSize: 13, color: Colors.blue)),
                          ],
                        ),
                      ),
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
                          ? (state.isScanning
                              ? const InvifyLoadingIndicator(message: 'SCANNING FOR PRINTERS...')
                              : Center(
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
                                ))
                          : ListView.builder(
                              itemCount: state.devices.length,
                              itemBuilder: (context, index) {
                                final device = state.devices[index];
                                return ListTile(
                                  leading: const Icon(Icons.print),
                                  title: Text(device.displayName),
                                  subtitle: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(device.address),
                                      if (device.customName != null)
                                        Text('Original: ${device.name}', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                                    ],
                                  ),
                                  trailing: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.edit, size: 20),
                                        onPressed: () => _showRenameDialog(context, device),
                                        tooltip: 'Rename Printer',
                                      ),
                                      if (state.connectedDevice?.address == device.address)
                                        const Icon(Icons.check_circle, color: Colors.green)
                                      else
                                        ElevatedButton(
                                          onPressed: state.isConnecting ? null : () {
                                            context.read<PrinterBloc>().add(ConnectToDevice(device));
                                          },
                                          child: const Text('CONNECT'),
                                        ),
                                    ],
                                  ),
                                  onLongPress: () => _showRenameDialog(context, device),
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
                            Icon(Icons.bluetooth_searching, size: 20, color: Colors.purple),
                            SizedBox(width: 12),
                            Text('Scanning for Bluetooth printers...'),
                          ],
                        ),
                      ),
                  ],
                );
              },
            ),
            
            // POS TERMINAL TAB
            SingleChildScrollView(
              child: _buildMposSettings(context),
            ),
          ],
        ),
      ),
    );
  }

  void _showRenameDialog(BuildContext context, PrinterDevice device) {
    final controller = TextEditingController(text: device.customName ?? device.name);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Rename Printer'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Custom Name',
            hintText: 'e.g. Kitchen Printer, Main Receipt',
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          ElevatedButton(
            onPressed: () {
              final newName = controller.text.trim();
              if (newName.isNotEmpty) {
                context.read<PrinterBloc>().add(RenamePrinter(device.address, newName));
              }
              Navigator.pop(ctx);
            },
            child: const Text('SAVE'),
          ),
        ],
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
    final device = state.connectedDevice;
    return ListTile(
      tileColor: device != null ? Colors.green[50] : Colors.red[50],
      title: Text(
        device != null 
            ? 'Connected to: ${device.displayName}' 
            : 'No Printer Connected',
        style: TextStyle(
          fontWeight: FontWeight.bold, 
          color: device != null ? Colors.green : Colors.red,
        ),
      ),
      subtitle: device != null
          ? Text('Address: ${device.address}')
          : const Text('Select a connection type to get started'),
      trailing: device != null 
          ? Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.edit, size: 18),
                  onPressed: () => _showRenameDialog(context, device),
                  tooltip: 'Rename Connected Printer',
                ),
                TextButton(
                  onPressed: () {
                    context.read<PrinterBloc>().add(
                      PrintCommandsEvent([
                        TextCommand('*** TEST PRINT ***', isBold: true, align: 'center'),
                        TextCommand('Printer Connected Successfully', align: 'center'),
                        DividerCommand(),
                        TextCommand('Date: ${DateTime.now().toString().split('.')[0]}', align: 'center'),
                        TextCommand('Thank you for choosing Invify', align: 'center'),
                        DividerCommand(),
                      ], context.read<SettingsBloc>().state.settings?.paperWidth ?? 58)
                    );
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Test print sent!')),
                    );
                  }, 
                  child: const Text('TEST PRINT'),
                ),
              ],
            ) 
          : null,
    );
  }

  Widget _buildMposSettings(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'POS Terminal Configuration:',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _mposTerminalIdController,
                  decoration: const InputDecoration(
                    labelText: 'Terminal ID',
                    border: OutlineInputBorder(),
                    hintText: 'Enter POS Terminal ID',
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: () async {
                  final terminalId = _mposTerminalIdController.text.trim();
                  if (terminalId.isNotEmpty) {
                    await StorageService.saveMposTerminalId(terminalId);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Terminal ID Saved!'), backgroundColor: Colors.green),
                      );
                    }
                  }
                },
                child: const Text('SAVE'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () async {
                    try {
                      final result = await _mposService.pairDevice();
                      if (!mounted) return;
                      final isSuccess = result.status == 'success';
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(isSuccess ? 'Device paired successfully' : 'Pairing failed: ${result.message ?? "Unknown Error"}'),
                          backgroundColor: isSuccess ? Colors.green : Colors.orange,
                        ),
                      );
                    } catch (e) {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Pairing error: $e'), backgroundColor: Colors.red),
                        );
                      }
                    }
                  },
                  icon: const Icon(Icons.bluetooth_connected),
                  label: const Text('Pair Device'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.indigo,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () async {
                    final terminalId = _mposTerminalIdController.text.trim();
                    if (terminalId.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Please save Terminal ID first'), backgroundColor: Colors.orange),
                      );
                      return;
                    }
                    try {
                      final result = await _mposService.loadParams();
                      if (!mounted) return;
                      final isSuccess = result.status == 'success';
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(isSuccess ? 'Params loaded successfully' : 'Failed to load params: ${result.message ?? "Unknown Error"}'),
                          backgroundColor: isSuccess ? Colors.green : Colors.orange,
                        ),
                      );
                    } catch (e) {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Load Params error: $e'), backgroundColor: Colors.red),
                        );
                      }
                    }
                  },
                  icon: const Icon(Icons.cloud_download),
                  label: const Text('Load Params'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.teal,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
