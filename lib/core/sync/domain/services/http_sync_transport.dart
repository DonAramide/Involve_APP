import 'dart:async';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/sync_models.dart';
import 'sync_transport.dart';

class HttpSyncTransport implements SyncTransport {
  final String baseUrl;
  final String authToken;

  HttpSyncTransport({required this.baseUrl, required this.authToken});

  @override
  Future<bool> checkHealth() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/health'),
        headers: {'X-Auth-Token': authToken},
      ).timeout(const Duration(seconds: 5));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  @override
  Future<SyncBatch> pullUpdates(DateTime lastSyncTime) async {
    final response = await http.post(
      Uri.parse('$baseUrl/sync/pull'),
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': authToken,
      },
      body: jsonEncode({'lastSyncTime': lastSyncTime.toIso8601String()}),
    );

    if (response.statusCode == 200) {
      return SyncBatch.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to pull updates: ${response.statusCode}');
    }
  }

  @override
  Future<void> pushUpdates(SyncBatch batch) async {
    final response = await http.post(
      Uri.parse('$baseUrl/sync/push'),
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': authToken,
      },
      body: jsonEncode(batch.toJson()),
    );

    if (response.statusCode != 200) {
      throw Exception('Push failed [${response.statusCode}]: ${response.body}');
    }
  }

  @override
  void dispose() {}
}
