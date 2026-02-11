import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecurityService {
  final _storage = const FlutterSecureStorage();
  static const _passwordKey = 'system_settings_password';
  static const _superAdminPasswordKey = 'super_admin_password'; // NEW: For critical settings
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
    if (stored == null) {
      return input == 'admin123'; // Default password
    }
    return stored == input;
  }
  
  Future<String?> getStoredPassword() async {
    final stored = await _storage.read(key: _passwordKey);
    return stored ?? 'admin123';
  }

  // NEW: Super Admin Password methods for critical settings protection
  Future<bool> setSuperAdminPassword(String password) async {
    try {
      await _storage.write(key: _superAdminPasswordKey, value: password);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> verifySuperAdminPassword(String input) async {
    final stored = await _storage.read(key: _superAdminPasswordKey);
    if (stored == null) {
      return input == 'admin123'; // Default password
    }
    return stored == input;
  }

  Future<String?> getSuperAdminPassword() async {
    return await _storage.read(key: _superAdminPasswordKey);
  }

  Future<bool> hasSuperAdminPassword() async {
    final stored = await _storage.read(key: _superAdminPasswordKey);
    return stored != null && stored.isNotEmpty;
  }

  // Device authorization (existing functionality)
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
