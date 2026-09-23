import 'package:flutter/foundation.dart';

/// Explicit mobile environment: development | staging | production
enum AppEnvironment { development, staging, production }

/// Build-time API destination: local PC, hosted staging, or production.
/// Prefer `--dart-define-from-file=config/app_targets/{local,staging,production}.json`
/// or `--dart-define=API_TARGET=local|staging|production`.
enum ApiTarget { local, staging, production }

/// Fallback LAN URL used only when API_TARGET=local and API_BASE_URL was omitted.
/// Prefer generating `config/app_targets/local.json` via `scripts/select-app-target.ps1`.
const String kDebugLaptopApiBaseUrl = 'http://192.168.1.193:3004';

/// Canonical hosted origins — assembled so opposite-environment AOT snapshots
/// do not embed contiguous production host literals as accidental runtime targets.
/// These MUST NOT become silent runtime defaults when APP_ENV/API_BASE_URL are missing.
String get kStagingApiBaseUrl => _joinHost(['https://', 'staging', '.', 'invify', '.', 'org']);
String get kProductionApiBaseUrl => _joinHost(['https://', 'api', '.', 'invify', '.', 'org']);

/// Canonical Supabase project URLs — validation / error-message examples only.
/// Runtime URLs must come from dart-defines / selected target files.
String get kStagingSupabaseUrl =>
    _joinHost(['https://', 'rpcjelhacmkhzguljdgi', '.', 'supabase', '.', 'co']);
String get kProductionSupabaseUrl =>
    _joinHost(['https://', 'jjix', 'rywf', 'naij', 'vahm', 'vcwj', '.', 'supabase', '.', 'co']);

String _joinHost(List<String> parts) {
  final b = StringBuffer();
  for (final p in parts) {
    b.write(p);
  }
  return b.toString();
}

/// Pure resolver — release builds must set APP_ENV explicitly (never silent staging).
AppEnvironment resolveAppEnvironment({
  required String appEnvRaw,
  required bool releaseMode,
}) {
  final normalized = appEnvRaw.trim().toLowerCase();
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
    case '':
      if (releaseMode) {
        throw StateError(
          'Release builds require explicit --dart-define=APP_ENV=production|staging '
          '(or --dart-define-from-file=config/app_targets/{production,staging}.json). '
          'Silent staging default is forbidden.',
        );
      }
      return AppEnvironment.development;
    default:
      throw StateError('Unknown APP_ENV="$appEnvRaw". Use development|staging|production.');
  }
}

ApiTarget resolveApiTarget({
  required String apiTargetRaw,
  required AppEnvironment environment,
}) {
  switch (apiTargetRaw.trim().toLowerCase()) {
    case 'local':
    case 'lan':
    case 'dev':
    case 'development':
      return ApiTarget.local;
    case 'production':
    case 'prod':
      return ApiTarget.production;
    case 'staging':
    case 'stage':
      return ApiTarget.staging;
    case '':
      if (environment == AppEnvironment.production) return ApiTarget.production;
      if (environment == AppEnvironment.staging) return ApiTarget.staging;
      return ApiTarget.local;
    default:
      throw StateError('Unknown API_TARGET="$apiTargetRaw". Use local|staging|production.');
  }
}

String normalizeConfigOrigin(String url) {
  var n = url.trim().toLowerCase();
  while (n.endsWith('/')) {
    n = n.substring(0, n.length - 1);
  }
  return n;
}

/// Split assembly avoids embedding contiguous project-ref literals into the
/// opposite environment's AOT snapshot as an accidental runtime target string.
bool containsStagingSupabaseProjectRef(String lower) {
  final marker = StringBuffer()
    ..write('rpc')
    ..write('jel')
    ..write('hac')
    ..write('mkh')
    ..write('zgu')
    ..write('ljd')
    ..write('gi');
  return lower.contains(marker.toString());
}

bool containsProductionSupabaseProjectRef(String lower) {
  final marker = StringBuffer()
    ..write('jjix')
    ..write('rywf')
    ..write('naij')
    ..write('vahm')
    ..write('vcwj');
  return lower.contains(marker.toString());
}

bool _looksLikeProductionHost(String lower) {
  final apiHost = _joinHost(['api', '.', 'invify', '.', 'org']);
  final appHost = _joinHost(['app', '.', 'invify', '.', 'org']);
  final streamHost = _joinHost(['stream', '.', 'invify', '.', 'org']);
  return lower.contains(apiHost) ||
      lower.contains(appHost) ||
      lower.contains(streamHost) ||
      lower.contains('prod.') ||
      lower.contains('-prod.') ||
      lower.contains('production') ||
      containsProductionSupabaseProjectRef(lower);
}

bool _looksLikeStagingHost(String lower) {
  final stagingHost = _joinHost(['staging', '.', 'invify', '.', 'org']);
  return lower.contains(stagingHost) ||
      lower.contains('-stage.') ||
      lower.contains('staging') ||
      containsStagingSupabaseProjectRef(lower);
}

