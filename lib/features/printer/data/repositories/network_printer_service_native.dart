import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import 'package:image/image.dart' as img;
import '../../domain/repositories/printer_service.dart';
import '../../../invoicing/domain/templates/invoice_template.dart';

class NetworkPrinterService implements IPrinterService {
  Socket? _socket;
  String? _connectedIp;
  int _port = 9100;

  static Future<bool> testConnection(String ip, {int port = 9100}) async {
    try {
      final socket = await Socket.connect(ip, port, timeout: const Duration(seconds: 3));
      await socket.close();
      return true;
    } catch (e) {
      return false;
    }
  }

  @override
  Future<List<PrinterDevice>> scanDevices() async => [];

  Future<bool> connectByIp(String ipAddress, {int port = 9100}) async {
    debugPrint('NetworkPrinterService: Attempting connection to $ipAddress:$port');
    try {
      _port = port;
      _socket = await Socket.connect(ipAddress, port, timeout: const Duration(seconds: 5));
      _connectedIp = ipAddress;
      return true;
    } catch (e) {
      debugPrint('NetworkPrinterService: Connection error: $e');
      return false;
    }
  }

  @override
  Future<bool> connect(PrinterDevice device) async {
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
    if (_socket == null) throw Exception('Printer not connected');

    final profile = await CapabilityProfile.load();
    final generator = Generator(paperWidth == 80 ? PaperSize.mm80 : PaperSize.mm58, profile);
    List<int> bytes = generator.reset();

    for (var cmd in commands) {
      if (cmd is TextCommand) {
        String sanitizedText = cmd.text.replaceAll('₦', 'N');
        PosStyles styles = PosStyles(
          align: cmd.align == 'center' ? PosAlign.center : (cmd.align == 'right' ? PosAlign.right : PosAlign.left),
          bold: cmd.isBold,
        );
        bytes += generator.text(sanitizedText, styles: styles);
      } else if (cmd is DividerCommand) {
        bytes += generator.hr();
      } else if (cmd is SizedBoxCommand) {
        bytes += generator.feed(cmd.height);
      } else if (cmd is ImageCommand) {
        if (cmd.bytes != null) {
          final image = img.decodeImage(cmd.bytes!);
          if (image != null) {
            final maxWidth = paperWidth == 58 ? 370 : 550;
            var resized = image;
            if (image.width > maxWidth) {
              resized = img.copyResize(image, width: maxWidth);
            }
            bytes += generator.image(resized, align: cmd.align == 'center' ? PosAlign.center : (cmd.align == 'right' ? PosAlign.right : PosAlign.left));
          }
        }
      }
    }

    bytes += generator.feed(2);
    bytes += generator.cut();

    _socket!.add(bytes);
    await _socket!.flush();
    await Future.delayed(const Duration(milliseconds: 500));
  }

  @override
  Future<bool> isConnected() async {
    return _socket != null && _connectedIp != null;
  }
}
