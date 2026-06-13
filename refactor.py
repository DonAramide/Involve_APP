import re

file_path = r'C:\dev\Involve_APP\lib\features\invoicing\presentation\widgets\invoice_preview_dialog.dart'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add MposTransactionData? posTx to _printInvoice
content = content.replace(
'''  void _printInvoice(BuildContext context, Invoice invoice, AppSettings settings) {''',
'''  void _printInvoice(BuildContext context, Invoice invoice, AppSettings settings, {MposTransactionData? posTx}) {'''
)

# 2. Add posTx param when called
content = content.replace('_printInvoice(context, invoice, settings!);', '_printInvoice(context, invoice, settings!, posTx: posTransactionData);')

# 3. Add posTransactionData before it is used
content = content.replace(
'''                          if (result.status == 'payment_success' || result.status == 'payment_failed') {
                            await _processWebhookAndSuccess(context, webhookUrl ?? '', result, {''',
'''                          posTransactionData = result.transaction;
                          if (result.status == 'payment_success' || result.status == 'payment_failed') {
                            await _processWebhookAndSuccess(context, webhookUrl ?? '', result, {'''
)

content = content.replace(
'''                          if (confirm != true) return;

                          if (!mounted) return;
                          showDialog(''',
'''                          if (confirm != true) return;

                          MposTransactionData? posTransactionData;
                          if (!mounted) return;
                          showDialog('''
)

# 4. Modify _processWebhookAndSuccess signature to include shouldPrint
content = content.replace(
'''  Future<void> _processWebhookAndSuccess(
      BuildContext context,
      String webhookUrl,
      MposTransactionResponse result,
      Map<String, dynamic> data) async {''',
'''  Future<void> _processWebhookAndSuccess(
      BuildContext context,
      String webhookUrl,
      MposTransactionResponse result,
      Map<String, dynamic> data,
      {bool shouldPrint = true}) async {'''
)

# 5. Respect shouldPrint when printing POS receipt inside webhook success
content = content.replace(
'''                onPressed: () {
                  _printPosReceipt(result.transaction!);
                  Navigator.pop(ctx);
                },''',
'''                onPressed: () {
                  if (shouldPrint) {
                    _printPosReceipt(result.transaction!);
                  }
                  Navigator.pop(ctx);
                },'''
)

# 6. Pass shouldPrint to _processWebhookAndSuccess
content = content.replace(
'''                            await _processWebhookAndSuccess(context, webhookUrl ?? '', result, {''',
'''                            final shouldPrint = !(settings?.mergePosReceipt ?? false);
                            await _processWebhookAndSuccess(context, webhookUrl ?? '', result, {'''
)

content = re.sub(
    r'''('transactionResponse': result\.transaction\?\.toJson\(\),\n\s*\}\);)''',
    r'''\g<1>shouldPrint: shouldPrint);''',
    content
)
content = content.replace('});shouldPrint: shouldPrint);', '}, shouldPrint: shouldPrint);')


