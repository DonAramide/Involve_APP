import '../../../../core/services/finance_api_client.dart';
import '../../domain/entities/school_invoice.dart';
import '../../domain/entities/fee_structure.dart';
import '../../domain/repositories/billing_repository.dart';


class BillingRepositoryImpl implements IBillingRepository {
  final FinanceApiClient client;

  BillingRepositoryImpl(this.client);

  @override
  Future<List<SchoolInvoice>> getInvoices(String studentId) async {
    final response = await client.get('/students/$studentId/invoices');
    // Implementation of mapping would go here
    return []; 
  }

  @override
  Future<SchoolInvoice> getInvoiceDetails(String invoiceId) async {
    final response = await client.get('/invoices/$invoiceId');
    // Implementation of mapping would go here
    throw UnimplementedError();
  }

  @override
  Future<List<FeeStructure>> getFeeStructures() async {
    final response = await client.get('/fee-structures');
    // Implementation of mapping would go here
    return [];
  }

  @override
  Future<SchoolInvoice> createInvoice(String studentId, List<String> feeIds) async {
    final response = await client.post('/invoices', data: {
      'student_id': studentId,
      'fee_ids': feeIds,
    });
    // Implementation of mapping would go here
    throw UnimplementedError();
  }
}
