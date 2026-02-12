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
      if (settings.address.isNotEmpty) TextCommand(settings.address, align: 'center'),
      if (settings.phone.isNotEmpty) TextCommand('Tel: ${settings.phone}', align: 'center'),
      TextCommand('Date: ${invoice.dateCreated.toString().split('.')[0]}', align: 'center'),
      TextCommand('Invoice: ${invoice.invoiceNumber}', align: 'center'),
      DividerCommand(),
      ...invoice.items.map((item) => TextCommand(
            '${item.item.name} x${item.quantity}',
          )),
      ...invoice.items.map((item) => TextCommand(
            '   Price: ${item.unitPrice} Total: ${item.total}',
            align: 'right',
          )),
      DividerCommand(),
      if (invoice.taxAmount > 0) TextCommand('Subtotal: ${settings.currency} ${invoice.subtotal.toStringAsFixed(2)}', align: 'right'),
      if (invoice.taxAmount > 0) TextCommand('Tax: ${settings.currency} ${invoice.taxAmount.toStringAsFixed(2)}', align: 'right'),
      TextCommand('TOTAL: ${settings.currency} ${invoice.totalAmount.toStringAsFixed(2)}', align: 'right', isBold: true),
      DividerCommand(),
      TextCommand('Thank you!', align: 'center'),
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
      if (settings.logo != null) ImageCommand(bytes: settings.logo!),
      TextCommand(settings.organizationName, align: 'center', isBold: true),
      if (settings.address.isNotEmpty) TextCommand(settings.address, align: 'center'),
      if (settings.phone.isNotEmpty) TextCommand('Phone: ${settings.phone}', align: 'center'),
      DividerCommand(),
      TextCommand('INVOICE DETAIL', align: 'center', isBold: true),
      TextCommand('Number: ${invoice.invoiceNumber}'),
      TextCommand('Date: ${invoice.dateCreated.toString().split('.')[0]}'),
      DividerCommand(),
      ...invoice.items.map((item) => TextCommand(
            '${item.item.name}',
            isBold: true,
          )),
      ...invoice.items.map((item) => TextCommand(
            '${item.quantity} x ${item.unitPrice} = ${item.total}',
            align: 'right',
          )),
      DividerCommand(),
      TextCommand('Subtotal: ${settings.currency} ${invoice.subtotal.toStringAsFixed(2)}', align: 'right'),
      TextCommand('Tax: ${settings.currency} ${invoice.taxAmount.toStringAsFixed(2)}', align: 'right'),
      if (invoice.discountAmount > 0) TextCommand('Discount: ${settings.currency} ${invoice.discountAmount.toStringAsFixed(2)}', align: 'right'),
      TextCommand('GRAND TOTAL: ${settings.currency} ${invoice.totalAmount.toStringAsFixed(2)}', align: 'right', isBold: true),
      DividerCommand(),
      TextCommand('Powered by Involve APP', align: 'center'),
    ];
  }
}
