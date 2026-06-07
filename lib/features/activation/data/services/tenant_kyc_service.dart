import 'package:dio/dio.dart';
import 'package:involve_app/core/services/api_service.dart';
import 'package:involve_app/core/services/service_locator.dart';
import 'dart:io';
import 'package:path/path.dart' as path;
import 'package:involve_app/core/utils/device_info_service.dart';
import '../../../settings/domain/services/security_service.dart';

class TenantKycService {
  final ApiService _apiService = sl<ApiService>();

  Future<bool> uploadKycDocument({
    required File file,
    required String documentType,
  }) async {
    try {
      final security = SecurityService();
      final tenantId = await security.getTenantId();
      final suffix = await DeviceInfoService.getDeviceSuffix();

      // Ensure we have an identifier for the upload
      final finalIdentifier = tenantId ?? suffix;

      String fileName = path.basename(file.path);
      
      FormData formData = FormData.fromMap({
        "tenant_id": finalIdentifier,
        "type": documentType,
        "file": await MultipartFile.fromFile(file.path, filename: fileName),
      });

      // We use raw Dio post because ApiService might require auth token 
      // but this is onboarding so we might not have it yet. We pass tenant_id.
      final response = await _apiService.client.post(
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
      print('[TenantKycService] Error uploading KYC document: $e');
      throw Exception('Failed to upload $documentType: $e');
    }
  }

  Future<List<dynamic>> fetchKycDocuments() async {
    try {
      final security = SecurityService();
      final tenantId = await security.getTenantId();
      final suffix = await DeviceInfoService.getDeviceSuffix();
      final finalIdentifier = tenantId ?? suffix;

      final response = await _apiService.client.get('/api/tenant/$finalIdentifier/kyc');
      if (response.statusCode == 200) {
        return response.data['data'] ?? [];
      }
      return [];
    } catch (e) {
      print('[TenantKycService] Error fetching KYC: $e');
      return [];
    }
  }
}
