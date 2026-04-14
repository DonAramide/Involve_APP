import '../entities/school_invoice.dart';
import '../entities/fee_structure.dart';

abstract class IBillingRepository {
  Future<List<SchoolInvoice>> getInvoices(String studentId);
  Future<SchoolInvoice> getInvoiceDetails(String invoiceId);
  Future<List<FeeStructure>> getFeeStructures();
  Future<SchoolInvoice> createInvoice(String studentId, List<String> feeIds);
}
