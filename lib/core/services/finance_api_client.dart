import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class TenantInterceptor extends Interceptor {
  final Future<String?> Function() getTenantId;

  TenantInterceptor({required this.getTenantId});

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final tenantId = await getTenantId();
    if (tenantId != null) {
      options.headers['X-Tenant-ID'] = tenantId;
    }
    super.onRequest(options, handler);
  }
}

class FinanceApiClient {
  late final Dio _dio;
  final String baseUrl;

  FinanceApiClient({
    required this.baseUrl,
    required Future<String?> Function() getTenantId,
  }) {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ));

    _dio.interceptors.add(TenantInterceptor(getTenantId: getTenantId));
    
    if (kDebugMode) {
      _dio.interceptors.add(LogInterceptor(
        requestBody: true,
        responseBody: true,
      ));
    }
  }

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) {
    return _dio.get(path, queryParameters: queryParameters);
  }

  Future<Response> post(String path, {dynamic data}) {
    return _dio.post(path, data: data);
  }
}
