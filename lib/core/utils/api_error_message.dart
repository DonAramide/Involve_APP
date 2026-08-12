import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

/// Turns Dio / API / generic exceptions into short, user-facing copy.
/// Never returns raw `DioException`, `ECONNREFUSED`, stack dumps, or IP:port noise.
String friendlyApiError(
  Object? error, {
  String fallback = 'Something went wrong. Please try again.',
}) {
  if (error == null) return fallback;

  // Structured API exceptions (e.g. FinanceApiException) expose `.message`
  if (error is! DioException && error is! String) {
    try {
      final msg = (error as dynamic).message;
      if (msg is String && msg.trim().isNotEmpty) {
        final mapped = _mapNetworkish(msg.trim());
        if (mapped != null) return mapped;
        if (!_looksTechnical(msg)) {
          return _sanitize(msg.trim(), fallback);
        }
      }
    } catch (_) {}
  }

  if (error is DioException) {
    return _fromDio(error, fallback);
  }

  if (error is Exception || error is Error || error is String) {
    final raw = error.toString();
    final stripped = raw
        .replaceFirst(RegExp(r'^Exception:\s*'), '')
        .replaceFirst(RegExp(r'^FinanceApiException:\s*'), '')
        .replaceFirst(RegExp(r'^ServerException:\s*'), '')
        .replaceFirst(RegExp(r'^NetworkException:\s*'), '')
        .replaceFirst(RegExp(r'^UnauthorizedException:\s*'), '')
        .replaceFirst(RegExp(r'^Error:\s*'), '')
        .trim();

    final mapped = _mapNetworkish(stripped);
    if (mapped != null) return mapped;

    if (_looksTechnical(stripped)) {
      return fallback;
    }
    return _sanitize(stripped, fallback);
  }

  final asString = error.toString().trim();
  if (asString.isEmpty || _looksTechnical(asString)) return fallback;
  final mapped = _mapNetworkish(asString);
  if (mapped != null) return mapped;
  return _sanitize(asString, fallback);
}

/// Map connection / DNS / refused host errors to a calm user message.
String? _mapNetworkish(String text) {
  final t = text.toLowerCase();
  if (t.contains('econnrefused') ||
      t.contains('connection refused') ||
      t.contains('failed host lookup') ||
      t.contains('network is unreachable') ||
      t.contains('no address associated') ||
      t.contains('socketexception') ||
      t.contains('connection reset') ||
      t.contains('connection closed') ||
      t.contains('broken pipe') ||
      t.contains('errno = 111') ||
      t.contains('errno = 61') ||
      t.contains('errno = 51') ||
      RegExp(r'connect\s+econn', caseSensitive: false).hasMatch(text) ||
      RegExp(r'\b\d{1,3}(\.\d{1,3}){3}:\d+\b').hasMatch(text)) {
    // Internet can be fine while the Invify/Quasar host on LAN is down.
    return 'Could not reach the Invify server. Make sure the server is running and this device is on the same network, then try again.';
  }
  if (t.contains('timed out') || t.contains('timeout')) {
    return 'The server took too long to respond. Please try again.';
  }
  if (t.contains('certificate') || t.contains('handshake') || t.contains('ssl')) {
    return 'Secure connection failed. Please try again later.';
  }
  return null;
}

String _fromDio(DioException e, String fallback) {
  // Prefer structured error attached by FinanceApiClient interceptor
  if (e.error != null && e.error is! String) {
    try {
      final msg = (e.error as dynamic).message;
      if (msg is String && msg.trim().isNotEmpty) {
        final mapped = _mapNetworkish(msg.trim());
        if (mapped != null) return mapped;
        if (!_looksTechnical(msg)) {
          return _sanitize(msg.trim(), fallback);
        }
      }
    } catch (_) {}
    final nested = friendlyApiError(e.error, fallback: fallback);
    if (nested != fallback) return nested;
  }

  // Dio often puts "connect ECONNREFUSED ..." in message / error string
  final dioMsg = e.message ?? e.error?.toString() ?? '';
  final mapped = _mapNetworkish(dioMsg);
  if (mapped != null) return mapped;

  switch (e.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
      return 'The server took too long to respond. Please try again.';
    case DioExceptionType.connectionError:
      return 'Could not reach the Invify server. Make sure the server is running and this device is on the same network, then try again.';
    case DioExceptionType.cancel:
      return 'Request was cancelled.';
    case DioExceptionType.badCertificate:
      return 'Secure connection failed. Please try again later.';
    case DioExceptionType.badResponse:
      final status = e.response?.statusCode;
      final fromBody = extractApiErrorBody(e.response?.data);
      if (fromBody != null && fromBody.isNotEmpty) {
        return _sanitize(fromBody, fallback);
      }
      return _messageForStatus(status, fallback);
    case DioExceptionType.unknown:
      final fromBody = extractApiErrorBody(e.response?.data);
      if (fromBody != null && fromBody.isNotEmpty) {
        return _sanitize(fromBody, fallback);
      }
      if (e.message != null) {
        final m = _mapNetworkish(e.message!);
        if (m != null) return m;
        if (!_looksTechnical(e.message!)) {
          return _sanitize(e.message!, fallback);
        }
      }
      return fallback;
  }
}

