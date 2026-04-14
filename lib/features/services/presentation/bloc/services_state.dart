import 'package:equatable/equatable.dart';
import '../../domain/entities/service_job.dart';
import '../../domain/entities/service_customer.dart';
import '../../domain/entities/service_analytics.dart';
import '../../domain/entities/service_material.dart';
import '../../../stock/data/datasources/app_database.dart';

enum ServicesStatus { initial, loading, success, error }

class ServicesState extends Equatable {
  final ServicesStatus status;
  final List<ServiceJob> jobs;
  final List<ServiceCustomer> customers;
  final List<String> presets;
  final List<ServiceMaterial> materials;
  final List<ServiceMaterialCategoryTable> materialCategories;
  final List<ServiceLaborPresetTable> laborPresets;
  final List<ServiceExpenseCategoryTable> serviceExpenseCategories;
  final List<String> categories;
  final ServiceAnalytics? analytics;
  final String? errorMessage;
  final String? successMessage;

  const ServicesState({
    this.status = ServicesStatus.initial,
    this.jobs = const [],
    this.customers = const [],
    this.presets = const [],
    this.materials = const [],
    this.materialCategories = const [],
    this.laborPresets = const [],
    this.serviceExpenseCategories = const [],
    this.categories = const [],
    this.analytics,
    this.errorMessage,
    this.successMessage,
  });

  ServicesState copyWith({
    ServicesStatus? status,
    List<ServiceJob>? jobs,
    List<ServiceCustomer>? customers,
    List<String>? presets,
    List<ServiceMaterial>? materials,
    List<ServiceMaterialCategoryTable>? materialCategories,
    List<ServiceLaborPresetTable>? laborPresets,
    List<ServiceExpenseCategoryTable>? serviceExpenseCategories,
    List<String>? categories,
    ServiceAnalytics? analytics,
    String? errorMessage,
    String? successMessage,
  }) {
    return ServicesState(
      status: status ?? this.status,
      jobs: jobs ?? this.jobs,
      customers: customers ?? this.customers,
      presets: presets ?? this.presets,
      materials: materials ?? this.materials,
      materialCategories: materialCategories ?? this.materialCategories,
      laborPresets: laborPresets ?? this.laborPresets,
      serviceExpenseCategories: serviceExpenseCategories ?? this.serviceExpenseCategories,
      categories: categories ?? this.categories,
      analytics: analytics ?? this.analytics,
      errorMessage: errorMessage, // Reset error on change
      successMessage: successMessage, // Reset success on change
    );
  }

  @override
  List<Object?> get props => [status, jobs, customers, presets, materials, materialCategories, laborPresets, serviceExpenseCategories, categories, analytics, errorMessage, successMessage];
}
