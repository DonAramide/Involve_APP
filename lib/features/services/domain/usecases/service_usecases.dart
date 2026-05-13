import 'dart:typed_data';
import '../repositories/services_repository.dart';
import '../entities/service_job.dart';
import '../entities/service_payment.dart';
import '../entities/service_customer.dart';
import '../entities/service_analytics.dart';

class GetJobs {
  final IServicesRepository repository;
  GetJobs(this.repository);

  Future<List<ServiceJob>> call({String? status, String? query}) {
    return repository.getJobs(status: status, query: query);
  }
}

class CreateJob {
  final IServicesRepository repository;
  CreateJob(this.repository);

  Future<void> call({
    required String customerId,
    required String title,
    String? description,
    required double totalAmount,
    double laborAmount = 0.0,
    List<ServiceJobItem>? items,
    DateTime? dueDate,
    Uint8List? image,
    String? warrantyDuration,
  }) {
    return repository.createJob(
      customerId: customerId,
      title: title,
      description: description,
      totalAmount: totalAmount,
      laborAmount: laborAmount,
      items: items,
      dueDate: dueDate,
      image: image,
      warrantyDuration: warrantyDuration,
    );
  }
}

class AddPayment {
  final IServicesRepository repository;
  AddPayment(this.repository);

  Future<void> call({
    required String jobId,
    required double amount,
    required String method,
    String? reference,
  }) {
    return repository.addPayment(
      jobId: jobId,
      amount: amount,
      method: method,
      reference: reference,
    );
  }
}

class UpdateJobStatus {
  final IServicesRepository repository;
  UpdateJobStatus(this.repository);

  Future<void> call(String id, String status) {
    return repository.updateJobStatus(id, status);
  }
}

class GetJobPayments {
  final IServicesRepository repository;
  GetJobPayments(this.repository);

  Future<List<ServicePayment>> call(String jobId) {
    return repository.getJobPayments(jobId);
  }
}

// Customers
class GetCustomers {
  final IServicesRepository repository;
  GetCustomers(this.repository);

  Future<List<ServiceCustomer>> call({String? query}) {
    return repository.getCustomers(query: query);
  }
}

class CreateCustomer {
  final IServicesRepository repository;
  CreateCustomer(this.repository);

  Future<ServiceCustomer> call({
    required String name,
    String? phone,
    String? email,
  }) {
    return repository.createCustomer(
      name: name,
      phone: phone,
      email: email,
    );
  }
}

// Analytics
class GetServicesAnalytics {
  final IServicesRepository repository;
  GetServicesAnalytics(this.repository);

  Future<ServiceAnalytics> call(DateTime start, DateTime end) {
    return repository.getServicesAnalytics(start, end);
  }
}
