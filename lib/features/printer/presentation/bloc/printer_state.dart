import 'package:equatable/equatable.dart';
import '../../domain/repositories/printer_service.dart';

import '../../../invoicing/domain/templates/invoice_template.dart';

// Printer Events
abstract class PrinterEvent {}

class ScanForDevices extends PrinterEvent {}

class ConnectToDevice extends PrinterEvent implements Equatable {
  final PrinterDevice device;
  ConnectToDevice(this.device);
  @override
  List<Object?> get props => [device];

  @override
  bool? get stringify => true;
}

class DisconnectPrinter extends PrinterEvent {}

class PrintCommandsEvent extends PrinterEvent {
  final List<PrintCommand> commands;
  final int paperWidth;
  PrintCommandsEvent(this.commands, this.paperWidth);
  @override
  List<Object?> get props => [commands, paperWidth];
}

// States
class PrinterState extends Equatable {
  final List<PrinterDevice> devices;
  final PrinterDevice? connectedDevice;
  final bool isScanning;
  final bool isConnecting;
  final String? error;

  const PrinterState({
    this.devices = const [],
    this.connectedDevice,
    this.isScanning = false,
    this.isConnecting = false,
    this.error,
  });

  PrinterState copyWith({
    List<PrinterDevice>? devices,
    PrinterDevice? connectedDevice,
    bool? isScanning,
    bool? isConnecting,
    String? error,
  }) {
    return PrinterState(
      devices: devices ?? this.devices,
      connectedDevice: connectedDevice ?? this.connectedDevice,
      isScanning: isScanning ?? this.isScanning,
      isConnecting: isConnecting ?? this.isConnecting,
      error: error ?? this.error,
    );
  }

  @override
  List<Object?> get props => [devices, connectedDevice, isScanning, isConnecting, error];
}
