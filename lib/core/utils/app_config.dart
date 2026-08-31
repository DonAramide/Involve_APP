import 'package:flutter/foundation.dart';

/// Explicit mobile environment: development | staging | production
enum AppEnvironment { development, staging, production }

class AppConfig {
  /// Compile-time environment identifier.
  /// Pass: --dart-define=APP_ENV=development|staging|production
  static AppEnvironment get environment {
    const raw = String.fromEnvironment('APP_ENV', defaultValue: '');
    final normalized = raw.trim().toLowerCase();
    switch (normalized) {
      case 'production':
      case 'prod':
        return AppEnvironment.production;
      case 'staging':
      case 'stage':
        return AppEnvironment.staging;
      case 'development':
      case 'dev':
      case 'local':
        return AppEnvironment.development;
      default:
        if (kReleaseMode) {
          return AppEnvironment.staging;
        }
        return AppEnvironment.development;
    }
  }

  static String get environmentName {
    switch (environment) {
      case AppEnvironment.production:
        return 'production';
      case AppEnvironment.staging:
        return 'staging';
      case AppEnvironment.development:
        return 'development';
    }
  }

  static bool get isProduction => environment == AppEnvironment.production;
  static bool get isStaging => environment == AppEnvironment.staging;
  static bool get isDevelopment => environment == AppEnvironment.development;

  /// Compile-time / runtime configuration. Never embed LAN/localhost defaults
  /// into release / staging / production builds.
  static String get baseUrl {
    const fromDefine = String.fromEnvironment('API_BASE_URL');
    if (fromDefine.isNotEmpty) {
      _assertEnvUrlSafety('API_BASE_URL', fromDefine);
      return fromDefine;
    }

    try {
      final envUrl = _readDotenv('BASE_URL');
      if (envUrl != null && envUrl.isNotEmpty) {
        _assertEnvUrlSafety('BASE_URL', envUrl);
        return envUrl;
      }
    } catch (_) {}

    return 'https://staging.invify.org';
  }

  static String get baseUrl3000 {
    final url = baseUrl;
    return url.replaceAll(':3004', ':3000');
  }

  static String get supabaseUrl {
    const fromDefine = String.fromEnvironment('SUPABASE_URL');
    if (fromDefine.isNotEmpty) {
      _assertEnvUrlSafety('SUPABASE_URL', fromDefine);
      return fromDefine;
    }
    final fromEnv = _readDotenv('SUPABASE_URL');
    if (fromEnv != null && fromEnv.isNotEmpty) {
      _assertEnvUrlSafety('SUPABASE_URL', fromEnv);
      return fromEnv;
    }
    return 'https://rpcjelhacmkhzguljdgi.supabase.co';
  }

  static String get supabasePublishableKey {
    const fromDefine = String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');
    if (fromDefine.isNotEmpty) return fromDefine;
    const legacyAnon = String.fromEnvironment('SUPABASE_ANON_KEY');
    if (legacyAnon.isNotEmpty) return legacyAnon;
    final fromEnv = _readDotenv('SUPABASE_PUBLISHABLE_KEY') ?? _readDotenv('SUPABASE_ANON_KEY');
    if (fromEnv != null && fromEnv.isNotEmpty) {
      return fromEnv;
    }
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwY2plbGhhY21raHpndWxqZGdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NjI1OTYsImV4cCI6MjA5NjIzODU5Nn0.9ncknpcqC-PLOufVr1IWJXweteuOEMm46qXzC25un2k';
  }

  /// Backward-compatible alias — prefer [supabasePublishableKey].
  static String get supabaseAnonKey => supabasePublishableKey;

  /// Feature flag helper — compile-time dart-defines only for non-dev.
  static bool featureEnabled(String name, {bool defaultValue = false}) {
    const prefix = 'FEATURE_';
    final key = name.startsWith(prefix) ? name : '$prefix$name';
    final fromDefine = String.fromEnvironment(key);
    if (fromDefine.isNotEmpty) {
      return fromDefine.toLowerCase() == 'true' || fromDefine == '1';
    }
    return defaultValue;
  }

  static void _assertEnvUrlSafety(String label, String url) {
    if (isDevelopment && !kReleaseMode) return;
    if (_isLoopbackOrLan(url) || url.toLowerCase().contains('ngrok')) {
      throw StateError(
        '$label must not point at localhost/LAN/ngrok for ${environmentName}',
      );
    }
    // Staging must never silently use a production host pattern without APP_ENV=production
    // Production must never use staging host markers
    final lower = url.toLowerCase();
    if (isProduction && (lower.contains('staging') || lower.contains('-stage.'))) {
      throw StateError('$label appears to be a staging URL while APP_ENV=production');
    }
    if (isStaging && (lower.contains('prod.') || lower.contains('-prod.') || lower.contains('production'))) {
      throw StateError('$label appears to be a production URL while APP_ENV=staging');
    }
  }

  static bool _isLoopbackOrLan(String url) {
    final u = url.toLowerCase();
    return u.contains('localhost') ||
        u.contains('127.0.0.1') ||
        u.contains('192.168.') ||
        u.contains('10.0.') ||
        RegExp(r'http://172\.(1[6-9]|2\d|3[0-1])\.').hasMatch(u);
  }

  static String? _readDotenv(String key) {
    try {
      return _dotenvCache[key];
    } catch (_) {
      return null;
    }
  }

  static final Map<String, String> _dotenvCache = {};

  /// Set true in [main] after a successful `Supabase.initialize`.
  /// When false, never touch `Supabase.instance` (offline / missing env).
  static bool supabaseInitialized = false;

  static bool get isSupabaseConfigured =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;

  static void hydrateFromDotenv(Map<String, String> values) {
    _dotenvCache
      ..clear()
      ..addAll(values);
  }
}
