import 'package:equatable/equatable.dart';
import '../../domain/repositories/printer_service.dart';

import '../../../invoicing/domain/templates/invoice_template.dart';

// Printer Events
abstract class PrinterEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class ScanForDevices extends PrinterEvent {}

class ConnectToDevice extends PrinterEvent {
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

class RenamePrinter extends PrinterEvent {
  final String address;
  final String newName;
  RenamePrinter(this.address, this.newName);
}

class AutoConnectPrinter extends PrinterEvent {}

// States
class CheckConnectionStatus extends PrinterEvent {}

class ResetPrinterState extends PrinterEvent {}

class PrinterState extends Equatable {
  final List<PrinterDevice> devices;
  final PrinterDevice? connectedDevice;
  final bool isScanning;
  final bool isConnecting;
  final bool isAutoConnecting;
  final String? error;

  const PrinterState({
    this.devices = const [],
    this.connectedDevice,
    this.isScanning = false,
    this.isConnecting = false,
    this.isAutoConnecting = false,
    this.error,
  });

  PrinterState copyWith({
    List<PrinterDevice>? devices,
    PrinterDevice? connectedDevice,
    bool? isScanning,
    bool? isConnecting,
    bool? isAutoConnecting,
    String? error,
  }) {
    return PrinterState(
      devices: devices ?? this.devices,
      connectedDevice: connectedDevice ?? this.connectedDevice,
      isScanning: isScanning ?? this.isScanning,
      isConnecting: isConnecting ?? this.isConnecting,
      isAutoConnecting: isAutoConnecting ?? this.isAutoConnecting,
      error: error ?? this.error,
    );
  }

  @override
  List<Object?> get props => [devices, connectedDevice, isScanning, isConnecting, isAutoConnecting, error];
}