helpers = """
  String _maskPan(String? pan) {
    if (pan == null || pan.length < 10) return pan ?? "";
    return "${pan.substring(0, 4)}********${pan.substring(pan.length - 4)}";
  }

  String _formatPosAmount(String? rawAmount, String symbol) {
    if (rawAmount == null || rawAmount.isEmpty) return "";
    final doubleAmount = (double.tryParse(rawAmount) ?? 0) / 100;
    return CurrencyFormatter.formatWithSymbol(doubleAmount, symbol: symbol);
  }

  String _formatPosDate(String? rawDate) {
    if (rawDate == null || rawDate.length != 10) return rawDate ?? "";
    try {
      final now = DateTime.now();
      final month = int.parse(rawDate.substring(0, 2));
      final day = int.parse(rawDate.substring(2, 4));
      final hour = int.parse(rawDate.substring(4, 6));
      final minute = int.parse(rawDate.substring(6, 8));
      final second = int.parse(rawDate.substring(8, 10));
      final date = DateTime(now.year, month, day, hour, minute, second);
      return DateFormat('dd MMM, HH:mm:ss').format(date);
    } catch (e) {
      return rawDate;
    }
  }

  List<PrintCommand> _getPosReceiptCommands(MposTransactionData tx, AppSettings? settings) {
    final String merchantName = _terminalConfig?.businessName ?? settings?.organizationName ?? 'MERCHANT';
    final String merchantId = _terminalConfig?.terminalId ?? 'N/A';
    final currency = settings?.currency ?? 'NGN';

    return [
      TextCommand('--------------------------------', align: 'center'),
      TextCommand('POS PAYMENT RECEIPT', isBold: true, align: 'center'),
      TextCommand('--------------------------------', align: 'center'),
      TextCommand(merchantName, align: 'center'),
      TextCommand('Terminal ID: $merchantId', align: 'center'),
      SizedBoxCommand(height: 1),
      TextCommand('Card Holder: ${tx.cardHolderName ?? ""}'),
      TextCommand('Card Type: ${tx.appLabel ?? ""}'),
      TextCommand('PAN: ${_maskPan(tx.maskedPan)}'),
      TextCommand('Amount: ${_formatPosAmount(tx.amount, currency)}', isBold: true),
      TextCommand('Auth Code: ${tx.authCode ?? ""}'),
      TextCommand('RRN: ${tx.rrn ?? ""}'),
      TextCommand('STAN: ${tx.stan ?? ""}'),
      TextCommand('Date: ${_formatPosDate(tx.dateTime)}'),
      TextCommand('--------------------------------', align: 'center'),
      TextCommand('APPROVED', isBold: true, align: 'center'),
      TextCommand('--------------------------------', align: 'center'),
    ];
  }
"""

content = content.replace(
'''  void _printPosReceipt(MposTransactionData tx) {
    final settings = context.read<SettingsBloc>().state.settings;
    final String merchantName = _terminalConfig?.businessName ?? settings?.organizationName ?? 'MERCHANT';
    final String merchantId = _terminalConfig?.terminalId ?? 'N/A';

    final commands = [
      TextCommand(merchantName, isBold: true, align: 'center'),
      TextCommand('Terminal ID: $merchantId', align: 'center'),
      TextCommand('--------------------------------', align: 'center'),
      TextCommand('PURCHASE RECEIPT', isBold: true, align: 'center'),
      TextCommand('--------------------------------', align: 'center'),
      TextCommand('Card Holder: ${tx.cardHolderName ?? ""}'),
      TextCommand('Card Type: ${tx.appLabel ?? ""}'),
      TextCommand('PAN: ${tx.maskedPan ?? ""}'),
      TextCommand('Amount: ${tx.amount ?? ""}', isBold: true),
      TextCommand('Auth Code: ${tx.authCode ?? ""}'),
      TextCommand('RRN: ${tx.rrn ?? ""}'),
      TextCommand('STAN: ${tx.stan ?? ""}'),
      TextCommand('Expiry: ${tx.cardExpireDate ?? ""}'),
      TextCommand('Date: ${tx.dateTime ?? ""}'),
      TextCommand('--------------------------------', align: 'center'),
      TextCommand('APPROVED', isBold: true, align: 'center'),
      TextCommand('--------------------------------', align: 'center'),
      SizedBoxCommand(height: 3),
    ];
    context.read<PrinterBloc>().add(PrintCommandsEvent(commands, 58)); // Assuming 58mm
  }''',
helpers + '''
  void _printPosReceipt(MposTransactionData tx) {
    final settings = context.read<SettingsBloc>().state.settings;
    final commands = _getPosReceiptCommands(tx, settings);
    commands.add(SizedBoxCommand(height: 1)); // Minimal space at end
    context.read<PrinterBloc>().add(PrintCommandsEvent(commands, 58)); // Assuming 58mm
  }'''
)

content = content.replace(
'''    final commands = template.generateCommands(invoice, settings);
    context.read<PrinterBloc>().add(PrintCommandsEvent(commands, 58));
  }''',
'''    final commands = template.generateCommands(invoice, settings);
    if (posTx != null && settings.mergePosReceipt == true) {
      commands.addAll(_getPosReceiptCommands(posTx, settings));
      commands.add(SizedBoxCommand(height: 1));
    }
    context.read<PrinterBloc>().add(PrintCommandsEvent(commands, 58));
  }'''
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated successfully')
