import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/core/utils/app_config.dart';

void main() {
  group('AppConfig Environment & Safety', () {
    test('default environment in test is development', () {
      expect(AppConfig.environment, AppEnvironment.development);
      expect(AppConfig.isDevelopment, isTrue);
      expect(AppConfig.isProduction, isFalse);
      expect(AppConfig.isStaging, isFalse);
    });

    test('default test environment allows LAN API; Supabase requires explicit config', () {
      expect(AppConfig.allowsLanApi, isTrue);
      expect(AppConfig.baseUrl, isNotEmpty);
      expect(
        () => AppConfig.supabaseUrl,
        throwsA(isA<StateError>()),
      );
      expect(
        () => AppConfig.supabasePublishableKey,
        throwsA(isA<StateError>()),
      );
    });

    test('isSupabaseConfigured returns false when Supabase defines are absent', () {
      expect(AppConfig.isSupabaseConfigured, isFalse);
    });

    test('hydrateFromDotenv can supply development Supabase config', () {
      AppConfig.hydrateFromDotenv({
        'SUPABASE_URL': 'https://example.supabase.co',
        'SUPABASE_PUBLISHABLE_KEY': 'test-publishable-key',
      });
      expect(AppConfig.supabaseUrl, 'https://example.supabase.co');
      expect(AppConfig.supabasePublishableKey, 'test-publishable-key');
      expect(AppConfig.isSupabaseConfigured, isTrue);
      AppConfig.hydrateFromDotenv({});
    });

    test('hydrateFromDotenv updates cache', () {
      AppConfig.hydrateFromDotenv({'TEST_KEY': '123'});
      expect(AppConfig.featureEnabled('NON_EXISTENT_FLAG'), isFalse);
    });
  });

  group('Phase 32F.4 bidirectional environment isolation', () {
    test('explicit production APP_ENV resolves to production', () {
      expect(
        resolveAppEnvironment(appEnvRaw: 'production', releaseMode: true),
        AppEnvironment.production,
      );
      expect(
        resolveAppEnvironment(appEnvRaw: 'prod', releaseMode: false),
        AppEnvironment.production,
      );
    });

    test('explicit staging APP_ENV resolves to staging', () {
      expect(
        resolveAppEnvironment(appEnvRaw: 'staging', releaseMode: true),
        AppEnvironment.staging,
      );
    });

    test('MISSING APP_ENV in release fails closed', () {
      expect(
        () => resolveAppEnvironment(appEnvRaw: '', releaseMode: true),
        throwsA(
          isA<StateError>().having(
            (e) => e.message,
            'message',
            contains('APP_ENV'),
          ),
        ),
      );
    });

    test('debug without APP_ENV remains development', () {
      expect(
        resolveAppEnvironment(appEnvRaw: '', releaseMode: false),
        AppEnvironment.development,
      );
    });

    test('STAGING VALID API + Supabase PASS', () {
      expect(
        resolveApiBaseUrl(
          apiBaseUrlDefine: 'https://staging.invify.org',
          dotenvBaseUrl: null,
          environment: AppEnvironment.staging,
          apiTarget: ApiTarget.staging,
        ),
        'https://staging.invify.org',
      );
      expect(
        resolveSupabaseUrl(
          supabaseUrlDefine: 'https://rpcjelhacmkhzguljdgi.supabase.co',
          dotenvUrl: null,
          environment: AppEnvironment.staging,
          apiTarget: ApiTarget.staging,
        ),
        'https://rpcjelhacmkhzguljdgi.supabase.co',
      );
    });

    test('STAGING + PRODUCTION API FAIL', () {
      expect(
        () => resolveApiBaseUrl(
          apiBaseUrlDefine: 'https://api.invify.org',
          dotenvBaseUrl: null,
          environment: AppEnvironment.staging,
          apiTarget: ApiTarget.staging,
        ),
        throwsA(isA<StateError>()),
      );
      expect(
        () => resolveApiBaseUrl(
          apiBaseUrlDefine: 'https://app.invify.org',
          dotenvBaseUrl: null,
          environment: AppEnvironment.staging,
          apiTarget: ApiTarget.staging,
        ),
        throwsA(isA<StateError>()),
      );
    });

    test('STAGING + PRODUCTION SUPABASE FAIL', () {
      expect(
        () => resolveSupabaseUrl(
          supabaseUrlDefine: 'https://jjixrywfnaijvahmvcwj.supabase.co',
          dotenvUrl: null,
          environment: AppEnvironment.staging,
          apiTarget: ApiTarget.staging,
        ),
        throwsA(isA<StateError>()),
      );
    });

    test('STAGING MISSING API URL FAIL', () {
      expect(
        () => resolveApiBaseUrl(
          apiBaseUrlDefine: '',
          dotenvBaseUrl: null,
          environment: AppEnvironment.staging,
          apiTarget: ApiTarget.staging,
        ),
        throwsA(
          isA<StateError>().having(
            (e) => e.message,
            'message',
            contains('API_BASE_URL'),
          ),
        ),
      );
    });

    test('STAGING MISSING Supabase FAIL', () {
      expect(
        () => resolveSupabaseUrl(
          supabaseUrlDefine: '',
          dotenvUrl: null,
          environment: AppEnvironment.staging,
          apiTarget: ApiTarget.staging,
        ),
        throwsA(isA<StateError>()),
      );
    });

    test('PRODUCTION VALID API + Supabase PASS', () {
      expect(
        resolveApiBaseUrl(
          apiBaseUrlDefine: 'https://api.invify.org',
          dotenvBaseUrl: null,
          environment: AppEnvironment.production,
          apiTarget: ApiTarget.production,
        ),
        'https://api.invify.org',
      );
      expect(
        resolveSupabaseUrl(
          supabaseUrlDefine: 'https://jjixrywfnaijvahmvcwj.supabase.co',
          dotenvUrl: null,
          environment: AppEnvironment.production,
          apiTarget: ApiTarget.production,
        ),
        'https://jjixrywfnaijvahmvcwj.supabase.co',
      );
    });

    test('PRODUCTION + STAGING API FAIL', () {
      expect(
        () => resolveApiBaseUrl(
          apiBaseUrlDefine: 'https://staging.invify.org',
          dotenvBaseUrl: null,
          environment: AppEnvironment.production,
          apiTarget: ApiTarget.production,
        ),
        throwsA(isA<StateError>()),
      );
    });

    test('PRODUCTION + STAGING SUPABASE FAIL', () {
      expect(
        () => resolveSupabaseUrl(
          supabaseUrlDefine: 'https://rpcjelhacmkhzguljdgi.supabase.co',
          dotenvUrl: null,
          environment: AppEnvironment.production,
          apiTarget: ApiTarget.production,
        ),
        throwsA(isA<StateError>()),
      );
    });

    test('PRODUCTION MISSING API URL FAIL', () {
      expect(
        () => resolveApiBaseUrl(
          apiBaseUrlDefine: '',
          dotenvBaseUrl: null,
          environment: AppEnvironment.production,
          apiTarget: ApiTarget.production,
        ),
        throwsA(
          isA<StateError>().having(
            (e) => e.message,
            'message',
            contains('API_BASE_URL'),
          ),
        ),
      );
    });

    test('PRODUCTION MISSING Supabase FAIL', () {
      expect(
        () => resolveSupabaseUrl(
          supabaseUrlDefine: '',
          dotenvUrl: null,
          environment: AppEnvironment.production,
          apiTarget: ApiTarget.production,
        ),
        throwsA(isA<StateError>()),
      );
    });

    test('PRODUCTION MISSING publishable key fails closed', () {
      expect(
        () => resolveSupabasePublishableKey(
          publishableDefine: '',
          anonDefine: '',
          dotenvKey: null,
          environment: AppEnvironment.production,
        ),
        throwsA(isA<StateError>()),
      );
    });

    test('STAGING MISSING publishable key fails closed', () {
      expect(
        () => resolveSupabasePublishableKey(
          publishableDefine: '',
          anonDefine: '',
          dotenvKey: null,
          environment: AppEnvironment.staging,
        ),
        throwsA(isA<StateError>()),
      );
    });

    test('canonical constants are validation anchors only', () {
      expect(kStagingApiBaseUrl, 'https://staging.invify.org');
      expect(kProductionApiBaseUrl, 'https://api.invify.org');
      expect(containsStagingSupabaseProjectRef(kStagingSupabaseUrl), isTrue);
      expect(containsProductionSupabaseProjectRef(kProductionSupabaseUrl), isTrue);
      expect(containsProductionSupabaseProjectRef(kStagingSupabaseUrl), isFalse);
      expect(containsStagingSupabaseProjectRef(kProductionSupabaseUrl), isFalse);
    });

    test('kReleaseMode constant is available to tests', () {
      expect(kReleaseMode, isFalse);
    });
  });
}
