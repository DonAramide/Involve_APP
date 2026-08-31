import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
import '../bloc/printer_bloc.dart';
import '../bloc/printer_state.dart';
import '../widgets/network_printer_config_dialog.dart';
import '../../../invoicing/domain/templates/invoice_template.dart';
import '../../domain/repositories/printer_service.dart';
import '../../../settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';
import 'package:involve_app/core/license/storage_service_native.dart';
import 'package:involve_app/services/mpos_service.dart';
import 'package:involve_app/services/terminal_sync_service.dart';
import 'package:involve_app/core/utils/device_info_service.dart';
import 'package:involve_app/features/admin/presentation/widgets/device_access_dialog.dart';
import 'package:involve_app/core/mpos/mpos_device_type.dart';

class PrinterSettingsPage extends StatefulWidget {
  const PrinterSettingsPage({super.key});

  @override
  State<PrinterSettingsPage> createState() => _PrinterSettingsPageState();
}

class _PrinterSettingsPageState extends State<PrinterSettingsPage> {
  final TextEditingController _mposTerminalIdController = TextEditingController();
  final MposService _mposService = MposService();

  // Server-provisioned terminal config (read-only)
  TerminalConfig? _terminalConfig;
  bool _isSyncing = false;
  String? _syncError;
  String? _mposSerialNumber;
  DateTime? _lastSyncTime;
  String _deviceId = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PrinterBloc>().add(CheckConnectionStatus());
    });
    _initTerminalSync();
  }

  Future<void> _initTerminalSync() async {
    final details = await DeviceInfoService.getDeviceDetails();
    _deviceId = details['deviceId'];
    
    // Fetch MPOS Serial from paired Bluetooth name
    final mposSn = await _mposService.getMposSerialNumber(deviceType: _mposDeviceType);

    final cached = await TerminalSyncService.loadCachedConfig();
    _lastSyncTime = await TerminalSyncService.getLastSyncTime();

    if (mounted) {
      setState(() {
        _terminalConfig = cached;
        _mposSerialNumber = mposSn;
      });
    }

    await _syncTerminalConfig(showLoading: false);
  }

  Future<void> _syncTerminalConfig({bool showLoading = true}) async {
    final details = await DeviceInfoService.getDeviceDetails();
    if (_deviceId.isEmpty || _deviceId == 'UNKNOWN_DEVICE') {
      _deviceId = details['deviceId'];
    }
    final settingsBloc = context.read<SettingsBloc>();
    final businessName = settingsBloc.state.settings?.organizationName;
    final enrollmentKey = await StorageService.getLicense();
    
    final mposSn = await _mposService.getMposSerialNumber(deviceType: _mposDeviceType);

    final androidId = details['androidId'] as String?;
    final serialNum = details['serialNumber'] as String?;

    if (showLoading && mounted) setState(() { 
      _isSyncing = true; 
      _syncError = null; 
      _terminalConfig = null;
    });

    try {
      final config = await TerminalSyncService.syncTerminalConfig(
        deviceId: _deviceId,
        androidId: androidId,
        serialNumber: serialNum,
        enrollmentKey: enrollmentKey,
      );
      _lastSyncTime = await TerminalSyncService.getLastSyncTime();
      if (mounted) {
        setState(() {
          _terminalConfig = config;
          _mposSerialNumber = mposSn;
          _isSyncing = false;
          _syncError = null;
        });

        // Enforce validations and disconnect invalid hardware
        final connectedPrinterMac = context.read<PrinterBloc>().state.connectedDevice?.address;
        final isPrinterMismatch = config.printerMac != null && connectedPrinterMac != null && config.printerMac != connectedPrinterMac;
        final isMposMismatch = config.posSerialNumber != null && mposSn != null && mposSn.isNotEmpty && !_isDeviceNameMatch(config.posSerialNumber, mposSn);

        if (isPrinterMismatch) {
          context.read<PrinterBloc>().add(DisconnectPrinter());
        }

        if (isMposMismatch) {
          await _mposService.unpairDevice(deviceType: _mposDeviceType);
          if (mounted) {
             setState(() {
               _mposSerialNumber = null;
             });
          }
        }

        if (!config.assigned && showLoading) {
           final supportPhone = config.supportPhone ?? context.read<SettingsBloc>().state.settings?.phone;
           final phoneDisplay = (supportPhone != null && supportPhone.isNotEmpty) 
               ? supportPhone 
               : "the number maintained on your web configuration page";
               
           if (mounted) {
             showDialog(
               context: context,
               builder: (ctx) => AlertDialog(
                 title: const Row(
                   children: [
                     Icon(Icons.info_outline, color: Colors.blue),
                     SizedBox(width: 8),
                     Text('Terminal Unassigned'),
                   ],
                 ),
                 content: Text('${config.message ?? "No terminal assigned to this device"}\n\nDevice ID: $_deviceId\n\nPlease contact Invify admin on $phoneDisplay.'),
                 actions: [
                   TextButton(
                     onPressed: () => Navigator.of(ctx).pop(),
                     child: const Text('OK'),
                   ),
                 ],
               ),
             );
           }
        }
      }
    } catch (e) {
      if (mounted) {
        String errorMsg = e.toString().replaceFirst('Exception: ', '');
        
        // Provide user-friendly messages for common network errors
        if (errorMsg.contains('SocketException') || errorMsg.contains('ClientException')) {
          errorMsg = 'Unable to connect to the Invify Server. Please check your internet connection.';
        } else if (errorMsg.contains('404')) {
          errorMsg = 'System not connecting or backend not responding (404 Not Found).';
        } else if (errorMsg.contains('502')) {
          errorMsg = 'Bad Gateway: The server is currently unreachable or down for maintenance.';
        }

        setState(() {
          _isSyncing = false;
          _syncError = errorMsg;
          _mposSerialNumber = mposSn;
        });
        
        if (showLoading) {
          showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
              title: const Row(
                children: [
                  Icon(Icons.wifi_off, color: Colors.red),
                  SizedBox(width: 8),
                  Text('Connection Error'),
                ],
              ),
              content: Text(errorMsg),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('OK'),
                ),
              ],
            ),
          );
        }
      }
    }
  }

  @override
  void dispose() {
    super.dispose();
  }

  void _showDeviceDetails(BuildContext context) async {
    final granted = await showDialog<bool>(
      context: context,
      builder: (context) => const DeviceAccessDialog(),
    );

    if (granted == true && context.mounted) {
      final deviceInfo = await DeviceInfoService.getDeviceDetails();
      
      if (!context.mounted) return;
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Device Telemetry Identity'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Hardware ID: ${deviceInfo['deviceId'] ?? 'Unknown'}', style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text('Manufacturer: ${deviceInfo['brand'] ?? 'Unknown'}'),
              Text('Model: ${deviceInfo['model'] ?? 'Unknown'}'),
              Text('Serial Number: ${deviceInfo['serialNumber'] ?? 'Unknown'}'),
              Text('OS Version: ${deviceInfo['osVersion'] ?? 'Unknown'}'),
              const SizedBox(height: 8),
              Text('License Suffix: ${deviceInfo['deviceSuffix'] ?? 'Unknown'}'),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isBasic = context.watch<SettingsBloc>().state.userPlan?.isBasic ?? true;

    return DefaultTabController(
      length: isBasic ? 1 : 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Device Configuration'),
          actions: [
            IconButton(
              icon: const Icon(Icons.admin_panel_settings),
              tooltip: 'Device Details',
              onPressed: () => _showDeviceDetails(context),
            ),
          ],
          bottom: TabBar(
            tabs: [
              const Tab(icon: Icon(Icons.print), text: 'Receipt Printer'),
              if (!isBasic)
                const Tab(icon: Icon(Icons.point_of_sale), text: 'POS Terminal'),
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
            
            if (!isBasic)
              // POS TERMINAL TAB
              RefreshIndicator(
                onRefresh: () => _syncTerminalConfig(showLoading: true),
                child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16.0),
                child: Builder(
                  builder: (context) {
                    if (_terminalConfig != null && _terminalConfig?.capabilities.emvPayments != true) {
                      return const Center(
                        child: Padding(
                          padding: EdgeInsets.symmetric(vertical: 64.0, horizontal: 24.0),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.point_of_sale, size: 64, color: Colors.grey),
                              SizedBox(height: 16),
                              Text(
                                'POS & EMV Features Disabled',
                                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                              ),
                              SizedBox(height: 8),
                              Text(
                                'This device is not configured as a company terminal. EMV / Card payments are disabled.',
                                textAlign: TextAlign.center,
                                style: TextStyle(color: Colors.grey),
                              ),
                            ],
                          ),
                        ),
                      );
                    }

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'POS Terminal Configuration',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                            if (_isSyncing)
                              const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            else
                              IconButton(
                                icon: const Icon(Icons.sync, color: Colors.teal, size: 20),
                                onPressed: () => _syncTerminalConfig(showLoading: true),
                                tooltip: 'Force Sync Config',
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Provisioned by Invify Operations — read-only',
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                        ),
                        const SizedBox(height: 16),

                        if (_syncError != null)
                          Container(
                            padding: const EdgeInsets.all(12),
                            margin: const EdgeInsets.only(bottom: 16),
                            decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.red.shade200),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.error_outline, color: Colors.red, size: 20),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Sync Failed: $_syncError\nCheck your network connection and try again.',
                                    style: const TextStyle(color: Colors.red, fontSize: 13),
                                  ),
                                ),
                              ],
                            ),
                          ),

                        _buildTerminalStatusCard(),

                        const SizedBox(height: 24),
                        
                        // Hardware Interaction Buttons
                        Builder(
                          builder: (ctx) {
                            bool hasMismatch = false;
                            bool isMissingMapping = false;
                            bool isInvalidDevice = _mposSerialNumber == null || _mposSerialNumber!.isEmpty;

                            if (_terminalConfig != null) {
                              if (!_terminalConfig!.assigned) {
                                isMissingMapping = true;
                              } else {
                                final connectedPrinterMac = ctx.watch<PrinterBloc>().state.connectedDevice?.address;
                                final isPrinterMismatch = _terminalConfig!.printerMac != null && connectedPrinterMac != null && _terminalConfig!.printerMac != connectedPrinterMac;
                                final isMposMismatch = _terminalConfig!.posSerialNumber != null && !isInvalidDevice && !_isDeviceNameMatch(_terminalConfig!.posSerialNumber, _mposSerialNumber);
                                hasMismatch = isPrinterMismatch || isMposMismatch;
                                
                                isMissingMapping = _terminalConfig!.terminalId == null || _terminalConfig!.terminalId!.isEmpty;
                              }
                            } else {
                              isMissingMapping = true;
                            }

                            final disablePairing = isMissingMapping;
                            final disableDownload = hasMismatch || isMissingMapping || isInvalidDevice;
                            final disableBalance = disableDownload || _isCheckingBalance;

                            return Column(
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: ElevatedButton.icon(
                                        onPressed: disablePairing ? null : _pairDevice,
                                        icon: const Icon(Icons.bluetooth_connected, size: 18),
                                        label: const Text('Pair Device'),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: Colors.indigo.shade600,
                                          foregroundColor: Colors.white,
                                          padding: const EdgeInsets.symmetric(vertical: 12),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: ElevatedButton.icon(
                                        onPressed: (_isLoadingParams || disableDownload) ? null : _downloadParams,
                                        icon: _isLoadingParams 
                                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                          : const Icon(Icons.download, size: 18),
                                        label: Text(_isLoadingParams ? 'Loading...' : 'Download Terminal Params', style: const TextStyle(fontSize: 12)),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: Colors.teal.shade600,
                                          foregroundColor: Colors.white,
                                          padding: const EdgeInsets.symmetric(vertical: 12),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                SizedBox(
                                  width: double.infinity,
                                  child: ElevatedButton.icon(
                                    onPressed: () =>
                                        Navigator.pushNamed(context, '/nibss_cert'),
                                    icon: const Icon(Icons.verified_user_outlined, size: 18),
                                    label: const Text('NIBSS CERT'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.teal.shade700,
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(vertical: 12),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 12),
                                SizedBox(
                                  width: double.infinity,
                                  child: OutlinedButton.icon(
                                    onPressed: disableBalance ? null : _checkCardBalance,
                                    icon: _isCheckingBalance
                                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                                        : const Icon(Icons.account_balance_wallet_outlined, size: 18),
                                    label: Text(
                                      _isCheckingBalance
                                          ? 'Checking balance...'
                                          : 'Check Card Balance',
                                    ),
                                  ),
                                ),
                              ],
                            );
                          }
                        ),
                        const SizedBox(height: 12),
                        if (_lastSyncTime != null)
                          Center(
                            child: Text(
                              'Last synced: ${_formatSyncTime(_lastSyncTime!)}',
                              style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
                            ),
                          ),
                      ],
                    );
                  },
                ),
              ),
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

  bool _isLoadingParams = false;
  bool _isCheckingBalance = false;

  String get _mposDeviceType => MposDeviceType.channelValue(
        MposDeviceType.resolve(_terminalConfig?.terminalType),
      );

  Future<void> _pairDevice() async {
    try {
      final result = await _mposService.pairDevice(
        posSerialNumber: _terminalConfig?.posSerialNumber,
        deviceType: _mposDeviceType,
      );
      if (!mounted) return;
      final isSuccess = result.status == 'success';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(isSuccess ? 'Device paired successfully' : 'Pairing failed: ${result.message ?? "Unknown Error"}'),
          backgroundColor: isSuccess ? Colors.green : Colors.orange,
        ),
      );
      if (isSuccess) {
        // Fetch new SN and re-sync
        _initTerminalSync();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(friendlyApiError(e, fallback: 'Could not pair device.')), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _downloadParams() async {
    print('\n[DownloadParams] User clicked Download Params button!');
    if (_terminalConfig == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Terminal not provisioned. Sync first.'), backgroundColor: Colors.orange),
      );
      return;
    }
    setState(() => _isLoadingParams = true);
    try {
      final terminalId = _terminalConfig?.terminalId ?? _terminalConfig?.mposTerminalId ?? '2214OTGF';
      final activeHost = (_terminalConfig?.activeHost ??
              _terminalConfig?.routingRules?['activeHost']?.toString() ??
              'NIBSS')
          .toString()
          .toUpperCase();
      final primary = _terminalConfig?.primaryHost;
      final nibss = primary?['nibssConfig'] as Map?;

      String? scrubSecret(dynamic raw) {
        final v = raw?.toString().trim();
        if (v == null || v.isEmpty) return null;
        if (v == '[SECRET_MASKED]' || v.toUpperCase().contains('SECRET_MASKED')) {
          return null;
        }
        return v;
      }

      final ctmk = scrubSecret(nibss?['ctmk']) ??
          scrubSecret(primary?['kimonoKeys']?['ctmk']) ??
          scrubSecret(primary?['kimonoFallbackParameters']?['key1']);
      final key2 = scrubSecret(nibss?['key2']) ??
          scrubSecret(primary?['kimonoKeys']?['key2']) ??
          scrubSecret(primary?['kimonoFallbackParameters']?['key2']);

      final timeoutRaw = primary?['timeoutSeconds'] ?? primary?['timeout'];
      final timeoutSeconds =
          timeoutRaw is int ? timeoutRaw : int.tryParse(timeoutRaw?.toString() ?? '');

      final isMoreFun = MposDeviceType.isMoreFun(_terminalConfig?.terminalType);
      final isNibss = activeHost.contains('NIBSS');

      // Always prefer synced primaryHost for NIBSS / MoreFun. Express Pay fields are only for EXPRESS_PAY.
      final usePrimaryHost = isMoreFun || isNibss || activeHost == 'MEDUSA';
      final enableSsl = usePrimaryHost
          ? (primary?['sslEnabled'] == true ||
              (isNibss && primary?['sslEnabled'] == null))
          : (primary?['sslEnabled'] == true);
      final hostIp = usePrimaryHost
          ? (primary?['ip']?.toString() ??
              _terminalConfig?.nibssIp ??
              _terminalConfig?.expressPayHost)
          : _terminalConfig?.expressPayHost;
      final hostPort = usePrimaryHost
          ? (primary?['port']?.toString() ??
              _terminalConfig?.nibssPort?.toString() ??
              _terminalConfig?.expressPayPort?.toString())
          : _terminalConfig?.expressPayPort?.toString();

      print(
        '[DownloadParams] activeHost=$activeHost terminalType=${_terminalConfig?.terminalType} '
        'ip=$hostIp port=$hostPort ssl=$enableSsl ctmk=${ctmk == null ? "MISSING" : "set(len=${ctmk.length})"}',
      );

      if (isNibss && (ctmk == null || ctmk.length < 32)) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'NIBSS CTMK missing or masked in terminal sync. '
                'Open POS Switch Board → NIBSS host → set CTMK, Save, then Sync again.',
              ),
              backgroundColor: Colors.orange,
              duration: Duration(seconds: 8),
            ),
          );
        }
        return;
      }

      if (hostIp == null || hostIp.isEmpty || hostPort == null || hostPort.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Host IP/port missing for $activeHost. Check POS Switch Board primary host, then Sync.',
              ),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }

      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (BuildContext dialogContext) {
          return AlertDialog(
            content: Row(
              children: [
                const CircularProgressIndicator(),
                const SizedBox(width: 20),
                Expanded(
                  child: StreamBuilder<String>(
                    stream: _mposService.progressStream,
                    initialData: 'Starting Key Exchange...',
                    builder: (context, snapshot) {
                      return Text(snapshot.data ?? 'Processing...');
                    },
                  ),
                ),
              ],
            ),
          );
        },
      );

      print('[DownloadParams] Calling native _mposService.loadParams and waiting for response...');
      final result = await _mposService.loadParams(
        terminalId: terminalId,
        activeHost: activeHost,
        ipAddress: hostIp,
        portNumber: hostPort,
        enableSsl: enableSsl,
        expressPayBaseUrl: scrubSecret(_terminalConfig?.expressPayBaseUrl),
        expressPayAuthToken: scrubSecret(_terminalConfig?.expressPayAuthToken),
        key1: ctmk,
        key2: key2,
        timeoutSeconds: timeoutSeconds,
        deviceType: _mposDeviceType,
      );
      print('[DownloadParams] Native _mposService.loadParams returned: ${result.status} - ${result.message}');
      if (!mounted) return;
      Navigator.of(context, rootNavigator: true).pop();
      final isSuccess = result.status == 'success';
      if (isSuccess) {
        _printKeyExchangeReceipt(result.params);
        TerminalSyncService.recordKeyExchangeSuccess(_deviceId);
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(isSuccess ? 'Params loaded successfully' : 'Failed to load params: ${result.message ?? "Unknown Error"}'),
          backgroundColor: isSuccess ? Colors.green : Colors.orange,
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(friendlyApiError(e, fallback: 'Could not load terminal params.')), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoadingParams = false);
    }
  }

  Future<void> _checkCardBalance() async {
    if (_terminalConfig == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Terminal not provisioned. Sync first.'), backgroundColor: Colors.orange),
      );
      return;
    }
    setState(() => _isCheckingBalance = true);
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return AlertDialog(
          content: Row(
            children: [
              const CircularProgressIndicator(),
              const SizedBox(width: 20),
              Expanded(
                child: StreamBuilder<String>(
                  stream: _mposService.progressStream,
                  initialData: 'Tap card and enter PIN...',
                  builder: (context, snapshot) {
                    return Text(snapshot.data ?? 'Processing...');
                  },
                ),
              ),
            ],
          ),
        );
      },
    );

    try {
      final terminalId = _terminalConfig?.terminalId ?? _terminalConfig?.mposTerminalId;
      final isMoreFun = MposDeviceType.isMoreFun(_terminalConfig?.terminalType);
      final result = isMoreFun
          ? await _mposService.checkBalance(
              terminalId: terminalId,
              deviceType: _mposDeviceType,
            )
          : await _mposService.initiatePayment(
              amount: 2,
              terminalId: terminalId,
              activeHost: (_terminalConfig?.activeHost ?? 'NIBSS').toUpperCase(),
              processOnDevice: true,
              deviceType: _mposDeviceType,
              transactionType: 'BALANCE',
            );
      if (!mounted) return;
      Navigator.of(context, rootNavigator: true).pop();

      final ok = result.status == 'balance_success' ||
          result.status == 'payment_success' ||
          result.transaction?.statusCode == '00';
      final balance = result.transaction?.balance?.isNotEmpty == true
          ? result.transaction!.balance
          : result.transaction?.amount;
      final pan = result.transaction?.maskedPan ?? '****';
      final msg = result.error?.message ??
          result.transaction?.message ??
          (ok ? 'Balance check complete' : 'Balance check failed');

      await showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(ok ? 'Card Balance' : 'Balance Check Failed'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (ok && balance != null && balance.isNotEmpty)
                Text(
                  '₦ $balance',
                  style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                ),
              const SizedBox(height: 8),
              Text('Card: $pan'),
              if (result.transaction?.statusCode != null)
                Text('Code: ${result.transaction!.statusCode}'),
              const SizedBox(height: 8),
              Text(msg),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK')),
          ],
        ),
      );
    } catch (e) {
      if (mounted) {
        Navigator.of(context, rootNavigator: true).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(friendlyApiError(e, fallback: 'Balance check failed.')), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isCheckingBalance = false);
    }
  }

  void _printKeyExchangeReceipt(Map<String, dynamic>? params) {
    final now = DateTime.now().toString().split('.')[0];
    final ip = params?['ipAddress']?.toString().isNotEmpty == true ? params!['ipAddress'] : _terminalConfig?.expressPayHost;
    final port = params?['portNumber']?.toString().isNotEmpty == true ? params!['portNumber'] : _terminalConfig?.expressPayPort;
    final merchantId = params?['merchantId']?.toString().isNotEmpty == true ? params!['merchantId'] : _terminalConfig?.tenantId;
    final merchantName = params?['merchantName']?.toString().isNotEmpty == true ? params!['merchantName'] : (_terminalConfig?.merchantName ?? _terminalConfig?.businessName);

    final commands = <PrintCommand>[
      TextCommand('Terminal Parameters', isBold: true, align: 'center'),
      SizedBoxCommand(height: 1),
      TextCommand('KEY EXCHANGE', isBold: true, align: 'center'),
      TextCommand('SUCCESSFUL', isBold: true, align: 'center'),
      DividerCommand(),
      TextCommand('Terminal ID: ${_terminalConfig?.terminalId ?? _terminalConfig?.mposTerminalId ?? "N/A"}'),
      TextCommand('Tablet SN: $_deviceId'),
      TextCommand('MPOS SN: ${_mposSerialNumber ?? "N/A"}'),
      TextCommand('IP: ${ip ?? "N/A"}'),
      TextCommand('Port: ${port ?? "N/A"}'),
      TextCommand('Merchant ID: ${merchantId ?? "N/A"}'),
      TextCommand('Merchant Name: ${merchantName ?? "N/A"}'),
      TextCommand('SSL: ${_terminalConfig?.primaryHost?['sslEnabled'] == true ? "Enabled" : "Disabled"}'),
      TextCommand('Date/Time: $now'),
      TextCommand('App Version: 1.0.0'),
    ];
    context.read<PrinterBloc>().add(PrintCommandsEvent(commands, 58));
  }

  Widget _buildTerminalStatusCard() {
    final config = _terminalConfig;

    if (config == null) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.orange.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.orange.shade200, width: 2, strokeAlign: BorderSide.strokeAlignOutside),
        ),
        child: Column(
          children: [
            Icon(Icons.warning_amber_rounded, size: 48, color: Colors.orange.shade700),
            const SizedBox(height: 12),
            Text(
              'Terminal Not Provisioned',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.orange.shade900),
            ),
            const SizedBox(height: 8),
            Text(
              'This device has not been assigned a hardware bundle by Invify Operations. Please contact support to provision device ID:\n\n$_deviceId',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Colors.orange.shade800),
            ),
          ],
        ),
      );
    }

    // Validate Printer Match
    final connectedPrinterMac = context.read<PrinterBloc>().state.connectedDevice?.address;
    final isPrinterMismatch = config.printerMac != null && connectedPrinterMac != null && config.printerMac != connectedPrinterMac;

    // Validate MPOS Match
    final isMposMismatch = config.posSerialNumber != null && _mposSerialNumber != null && _mposSerialNumber!.isNotEmpty && !_isDeviceNameMatch(config.posSerialNumber, _mposSerialNumber);

    final hostIp = config.nibssIp ??
        config.primaryHost?['ip']?.toString() ??
        config.expressPayHost;
    final hostPort = config.nibssPort?.toString() ??
        config.primaryHost?['port']?.toString() ??
        config.expressPayPort?.toString();
    final hostEndpoint = (hostIp == null || hostIp.isEmpty)
        ? null
        : (hostPort != null && hostPort.isNotEmpty ? '$hostIp:$hostPort' : hostIp);

    return Column(
      children: [
        if (isMposMismatch)
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.red.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.red.shade300),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.red),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Invalid device mapped: The connected MPOS ($_mposSerialNumber) does not match the assigned MPOS (${config.posSerialNumber}). Unauthorized device.',
                    style: const TextStyle(color: Colors.red, fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        if (isPrinterMismatch)
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.red.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.red.shade300),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.red),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Invalid device mapped: The connected Printer ($connectedPrinterMac) does not match the assigned Printer (${config.printerMac}). Unauthorized device.',
                    style: const TextStyle(color: Colors.red, fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        Container(
          decoration: BoxDecoration(
            color: Colors.teal.shade50,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.teal.shade200),
          ),
          child: Column(
            children: [
              // Status Header
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.teal.shade700,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(11),
                    topRight: Radius.circular(11),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle, color: Colors.white, size: 18),
                    const SizedBox(width: 8),
                    const Text(
                      'Terminal Provisioned',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        'v${config.configVersion}',
                        style: const TextStyle(color: Colors.white, fontSize: 10),
                      ),
                    ),
                  ],
                ),
              ),

              // Fields Grid
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _buildReadOnlyField(
                      label: 'Terminal ID',
                      value: config.terminalId,
                      icon: Icons.credit_card,
                      isMonospace: true,
                      color: Colors.teal.shade700,
                    ),
                    const SizedBox(height: 10),
                    // The user wanted POS Serial Number as "MPOS Terminal" field
                    _buildReadOnlyField(
                      label: 'MPOS Terminal',
                      value: config.posSerialNumber, // Map to serial number
                      icon: Icons.point_of_sale,
                      isMonospace: true,
                    ),
                    const SizedBox(height: 10),
                    _buildReadOnlyField(
                      label: 'Business Name',
                      value: config.businessName ?? config.merchantName,
                      icon: Icons.business,
                    ),
                    const SizedBox(height: 10),
                    _buildReadOnlyField(
                      label: 'Active Host',
                      value: config.activeHost,
                      icon: Icons.cloud_done_outlined,
                    ),
                    const SizedBox(height: 10),
                    _buildReadOnlyField(
                      label: 'Host Endpoint',
                      value: hostEndpoint,
                      icon: Icons.lan_outlined,
                      isMonospace: true,
                      color: Colors.teal.shade700,
                    ),
                    if (config.printerMac != null) ...
                      [
                        const SizedBox(height: 10),
                        _buildReadOnlyField(
                          label: 'Bound Printer',
                          value: '${config.printerModel ?? "Printer"} (${config.printerMac})',
                          icon: Icons.print,
                          isMonospace: true,
                        ),
                      ],
                    if (config.terminalType != null) ...
                      [
                        const SizedBox(height: 10),
                        _buildReadOnlyField(
                          label: 'Terminal Type',
                          value: config.terminalType,
                          icon: Icons.devices,
                        ),
                      ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildReadOnlyField({
    required String label,
    String? value,
    required IconData icon,
    bool isMonospace = false,
    Color? color,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: Colors.grey.shade600),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(fontSize: 10, color: Colors.grey.shade600, letterSpacing: 0.3),
              ),
              const SizedBox(height: 2),
              Text(
                value ?? '—',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  fontFamily: isMonospace ? 'monospace' : null,
                  color: value != null ? (color ?? Colors.black87) : Colors.grey.shade400,
                ),
              ),
            ],
          ),
        ),
        // Read-only lock indicator
        Tooltip(
          message: 'Managed by Invify Admin — cannot be edited on device',
          child: Icon(Icons.lock_outline, size: 12, color: Colors.grey.shade400),
        ),
      ],
    );
  }

  String _formatSyncTime(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  bool _isDeviceNameMatch(String? name1, String? name2) {
    if (name1 == null || name2 == null) return false;
    final clean1 = name1.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '').toLowerCase();
    final clean2 = name2.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '').toLowerCase();

    final norm1 = clean1.endsWith('android') ? clean1.substring(0, clean1.length - 7) : clean1;
    final norm2 = clean2.endsWith('android') ? clean2.substring(0, clean2.length - 7) : clean2;

    return norm1.contains(norm2) || norm2.contains(norm1);
  }
}
