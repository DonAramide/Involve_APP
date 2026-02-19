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
  
  const PrinterDevice({required this.name, required this.address});

  @override
  List<Object?> get props => [name, address];
}
