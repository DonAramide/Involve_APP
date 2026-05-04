import '../entities/wallet.dart';
import '../entities/financial_transaction.dart';
import '../entities/student_finance_profile.dart';
import '../entities/school_financial_summary.dart';
import '../entities/daily_revenue.dart';
import '../entities/student_financial_summary.dart';
import '../entities/virtual_account.dart';
import '../../data/datasources/finance_realtime_data_source.dart';

abstract class IFinanceRepository {
  // Student-centric
  Future<Wallet> getWallet(String walletId);
  Future<double> getWalletBalance(String walletId);
  Future<List<FinancialTransaction>> getTransactions(String walletId);
  Future<StudentFinanceProfile> getFinanceProfile(String studentId);
  
  // High-fidelity student profile components
  Future<StudentFinancialSummary> getStudentSummary(String studentId);
  Future<VirtualAccount?> getVirtualAccount(String studentId);
  Future<List<FinancialTransaction>> getStudentTransactions(String studentId, {int limit, int offset});

  // School-centric (Dashboard)
  Future<SchoolFinancialSummary> getSchoolSummary();
  Future<List<DailyRevenue>> getDailyRevenue({int days});
  Future<List<FinancialTransaction>> getGlobalTransactions({int limit, int offset});
  
  // Manual Operations
  Future<FinancialTransaction> recordManualPayment({
    required String studentId,
    required double amount,
    required String method,
    String? note,
    String? reference,
  });

  Future<FinancialTransaction> applyDiscount({
    required String studentId,
    required double amount,
    required String reason,
  });

  Stream<FinanceRealtimeEvent> watchFinanceEvents(String walletId);

  Stream<FinanceRealtimeEvent> watchGlobalEvents();

  Future<Map<String, dynamic>> initiateQuasarPayment({
    required String studentId,
    required String walletId,
    required double amount,
    required String studentName,
  });
}


