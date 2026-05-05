import 'package:involve_app/core/services/finance_api_client.dart';

abstract class IAdminRepository {
  Future<String> enterMasterMode(String password, String? otp);
  Future<List<Map<String, dynamic>>> getApiKeys();
  Future<Map<String, dynamic>> createApiKey(String label);
  Future<void> revokeApiKey(String keyId);
  Future<List<Map<String, dynamic>>> getAuditLogs();
  Future<Map<String, dynamic>> getDashboardStats();
}

class AdminRepositoryImpl implements IAdminRepository {
  final FinanceApiClient client;

  AdminRepositoryImpl(this.client);

  @override
  Future<String> enterMasterMode(String password, String? otp) async {
    final response = await client.post('/api/admin/master-mode/enter', data: {
      'password': password,
      'otp': otp,
    });
    return response.data['token'];
  }

  @override
  Future<List<Map<String, dynamic>>> getApiKeys() async {
    final response = await client.get('/api/admin/api-keys');
    return List<Map<String, dynamic>>.from(response.data['keys']);
  }

  @override
  Future<Map<String, dynamic>> createApiKey(String label) async {
    final response = await client.post('/api/admin/api-keys', data: {'label': label});
    return Map<String, dynamic>.from(response.data);
  }

  @override
  Future<void> revokeApiKey(String keyId) async {
    await client.post('/api/admin/api-keys/$keyId/revoke');
  }

  @override
  Future<List<Map<String, dynamic>>> getAuditLogs() async {
    final response = await client.get('/api/admin/audit-logs');
    return List<Map<String, dynamic>>.from(response.data);
  }

  @override
  Future<Map<String, dynamic>> getDashboardStats() async {
    final response = await client.get('/api/admin/dashboard-stats');
    return Map<String, dynamic>.from(response.data);
  }
}
