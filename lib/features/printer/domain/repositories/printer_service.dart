import '../../../invoicing/domain/templates/invoice_template.dart';

abstract class IPrinterService {
  Future<List<PrinterDevice>> scanDevices();
  Future<bool> connect(PrinterDevice device);
  Future<void> disconnect();
  Future<bool> isConnected();
  Future<void> printCommands(List<PrintCommand> commands, {int paperWidth = 58});
}

class PrinterDevice {
  final String name;
  final String address;
  PrinterDevice({required this.name, required this.address});
}
