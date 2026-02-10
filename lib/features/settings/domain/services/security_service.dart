import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecurityService {
  final _storage = const FlutterSecureStorage();
  static const _passwordKey = 'system_settings_password';
  static const _superAdminKey = 'super_admin_activation_key';
  static const _isAuthorizedKey = 'device_lifetime_authorized';

  // The actual hardcoded super admin password (for demonstration)
  // In a real app, this might be a hash or validated via a remote server
  static const _fixedSuperAdminPassword = 'SUPER_ADMIN_2026';

  Future<bool> setPassword(String password) async {
    try {
      await _storage.write(key: _passwordKey, value: password);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> verifyPassword(String input) async {
    final stored = await _storage.read(key: _passwordKey);
    if (stored == null) return true; // Default no password
    return stored == input;
  }

  Future<bool> verifySuperAdmin(String input) async {
    if (input == _fixedSuperAdminPassword) {
      await _storage.write(key: _isAuthorizedKey, value: 'true');
      return true;
    }
    return false;
  }

  Future<bool> isDeviceAuthorized() async {
    final status = await _storage.read(key: _isAuthorizedKey);
    return status == 'true';
  }

  Future<bool> hasPassword() async {
    final stored = await _storage.read(key: _passwordKey);
    return stored != null && stored.isNotEmpty;
  }
}
