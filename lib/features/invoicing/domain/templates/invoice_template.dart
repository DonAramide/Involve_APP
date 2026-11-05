import '../entities/invoice.dart';
import 'dart:typed_data';

enum TemplateType {
  compact,
  detailed,
  modern,
  classic,
  elegant,
  bold,
  professional,
  minimalist,
  schoolTeal,
  schoolColor,
  schoolAcademic,
  schoolTraditional,
}

enum LogoPlacement {
  topCenter,
  topRight,
  none,
}

abstract class InvoiceTemplate {
  String get name;
  TemplateType get type;
  
  // Design properties
  LogoPlacement get logoPlacement;
  bool get useBoldHeaders;
  double get columnSpacing;
  
  // Business data would be passed here
  List<PrintCommand> generateCommands(Invoice invoice, dynamic orgSettings, {String? copyType});
}

// Intermediary command representation for printing services
abstract class PrintCommand {}

class TextCommand extends PrintCommand {
  final String text;
  final bool isBold;
  final String align; // left, center, right
  TextCommand(this.text, {this.isBold = false, this.align = 'left'});
}

class DividerCommand extends PrintCommand {}

class SizedBoxCommand extends PrintCommand {
  final int height;
  SizedBoxCommand({this.height = 1});
}


class ImageCommand extends PrintCommand {
  final String? path;
  final Uint8List? bytes;
  final String align;
  /// When true, use ESC/POS GS v 0 raster (no 270° rotation). Required for
  /// landscape ID-card bitmaps that must print upright for cut-out cards.
  final bool useRaster;
  ImageCommand({
    this.path,
    this.bytes,
    this.align = 'center',
    this.useRaster = false,
  });
}

/// ESC/POS native Code 128 (subset B). Prefer [ImageCommand] with a rendered
/// barcode PNG when the payload is long or the printer profile is unreliable.
class BarcodeCommand extends PrintCommand {
  final String data;
  final String align;
  BarcodeCommand({required this.data, this.align = 'center'});
}
