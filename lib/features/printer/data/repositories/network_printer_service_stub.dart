import '../../domain/repositories/printer_service.dart';
import '../../../invoicing/domain/templates/invoice_template.dart';

class NetworkPrinterService implements IPrinterService {
  static Future<bool> testConnection(String ip, {int port = 9100}) async => false;

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

  Future<bool> connectByIp(String ipAddress, {int port = 9100}) async => false;
}
