// lib/features/health_insurance/domain/repositories/health_insurance_repository.dart
import '../entities/health_insurance_entities.dart';

abstract class HealthInsuranceRepository {
  /// Fetches authoritative tenant HMO assignment settings and authenticated viewer role context.
  Future<HealthTenantSettings> getSettings();

  /// Fetches tenant-level health & wellness KPI metrics (members, active policies, billing).
  Future<HealthOverviewMetrics> getOverviewMetrics();


  /// Fetches active insurance plan offers configured for the school.
  Future<List<TenantPlanOffer>> getTenantPlanOffers();

  /// Fetches linked children for the currently authenticated guardian.
  Future<List<GuardianChild>> getGuardianChildren();

  /// Fetches health enrolments with optional status and member filters.
  Future<List<HealthEnrolment>> getEnrolments({
    String? status,
    String? memberId,
    int page = 1,
    int limit = 50,
  });

  /// Submits an enrolment request for a member (student or staff).
  Future<HealthEnrolment> createEnrolment({
    required String memberId,
    required String planVersionId,
    required String periodStart,
    required String periodEnd,
  });

  /// Fetches health claims and pre-authorisation records for the school/policy.
  Future<List<HealthClaim>> getClaims({String? policyId});

  /// Initiates payment for a health premium invoice.
  Future<Map<String, dynamic>> initiatePremiumPayment({
    required String invoiceId,
    required String paymentMethod,
  });

  /// Triggers sandbox insurer activation for an enrolment (Staging/Dev only).
  Future<Map<String, dynamic>> simulateSandboxActivation(String enrolmentId);
}
