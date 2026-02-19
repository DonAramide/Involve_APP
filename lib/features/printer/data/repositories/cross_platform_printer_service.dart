import 'dart:typed_data';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import 'package:image/image.dart' as img; // Import image package
import '../../domain/repositories/printer_service.dart';
import '../../../invoicing/domain/templates/invoice_template.dart';

class CrossPlatformPrinterService implements IPrinterService {
  BluetoothDevice? _connectedDevice;
  BluetoothCharacteristic? _writeCharacteristic;

  @override
  Future<List<PrinterDevice>> scanDevices() async {
    if (kIsWeb) return [];
    final List<PrinterDevice> devices = [];
    
    try {
      // Check Bluetooth state
      if (await FlutterBluePlus.isSupported == false) {
        return [];
      }

      // Turn on Bluetooth (if possible)
      if (Platform.isAndroid) {
        await FlutterBluePlus.turnOn();
      }

      // Start scanning
      await FlutterBluePlus.startScan(timeout: const Duration(seconds: 4));
      
      // Wait for scanning to complete
      await FlutterBluePlus.isScanning.where((scanning) => !scanning).first;
      
      // Get results from last scan
      final scanResults = FlutterBluePlus.lastScanResults;
      
      for (ScanResult r in scanResults) {
        final name = r.device.platformName.isNotEmpty 
            ? r.device.platformName 
            : (r.advertisementData.advName.isNotEmpty ? r.advertisementData.advName : 'Unknown Device');
        
        devices.add(PrinterDevice(
          name: name,
          address: r.device.remoteId.toString(),
        ));
      }
    } catch (e) {
      debugPrint('BLE Scan Error: $e');
    }

    return devices;
  }

  @override
  Future<bool> connect(PrinterDevice device) async {
    if (kIsWeb) return false;
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
      await targetDevice!.connect();
      _connectedDevice = targetDevice;

      // Discover services
      List<BluetoothService> services = await targetDevice!.discoverServices();
      
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
      debugPrint('BLE Connection error: $e');
      return false;
    }
  }

  @override
  Future<void> disconnect() async {
    if (kIsWeb) return;
    try {
      if (_connectedDevice != null) {
        await _connectedDevice!.disconnect();
      }
    } catch (e) {
      debugPrint('BLE Disconnect Error: $e');
    } finally {
      _connectedDevice = null;
      _writeCharacteristic = null;
    }
  }

  @override
  Future<bool> isConnected() async {
    if (kIsWeb || _connectedDevice == null) return false;
    try {
      return _connectedDevice!.isConnected;
    } catch (e) {
      return false;
    }
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
      } else if (cmd is SizedBoxCommand) {
        bytes += generator.feed(cmd.height);
      } else if (cmd is ImageCommand) {
        if (cmd.bytes != null) {
          final img.Image? image = img.decodeImage(cmd.bytes!);
          if (image != null) {
             // Resize logic based on paper width
             // 58mm = ~384 dots, 80mm = ~576 dots
             final maxWidth = paperWidth == 58 ? 370 : 550;
             img.Image resized = image;
             if (image.width > maxWidth) {
               resized = img.copyResize(image, width: maxWidth);
             }
             
             // Use high density printing for better logo quality
             bytes += generator.image(resized, align: _getAlign(cmd.align));
          }
        }
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
