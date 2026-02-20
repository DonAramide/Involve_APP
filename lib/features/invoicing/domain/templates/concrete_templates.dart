import 'invoice_template.dart';
import '../entities/invoice.dart';
import '../../../settings/domain/entities/settings.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'dart:convert';
import 'package:intl/intl.dart';

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
    final int width = settings.paperWidth == 58 ? 32 : (settings.paperWidth == 88 ? 52 : 42); // Logic for 58, 80, 88

    return [
      if (settings.logo != null) ImageCommand(bytes: settings.logo!),
      TextCommand(settings.organizationName.toUpperCase(), align: 'center', isBold: true),
      if (settings.businessDescription != null && settings.businessDescription!.isNotEmpty)
        TextCommand(settings.businessDescription!, align: 'center'),
      if (settings.address.isNotEmpty) TextCommand(settings.address, align: 'center'),
      if (settings.phone.isNotEmpty) TextCommand('Tel: ${settings.phone}', align: 'center'),
      TextCommand('Date: ${invoice.dateCreated.toString().split('.')[0]}', align: 'center'),
      TextCommand('Invoice: ${invoice.invoiceNumber}', align: 'center'),
      if (invoice.paymentMethod != null) TextCommand('Method: ${invoice.paymentMethod}', align: 'center'),
      TextCommand('Sold By: ${invoice.staffName ?? "Admin"}', align: 'center'),
      DividerCommand(),
      ...invoice.items.map((item) {
        final name = item.item.name;
        final qtyLine = 'x${item.quantity}';
        final priceLine = CurrencyFormatter.format(item.total);
        
        // Format: Name xQty ........ Price
        final leftPart = '$name $qtyLine';
        final availableWidth = width - priceLine.length - 1;
        final truncatedLeft = leftPart.length > availableWidth 
            ? leftPart.substring(0, availableWidth - 1) 
            : leftPart;
            
        final spaces = ' ' * (width - truncatedLeft.length - priceLine.length).clamp(1, width);
        
        List<PrintCommand> commands = [TextCommand(truncatedLeft + spaces + priceLine)];
        
        if (item.type == 'service' && item.serviceMeta != null) {
           final dates = _formatServiceDates(item.serviceMeta);
           if (dates.isNotEmpty) {
             commands.add(TextCommand(dates, align: 'left'));
           }
        }
        return commands;
      }).expand((x) => x),
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
    final int width = settings.paperWidth == 58 ? 32 : (settings.paperWidth == 88 ? 52 : 42);

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
      if (invoice.paymentMethod != null) TextCommand('Payment Method: ${invoice.paymentMethod}'),
      TextCommand('Sold By: ${invoice.staffName ?? "Admin"}'),
      DividerCommand(),
      ...invoice.items.map((item) {
        List<PrintCommand> commands = [
          TextCommand(_formatRow('${item.item.name} x${item.quantity}', CurrencyFormatter.format(item.total), width))
        ];
        if (item.type == 'service' && item.serviceMeta != null) {
          final dates = _formatServiceDates(item.serviceMeta);
          if (dates.isNotEmpty) {
            commands.add(TextCommand(dates));
          }
        }
        return commands;
      }).expand((x) => x),
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
    final spacesCount = (width - left.length - right.length).clamp(2, width);
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
    final int width = settings.paperWidth == 58 ? 32 : (settings.paperWidth == 88 ? 52 : 42);

    return [
      TextCommand(settings.organizationName.toUpperCase(), align: 'center', isBold: true),
      TextCommand('Date: ${invoice.dateCreated.toString().split(' ')[0]}', align: 'center'),
      TextCommand('Sold By: ${invoice.staffName ?? "Admin"}', align: 'center'),
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

class ProfessionalInvoiceTemplate extends InvoiceTemplate {
  @override
  String get name => 'Professional (Green)';
  @override
  TemplateType get type => TemplateType.professional;
  @override
  LogoPlacement get logoPlacement => LogoPlacement.topCenter;
  @override
  bool get useBoldHeaders => true;
  @override
  double get columnSpacing => 1.0;

  @override
  List<PrintCommand> generateCommands(Invoice invoice, dynamic orgSettings) {
    final settings = orgSettings as AppSettings;
    final int width = settings.paperWidth == 58 ? 32 : (settings.paperWidth == 88 ? 52 : 42);

    return [
      if (settings.logo != null) ImageCommand(bytes: settings.logo!),
      TextCommand(settings.organizationName.toUpperCase(), align: 'center', isBold: true),
      if (settings.address.isNotEmpty) TextCommand(settings.address, align: 'center'),
      if (settings.phone.isNotEmpty) TextCommand('Tel: ${settings.phone}', align: 'center'),
      DividerCommand(),
      TextCommand('BILL TO:', isBold: true),
      TextCommand(invoice.customerName ?? 'Cash Customer'),
      if (invoice.customerAddress != null) TextCommand(invoice.customerAddress!),
      SizedBoxCommand(height: 1),
      TextCommand('INVOICE #: ${invoice.invoiceNumber}', align: 'right'),
      TextCommand('DATE: ${invoice.dateCreated.toString().split(' ')[0]}', align: 'right'),
      TextCommand('Sold By: ${invoice.staffName ?? "Admin"}', align: 'right'),
      DividerCommand(),
      // Dynamic Table Header
      TextCommand(_buildTableHeader(width), isBold: true),
      DividerCommand(),
      ...invoice.items.map((item) {
        final row = _buildTableRow(item, width);
        List<PrintCommand> commands = [TextCommand(row)];
        if (item.type == 'service' && item.serviceMeta != null) {
          final dates = _formatServiceDates(item.serviceMeta);
          if (dates.isNotEmpty) {
            commands.add(TextCommand(dates));
          }
        }
        return commands;
      }).expand((x) => x),
      DividerCommand(),
      TextCommand(_formatSummaryRow('SUBTOTAL:', CurrencyFormatter.format(invoice.subtotal), width)),
      if (invoice.taxAmount > 0)
        TextCommand(_formatSummaryRow('TAX (${(settings.taxRate * 100).toStringAsFixed(0)}%):', CurrencyFormatter.format(invoice.taxAmount), width)),
      if (invoice.discountAmount > 0)
        TextCommand(_formatSummaryRow('DISCOUNT:', '-${CurrencyFormatter.format(invoice.discountAmount)}', width)),
      DividerCommand(),
      TextCommand(_formatSummaryRow('TOTAL:', '${settings.currency} ${CurrencyFormatter.format(invoice.totalAmount)}', width), isBold: true),
      if (settings.showAccountDetails && settings.bankName != null) ...[
        DividerCommand(),
        TextCommand('PAYMENT METHODS:', isBold: true),
        TextCommand('Bank: ${settings.bankName}'),
        if (settings.accountNumber != null) TextCommand('Acc: ${settings.accountNumber}'),
      ],
      if (settings.showSignatureSpace) ...[
        SizedBoxCommand(height: 2),
        TextCommand('--------------------------', align: 'right'),
        TextCommand('Signature', align: 'right'),
      ],
      DividerCommand(),
      TextCommand(settings.receiptFooter, align: 'center'),
      TextCommand('Powered by IIPS', align: 'center'),
    ];
  }

  String _buildTableHeader(int width) {
    if (width <= 32) return 'ITEM      PRICE  QTY    TOTAL';
    if (width <= 42) return 'ITEM            PRICE    QTY     TOTAL';
    return 'ITEM                    PRICE      QTY        TOTAL';
  }

  String _buildTableRow(InvoiceItem item, int width) {
    if (width <= 32) {
      final name = item.item.name.padRight(10).substring(0, 10);
      final price = CurrencyFormatter.format(item.unitPrice).padLeft(7).substring(0, 7);
      final qty = item.quantity.toString().padLeft(5).substring(0, 5);
      final total = CurrencyFormatter.format(item.total).padLeft(10).substring(0, 10);
      return '$name$price$qty$total';
    } else if (width <= 42) {
       final name = item.item.name.padRight(16).substring(0, 16);
       final price = CurrencyFormatter.format(item.unitPrice).padLeft(9).substring(0, 9);
       final qty = item.quantity.toString().padLeft(7).substring(0, 7);
       final total = CurrencyFormatter.format(item.total).padLeft(10).substring(0, 10);
       return '$name$price$qty$total';
    } else {
       final name = item.item.name.padRight(24).substring(0, 24);
       final price = CurrencyFormatter.format(item.unitPrice).padLeft(11).substring(0, 11);
       final qty = item.quantity.toString().padLeft(7).substring(0, 7);
       final total = CurrencyFormatter.format(item.total).padLeft(10).substring(0, 10);
       return '$name$price$qty$total';
    }
  }

  String _formatSummaryRow(String label, String value, int width) {
    if (label.length + value.length >= width) return '$label $value';
    final spaces = ' ' * (width - label.length - value.length);
    return label + spaces + value;
  }
}

class ModernProfessionalTemplate extends InvoiceTemplate {
  @override
  String get name => 'Modern Pro (Shadow)';
  @override
  TemplateType get type => TemplateType.modern; 
  @override
  LogoPlacement get logoPlacement => LogoPlacement.topCenter;
  @override
  bool get useBoldHeaders => true;
  @override
  double get columnSpacing => 1.0;

  @override
  List<PrintCommand> generateCommands(Invoice invoice, dynamic orgSettings) {
    final settings = orgSettings as AppSettings;
    const int width = 32;

    return [
      TextCommand('INVOICE', align: 'center', isBold: true),
      SizedBoxCommand(height: 1),
      TextCommand(settings.organizationName.toUpperCase(), isBold: true),
      if (settings.businessDescription != null) TextCommand(settings.businessDescription!),
      DividerCommand(),
      TextCommand('TO: ${invoice.customerName ?? "Client"}'),
      TextCommand('DATE: ${invoice.dateCreated.toString().split(' ')[0]}'),
      DividerCommand(),
      // 3-Column: QTY(5), ITEM(15), TOTAL(12) = 32
      TextCommand('QTY   ITEM           TOTAL', isBold: true),
      DividerCommand(),
      ...invoice.items.map((item) {
        final qty = item.quantity.toString().padRight(5).substring(0, 5);
        final name = item.item.name.padRight(15).substring(0, 15);
        final total = CurrencyFormatter.format(item.total).padLeft(12).substring(0, 12);
        
        List<PrintCommand> commands = [TextCommand('$qty$name$total')];
        if (item.type == 'service' && item.serviceMeta != null) {
          final dates = _formatServiceDates(item.serviceMeta);
          if (dates.isNotEmpty) {
            commands.add(TextCommand(dates));
          }
        }
        return commands;
      }).expand((x) => x),
      DividerCommand(),
      TextCommand(_formatRow('SUBTOTAL', CurrencyFormatter.format(invoice.subtotal), width)),
      if (invoice.taxAmount > 0)
        TextCommand(_formatRow('SALES TAX', CurrencyFormatter.format(invoice.taxAmount), width)),
      if (invoice.discountAmount > 0)
        TextCommand(_formatRow('DISCOUNT', '-${CurrencyFormatter.format(invoice.discountAmount)}', width)),
      SizedBoxCommand(height: 1),
      TextCommand(_formatRow('TOTAL', '${settings.currency} ${CurrencyFormatter.format(invoice.totalAmount)}', width), isBold: true),
      SizedBoxCommand(height: 2),
      TextCommand('THANK YOU FOR YOUR BUSINESS', align: 'center', isBold: true),
      DividerCommand(),
      TextCommand('Powered by IIPS', align: 'center'),
    ];
  }

  String _formatRow(String left, String right, int width) {
    final spaces = ' ' * (width - left.length - right.length).clamp(1, width);
    return left + spaces + right;
  }
}

class ClassicBusinessTemplate extends InvoiceTemplate {
  @override
  String get name => 'Classic Business (A4/Detailed)';
  @override
  TemplateType get type => TemplateType.classic;
  @override
  LogoPlacement get logoPlacement => LogoPlacement.topRight;
  @override
  bool get useBoldHeaders => true;
  @override
  double get columnSpacing => 1.0;

  @override
  List<PrintCommand> generateCommands(Invoice invoice, dynamic orgSettings) {
    final settings = orgSettings as AppSettings;
    const int width = 32;

    return [
      TextCommand('INVOICE', align: 'center', isBold: true),
      if (settings.logo != null) ImageCommand(bytes: settings.logo!, align: 'right'),
      TextCommand(settings.organizationName.toUpperCase(), isBold: true),
      if (settings.businessDescription != null) TextCommand(settings.businessDescription!, align: 'left'),
      if (settings.address.isNotEmpty) TextCommand(settings.address),
      DividerCommand(),
      TextCommand('BILL TO:', isBold: true),
      TextCommand(invoice.customerName ?? 'Valued Customer'),
      if (invoice.customerAddress != null) TextCommand(invoice.customerAddress!),
      SizedBoxCommand(height: 1),
      TextCommand('INV NO: ${invoice.invoiceNumber}'),
      TextCommand('DATE:   ${invoice.dateCreated.toString().split(' ')[0]}'),
      DividerCommand(),
      // 4-column: QTY(4), ITEM(12), PRICE(7), TOTAL(9) = 32
      TextCommand('QTY ITEM        PRICE   TOTAL', isBold: true),
      DividerCommand(),
      ...invoice.items.map((item) {
        final qty = item.quantity.toString().padRight(4).substring(0, 4);
        final name = item.item.name.padRight(12).substring(0, 12);
        final price = CurrencyFormatter.format(item.unitPrice).padLeft(7).substring(0, 7);
        final total = CurrencyFormatter.format(item.total).padLeft(9).substring(0, 9);
        return TextCommand('$qty$name$price$total');
      }),
      DividerCommand(),
      TextCommand(_formatRow('SUBTOTAL', CurrencyFormatter.format(invoice.subtotal), width)),
      if (invoice.taxAmount > 0)
        TextCommand(_formatRow('TAX', CurrencyFormatter.format(invoice.taxAmount), width)),
      if (invoice.discountAmount > 0)
        TextCommand(_formatRow('DISCOUNT', '-${CurrencyFormatter.format(invoice.discountAmount)}', width)),
      TextCommand(_formatRow('TOTAL DUE', '${settings.currency} ${CurrencyFormatter.format(invoice.totalAmount)}', width), isBold: true),
      DividerCommand(),
      TextCommand('THANK YOU FOR YOUR BUSINESS!', align: 'center'),
      TextCommand('Powered by IIPS', align: 'center'),
    ];
  }

  String _formatRow(String left, String right, int width) {
    final spaces = ' ' * (width - left.length - right.length).clamp(1, width);
    return left + spaces + right;
  }
}

String _formatServiceDates(String? metaStr) {
  if (metaStr == null) return '';
  try {
    final meta = jsonDecode(metaStr);
    final start = DateTime.parse(meta['startDate']);
    final end = DateTime.parse(meta['endDate']);
    final fmt = DateFormat('MM/dd HH:mm');
    return '${fmt.format(start)} - ${fmt.format(end)}';
  } catch (e) {
    return '';
  }
}
