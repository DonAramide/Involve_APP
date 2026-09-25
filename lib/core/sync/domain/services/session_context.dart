import 'package:involve_app/features/settings/domain/services/security_service.dart';
import 'package:involve_app/core/utils/device_info_service.dart';

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
    return DeviceInfoService.getDeviceSuffix();
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
