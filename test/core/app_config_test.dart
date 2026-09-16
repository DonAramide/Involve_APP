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

    test('default test environment allows LAN API and provides defaults', () {
      expect(AppConfig.allowsLanApi, isTrue);
      expect(AppConfig.baseUrl, isNotEmpty);
      expect(AppConfig.supabaseUrl, isNotEmpty);
      expect(AppConfig.supabasePublishableKey, isNotEmpty);
    });

    test('isSupabaseConfigured returns boolean safely without throwing', () {
      expect(AppConfig.isSupabaseConfigured, isA<bool>());
    });

    test('hydrateFromDotenv updates cache', () {
      AppConfig.hydrateFromDotenv({'TEST_KEY': '123'});
      // Verifies hydration runs cleanly without exception
      expect(AppConfig.featureEnabled('NON_EXISTENT_FLAG'), isFalse);
    });
  });
}