/// Pulls `error` / `message` (and common nested shapes) from API JSON bodies.
String? extractApiErrorBody(dynamic data) {
  if (data == null) return null;

  if (data is String) {
    final t = data.trim();
    if (t.isEmpty) return null;
    final mapped = _mapNetworkish(t);
    if (mapped != null) return mapped;
    if (_looksTechnical(t)) return null;
    // Avoid dumping HTML error pages
    if (t.startsWith('<!DOCTYPE') || t.startsWith('<html')) {
      return null;
    }
    return t;
  }

  if (data is Map) {
    final map = Map<String, dynamic>.from(data);

    for (final key in ['error', 'message', 'detail', 'msg', 'title', 'responseMessage']) {
      final v = map[key];
      if (v is String && v.trim().isNotEmpty) {
        final mapped = _mapNetworkish(v);
        if (mapped != null) return mapped;
        if (!_looksTechnical(v)) return v.trim();
      }
      if (v is Map) {
        final nested = extractApiErrorBody(v);
        if (nested != null) return nested;
      }
      if (v is List && v.isNotEmpty) {
        final nested = extractApiErrorBody(v.first);
        if (nested != null) return nested;
      }
    }

    // Express / validation style: { errors: [{ msg: '...' }] }
    final errors = map['errors'];
    if (errors is List && errors.isNotEmpty) {
      final first = extractApiErrorBody(errors.first);
      if (first != null) return first;
    }
  }

  if (data is List && data.isNotEmpty) {
    return extractApiErrorBody(data.first);
  }

  return null;
}

String _messageForStatus(int? status, String fallback) {
  switch (status) {
    case 400:
      return 'Request could not be completed. Please check your details and try again.';
    case 401:
      return 'Your session expired. Please sign in again.';
    case 403:
      return 'You do not have permission to do that.';
    case 404:
      return 'The requested resource was not found.';
    case 408:
      return 'Request timed out. Please try again.';
    case 409:
      return 'This conflicts with existing data. Please refresh and try again.';
    case 422:
      return 'Some details look invalid. Please review and try again.';
    case 429:
      return 'Too many attempts. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Server is temporarily unavailable. Please try again shortly.';
    default:
      return fallback;
  }
}

bool _looksTechnical(String text) {
  final t = text.toLowerCase();
  return t.contains('dioexception') ||
      t.contains('bad response') ||
      t.contains('xmlhttprequest') ||
      t.contains('socketexception') ||
      t.contains('http status') ||
      t.contains('statuscode') ||
      t.contains('requestoptions') ||
      t.contains('validatestatus') ||
      t.contains('handshakeexception') ||
      t.contains('clientexception') ||
      t.contains('formatexception') ||
      t.contains('null check operator') ||
      t.contains('econnrefused') ||
      t.contains('econnreset') ||
      t.contains('enotfound') ||
      t.contains('errno') ||
      t.contains('stack trace') ||
      t.contains('package:') ||
      RegExp(r'\b\d{1,3}(\.\d{1,3}){3}:\d+\b').hasMatch(text) ||
      (t.contains('exception:') && t.contains('status code'));
}

String _sanitize(String message, String fallback) {
  var m = message.trim();
  if (m.isEmpty) return fallback;
  final mapped = _mapNetworkish(m);
  if (mapped != null) return mapped;
  if (_looksTechnical(m)) return fallback;

  // Cap extremely long server dumps
  if (m.length > 220) {
    m = '${m.substring(0, 217)}...';
  }
  return m;
}

/// Shows a floating red snackbar with a friendly API error.
void showFriendlyErrorSnackBar(
  BuildContext context,
  Object? error, {
  String fallback = 'Something went wrong. Please try again.',
  Color backgroundColor = const Color(0xFFEF4444),
}) {
  if (!context.mounted) return;
  final message = friendlyApiError(error, fallback: fallback);
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(message),
      backgroundColor: backgroundColor,
      behavior: SnackBarBehavior.floating,
    ),
  );
}
