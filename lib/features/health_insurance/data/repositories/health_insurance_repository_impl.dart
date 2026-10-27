// lib/features/health_insurance/data/repositories/health_insurance_repository_impl.dart
import 'package:flutter/foundation.dart';
import '../../../../core/services/finance_api_client.dart';
import '../../domain/entities/health_insurance_entities.dart';
import '../../domain/repositories/health_insurance_repository.dart';

class HealthInsuranceRepositoryImpl implements HealthInsuranceRepository {
  final FinanceApiClient _client;

  HealthInsuranceRepositoryImpl(this._client);

  @override
  Future<HealthTenantSettings> getSettings() async {
    try {
      final response = await _client.get('/api/v1/health-insurance/settings');
      if (response.data is Map<String, dynamic>) {
        return HealthTenantSettings.fromJson(response.data as Map<String, dynamic>);
      }
      return HealthTenantSettings.empty();
    } catch (e) {
      debugPrint('[HealthInsuranceRepo] getSettings error: $e');
      rethrow;
    }
  }

  @override
  Future<HealthOverviewMetrics> getOverviewMetrics() async {
    try {
      final response = await _client.get('/api/v1/health-insurance/overview');
      if (response.data is Map<String, dynamic>) {
        return HealthOverviewMetrics.fromJson(response.data as Map<String, dynamic>);
      }
      return HealthOverviewMetrics.empty();
    } catch (e) {
      debugPrint('[HealthInsuranceRepo] getOverviewMetrics error: $e');
      rethrow;
    }
  }


  @override
  Future<List<TenantPlanOffer>> getTenantPlanOffers() async {
    try {
      final response = await _client.get('/api/v1/health-insurance/plans/offers');
      final data = response.data;
      List<dynamic> list = const [];
      if (data is Map<String, dynamic> && data['data'] is List) {
        list = data['data'] as List<dynamic>;
      } else if (data is List) {
        list = data;
      }
      return list
          .whereType<Map<String, dynamic>>()
          .map((item) => TenantPlanOffer.fromJson(item))
          .toList();
    } catch (e) {
      debugPrint('[HealthInsuranceRepo] getTenantPlanOffers error: $e');
      rethrow;
    }
  }

  @override
  Future<List<GuardianChild>> getGuardianChildren() async {
    try {
      final response = await _client.get('/api/v1/health-insurance/guardian/children');
      final data = response.data;
      List<dynamic> list = const [];
      if (data is Map<String, dynamic>) {
        if (data['children'] is List) {
          list = data['children'] as List<dynamic>;
        } else if (data['data'] is List) {
          list = data['data'] as List<dynamic>;
        }
      } else if (data is List) {
        list = data;
      }
      return list
          .whereType<Map<String, dynamic>>()
          .map((item) => GuardianChild.fromJson(item))
          .toList();
    } catch (e) {
      debugPrint('[HealthInsuranceRepo] getGuardianChildren error: $e');
      rethrow;
    }
  }

  @override
  Future<List<HealthEnrolment>> getEnrolments({
    String? status,
    String? memberId,
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };
      if (status != null && status.isNotEmpty) {
        queryParams['status'] = status;
      }
      if (memberId != null && memberId.isNotEmpty) {
        queryParams['memberId'] = memberId;
      }

      final response = await _client.get(
        '/api/v1/health-insurance/enrolments',
        queryParameters: queryParams,
      );
      final data = response.data;
      List<dynamic> list = const [];
      if (data is Map<String, dynamic> && data['data'] is List) {
        list = data['data'] as List<dynamic>;
      } else if (data is List) {
        list = data;
      }
      return list
          .whereType<Map<String, dynamic>>()
          .map((item) => HealthEnrolment.fromJson(item))
          .toList();
    } catch (e) {
      debugPrint('[HealthInsuranceRepo] getEnrolments error: $e');
      rethrow;
    }
  }

  @override
  Future<HealthEnrolment> createEnrolment({
    required String memberId,
    required String planVersionId,
    required String periodStart,
    required String periodEnd,
  }) async {
    try {
      final response = await _client.post(
        '/api/v1/health-insurance/enrolments',
        data: {
          'memberId': memberId,
          'planVersionId': planVersionId,
          'periodStart': periodStart,
          'periodEnd': periodEnd,
        },
      );
      return HealthEnrolment.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      debugPrint('[HealthInsuranceRepo] createEnrolment error: $e');
      rethrow;
    }
  }

  @override
  Future<List<HealthClaim>> getClaims({String? policyId}) async {
    try {
      final queryParams = <String, dynamic>{};
      if (policyId != null && policyId.isNotEmpty) {
        queryParams['policyId'] = policyId;
      }
      final response = await _client.get(
        '/api/v1/health-insurance/claims',
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );
      final data = response.data;
      List<dynamic> list = const [];
      if (data is Map<String, dynamic> && data['data'] is List) {
        list = data['data'] as List<dynamic>;
      } else if (data is List) {
        list = data;
      }
      return list
          .whereType<Map<String, dynamic>>()
          .map((item) => HealthClaim.fromJson(item))
          .toList();
    } catch (e) {
      debugPrint('[HealthInsuranceRepo] getClaims error: $e');
      rethrow;
    }
  }

  @override
  Future<Map<String, dynamic>> initiatePremiumPayment({
    required String invoiceId,
    required String paymentMethod,
  }) async {
    try {
      final response = await _client.post(
        '/api/v1/health-insurance/invoices/$invoiceId/pay',
        data: {
          'paymentMethod': paymentMethod,
        },
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return {'status': 'initiated'};
    } catch (e) {
      debugPrint('[HealthInsuranceRepo] initiatePremiumPayment error: $e');
      rethrow;
    }
  }

  @override
  Future<Map<String, dynamic>> simulateSandboxActivation(String enrolmentId) async {
    try {
      final response = await _client.post(
        '/api/v1/health-insurance/enrolments/$enrolmentId/simulate-sandbox-activation',
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return {'status': 'activated'};
    } catch (e) {
      debugPrint('[HealthInsuranceRepo] simulateSandboxActivation error: $e');
      rethrow;
    }
  }
}
