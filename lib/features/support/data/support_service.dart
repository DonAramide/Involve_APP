import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class SupportService {
  // Replace with dynamic config in production
  final String baseUrl = 'http://10.0.2.2:3004'; // Android Emulator alias for localhost

  Future<bool> submitComplaint({
    required String title,
    required String description,
    required String category,
    required String urgency,
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
        }),
      );

      return response.statusCode == 201;
    } catch (e) {
      print('SupportService error: $e');
      return false;
    }
  }
}
