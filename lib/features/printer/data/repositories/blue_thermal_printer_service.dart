import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:blue_thermal_printer/blue_thermal_printer.dart' as btp;
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import '../../domain/repositories/printer_service.dart';
import '../../../invoicing/domain/templates/invoice_template.dart';

class BlueThermalPrinterService implements IPrinterService {
  final btp.BlueThermalPrinter bluetooth = btp.BlueThermalPrinter.instance;

  @override
  Future<List<PrinterDevice>> scanDevices() async {
    if (kIsWeb) return []; // Supported only on Native
    try {
      final List<btp.BluetoothDevice> devices = await bluetooth.getBondedDevices();
      return devices.map((d) => PrinterDevice(name: d.name ?? 'Unknown', address: d.address!)).toList();
    } catch (e) {
      debugPrint('SPP Scan Error: $e');
      return [];
    }
  }

  @override
  Future<bool> connect(PrinterDevice device) async {
    if (kIsWeb) return false;
    try {
      final btpDevice = btp.BluetoothDevice(device.name, device.address);
      if (await isConnected()) return true;
      await bluetooth.connect(btpDevice);
      return true;
    } catch (e) {
      debugPrint('SPP Connect Error: $e');
      return false;
    }
  }

  @override
  Future<void> disconnect() async {
    try {
      if (await bluetooth.isConnected == true) {
        await bluetooth.disconnect();
      }
    } catch (e) {
      debugPrint('SPP Disconnect Error: $e');
    }
  }

  @override
  Future<bool> isConnected() async {
    if (kIsWeb) return false;
    try {
      return (await bluetooth.isConnected) ?? false;
    } catch (e) {
      debugPrint('SPP Status Error: $e');
      return false;
    }
  }

  @override
  Future<void> printCommands(List<PrintCommand> commands, {int paperWidth = 58}) async {
    if (!(await isConnected())) return;

    final profile = await CapabilityProfile.load();
    final generator = Generator(paperWidth == 58 ? PaperSize.mm58 : PaperSize.mm80, profile);
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
        // In a real app, you would load the byte data from the path
        // bytes += generator.image(posImage);
      }
    }

    bytes += generator.feed(2);
    bytes += generator.cut();

    await bluetooth.writeBytes(Uint8List.fromList(bytes));
  }

  PosAlign _getAlign(String align) {
    switch (align) {
      case 'center': return PosAlign.center;
      case 'right': return PosAlign.right;
      default: return PosAlign.left;
    }
  }
}
