// lib/core/services/finance_api_client.dart
//
// Fintech-grade Dio HTTP client for the Invify Finance API.
// Injects JWT (from Supabase session), tenant_id (school_id),
// and provides structured error handling for all API calls.

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

// ── Custom Exceptions ──────────────────────────────────────────────────────────

class FinanceApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic data;

  const FinanceApiException({
    required this.message,
    this.statusCode,
    this.data,
  });

  @override
  String toString() => 'FinanceApiException($statusCode): $message';
}

class UnauthorizedException extends FinanceApiException {
  const UnauthorizedException()
      : super(message: 'Session expired. Please log in again.', statusCode: 401);
}

class NetworkException extends FinanceApiException {
  const NetworkException()
      : super(message: 'No internet connection. Please check your network.');
}

class ServerException extends FinanceApiException {
  const ServerException({required super.message, super.statusCode, super.data});
}

// ── Auth Interceptor ───────────────────────────────────────────────────────────

/// Injects the Supabase JWT token into every request's Authorization header.
class JwtInterceptor extends Interceptor {
  final Future<String?> Function() getToken;

  JwtInterceptor({required this.getToken});

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await getToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    super.onRequest(options, handler);
  }
}

// ── Tenant Interceptor ─────────────────────────────────────────────────────────

/// Injects the school_id (X-Tenant-ID) into every request for multi-tenancy.
class TenantInterceptor extends Interceptor {
  final Future<String?> Function() getTenantId;

  TenantInterceptor({required this.getTenantId});

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final tenantId = await getTenantId();
    if (tenantId != null && tenantId.isNotEmpty) {
      options.headers['X-Tenant-ID'] = tenantId;
    }
    super.onRequest(options, handler);
  }
}

// ── Error Interceptor ──────────────────────────────────────────────────────────

/// Converts Dio errors into structured [FinanceApiException] subtypes.
class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    switch (err.type) {
      case DioExceptionType.connectionError:
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.sendTimeout:
        return handler.reject(
          DioException(
            requestOptions: err.requestOptions,
            error: const NetworkException(),
            type: err.type,
          ),
        );
      case DioExceptionType.badResponse:
        final statusCode = err.response?.statusCode;
        final responseData = err.response?.data;

        if (statusCode == 401) {
          return handler.reject(
            DioException(
              requestOptions: err.requestOptions,
              error: const UnauthorizedException(),
              type: err.type,
            ),
          );
        }

        final message = _extractMessage(responseData) ??
            'Server error (status $statusCode)';

        return handler.reject(
          DioException(
            requestOptions: err.requestOptions,
            error: ServerException(
              message: message,
              statusCode: statusCode,
              data: responseData,
            ),
            type: err.type,
          ),
        );
      default:
        return handler.reject(err);
    }
  }

  String? _extractMessage(dynamic data) {
    if (data is Map<String, dynamic>) {
      return data['error']?.toString() ??
          data['message']?.toString();
    }
    return null;
  }
}

// ── FinanceApiClient ───────────────────────────────────────────────────────────

/// The single HTTP client for all Finance API calls.
///
/// Usage:
/// ```dart
/// final client = FinanceApiClient(
///   baseUrl: 'https://api.invify.co/api',
///   getToken: () async => Supabase.instance.client.auth.currentSession?.accessToken,
///   getTenantId: () async => prefs.getString('school_id'),
/// );
/// ```
class FinanceApiClient {
  late final Dio _dio;
  final String baseUrl;

  FinanceApiClient({
    required this.baseUrl,
    required Future<String?> Function() getToken,
    required Future<String?> Function() getTenantId,
  }) {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    // Order matters: auth → tenant → error handling → logging
    _dio.interceptors.addAll([
      JwtInterceptor(getToken: getToken),
      TenantInterceptor(getTenantId: getTenantId),
      ErrorInterceptor(),
      if (kDebugMode)
        LogInterceptor(
          requestHeader: true,
          requestBody: true,
          responseHeader: false,
          responseBody: true,
          error: true,
        ),
    ]);
  }

  // ── HTTP Methods ─────────────────────────────────────────────────────────────

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      return await _dio.get<T>(path, queryParameters: queryParameters);
    } on DioException catch (e) {
      throw _unwrap(e);
    }
  }

  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      return await _dio.post<T>(
        path,
        data: data,
        queryParameters: queryParameters,
      );
    } on DioException catch (e) {
      throw _unwrap(e);
    }
  }

  Future<Response<T>> patch<T>(
    String path, {
    dynamic data,
  }) async {
    try {
      return await _dio.patch<T>(path, data: data);
    } on DioException catch (e) {
      throw _unwrap(e);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /// Unwraps a DioException's inner [FinanceApiException], or re-throws a
  /// generic [ServerException] if we don't recognise the error.
  FinanceApiException _unwrap(DioException e) {
    if (e.error is FinanceApiException) return e.error as FinanceApiException;
    return ServerException(
      message: e.message ?? 'An unexpected network error occurred.',
      statusCode: e.response?.statusCode,
    );
  }
}
