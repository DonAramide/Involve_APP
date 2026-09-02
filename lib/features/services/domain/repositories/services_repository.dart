import 'dart:typed_data';
import '../entities/service_job.dart';
import '../entities/service_payment.dart';
import '../entities/service_customer.dart';
import '../entities/service_analytics.dart';
import '../entities/service_material.dart';
import '../../../stock/data/datasources/app_database.dart';

abstract class IServicesRepository {
  Future<List<ServiceJob>> getJobs({String? status, String? query});
  Future<ServiceJob> getJobById(String id);
  Future<void> createJob({
    required String customerId,
    required String title,
    String? description,
    required double totalAmount,
    double laborAmount = 0.0,
    List<ServiceJobItem>? items,
    DateTime? dueDate,
    Uint8List? image,
    String? warrantyDuration,
  });
  /// Records a job payment. Customer Wallet / Wallet methods require enough
  /// customer credit (negative [ServiceCustomer.balance]) and debit the wallet.
  Future<void> addPayment({
    required String jobId,
    required double amount,
    required String method,
    String? reference,
  });
  Future<void> updateJobStatus(String id, String status);
  
  // Customers
  Future<List<ServiceCustomer>> getCustomers({String? query});
  Future<ServiceCustomer?> getCustomerById(String id);
  Future<ServiceCustomer?> getCustomerByPhone(String phone);
  Future<ServiceCustomer?> getCustomerByVirtualAccount(String accountNumber);
  /// Credits wallet from a VA deposit. Auto-debits against owing first, then
  /// any remainder becomes customer credit (negative balance).
  /// Idempotent by [reference]. Returns updated customer or null if no match / duplicate.
  Future<ServiceCustomer?> creditCustomerWalletFromDeposit({
    required double amount,
    required String reference,
    String? customerId,
    String? virtualAccountNumber,
    String? senderName,
    String? senderBank,
    String? createdAt,
  });
  Future<List<Map<String, dynamic>>> getCustomerFundTransactions(String customerId);
  Future<ServiceCustomer> createCustomer({
    required String name,
    String? phone,
    String? email,
    String? address,
    Uint8List? image,
  });
  Future<void> updateCustomerVirtualAccount(String customerId, String accountNumber, String bankName, {String? accountName});
  Future<void> updateCustomerBasicInfo({
    required String id,
    String? name,
    String? phone,
    String? email,
    String? address,
  });

  Future<List<ServicePayment>> getJobPayments(String jobId);
  
  // Presets
  Future<List<String>> getJobPresets();
  Future<void> addJobPreset(String name);
  Future<void> deleteJobPreset(String name);

  // Analytics
  Future<ServiceAnalytics> getServicesAnalytics(DateTime start, DateTime end);

  // Material Presets
  Future<List<ServiceMaterial>> getMaterials({String? category});
  Future<void> addMaterial({required String name, required String category, required double price, Uint8List? image});
  Future<void> updateMaterial({required int id, required String name, required String category, required double price, Uint8List? image});
  Future<void> deleteMaterial(int id);

  // Material Categories
  Future<List<String>> getMaterialCategories();
  Future<List<ServiceMaterialCategoryTable>> getFullMaterialCategories();
  Future<void> addMaterialCategory(String name);
  Future<void> updateMaterialCategory({required int id, required String name});
  Future<void> deleteMaterialCategory(int id);

  // Labor Presets
  Future<List<ServiceLaborPresetTable>> getLaborPresets();
  Future<void> addLaborPreset({required String name, required double amount});
  Future<void> updateLaborPreset({required int id, required String name, required double amount});
  Future<void> deleteLaborPreset(int id);

  Future<void> addServiceExpense({required double amount, required String description, required String category});

  // Expense Categories
  Future<List<ServiceExpenseCategoryTable>> getServiceExpenseCategories();
  Future<void> addServiceExpenseCategory(String name);
  Future<void> updateServiceExpenseCategory({required int id, required String name});
  Future<void> deleteServiceExpenseCategory(int id);
}
