import '../repositories/printer_service.dart';
import '../../invoicing/domain/templates/invoice_template.dart';

class GetBluetoothDevices {
  final IPrinterService service;
  GetBluetoothDevices(this.service);
  Future<List<BluetoothDevice>> call() => service.scanDevices();
}

class ConnectToPrinter {
  final IPrinterService service;
  ConnectToPrinter(this.service);
  Future<bool> call(BluetoothDevice device) => service.connect(device);
}

class PrintInvoiceCommands {
  final IPrinterService service;
  PrintInvoiceCommands(this.service);
  Future<void> call(List<PrintCommand> commands, int paperWidth) => 
      service.printCommands(commands, paperWidth: paperWidth);
}
