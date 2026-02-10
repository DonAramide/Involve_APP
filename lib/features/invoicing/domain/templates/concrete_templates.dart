import 'invoice_template.dart';
import '../entities/invoice.dart';
import '../../../settings/domain/entities/settings.dart';

class CompactInvoiceTemplate extends InvoiceTemplate {
  @override
  String get name => 'Compact POS';
  @override
  TemplateType get type => TemplateType.compact;
  @override
  LogoPlacement get logoPlacement => LogoPlacement.none;
  @override
  bool get useBoldHeaders => true;
  @override
  double get columnSpacing => 2.0;

  @override
  List<PrintCommand> generateCommands(Invoice invoice, dynamic orgSettings) {
    final settings = orgSettings as AppSettings;
    return [
      TextCommand(settings.organizationName.toUpperCase(), align: 'center', isBold: true),
      TextCommand('Invoice: ${invoice.invoiceNumber}', align: 'center'),
      DividerCommand(),
      ...invoice.items.map((item) => TextCommand(
            '${item.quantity}x ${item.item.name} @ ${item.unitPrice} : ${item.total}',
          )),
      DividerCommand(),
      TextCommand('TOTAL: ${settings.currency} ${invoice.totalAmount}', align: 'right', isBold: true),
    ];
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
    return [
      ImageCommand('logo.png'), // Placeholder
      TextCommand(settings.organizationName, align: 'center', isBold: true),
      TextCommand(settings.address, align: 'center'),
      TextCommand('Phone: ${settings.phone}', align: 'center'),
      DividerCommand(),
      TextCommand('INVOICE DETAIL', align: 'left', isBold: true),
      TextCommand('Number: ${invoice.invoiceNumber}'),
      TextCommand('Date: ${invoice.dateCreated.toIso8601String().split('T')[0]}'),
      DividerCommand(),
      ...invoice.items.map((item) => TextCommand(
            '${item.item.name.padRight(20)} ${item.quantity} x ${item.unitPrice.toString().padLeft(8)}',
          )),
      DividerCommand(),
      TextCommand('Subtotal: ${settings.currency} ${invoice.subtotal}', align: 'right'),
      TextCommand('Tax: ${settings.currency} ${invoice.taxAmount}', align: 'right'),
      TextCommand('Discount: ${settings.currency} ${invoice.discountAmount}', align: 'right'),
      TextCommand('GRAND TOTAL: ${settings.currency} ${invoice.totalAmount}', align: 'right', isBold: true),
    ];
  }
}
