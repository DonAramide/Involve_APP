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
      if (settings.showLogo && settings.logo != null) ImageCommand(bytes: settings.logo!),
      TextCommand(settings.organizationName.toUpperCase(), align: 'center', isBold: true),
      if (settings.businessDescription != null && settings.businessDescription!.isNotEmpty)
        TextCommand(settings.businessDescription!, align: 'center'),
      if (settings.address.isNotEmpty) TextCommand(settings.address, align: 'center'),
      if (settings.showCacNumber && settings.cacNumber != null && settings.cacNumber!.isNotEmpty)
        TextCommand('CAC: ${settings.cacNumber}', align: 'center'),
      if (settings.phone.isNotEmpty) TextCommand('Tel: ${settings.phone}', align: 'center'),
      TextCommand('Date: ${invoice.dateCreated.toString().split('.')[0]}', align: 'center'),
      TextCommand('Invoice: ${invoice.invoiceNumber}', align: 'center'),
      if (invoice.paymentMethod != null) TextCommand('Method: ${invoice.paymentMethod}', align: 'center'),
      TextCommand('Sold By: ${invoice.staffName ?? "Admin"}', align: 'center'),
      TextCommand('-' * width),
      ...invoice.items.map((item) {
        final name = item.item.name;
        final qtyLine = 'x${item.quantity}';
        final usePrint = settings.customReceiptPricingEnabled && item.printPrice != null;
        final priceLine = CurrencyFormatter.format(usePrint ? item.totalPrint : item.total);
        
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
      TextCommand('-' * width),
      if (invoice.taxAmount > 0) 
        TextCommand(_formatRow('Subtotal', CurrencyFormatter.format(invoice.subtotal), width)),
      if (invoice.taxAmount > 0) 
        TextCommand(_formatRow('Tax', CurrencyFormatter.format(invoice.taxAmount), width)),
      TextCommand(_formatRow('TOTAL', '${settings.currency} ${CurrencyFormatter.format(settings.customReceiptPricingEnabled && invoice.totalPrintAmount != null ? invoice.totalPrintAmount! : invoice.totalAmount)}', width), isBold: true),
      TextCommand('-' * width),
      if (settings.showAccountDetails && settings.bankName != null) ...[
        TextCommand('PAYMENT DETAILS', align: 'center', isBold: true),
        TextCommand('Bank: ${settings.bankName}', align: 'center'),
        if (settings.accountNumber != null) TextCommand('Acc: ${settings.accountNumber}', align: 'center'),
        if (settings.accountName != null) TextCommand('Name: ${settings.accountName}', align: 'center'),
      ],
      if (settings.showSignatureSpace) ...[
        SizedBoxCommand(height: 1),
        TextCommand('Signature: .................', align: 'center'),
      ],
      TextCommand('-' * width),
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
      if (settings.showLogo && settings.logo != null) ImageCommand(bytes: settings.logo!),
      TextCommand(settings.organizationName, align: 'center', isBold: true),
      if (settings.businessDescription != null && settings.businessDescription!.isNotEmpty)
        TextCommand(settings.businessDescription!, align: 'center'),
      if (settings.address.isNotEmpty) TextCommand(settings.address, align: 'center'),
      if (settings.showCacNumber && settings.cacNumber != null && settings.cacNumber!.isNotEmpty)
        TextCommand('CAC: ${settings.cacNumber}', align: 'center'),
      if (settings.phone.isNotEmpty) TextCommand('Phone: ${settings.phone}', align: 'center'),
      TextCommand('-' * width),
      TextCommand('INVOICE DETAIL', align: 'center', isBold: true),
      TextCommand('Number: ${invoice.invoiceNumber}'),
      TextCommand('Date: ${invoice.dateCreated.toString().split('.')[0]}'),
      if (invoice.paymentMethod != null) TextCommand('Payment Method: ${invoice.paymentMethod}'),
      TextCommand('Sold By: ${invoice.staffName ?? "Admin"}'),
      TextCommand('-' * width),
      ...invoice.items.map((item) {
        final usePrint = settings.customReceiptPricingEnabled && item.printPrice != null;
        List<PrintCommand> commands = [
          TextCommand(_formatRow('${item.item.name} x${item.quantity}', CurrencyFormatter.format(usePrint ? item.totalPrint : item.total), width))
        ];
        if (item.type == 'service' && item.serviceMeta != null) {
          final dates = _formatServiceDates(item.serviceMeta);
          if (dates.isNotEmpty) {
            commands.add(TextCommand(dates));
          }
        }
        return commands;
      }).expand((x) => x),
      TextCommand('-' * width),
      TextCommand(_formatRow('Subtotal', CurrencyFormatter.format(invoice.subtotal), width)),
      TextCommand(_formatRow('Tax', CurrencyFormatter.format(invoice.taxAmount), width)),
      if (invoice.discountAmount > 0) 
        TextCommand(_formatRow('Discount', '-${CurrencyFormatter.format(invoice.discountAmount)}', width)),
      TextCommand(_formatRow('GRAND TOTAL', '${settings.currency} ${CurrencyFormatter.format(settings.customReceiptPricingEnabled && invoice.totalPrintAmount != null ? invoice.totalPrintAmount! : invoice.totalAmount)}', width), isBold: true),
      if (settings.showAccountDetails && settings.bankName != null) ...[
        TextCommand('-' * width),
        TextCommand('ACCOUNT DETAILS', align: 'center', isBold: true),
        TextCommand('Bank: ${settings.bankName}'),
        if (settings.accountNumber != null) TextCommand('Account: ${settings.accountNumber}'),
        if (settings.accountName != null) TextCommand('Account Name: ${settings.accountName}'),
      ],
      if (settings.showSignatureSpace) ...[
        SizedBoxCommand(height: 1),
        TextCommand('Signature: .................'),
      ],
      TextCommand('-' * width),
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
      TextCommand('-' * width),
      ...invoice.items.map((item) {
        final usePrint = settings.customReceiptPricingEnabled && item.printPrice != null;
        return TextCommand('${item.item.name} x${item.quantity}  ${CurrencyFormatter.format(usePrint ? item.totalPrint : item.total)}');
      }),
      TextCommand('-' * width),
      TextCommand('TOTAL: ${settings.currency}${CurrencyFormatter.format(settings.customReceiptPricingEnabled && invoice.totalPrintAmount != null ? invoice.totalPrintAmount! : invoice.totalAmount)}', align: 'right', isBold: true),
      if (settings.showAccountDetails && settings.bankName != null) ...[
        TextCommand('-' * width),
        TextCommand('PAYMENT: ${settings.bankName}', align: 'center'),
        if (settings.accountNumber != null) TextCommand('Acc: ${settings.accountNumber}', align: 'center'),
      ],
      if (settings.showSignatureSpace) ...[
        SizedBoxCommand(height: 1),
        TextCommand('Sign: .................', align: 'right'),
      ],
      TextCommand('-' * width),
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
      if (settings.showLogo && settings.logo != null) ImageCommand(bytes: settings.logo!),
      TextCommand(settings.organizationName.toUpperCase(), align: 'center', isBold: true),
      if (settings.address.isNotEmpty) TextCommand(settings.address, align: 'center'),
      if (settings.showCacNumber && settings.cacNumber != null && settings.cacNumber!.isNotEmpty)
        TextCommand('CAC: ${settings.cacNumber}', align: 'center'),
      TextCommand('Tel: ${settings.phone}', align: 'center'),
      TextCommand('-' * width),
      TextCommand('BILL TO:', isBold: true),
      TextCommand(invoice.customerName ?? 'Cash Customer'),
      if (invoice.customerAddress != null) TextCommand(invoice.customerAddress!),
      SizedBoxCommand(height: 1),
      TextCommand('INVOICE #: ${invoice.invoiceNumber}', align: 'right'),
      TextCommand('DATE: ${invoice.dateCreated.toString().split(' ')[0]}', align: 'right'),
      TextCommand('Sold By: ${invoice.staffName ?? "Admin"}', align: 'right'),
      TextCommand('-' * width),
      // Dynamic Table Header
      TextCommand(_buildTableHeader(width), isBold: true),
      TextCommand('-' * width),
      ...invoice.items.map((item) {
        final row = _buildTableRow(item, width, settings.customReceiptPricingEnabled);
        List<PrintCommand> commands = [TextCommand(row)];
        if (item.type == 'service' && item.serviceMeta != null) {
          final dates = _formatServiceDates(item.serviceMeta);
          if (dates.isNotEmpty) {
            commands.add(TextCommand(dates));
          }
        }
        return commands;
      }).expand((x) => x),
      TextCommand('-' * width),
      TextCommand(_formatSummaryRow('SUBTOTAL:', CurrencyFormatter.format(invoice.subtotal), width)),
      if (invoice.taxAmount > 0)
        TextCommand(_formatSummaryRow('TAX (${(settings.taxRate * 100).toStringAsFixed(0)}%):', CurrencyFormatter.format(invoice.taxAmount), width)),
      if (invoice.discountAmount > 0)
        TextCommand(_formatSummaryRow('DISCOUNT:', '-${CurrencyFormatter.format(invoice.discountAmount)}', width)),
      TextCommand('-' * width),
      TextCommand(_formatSummaryRow('TOTAL:', '${settings.currency} ${CurrencyFormatter.format(settings.customReceiptPricingEnabled && invoice.totalPrintAmount != null ? invoice.totalPrintAmount! : invoice.totalAmount)}', width), isBold: true),
      if (settings.showAccountDetails && settings.bankName != null) ...[
        TextCommand('-' * width),
        TextCommand('PAYMENT METHODS:', isBold: true),
        TextCommand('Bank: ${settings.bankName}'),
        if (settings.accountNumber != null) TextCommand('Acc: ${settings.accountNumber}'),
      ],
      if (settings.showSignatureSpace) ...[
        SizedBoxCommand(height: 2),
        TextCommand('-' * (width ~/ 2), align: 'right'),
        TextCommand('Signature', align: 'right'),
      ],
      TextCommand('-' * width),
      TextCommand(settings.receiptFooter, align: 'center'),
      TextCommand('Powered by IIPS', align: 'center'),
    ];
  }

  String _buildTableHeader(int width) {
    if (width <= 32) {
      // 9 + 8 + 4 + 11 = 32
      return 'ITEM     PRICE   QTY      TOTAL';
    } else if (width <= 42) {
      // 16 + 9 + 4 + 13 = 42 (Shifted Price +2, adjusted Total -2 to fit)
      return 'ITEM            PRICE    QTY        TOTAL';
    } else {
      // 22 + 12 + 6 + 12 = 52 (Preserving user's manual alignment)
      return 'ITEM                 PRICE       QTY          TOTAL';
    }
  }

  String _buildTableRow(InvoiceItem item, int width, bool customPricingEnabled) {
    final usePrint = customPricingEnabled && item.printPrice != null;
    final unitPrice = usePrint ? item.printPrice! : item.unitPrice;
    final total = usePrint ? item.totalPrint : item.total;

    if (width <= 32) {
      final name = item.item.name.padRight(9).substring(0, 9);
      final price = CurrencyFormatter.format(unitPrice).padLeft(8).substring(0, 8);
      final qty = item.quantity.toString().padLeft(4).substring(0, 4);
      final totalStr = CurrencyFormatter.format(total).padLeft(11).substring(0, 11);
      return '$name$price$qty$totalStr';
    } else if (width <= 42) {
      // 16 + 9 + 4 + 13 = 42
      final name = item.item.name.padRight(16).substring(0, 16);
      final price = CurrencyFormatter.format(unitPrice).padLeft(9).substring(0, 9);
      final qty = item.quantity.toString().padLeft(4).substring(0, 4);
      final totalStr = CurrencyFormatter.format(total).padLeft(13).substring(0, 13);
      return '$name$price$qty$totalStr';
    } else {
      // 22 + 12 + 6 + 12 = 52
      final name = item.item.name.padRight(22).substring(0, 22);
      final price = CurrencyFormatter.format(unitPrice).padLeft(12).substring(0, 12);
      final qty = item.quantity.toString().padLeft(6).substring(0, 6);
      final totalStr = CurrencyFormatter.format(total).padLeft(12).substring(0, 12);
      return '$name$price$qty$totalStr';
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
      TextCommand('-' * width),
      TextCommand('TO: ${invoice.customerName ?? "Client"}'),
      TextCommand('DATE: ${invoice.dateCreated.toString().split(' ')[0]}'),
      TextCommand('-' * width),
      // 3-Column: QTY(5), ITEM(15), TOTAL(12) = 32
      TextCommand('QTY   ITEM           TOTAL', isBold: true),
      TextCommand('-' * width),
      ...invoice.items.map((item) {
        final usePrint = settings.customReceiptPricingEnabled && item.printPrice != null;
        final qty = item.quantity.toString().padRight(5).substring(0, 5);
        final name = item.item.name.padRight(15).substring(0, 15);
        final total = CurrencyFormatter.format(usePrint ? item.totalPrint : item.total).padLeft(12).substring(0, 12);
        
        List<PrintCommand> commands = [TextCommand('$qty$name$total')];
        if (item.type == 'service' && item.serviceMeta != null) {
          final dates = _formatServiceDates(item.serviceMeta);
          if (dates.isNotEmpty) {
            commands.add(TextCommand(dates));
          }
        }
        return commands;
      }).expand((x) => x),
      TextCommand('-' * width),
      TextCommand(_formatRow('SUBTOTAL', CurrencyFormatter.format(invoice.subtotal), width)),
      if (invoice.taxAmount > 0)
        TextCommand(_formatRow('SALES TAX', CurrencyFormatter.format(invoice.taxAmount), width)),
      if (invoice.discountAmount > 0)
        TextCommand(_formatRow('DISCOUNT', '-${CurrencyFormatter.format(invoice.discountAmount)}', width)),
      TextCommand('-' * width),
      SizedBoxCommand(height: 1),
      TextCommand(_formatRow('TOTAL', '${settings.currency} ${CurrencyFormatter.format(settings.customReceiptPricingEnabled && invoice.totalPrintAmount != null ? invoice.totalPrintAmount! : invoice.totalAmount)}', width), isBold: true),
      SizedBoxCommand(height: 2),
      TextCommand('THANK YOU FOR YOUR BUSINESS', align: 'center', isBold: true),
      TextCommand('-' * width),
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
    final int width = settings.paperWidth == 58 ? 32 : (settings.paperWidth == 88 ? 52 : 42);

    return [
      TextCommand('INVOICE', align: 'center', isBold: true),
      if (settings.logo != null) ImageCommand(bytes: settings.logo!, align: 'right'),
      TextCommand(settings.organizationName.toUpperCase(), isBold: true),
      if (settings.businessDescription != null) TextCommand(settings.businessDescription!, align: 'left'),
      if (settings.address.isNotEmpty) TextCommand(settings.address),
      if (settings.showCacNumber && settings.cacNumber != null && settings.cacNumber!.isNotEmpty)
        TextCommand('CAC: ${settings.cacNumber}'),
      TextCommand('-' * width),
      TextCommand('BILL TO:', isBold: true),
      TextCommand(invoice.customerName ?? 'Valued Customer'),
      if (invoice.customerAddress != null) TextCommand(invoice.customerAddress!),
      if (invoice.staffName != null) TextCommand('SOLD BY: ${invoice.staffName!.toUpperCase()}'),
      TextCommand('-' * width),
      TextCommand('INV NO: ${invoice.invoiceNumber}'),
      TextCommand('DATE:   ${invoice.dateCreated.toString().split(' ')[0]}'),
      TextCommand('-' * width),
      // Dynamic Table Header
      TextCommand(_buildTableHeader(width), isBold: true),
      TextCommand('-' * width),
      ...invoice.items.map((item) => TextCommand(_buildTableRow(item, width, settings.customReceiptPricingEnabled))),
      TextCommand('-' * width),
      TextCommand(_formatRow('SUBTOTAL:', CurrencyFormatter.format(invoice.subtotal), width)),
      if (invoice.taxAmount > 0)
        TextCommand(_formatRow('TAX', CurrencyFormatter.format(invoice.taxAmount), width)),
      if (invoice.discountAmount > 0)
        TextCommand(_formatRow('DISCOUNT', '-${CurrencyFormatter.format(invoice.discountAmount)}', width)),
      TextCommand(_formatRow('TOTAL:', '${settings.currency} ${CurrencyFormatter.format(settings.customReceiptPricingEnabled && invoice.totalPrintAmount != null ? invoice.totalPrintAmount! : invoice.totalAmount)}', width), isBold: true),
      TextCommand('-' * width),
      TextCommand('THANK YOU FOR YOUR BUSINESS!', align: 'center'),
      TextCommand('Powered by IIPS', align: 'center'),
    ];
  }

  String _buildTableHeader(int width) {
    if (width <= 32) {
      // QTY(3), ITEM(10), PRICE(8), TOTAL(11) = 32
      return 'QTY ITEM      PRICE      TOTAL';
    } else if (width <= 42) {
      // QTY(5), ITEM(14), PRICE(10), TOTAL(13) = 42
      return 'QTY   ITEM          PRICE       TOTAL';
    } else {
      // QTY(6), ITEM(20), PRICE(12), TOTAL(14) = 52
      return 'QTY    ITEM                PRICE       TOTAL';
    }
  }

  String _buildTableRow(InvoiceItem item, int width, bool customPricingEnabled) {
    final usePrint = customPricingEnabled && item.printPrice != null;
    final unitPrice = usePrint ? item.printPrice! : item.unitPrice;
    final total = usePrint ? item.totalPrint : item.total;

    if (width <= 32) {
      final qty = item.quantity.toString().padRight(3).substring(0, 3);
      final name = item.item.name.padRight(10).substring(0, 10);
      final priceStr = CurrencyFormatter.format(unitPrice).padLeft(8).substring(0, 8);
      final totalStr = CurrencyFormatter.format(total).padLeft(11).substring(0, 11);
      return '$qty$name$priceStr$totalStr';
    } else if (width <= 42) {
      final qty = item.quantity.toString().padRight(5).substring(0, 5);
      final name = item.item.name.padRight(14).substring(0, 14);
      final priceStr = CurrencyFormatter.format(unitPrice).padLeft(10).substring(0, 10);
      final totalStr = CurrencyFormatter.format(total).padLeft(13).substring(0, 13);
      return '$qty$name$priceStr$totalStr';
    } else {
      final qty = item.quantity.toString().padRight(6).substring(0, 6);
      final name = item.item.name.padRight(20).substring(0, 20);
      final priceStr = CurrencyFormatter.format(unitPrice).padLeft(12).substring(0, 12);
      final totalStr = CurrencyFormatter.format(total).padLeft(14).substring(0, 14);
      return '$qty$name$priceStr$totalStr';
    }
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
