// test/features/health_insurance/health_insurance_bloc_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/features/health_insurance/domain/entities/health_insurance_entities.dart';
import 'package:involve_app/features/health_insurance/domain/repositories/health_insurance_repository.dart';
import 'package:involve_app/features/health_insurance/presentation/bloc/health_insurance_bloc.dart';
import 'package:involve_app/features/health_insurance/presentation/bloc/health_insurance_event.dart';
import 'package:involve_app/features/health_insurance/presentation/bloc/health_insurance_state.dart';

class FakeHealthInsuranceRepository implements HealthInsuranceRepository {
  bool shouldThrow = false;

  final testMetrics = const HealthOverviewMetrics(
    totalMembers: 200,
    enrolledCount: 180,
    activeCoverageCount: 150,
    awaitingVerificationCount: 20,
    awaitingActivationCount: 10,
    incompleteCount: 0,
    expiringSoonCount: 5,
    billedMinor: 500000000,
    collectedMinor: 400000000,
    outstandingMinor: 100000000,
    claimsCount: 25,
    claimsValueMinor: 75000000,
  );

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
      currentClass: 'SS 1B',
      tenantId: 'ten-1',
      tenantName: 'Apex Academy',
    ),
    const GuardianChild(
      linkId: 'link-2',
      relationship: 'father',
      status: GuardianVerificationStatus.pendingVerification,
      canViewCoverage: false,
      canViewPremiums: false,
      canPayPremiums: false,
      canManageEnrolment: false,
      studentId: 'std-2',
      firstName: 'Kemi',
      lastName: 'Balogun',
      admissionNumber: 'SCH/2026/002',
      currentClass: 'Primary 2',
      tenantId: 'ten-1',
      tenantName: 'Apex Academy',
    ),
  ];

  final testEnrolments = [
    const HealthEnrolment(
      id: 'enr-1',
      status: EnrolmentLifecycleStatus.active,
      memberId: 'std-1',
      memberCategory: 'student',
      memberName: 'Tolu Balogun',
      admissionNumber: 'SCH/2026/001',
      planName: 'Standard Student Plan',
      providerName: 'Hygeia HMO',
      premiumMinor: 3000000,
      policyId: 'pol-1',
      policyNumber: 'POL-HYG-001',
      policyStatus: PolicyLifecycleStatus.active,
    ),
  ];

  final testClaims = [
    const HealthClaim(
      id: 'clm-1',
      claimReference: 'CLM-2026-001',
      recordType: 'claim',
      status: ClaimStatus.paid,
      authorisedAmountMinor: 4500000,
      currency: 'NGN',
      facilityName: 'St. Nicholas Hospital',
      memberName: 'Tolu Balogun',
    ),
  ];

  final testSettings = const HealthTenantSettings(
    tenantId: 'ten-1',
    enabled: true,
    assignmentMode: 'LOCKED',
    assignmentSource: 'CODE_INHERITED',
    canChangeProvider: false,
    onboardingInstitutionCode: 'MHMO',
    onboardingInstitutionName: 'MetroHealth HMO',
    onboardingInstitutionType: 'HMO',
    assignedProvider: HealthAssignedProvider(
      id: 'prov-mhmo-1',
      code: 'mhmo',
      name: 'MetroHealth HMO',
      integrationStatus: 'verified',
      regulatorType: 'NHIA',
      licenceReference: 'NHIA/HMO/2026/044',
      supportPhone: '+2348000000000',
    ),
    resolvedRole: HealthUserRole.parent,
    permittedRoles: [HealthUserRole.parent],
    canManageSettings: false,
  );

  @override
  Future<HealthTenantSettings> getSettings() async {
    if (shouldThrow) throw Exception('API Network Error');
    return testSettings;
  }

  @override
  Future<HealthOverviewMetrics> getOverviewMetrics() async {
    if (shouldThrow) throw Exception('API Network Error');
    return testMetrics;
  }


  @override
  Future<List<TenantPlanOffer>> getTenantPlanOffers() async {
    if (shouldThrow) throw Exception('API Network Error');
    return testOffers;
  }

  @override
  Future<List<GuardianChild>> getGuardianChildren() async {
    if (shouldThrow) throw Exception('API Network Error');
    return testChildren;
  }

  @override
  Future<List<HealthEnrolment>> getEnrolments({String? status, String? memberId, int page = 1, int limit = 50}) async {
    if (shouldThrow) throw Exception('API Network Error');
    return testEnrolments;
  }

  @override
  Future<HealthEnrolment> createEnrolment({
    required String memberId,
    required String planVersionId,
    required String periodStart,
    required String periodEnd,
  }) async {
    if (shouldThrow) throw Exception('Failed to create enrolment');
    return testEnrolments.first;
  }

  @override
  Future<List<HealthClaim>> getClaims({String? policyId}) async {
    if (shouldThrow) throw Exception('API Network Error');
    return testClaims;
  }

  @override
  Future<Map<String, dynamic>> initiatePremiumPayment({required String invoiceId, required String paymentMethod}) async {
    if (shouldThrow) throw Exception('Payment initiation failed');
    return {'payment_reference': 'PAY-REF-9981', 'status': 'initiated'};
  }

  @override
  Future<Map<String, dynamic>> simulateSandboxActivation(String enrolmentId) async {
    if (shouldThrow) throw Exception('Sandbox activation failed');
    return {'status': 'activated'};
  }
}

