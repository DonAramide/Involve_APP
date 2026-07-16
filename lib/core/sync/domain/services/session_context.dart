import 'package:involve_app/features/settings/domain/services/security_service.dart';

abstract class SessionContext {
  Future<String?> getTenantId();
  Future<String?> getDeviceId();
  Future<String?> getUserId();
  Future<String?> getTenantCode();
}

class SessionContextImpl implements SessionContext {
  final SecurityService _securityService;

  SessionContextImpl(this._securityService);

  @override
  Future<String?> getTenantId() async {
    return await _securityService.getTenantId();
  }

  @override
  Future<String?> getDeviceId() async {
    // In a real implementation, this might read from flutter_secure_storage or device_info_plus
    // For now, we delegate to SecurityService or return a placeholder if not implemented there
    // Assuming SecurityService has a method or we fallback
    return 'device-uuid-placeholder';
  }

  @override
  Future<String?> getUserId() async {
    // Read from secure storage or Supabase auth session
    return 'user-uuid-placeholder';
  }

  @override
  Future<String?> getTenantCode() async {
    return 'TENANT_CODE_PLACEHOLDER';
  }
}
