import '../../../printer/domain/repositories/printer_service.dart';
import '../../../settings/domain/entities/settings.dart';
import '../entities/service_job.dart';
import '../entities/service_payment.dart';
import '../templates/job_receipt_template.dart';

class PrintJobReceipt {
  final IPrinterService printerService;

  PrintJobReceipt(this.printerService);

  Future<void> call({
    required ServiceJob job,
    required AppSettings? settings,
    required List<ServicePayment> payments,
  }) async {
    final template = JobReceiptTemplate();
    final commands = template.generateCommands(job, settings, payments);
    
    // We assume paper width 58 for standard thermal printers
    await printerService.printCommands(commands, paperWidth: 58);
  }
}
