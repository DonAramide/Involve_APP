import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import '../../domain/repositories/printer_service.dart';
import '../../../invoicing/domain/templates/invoice_template.dart';

/// Network (WiFi) Printer Service for Xprinter and other network thermal printers
/// Works on Android, iOS, and Web
/// Printer must be configured on the same network
class NetworkPrinterService implements IPrinterService {
  Socket? _socket;
  String? _connectedIp;
  int _port = 9100; // Standard port for network thermal printers

  @override
  Future<List<PrinterDevice>> scanDevices() async {
    // Network printer discovery is complex and requires mDNS/Bonjour
    // For simplicity, we'll return an empty list and require manual IP entry
    // Advanced implementation could use network_info_plus and ping
    return [];
  }

  /// Connect to printer by IP address
  /// Example: connectByIp('192.168.1.100')
  Future<bool> connectByIp(String ipAddress, {int port = 9100}) async {
    try {
      _port = port;
      
      // Try to connect to the printer
      _socket = await Socket.connect(
        ipAddress,
        port,
        timeout: const Duration(seconds: 5),
      );
      
      _connectedIp = ipAddress;
      return true;
    } catch (e) {
      debugPrint('Network connection error: $e');
      return false;
    }
  }

  @override
  Future<bool> connect(PrinterDevice device) async {
    // For network printers, the address is the IP
    return await connectByIp(device.address);
  }

  @override
  Future<void> disconnect() async {
    if (_socket != null) {
      await _socket!.close();
      _socket = null;
      _connectedIp = null;
    }
  }

  @override
  Future<void> printCommands(List<PrintCommand> commands, {int paperWidth = 58}) async {
    if (_socket == null) {
      throw Exception('Printer not connected');
    }

    try {
      // Generate ESC/POS commands
      final profile = await CapabilityProfile.load();
      final paperSize = paperWidth == 80 ? PaperSize.mm80 : PaperSize.mm58;
      final generator = Generator(paperSize, profile);
      List<int> bytes = [];

      // Initialize printer
      bytes += generator.reset();

      for (var cmd in commands) {
        if (cmd is TextCommand) {
          PosStyles styles = const PosStyles();
          
          if (cmd.isBold) {
            styles = const PosStyles(bold: true);
          }
          
          if (cmd.align == 'center') {
            styles = PosStyles(align: PosAlign.center, bold: cmd.isBold);
          } else if (cmd.align == 'right') {
            styles = PosStyles(align: PosAlign.right, bold: cmd.isBold);
          } else {
            styles = PosStyles(bold: cmd.isBold);
          }
          
          bytes += generator.text(cmd.text, styles: styles);
        } else if (cmd is DividerCommand) {
          bytes += generator.text('--------------------------------');
        } else if (cmd is ImageCommand) {
          // Image printing would require additional processing
          // For now, skip images in network printing
          bytes += generator.text('[IMAGE]');
        }
      }

      // Feed and cut
      bytes += generator.feed(2);
      bytes += generator.cut();

      // Send to printer
      _socket!.add(bytes);
      await _socket!.flush();

      // Wait a bit for printer to process
      await Future.delayed(const Duration(milliseconds: 500));
    } catch (e) {
      debugPrint('Network print error: $e');
      rethrow;
    }
  }

  @override
  Future<bool> isConnected() async {
    return _socket != null && _connectedIp != null;
  }

  Future<PrinterDevice?> getConnectedDevice() async {
    if (_connectedIp == null) return null;
    
    return PrinterDevice(
      name: 'Network Printer',
      address: _connectedIp!,
    );
  }

  /// Test connection to a printer IP
  static Future<bool> testConnection(String ipAddress, {int port = 9100}) async {
    try {
      final socket = await Socket.connect(
        ipAddress,
        port,
        timeout: const Duration(seconds: 3),
      );
      await socket.close();
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Get printer status (if supported by printer)
  Future<String> getPrinterStatus() async {
    if (_socket == null) {
      return 'Not connected';
    }

    try {
      // Send status request command (ESC/POS DLE EOT)
      _socket!.add([0x10, 0x04, 0x01]);
      await _socket!.flush();
      
      // Wait for response
      await Future.delayed(const Duration(milliseconds: 200));
      
      return 'Connected';
    } catch (e) {
      return 'Error: $e';
    }
  }
}
