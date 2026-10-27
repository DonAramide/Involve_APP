// lib/features/health_insurance/presentation/utils/hmo_tour_storage.dart
import 'package:shared_preferences/shared_preferences.dart';

class HmoTourStorage {
  static const String _baseKey = 'hmo_tour_completed';

  static String _buildKey(String? userId, String? tenantId) {
    final u = (userId != null && userId.trim().isNotEmpty) ? userId.trim() : 'anonymous';
    final t = (tenantId != null && tenantId.trim().isNotEmpty) ? tenantId.trim() : 'default';
    return '${_baseKey}_${u}_$t';
  }

  /// Checks whether the user has completed or dismissed the first-time HMO tour.
  static Future<bool> isTourCompleted({String? userId, String? tenantId}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = _buildKey(userId, tenantId);
      final val = prefs.getBool(key);
      if (val != null) return val;
      // Fallback to legacy generic key if set
      return prefs.getBool(_baseKey) ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Sets the tour completion status for the specified user and tenant scope.
  static Future<void> setTourCompleted({
    String? userId,
    String? tenantId,
    bool completed = true,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = _buildKey(userId, tenantId);
      await prefs.setBool(key, completed);
      await prefs.setBool(_baseKey, completed);
    } catch (_) {}
  }

  /// Clears the tour completion flag for testing or account switching.
  static Future<void> resetTour({String? userId, String? tenantId}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = _buildKey(userId, tenantId);
      await prefs.remove(key);
      await prefs.remove(_baseKey);
    } catch (_) {}
  }
}
