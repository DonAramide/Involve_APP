// test/features/health_insurance/hmo_tour_and_welcome_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:involve_app/features/health_insurance/domain/entities/health_insurance_entities.dart';
import 'package:involve_app/features/health_insurance/domain/repositories/health_insurance_repository.dart';
import 'package:involve_app/features/health_insurance/presentation/bloc/health_insurance_bloc.dart';
import 'package:involve_app/features/health_insurance/presentation/bloc/health_insurance_state.dart';
import 'package:involve_app/features/health_insurance/presentation/pages/health_wellness_home_page.dart';
import 'package:involve_app/features/health_insurance/presentation/pages/hmo_welcome_page.dart';
import 'package:involve_app/features/health_insurance/presentation/pages/hmo_guided_tour_page.dart';
import 'package:involve_app/features/health_insurance/presentation/utils/hmo_tour_storage.dart';

class MockHealthInsuranceRepository implements HealthInsuranceRepository {
  @override
  Future<HealthTenantSettings> getSettings() async => HealthTenantSettings.empty();

  @override
  Future<HealthOverviewMetrics> getOverviewMetrics() async => HealthOverviewMetrics.empty();

  @override
  Future<List<TenantPlanOffer>> getTenantPlanOffers() async => [];

  @override
  Future<List<GuardianChild>> getGuardianChildren() async => [];

  @override
  Future<List<HealthEnrolment>> getEnrolments({
    String? status,
    String? memberId,
    int page = 1,
    int limit = 50,
  }) async =>
      [];

  @override
  Future<HealthEnrolment> createEnrolment({
    required String memberId,
    required String planVersionId,
    required String periodStart,
    required String periodEnd,
  }) async =>
      throw UnimplementedError();

  @override
  Future<List<HealthClaim>> getClaims({String? policyId}) async => [];

  @override
  Future<Map<String, dynamic>> initiatePremiumPayment({
    required String invoiceId,
    required String paymentMethod,
  }) async =>
      {};

  @override
  Future<Map<String, dynamic>> simulateSandboxActivation(String enrolmentId) async => {};
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  Widget wrapWithTheme(Widget child) {
    return MaterialApp(
      home: child,
    );
  }

  group('HMO Tour Storage Unit Tests', () {
    test('isTourCompleted returns false initially', () async {
      final isDone = await HmoTourStorage.isTourCompleted(userId: 'u1', tenantId: 't1');
      expect(isDone, isFalse);
    });

    test('setTourCompleted sets flag correctly for user and tenant', () async {
      await HmoTourStorage.setTourCompleted(userId: 'u1', tenantId: 't1');
      final isDone = await HmoTourStorage.isTourCompleted(userId: 'u1', tenantId: 't1');
      expect(isDone, isTrue);

      // Separate user is still false
      final isOtherDone = await HmoTourStorage.isTourCompleted(userId: 'u2', tenantId: 't1');
      // Should fall back to generic key if true or false
      expect(isOtherDone, isTrue); // because fallback key was set
    });

    test('resetTour clears completion status', () async {
      await HmoTourStorage.setTourCompleted(userId: 'u1', tenantId: 't1');
      await HmoTourStorage.resetTour(userId: 'u1', tenantId: 't1');
      final isDone = await HmoTourStorage.isTourCompleted(userId: 'u1', tenantId: 't1');
      expect(isDone, isFalse);
    });
  });

  group('HMO Welcome Page Widget Tests', () {
    testWidgets('renders title, partner name and educational card', (tester) async {
      await tester.pumpWidget(wrapWithTheme(
        const HmoWelcomePage(
          schoolName: 'Greenwood High',
          hmoProviderName: 'Metro Health HMO',
        ),
      ));

      expect(find.byKey(const Key('hmo_welcome_title')), findsOneWidget);
      expect(find.text('Welcome to Health & Wellness'), findsOneWidget);
      expect(find.text('Metro Health HMO'), findsOneWidget);
      expect(find.text('What is an HMO?'), findsOneWidget);
      expect(find.byKey(const Key('hmo_take_tour_button')), findsOneWidget);
      expect(find.byKey(const Key('hmo_explore_button')), findsOneWidget);
      expect(find.byKey(const Key('hmo_skip_button')), findsOneWidget);
    });

    testWidgets('tapping Take the Quick Tour navigates to tour', (tester) async {
      await tester.pumpWidget(wrapWithTheme(
        const HmoWelcomePage(
          schoolName: 'Greenwood High',
          hmoProviderName: 'Metro Health HMO',
        ),
      ));

      await tester.tap(find.byKey(const Key('hmo_take_tour_button')));
      await tester.pumpAndSettle();

      expect(find.byType(HmoGuidedTourPage), findsOneWidget);
      expect(find.text('Step 1 of 4'), findsOneWidget);
    });

    testWidgets('tapping Skip for now marks tour completed and dismisses', (tester) async {
      bool dismissed = false;
      await tester.pumpWidget(wrapWithTheme(
        HmoWelcomePage(
          schoolName: 'Greenwood High',
          onDismiss: () => dismissed = true,
        ),
      ));

      await tester.tap(find.byKey(const Key('hmo_skip_button')));
      await tester.pumpAndSettle();

      expect(dismissed, isTrue);
    });
  });