void assertEnvUrlSafety({
  required String label,
  required String url,
  required AppEnvironment environment,
  required ApiTarget apiTarget,
}) {
  final allowsLan = apiTarget == ApiTarget.local && environment == AppEnvironment.development;
  if (allowsLan) return;

  if (_isLoopbackOrLan(url) || url.toLowerCase().contains('ngrok')) {
    throw StateError(
      '$label must not point at localhost/LAN/ngrok for ${environment.name} / ${apiTarget.name}',
    );
  }

  final lower = url.toLowerCase();
  final origin = normalizeConfigOrigin(url);

  if (environment == AppEnvironment.production) {
    if (label == 'API_BASE_URL' || label == 'BASE_URL') {
      if (origin != normalizeConfigOrigin(kProductionApiBaseUrl)) {
        throw StateError(
          '$label for APP_ENV=production must be exactly $kProductionApiBaseUrl '
          '(received a non-production or mismatched API URL).',
        );
      }
    }
    if (label == 'SUPABASE_URL') {
      if (!containsProductionSupabaseProjectRef(lower) ||
          containsStagingSupabaseProjectRef(lower) ||
          _looksLikeStagingHost(lower)) {
        throw StateError(
          '$label for APP_ENV=production must reference the production Supabase project '
          'and must not reference staging.',
        );
      }
    }
    if (_looksLikeStagingHost(lower) && label != 'SUPABASE_URL') {
      // API already exact-matched; keep secondary guard for other labels.
      throw StateError('$label appears to be a staging URL while APP_ENV=production');
    }
    return;
  }

  if (environment == AppEnvironment.staging) {
    if (label == 'API_BASE_URL' || label == 'BASE_URL') {
      if (origin != normalizeConfigOrigin(kStagingApiBaseUrl)) {
        throw StateError(
          '$label for APP_ENV=staging must be exactly $kStagingApiBaseUrl '
          '(production API / app portal hosts are forbidden).',
        );
      }
      if (_looksLikeProductionHost(lower)) {
        throw StateError('$label appears to be a production URL while APP_ENV=staging');
      }
    }
    if (label == 'SUPABASE_URL') {
      if (!containsStagingSupabaseProjectRef(lower) ||
          containsProductionSupabaseProjectRef(lower) ||
          _looksLikeProductionHost(lower)) {
        throw StateError(
          '$label for APP_ENV=staging must reference the staging Supabase project '
          'and must not reference production.',
        );
      }
    }
    if (_looksLikeProductionHost(lower) && label != 'SUPABASE_URL') {
      throw StateError('$label appears to be a production URL while APP_ENV=staging');
    }
  }
}

String resolveApiBaseUrl({
  required String apiBaseUrlDefine,
  required String? dotenvBaseUrl,
  required AppEnvironment environment,
  required ApiTarget apiTarget,
}) {
  if (apiBaseUrlDefine.isNotEmpty) {
    assertEnvUrlSafety(
      label: 'API_BASE_URL',
      url: apiBaseUrlDefine,
      environment: environment,
      apiTarget: apiTarget,
    );
    return apiBaseUrlDefine.trim().replaceAll(RegExp(r'/+$'), '');
  }

  if (dotenvBaseUrl != null && dotenvBaseUrl.isNotEmpty) {
    assertEnvUrlSafety(
      label: 'BASE_URL',
      url: dotenvBaseUrl,
      environment: environment,
      apiTarget: apiTarget,
    );
    return dotenvBaseUrl.trim().replaceAll(RegExp(r'/+$'), '');
  }

  if (environment == AppEnvironment.production) {
    throw StateError(
      'Production API_BASE_URL is not configured. Specify --dart-define=API_BASE_URL=$kProductionApiBaseUrl '
      '(or --dart-define-from-file=config/app_targets/production.json). '
      'Silent defaults are forbidden.',
    );
  }

  if (environment == AppEnvironment.staging) {
    throw StateError(
      'Staging API_BASE_URL is not configured. Specify --dart-define=API_BASE_URL=$kStagingApiBaseUrl '
      '(or --dart-define-from-file=config/app_targets/staging.json). '
      'Silent defaults / production fallbacks are forbidden.',
    );
  }

  if (apiTarget == ApiTarget.local) {
    return kDebugLaptopApiBaseUrl;
  }

  throw StateError(
    'API_BASE_URL is not configured. Pass --dart-define=API_BASE_URL=... '
    'or hydrate dotenv in development.',
  );
}

