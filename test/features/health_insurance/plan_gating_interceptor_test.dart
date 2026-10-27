// test/features/health_insurance/plan_gating_interceptor_test.dart
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/core/services/finance_api_client.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('PlanGatingInterceptor Tests', () {

    test('isPermittedMobileHealthPath accurately identifies mobile health endpoints', () {
      expect(
        PlanGatingInterceptor.isPermittedMobileHealthPath('/api/v1/health-insurance/settings'),
        isTrue,
      );
      expect(
        PlanGatingInterceptor.isPermittedMobileHealthPath('/api/v1/health-insurance/overview'),
        isTrue,
      );
      expect(
        PlanGatingInterceptor.isPermittedMobileHealthPath('/api/v1/health-insurance/tenant-offers'),
        isTrue,
      );
      expect(
        PlanGatingInterceptor.isPermittedMobileHealthPath('/api/v1/health-insurance/guardian/children'),
        isTrue,
      );
      expect(
        PlanGatingInterceptor.isPermittedMobileHealthPath('/api/v1/health-insurance/enrolments'),
        isTrue,
      );
    });

    test('isPermittedMobileHealthPath rejects platform, hmo-portal, and webhooks endpoints', () {
      expect(
        PlanGatingInterceptor.isPermittedMobileHealthPath('/api/v1/health-insurance/platform/overview'),
        isFalse,
      );
      expect(
        PlanGatingInterceptor.isPermittedMobileHealthPath('/api/v1/health-insurance/platform/tenants'),
        isFalse,
      );
      expect(
        PlanGatingInterceptor.isPermittedMobileHealthPath('/api/v1/health-insurance/hmo-portal/overview'),
        isFalse,
      );
      expect(
        PlanGatingInterceptor.isPermittedMobileHealthPath('/api/v1/health-insurance/provider-webhooks/mhmo'),
        isFalse,
      );
      expect(
        PlanGatingInterceptor.isPermittedMobileHealthPath('/api/v1/finance/invoices'),
        isFalse,
      );
    });

    test('checkHasHealthInsuranceEntitlement returns true when Bearer token and Tenant-ID are present', () async {
      final options = RequestOptions(
        path: '/api/v1/health-insurance/settings',
        headers: {
          'Authorization': 'Bearer valid.jwt.token',
          'X-Tenant-ID': 'tenant-uuid-1234',
        },
      );

      final hasEntitlement = await PlanGatingInterceptor.checkHasHealthInsuranceEntitlement(options);
      expect(hasEntitlement, isTrue);
    });

    test('checkHasHealthInsuranceEntitlement returns false when unauthenticated', () async {
      final options = RequestOptions(
        path: '/api/v1/health-insurance/settings',
        headers: {
          'X-Tenant-ID': 'tenant-uuid-1234',
        },
      );

      final hasEntitlement = await PlanGatingInterceptor.checkHasHealthInsuranceEntitlement(options);
      expect(hasEntitlement, isFalse);
    });

    test('checkHasHealthInsuranceEntitlement permits guardian/children with Bearer token alone', () async {
      final options = RequestOptions(
        path: '/api/v1/health-insurance/guardian/children',
        headers: {
          'Authorization': 'Bearer valid.jwt.token',
        },
      );

      final hasEntitlement = await PlanGatingInterceptor.checkHasHealthInsuranceEntitlement(options);
      expect(hasEntitlement, isTrue);
    });
  });
}
