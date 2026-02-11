import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:usb_serial/usb_serial.dart';
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import '../../domain/repositories/printer_service.dart';
import '../../../invoicing/domain/templates/invoice_template.dart';

/// USB Printer Service for Xprinter and other USB thermal printers
/// Supports Android only (USB OTG required)
class UsbPrinterService implements IPrinterService {
  UsbPort? _port;
  UsbDevice? _connectedDevice;

  @override
  Future<List<PrinterDevice>> scanDevices() async {
    final List<PrinterDevice> devices = [];
    
    // Get list of connected USB devices
    List<UsbDevice> usbDevices = await UsbSerial.listDevices();
    
    for (UsbDevice device in usbDevices) {
      // Filter for printer devices (common vendor IDs for thermal printers)
      // Xprinter typically uses vendor ID 0x0483 or 0x1CBE
      if (_isPrinterDevice(device)) {
        devices.add(PrinterDevice(
          name: device.productName ?? 'USB Printer',
          address: '${device.vid}:${device.pid}',
        ));
      }
    }
    
    return devices;
  }

  bool _isPrinterDevice(UsbDevice device) {
    // Common thermal printer vendor IDs
    const printerVendorIds = [
      0x0483, // STMicroelectronics (used by many Chinese printers)
      0x1CBE, // Xprinter
      0x04B8, // Epson
      0x0519, // Star Micronics
      0x154F, // Bixolon
    ];
    
    return printerVendorIds.contains(device.vid);
  }

  @override
  Future<bool> connect(PrinterDevice device) async {
    try {
      // Parse vendor and product ID from address
      final parts = device.address.split(':');
      if (parts.length != 2) return false;
      
      final vid = int.parse(parts[0]);
      final pid = int.parse(parts[1]);
      
      // Find the device
      List<UsbDevice> devices = await UsbSerial.listDevices();
      UsbDevice? targetDevice = devices.firstWhere(
        (d) => d.vid == vid && d.pid == pid,
        orElse: () => throw Exception('Device not found'),
      );
      
      // Create port
      _port = await targetDevice.create();
      if (_port == null) return false;
      
      // Open connection
      bool opened = await _port!.open();
      if (!opened) return false;
      
      // Configure port for thermal printer
      await _port!.setDTR(true);
      await _port!.setRTS(true);
      await _port!.setPortParameters(
        9600, // Baud rate (common for thermal printers)
        UsbPort.DATABITS_8,
        UsbPort.STOPBITS_1,
        UsbPort.PARITY_NONE,
      );
      
      _connectedDevice = targetDevice;
      return true;
    } catch (e) {
      debugPrint('USB Connection error: $e');
      return false;
    }
  }

  @override
  Future<void> disconnect() async {
    if (_port != null) {
      await _port!.close();
      _port = null;
      _connectedDevice = null;
    }
  }

  @override
  Future<void> printCommands(List<PrintCommand> commands, {int paperWidth = 58}) async {
    if (_port == null) {
      throw Exception('Printer not connected');
    }

    try {
      // Generate ESC/POS commands
      final profile = await CapabilityProfile.load();
      final paperSize = paperWidth == 80 ? PaperSize.mm80 : PaperSize.mm58;
      final generator = Generator(paperSize, profile);
      List<int> bytes = [];

      for (var cmd in commands) {
        if (cmd is TextCommand) {
          if (cmd.isBold) {
            bytes += generator.setStyles(const PosStyles(bold: true));
          }
          
          if (cmd.align == 'center') {
            bytes += generator.text(cmd.text, styles: const PosStyles(align: PosAlign.center));
          } else if (cmd.align == 'right') {
            bytes += generator.text(cmd.text, styles: const PosStyles(align: PosAlign.right));
          } else {
            bytes += generator.text(cmd.text);
          }
          
          if (cmd.isBold) {
            bytes += generator.setStyles(const PosStyles(bold: false));
          }
        } else if (cmd is DividerCommand) {
          bytes += generator.text('--------------------------------');
        }
      }

      // Feed and cut
      bytes += generator.feed(2);
      bytes += generator.cut();

      // Send to printer in chunks
      const chunkSize = 512;
      for (int i = 0; i < bytes.length; i += chunkSize) {
        final end = (i + chunkSize < bytes.length) ? i + chunkSize : bytes.length;
        final chunk = bytes.sublist(i, end);
        await _port!.write(Uint8List.fromList(chunk));
        await Future.delayed(const Duration(milliseconds: 50)); // Small delay between chunks
      }
    } catch (e) {
      debugPrint('Print error: $e');
      rethrow;
    }
  }

  @override
  Future<bool> isConnected() async {
    return _port != null;
  }

  Future<PrinterDevice?> getConnectedDevice() async {
    if (_connectedDevice == null) return null;
    
    return PrinterDevice(
      name: _connectedDevice!.productName ?? 'USB Printer',
      address: '${_connectedDevice!.vid}:${_connectedDevice!.pid}',
    );
  }
}
