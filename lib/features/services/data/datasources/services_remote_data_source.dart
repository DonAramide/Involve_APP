import 'package:dio/dio.dart';
import 'package:involve_app/core/services/finance_api_client.dart';

class ServicesRemoteDataSource {
  final FinanceApiClient client;

  ServicesRemoteDataSource(this.client);

  Future<void> syncJobs(List<Map<String, dynamic>> jobs) async {
    await client.post('/services/sync/jobs', data: {'jobs': jobs});
  }

  Future<void> syncPayments(List<Map<String, dynamic>> payments) async {
    await client.post('/services/sync/payments', data: {'payments': payments});
  }

  Future<void> syncCustomers(List<Map<String, dynamic>> customers) async {
    await client.post('/services/sync/customers', data: {'customers': customers});
  }
}
