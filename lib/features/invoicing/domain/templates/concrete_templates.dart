import 'invoice_template.dart';
import '../entities/invoice.dart';
import '../../../settings/domain/entities/settings.dart';

class CompactInvoiceTemplate extends InvoiceTemplate {
  @override
  String get name => 'Compact POS';
  @override
  TemplateType get type => TemplateType.compact;
  @override
  LogoPlacement get logoPlacement => LogoPlacement.topCenter;
  @override
  bool get useBoldHeaders => true;
  @override
  double get columnSpacing => 2.0;

  @override
  List<PrintCommand> generateCommands(Invoice invoice, dynamic orgSettings) {
    final settings = orgSettings as AppSettings;
    const int width = 32; // Default for 58mm

    return [
      if (settings.logo != null) ImageCommand(bytes: settings.logo!),
      TextCommand(settings.organizationName.toUpperCase(), align: 'center', isBold: true),
      if (settings.address.isNotEmpty) TextCommand(settings.address, align: 'center'),
      if (settings.phone.isNotEmpty) TextCommand('Tel: ${settings.phone}', align: 'center'),
      TextCommand('Date: ${invoice.dateCreated.toString().split('.')[0]}', align: 'center'),
      TextCommand('Invoice: ${invoice.invoiceNumber}', align: 'center'),
      DividerCommand(),
      ...invoice.items.map((item) {
        final name = item.item.name;
        final qtyLine = 'x${item.quantity}';
        final priceLine = '${item.total.toStringAsFixed(2)}';
        
        // Format: Name xQty ........ Price
        // Truncate name if too long
        final leftPart = '$name $qtyLine';
        final availableWidth = width - priceLine.length - 1;
        final truncatedLeft = leftPart.length > availableWidth 
            ? leftPart.substring(0, availableWidth - 1) 
            : leftPart;
            
        final spaces = ' ' * (width - truncatedLeft.length - priceLine.length);
        return TextCommand(truncatedLeft + spaces + priceLine);
      }),
      DividerCommand(),
      if (invoice.taxAmount > 0) 
        TextCommand(_formatRow('Subtotal', invoice.subtotal.toStringAsFixed(2), width)),
      if (invoice.taxAmount > 0) 
        TextCommand(_formatRow('Tax', invoice.taxAmount.toStringAsFixed(2), width)),
      TextCommand(_formatRow('TOTAL', '${settings.currency} ${invoice.totalAmount.toStringAsFixed(2)}', width), isBold: true),
      DividerCommand(),
      TextCommand('Thank you!', align: 'center'),
      TextCommand('Powered by IIPS', align: 'center'),
    ];
  }

  String _formatRow(String left, String right, int width) {
    final spaces = ' ' * (width - left.length - right.length).clamp(1, width);
    return left + spaces + right;
  }
}

class DetailedInvoiceTemplate extends InvoiceTemplate {
  @override
  String get name => 'Professional Detailed';
  @override
  TemplateType get type => TemplateType.detailed;
  @override
  LogoPlacement get logoPlacement => LogoPlacement.topCenter;
  @override
  bool get useBoldHeaders => true;
  @override
  double get columnSpacing => 8.0;

  @override
  List<PrintCommand> generateCommands(Invoice invoice, dynamic orgSettings) {
    final settings = orgSettings as AppSettings;
    const int width = 32;

    return [
      if (settings.logo != null) ImageCommand(bytes: settings.logo!),
      TextCommand(settings.organizationName, align: 'center', isBold: true),
      if (settings.address.isNotEmpty) TextCommand(settings.address, align: 'center'),
      if (settings.phone.isNotEmpty) TextCommand('Phone: ${settings.phone}', align: 'center'),
      DividerCommand(),
      TextCommand('INVOICE DETAIL', align: 'center', isBold: true),
      TextCommand('Number: ${invoice.invoiceNumber}'),
      TextCommand('Date: ${invoice.dateCreated.toString().split('.')[0]}'),
      DividerCommand(),
      ...invoice.items.map((item) {
        // Detailed shows Name on one line, then Qty/Price on another
        // OR we can try to fit them if short
        return TextCommand(_formatRow('${item.item.name} x${item.quantity}', item.total.toStringAsFixed(2), width));
      }),
      DividerCommand(),
      TextCommand(_formatRow('Subtotal', invoice.subtotal.toStringAsFixed(2), width)),
      TextCommand(_formatRow('Tax', invoice.taxAmount.toStringAsFixed(2), width)),
      if (invoice.discountAmount > 0) 
        TextCommand(_formatRow('Discount', '-${invoice.discountAmount.toStringAsFixed(2)}', width)),
      TextCommand(_formatRow('GRAND TOTAL', '${settings.currency} ${invoice.totalAmount.toStringAsFixed(2)}', width), isBold: true),
      DividerCommand(),
      TextCommand('Powered by IIPS', align: 'center'),
    ];
  }

  String _formatRow(String left, String right, int width) {
    final spacesCount = (width - left.length - right.length).clamp(1, width);
    return left + (' ' * spacesCount) + right;
  }
}
