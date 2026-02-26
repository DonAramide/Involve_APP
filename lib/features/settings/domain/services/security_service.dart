import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:crypto/crypto.dart';
import 'dart:convert';

class SecurityService {
  final _storage = const FlutterSecureStorage();
  static const _passwordKey = 'system_settings_password';
  static const _superAdminPasswordKey = 'super_admin_password'; // NEW: For critical settings
  static const _superAdminKey = 'super_admin_activation_key';
  static const _isAuthorizedKey = 'device_lifetime_authorized';

  // No longer using fixed plaintext passwords. 
  // For emergency/default, we'll hash the expected default strings.
  
  String _hash(String input) {
    if (input.isEmpty) return "";
    // Using a static salt for local validation consistency
    const salt = "INVIFY-SALT-2024-SECURE-STAY-SAFE";
    final bytes = utf8.encode(input + salt);
    return sha256.convert(bytes).toString();
  }

  Future<bool> setPassword(String password) async {
    try {
      final hashed = _hash(password);
      await _storage.write(key: _passwordKey, value: hashed);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> verifyPassword(String input) async {
    final stored = await _storage.read(key: _passwordKey);
    final hashedInput = _hash(input);
    
    if (stored == null) {
      // Default: admin123 hashed
      return hashedInput == _hash('admin123');
    }
    return stored == hashedInput;
  }
  
  Future<String?> getStoredPassword() async {
    // This now returns the HASH. Useful for internal comparisons but never display.
    return await _storage.read(key: _passwordKey) ?? _hash('admin123');
  }

  // NEW: Super Admin Password methods for critical settings protection
  Future<bool> setSuperAdminPassword(String password) async {
    try {
      final hashed = _hash(password);
      await _storage.write(key: _superAdminPasswordKey, value: hashed);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> verifySuperAdminPassword(String input) async {
    final stored = await _storage.read(key: _superAdminPasswordKey);
    final hashedInput = _hash(input);
    
    if (stored == null) {
      return hashedInput == _hash(_getDefaultSuperAdminPassword());
    }
    return stored == hashedInput;
  }

  Future<String?> getSuperAdminPassword() async {
    // Returns HASH
    return await _storage.read(key: _superAdminPasswordKey) ?? _hash(_getDefaultSuperAdminPassword());
  }

  Future<bool> hasSuperAdminPassword() async {
    final stored = await _storage.read(key: _superAdminPasswordKey);
    return stored != null && stored.isNotEmpty;
  }

  String _getDefaultSuperAdminPassword() {
    final now = DateTime.now();
    final mm = now.month.toString().padLeft(2, '0');
    final dd = now.day.toString().padLeft(2, '0');
    final yy = now.year.toString().substring(2);
    return '$mm$dd${yy}iips@wendy';
  }

  // Device authorization (existing functionality)
  Future<bool> verifySuperAdmin(String input) async {
    // This is the ONE-TIME device activation key. 
    // We compare hash of hardcoded value with input hash for better protection
    const fixedHash = "509177259f9392fd6a5f98991bce9857d4ccf5fbbf838e8e78f7e2c943806282"; // Hashed SUPER_ADMIN_2026
    
    if (_hash(input) == fixedHash) {
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
