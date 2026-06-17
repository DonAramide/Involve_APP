import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../../../../services/terminal_sync_service.dart';
import '../../../settings/domain/services/security_service.dart';

class CloudMetricsService {
  final String baseUrl = dotenv.env['BASE_URL'] ?? 'http://192.168.1.194:3004';

  Future<Map<String, String>> _getHeaders() async {
    // In a real scenario, fetch the JWT token from Supabase/Auth Service
    // For now, using the mock token to bypass auth or a generic Bearer
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer mock-admin-token',
      'ngrok-skip-browser-warning': 'true',
    };
  }

  Future<Map<String, dynamic>> getOverview() async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(Uri.parse('$baseUrl/cloud-metrics/overview'), headers: headers);
      if (response.statusCode == 200) return jsonDecode(response.body);
      return {};
    } catch (e) {
      print('CloudMetricsService getOverview error: $e');
      return {};
    }
  }

  Future<Map<String, dynamic>> getSyncHealth() async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(Uri.parse('$baseUrl/cloud-metrics/sync-health'), headers: headers);
      if (response.statusCode == 200) return jsonDecode(response.body);
      return {};
    } catch (e) {
      return {};
    }
  }

  Future<Map<String, dynamic>> getTerminals() async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(Uri.parse('$baseUrl/cloud-metrics/terminals'), headers: headers);
      if (response.statusCode == 200) return jsonDecode(response.body);
      return {};
    } catch (e) {
      return {};
    }
  }

  Future<Map<String, dynamic>> getDevices() async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(Uri.parse('$baseUrl/cloud-metrics/devices'), headers: headers);
      if (response.statusCode == 200) return jsonDecode(response.body);
      return {};
    } catch (e) {
      return {};
    }
  }

  Future<Map<String, dynamic>> getBackups() async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(Uri.parse('$baseUrl/cloud-metrics/backups'), headers: headers);
      if (response.statusCode == 200) return jsonDecode(response.body);
      return {};
    } catch (e) {
      return {};
    }
  }

  Future<Map<String, dynamic>> getActivityFeed() async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(Uri.parse('$baseUrl/cloud-metrics/activity-feed'), headers: headers);
      if (response.statusCode == 200) return jsonDecode(response.body);
      return {};
    } catch (e) {
      return {};
    }
  }

  Future<Map<String, dynamic>> getAlerts() async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(Uri.parse('$baseUrl/cloud-metrics/alerts'), headers: headers);
      if (response.statusCode == 200) return jsonDecode(response.body);
      return {};
    } catch (e) {
      return {};
    }
  }
}
