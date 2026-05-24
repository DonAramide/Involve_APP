// lib/core/services/finance_api_client.dart
//
// Fintech-grade Dio HTTP client for the Invify Finance API.
// Injects JWT (from Supabase session), tenant_id (school_id),
// and provides structured error handling for all API calls.

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../features/settings/domain/services/security_service.dart';
import '../license/storage_service.dart';
import '../license/license_validator.dart';
import '../license/license_model.dart';


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
      : super(message: 'No internet connection. Please check your network or API server reachability.');
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

// ── Plan Gating Interceptor ───────────────────────────────────────────────────

class PlanGatingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    // Always allow registration/onboarding device endpoint
    if (options.path.contains('/api/admin/register-device')) {
      return super.onRequest(options, handler);
    }

    final isOnline = await checkIsOnlinePlan();
    if (!isOnline) {
      handler.reject(
        DioException(
          requestOptions: options,
          error: const FinanceApiException(
            message: 'Local operations only. Cloud synchronisation and online features require a Pro Plan subscription.',
            statusCode: 403,
          ),
          type: DioExceptionType.badResponse,
        ),
      );
      return;
    }

    super.onRequest(options, handler);
  }

  static Future<bool> checkIsOnlinePlan() async {
    try {
      // 1. Check for Lifetime status
      final isLifetime = await SecurityService().isDeviceAuthorized();
      if (isLifetime) return true;

      // 2. Check for Manual/Direct Pro status
      final proExpiry = await StorageService.getProExpiryDate();
      if (proExpiry != null && DateTime.now().isBefore(proExpiry)) {
        return true;
      }

      // 3. Check for Active License key
      final code = await StorageService.getLicense();
      if (code != null) {
        final peeked = LicenseValidator.peek(code);
        if (peeked != null) {
          final planType = peeked['planType'] as PlanType;
          final expiryDate = peeked['expiryDate'] as DateTime;
          if (DateTime.now().isBefore(expiryDate)) {
            if (planType != PlanType.basic) {
              return true;
            }
          }
        }
      }
    } catch (_) {
      // Fallback
    }
    return false;
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
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(minutes: 2),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    // Order matters: auth → tenant → plan gating → error handling → logging
    _dio.interceptors.addAll([
      JwtInterceptor(getToken: getToken),
      TenantInterceptor(getTenantId: getTenantId),
      // PlanGatingInterceptor(),
      ErrorInterceptor(),
      LogInterceptor(
        requestHeader: true,
        requestBody: true,
        responseHeader: true,
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
