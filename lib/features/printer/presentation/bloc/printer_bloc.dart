import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'printer_state.dart';
import '../../domain/usecases/printer_usecases.dart';
import '../../../invoicing/domain/templates/invoice_template.dart';
import '../../data/repositories/printer_repository_impl.dart';

class PrinterBloc extends Bloc<PrinterEvent, PrinterState> {
  final GetBluetoothDevices getDevices;
  final ConnectToPrinter connectPrinter;
  final PrintInvoiceCommands printInvoice;
  final PrinterRepository repository;

  PrinterBloc({
    required this.getDevices,
    required this.connectPrinter,
    required this.printInvoice,
    required this.repository,
  }) : super(const PrinterState()) {
    on<ScanForDevices>(_onScan);
    on<ConnectToDevice>(_onConnect);
    on<CheckConnectionStatus>(_onCheckStatus);
    on<DisconnectPrinter>(_onDisconnect);
    on<PrintCommandsEvent>(_onPrint);
    on<RenamePrinter>(_onRename);
    on<AutoConnectPrinter>(_onAutoConnect);
  }

  Future<void> _onCheckStatus(CheckConnectionStatus event, Emitter<PrinterState> emit) async {
    final connected = await connectPrinter.service.isConnected();
    if (!connected) {
      emit(state.copyWith(connectedDevice: null));
    }
  }

  Future<void> _onAutoConnect(AutoConnectPrinter event, Emitter<PrinterState> emit) async {
    emit(state.copyWith(isAutoConnecting: true));
    try {
      final lastUsed = await repository.getLastUsedPrinter();
      if (lastUsed != null) {
        debugPrint('PrinterBloc: Attempting auto-connect to ${lastUsed.displayName} (${lastUsed.address})');
        final success = await connectPrinter(lastUsed);
        if (success) {
          emit(state.copyWith(connectedDevice: lastUsed, isAutoConnecting: false));
          debugPrint('PrinterBloc: Auto-connect successful');
        } else {
          emit(state.copyWith(isAutoConnecting: false));
          debugPrint('PrinterBloc: Auto-connect failed');
        }
      } else {
        emit(state.copyWith(isAutoConnecting: false));
      }
    } catch (e) {
      debugPrint('PrinterBloc: Auto-connect error: $e');
      emit(state.copyWith(isAutoConnecting: false));
    }
  }

  Future<void> _onRename(RenamePrinter event, Emitter<PrinterState> emit) async {
    try {
      // Find device in current list
      final device = state.devices.where((d) => d.address == event.address).firstOrNull ?? 
                     (state.connectedDevice?.address == event.address ? state.connectedDevice : null);
      
      if (device != null) {
        final updatedDevice = device.copyWith(customName: event.newName);
        await repository.saveConfig(updatedDevice);
        
        // Update devices list
        final newDevices = state.devices.map((d) => d.address == event.address ? updatedDevice : d).toList();
        
        // Update connected device if it matches
        final newConnected = state.connectedDevice?.address == event.address ? updatedDevice : state.connectedDevice;
        
        emit(state.copyWith(devices: newDevices, connectedDevice: newConnected));
      }
    } catch (e) {
      emit(state.copyWith(error: 'Failed to rename printer: $e'));
    }
  }

  // Helper method for easy UI access
  void printInvoiceCmd(List<PrintCommand> commands, int paperWidth) {
    add(PrintCommandsEvent(commands, paperWidth));
  }

  Future<void> _onPrint(PrintCommandsEvent event, Emitter<PrinterState> emit) async {
    if (state.connectedDevice == null) {
      emit(state.copyWith(error: 'No printer connected. Please connect in Settings.'));
      return;
    }

    try {
      debugPrint('PrinterBloc: Starting print with width=${event.paperWidth}...');
      await printInvoice(event.commands, event.paperWidth);
    } catch (e) {
      debugPrint('PrinterBloc: Print failed: $e. Attempting auto-reconnect...');
      // Auto-reconnect attempt
      emit(state.copyWith(error: 'Lost connection. Retrying...'));
      final success = await connectPrinter(state.connectedDevice!);
      if (success) {
        try {
          debugPrint('PrinterBloc: Reconnect successful. Retrying print...');
          await printInvoice(event.commands, event.paperWidth);
          debugPrint('PrinterBloc: Retry print successful.');
          emit(state.copyWith(error: null)); // Clear error on retry success
        } catch (e2) {
          debugPrint('PrinterBloc: Retry print failed: $e2');
          emit(state.copyWith(error: 'Retry failed: ${e2.toString()}'));
        }
      } else {
        debugPrint('PrinterBloc: Reconnect failed.');
        emit(state.copyWith(error: 'Reconnect failed: Please check printer power/Bluetooth.'));
      }
    }
  }

  Future<void> _onScan(ScanForDevices event, Emitter<PrinterState> emit) async {
    emit(state.copyWith(isScanning: true));
    try {
      final devices = await getDevices();
      final savedConfigs = await repository.getAllConfigs();
      
      // Merge scan results with saved custom names
      final mergedDevices = devices.map((dev) {
        final saved = savedConfigs.where((s) => s.address == dev.address).firstOrNull;
        return saved != null ? dev.copyWith(customName: saved.customName) : dev;
      }).toList();

      emit(state.copyWith(devices: mergedDevices, isScanning: false));
    } catch (e) {
      emit(state.copyWith(error: 'Scan failed: ${e.toString()}', isScanning: false));
    }
  }

  Future<void> _onConnect(ConnectToDevice event, Emitter<PrinterState> emit) async {
    emit(state.copyWith(isConnecting: true));
    try {
      final success = await connectPrinter(event.device);
      if (success) {
        // Save to repository (last used and type)
        // Detect type from address (WiFi usually has dots)
        final type = event.device.address.contains('.') ? 'wifi' : 'bluetooth';
        final deviceToSave = event.device.copyWith(type: type);
        await repository.saveConfig(deviceToSave);
        
        emit(state.copyWith(connectedDevice: deviceToSave, isConnecting: false));
      } else {
        emit(state.copyWith(error: 'Connection failed', isConnecting: false));
      }
    } catch (e) {
      emit(state.copyWith(error: e.toString(), isConnecting: false));
    }
  }

  void _onDisconnect(DisconnectPrinter event, Emitter<PrinterState> emit) {
    emit(const PrinterState());
  }
}
