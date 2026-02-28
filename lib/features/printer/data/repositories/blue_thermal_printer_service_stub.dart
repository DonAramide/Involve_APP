import '../../domain/repositories/printer_service.dart';
import '../../../invoicing/domain/templates/invoice_template.dart';

class BlueThermalPrinterService implements IPrinterService {
  @override
  Future<List<PrinterDevice>> scanDevices() async => [];
  
  @override
  Future<bool> connect(PrinterDevice device) async => false;
  
  @override
  Future<void> disconnect() async {}
  
  @override
  Future<bool> isConnected() async => false;
  
  @override
  Future<void> printCommands(List<PrintCommand> commands, {int paperWidth = 58}) async {}
}
