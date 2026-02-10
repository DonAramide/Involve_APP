import 'dart:typed_data';
import 'package:blue_thermal_printer/blue_thermal_printer.dart' as btp;
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import '../repositories/printer_service.dart';
import '../../invoicing/domain/templates/invoice_template.dart';

class BlueThermalPrinterService implements IPrinterService {
  final btp.BlueThermalPrinter bluetooth = btp.BlueThermalPrinter.instance;

  @override
  Future<List<BluetoothDevice>> scanDevices() async {
    final List<btp.BluetoothDevice> devices = await bluetooth.getBondedDevices();
    return devices.map((d) => BluetoothDevice(name: d.name ?? 'Unknown', address: d.address!)).toList();
  }

  @override
  Future<bool> connect(BluetoothDevice device) async {
    final btpDevice = btp.BluetoothDevice(device.name, device.address);
    if (await bluetooth.isConnected == true) return true;
    try {
      await bluetooth.connect(btpDevice);
      return true;
    } catch (e) {
      return false;
    }
  }

  @override
  Future<void> disconnect() async => await bluetooth.disconnect();

  @override
  Future<bool> isConnected() async => (await bluetooth.isConnected) ?? false;

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
