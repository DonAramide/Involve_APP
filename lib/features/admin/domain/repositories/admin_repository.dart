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
    final response = await client.get('/api/admin/audit-logs', queryParameters: {
      'limit': 100,
      'page': 1,
    });
    final raw = response.data;
    List dataList = const [];
    if (raw is List) {
      dataList = raw;
    } else if (raw is Map) {
      dataList = (raw['data'] as List?) ??
          (raw['logs'] as List?) ??
          (raw['items'] as List?) ??
          const [];
    }
    return dataList.map((log) {
      final map = Map<String, dynamic>.from(log as Map);
      final created = map['created_at'] ?? map['timestamp'];
      return {
        ...map,
        'action': map['action'] ?? map['action_type'] ?? map['event_type'] ?? 'System Event',
        'timestamp': created != null ? _formatDate(created.toString()) : 'N/A',
        'details': map['details'] ?? map['metadata'] ?? map['payload'],
        'terminal_id': map['terminal_id'] ?? map['target'],
        'status': map['status'] ?? 'SUCCESS',
      };
    }).toList();
  }

  String _formatDate(String isoString) {
    try {
      final date = DateTime.parse(isoString).toLocal();
      return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return isoString;
    }
  }

  @override
  Future<Map<String, dynamic>> getDashboardStats() async {
    try {
      final response = await client.get('/api/admin/dashboard-stats');
      return Map<String, dynamic>.from(response.data);
    } catch (_) {
      // Backend offline — return real zeros, not mock data
      return {
        'internal_wallet': 0.0,
        'monthly_revenue': 0.0,
      };
    }
  }
}