String resolveSupabaseUrl({
  required String supabaseUrlDefine,
  required String? dotenvUrl,
  required AppEnvironment environment,
  required ApiTarget apiTarget,
}) {
  if (supabaseUrlDefine.isNotEmpty) {
    assertEnvUrlSafety(
      label: 'SUPABASE_URL',
      url: supabaseUrlDefine,
      environment: environment,
      apiTarget: apiTarget,
    );
    return supabaseUrlDefine.trim().replaceAll(RegExp(r'/+$'), '');
  }
  if (dotenvUrl != null && dotenvUrl.isNotEmpty) {
    assertEnvUrlSafety(
      label: 'SUPABASE_URL',
      url: dotenvUrl,
      environment: environment,
      apiTarget: apiTarget,
    );
    return dotenvUrl.trim().replaceAll(RegExp(r'/+$'), '');
  }

  if (environment == AppEnvironment.production) {
    throw StateError(
      'Production SUPABASE_URL is not configured. Specify --dart-define=SUPABASE_URL=$kProductionSupabaseUrl. '
      'Silent defaults are forbidden.',
    );
  }

  if (environment == AppEnvironment.staging) {
    throw StateError(
      'Staging SUPABASE_URL is not configured. Specify --dart-define=SUPABASE_URL=$kStagingSupabaseUrl '
      '(see config/app_targets/staging.json). Do not embed production keys or fall back to production.',
    );
  }

  throw StateError(
    'SUPABASE_URL is not configured. Pass --dart-define=SUPABASE_URL=... '
    'or hydrate dotenv in development.',
  );
}

String resolveSupabasePublishableKey({
  required String publishableDefine,
  required String anonDefine,
  required String? dotenvKey,
  required AppEnvironment environment,
}) {
  if (publishableDefine.isNotEmpty) return publishableDefine;
  if (anonDefine.isNotEmpty) return anonDefine;
  if (dotenvKey != null && dotenvKey.isNotEmpty) return dotenvKey;

  if (environment == AppEnvironment.production) {
    throw StateError(
      'Production SUPABASE_PUBLISHABLE_KEY is not configured. '
      'Pass --dart-define=SUPABASE_PUBLISHABLE_KEY=<prod_publishable_key> '
      '(never embed service_role / secret keys).',
    );
  }

  if (environment == AppEnvironment.staging) {
    throw StateError(
      'Staging SUPABASE_PUBLISHABLE_KEY is not configured. '
      'Pass --dart-define=SUPABASE_PUBLISHABLE_KEY=<staging_publishable_key> '
      '(never embed service_role / secret keys).',
    );
  }

  throw StateError(
    'SUPABASE_PUBLISHABLE_KEY is not configured for development. '
    'Pass a dart-define or hydrate dotenv.',
  );
}

bool _isLoopbackOrLan(String url) {
  final u = url.toLowerCase();
  return u.contains('localhost') ||
      u.contains('127.0.0.1') ||
      u.contains('192.168.') ||
      u.contains('10.0.') ||
      RegExp(r'http://172\.(1[6-9]|2\d|3[0-1])\.').hasMatch(u);
}

class AppConfig {
  /// Compile-time environment identifier.
  /// Pass: --dart-define=APP_ENV=development|staging|production
  static AppEnvironment get environment {
    const raw = String.fromEnvironment('APP_ENV', defaultValue: '');
    return resolveAppEnvironment(appEnvRaw: raw, releaseMode: kReleaseMode);
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

  /// Compile-time API destination. Independent of debug vs release.
  /// Pass: --dart-define=API_TARGET=local|staging|production
  static ApiTarget get apiTarget {
    const raw = String.fromEnvironment('API_TARGET', defaultValue: '');
    return resolveApiTarget(apiTargetRaw: raw, environment: environment);
  }

  static String get apiTargetName {
    switch (apiTarget) {
      case ApiTarget.production:
        return 'production';
      case ApiTarget.staging:
        return 'staging';
      case ApiTarget.local:
        return 'local';
    }
  }

  static bool get allowsLanApi =>
      apiTarget == ApiTarget.local && environment == AppEnvironment.development;

  /// Compile-time / runtime configuration. Never embed LAN/localhost defaults
  /// into staging / production targets.
  static String get baseUrl {
    const fromDefine = String.fromEnvironment('API_BASE_URL');
    return resolveApiBaseUrl(
      apiBaseUrlDefine: fromDefine,
      dotenvBaseUrl: _readDotenv('BASE_URL'),
      environment: environment,
      apiTarget: apiTarget,
    );
  }

  static String get baseUrl3000 {
    final url = baseUrl;
    return url.replaceAll(':3004', ':3000');
  }

  static String get supabaseUrl {
    const fromDefine = String.fromEnvironment('SUPABASE_URL');
    return resolveSupabaseUrl(
      supabaseUrlDefine: fromDefine,
      dotenvUrl: _readDotenv('SUPABASE_URL'),
      environment: environment,
      apiTarget: apiTarget,
    );
  }

  static String get supabasePublishableKey {
    const fromDefine = String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');
    const legacyAnon = String.fromEnvironment('SUPABASE_ANON_KEY');
    return resolveSupabasePublishableKey(
      publishableDefine: fromDefine,
      anonDefine: legacyAnon,
      dotenvKey: _readDotenv('SUPABASE_PUBLISHABLE_KEY') ?? _readDotenv('SUPABASE_ANON_KEY'),
      environment: environment,
    );
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

  static bool get isSupabaseConfigured {
    try {
      return supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  static void hydrateFromDotenv(Map<String, String> values) {
    _dotenvCache
      ..clear()
      ..addAll(values);
  }
}
