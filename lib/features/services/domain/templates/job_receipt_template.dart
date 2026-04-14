import '../../../invoicing/domain/templates/invoice_template.dart';
import '../../../settings/domain/entities/settings.dart';
import '../entities/service_job.dart';
import '../entities/service_payment.dart';

class JobReceiptTemplate {
  List<PrintCommand> generateCommands(
    ServiceJob job,
    dynamic settings, // AppSettings
    List<ServicePayment> payments,
  ) {
    final List<PrintCommand> commands = [];

    // 1. Header (Business Info)
    commands.add(TextCommand(
      settings?.organizationName ?? 'INVIFY SERVICES',
      isBold: true,
      align: 'center',
    ));
    if (settings?.address != null) {
      commands.add(TextCommand(settings!.address!, align: 'center'));
    }
    if (settings?.phone != null) {
      commands.add(TextCommand('Phone: ${settings!.phone!}', align: 'center'));
    }
    commands.add(DividerCommand());

    // 2. Job Info
    commands.add(TextCommand('SERVICE RECEIPT', isBold: true, align: 'center'));
    commands.add(SizedBoxCommand(height: 1));
    commands.add(TextCommand('Job ID: ${job.jobId}'));
    commands.add(TextCommand('Title: ${job.title}'));
    commands.add(TextCommand('Date: ${DateTime.now().toString().split('.')[0]}'));
    commands.add(DividerCommand());

    final symbol = settings?.currency ?? '₦';

    // 3. Financial Summary
    commands.add(TextCommand('Total Amount: $symbol${job.totalAmount.toStringAsFixed(2)}', isBold: true));
    commands.add(TextCommand('Amount Paid: $symbol${job.amountPaid.toStringAsFixed(2)}', isBold: true));
    commands.add(TextCommand('Balance Due: $symbol${job.balance.toStringAsFixed(2)}', isBold: true));
    commands.add(DividerCommand());

    // 4. Payment History (Recent 5)
    if (payments.isNotEmpty) {
      commands.add(TextCommand('PAYMENT LOG', isBold: true, align: 'center'));
      for (var payment in payments.take(5)) {
        commands.add(TextCommand(
          '${payment.createdAt.toString().split(' ')[0]} - $symbol${payment.amount.toStringAsFixed(2)} (${payment.method})',
        ));
      }
      commands.add(DividerCommand());
    }

    // 5. Footer
    commands.add(SizedBoxCommand(height: 1));
    commands.add(TextCommand('Thank you for your business!', align: 'center'));
    commands.add(TextCommand('Powered by Invify', align: 'center'));
    commands.add(SizedBoxCommand(height: 3)); // Extra padding for tear-off

    return commands;
  }
}