void main() {
  group('HealthInsuranceBloc Tests', () {
    late FakeHealthInsuranceRepository repository;
    late HealthInsuranceBloc bloc;

    setUp(() {
      repository = FakeHealthInsuranceRepository();
      bloc = HealthInsuranceBloc(repository: repository);
    });

    tearDown(() {
      bloc.close();
    });

    test('initial state has correct defaults', () {
      expect(bloc.state.status, HealthInsuranceStatus.initial);
      expect(bloc.state.currentRole, HealthUserRole.parent);
      expect(bloc.state.offers, isEmpty);
      expect(bloc.state.guardianChildren, isEmpty);
    });

    test('LoadHealthInsuranceData populates state with repository data', () async {
      bloc.add(const LoadHealthInsuranceData());

      await expectLater(
        bloc.stream,
        emitsInOrder([
          predicate<HealthInsuranceState>((s) => s.status == HealthInsuranceStatus.loading),
          predicate<HealthInsuranceState>((s) {
            return s.status == HealthInsuranceStatus.loaded &&
                s.offers.length == 1 &&
                s.guardianChildren.length == 2 &&
                s.selectedChild?.firstName == 'Tolu' &&
                s.enrolments.length == 1 &&
                s.claims.length == 1 &&
                s.assignedProvider?.code == 'mhmo' &&
                s.tenantSettings?.assignmentMode == 'LOCKED' &&
                s.currentRole == HealthUserRole.parent;
          }),
        ]),
      );
    });

    test('SwitchHealthUserRole changes role when permitted before settings load', () async {
      bloc.add(const SwitchHealthUserRole(HealthUserRole.student));

      await expectLater(
        bloc.stream,
        emits(predicate<HealthInsuranceState>((s) => s.currentRole == HealthUserRole.student)),
      );
    });

    test('SwitchHealthUserRole blocks unauthorized role switch when restricted by server viewerContext', () async {
      bloc.add(const LoadHealthInsuranceData());
      await bloc.stream.firstWhere((s) => s.status == HealthInsuranceStatus.loaded);

      // Attempt switching to admin when server permittedRoles is [HealthUserRole.parent]
      bloc.add(const SwitchHealthUserRole(HealthUserRole.admin));

      await expectLater(
        bloc.stream,
        emits(predicate<HealthInsuranceState>((s) =>
            s.currentRole == HealthUserRole.parent &&
            s.errorMessage != null &&
            s.errorMessage!.contains('restricted'))),
      );
    });

    test('ResetHealthInsuranceState clears all loaded data back to initial state on logout or tenant switch', () async {
      bloc.add(const LoadHealthInsuranceData());
      await bloc.stream.firstWhere((s) => s.status == HealthInsuranceStatus.loaded);
      expect(bloc.state.enrolments, isNotEmpty);
      expect(bloc.state.assignedProvider, isNotNull);

      bloc.add(const ResetHealthInsuranceState());
      await expectLater(
        bloc.stream,
        emits(predicate<HealthInsuranceState>((s) =>
            s.status == HealthInsuranceStatus.initial &&
            s.enrolments.isEmpty &&
            s.offers.isEmpty &&
            s.assignedProvider == null &&
            s.tenantSettings == null)),
      );
    });


    test('SelectGuardianChild updates selectedChild in state', () async {
      final child = repository.testChildren[1]; // Kemi
      bloc.add(SelectGuardianChild(child));

      await expectLater(
        bloc.stream,
        emits(predicate<HealthInsuranceState>((s) => s.selectedChild?.firstName == 'Kemi')),
      );
    });

    test('SubmitEnrolmentRequest handles success cleanly', () async {
      bloc.add(const SubmitEnrolmentRequest(
        memberId: 'std-1',
        planVersionId: 'ver-1',
        periodStart: '2026-09-01',
        periodEnd: '2027-08-31',
      ));

      await expectLater(
        bloc.stream,
        emitsInOrder([
          predicate<HealthInsuranceState>((s) => s.isActionLoading == true),
          predicate<HealthInsuranceState>((s) =>
              s.isActionLoading == false &&
              s.actionSuccessMessage != null &&
              s.actionSuccessMessage!.contains('submitted')),
        ]),
      );
    });

    test('SubmitBulkEnrolmentRequest handles multiple students cleanly', () async {
      bloc.add(const SubmitBulkEnrolmentRequest(
        memberIds: ['std-1', 'std-2'],
        planVersionId: 'ver-1',
        periodStart: '2026-09-01',
        periodEnd: '2027-08-31',
      ));

      await expectLater(
        bloc.stream,
        emitsInOrder([
          predicate<HealthInsuranceState>((s) => s.isActionLoading == true),
          predicate<HealthInsuranceState>((s) =>
              s.isActionLoading == false &&
              s.actionSuccessMessage != null &&
              s.actionSuccessMessage!.contains('2 students')),
        ]),
      );
    });

    test('SimulateSandboxActivationRequest triggers activation and updates metrics', () async {
      bloc.add(const SimulateSandboxActivationRequest('enr-1'));

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
  });
}
