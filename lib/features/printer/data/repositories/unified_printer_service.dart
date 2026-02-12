import 'package:flutter/foundation.dart';
import '../../domain/repositories/printer_service.dart';
import 'cross_platform_printer_service.dart';
import 'network_printer_service.dart';
import '../../../invoicing/domain/templates/invoice_template.dart';

class UnifiedPrinterService implements IPrinterService {
  final CrossPlatformPrinterService bluetoothService;
  final NetworkPrinterService networkService;

  UnifiedPrinterService({
    required this.bluetoothService,
    required this.networkService,
  });

  bool _isIpAddress(String address) {
    final ipRegex = RegExp(r'^(\d{1,3}\.){3}\d{1,3}$');
    return ipRegex.hasMatch(address);
  }

  @override
  Future<List<PrinterDevice>> scanDevices() async {
    // Primarily scan for Bluetooth devices
    return await bluetoothService.scanDevices();
  }

  @override
  Future<bool> connect(PrinterDevice device) async {
    if (_isIpAddress(device.address)) {
      // WiFi/Network printer
      await bluetoothService.disconnect(); // Ensure Bluetooth is disconnected
      return await networkService.connect(device);
    } else {
      // Bluetooth printer
      await networkService.disconnect(); // Ensure WiFi is disconnected
      return await bluetoothService.connect(device);
    }
  }

  @override
  Future<void> disconnect() async {
    await bluetoothService.disconnect();
    await networkService.disconnect();
  }

  @override
  Future<bool> isConnected() async {
    return await bluetoothService.isConnected() || await networkService.isConnected();
  }

  @override
  Future<void> printCommands(List<PrintCommand> commands, {int paperWidth = 58}) async {
    if (await networkService.isConnected()) {
      await networkService.printCommands(commands, paperWidth: paperWidth);
    } else {
      await bluetoothService.printCommands(commands, paperWidth: paperWidth);
    }
  }
}
