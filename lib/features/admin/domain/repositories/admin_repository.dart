// lib/features/admin/domain/repositories/admin_repository.dart
import 'package:dio/dio.dart';

abstract class IAdminRepository {
  Future<String> enterMasterMode(String password, String? otp);
  Future<List<Map<String, dynamic>>> getApiKeys();
  Future<Map<String, dynamic>> createApiKey(String label);
  Future<void> revokeApiKey(String keyId);
  Future<List<Map<String, dynamic>>> getAuditLogs();
}

class AdminRepositoryImpl implements IAdminRepository {
  final Dio dio;

  AdminRepositoryImpl(this.dio);

  @override
  Future<String> enterMasterMode(String password, String? otp) async {
    final response = await dio.post('/api/admin/master-mode/enter', data: {
      'password': password,
      'otp': otp,
    });
    return response.data['token'];
  }

  @override
  Future<List<Map<String, dynamic>>> getApiKeys() async {
    final response = await dio.get('/api/admin/api-keys');
    return List<Map<String, dynamic>>.from(response.data['keys']);
  }

  @override
  Future<Map<String, dynamic>> createApiKey(String label) async {
    final response = await dio.post('/api/admin/api-keys', data: {'label': label});
    return response.data;
  }

  @override
  Future<void> revokeApiKey(String keyId) async {
    await dio.post('/api/admin/api-keys/$keyId/revoke');
  }

  @override
  Future<List<Map<String, dynamic>>> getAuditLogs() async {
    final response = await dio.get('/api/admin/audit-logs');
    return List<Map<String, dynamic>>.from(response.data);
  }
}
