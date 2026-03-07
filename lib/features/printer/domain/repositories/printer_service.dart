import 'package:equatable/equatable.dart';
import '../../../invoicing/domain/templates/invoice_template.dart';

abstract class IPrinterService {
  Future<List<PrinterDevice>> scanDevices();
  Future<bool> connect(PrinterDevice device);
  Future<void> disconnect();
  Future<bool> isConnected();
  Future<void> printCommands(List<PrintCommand> commands, {int paperWidth = 58});
}

class PrinterDevice extends Equatable {
  final String name;
  final String address;
  final String? customName;
  final String? type; // 'bluetooth', 'wifi', 'usb'
  
  const PrinterDevice({
    required this.name, 
    required this.address,
    this.customName,
    this.type,
  });

  String get displayName => customName ?? name;

  @override
  List<Object?> get props => [name, address, customName, type];

  PrinterDevice copyWith({
    String? name,
    String? address,
    String? customName,
    String? type,
  }) {
    return PrinterDevice(
      name: name ?? this.name,
      address: address ?? this.address,
      customName: customName ?? this.customName,
      type: type ?? this.type,
    );
  }
}