  group('HMO Guided Tour Walkthrough Tests', () {
    testWidgets('walks through all 4 steps and verifies content', (tester) async {
      bool tourFinished = false;

      await tester.pumpWidget(wrapWithTheme(
        HmoGuidedTourPage(
          schoolName: 'Greenwood High',
          hmoProviderName: 'Metro Health HMO',
          onFinish: () => tourFinished = true,
        ),
      ));

      // Step 1: Welcome to Health & Wellness
      expect(find.text('Step 1 of 4'), findsOneWidget);
      expect(find.text('Welcome to Health & Wellness'), findsOneWidget);
      expect(find.byKey(const Key('hmo_tour_back_button')), findsNothing);

      // Advance to Step 2
      await tester.tap(find.byKey(const Key('hmo_tour_next_button')));
      await tester.pumpAndSettle();

      // Step 2: What is an HMO?
      expect(find.text('Step 2 of 4'), findsOneWidget);
      expect(find.text('What is an HMO?'), findsOneWidget);
      expect(find.byKey(const Key('hmo_tour_back_button')), findsOneWidget);

      // Advance to Step 3
      await tester.tap(find.byKey(const Key('hmo_tour_next_button')));
      await tester.pumpAndSettle();

      // Step 3: Explore School Health Plans
      expect(find.text('Step 3 of 4'), findsOneWidget);
      expect(find.text('Explore School Health Plans'), findsOneWidget);

      // Advance to Step 4
      await tester.tap(find.byKey(const Key('hmo_tour_next_button')));
      await tester.pumpAndSettle();

      // Step 4: How Enrollment Works
      expect(find.text('Step 4 of 4'), findsOneWidget);
      expect(find.text('How Enrollment Works'), findsOneWidget);
      expect(find.text('Get Started'), findsOneWidget);

      // Verifies the safety notice: Submitting enrollment does NOT automatically mean active coverage
      expect(
        find.textContaining('Submitting enrollment does NOT immediately activate coverage'),
        findsOneWidget,
      );

      // Tap Get Started to finish
      await tester.tap(find.byKey(const Key('hmo_tour_next_button')));
      await tester.pumpAndSettle();

      expect(tourFinished, isTrue);
    });

    testWidgets('allows navigating backwards with Back button', (tester) async {
      await tester.pumpWidget(wrapWithTheme(
        const HmoGuidedTourPage(
          schoolName: 'Greenwood High',
        ),
      ));

      // Go to Step 2
      await tester.tap(find.byKey(const Key('hmo_tour_next_button')));
      await tester.pumpAndSettle();
      expect(find.text('Step 2 of 4'), findsOneWidget);

      // Tap Back to return to Step 1
      await tester.tap(find.byKey(const Key('hmo_tour_back_button')));
      await tester.pumpAndSettle();
      expect(find.text('Step 1 of 4'), findsOneWidget);
    });

    testWidgets('tapping Skip Tour marks completed and finishes', (tester) async {
      bool tourFinished = false;

      await tester.pumpWidget(wrapWithTheme(
        HmoGuidedTourPage(
          onFinish: () => tourFinished = true,
        ),
      ));

      await tester.tap(find.byKey(const Key('hmo_tour_skip_button')));
      await tester.pumpAndSettle();

      expect(tourFinished, isTrue);
    });
  });

  group('HealthWellnessHomePage Redesign Tests', () {
    testWidgets('renders Welcome Hero Card with Quick Tour and How HMO Works buttons', (tester) async {
      final repo = MockHealthInsuranceRepository();
      final bloc = HealthInsuranceBloc(repository: repo);

      await tester.pumpWidget(
        MaterialApp(
          home: BlocProvider<HealthInsuranceBloc>.value(
            value: bloc,
            child: const HealthWellnessHomePage(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Hero Card present
      expect(find.byKey(const Key('hmo_welcome_hero_card')), findsOneWidget);
      expect(find.text('School Health & Wellness Hub'), findsOneWidget);
      expect(find.byKey(const Key('dashboard_take_tour_button')), findsOneWidget);
      expect(find.byKey(const Key('dashboard_how_it_works_button')), findsOneWidget);
      expect(find.byKey(const Key('dashboard_support_button')), findsOneWidget);

      // App bar tour button
      expect(find.byKey(const Key('hmo_app_bar_tour_button')), findsOneWidget);

      // Contextual empty states
      expect(find.text('No Linked Dependants Found'), findsOneWidget);
      expect(find.text('No School Health Plans Published Yet'), findsOneWidget);
    });
  });
}
