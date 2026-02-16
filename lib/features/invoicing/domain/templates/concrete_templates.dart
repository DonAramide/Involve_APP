import 'invoice_template.dart';
import '../entities/invoice.dart';
import '../../../settings/domain/entities/settings.dart';
import 'package:invify/core/utils/currency_formatter.dart';

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
      if (settings.businessDescription != null && settings.businessDescription!.isNotEmpty)
        TextCommand(settings.businessDescription!, align: 'center'),
      if (settings.address.isNotEmpty) TextCommand(settings.address, align: 'center'),
      if (settings.phone.isNotEmpty) TextCommand('Tel: ${settings.phone}', align: 'center'),
      TextCommand('Date: ${invoice.dateCreated.toString().split('.')[0]}', align: 'center'),
      TextCommand('Invoice: ${invoice.invoiceNumber}', align: 'center'),
      DividerCommand(),
      ...invoice.items.map((item) {
        final name = item.item.name;
        final qtyLine = 'x${item.quantity}';
        final priceLine = CurrencyFormatter.format(item.total);
        
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
        TextCommand(_formatRow('Subtotal', CurrencyFormatter.format(invoice.subtotal), width)),
      if (invoice.taxAmount > 0) 
        TextCommand(_formatRow('Tax', CurrencyFormatter.format(invoice.taxAmount), width)),
      TextCommand(_formatRow('TOTAL', '${settings.currency} ${CurrencyFormatter.format(invoice.totalAmount)}', width), isBold: true),
      if (settings.showAccountDetails && settings.bankName != null) ...[
        DividerCommand(),
        TextCommand('PAYMENT DETAILS', align: 'center', isBold: true),
        TextCommand('Bank: ${settings.bankName}', align: 'center'),
        if (settings.accountNumber != null) TextCommand('Acc: ${settings.accountNumber}', align: 'center'),
        if (settings.accountName != null) TextCommand('Name: ${settings.accountName}', align: 'center'),
      ],
      if (settings.showSignatureSpace) ...[
        SizedBoxCommand(height: 1),
        TextCommand('Signature: .................', align: 'center'),
      ],
      DividerCommand(),
      TextCommand(settings.receiptFooter, align: 'center'),
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
      if (settings.businessDescription != null && settings.businessDescription!.isNotEmpty)
        TextCommand(settings.businessDescription!, align: 'center'),
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
        return TextCommand(_formatRow('${item.item.name} x${item.quantity}', CurrencyFormatter.format(item.total), width));
      }),
      DividerCommand(),
      TextCommand(_formatRow('Subtotal', CurrencyFormatter.format(invoice.subtotal), width)),
      TextCommand(_formatRow('Tax', CurrencyFormatter.format(invoice.taxAmount), width)),
      if (invoice.discountAmount > 0) 
        TextCommand(_formatRow('Discount', '-${CurrencyFormatter.format(invoice.discountAmount)}', width)),
      TextCommand(_formatRow('GRAND TOTAL', '${settings.currency} ${CurrencyFormatter.format(invoice.totalAmount)}', width), isBold: true),
      if (settings.showAccountDetails && settings.bankName != null) ...[
        DividerCommand(),
        TextCommand('ACCOUNT DETAILS', align: 'center', isBold: true),
        TextCommand('Bank: ${settings.bankName}'),
        if (settings.accountNumber != null) TextCommand('Account: ${settings.accountNumber}'),
        if (settings.accountName != null) TextCommand('Account Name: ${settings.accountName}'),
      ],
      if (settings.showSignatureSpace) ...[
        SizedBoxCommand(height: 1),
        TextCommand('Signature: .................'),
      ],
      DividerCommand(),
      TextCommand(settings.receiptFooter, align: 'center'),
      TextCommand('Powered by IIPS', align: 'center'),
    ];
  }

  String _formatRow(String left, String right, int width) {
    final spacesCount = (width - left.length - right.length).clamp(1, width);
    return left + (' ' * spacesCount) + right;
  }
}

class MinimalistInvoiceTemplate extends InvoiceTemplate {
  @override
  String get name => 'Minimalist';
  @override
  TemplateType get type => TemplateType.compact;
  @override
  LogoPlacement get logoPlacement => LogoPlacement.none;
  @override
  bool get useBoldHeaders => false;
  @override
  double get columnSpacing => 1.0;

  @override
  List<PrintCommand> generateCommands(Invoice invoice, dynamic orgSettings) {
    final settings = orgSettings as AppSettings;
    const int width = 32;

    return [
      TextCommand(settings.organizationName.toUpperCase(), align: 'center', isBold: true),
      TextCommand('Date: ${invoice.dateCreated.toString().split(' ')[0]}', align: 'center'),
      DividerCommand(),
      ...invoice.items.map((item) => 
        TextCommand('${item.item.name} x${item.quantity}  ${CurrencyFormatter.format(item.total)}')),
      DividerCommand(),
      TextCommand('TOTAL: ${settings.currency}${CurrencyFormatter.format(invoice.totalAmount)}', align: 'right', isBold: true),
      if (settings.showAccountDetails && settings.bankName != null) ...[
        DividerCommand(),
        TextCommand('PAYMENT: ${settings.bankName}', align: 'center'),
        if (settings.accountNumber != null) TextCommand('Acc: ${settings.accountNumber}', align: 'center'),
      ],
      if (settings.showSignatureSpace) ...[
        SizedBoxCommand(height: 1),
        TextCommand('Sign: .................', align: 'center'),
      ],
      DividerCommand(),
      TextCommand(settings.receiptFooter, align: 'center'),
    ];
  }
}
