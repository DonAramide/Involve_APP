import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

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
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final tenantId = prefs.getString('tenant_id') ?? 'unknown-tenant';
      final tenantName = prefs.getString('tenant_name') ?? 'Mobile App User';
      final deviceId = prefs.getString('device_id') ?? 'unknown-device';

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

  Future<List<dynamic>> getComplaints() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final tenantId = prefs.getString('tenant_id');
      final deviceId = prefs.getString('device_id');
      
      final queryParams = [];
      if (tenantId != null) queryParams.add('tenant_id=$tenantId');
      if (deviceId != null) queryParams.add('device_id=$deviceId');
      
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
