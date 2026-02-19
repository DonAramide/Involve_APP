import 'package:flutter_bloc/flutter_bloc.dart';
import 'printer_state.dart';
import '../../domain/usecases/printer_usecases.dart';
import '../../../invoicing/domain/templates/invoice_template.dart';

class PrinterBloc extends Bloc<PrinterEvent, PrinterState> {
  final GetBluetoothDevices getDevices;
  final ConnectToPrinter connectPrinter;
  final PrintInvoiceCommands printInvoice;

  PrinterBloc({
    required this.getDevices,
    required this.connectPrinter,
    required this.printInvoice,
  }) : super(const PrinterState()) {
    on<ScanForDevices>(_onScan);
    on<ConnectToDevice>(_onConnect);
    on<CheckConnectionStatus>(_onCheckStatus);
    on<DisconnectPrinter>(_onDisconnect);
    on<PrintCommandsEvent>(_onPrint);
  }

  Future<void> _onCheckStatus(CheckConnectionStatus event, Emitter<PrinterState> emit) async {
    final connected = await connectPrinter.service.isConnected();
    if (!connected) {
      emit(state.copyWith(connectedDevice: null));
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
      await printInvoice(event.commands, event.paperWidth);
    } catch (e) {
      // Auto-reconnect attempt
      emit(state.copyWith(error: 'Lost connection. Retrying...'));
      final success = await connectPrinter(state.connectedDevice!);
      if (success) {
        try {
          await printInvoice(event.commands, event.paperWidth);
          emit(state.copyWith(error: null)); // Clear error on retry success
        } catch (e2) {
          emit(state.copyWith(error: 'Retry failed: ${e2.toString()}'));
        }
      } else {
        emit(state.copyWith(error: 'Reconnect failed: Please check printer power/Bluetooth.'));
      }
    }
  }

  Future<void> _onScan(ScanForDevices event, Emitter<PrinterState> emit) async {
    emit(state.copyWith(isScanning: true));
    try {
      final devices = await getDevices();
      emit(state.copyWith(devices: devices, isScanning: false));
    } catch (e) {
      emit(state.copyWith(error: 'Scan failed: ${e.toString()}', isScanning: false));
    }
  }

  Future<void> _onConnect(ConnectToDevice event, Emitter<PrinterState> emit) async {
    emit(state.copyWith(isConnecting: true));
    try {
      final success = await connectPrinter(event.device);
      if (success) {
        emit(state.copyWith(connectedDevice: event.device, isConnecting: false));
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
