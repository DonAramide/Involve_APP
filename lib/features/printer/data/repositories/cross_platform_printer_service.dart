import 'dart:typed_data';
import 'dart:io';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import '../../domain/repositories/printer_service.dart';
import '../../../invoicing/domain/templates/invoice_template.dart';

class CrossPlatformPrinterService implements IPrinterService {
  BluetoothDevice? _connectedDevice;
  BluetoothCharacteristic? _writeCharacteristic;

  @override
  Future<List<PrinterDevice>> scanDevices() async {
    final List<PrinterDevice> devices = [];
    
    // Check Bluetooth state
    if (await FlutterBluePlus.isSupported == false) {
      throw Exception('Bluetooth not supported by this device');
    }

    // Turn on Bluetooth (if possible)
    if (Platform.isAndroid) {
      await FlutterBluePlus.turnOn();
    }

    // Start scanning
    await FlutterBluePlus.startScan(timeout: const Duration(seconds: 4));
    
    // Listen to scan results
    final scanResults = await FlutterBluePlus.scanResults.first;
    
    for (ScanResult r in scanResults) {
      if (r.device.platformName.isNotEmpty) {
        devices.add(PrinterDevice(
          name: r.device.platformName,
          address: r.device.remoteId.toString(),
        ));
      }
    }

    await FlutterBluePlus.stopScan();
    return devices;
  }

  @override
  Future<bool> connect(PrinterDevice device) async {
    try {
      // Find the device
      final scanResults = await FlutterBluePlus.scanResults.first;
      BluetoothDevice? targetDevice;

      for (final result in scanResults) {
        if (result.device.remoteId.toString() == device.address) {
          targetDevice = result.device;
          break;
        }
      }

      if (targetDevice == null) {
        // Try to connect by ID directly
        targetDevice = BluetoothDevice(remoteId: DeviceIdentifier(device.address));
      }

      // Connect to device
      await targetDevice.connect(timeout: const Duration(seconds: 10));
      _connectedDevice = targetDevice;

      // Discover services
      List<BluetoothService> services = await targetDevice.discoverServices();
      
      // Find write characteristic (usually in Serial Port service)
      for (BluetoothService service in services) {
        for (BluetoothCharacteristic characteristic in service.characteristics) {
          if (characteristic.properties.write || characteristic.properties.writeWithoutResponse) {
            _writeCharacteristic = characteristic;
            break;
          }
        }
        if (_writeCharacteristic != null) break;
      }

      return _writeCharacteristic != null;
    } catch (e) {
      print('Connection error: $e');
      return false;
    }
  }

  @override
  Future<void> disconnect() async {
    if (_connectedDevice != null) {
      await _connectedDevice!.disconnect();
      _connectedDevice = null;
      _writeCharacteristic = null;
    }
  }

  @override
  Future<bool> isConnected() async {
    if (_connectedDevice == null) return false;
    return _connectedDevice!.isConnected;
  }

  @override
  Future<void> printCommands(List<PrintCommand> commands, {int paperWidth = 58}) async {
    if (_writeCharacteristic == null || !(await isConnected())) {
      throw Exception('Printer not connected');
    }

    final profile = await CapabilityProfile.load();
    final generator = Generator(
      paperWidth == 58 ? PaperSize.mm58 : PaperSize.mm80,
      profile,
    );
    List<int> bytes = [];

    for (final cmd in commands) {
      if (cmd is TextCommand) {
        bytes += generator.text(
          cmd.text,
          styles: PosStyles(
            align: _getAlign(cmd.align),
            bold: cmd.isBold,
          ),
        );
      } else if (cmd is DividerCommand) {
        bytes += generator.hr();
      } else if (cmd is ImageCommand) {
        // Image printing can be implemented here
        // bytes += generator.image(posImage);
      }
    }

    bytes += generator.feed(2);
    bytes += generator.cut();

    // Send data in chunks (iOS has size limits)
    const int chunkSize = 512;
    for (int i = 0; i < bytes.length; i += chunkSize) {
      final end = (i + chunkSize < bytes.length) ? i + chunkSize : bytes.length;
      final chunk = bytes.sublist(i, end);
      
      if (_writeCharacteristic!.properties.writeWithoutResponse) {
        await _writeCharacteristic!.write(chunk, withoutResponse: true);
      } else {
        await _writeCharacteristic!.write(chunk);
      }
      
      // Small delay between chunks for stability
      await Future.delayed(const Duration(milliseconds: 50));
    }
  }

  PosAlign _getAlign(String align) {
    switch (align) {
      case 'center':
        return PosAlign.center;
      case 'right':
        return PosAlign.right;
      default:
        return PosAlign.left;
    }
  }
}
