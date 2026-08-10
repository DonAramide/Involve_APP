// lib/features/school_finance/domain/repositories/finance_repository_new.dart

import '../../../../core/services/finance_api_client.dart';
import '../../data/models/finance_models.dart';
import '../../domain/entities/virtual_account.dart'; // Reusing this as it's already well-defined
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:drift/drift.dart';

import '../../data/datasources/finance_realtime_data_source.dart';

/// FinanceRepository provides a high-level API to interact with the Invify Finance backend.
/// It focuses on data transformation and strong typing.
class FinanceRepository {
  final FinanceApiClient _client;
  final IFinanceRealtimeDataSource _realtime;
  final AppDatabase? _db;

  FinanceRepository(this._client, this._realtime, [this._db]);

  FinanceApiClient get apiClient => _client;

  /// Fetches a specific wallet by its ID.
  /// GET /api/finance/wallet/:walletId
  Future<Wallet> getWallet(String walletId) async {
    final response = await _client.get('/api/finance/wallet/$walletId');
    return Wallet.fromJson(response.data as Map<String, dynamic>);
  }

  /// Fetches paginated transactions for a wallet.
  /// GET /api/finance/transactions?walletId=:walletId&page=:page
  Future<List<Transaction>> getTransactions(String walletId, {int page = 1, int limit = 30}) async {
    final response = await _client.get(
      '/api/finance/transactions',
      queryParameters: {
        'walletId': walletId,
        'page': page,
        'limit': limit,
      },
    );
    
    final List<dynamic> data = response.data as List<dynamic>;
    return data.map((json) => Transaction.fromJson(json as Map<String, dynamic>)).toList();
  }

  /// Fetches the financial summary for a student (Total Fees, Total Paid, Balance).
  /// GET /api/finance/student/:studentId/summary
  Future<StudentFinanceSummary> getStudentSummary(String studentId) async {
    final response = await _client.get('/api/finance/student/$studentId/summary');
    return StudentFinanceSummary.fromJson(response.data as Map<String, dynamic>);
  }

  /// Fetches the virtual bank account details for a student.
  /// GET /api/finance/virtual-account/:studentId
  Future<VirtualAccount?> getVirtualAccount(String studentId) async {
    try {
      final response = await _client.get('/api/finance/virtual-account/$studentId');
      if (response.data == null) return null;
      return VirtualAccount.fromJson(response.data as Map<String, dynamic>);
    } on FinanceApiException catch (e) {
      if (e.statusCode == 404) return null;
      rethrow;
    }
  }

  /// Records a manual payment (Cash/POS/Transfer) into the student's ledger.
  /// POST /api/finance/transactions/manual
  Future<Transaction> recordManualPayment({
    required String studentId,
    required double amount,
    required String method,
    String? notes,
  }) async {
    final response = await _client.post(
      '/api/finance/transactions/manual',
      data: {
        'studentId': studentId,
        'amount': amount,
        'method': method.toLowerCase(),
        'note': notes,
      },
    );
    return Transaction.fromJson(response.data as Map<String, dynamic>);
  }

