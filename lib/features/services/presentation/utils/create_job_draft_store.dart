import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Keeps an in-progress Create Job form until the job is saved or cleared.
class CreateJobDraftStore {
  CreateJobDraftStore._();

  static const _key = 'create_job_form_draft';

  static Future<void> save(Map<String, dynamic> data) async {
    final prefs = await SharedPreferences.getInstance();
    try {
      await prefs.setString(_key, jsonEncode(data));
    } catch (_) {
      final withoutImage = Map<String, dynamic>.from(data)..remove('imageBase64');
      await prefs.setString(_key, jsonEncode(withoutImage));
    }
  }

  static Future<Map<String, dynamic>?> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null || raw.isEmpty) return null;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map) {
        return Map<String, dynamic>.from(decoded);
      }
    } catch (_) {}
    return null;
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }
}
