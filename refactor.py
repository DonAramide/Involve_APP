import sys
import os

file_path = r'C:\dev\Involve_APP\lib\features\invoicing\presentation\widgets\invoice_preview_dialog.dart'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

import_statement = "import 'package:involve_app/core/offline/offline_webhook_service.dart';\n"
if import_statement not in content:
    content = content.replace("import 'package:involve_app/services/terminal_sync_service.dart';", "import 'package:involve_app/services/terminal_sync_service.dart';\n" + import_statement + "import 'package:dio/dio.dart';\n")

# Define the helper method
helper_method = '''
  Future<void> _processWebhookAndSuccess(
      BuildContext context,
      String webhookUrl,
      MposTransactionResult result,
      Map<String, dynamic> data) async {
    final financeRepo = context.read<FinanceRepository>();
    final endpoint = webhookUrl.isNotEmpty ? webhookUrl : '/api/pos/transaction';
    
    Response? backendResponse;
    try {
      backendResponse = await financeRepo.apiClient.post(endpoint, data: data);
    } catch (e) {
      debugPrint('[Webhook] Failed to sync to server: $e');
      // Enqueue for offline sync
      final offlineService = OfflineWebhookService(financeRepo.apiClient.dio);
      await offlineService.enqueuePayload(endpoint, data);
    }

    if (!mounted) return;

    if (result.status == 'payment_failed') {
      final msg = result.transaction?.message ?? 'Unknown Error';
      await showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('POS Declined'),
          content: Text('Transaction declined by MPOS ($msg).'),
          actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
        ),
      );
      return;
    }

    if (backendResponse != null && backendResponse.statusCode != 200 && backendResponse.statusCode != 201) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment approved but failed to sync to server (Queued).')));
    }

    // Success Screen & Print Receipt
    if (result.status == 'payment_success' && result.transaction != null) {
      await showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: const Row(children: [
            Icon(Icons.check_circle, color: Colors.green),
            SizedBox(width: 8),
            Text('Purchase Successful')
          ]),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Amount: ${result.transaction!.amount}'),
              Text('RRN: ${result.transaction!.rrn}'),
              Text('STAN: ${result.transaction!.stan}'),
              Text('Card: ${result.transaction!.maskedPan}'),
              const Text('Status: Approved'),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                _printPosReceipt(result.transaction!);
                Navigator.pop(ctx);
              },
              child: const Text('PRINT RECEIPT & CLOSE'),
            )
          ],
        ),
      );
    }
  }

  void _printPosReceipt(MposTransactionResponse tx) {
    final settings = context.read<SettingsBloc>().state.settings;
    final String merchantName = _terminalConfig?.businessName ?? settings?.businessName ?? 'MERCHANT';
    final String merchantId = _terminalConfig?.terminalId ?? 'N/A';

    final commands = [
      PrintCommand.text(merchantName, isBold: true, align: PrintAlignment.center, size: PrintSize.large),
      PrintCommand.text('Terminal ID: $merchantId', align: PrintAlignment.center),
      PrintCommand.text('--------------------------------', align: PrintAlignment.center),
      PrintCommand.text('PURCHASE RECEIPT', isBold: true, align: PrintAlignment.center),
      PrintCommand.text('--------------------------------', align: PrintAlignment.center),
      PrintCommand.text('Card Holder: ${tx.cardHolderName ?? ""}'),
      PrintCommand.text('Card Type: ${tx.appLabel ?? ""}'),
      PrintCommand.text('PAN: ${tx.maskedPan ?? ""}'),
      PrintCommand.text('Amount: ${tx.amount ?? ""}', isBold: true),
      PrintCommand.text('Auth Code: ${tx.authCode ?? ""}'),
      PrintCommand.text('RRN: ${tx.rrn ?? ""}'),
      PrintCommand.text('STAN: ${tx.stan ?? ""}'),
      PrintCommand.text('Expiry: ${tx.cardExpireDate ?? ""}'),
      PrintCommand.text('Date: ${tx.dateTime ?? ""}'),
      PrintCommand.text('--------------------------------', align: PrintAlignment.center),
      PrintCommand.text('APPROVED', isBold: true, align: PrintAlignment.center, size: PrintSize.large),
      PrintCommand.text('--------------------------------', align: PrintAlignment.center),
      PrintCommand.feed(3),
    ];
    context.read<PrinterBloc>().add(PrintCommandsEvent(commands, 58)); // Assuming 58mm
  }
'''

