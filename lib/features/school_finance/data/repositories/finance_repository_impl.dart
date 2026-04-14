import '../../domain/entities/wallet.dart';
import '../../domain/entities/financial_transaction.dart';
import '../../domain/entities/student_finance_profile.dart';
import '../../domain/entities/school_financial_summary.dart';
import '../../domain/entities/daily_revenue.dart';
import '../../domain/repositories/finance_repository.dart';
import '../datasources/finance_remote_data_source.dart';
import '../datasources/finance_realtime_data_source.dart';

import '../../domain/entities/student_financial_summary.dart';
import '../../domain/entities/virtual_account.dart';


class FinanceRepositoryImpl implements IFinanceRepository {
  final IFinanceRemoteDataSource remoteDataSource;
  final IFinanceRealtimeDataSource realtimeDataSource;

  FinanceRepositoryImpl({
    required this.remoteDataSource,
    required this.realtimeDataSource,
  });

  @override
  Future<Wallet> getWallet(String walletId) async {
    return await remoteDataSource.getWallet(walletId);
  }

  @override
  Future<double> getWalletBalance(String walletId) async {
    final data = await remoteDataSource.getWalletBalance(walletId);
    return (data['balance'] as num).toDouble();
  }

  @override
  Future<List<FinancialTransaction>> getTransactions(String walletId) async {
    return await remoteDataSource.getTransactions(walletId);
  }

  @override
  Future<StudentFinanceProfile> getFinanceProfile(String studentId) async {
    final data = await remoteDataSource.getStudentSummary(studentId);
    return StudentFinanceProfile(
      studentId: studentId,
      walletId: studentId, // Placeholder until wallet mapping is confirmed in the detailed summary
      totalPaid: (data['totalPaid'] as num).toDouble(),
      outstandingBalance: (data['outstandingBalance'] as num).toDouble(),
    );
  }

  @override
  Future<StudentFinancialSummary> getStudentSummary(String studentId) async {
    final data = await remoteDataSource.getStudentSummary(studentId);
    return StudentFinancialSummary.fromJson(data);
  }

  @override
  Future<VirtualAccount?> getVirtualAccount(String studentId) async {
    final data = await remoteDataSource.getVirtualAccount(studentId);
    if (data == null) return null;
    return VirtualAccount.fromJson(data);
  }

  @override
  Future<List<FinancialTransaction>> getStudentTransactions(String studentId, {int limit = 50, int offset = 0}) async {
    return await remoteDataSource.getStudentTransactions(studentId, limit, offset);
  }

  @override
  Future<SchoolFinancialSummary> getSchoolSummary() async {
    final data = await remoteDataSource.getSchoolSummary();
    return SchoolFinancialSummary(
      totalRevenue: (data['totalRevenue'] as num).toDouble(),
      outstandingFees: (data['outstandingFees'] as num).toDouble(),
      paidStudentsCount: data['paidStudentsCount'],
      owingStudentsCount: data['owingStudentsCount'],
      totalStudents: data['totalStudents'],
      lastUpdated: DateTime.parse(data['lastUpdated']),
    );
  }

  @override
  Future<List<DailyRevenue>> getDailyRevenue({int days = 30}) async {
    final data = await remoteDataSource.getDailyRevenue(days);
    return data.map((e) => DailyRevenue(
      date: e['date'],
      revenue: (e['revenue'] as num).toDouble(),
    )).toList();
  }

  @override
  Future<List<FinancialTransaction>> getGlobalTransactions({int limit = 50, int offset = 0}) async {
    return await remoteDataSource.getGlobalTransactions(limit, offset);
  }

  @override
  Future<FinancialTransaction> recordManualPayment({
    required String studentId,
    required double amount,
    required String method,
    String? note,
    String? reference,
  }) async {
    final payload = {
      'studentId': studentId,
      'amount': amount,
      'method': method,
      'note': note,
      'reference': reference,
    };
    return await remoteDataSource.recordManualPayment(payload);
  }

  @override
  Future<FinancialTransaction> applyDiscount({
    required String studentId,
    required double amount,
    required String reason,
  }) async {
    final payload = {
      'studentId': studentId,
      'amount': amount,
      'reason': reason,
    };
    return await remoteDataSource.applyDiscount(payload);
  }

  @override
  Stream<FinanceRealtimeEvent> watchFinanceEvents(String walletId) {
    return realtimeDataSource.watchWalletEvents(walletId);
  }

  @override
  Stream<FinanceRealtimeEvent> watchGlobalEvents() {
    return realtimeDataSource.watchGlobalEvents();
  }
}

