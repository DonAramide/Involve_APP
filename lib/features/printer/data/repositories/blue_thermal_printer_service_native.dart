import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:blue_thermal_printer/blue_thermal_printer.dart' as btp;
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import 'package:image/image.dart' as img; // Added image package
import '../../domain/repositories/printer_service.dart';
import '../../../invoicing/domain/templates/invoice_template.dart';
import '../esc_pos_text.dart';

class BlueThermalPrinterService implements IPrinterService {
  final btp.BlueThermalPrinter bluetooth = btp.BlueThermalPrinter.instance;

  @override
  Future<List<PrinterDevice>> scanDevices() async {
    if (kIsWeb) return []; // Supported only on Native
    try {
      final List<btp.BluetoothDevice> devices = await bluetooth.getBondedDevices();
      return devices.map((d) => PrinterDevice(
        name: d.name ?? 'Unknown', 
        address: d.address!,
        type: 'bluetooth_spp',
      )).toList();
    } catch (e) {
      debugPrint('SPP Scan Error: $e');
      return [];
    }
  }

  @override
  Future<bool> connect(PrinterDevice device) async {
    if (kIsWeb) return false;
    
    int retryCount = 0;
    const int maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        final btpDevice = btp.BluetoothDevice(device.name, device.address);
        if (await isConnected()) return true;
        
        await bluetooth.connect(btpDevice);
        return true;
      } catch (e) {
        retryCount++;
        debugPrint('SPP Connect Attempt $retryCount failed: $e');
        
        if (retryCount < maxRetries) {
          // If it fails with "socket closed" or similar, try to disconnect first to clean up
          await disconnect();
          await Future.delayed(const Duration(seconds: 1));
        } else {
          debugPrint('SPP Connect Error after $maxRetries attempts: $e');
        }
      }
    }
    return false;
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
        final sanitized = sanitizeEscPosText(cmd.text);
        bytes += generator.text(
          sanitized,
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
          if (image == null) {
            debugPrint('SPP ImageCommand: decodeImage failed (${cmd.bytes!.length} bytes)');
          } else {
            // 58mm ≈ 384 dots, 80mm ≈ 576 dots — keep under printer width.
            final maxWidth = paperWidth == 58 ? 384 : 576;
            img.Image resized = image;
            if (image.width > maxWidth) {
              resized = img.copyResize(image, width: maxWidth);
            }
            // Align width to multiple of 8 (ESC/POS bit packing).
            final alignedW = (resized.width ~/ 8) * 8;
            if (alignedW > 0 && alignedW != resized.width) {
              resized = img.copyResize(resized, width: alignedW);
            }
            debugPrint(
              'SPP ImageCommand: ${resized.width}x${resized.height} '
              'useRaster=${cmd.useRaster} src=${cmd.bytes!.length}B',
            );
            // Do NOT band+rotate — that shreds ID cards into disconnected strips.
            // Chunked Bluetooth write below carries large bitmaps safely.
            // ESC * (image) is what receipt logos already use successfully on these printers.
            // useRaster still selects GS v 0 when the caller needs no 270° transform.
            if (cmd.useRaster) {
              bytes += generator.imageRaster(resized, align: _getAlign(cmd.align));
            } else {
              bytes += generator.image(resized, align: _getAlign(cmd.align));
            }
          }
        }
      } else if (cmd is BarcodeCommand) {
        final payload = cmd.data.trim();
        if (payload.isNotEmpty) {
          try {
            final data = '{B$payload'.split('');
            bytes += generator.barcode(
              Barcode.code128(data),
              textPos: BarcodeText.none,
              align: _getAlign(cmd.align),
              // Wider modules + taller bars for gate scanners on 58/80mm rolls.
              width: paperWidth >= 80 ? 3 : 2,
              height: 120,
            );
          } catch (e) {
            debugPrint('SPP barcode failed: $e');
          }
        }
      }
    }

    bytes += generator.cut();

    // One-shot writeBytes truncates large ID-card rasters on many SPP stacks —
    // only the leading text commands survive (exactly the symptom we saw).
    await _writeChunked(Uint8List.fromList(bytes));
  }

  Future<void> _writeChunked(Uint8List data) async {
    const chunkSize = 512;
    debugPrint('SPP write: ${data.length} bytes in ${(data.length / chunkSize).ceil()} chunks');
    for (var i = 0; i < data.length; i += chunkSize) {
      final end = (i + chunkSize < data.length) ? i + chunkSize : data.length;
      await bluetooth.writeBytes(Uint8List.fromList(data.sublist(i, end)));
      await Future.delayed(const Duration(milliseconds: 40));
    }
  }

  PosAlign _getAlign(String align) {
    switch (align) {
      case 'center': return PosAlign.center;
      case 'right': return PosAlign.right;
      default: return PosAlign.left;
    }
  }
}
