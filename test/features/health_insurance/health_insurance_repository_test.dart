// test/features/health_insurance/health_insurance_repository_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/core/services/finance_api_client.dart';
import 'package:involve_app/features/health_insurance/data/repositories/health_insurance_repository_impl.dart';
import 'package:involve_app/features/health_insurance/domain/entities/health_insurance_entities.dart';

void main() {
  group('HealthInsuranceRepositoryImpl Tests', () {
    late FinanceApiClient client;
    late HealthInsuranceRepositoryImpl repository;

    setUp(() {
      client = FinanceApiClient(
        baseUrl: 'http://localhost:3000',
        getToken: () async => 'mock-token',
        getTenantId: () async => 'tenant-123',
      );
      repository = HealthInsuranceRepositoryImpl(client);
    });

    test('repository instantiates successfully', () {
      expect(repository, isNotNull);
    });

    test('getTenantPlanOffers extracts list properly', () async {
      // Test mapping from raw backend payload
      final mockData = {
        'data': [
          {
            'id': 'offer-1',
            'default_funding': 'self_funded',
            'shared_split': 0,
            'is_active': true,
            'hw_plan_versions': {
              'id': 'ver-1',
              'version': '1.0',
              'premium_minor': 3500000,
              'currency': 'NGN',
              'billing_frequency': 'annual',
              'member_categories': ['student'],
              'benefits': {},
              'exclusions': [],
              'hw_plans': {
                'id': 'plan-1',
                'name': 'Student Care Plus',
                'hw_providers': {'display_name': 'Hygeia HMO'},
              },
            },
          }
        ]
      };

      final offers = (mockData['data'] as List)
          .map((e) => TenantPlanOffer.fromJson(e as Map<String, dynamic>))
          .toList();

      expect(offers.length, 1);
      expect(offers.first.plan.name, 'Student Care Plus');
      expect(offers.first.plan.premiumNaira, 35000.0);
    });

    test('getGuardianChildren extracts children list properly', () async {
      final mockData = {
        'children': [
          {
            'id': 'link-1',
            'relationship': 'father',
            'status': 'verified',
            'can_view_coverage': true,
            'students': {
              'id': 'std-1',
              'first_name': 'Tola',
              'last_name': 'Ade',
              'admission_number': 'SCH/001',
              'current_class': 'JSS 1',
            },
          }
        ]
      };

      final children = (mockData['children'] as List)
          .map((e) => GuardianChild.fromJson(e as Map<String, dynamic>))
          .toList();

      expect(children.length, 1);
      expect(children.first.fullName, 'Tola Ade');
      expect(children.first.isVerified, true);
    });
  });
}
