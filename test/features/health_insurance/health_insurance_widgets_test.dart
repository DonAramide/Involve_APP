// test/features/health_insurance/health_insurance_widgets_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/features/health_insurance/domain/entities/health_insurance_entities.dart';
import 'package:involve_app/features/health_insurance/domain/repositories/health_insurance_repository.dart';
import 'package:involve_app/features/health_insurance/presentation/bloc/health_insurance_bloc.dart';
import 'package:involve_app/features/health_insurance/presentation/pages/enrolment_flow_page.dart';
import 'package:involve_app/features/health_insurance/presentation/widgets/coverage_status_badge.dart';
import 'package:involve_app/features/health_insurance/presentation/widgets/unverified_warning_banner.dart';
import 'package:involve_app/features/health_insurance/presentation/widgets/plan_card.dart';
import 'package:involve_app/features/health_insurance/presentation/widgets/child_coverage_card.dart';
import 'package:involve_app/features/health_insurance/presentation/widgets/claim_card.dart';

void main() {
  Widget wrapWidget(Widget child) {
    return MaterialApp(
      home: Scaffold(
        body: child,
      ),
    );
  }

  group('Health Insurance Widgets Tests', () {
    testWidgets('CoverageStatusBadge renders Active Coverage when policy is active', (tester) async {
      await tester.pumpWidget(wrapWidget(
        const CoverageStatusBadge(
          status: EnrolmentLifecycleStatus.active,
          policyStatus: PolicyLifecycleStatus.active,
        ),
      ));

      expect(find.text('Active Coverage'), findsOneWidget);
    });

    testWidgets('CoverageStatusBadge renders Awaiting Insurer Activation when pending', (tester) async {
      await tester.pumpWidget(wrapWidget(
        const CoverageStatusBadge(
          status: EnrolmentLifecycleStatus.awaitingInsurerActivation,
          policyStatus: PolicyLifecycleStatus.pendingActivation,
        ),
      ));

      expect(find.text('Awaiting Insurer Activation'), findsOneWidget);
    });

    testWidgets('CoverageStatusBadge renders Pending School Verification when status is pending_verification', (tester) async {
      await tester.pumpWidget(wrapWidget(
        const CoverageStatusBadge(
          status: EnrolmentLifecycleStatus.pendingVerification,
        ),
      ));

      expect(find.text('Pending School Verification'), findsOneWidget);
    });

    testWidgets('UnverifiedWarningBanner displays restriction notice and child name', (tester) async {
      await tester.pumpWidget(wrapWidget(
        const UnverifiedWarningBanner(
          studentName: 'Zainab Danjuma',
          isRejected: false,
        ),
      ));

      expect(find.text('Relationship Pending School Verification'), findsOneWidget);
      expect(find.textContaining('Zainab Danjuma'), findsOneWidget);
      expect(find.textContaining('health coverage details, policy documents, and medical claims remain locked'), findsOneWidget);
    });

    testWidgets('PlanCard displays provider name, plan title and formatted annual premium', (tester) async {
      const offer = TenantPlanOffer(
        id: 'offer-1',
        defaultFunding: 'self_funded',
        sharedSplit: 0,
        isActive: true,
        planVersionId: 'ver-1',
        plan: HealthPlan(
          id: 'plan-1',
          code: 'SCH-GOLD',
          name: 'Gold Student Healthcare',
          status: 'active',
          providerId: 'prov-1',
          providerName: 'Reliance HMO',
          planVersionId: 'ver-1',
          version: '1.0',
          premiumMinor: 4500000, // ₦45,000
          currency: 'NGN',
          billingFrequency: 'annual',
          memberCategories: ['student'],
          benefits: {'inpatient': true, 'dental': true},
          exclusions: ['Cosmetic surgery'],
        ),
      );

      await tester.pumpWidget(wrapWidget(
        const PlanCard(offer: offer),
      ));

      expect(find.text('RELIANCE HMO'), findsOneWidget);
      expect(find.text('Gold Student Healthcare'), findsOneWidget);
      expect(find.text('₦45,000'), findsOneWidget);
      expect(find.text('/annual'), findsOneWidget);
      expect(find.text('Inpatient Care'), findsOneWidget);
    });

    testWidgets('ChildCoverageCard displays unverified banner message for pending link', (tester) async {
      const unverifiedChild = GuardianChild(
        linkId: 'link-unv-1',
        relationship: 'mother',
        status: GuardianVerificationStatus.pendingVerification,
        canViewCoverage: false,
        canViewPremiums: false,
        canPayPremiums: false,
        canManageEnrolment: false,
        studentId: 'std-99',
        firstName: 'Fatimah',
        lastName: 'Bello',
        admissionNumber: 'SCH/2026/888',
        currentClass: 'JSS 1C',
        tenantId: 'ten-1',
        tenantName: 'Springfield Academy',
      );

      await tester.pumpWidget(wrapWidget(
        ChildCoverageCard(
          child: unverifiedChild,
          onTap: () {},
        ),
      ));

      expect(find.text('Fatimah Bello'), findsOneWidget);
      expect(find.text('Pending'), findsOneWidget);
      expect(find.text('Details restricted until verification'), findsOneWidget);
    });

    testWidgets('ClaimCard displays reference, facility, and status label', (tester) async {
      const claim = HealthClaim(
        id: 'clm-88',
        claimReference: 'CLM-2026-9081',
        recordType: 'claim',
        status: ClaimStatus.preAuthorized,
        authorisedAmountMinor: 1500000, // ₦15,000
        currency: 'NGN',
        facilityName: 'Cedars Health Centre',
        memberName: 'Fatimah Bello',
      );

      await tester.pumpWidget(wrapWidget(
        const ClaimCard(claim: claim),
      ));

      expect(find.text('CLM-2026-9081'), findsOneWidget);
      expect(find.text('Pre-Authorized'), findsOneWidget);
      expect(find.text('Cedars Health Centre'), findsOneWidget);
      expect(find.text('₦15,000.00'), findsOneWidget);
    });

    testWidgets('EnrolmentFlowPage renders class grouping and allows multi-selection', (tester) async {
      final fakeRepo = _WidgetTestFakeRepo();
      final bloc = HealthInsuranceBloc(repository: fakeRepo);
      bloc.emit(bloc.state.copyWith(
        offers: fakeRepo.testOffers,
        guardianChildren: fakeRepo.testChildren,
      ));

      await tester.pumpWidget(
        MaterialApp(
          home: BlocProvider.value(
            value: bloc,
            child: const EnrolmentFlowPage(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('1. Select Beneficiaries'), findsOneWidget);
      expect(find.text('Primary 1'), findsOneWidget);
      expect(find.text('Tolu Balogun'), findsOneWidget);
      expect(find.text('Primary 2'), findsOneWidget);
      expect(find.text('Kemi Balogun'), findsOneWidget);

      // Verify Select All button exists
      expect(find.textContaining('Select All'), findsOneWidget);

      // Tap Select All
      await tester.tap(find.textContaining('Select All'));
      await tester.pumpAndSettle();

      expect(find.text('2 Selected'), findsOneWidget);
      expect(find.text('SUBMIT ENROLMENT (2 STUDENTS)'), findsOneWidget);
    });
  });
}

class _WidgetTestFakeRepo implements HealthInsuranceRepository {
  final testOffers = [
    const TenantPlanOffer(
      id: 'offer-1',
      defaultFunding: 'self_funded',
      sharedSplit: 0,
      isActive: true,
      planVersionId: 'ver-1',
      plan: HealthPlan(
        id: 'plan-1',
        code: 'STD-CARE',
        name: 'Standard Student Plan',
        status: 'active',
        providerId: 'prov-1',
        providerName: 'Hygeia HMO',
        planVersionId: 'ver-1',
        version: '1.0',
        premiumMinor: 3000000,
        currency: 'NGN',
        billingFrequency: 'annual',
        memberCategories: ['student'],
        benefits: {'inpatient': true},
        exclusions: [],
      ),
    ),
  ];

  final testChildren = [
    const GuardianChild(
      linkId: 'link-1',
      relationship: 'father',
      status: GuardianVerificationStatus.verified,
      canViewCoverage: true,
      canViewPremiums: true,
      canPayPremiums: true,
      canManageEnrolment: true,
      studentId: 'std-1',
      firstName: 'Tolu',
      lastName: 'Balogun',
      admissionNumber: 'SCH/2026/001',
      currentClass: 'Primary 1',
      tenantId: 'ten-1',
      tenantName: 'Apex Academy',
    ),
    const GuardianChild(
      linkId: 'link-2',
      relationship: 'father',
      status: GuardianVerificationStatus.verified,
      canViewCoverage: true,
      canViewPremiums: true,
      canPayPremiums: true,
      canManageEnrolment: true,
      studentId: 'std-2',
      firstName: 'Kemi',
      lastName: 'Balogun',
      admissionNumber: 'SCH/2026/002',
      currentClass: 'Primary 2',
      tenantId: 'ten-1',
      tenantName: 'Apex Academy',
    ),
  ];

  @override
  Future<HealthTenantSettings> getSettings() async => const HealthTenantSettings(
        tenantId: 'ten-1',
        enabled: true,
        assignmentMode: 'LOCKED',
        assignmentSource: 'CODE_INHERITED',
        canChangeProvider: false,
        resolvedRole: HealthUserRole.admin,
        permittedRoles: [HealthUserRole.admin],
        canManageSettings: true,
      );

  @override
  Future<HealthOverviewMetrics> getOverviewMetrics() async => const HealthOverviewMetrics(
        totalMembers: 10,
        enrolledCount: 5,
        activeCoverageCount: 5,
        awaitingVerificationCount: 0,
        awaitingActivationCount: 0,
        incompleteCount: 0,
        expiringSoonCount: 0,
        billedMinor: 0,
        collectedMinor: 0,
        outstandingMinor: 0,
        claimsCount: 0,
        claimsValueMinor: 0,
      );

  @override
  Future<List<TenantPlanOffer>> getTenantPlanOffers() async => testOffers;

  @override
  Future<List<GuardianChild>> getGuardianChildren() async => testChildren;

  @override
  Future<List<HealthEnrolment>> getEnrolments({String? status, String? memberId, int page = 1, int limit = 50}) async => [];

  @override
  Future<HealthEnrolment> createEnrolment({
    required String memberId,
    required String planVersionId,
    required String periodStart,
    required String periodEnd,
  }) async =>
      const HealthEnrolment(
        id: 'enr-new',
        status: EnrolmentLifecycleStatus.enrolmentPending,
        memberId: 'std-1',
        memberCategory: 'student',
        memberName: 'Tolu Balogun',
        admissionNumber: 'SCH/2026/001',
        planName: 'Standard Student Plan',
        providerName: 'Hygeia HMO',
        premiumMinor: 3000000,
      );

  @override
  Future<List<HealthClaim>> getClaims({String? policyId}) async => [];

  @override
  Future<Map<String, dynamic>> initiatePremiumPayment({required String invoiceId, required String paymentMethod}) async => {};

  @override
  Future<Map<String, dynamic>> simulateSandboxActivation(String enrolmentId) async => {};
}
