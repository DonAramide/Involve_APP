import 'package:flutter/foundation.dart';
import '../../domain/repositories/printer_service.dart';
import 'cross_platform_printer_service.dart';
import 'blue_thermal_printer_service.dart';
import 'network_printer_service.dart';
import '../../../invoicing/domain/templates/invoice_template.dart';

class UnifiedPrinterService implements IPrinterService {
  final CrossPlatformPrinterService bleService;
  final BlueThermalPrinterService sppService;
  final NetworkPrinterService networkService;

  UnifiedPrinterService({
    required this.bleService,
    required this.sppService,
    required this.networkService,
  });

  bool _isIpAddress(String address) {
    final ipRegex = RegExp(r'^(\d{1,3}\.){3}\d{1,3}$');
    return ipRegex.hasMatch(address);
  }

  @override
  Future<List<PrinterDevice>> scanDevices() async {
    final List<PrinterDevice> allDevices = [];
    
    if (kIsWeb) return allDevices; // Native plugins not supported on Web

    // Get bonded (paired) devices from SPP service
    try {
      final sppDevices = await sppService.scanDevices();
      allDevices.addAll(sppDevices);
    } catch (e) {
      debugPrint('SPP Scan Error: $e');
    }
    
    // Get BLE devices from BLE service
    try {
      final bleDevices = await bleService.scanDevices();
      // Avoid duplicates
      for (final dev in bleDevices) {
        if (!allDevices.any((d) => d.address == dev.address)) {
          allDevices.add(dev);
        }
      }
    } catch (e) {
      debugPrint('BLE Scan Error: $e');
    }
    
    return allDevices;
  }

  @override
  Future<bool> connect(PrinterDevice device) async {
    await disconnect(); // Ensure clean state

    if (_isIpAddress(device.address)) {
      return await networkService.connect(device);
    } 
    
    if (kIsWeb) return false; // Native Bluetooth not supported on Web

    // Try BLE first (more modern, usually doesn't prompt for PIN unnecessarily)
    final bleSuccess = await bleService.connect(device);
    if (bleSuccess) return true;

    // If BLE fails, try SPP (Classic Bluetooth)
    return await sppService.connect(device);
  }

  @override
  Future<void> disconnect() async {
    try {
      if (!kIsWeb) {
        await sppService.disconnect();
        await bleService.disconnect();
      }
      await networkService.disconnect();
      // Small delay to allow hardware cleanup
      await Future.delayed(const Duration(milliseconds: 300));
    } catch (e) {
      debugPrint('Unified Disconnect Error: $e');
    }
  }

  @override
  Future<bool> isConnected() async {
    if (kIsWeb) return await networkService.isConnected();
    
    return await sppService.isConnected() || 
           await bleService.isConnected() || 
           await networkService.isConnected();
  }

  @override
  Future<void> printCommands(List<PrintCommand> commands, {int paperWidth = 58}) async {
    if (await networkService.isConnected()) {
      await networkService.printCommands(commands, paperWidth: paperWidth);
    } else if (!kIsWeb && await sppService.isConnected()) {
      await sppService.printCommands(commands, paperWidth: paperWidth);
    } else if (!kIsWeb && await bleService.isConnected()) {
      await bleService.printCommands(commands, paperWidth: paperWidth);
    } else {
      throw Exception('No printer connected');
    }
  }
}