block1_find = '''                          if (result.status == 'payment_success' || result.status == 'payment_failed') {
                            final financeRepo = context.read<FinanceRepository>();
                            final endpoint = webhookUrl?.isNotEmpty == true ? webhookUrl! : '/api/pos/transaction';
                            final backendResponse = await financeRepo.apiClient.post(
                              endpoint,
                              data: {
                                'terminalId': terminalId,
                                'amount': amountToCharge,
                                'isDeviceProcessed': true,
                                'deviceStatus': result.status,
                                'tenantProfile': _terminalConfig?.tenantPolicy,
                                'deviceInfo': {
                                  'terminalId': _terminalConfig?.terminalId,
                                  'mposTerminalId': _terminalConfig?.mposTerminalId,
                                  'posSerialNumber': _terminalConfig?.posSerialNumber,
                                },
                                'emvData': result.emvData?.toJson(),
                                'transactionResponse': result.transaction?.toJson(),
                                'staffName': invoiceState.staffName,
                                'items': invoiceState.items.map((i) => {
                                  'name': i.item.name,
                                  'quantity': i.quantity,
                                  'price': i.item.price,
                                }).toList(),
                              },
                            );
                            if (!mounted) return;
                            if (result.status == 'payment_failed') {
                              final msg = result.transaction?.message ?? 'Unknown Error';
                              await showDialog(
                                context: context,
                                builder: (ctx) => AlertDialog(
                                  title: const Text('POS Declined'),
                                  content: Text('Transaction declined by MPOS ($msg).'),
                                  actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
                                ),
                              );
                              return;
                            } else if (backendResponse.statusCode != 200) {
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment approved but failed to sync to server.')));
                            }
                          }'''

block1_replace = '''                          if (result.status == 'payment_success' || result.status == 'payment_failed') {
                            await _processWebhookAndSuccess(context, webhookUrl ?? '', result, {
                                'terminalId': terminalId,
                                'amount': amountToCharge,
                                'isDeviceProcessed': true,
                                'deviceStatus': result.status,
                                'tenantProfile': _terminalConfig?.tenantPolicy,
                                'deviceInfo': {
                                  'terminalId': _terminalConfig?.terminalId,
                                  'mposTerminalId': _terminalConfig?.mposTerminalId,
                                  'posSerialNumber': _terminalConfig?.posSerialNumber,
                                },
                                'emvData': result.emvData?.toJson(),
                                'transactionResponse': result.transaction?.toJson(),
                                'staffName': invoiceState.staffName,
                                'items': invoiceState.items.map((i) => {
                                  'name': i.item.name,
                                  'quantity': i.quantity,
                                  'price': i.item.price,
                                }).toList(),
                            });
                          }'''

block2_find = '''                        if (result.status == 'payment_success' || result.status == 'payment_failed') {
                          final financeRepo = context.read<FinanceRepository>();
                          final endpoint = webhookUrl?.isNotEmpty == true ? webhookUrl! : '/api/pos/transaction';
                          final backendResponse = await financeRepo.apiClient.post(
                            endpoint,
                            data: {
                              'terminalId': terminalId,
                              'amount': amountToCharge,
                              'isDeviceProcessed': true,
                              'deviceStatus': result.status,
                              'tenantProfile': _terminalConfig?.tenantPolicy,
                              'deviceInfo': {
                                'terminalId': _terminalConfig?.terminalId,
                                'mposTerminalId': _terminalConfig?.mposTerminalId,
                                'posSerialNumber': _terminalConfig?.posSerialNumber,
                              },
                              'emvData': result.emvData?.toJson(),
                              'transactionResponse': result.transaction?.toJson(),
                            },
                          );
                          if (!mounted) return;
                          if (result.status == 'payment_failed') {
                            final msg = result.transaction?.message ?? 'Unknown Error';
                            await showDialog(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                title: const Text('POS Declined'),
                                content: Text('Transaction declined by MPOS ($msg).'),
                                actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
                              ),
                            );
                            return;
                          } else if (backendResponse.statusCode != 200) {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment approved but failed to sync to server.')));
                          }
                        }'''

block2_replace = '''                        if (result.status == 'payment_success' || result.status == 'payment_failed') {
                          await _processWebhookAndSuccess(context, webhookUrl ?? '', result, {
                              'terminalId': terminalId,
                              'amount': amountToCharge,
                              'isDeviceProcessed': true,
                              'deviceStatus': result.status,
                              'tenantProfile': _terminalConfig?.tenantPolicy,
                              'deviceInfo': {
                                'terminalId': _terminalConfig?.terminalId,
                                'mposTerminalId': _terminalConfig?.mposTerminalId,
                                'posSerialNumber': _terminalConfig?.posSerialNumber,
                              },
                              'emvData': result.emvData?.toJson(),
                              'transactionResponse': result.transaction?.toJson(),
                          });
                        }'''

if block1_find in content:
    content = content.replace(block1_find, block1_replace)
    print('Block 1 replaced')
else:
    print('Block 1 NOT found')

if block2_find in content:
    content = content.replace(block2_find, block2_replace)
    print('Block 2 replaced')
else:
    print('Block 2 NOT found')

if '_processWebhookAndSuccess(' not in content:
    last_brace_idx = content.rfind('}')
    content = content[:last_brace_idx] + helper_method + content[last_brace_idx:]
    print('Helper method inserted')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
