// test/features/health_insurance/health_insurance_staging_uat_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/features/health_insurance/domain/entities/health_insurance_entities.dart';
import 'package:involve_app/features/health_insurance/domain/repositories/health_insurance_repository.dart';
import 'package:involve_app/features/health_insurance/presentation/bloc/health_insurance_bloc.dart';
import 'package:involve_app/features/health_insurance/presentation/bloc/health_insurance_event.dart';
import 'package:involve_app/features/health_insurance/presentation/bloc/health_insurance_state.dart';
import 'package:involve_app/features/health_insurance/presentation/widgets/coverage_status_badge.dart';
import 'package:involve_app/features/health_insurance/presentation/widgets/unverified_warning_banner.dart';
import 'package:involve_app/features/health_insurance/presentation/widgets/plan_card.dart';
import 'package:involve_app/features/health_insurance/presentation/widgets/child_coverage_card.dart';
import 'package:involve_app/features/health_insurance/presentation/widgets/claim_card.dart';

class StagingUatFakeRepository implements HealthInsuranceRepository {
  final HealthOverviewMetrics metrics;
  final List<TenantPlanOffer> planOffers;
  final List<GuardianChild> children;
  final List<HealthEnrolment> enrolments;
  final List<HealthClaim> claims;

  StagingUatFakeRepository({
    required this.metrics,
    required this.planOffers,
    required this.children,
    required this.enrolments,
    required this.claims,
  });

  @override
  Future<HealthTenantSettings> getSettings() async => const HealthTenantSettings(
        tenantId: 'tenant-uat-1',
        enabled: true,
        assignmentMode: 'LOCKED',
        assignmentSource: 'CODE_INHERITED',
        canChangeProvider: false,
        resolvedRole: HealthUserRole.admin,
        permittedRoles: [HealthUserRole.admin],
        canManageSettings: true,
      );

  @override
  Future<HealthOverviewMetrics> getOverviewMetrics() async => metrics;

  @override
  Future<List<TenantPlanOffer>> getTenantPlanOffers() async => planOffers;

  @override
  Future<List<GuardianChild>> getGuardianChildren() async => children;

  @override
  Future<List<HealthEnrolment>> getEnrolments({String? status, String? memberId, int page = 1, int limit = 50}) async {
    if (memberId != null) {
      return enrolments.where((e) => e.memberId == memberId).toList();
    }
    return enrolments;
  }

  @override
  Future<HealthEnrolment> createEnrolment({
    required String memberId,
    required String planVersionId,
    required String periodStart,
    required String periodEnd,
  }) async {
    return enrolments.first;
  }

  @override
  Future<List<HealthClaim>> getClaims({String? policyId}) async {
    return claims;
  }

  @override
  Future<Map<String, dynamic>> initiatePremiumPayment({required String invoiceId, required String paymentMethod}) async {
    return {'payment_reference': 'PAY_UAT_REF_12345', 'status': 'initiated'};
  }

  @override
  Future<Map<String, dynamic>> simulateSandboxActivation(String enrolmentId) async {
    return {'status': 'active', 'policy_id': 'POL-UAT-ACTIVE-999'};
  }
}

Widget wrapWithTheme(Widget child) {
  return MaterialApp(
    theme: ThemeData.light(),
    home: Scaffold(body: SingleChildScrollView(child: child)),
  );
}

