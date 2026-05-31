import 'package:local_auth/local_auth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/services.dart';

class BiometricService {
  final LocalAuthentication _auth = LocalAuthentication();
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  
  static const String _keyToken = 'auth_token';
  static const String _keyRole = 'auth_role';
  static const String _keyTenant = 'auth_tenant';
  static const String _keyStaffId = 'auth_staff_id';
  static const String _keyBiometricEnabled = 'biometric_enabled';

  /// Checks if the device has biometric hardware and if it's currently enrolled/available.
  Future<bool> isBiometricAvailable() async {
    try {
      final bool canAuthenticateWithBiometrics = await _auth.canCheckBiometrics;
      final bool canAuthenticate = canAuthenticateWithBiometrics || await _auth.isDeviceSupported();
      
      if (!canAuthenticate) return false;

      final List<BiometricType> availableBiometrics = await _auth.getAvailableBiometrics();
      return availableBiometrics.isNotEmpty;
    } on PlatformException catch (_) {
      return false;
    }
  }

  /// Authenticates the user using FaceID/Fingerprint.
  Future<bool> authenticate({String reason = 'Authenticate to access Invify OS'}) async {
    try {
      return await _auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: true,
        ),
      );
    } on PlatformException catch (_) {
      return false;
    }
  }

  /// Securely stores the active session if biometrics are enabled.
  Future<void> saveSecureSession({
    required String token,
    required String role,
    required String tenantId,
    String? staffId,
  }) async {
    await _secureStorage.write(key: _keyToken, value: token);
    await _secureStorage.write(key: _keyRole, value: role);
    await _secureStorage.write(key: _keyTenant, value: tenantId);
    if (staffId != null) {
      await _secureStorage.write(key: _keyStaffId, value: staffId);
    }
    await _secureStorage.write(key: _keyBiometricEnabled, value: 'true');
  }

  /// Retrieves the secure session if biometric login is enabled and successful.
  Future<Map<String, String>?> getSecureSession() async {
    final isEnabled = await _secureStorage.read(key: _keyBiometricEnabled);
    if (isEnabled != 'true') return null;

    final token = await _secureStorage.read(key: _keyToken);
    final role = await _secureStorage.read(key: _keyRole);
    final tenantId = await _secureStorage.read(key: _keyTenant);
    final staffId = await _secureStorage.read(key: _keyStaffId);

    if (token != null && role != null && tenantId != null) {
      return {
        'token': token,
        'role': role,
        'tenantId': tenantId,
        if (staffId != null) 'staffId': staffId,
      };
    }
    return null;
  }

  /// Clears the secure session on logout.
  Future<void> clearSecureSession() async {
    await _secureStorage.delete(key: _keyToken);
    await _secureStorage.delete(key: _keyRole);
    await _secureStorage.delete(key: _keyTenant);
    await _secureStorage.delete(key: _keyStaffId);
    await _secureStorage.delete(key: _keyBiometricEnabled);
  }

  /// Helper to determine if the user has a high-level role that mandates biometrics.
  bool isBiometricMandatory(String role) {
    const mandatoryRoles = ['admin_treasury', 'admin_risk'];
    return mandatoryRoles.contains(role);
  }
}
