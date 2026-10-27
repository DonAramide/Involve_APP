import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persists in-progress mobile onboarding so Back from email/WhatsApp
/// verification restores the form instead of a blank screen.
class OnboardingDraftStore {
  OnboardingDraftStore._();

  static const _key = 'onboarding_form_draft';
  static const _storage = FlutterSecureStorage();

  static Future<void> save(Map<String, dynamic> data) async {
    await _storage.write(key: _key, value: jsonEncode(data));
  }

  static Future<Map<String, dynamic>?> load() async {
    final raw = await _storage.read(key: _key);
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
    await _storage.delete(key: _key);
  }
}