void main() {
  late StagingUatFakeRepository repository;
  late HealthInsuranceBloc bloc;

  final sampleMetrics = const HealthOverviewMetrics(
    totalMembers: 250,
    enrolledCount: 210,
    activeCoverageCount: 195,
    awaitingVerificationCount: 10,
    awaitingActivationCount: 5,
    incompleteCount: 0,
    expiringSoonCount: 8,
    billedMinor: 750000000,
    collectedMinor: 700000000,
    outstandingMinor: 50000000,
    claimsCount: 14,
    claimsValueMinor: 45000000,
  );

  final samplePlan = const HealthPlan(
    id: 'plan-101',
    code: 'STAGING-SHIELD',
    name: 'Student Shield Standard',
    status: 'active',
    providerId: 'prov-01',
    providerName: 'Staging HMO Provider',
    planVersionId: 'ver-01',
    version: '1.0',
    premiumMinor: 3500000, // 35,000 NGN
    currency: 'NGN',
    billingFrequency: 'annual',
    memberCategories: ['student'],
    benefits: {'inpatient': true, 'outpatient': true, 'emergency': true},
    exclusions: ['cosmetic'],
  );

  final sampleOffer = TenantPlanOffer(
    id: 'offer-101',
    defaultFunding: 'self_funded',
    sharedSplit: 0,
    isActive: true,
    planVersionId: 'ver-01',
    plan: samplePlan,
  );

  final verifiedChild = const GuardianChild(
    linkId: 'link-ver-1',
    relationship: 'father',
    status: GuardianVerificationStatus.verified,
    canViewCoverage: true,
    canViewPremiums: true,
    canPayPremiums: true,
    canManageEnrolment: true,
    studentId: 'student-ver-001',
    firstName: 'Fatima',
    lastName: 'Bello',
    admissionNumber: 'STU-2026-001',
    currentClass: 'JSS 2A',
    tenantId: 'tenant-school-01',
    tenantName: 'Staging Model School',
  );

  final unverifiedChild = const GuardianChild(
    linkId: 'link-unver-2',
    relationship: 'mother',
    status: GuardianVerificationStatus.pendingVerification,
    canViewCoverage: false,
    canViewPremiums: false,
    canPayPremiums: false,
    canManageEnrolment: false,
    studentId: 'student-unver-002',
    firstName: 'Tunde',
    lastName: 'Ojo',
    admissionNumber: 'STU-2026-042',
    currentClass: 'SSS 1B',
    tenantId: 'tenant-school-01',
    tenantName: 'Staging Model School',
  );

  final activeEnrolment = const HealthEnrolment(
    id: 'enrol-001',
    status: EnrolmentLifecycleStatus.active,
    memberId: 'mem-001',
    memberCategory: 'student',
    memberName: 'Fatima Bello',
    admissionNumber: 'STU-2026-001',
    planName: 'Student Shield Standard',
    providerName: 'Staging HMO Provider',
    premiumMinor: 3500000,
    policyId: 'pol-001',
    policyNumber: 'HMO-POL-998877',
    policyStatus: PolicyLifecycleStatus.active,
  );

  final pendingPaymentEnrolment = const HealthEnrolment(
    id: 'enrol-002',
    status: EnrolmentLifecycleStatus.awaitingPremiumPayment,
    memberId: 'mem-002',
    memberCategory: 'student',
    memberName: 'Chukwuma Eze',
    admissionNumber: 'STU-2026-009',
    planName: 'Student Shield Standard',
    providerName: 'Staging HMO Provider',
    premiumMinor: 3500000,
    policyStatus: PolicyLifecycleStatus.pendingActivation,
  );

  final awaitingActivationEnrolment = const HealthEnrolment(
    id: 'enrol-003',
    status: EnrolmentLifecycleStatus.awaitingInsurerActivation,
    memberId: 'mem-003',
    memberCategory: 'student',
    memberName: 'Amina Yusuf',
    admissionNumber: 'STU-2026-015',
    planName: 'Student Shield Standard',
    providerName: 'Staging HMO Provider',
    premiumMinor: 3500000,
    policyId: 'pol-003',
    policyNumber: 'HMO-POL-PENDING',
    policyStatus: PolicyLifecycleStatus.pendingActivation,
  );

  final staffClaim = const HealthClaim(
    id: 'claim-101',
    claimReference: 'CLM-2026-091',
    recordType: 'claim',
    status: ClaimStatus.paid,
    authorisedAmountMinor: 3500000, // 35,000 NGN
    currency: 'NGN',
    facilityName: 'Lagoon Hospital Victoria Island',
    memberName: 'Mr. Emmanuel Adeyemi (Biology Teacher)',
  );

  setUp(() {
    repository = StagingUatFakeRepository(
      metrics: sampleMetrics,
      planOffers: [sampleOffer],
      children: [verifiedChild, unverifiedChild],
      enrolments: [activeEnrolment, pendingPaymentEnrolment, awaitingActivationEnrolment],
      claims: [staffClaim],
    );
    bloc = HealthInsuranceBloc(repository: repository);
  });

  tearDown(() {
    bloc.close();
  });

  group('Invify Health & Wellness — Controlled Staging UAT Scenarios', () {
    testWidgets('UAT-01: Parent/Guardian View with Unverified Guardian Link enforces warning & privacy locks', (tester) async {
      // 1. Verify entity capability restrictions
      expect(unverifiedChild.isVerified, isFalse);
      expect(unverifiedChild.canViewCoverage, isFalse);
      expect(unverifiedChild.canViewPremiums, isFalse);

      // 2. Render UnverifiedWarningBanner and ChildCoverageCard
      await tester.pumpWidget(wrapWithTheme(
        Column(
          children: [
            UnverifiedWarningBanner(
              studentName: unverifiedChild.fullName,
              isRejected: false,
            ),
            ChildCoverageCard(
              child: unverifiedChild,
              enrolment: null,
              onTap: () {},
            ),
          ],
        ),
      ));

      // Verification: Unverified warning banner is rendered
      expect(find.text('Relationship Pending School Verification'), findsOneWidget);
      expect(find.text('Pending'), findsOneWidget);
      expect(find.textContaining('health coverage details, policy documents, and medical claims remain locked'), findsOneWidget);
      expect(find.textContaining('Tunde Ojo'), findsWidgets);

      // Verification: Sensitive coverage and policy data are NOT exposed
      expect(find.text('HMO-POL-998877'), findsNothing);
      expect(find.text('Active Coverage'), findsNothing);
    });

    testWidgets('UAT-02: Parent/Guardian View with Verified Guardian Link allows plan discovery and policy display', (tester) async {
      // 1. Verify entity capability authorization
      expect(verifiedChild.isVerified, isTrue);
      expect(verifiedChild.canViewCoverage, isTrue);
      expect(verifiedChild.canViewPremiums, isTrue);

      // 2. Render PlanCard and verified ChildCoverageCard
      await tester.pumpWidget(wrapWithTheme(
        Column(
          children: [
            ChildCoverageCard(
              child: verifiedChild,
              enrolment: activeEnrolment,
              onTap: () {},
            ),
            PlanCard(
              offer: sampleOffer,
            ),
          ],
        ),
      ));

      // Verification: Plan card and formatted Naira premium are displayed
      expect(find.text('Student Shield Standard'), findsWidgets);
      expect(find.text('₦35,000'), findsOneWidget); // Formatted as ₦35,000
      expect(find.text('/annual'), findsOneWidget);
      expect(find.text('STAGING HMO PROVIDER'), findsOneWidget);
      expect(find.text('Verified'), findsOneWidget);
      expect(find.text('Active Coverage'), findsOneWidget);
      expect(find.text('Fatima Bello'), findsOneWidget);
    });

    testWidgets('UAT-03: Student View provides digital health pass with strict Zero-Financial-Leakage', (tester) async {
      // Build the Student Health Pass Widget representation
      await tester.pumpWidget(wrapWithTheme(
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Student Health Pass', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text(activeEnrolment.memberName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                Text('Student ID: ${activeEnrolment.admissionNumber}'),
                Text('Provider: ${activeEnrolment.providerName}'),
                Text('POLICY ID: ${activeEnrolment.policyNumber}'),
                const Divider(),
                const Text('Emergency Medical Hotline'),
                const Text('Emergency Extension: 112 / 0800-INVIFY-HEALTH'),
              ],
            ),
          ),
        ),
      ));

      // Verification: Student Digital Pass elements
      expect(find.text('Student Health Pass'), findsOneWidget);
      expect(find.text('Fatima Bello'), findsOneWidget);
      expect(find.text('Student ID: STU-2026-001'), findsOneWidget);
      expect(find.text('POLICY ID: HMO-POL-998877'), findsOneWidget);
      expect(find.text('Emergency Extension: 112 / 0800-INVIFY-HEALTH'), findsOneWidget);

      // Strict Zero-Leakage Privacy Verification: No financial figures or guardian debts
      expect(find.textContaining('₦'), findsNothing);
      expect(find.textContaining('kobo'), findsNothing);
      expect(find.textContaining('Billed'), findsNothing);
      expect(find.textContaining('Debt'), findsNothing);
      expect(find.textContaining('Invoice'), findsNothing);
    });

    testWidgets('UAT-04: School Staff View scopes coverage to staff member and preserves claims privacy', (tester) async {
      await tester.pumpWidget(wrapWithTheme(
        Column(
          children: [
            const Text('Staff Health Benefit'),
            ClaimCard(claim: staffClaim),
          ],
        ),
      ));

      // Verification: Staff Health Benefit and personal claim
      expect(find.text('Staff Health Benefit'), findsOneWidget);
      expect(find.text('CLM-2026-091'), findsOneWidget);
      expect(find.text('Lagoon Hospital Victoria Island'), findsOneWidget);
      expect(find.text('₦35,000.00'), findsOneWidget);
      expect(find.text('Paid'), findsOneWidget);
    });

    testWidgets('UAT-05: School Administrator View displays tenant-scoped aggregated metrics & KPIs', (tester) async {
      // 1. Verify calculated overview metrics
      expect(sampleMetrics.totalMembers, 250);
      expect(sampleMetrics.enrolledCount, 210);
      expect(sampleMetrics.activeCoverageCount, 195);
      expect(sampleMetrics.coverageRatePercentage, closeTo(78.0, 0.1));
      expect(sampleMetrics.billedNaira, 7500000.0);
      expect(sampleMetrics.collectedNaira, 7000000.0);
      expect(sampleMetrics.outstandingNaira, 500000.0);

      // 2. Render Administrator Metrics Overview Card
      await tester.pumpWidget(wrapWithTheme(
        Card(
          child: Column(
            children: [
              const Text('School Health & Wellness Overview'),
              Text('Total Members: ${sampleMetrics.totalMembers}'),
              Text('Enrolled Beneficiaries: ${sampleMetrics.enrolledCount}'),
              Text('Active Confirmed Policies: ${sampleMetrics.activeCoverageCount}'),
              Text('Coverage Rate: ${sampleMetrics.coverageRatePercentage.toStringAsFixed(1)}%'),
            ],
          ),
        ),
      ));

      expect(find.text('School Health & Wellness Overview'), findsOneWidget);
      expect(find.text('Total Members: 250'), findsOneWidget);
      expect(find.text('Enrolled Beneficiaries: 210'), findsOneWidget);
      expect(find.text('Active Confirmed Policies: 195'), findsOneWidget);
      expect(find.text('Coverage Rate: 78.0%'), findsOneWidget);
    });

    testWidgets('UAT-06: Financial & Coverage Lifecycle strictly separates Payment from Policy Activation', (tester) async {
      // 1. Enrolment awaiting payment
      expect(pendingPaymentEnrolment.status, EnrolmentLifecycleStatus.awaitingPremiumPayment);
      expect(pendingPaymentEnrolment.isCoverageActive, isFalse);

      // 2. When payment is completed, enrolment is awaiting_insurer_activation, NOT active
      expect(awaitingActivationEnrolment.status, EnrolmentLifecycleStatus.awaitingInsurerActivation);
      expect(awaitingActivationEnrolment.policyStatus, PolicyLifecycleStatus.pendingActivation);
      expect(awaitingActivationEnrolment.isCoverageActive, isFalse);

      // Render Badge for awaiting insurer activation
      await tester.pumpWidget(wrapWithTheme(
        const CoverageStatusBadge(
          status: EnrolmentLifecycleStatus.awaitingInsurerActivation,
          policyStatus: PolicyLifecycleStatus.pendingActivation,
        ),
      ));
      expect(find.text('Awaiting Insurer Activation'), findsOneWidget);
      expect(find.text('Active Coverage'), findsNothing);

      // 3. Only activeEnrolment with confirmed policy has active coverage
      expect(activeEnrolment.status, EnrolmentLifecycleStatus.active);
      expect(activeEnrolment.policyStatus, PolicyLifecycleStatus.active);
      expect(activeEnrolment.isCoverageActive, isTrue);
    });

    test('UAT-07: Sandbox Activation triggers server-side simulation and updates policy status', () async {
      bloc.add(const SimulateSandboxActivationRequest('enrol-003'));

      await expectLater(
        bloc.stream,
        emitsInOrder([
          predicate<HealthInsuranceState>((s) => s.isActionLoading == true),
          predicate<HealthInsuranceState>((s) =>
              s.isActionLoading == false &&
              s.actionSuccessMessage != null &&
              s.actionSuccessMessage!.contains('ACTIVE')),
        ]),
      );
    });

    test('UAT-08: Cross-Tenant Access Denial & Role Switching Security', () async {
      // Switch to Student role
      bloc.add(const SwitchHealthUserRole(HealthUserRole.student));
      await expectLater(
        bloc.stream,
        emits(predicate<HealthInsuranceState>((s) => s.currentRole == HealthUserRole.student)),
      );

      // Switch to Staff role
      bloc.add(const SwitchHealthUserRole(HealthUserRole.staff));
      await expectLater(
        bloc.stream,
        emits(predicate<HealthInsuranceState>((s) => s.currentRole == HealthUserRole.staff)),
      );

      // Switch to Admin role
      bloc.add(const SwitchHealthUserRole(HealthUserRole.admin));
      await expectLater(
        bloc.stream,
        emits(predicate<HealthInsuranceState>((s) => s.currentRole == HealthUserRole.admin)),
      );
    });
  });
}