  /// Initiates an external payment intent via Quasar (e.g. Paystack, Bank Transfer).
  /// POST /payments/create
  Future<Map<String, dynamic>> initiateQuasarPayment({
    required String studentId,
    required String walletId,
    required double amount,
    required String studentName,
  }) async {
    final response = await _client.post(
      '/payments/create',
      data: {
        'studentId': studentId,
        'walletId': walletId,
        'amount': amount,
        'studentName': studentName,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  /// Initiates a generic virtual account payment.
  /// POST /payments/create
  Future<Map<String, dynamic>> initiateVirtualAccount({
    required double amount,
    String? customerId,
    String? customerName,
    String? customerPhone,
    String? email,
  }) async {
    final response = await _client.post(
      '/payments/create',
      data: {
        'customerId': customerId,
        'amount': amount,
        'customerName': customerName,
        'customerPhone': customerPhone,
        'email': email,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  /// Initiates a static virtual account generation for a customer.
  /// POST /api/finance/customer-virtual-account/:customerId
  Future<Map<String, dynamic>> initiateCustomerVirtualAccount({
    required String customerId,
    String? customerName,
    String? customerPhone,
    String? email,
  }) async {
    final response = await _client.post(
      '/api/finance/customer-virtual-account/$customerId',
      data: {
        'name': customerName,
        'phone': customerPhone,
        'email': email,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  /// Initiates a static virtual account generation for a staff member.
  /// POST /api/finance/staff-virtual-account/:userId
  Future<Map<String, dynamic>> initiateStaffVirtualAccount({
    required String userId,
    required String customLastName,
    String? phone,
    String? email,
  }) async {
    final response = await _client.post(
      '/api/finance/staff-virtual-account/$userId',
      data: {
        'customLastName': customLastName,
        'phone': phone,
        'email': email,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  /// Initiates a static virtual account generation for a school student.
  /// POST /api/finance/student-virtual-account/:studentId
  Future<Map<String, dynamic>> initiateStudentVirtualAccount({
    required String studentId,
    required String firstName,
    required String lastName,
    required String admissionNumber,
    String? phone,
    String? email,
  }) async {
    final response = await _client.post(
      '/api/finance/student-virtual-account/$studentId',
      data: {
        'firstName': firstName,
        'lastName': lastName,
        'admissionNumber': admissionNumber,
        'phone': phone,
        'email': email,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  /// Fetches the reconciliation report for the school.
  /// GET /api/reconciliation
  Future<Map<String, dynamic>> getReconciliationReport({
    String? status,
    int page = 1,
    int limit = 50,
  }) async {
    final response = await _client.get(
      '/api/reconciliation',
      queryParameters: {
        if (status != null) 'status': status,
        'page': page,
        'limit': limit,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  /// Assigns a payment to a student and triggers backend reconciliation.
  Future<void> assignToStudent({
    required String reference,
    required String studentId,
  }) async {
    await _client.post(
      '/api/reconciliation/assign',
      data: {
        'reference': reference,
        'studentId': studentId,
      },
    );
  }

  /// Retries the reconciliation for a specific reference.
  Future<void> retryReconciliation(String reference) async {
    await _client.post(
      '/api/reconciliation/retry',
      data: {
        'reference': reference,
      },
    );
  }

  /// Push a school student Cash/POS payment so tenant admin web can list it.
  Future<void> syncSchoolPayment(Map<String, dynamic> payment) async {
    await _client.post(
      '/api/school/payments/sync',
      data: {'payment': payment},
    );
  }

  /// Raise a payment dispute visible on tenant admin web.
  Future<Map<String, dynamic>> raiseSchoolPaymentDispute(
    Map<String, dynamic> dispute,
  ) async {
    final response = await _client.post(
      '/api/school/payment-disputes',
      data: dispute,
    );
    return response.data is Map
        ? Map<String, dynamic>.from(response.data as Map)
        : <String, dynamic>{};
  }

  /// Listens to global financial events (e.g. payment successes).
  Stream<FinanceRealtimeEvent> watchGlobalEvents() {
    return _realtime.watchGlobalEvents();
  }

  /// Fetches the payout (bank) settings for the school.
  Future<Map<String, dynamic>> getPayoutSettings() async {
    final response = await _client.get('/api/payout/settings');
    return response.data as Map<String, dynamic>;
  }

  /// Saves or updates the payout (bank) settings for the school.
  Future<void> savePayoutSettings({
    required String accountNumber,
    required String bankCode,
    required String bankName,
    required String accountName,
  }) async {
    await _client.post(
      '/api/payout/settings',
      data: {
        'account_number': accountNumber,
        'bank_code': bankCode,
        'bank_name': bankName,
        'account_name': accountName,
      },
    );
  }

  /// Initiates a fund sweep (withdrawal) to the saved bank account.
  Future<void> initiatePayout(double amount) async {
    await _client.post(
      '/api/payout/withdraw',
      data: {
        'amount': amount,
      },
    );
  }

  /// Fetches the history of fund sweeps (payouts).
  Future<Map<String, dynamic>> getPayoutHistory({int page = 1, int limit = 20}) async {
    final response = await _client.get(
      '/api/payout/history',
      queryParameters: {
        'page': page,
        'limit': limit,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  /// Fetches high-level aggregated finance data for executives.
  Future<Map<String, dynamic>> getExecutiveSummary({String? startDate, String? endDate}) async {
    final response = await _client.get(
      '/api/finance/executive-summary',
      queryParameters: {
        if (startDate != null) 'startDate': startDate,
        if (endDate != null) 'endDate': endDate,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  /// Fetches students with outstanding balances (defaulters).
  Future<List<dynamic>> getDefaulters({String? className}) async {
    final response = await _client.get(
      '/api/finance/defaulters',
      queryParameters: {
        if (className != null) 'class': className,
      },
    );
    return response.data as List<dynamic>;
  }

  /// Sends a payment reminder to a student/parent.
  Future<void> sendReminder(String studentId, double amount) async {
    await _client.post(
      '/api/finance/defaulters/remind',
      data: {
        'studentId': studentId,
        'amount': amount,
      },
    );
  }

  /// Fetches the unified transaction audit ledger (Cash, Transfer, POS Attempts).
  Future<List<TransactionAuditModel>> getTransactionAuditLedger() async {
    try {
      final response = await _client.get('/api/finance/audit/ledger');
      final List<dynamic> data = response.data as List<dynamic>;
      return data
          .map((json) =>
              TransactionAuditModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      if (_db == null) {
        rethrow;
      }
      try {
        final localInvoices = await (_db!.select(_db!.invoices)
              ..orderBy([
                (t) => OrderingTerm(
                      expression: t.dateCreated,
                      mode: OrderingMode.desc,
                    )
              ])
              ..limit(100))
            .get();

        return localInvoices.map((inv) {
          return TransactionAuditModel(
            id: inv.id.toString(),
            type: 'INVOICE',
            paymentMethod: inv.paymentMethod ?? 'CASH',
            amount: inv.totalAmount,
            status: inv.paymentStatus == 'Paid'
                ? 'Approved'
                : (inv.paymentStatus ?? 'Pending'),
            staffName: inv.staffName ?? 'System',
            date: inv.dateCreated,
            items: const [],
            customerName: inv.customerName ?? 'Walk-in',
            reference: inv.invoiceNumber,
          );
        }).toList();
      } catch (_) {
        rethrow;
      }
    }
  }

  /// Fetches all generated virtual accounts for the tenant.
  /// GET /api/finance/virtual-accounts
  Future<List<Map<String, dynamic>>> getVirtualAccounts() async {
    final response = await _client.get('/api/finance/virtual-accounts');
    final List<dynamic> data = response.data as List<dynamic>;
    return data.map((item) => Map<String, dynamic>.from(item as Map)).toList();
  }

  /// Fetches transaction history for a specific virtual account.
  /// GET /api/finance/virtual-accounts/:accountNumber/transactions
  Future<List<Map<String, dynamic>>> getVirtualAccountTransactions(String accountNumber) async {
    final response = await _client.get('/api/finance/virtual-accounts/$accountNumber/transactions');
    final List<dynamic> data = response.data as List<dynamic>;
    return data.map((item) => Map<String, dynamic>.from(item as Map)).toList();
  }

  /// Missed inbound payments since [since] for offline catch-up.
  /// GET /api/finance/missed-payments?since=
  Future<List<Map<String, dynamic>>> getMissedPayments({required DateTime since}) async {
    final response = await _client.get(
      '/api/finance/missed-payments',
      queryParameters: {'since': since.toUtc().toIso8601String()},
    );
    final body = response.data;
    final List<dynamic> rows = body is Map && body['data'] is List
        ? body['data'] as List<dynamic>
        : (body is List ? body : const []);
    return rows
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  /// Sweeps funds from a child virtual account to the business internal wallet.
  /// POST /api/finance/virtual-accounts/:accountNumber/sweep
  Future<Map<String, dynamic>> sweepVirtualAccount(String accountNumber, double amount) async {
    final response = await _client.post(
      '/api/finance/virtual-accounts/$accountNumber/sweep',
      data: {'amount': amount},
    );
    return response.data as Map<String, dynamic>;
  }
}
