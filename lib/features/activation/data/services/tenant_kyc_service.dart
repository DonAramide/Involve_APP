import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:get_it/get_it.dart';
import 'package:involve_app/core/services/finance_api_client.dart';
import 'package:involve_app/core/utils/app_config.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide MultipartFile;
import 'dart:io';
import 'package:path/path.dart' as path;
import 'package:involve_app/core/utils/device_info_service.dart';
import '../../../settings/domain/services/security_service.dart';

class TenantKycService {
  FinanceApiClient _client() {
    final sl = GetIt.instance;
    if (sl.isRegistered<FinanceApiClient>()) {
      return sl<FinanceApiClient>();
    }
    return FinanceApiClient(
      baseUrl: AppConfig.baseUrl,
      getToken: () async {
        final offline = await SecurityService().getOfflineToken();
        if (offline != null && offline.isNotEmpty) return offline;
        if (AppConfig.supabaseInitialized) {
          try {
            return Supabase.instance.client.auth.currentSession?.accessToken;
          } catch (_) {}
        }
        return null;
      },
      getTenantId: () async => await SecurityService().getTenantId(),
    );
  }

  Future<bool> uploadKycDocument({
    required File file,
    required String documentType,
  }) async {
    try {
      final security = SecurityService();
      final tenantId = await security.getTenantId();
      final suffix = await DeviceInfoService.getDeviceSuffix();
      final finalIdentifier = tenantId ?? suffix;
      final fileName = path.basename(file.path);

      final formData = FormData.fromMap({
        'tenant_id': finalIdentifier,
        'type': documentType,
        'file': await MultipartFile.fromFile(file.path, filename: fileName),
      });

      final response = await _client().post(
        '/api/tenant/kyc/upload',
        data: formData,
      );

      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      debugPrint('[TenantKycService] Error uploading KYC document: $e');
      throw Exception(_friendlyError(e, documentType));
    }
  }

  Future<List<dynamic>> fetchKycDocuments() async {
    try {
      final security = SecurityService();
      final tenantId = await security.getTenantId();
      final suffix = await DeviceInfoService.getDeviceSuffix();
      final finalIdentifier = tenantId ?? suffix;
      final response = await _client().get('/api/tenant/$finalIdentifier/kyc');
      if (response.statusCode == 200) {
        final raw = response.data;
        if (raw is Map && raw['data'] is List) return raw['data'] as List;
        if (raw is List) return raw;
      }
      return [];
    } catch (e) {
      debugPrint('[TenantKycService] Error fetching KYC: $e');
      return [];
    }
  }

  String _friendlyError(Object e, String documentType) {
    if (e is FinanceApiException) {
      if (e.statusCode == 401) {
        return 'Device is not signed in to the cloud. Use Web Sync / activate this tablet, then upload again.';
      }
      return e.message;
    }
    final text = e.toString();
    if (text.contains('401')) {
      return 'Device is not signed in to the cloud. Use Web Sync / activate this tablet, then upload again.';
    }
    return 'Failed to upload $documentType';
  }
}
