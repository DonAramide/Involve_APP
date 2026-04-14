import '../../../../core/services/finance_api_client.dart';
import '../models/wallet_model.dart';
import '../models/transaction_model.dart';

abstract class IFinanceRemoteDataSource {
  Future<WalletModel> getWallet(String walletId);
  Future<Map<String, dynamic>> getWalletBalance(String walletId);
  Future<List<TransactionModel>> getTransactions(String walletId);
  Future<Map<String, dynamic>> getSchoolSummary();
  Future<List<Map<String, dynamic>>> getDailyRevenue(int days);
  Future<List<TransactionModel>> getGlobalTransactions(int limit, int offset);
  Future<TransactionModel> recordManualPayment(Map<String, dynamic> paymentData);
  Future<TransactionModel> applyDiscount(Map<String, dynamic> discountData);
  Future<Map<String, dynamic>> getStudentSummary(String studentId);
  Future<Map<String, dynamic>?> getVirtualAccount(String studentId);
  Future<List<TransactionModel>> getStudentTransactions(String studentId, int limit, int offset);
}


class FinanceRemoteDataSourceImpl implements IFinanceRemoteDataSource {
  final FinanceApiClient client;

  FinanceRemoteDataSourceImpl(this.client);

  @override
  Future<WalletModel> getWallet(String walletId) async {
    final response = await client.get('/wallets/$walletId');
    return WalletModel.fromJson(response.data);
  }

  @override
  Future<Map<String, dynamic>> getWalletBalance(String walletId) async {
    final response = await client.get('/wallets/$walletId/balance');
    return response.data;
  }

  @override
  Future<List<TransactionModel>> getTransactions(String walletId) async {
    final response = await client.get('/wallets/$walletId/transactions');
    return (response.data as List).map((e) => TransactionModel.fromJson(e)).toList();
  }

  @override
  Future<Map<String, dynamic>> getSchoolSummary() async {
    final response = await client.get('/analytics');
    return response.data;
  }

  @override
  Future<List<Map<String, dynamic>>> getDailyRevenue(int days) async {
    final response = await client.get('/finance/daily-revenue', queryParameters: {'days': days});
    return List<Map<String, dynamic>>.from(response.data);
  }

  @override
  Future<List<TransactionModel>> getGlobalTransactions(int limit, int offset) async {
    final response = await client.get('/finance/transactions', queryParameters: {
      'limit': limit,
      'offset': offset,
    });
    return (response.data as List).map((e) => TransactionModel.fromJson(e)).toList();
  }

  @override
  Future<TransactionModel> recordManualPayment(Map<String, dynamic> paymentData) async {
    final response = await client.post('/finance/transactions/manual', data: paymentData);
    return TransactionModel.fromJson(response.data);
  }

  @override
  Future<TransactionModel> applyDiscount(Map<String, dynamic> discountData) async {
    final response = await client.post('/finance/transactions/discount', data: discountData);
    return TransactionModel.fromJson(response.data);
  }

  @override
  Future<Map<String, dynamic>> getStudentSummary(String studentId) async {
    final response = await client.get('/students/$studentId/summary');
    return response.data;
  }

  @override
  Future<Map<String, dynamic>?> getVirtualAccount(String studentId) async {
    final response = await client.get('/students/$studentId/virtual-account');
    return response.data;
  }

  @override
  Future<List<TransactionModel>> getStudentTransactions(String studentId, int limit, int offset) async {
    final response = await client.get('/students/$studentId/transactions', queryParameters: {
      'limit': limit,
      'offset': offset,
    });
    return (response.data as List).map((e) => TransactionModel.fromJson(e)).toList();
  }
}

