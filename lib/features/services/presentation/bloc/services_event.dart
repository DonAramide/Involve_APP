import 'dart:typed_data';
import 'package:equatable/equatable.dart';
import '../../domain/entities/service_job.dart';
import '../../domain/entities/service_customer.dart';
import '../../domain/entities/service_payment.dart';
import '../../../settings/domain/entities/settings.dart';

abstract class ServicesEvent extends Equatable {
  const ServicesEvent();
  @override
  List<Object?> get props => [];
}

class LoadServicesJobs extends ServicesEvent {
  final String? status;
  final String? query;
  const LoadServicesJobs({this.status, this.query});
  @override
  List<Object?> get props => [status, query];
}

class CreateServiceJob extends ServicesEvent {
  final String customerId;
  final String title;
  final String? description;
  final double totalAmount;
  final double laborAmount;
  final List<ServiceJobItem> items;
  final DateTime? dueDate;
  final Uint8List? image;
  final String? warrantyDuration;

  const CreateServiceJob({
    required this.customerId,
    required this.title,
    this.description,
    required this.totalAmount,
    this.laborAmount = 0.0,
    this.items = const [],
    this.dueDate,
    this.image,
    this.warrantyDuration,
  });

  @override
  List<Object?> get props => [customerId, title, description, totalAmount, laborAmount, items, dueDate, image, warrantyDuration];
}

class AddServicePayment extends ServicesEvent {
  final String jobId;
  final double amount;
  final String method;
  final String? reference;

  const AddServicePayment({
    required this.jobId,
    required this.amount,
    required this.method,
    this.reference,
  });

  @override
  List<Object?> get props => [jobId, amount, method, reference];
}

class UpdateJobStatusEvent extends ServicesEvent {
  final String id;
  final String status;
  const UpdateJobStatusEvent(this.id, this.status);
  @override
  List<Object?> get props => [id, status];
}

class SearchServiceCustomers extends ServicesEvent {
  final String? query;
  const SearchServiceCustomers({this.query});
  @override
  List<Object?> get props => [query];
}

class CreateServiceCustomer extends ServicesEvent {
  final String name;
  final String? phone;
  final String? email;
  final String? address;
  final Uint8List? image;

  const CreateServiceCustomer({
    required this.name,
    this.phone,
    this.email,
    this.address,
    this.image,
  });

  @override
  List<Object?> get props => [name, phone, email, address, image];
}

class EnsureWalkInCustomer extends ServicesEvent {
  const EnsureWalkInCustomer();
}

class ExportServicesData extends ServicesEvent {
  const ExportServicesData();
}

class PrintServiceReceiptEvent extends ServicesEvent {
  final ServiceJob job;
  final List<ServicePayment> payments;
  final AppSettings? settings;

  const PrintServiceReceiptEvent({
    required this.job,
    required this.payments,
    this.settings,
  });

  @override
  List<Object?> get props => [job, payments, settings];
}

class LoadServicesAnalytics extends ServicesEvent {
  final DateTime start;
  final DateTime end;

  const LoadServicesAnalytics({required this.start, required this.end});

  @override
  List<Object?> get props => [start, end];
}

class LoadServicePresets extends ServicesEvent {
  const LoadServicePresets();
}

class AddServicePreset extends ServicesEvent {
  final String name;
  const AddServicePreset(this.name);
  @override
  List<Object?> get props => [name];
}

class DeleteServicePreset extends ServicesEvent {
  final String name;
  const DeleteServicePreset(this.name);
  @override
  List<Object?> get props => [name];
}

class LoadServiceMaterials extends ServicesEvent {
  final String? category;
  const LoadServiceMaterials({this.category});
  @override
  List<Object?> get props => [category];
}

class AddServiceMaterial extends ServicesEvent {
  final String name;
  final String category;
  final double price;
  final Uint8List? image;
  const AddServiceMaterial({required this.name, required this.category, required this.price, this.image});
  @override
  List<Object?> get props => [name, category, price, image];
}

class DeleteServiceMaterial extends ServicesEvent {
  final int id;
  const DeleteServiceMaterial(this.id);
  @override
  List<Object?> get props => [id];
}
class UpdateServiceMaterial extends ServicesEvent {
  final int id;
  final String name;
  final String category;
  final double price;
  final Uint8List? image;
  const UpdateServiceMaterial({required this.id, required this.name, required this.category, required this.price, this.image});
  @override
  List<Object?> get props => [id, name, category, price, image];
}

class LoadMaterialCategories extends ServicesEvent {
  const LoadMaterialCategories();
}

class AddMaterialCategory extends ServicesEvent {
  final String name;
  const AddMaterialCategory(this.name);
  @override
  List<Object?> get props => [name];
}

class UpdateMaterialCategory extends ServicesEvent {
  final int id;
  final String name;
  const UpdateMaterialCategory({required this.id, required this.name});
  @override
  List<Object?> get props => [id, name];
}

class DeleteMaterialCategory extends ServicesEvent {
  final int id;
  const DeleteMaterialCategory(this.id);
  @override
  List<Object?> get props => [id];
}

// Labor Presets
class LoadLaborPresets extends ServicesEvent {
  const LoadLaborPresets();
}

class AddLaborPreset extends ServicesEvent {
  final String name;
  final double amount;
  const AddLaborPreset({required this.name, required this.amount});

  @override
  List<Object?> get props => [name, amount];
}

class UpdateLaborPreset extends ServicesEvent {
  final int id;
  final String name;
  final double amount;
  const UpdateLaborPreset({required this.id, required this.name, required this.amount});

  @override
  List<Object?> get props => [id, name, amount];
}

class DeleteLaborPreset extends ServicesEvent {
  final int id;
  const DeleteLaborPreset(this.id);

  @override
  List<Object?> get props => [id];
}

class AddServiceExpense extends ServicesEvent {
  final double amount;
  final String description;
  final String category;
  final DateTime start;
  final DateTime end;

  const AddServiceExpense({
    required this.amount,
    required this.description,
    required this.category,
    required this.start,
    required this.end,
  });

  @override
  List<Object?> get props => [amount, description, category, start, end];
}

// Service Expense Categories
class LoadServiceExpenseCategories extends ServicesEvent {
  const LoadServiceExpenseCategories();
}

class AddServiceExpenseCategory extends ServicesEvent {
  final String name;
  const AddServiceExpenseCategory(this.name);

  @override
  List<Object?> get props => [name];
}

class UpdateServiceExpenseCategory extends ServicesEvent {
  final int id;
  final String name;
  const UpdateServiceExpenseCategory({required this.id, required this.name});

  @override
  List<Object?> get props => [id, name];
}

class DeleteServiceExpenseCategory extends ServicesEvent {
  final int id;
  const DeleteServiceExpenseCategory(this.id);

  @override
  List<Object?> get props => [id];
}
