import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:involve_app/core/utils/app_config.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:io';
import 'package:path/path.dart' as path;
import 'package:involve_app/core/utils/device_info_service.dart';
import '../../../settings/domain/services/security_service.dart';

class TenantKycService {
  TenantKycService({Dio? dio}) : _dio = dio ?? _createClient();

  final Dio _dio;

  static Dio _createClient() {
    final client = Dio(BaseOptions(
      baseUrl: AppConfig.baseUrl,
      headers: {
        'Accept': 'application/json',
      },
    ));
    client.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (AppConfig.supabaseInitialized) {
          final token = Supabase.instance.client.auth.currentSession?.accessToken;
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
        }
        handler.next(options);
      },
    ));
    return client;
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

      String fileName = path.basename(file.path);

      FormData formData = FormData.fromMap({
        "tenant_id": finalIdentifier,
        "type": documentType,
        "file": await MultipartFile.fromFile(file.path, filename: fileName),
      });

      final response = await _dio.post(
        '/api/tenant/kyc/upload',
        data: formData,
        options: Options(
          headers: {
            "Content-Type": "multipart/form-data",
          },
        ),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('[TenantKycService] Error uploading KYC document: $e');
      throw Exception('Failed to upload $documentType: $e');
    }
  }

  Future<List<dynamic>> fetchKycDocuments() async {
    try {
      final security = SecurityService();
      final tenantId = await security.getTenantId();
      final suffix = await DeviceInfoService.getDeviceSuffix();
      final finalIdentifier = tenantId ?? suffix;

      final response = await _dio.get('/api/tenant/$finalIdentifier/kyc');
      if (response.statusCode == 200) {
        return response.data['data'] ?? [];
      }
      return [];
    } catch (e) {
      debugPrint('[TenantKycService] Error fetching KYC: $e');
      return [];
    }
  }
}
