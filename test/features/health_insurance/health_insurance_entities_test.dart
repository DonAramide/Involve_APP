// test/features/health_insurance/health_insurance_entities_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/features/health_insurance/domain/entities/health_insurance_entities.dart';

void main() {
  group('Health Insurance Entities Unit Tests', () {
    test('HealthProvider parses from JSON correctly', () {
      final json = {
        'id': 'prov-1',
        'code': 'HYGEIA',
        'display_name': 'Hygeia HMO',
        'licence_reference': 'NHIS/HMO/002',
        'integration_status': 'active',
      };

      final provider = HealthProvider.fromJson(json);
      expect(provider.id, 'prov-1');
      expect(provider.code, 'HYGEIA');
      expect(provider.displayName, 'Hygeia HMO');
      expect(provider.licenceReference, 'NHIS/HMO/002');
      expect(provider.integrationStatus, 'active');
    });

    test('HealthPlan calculates premium in Naira from minor kobo', () {
      final json = {
        'id': 'plan-1',
        'code': 'SCH-BASIC',
        'name': 'Basic Student Care',
        'status': 'active',
        'hw_providers': {'id': 'prov-1', 'display_name': 'Hygeia HMO'},
        'hw_plan_versions': [
          {
            'id': 'ver-1',
            'version': '1.0',
            'premium_minor': 3500000, // 35,000 NGN in kobo
            'currency': 'NGN',
            'billing_frequency': 'annual',
            'member_categories': ['student'],
            'benefits': {'inpatient': true, 'outpatient': true},
            'exclusions': ['Cosmetic surgery'],
          }
        ],
      };

      final plan = HealthPlan.fromJson(json);
      expect(plan.name, 'Basic Student Care');
      expect(plan.premiumMinor, 3500000);
      expect(plan.premiumNaira, 35000.0);
      expect(plan.exclusions.length, 1);
      expect(plan.memberCategories, contains('student'));
    });

    test('TenantPlanOffer parses nested plan version and provider details', () {
      final json = {
        'id': 'offer-1',
        'default_funding': 'self_funded',
        'shared_split': 20,
        'is_active': true,
        'hw_plan_versions': {
          'id': 'ver-10',
          'version': '2.1',
          'premium_minor': 5000000,
          'currency': 'NGN',
          'billing_frequency': 'annual',
          'member_categories': ['student', 'staff'],
          'benefits': {'emergency': true},
          'exclusions': [],
          'hw_plans': {
            'id': 'plan-10',
            'code': 'COMPREHENSIVE',
            'name': 'Comprehensive Gold',
            'hw_providers': {'id': 'prov-2', 'display_name': 'AXA Mansard Health'},
          },
        },
      };

      final offer = TenantPlanOffer.fromJson(json);
      expect(offer.id, 'offer-1');
      expect(offer.sharedSplit, 20);
      expect(offer.plan.name, 'Comprehensive Gold');
      expect(offer.plan.providerName, 'AXA Mansard Health');
      expect(offer.plan.premiumNaira, 50000.0);
    });

    test('GuardianChild detects verification status accurately', () {
      final verifiedJson = {
        'id': 'link-1',
        'relationship': 'father',
        'status': 'verified',
        'can_view_coverage': true,
        'students': {
          'id': 'std-101',
          'first_name': 'Chinedu',
          'last_name': 'Okafor',
          'admission_number': 'SCH/2026/044',
          'current_class': 'JSS 2A',
          'tenants': {'id': 'ten-1', 'name': 'Greenfield College'},
        },
      };

      final childVerified = GuardianChild.fromJson(verifiedJson);
      expect(childVerified.fullName, 'Chinedu Okafor');
      expect(childVerified.isVerified, true);
      expect(childVerified.status, GuardianVerificationStatus.verified);

      final unverifiedJson = {
        'id': 'link-2',
        'relationship': 'mother',
        'status': 'pending_verification',
        'students': {
          'id': 'std-102',
          'first_name': 'Amara',
          'last_name': 'Okafor',
          'admission_number': 'SCH/2026/099',
          'current_class': 'Primary 4B',
        },
      };

      final childUnverified = GuardianChild.fromJson(unverifiedJson);
      expect(childUnverified.isVerified, false);
      expect(childUnverified.status, GuardianVerificationStatus.pendingVerification);
    });

    test('HealthEnrolment properly reflects active policy vs awaiting activation', () {
      final activeJson = {
        'id': 'enr-1',
        'status': 'active',
        'hw_members': {
          'id': 'mem-1',
          'member_category': 'student',
          'students': {'first_name': 'Emeka', 'last_name': 'Eze', 'admission_number': 'ADM-100'},
        },
        'hw_plan_versions': {
          'premium_minor': 2500000,
          'hw_plans': {
            'name': 'Student Care',
            'hw_providers': {'display_name': 'Leadway Health'},
          },
        },
        'hw_policies': [
          {
            'id': 'pol-1',
            'policy_number': 'POL-LDW-88219',
            'status': 'active',
          }
        ],
      };

      final enrolmentActive = HealthEnrolment.fromJson(activeJson);
      expect(enrolmentActive.isCoverageActive, true);
      expect(enrolmentActive.policyNumber, 'POL-LDW-88219');
      expect(enrolmentActive.status, EnrolmentLifecycleStatus.active);
      expect(enrolmentActive.policyStatus, PolicyLifecycleStatus.active);

      final pendingActivationJson = {
        'id': 'enr-2',
        'status': 'awaiting_insurer_activation',
        'hw_members': {
          'id': 'mem-2',
          'member_category': 'student',
          'students': {'first_name': 'Tola', 'last_name': 'Ade', 'admission_number': 'ADM-200'},
        },
        'hw_policies': [
          {
            'id': 'pol-2',
            'policy_number': 'POL-PENDING',
            'status': 'pending_activation',
          }
        ],
      };

      final enrolmentPending = HealthEnrolment.fromJson(pendingActivationJson);
      expect(enrolmentPending.isCoverageActive, false);
      expect(enrolmentPending.status, EnrolmentLifecycleStatus.awaitingInsurerActivation);
      expect(enrolmentPending.policyStatus, PolicyLifecycleStatus.pendingActivation);
    });

    test('HealthOverviewMetrics parses financial figures and computes coverage percentage', () {
      final json = {
        'totalMembers': 500,
        'enrolledCount': 450,
        'activeCoverageCount': 400,
        'awaitingVerificationCount': 30,
        'awaitingActivationCount': 20,
        'incompleteCount': 10,
        'expiringSoonCount': 15,
        'billedMinor': 1250000000, // ₦12,500,000
        'collectedMinor': 1000000000, // ₦10,000,000
        'outstandingMinor': 250000000, // ₦2,500,000
        'claimsCount': 85,
        'claimsValueMinor': 340000000, // ₦3,400,000
      };

      final metrics = HealthOverviewMetrics.fromJson(json);
      expect(metrics.totalMembers, 500);
      expect(metrics.activeCoverageCount, 400);
      expect(metrics.coverageRatePercentage, 80.0);
      expect(metrics.billedNaira, 12500000.0);
      expect(metrics.collectedNaira, 10000000.0);
      expect(metrics.outstandingNaira, 2500000.0);
      expect(metrics.claimsValueNaira, 3400000.0);
    });
  });
}
