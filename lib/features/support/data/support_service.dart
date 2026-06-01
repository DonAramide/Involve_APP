import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../services/terminal_sync_service.dart';
import '../../settings/domain/services/security_service.dart';

class SupportService {
  // Using global ngrok url for device testing
  final String baseUrl = 'https://bertie-archegoniate-causelessly.ngrok-free.dev';

  Future<bool> submitComplaint({
    required String title,
    required String description,
    required String category,
    required String urgency,
    String? incidentDate,
    String? incidentTime,
    String? attachmentPath,
    String? fallbackTenantName,
    String? fallbackTenantId,
  }) async {
    try {
      final config = await TerminalSyncService.loadCachedConfig();
      String tenantId = config?.tenantId ?? await SecurityService().getTenantId();
      if (tenantId.isEmpty) tenantId = fallbackTenantId ?? 'unknown-tenant';
      
      final tenantName = config?.businessName ?? fallbackTenantName ?? 'Mobile App User';
      final deviceId = config?.posSerialNumber ?? await SecurityService().getPersistentDeviceId();

      final response = await http.post(
        Uri.parse('$baseUrl/api/mobile/complaints'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'title': title,
          'description': description,
          'category': category,
          'urgency': urgency,
          'tenant_id': tenantId,
          'tenant_name': tenantName,
          'device_id': deviceId,
          'incident_date': incidentDate != null && incidentTime != null ? '$incidentDate $incidentTime' : incidentDate,
          'attachment_url': attachmentPath, // In real scenario, this would be a URL after uploading the file
        }),
      );

      return response.statusCode == 201;
    } catch (e) {
      print('SupportService error: $e');
      return false;
    }
  }

  Future<List<dynamic>> getComplaints({String? fallbackTenantId}) async {
    try {
      final config = await TerminalSyncService.loadCachedConfig();
      String tenantId = config?.tenantId ?? await SecurityService().getTenantId();
      if (tenantId.isEmpty) tenantId = fallbackTenantId ?? 'unknown-tenant';
      final deviceId = config?.posSerialNumber ?? await SecurityService().getPersistentDeviceId();
      
      final queryParams = [];
      if (tenantId != null && tenantId.isNotEmpty) queryParams.add('tenant_id=$tenantId');
      if (deviceId != null && deviceId.isNotEmpty) queryParams.add('device_id=$deviceId');
      
      final queryString = queryParams.isNotEmpty ? '?${queryParams.join('&')}' : '';
      
      final response = await http.get(Uri.parse('$baseUrl/api/mobile/complaints$queryString'));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success']) {
          return data['data'];
        }
      }
      return [];
    } catch (e) {
      print('SupportService getComplaints error: $e');
      return [];
    }
  }
}
