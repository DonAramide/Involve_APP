import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/usecases/service_usecases.dart';
import '../../domain/usecases/print_job_receipt.dart';
import 'services_event.dart';
import 'services_state.dart';
import '../../domain/entities/service_customer.dart';
import '../../domain/entities/service_material.dart';
import '../../domain/entities/service_job.dart';
import '../../data/services/services_backup_service.dart';

class ServicesBloc extends Bloc<ServicesEvent, ServicesState> {
  final GetJobs getJobs;
  final CreateJob createJob;
  final AddPayment addPayment;
  final UpdateJobStatus updateJobStatus;
  final GetCustomers getCustomers;
  final CreateCustomer createCustomer;
  final ServicesBackupService backupService;
  final PrintJobReceipt printJobReceipt;
  final GetJobPayments getJobPayments;
  final GetServicesAnalytics getServicesAnalytics;

  ServicesBloc({
    required this.getJobs,
    required this.createJob,
    required this.addPayment,
    required this.updateJobStatus,
    required this.getCustomers,
    required this.createCustomer,
    required this.backupService,
    required this.printJobReceipt,
    required this.getJobPayments,
    required this.getServicesAnalytics,
  }) : super(const ServicesState()) {
    _seedMaterials();

    on<LoadServicesJobs>((event, emit) async {
      emit(state.copyWith(status: ServicesStatus.loading));
      try {
        final jobs = await getJobs(status: event.status, query: event.query);
        emit(state.copyWith(status: ServicesStatus.success, jobs: jobs));
      } catch (e) {
        emit(state.copyWith(status: ServicesStatus.error, errorMessage: e.toString()));
      }
    });

    on<CreateServiceJob>((event, emit) async {
      emit(state.copyWith(status: ServicesStatus.loading));
      try {
        await createJob(
          customerId: event.customerId,
          title: event.title,
          description: event.description,
          totalAmount: event.totalAmount,
          laborAmount: event.laborAmount,
          items: event.items,
          dueDate: event.dueDate,
          image: event.image,
          warrantyDuration: event.warrantyDuration,
        );
        add(const LoadServicesJobs());
        emit(state.copyWith(successMessage: 'Job created successfully', status: ServicesStatus.success));
      } catch (e) {
        emit(state.copyWith(status: ServicesStatus.error, errorMessage: e.toString()));
      }
    });

    on<AddServicePayment>((event, emit) async {
      try {
        await addPayment(
          jobId: event.jobId,
          amount: event.amount,
          method: event.method,
          reference: event.reference,
        );
        add(const LoadServicesJobs());
        emit(state.copyWith(successMessage: 'Payment added successfully'));
      } catch (e) {
        emit(state.copyWith(errorMessage: e.toString()));
      }
    });

    on<UpdateJobStatusEvent>((event, emit) async {
      try {
        await updateJobStatus(event.id, event.status);
        add(const LoadServicesJobs());
        emit(state.copyWith(successMessage: 'Status updated successfully'));
      } catch (e) {
        emit(state.copyWith(errorMessage: e.toString()));
      }
    });

    on<SearchServiceCustomers>((event, emit) async {
      try {
        final customers = await getCustomers(query: event.query);
        emit(state.copyWith(customers: customers));
      } catch (e) {
        emit(state.copyWith(errorMessage: e.toString()));
      }
    });

    on<CreateServiceCustomer>((event, emit) async {
      try {
        final customer = await getJobs.repository.createCustomer(
          name: event.name,
          phone: event.phone,
          email: event.email,
          address: event.address,
          image: event.image,
        );
        final customers = List<ServiceCustomer>.from(state.customers)..add(customer);
        emit(state.copyWith(
          customers: customers,
          successMessage: 'Customer registered successfully!',
        ));
      } catch (e) {
        final cleanMsg = e.toString().replaceAll('Exception: ', '').trim();
        emit(state.copyWith(errorMessage: cleanMsg));
      }
    });

    on<ExportServicesData>((event, emit) async {
      try {
        await backupService.exportToJson();
        emit(state.copyWith(successMessage: 'Backup shared successfully'));
      } catch (e) {
        emit(state.copyWith(errorMessage: 'Export failed: ${e.toString()}'));
      }
    });

    on<PrintServiceReceiptEvent>((event, emit) async {
      try {
        final payments = await getJobPayments(event.job.id);
        await printJobReceipt(
          job: event.job,
          settings: event.settings,
          payments: payments,
        );
        emit(state.copyWith(successMessage: 'Receipt sent to printer'));
      } catch (e) {
        emit(state.copyWith(errorMessage: 'Printing failed: ${e.toString()}'));
      }
    });

    on<LoadServicesAnalytics>((event, emit) async {
      emit(state.copyWith(status: ServicesStatus.loading));
      try {
        final analytics = await getServicesAnalytics(event.start, event.end);
        emit(state.copyWith(status: ServicesStatus.success, analytics: analytics));
      } catch (e) {
        emit(state.copyWith(status: ServicesStatus.error, errorMessage: 'Analytics failed: ${e.toString()}'));
      }
    });

    on<LoadServicePresets>((event, emit) async {
      try {
        final presets = await getJobs.repository.getJobPresets();
        emit(state.copyWith(presets: presets));
      } catch (e) {
        emit(state.copyWith(errorMessage: e.toString()));
      }
    });

    on<AddServicePreset>((event, emit) async {
      try {
        await getJobs.repository.addJobPreset(event.name);
        final presets = await getJobs.repository.getJobPresets();
        emit(state.copyWith(presets: presets, successMessage: 'Service offering added!'));
      } catch (e) {
        emit(state.copyWith(errorMessage: e.toString()));
      }
    });

    on<DeleteServicePreset>((event, emit) async {
      try {
        await getJobs.repository.deleteJobPreset(event.name);
        final presets = await getJobs.repository.getJobPresets();
        emit(state.copyWith(presets: presets, successMessage: 'Service offering removed.'));
      } catch (e) {
        emit(state.copyWith(errorMessage: e.toString()));
      }
    });

    on<LoadServiceMaterials>((event, emit) async {
      try {
        final materials = await getJobs.repository.getMaterials(category: event.category);
        final catObjects = await getJobs.repository.getFullMaterialCategories();
        final catNames = catObjects.map((c) => c.name).toList();
        final materialCats = materials.map((m) => m.category).toList();
        final allCategories = {...catNames, ...materialCats}.where((c) => c.trim().isNotEmpty).toList();

        emit(state.copyWith(
          materials: materials,
          categories: allCategories,
          materialCategories: catObjects,
        ));
      } catch (e) {
        emit(state.copyWith(errorMessage: e.toString()));
      }
    });

    on<AddServiceMaterial>((event, emit) async {
      try {
        await getJobs.repository.addMaterial(
          name: event.name,
          category: event.category,
          price: event.price,
          image: event.image,
        );
        final materials = await getJobs.repository.getMaterials();
        final catObjects = await getJobs.repository.getFullMaterialCategories();
        final catNames = catObjects.map((c) => c.name).toList();
        final materialCats = materials.map((m) => m.category).toList();
        final allCategories = {...catNames, ...materialCats}.where((c) => c.trim().isNotEmpty).toList();

        emit(state.copyWith(
          materials: materials,
          categories: allCategories,
          materialCategories: catObjects,
          successMessage: 'Material added successfully!',
        ));
      } catch (e) {
        emit(state.copyWith(errorMessage: e.toString()));
      }
    });

    on<DeleteServiceMaterial>((event, emit) async {
      try {
        await getJobs.repository.deleteMaterial(event.id);
        final materials = await getJobs.repository.getMaterials();
        final catObjects = await getJobs.repository.getFullMaterialCategories();
        final catNames = catObjects.map((c) => c.name).toList();
        final materialCats = materials.map((m) => m.category).toList();
        final allCategories = {...catNames, ...materialCats}.where((c) => c.trim().isNotEmpty).toList();

        emit(state.copyWith(
          materials: materials,
          categories: allCategories,
          materialCategories: catObjects,
          successMessage: 'Material deleted.',
        ));
      } catch (e) {
        emit(state.copyWith(errorMessage: e.toString()));
      }
    });

    on<UpdateServiceMaterial>((event, emit) async {
      try {
        await getJobs.repository.updateMaterial(
          id: event.id,
          name: event.name,
          category: event.category,
          price: event.price,
          image: event.image,
        );
        final materials = await getJobs.repository.getMaterials();
        final catObjects = await getJobs.repository.getFullMaterialCategories();
        final catNames = catObjects.map((c) => c.name).toList();
        final materialCats = materials.map((m) => m.category).toList();
        final allCategories = {...catNames, ...materialCats}.where((c) => c.trim().isNotEmpty).toList();

        emit(state.copyWith(
          materials: materials,
          categories: allCategories,
          materialCategories: catObjects,
          successMessage: 'Material updated successfully!',
        ));
      } catch (e) {
        emit(state.copyWith(errorMessage: e.toString()));
      }
    });

    on<LoadMaterialCategories>((event, emit) async {
      try {
        final categories = await getJobs.repository.getMaterialCategories();
        // Since getMaterialCategories currently returns List<String>, I need to update the repository 
        // to return the full objects or fetch them here.
        // Actually, I'll update the repository method to return the full objects.
        final results = await getJobs.repository.getFullMaterialCategories(); 
        emit(state.copyWith(
          materialCategories: results,
          categories: results.map((e) => e.name).toList(),
        ));
      } catch (e) {
        emit(state.copyWith(errorMessage: e.toString()));
      }
    });

    on<AddMaterialCategory>((event, emit) async {
      try {
        await getJobs.repository.addMaterialCategory(event.name);
        add(const LoadMaterialCategories());
      } catch (e) {
        emit(state.copyWith(errorMessage: e.toString()));
      }
    });

    on<UpdateMaterialCategory>((event, emit) async {
      try {
        await getJobs.repository.updateMaterialCategory(id: event.id, name: event.name);
        add(const LoadMaterialCategories());
      } catch (e) {
        emit(state.copyWith(errorMessage: e.toString()));
      }
    });

    on<DeleteMaterialCategory>((event, emit) async {
      try {
        await getJobs.repository.deleteMaterialCategory(event.id);
        add(const LoadMaterialCategories());
      } catch (e) {
        emit(state.copyWith(errorMessage: e.toString()));
      }
    });

    on<LoadLaborPresets>((event, emit) async {
      try {
        final presets = await getJobs.repository.getLaborPresets();
        emit(state.copyWith(laborPresets: presets));
      } catch (e) {
        emit(state.copyWith(errorMessage: e.toString()));
      }
    });

    on<AddLaborPreset>((event, emit) async {
      try {
        await getJobs.repository.addLaborPreset(name: event.name, amount: event.amount);
        add(const LoadLaborPresets());
      } catch (e) {
        emit(state.copyWith(errorMessage: e.toString()));
      }
    });

    on<UpdateLaborPreset>((event, emit) async {
      try {
        await getJobs.repository.updateLaborPreset(id: event.id, name: event.name, amount: event.amount);
        add(const LoadLaborPresets());
      } catch (e) {
        emit(state.copyWith(errorMessage: e.toString()));
      }
    });

    on<DeleteLaborPreset>((event, emit) async {
      try {
        await getJobs.repository.deleteLaborPreset(event.id);
        add(const LoadLaborPresets());
      } catch (e) {
        emit(state.copyWith(errorMessage: e.toString()));
      }
    });

    on<AddServiceExpense>((event, emit) async {
      try {
        await getJobs.repository.addServiceExpense(
          amount: event.amount,
          description: event.description,
          category: event.category, // Pass category
        );
        // Refresh analytics for the current view
        add(LoadServicesAnalytics(start: event.start, end: event.end));
        emit(state.copyWith(successMessage: 'Service expense logged successfully!'));
      } catch (e) {
        emit(state.copyWith(errorMessage: e.toString()));
      }
    });

    on<LoadServiceExpenseCategories>((event, emit) async {
      try {
        final categories = await getJobs.repository.getServiceExpenseCategories();
        emit(state.copyWith(serviceExpenseCategories: categories));
      } catch (e) {
        emit(state.copyWith(errorMessage: e.toString()));
      }
    });

    on<AddServiceExpenseCategory>((event, emit) async {
      try {
        await getJobs.repository.addServiceExpenseCategory(event.name);
        add(const LoadServiceExpenseCategories());
      } catch (e) {
        emit(state.copyWith(errorMessage: e.toString()));
      }
    });

    on<UpdateServiceExpenseCategory>((event, emit) async {
      try {
        await getJobs.repository.updateServiceExpenseCategory(id: event.id, name: event.name);
        add(const LoadServiceExpenseCategories());
      } catch (e) {
        emit(state.copyWith(errorMessage: e.toString()));
      }
    });

    on<DeleteServiceExpenseCategory>((event, emit) async {
      try {
        await getJobs.repository.deleteServiceExpenseCategory(event.id);
        add(const LoadServiceExpenseCategories());
      } catch (e) {
        emit(state.copyWith(errorMessage: e.toString()));
      }
    });

    _seedMaterialCategories();
  }

  void _seedMaterialCategories() async {
    final categories = await getJobs.repository.getMaterialCategories();
    if (categories.isEmpty) {
      // Transfer existing categories from materials
      final materials = await getJobs.repository.getMaterials();
      final existingNames = materials.map((m) => m.category).toSet();
      for (final name in existingNames) {
        await getJobs.repository.addMaterialCategory(name);
      }
      add(const LoadMaterialCategories());
    }
  }

  void _seedMaterials() async {
    final existing = await getJobs.repository.getMaterials();
    if (existing.isEmpty) {
      await getJobs.repository.addMaterial(name: 'Engine Oil (5L)', category: 'Automotive', price: 15000);
      await getJobs.repository.addMaterial(name: 'Brake Pads', category: 'Automotive', price: 8500);
      await getJobs.repository.addMaterial(name: 'Cement (Bag)', category: 'Building', price: 5000);
      await getJobs.repository.addMaterial(name: 'Paint (Gallon)', category: 'Building', price: 12000);
      await getJobs.repository.addMaterial(name: 'Cotton Fabric', category: 'Fashion', price: 3000);
      await getJobs.repository.addMaterial(name: 'Zipper', category: 'Fashion', price: 500);
    }
  }
}
