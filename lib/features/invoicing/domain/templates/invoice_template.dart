import '../entities/invoice.dart';

enum TemplateType {
  compact,
  detailed,
  modern,
  classic,
  elegant,
  bold,
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
  List<PrintCommand> generateCommands(Invoice invoice, dynamic orgSettings);
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

class ImageCommand extends PrintCommand {
  final String path;
  final String align;
  ImageCommand(this.path, {this.align = 'center'});
}
