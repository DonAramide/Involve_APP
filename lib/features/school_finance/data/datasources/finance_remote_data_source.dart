// lib/features/school_finance/data/datasources/finance_remote_data_source.dart
//
// Maps all Finance API endpoints to typed Dart models.
// All errors are surfaced as FinanceApiException subtypes.

import '../../../../core/services/finance_api_client.dart';
import '../models/wallet_model.dart';
import '../models/transaction_model.dart';

// ── Interface ─────────────────────────────────────────────────────────────────

abstract class IFinanceRemoteDataSource {
  /// GET /api/finance/wallet/:walletId
  Future<WalletModel> getWallet(String walletId);

  /// GET /api/finance/wallet/:walletId/balance
  Future<Map<String, dynamic>> getWalletBalance(String walletId);

  /// GET /api/finance/transactions?walletId=&page=&limit=
  Future<List<TransactionModel>> getTransactions({
    required String walletId,
    int page = 1,
    int limit = 30,
  });

  /// POST /api/finance/transactions/manual
  Future<TransactionModel> recordManualPayment(Map<String, dynamic> paymentData);

  /// POST /api/finance/transactions/discount
  Future<TransactionModel> applyDiscount(Map<String, dynamic> discountData);

  /// GET /api/analytics  (school-level dashboard)
  Future<Map<String, dynamic>> getSchoolSummary();

  /// GET /api/finance/daily-revenue?days=
  Future<List<Map<String, dynamic>>> getDailyRevenue(int days);

  /// GET /api/finance/transactions?limit=&offset=  (global feed)
  Future<List<TransactionModel>> getGlobalTransactions(int limit, int offset);

  /// GET /api/students/:studentId/summary
  Future<Map<String, dynamic>> getStudentSummary(String studentId);

  /// GET /api/students/:studentId/virtual-account
  Future<Map<String, dynamic>?> getVirtualAccount(String studentId);

  /// GET /api/students/:studentId/transactions?limit=&offset=
  Future<List<TransactionModel>> getStudentTransactions(
    String studentId,
    int limit,
    int offset,
  );

  /// POST /api/payments/create
  Future<Map<String, dynamic>> initiatePayment(Map<String, dynamic> data);

  /// POST /api/finance/customer-virtual-account/:customerId
  Future<Map<String, dynamic>?> initiateCustomerVirtualAccount(String customerId, Map<String, dynamic> data);
}


// ── Implementation ────────────────────────────────────────────────────────────

class FinanceRemoteDataSourceImpl implements IFinanceRemoteDataSource {
  final FinanceApiClient client;

  const FinanceRemoteDataSourceImpl(this.client);

  // ── Wallet ──────────────────────────────────────────────────────────────────

  @override
  Future<WalletModel> getWallet(String walletId) async {
    final response = await client.get('/api/finance/wallet/$walletId');
    return WalletModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<Map<String, dynamic>> getWalletBalance(String walletId) async {
    final response = await client.get('/api/finance/wallet/$walletId/balance');
    return response.data as Map<String, dynamic>;
  }

  // ── Transactions ────────────────────────────────────────────────────────────

  @override
  Future<List<TransactionModel>> getTransactions({
    required String walletId,
    int page = 1,
    int limit = 30,
  }) async {
    final response = await client.get(
      '/api/finance/transactions',
      queryParameters: {
        'walletId': walletId,
        'page': page,
        'limit': limit,
      },
    );
    return _parseTransactionList(response.data);
  }

  @override
  Future<TransactionModel> recordManualPayment(
    Map<String, dynamic> paymentData,
  ) async {
    final response = await client.post(
      '/api/finance/transactions/manual',
      data: paymentData,
    );
    return TransactionModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<TransactionModel> applyDiscount(
    Map<String, dynamic> discountData,
  ) async {
    final response = await client.post(
      '/api/finance/transactions/discount',
      data: discountData,
    );
    return TransactionModel.fromJson(response.data as Map<String, dynamic>);
  }

  // ── Global / Dashboard feeds ────────────────────────────────────────────────

  @override
  Future<Map<String, dynamic>> getSchoolSummary() async {
    final response = await client.get('/api/analytics');
    return response.data as Map<String, dynamic>;
  }

  @override
  Future<List<Map<String, dynamic>>> getDailyRevenue(int days) async {
    final response = await client.get(
      '/api/finance/daily-revenue',
      queryParameters: {'days': days},
    );
    return List<Map<String, dynamic>>.from(response.data as List);
  }

  @override
  Future<List<TransactionModel>> getGlobalTransactions(
    int limit,
    int offset,
  ) async {
    final response = await client.get(
      '/api/finance/transactions',
      queryParameters: {'limit': limit, 'offset': offset},
    );
    return _parseTransactionList(response.data);
  }

  // ── Student-specific ────────────────────────────────────────────────────────

  @override
  Future<Map<String, dynamic>> getStudentSummary(String studentId) async {
    final response = await client.get('/api/finance/student/$studentId/summary');
    return response.data as Map<String, dynamic>;
  }

  @override
  Future<Map<String, dynamic>?> getVirtualAccount(String studentId) async {
    try {
      final response = await client.get('/api/finance/virtual-account/$studentId');
      return response.data as Map<String, dynamic>?;
    } on FinanceApiException catch (e) {
      // 404 means no virtual account registered yet — return null gracefully
      if (e.statusCode == 404) return null;
      rethrow;
    }
  }

  @override
  Future<List<TransactionModel>> getStudentTransactions(
    String studentId,
    int limit,
    int offset,
  ) async {
    final response = await client.get(
      '/api/finance/student/$studentId/transactions',
      queryParameters: {'limit': limit, 'offset': offset},
    );
    return _parseTransactionList(response.data);
  }

  @override
  Future<Map<String, dynamic>?> initiateCustomerVirtualAccount(String customerId, Map<String, dynamic> data) async {
    try {
      final response = await client.post(
        '/api/finance/customer-virtual-account/$customerId',
        data: data,
      );
      return response.data as Map<String, dynamic>?;
    } on FinanceApiException catch (e) {
      if (e.statusCode == 404) return null;
      rethrow;
    }
  }

  @override

  Future<Map<String, dynamic>> initiatePayment(Map<String, dynamic> data) async {
    final response = await client.post(
      '/payments/create',
      data: data,
    );
    return response.data as Map<String, dynamic>;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────


  List<TransactionModel> _parseTransactionList(dynamic data) {
    if (data == null) return [];
    return (data as List)
        .map((e) => TransactionModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
