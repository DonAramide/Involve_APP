import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:involve_app/features/school_finance/presentation/widgets/global_payment_notification_listener.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:get_it/get_it.dart';
import 'package:involve_app/features/school_finance/domain/repositories/notification_repository.dart';

import 'package:involve_app/features/school/data/repositories/school_repository_impl.dart';
import 'package:involve_app/features/school/presentation/bloc/school_bloc.dart';
import 'package:involve_app/features/school/domain/repositories/school_repository.dart';
import 'package:involve_app/features/dashboard/presentation/pages/dashboard_page.dart';
import 'package:involve_app/features/activation/presentation/pages/activation_page.dart';
import 'package:involve_app/core/utils/bloc_observer.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:involve_app/features/stock/data/repositories/item_repository_impl.dart';
import 'package:involve_app/features/stock/domain/repositories/item_repository.dart';
import 'package:involve_app/features/stock/data/repositories/category_repository_impl.dart';
import 'package:involve_app/features/stock/domain/repositories/category_repository.dart';
import 'package:involve_app/features/stock/domain/usecases/stock_usecases.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_bloc.dart';
import 'package:involve_app/features/invoicing/data/repositories/invoice_repository_impl.dart';
import 'package:involve_app/features/invoicing/domain/repositories/invoice_repository.dart';
import 'package:involve_app/features/invoicing/domain/usecases/history_usecases.dart';
import 'package:involve_app/features/invoicing/domain/services/invoice_calculation_service.dart';
import 'package:involve_app/features/invoicing/presentation/bloc/invoice_bloc.dart';
import 'package:involve_app/features/invoicing/presentation/history/bloc/history_bloc.dart';
import 'package:involve_app/features/settings/data/repositories/settings_repository_impl.dart';
import 'package:involve_app/features/settings/domain/repositories/settings_repository.dart';
import 'package:involve_app/features/settings/domain/services/security_service.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/staff_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/staff_state.dart';
import 'package:involve_app/features/settings/data/repositories/staff_repository_impl.dart';
import 'package:involve_app/features/settings/domain/repositories/staff_repository.dart';
import 'package:involve_app/features/printer/data/repositories/cross_platform_printer_service.dart';
import 'package:involve_app/features/printer/data/repositories/blue_thermal_printer_service.dart';
import 'package:involve_app/features/printer/data/repositories/network_printer_service.dart';
import 'package:involve_app/features/printer/data/repositories/unified_printer_service.dart';
import 'package:involve_app/features/printer/data/repositories/printer_repository_impl.dart';
import 'package:involve_app/features/printer/domain/repositories/printer_service.dart';
import 'package:involve_app/features/printer/domain/usecases/printer_usecases.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_bloc.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_state.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_state.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:involve_app/core/license/landing_page.dart';
import 'package:involve_app/core/services/backup_service.dart';
import 'package:involve_app/core/sync/data/repositories/sync_repository_impl.dart';
import 'package:involve_app/core/sync/domain/services/discovery_service.dart';
import 'package:involve_app/core/sync/domain/services/sync_server.dart';
import 'package:involve_app/core/sync/domain/services/sync_manager.dart';
import 'package:involve_app/core/sync/presentation/bloc/sync_bloc.dart';
import 'package:involve_app/core/sync/domain/services/bluetooth_discovery_service.dart';
import 'package:involve_app/core/sync/domain/services/bluetooth_sync_server.dart';
import 'package:involve_app/core/sync/domain/services/bluetooth_discovery_service_stub.dart'
    if (dart.library.io) 'package:involve_app/core/sync/domain/services/bluetooth_discovery_service_native.dart'
    if (dart.library.html) 'package:involve_app/core/sync/domain/services/bluetooth_discovery_service_web.dart';
import 'package:involve_app/core/utils/device_info_service.dart';
import 'package:involve_app/core/utils/route_observer.dart';
import 'package:involve_app/core/license/license_service.dart';
import 'package:involve_app/core/widgets/restart_widget.dart';
import 'package:involve_app/features/invoicing/presentation/pages/payment_ledger_test_page.dart';
import 'package:involve_app/features/school_finance/presentation/pages/school_finance_dashboard.dart';
import 'package:involve_app/features/school/domain/repositories/lesson_note_repository.dart';
import 'package:involve_app/features/school/data/repositories/lesson_note_repository_impl.dart';
import 'package:involve_app/features/school/domain/services/ai_service_interface.dart';
import 'package:involve_app/features/school/data/services/lesson_note_api_service.dart';
import 'package:involve_app/features/school/presentation/bloc/lesson_note_bloc.dart';
import 'package:involve_app/features/school/data/services/lesson_note_sync_service.dart';

import 'package:involve_app/features/school_finance/domain/repositories/finance_repository.dart';
import 'package:involve_app/features/school_finance/data/repositories/finance_repository_impl.dart';
import 'package:involve_app/features/school_finance/data/datasources/finance_remote_data_source.dart';
import 'package:involve_app/features/school_finance/data/datasources/finance_realtime_data_source.dart';
import 'package:involve_app/features/school_finance/presentation/bloc/finance_bloc.dart';
import 'package:involve_app/features/school_billing/domain/repositories/billing_repository.dart';
import 'package:involve_app/features/school_billing/data/repositories/billing_repository_impl.dart';
import 'package:involve_app/features/school_billing/presentation/bloc/billing_bloc.dart';
import 'package:involve_app/core/services/finance_api_client.dart';
import 'package:involve_app/features/services/data/repositories/services_repository_impl.dart';
import 'package:involve_app/features/services/domain/repositories/services_repository.dart';
import 'package:involve_app/features/services/data/services/services_backup_service.dart';
import 'package:involve_app/features/services/domain/usecases/service_usecases.dart';
import 'package:involve_app/features/services/presentation/bloc/services_bloc.dart';
import 'package:involve_app/features/services/domain/usecases/print_job_receipt.dart';
import 'package:involve_app/features/services/presentation/bloc/services_event.dart';
import 'package:involve_app/features/services/presentation/pages/services_dashboard_page.dart';
import 'package:involve_app/features/admin/domain/repositories/admin_repository.dart';
import 'package:involve_app/features/admin/presentation/bloc/admin_bloc.dart';
import 'package:involve_app/features/admin/presentation/pages/admin_dashboard.dart';
import 'package:involve_app/features/admin/presentation/pages/admin_finance_dashboard.dart';
import 'package:involve_app/features/admin/presentation/pages/api_key_management_page.dart';
import 'package:involve_app/features/school_finance/presentation/bloc/reconciliation_bloc.dart';
import 'package:involve_app/features/school_finance/presentation/pages/payout_settings_page.dart';
import 'package:involve_app/features/school_finance/presentation/pages/payout_history_page.dart';
import 'package:involve_app/features/school_finance/presentation/pages/executive_finance_dashboard.dart';
import 'package:involve_app/features/school_finance/presentation/pages/defaulters_page.dart';
import 'package:involve_app/features/school_finance/presentation/bloc/reconciliation_event.dart';
import 'package:involve_app/features/school_finance/domain/repositories/finance_repository_new.dart';
import 'package:dio/dio.dart';
import 'package:involve_app/features/stock/presentation/pages/inventory_report_page.dart';
import 'package:involve_app/features/invoicing/presentation/pages/customer_lookup_page.dart';
import 'package:involve_app/features/invoicing/presentation/pages/create_invoice_page.dart';
import 'package:involve_app/features/printer/presentation/pages/printer_settings_page.dart';
import 'package:involve_app/features/stock/presentation/pages/stock_management_page.dart';
import 'package:involve_app/features/invoicing/presentation/history/pages/invoice_history_page.dart';
import 'package:involve_app/features/dashboard/presentation/pages/calculator_page.dart';
import 'package:involve_app/features/settings/presentation/pages/settings_page.dart';
import 'package:involve_app/features/settings/presentation/pages/super_admin_settings_page.dart';
import 'package:involve_app/features/admin/presentation/pages/system_setup_page.dart';
import 'package:involve_app/features/activation/presentation/pages/go_pro_page.dart';
import 'package:involve_app/features/services/presentation/pages/create_job_page.dart';
import 'package:involve_app/features/services/presentation/pages/jobs_list_page.dart';
import 'package:involve_app/features/services/presentation/pages/customers_list_page.dart';
import 'package:involve_app/features/school/presentation/pages/student_analytics_page.dart';
import 'package:involve_app/features/school/presentation/pages/student_list_page.dart';
import 'package:involve_app/features/school/presentation/pages/teacher_list_page.dart';
import 'package:involve_app/features/school/presentation/pages/school_setup_page.dart';
import 'package:involve_app/features/school/presentation/pages/fee_management_page.dart';
import 'package:involve_app/features/school/presentation/pages/manage_subjects_page.dart';
import 'package:involve_app/features/school/presentation/pages/result_entry_page.dart';
import 'package:involve_app/features/school/presentation/pages/lesson_notes_list_page.dart';
import 'package:involve_app/features/dashboard/presentation/pages/about_page.dart';
import 'package:involve_app/features/help/presentation/pages/help_page.dart';
import 'package:involve_app/features/school/presentation/pages/app_user_guide_page.dart';
import 'package:involve_app/core/sync/presentation/pages/device_sync_page.dart';
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Supabase (User must replace these with real values)
  await Supabase.initialize(
    url: 'https://placeholder-project.supabase.co',
    anonKey: 'placeholder-anon-key',
  );
  
  // Set up global BLoC observer
  Bloc.observer = SimpleBlocObserver();
  
  runApp(RestartWidget<AppDependencies>(
    initialize: () => AppDependencies.initialize(),
    childBuilder: (context, deps) => InvolveApp(dependencies: deps),
  ));
}

/// A container class for all application-wide dependencies.
/// This allows us to re-initialize everything (including the database)
/// when the app performs a "Soft Restart".
class AppDependencies {
  final AppDatabase database;
  final ItemRepositoryImpl itemRepository;
  final CategoryRepositoryImpl categoryRepository;
  final InvoiceRepositoryImpl invoiceRepository;
  final SettingsRepositoryImpl settingsRepository;
  final UnifiedPrinterService printerService;
  final String deviceId;
  final SecurityService securityService;
  final InvoiceCalculationService calculationService;
  final BackupService backupService;
  final GetItems getItems;
  final AddItem addItem;
  final UpdateItem updateItem;
  final DeleteItem deleteItem;
  final GetCategories getCategories;
  final AddNewCategory addCategory;
  final DeleteCategoryUseCase deleteCategory;
  final GetBluetoothDevices getDevices;
  final ConnectToPrinter connectPrinter;
  final PrintInvoiceCommands printInvoice;
  final GetInvoiceHistory getInvoiceHistory;
  final GetInvoiceDetails getInvoiceDetails;
  final IncreaseStock increaseStock;
  final GetStockHistory getStockHistory;
  final GetInventoryReport getInventoryReport;
  final GetProfitReport getProfitReport;
  final AddExpense addExpense;
  final GetExpenses getExpenses;
  final GetTotalExpenses getTotalExpenses;
  final StaffRepositoryImpl staffRepository;
  final SyncRepository syncRepository;
  final DiscoveryService discoveryService;
  final BluetoothDiscoveryService bluetoothDiscoveryService;
  final SyncServer syncServer;
  final BluetoothSyncServer bluetoothSyncServer;
  final SyncManager syncManager;
  final SchoolRepositoryImpl schoolRepository;
  final PrinterRepository printerRepository;
  final IFinanceRepository financeRepository;
  final IBillingRepository billingRepository;
  final IServicesRepository servicesRepository;
  final ServicesBackupService servicesBackupService;
  final GetJobs getJobsUC;
  final CreateJob createJobUC;
  final AddPayment addPaymentUC;
  final UpdateJobStatus updateJobStatusUC;
  final GetCustomers getCustomersUC;
  final CreateCustomer createCustomerUC;
  final PrintJobReceipt printJobReceiptUC;
  final GetJobPayments getJobPaymentsUC;
  final GetServicesAnalytics getServicesAnalyticsUC;
  final ILessonNoteRepository lessonNoteRepository;
  final IAIService aiService;
  final LessonNoteSyncService lessonNoteSyncService;
  final IAdminRepository adminRepository;
  final FinanceRepository financeRepositoryNew;
  final NotificationRepository notificationRepository;


  AppDependencies({
    required this.database,
    required this.itemRepository,
    required this.categoryRepository,
    required this.invoiceRepository,
    required this.settingsRepository,
    required this.printerService,
    required this.securityService,
    required this.calculationService,
    required this.backupService,
    required this.getItems,
    required this.addItem,
    required this.updateItem,
    required this.deleteItem,
    required this.getCategories,
    required this.addCategory,
    required this.deleteCategory,
    required this.getDevices,
    required this.connectPrinter,
    required this.printInvoice,
    required this.getInvoiceHistory,
    required this.getInvoiceDetails,
    required this.increaseStock,
    required this.getStockHistory,
    required this.getInventoryReport,
    required this.getProfitReport,
    required this.addExpense,
    required this.getExpenses,
    required this.getTotalExpenses,
    required this.staffRepository,
    required this.syncRepository,
    required this.discoveryService,
    required this.bluetoothDiscoveryService,
    required this.syncServer,
    required this.bluetoothSyncServer,
    required this.syncManager,
    required this.deviceId,
    required this.schoolRepository,
    required this.printerRepository,
    required this.financeRepository,
    required this.billingRepository,
    required this.servicesRepository,
    required this.servicesBackupService,
    required this.getJobsUC,
    required this.createJobUC,
    required this.addPaymentUC,
    required this.updateJobStatusUC,
    required this.getCustomersUC,
    required this.createCustomerUC,
    required this.printJobReceiptUC,
    required this.getJobPaymentsUC,
    required this.getServicesAnalyticsUC,
    required this.lessonNoteRepository,
    required this.aiService,
    required this.lessonNoteSyncService,
    required this.adminRepository,
    required this.financeRepositoryNew,
    required this.notificationRepository,
  });


  static Future<AppDependencies> initialize() async {
    final deps = await _build();
    // Cold Start Optimization: Reset stuck syncs
    await deps.lessonNoteRepository.resetStuckSyncs();
    return deps;
  }

  static Future<AppDependencies> _build() async {
    final database = AppDatabase();
    
    // 2. License Service
    LicenseService.init(database);
    
    final String baseUrl = kDebugMode ? 'http://192.168.1.194:3004' : 'https://api.iips-finance.com';

    final financeRepoNew = FinanceRepository(
      FinanceApiClient(
        baseUrl: baseUrl,
        getToken: () async => Supabase.instance.client.auth.currentSession?.accessToken,
        getTenantId: () async => await SecurityService().getTenantId(),
      ),
      FinanceRealtimeDataSourceImpl(Supabase.instance.client),
    );

    // 3. Repositories
    final itemRepository = ItemRepositoryImpl(database);
    final invoiceRepository = InvoiceRepositoryImpl(database, financeRepository: financeRepoNew);
    final settingsRepository = SettingsRepositoryImpl(database);
    final categoryRepository = CategoryRepositoryImpl(database);
    final staffRepository = StaffRepositoryImpl(database);
    final syncRepository = SyncRepositoryImpl(database);
    final schoolRepository = SchoolRepositoryImpl(database);
    final lessonNoteRepo = LessonNoteRepositoryImpl(database);
    final printerRepository = PrinterRepositoryImpl(database);
    
    // SecurityService must be initialized before deviceId
    final securityServiceForId = SecurityService();
    final deviceId = await securityServiceForId.getPersistentDeviceId();
    
    // 4. Services Module (100% Offline)
    final servicesRepo = ServicesRepositoryImpl(db: database);
    final servicesBackupService = ServicesBackupService(db: database);
    
    // 5. Shared Services
    final securityService = SecurityService();
    final bleService = CrossPlatformPrinterService();
    final sppService = BlueThermalPrinterService();
    final networkService = NetworkPrinterService();
    final printerService = UnifiedPrinterService(
      bleService: bleService,
      sppService: sppService,
      networkService: networkService,
    );
    final calculationService = InvoiceCalculationService();
    final backupService = BackupService(database: database);
    
    final discoveryService = DiscoveryService();
    const secretToken = 'PRO-TOKEN-123';
    
    final syncServer = SyncServer(
      database: database,
      syncRepository: syncRepository,
      secretToken: secretToken,
    );

    final bluetoothDiscoveryService = createBluetoothDiscoveryService();
    final bluetoothSyncServer = BluetoothSyncServer(
      syncRepository: syncRepository,
      deviceId: deviceId,
    );

    final notificationRepo = NotificationRepository(Dio(BaseOptions(baseUrl: baseUrl)));

    // Register in GetIt for legacy sl access
    final sl = GetIt.instance;
    if (!sl.isRegistered<FinanceRepository>()) {
      sl.registerSingleton<FinanceRepository>(financeRepoNew);
    }
    if (!sl.isRegistered<NotificationRepository>()) {
      sl.registerSingleton<NotificationRepository>(notificationRepo);
    }

    return AppDependencies(
      database: database,
      itemRepository: itemRepository,
      categoryRepository: categoryRepository,
      invoiceRepository: invoiceRepository,
      settingsRepository: settingsRepository,
      staffRepository: staffRepository,
      schoolRepository: schoolRepository,
      printerRepository: printerRepository,
      syncRepository: syncRepository,
      printerService: printerService,
      securityService: securityService,
      calculationService: calculationService,
      backupService: backupService,
      discoveryService: discoveryService,
      bluetoothDiscoveryService: bluetoothDiscoveryService,
      syncServer: syncServer,
      bluetoothSyncServer: bluetoothSyncServer,
      syncManager: SyncManager(
        database: database,
        syncRepository: syncRepository,
        discoveryService: discoveryService,
        deviceId: deviceId,
        secretToken: secretToken,
      ),
      deviceId: deviceId,
      getItems: GetItems(itemRepository),
      addItem: AddItem(itemRepository),
      updateItem: UpdateItem(itemRepository),
      deleteItem: DeleteItem(itemRepository),
      increaseStock: IncreaseStock(itemRepository),
      getStockHistory: GetStockHistory(itemRepository),
      getInventoryReport: GetInventoryReport(itemRepository),
      getProfitReport: GetProfitReport(itemRepository),
      addExpense: AddExpense(itemRepository),
      getExpenses: GetExpenses(itemRepository),
      getTotalExpenses: GetTotalExpenses(itemRepository),
      getCategories: GetCategories(categoryRepository),
      addCategory: AddNewCategory(categoryRepository),
      deleteCategory: DeleteCategoryUseCase(categoryRepository),
      getDevices: GetBluetoothDevices(printerService),
      connectPrinter: ConnectToPrinter(printerService),
      printInvoice: PrintInvoiceCommands(printerService),
      getInvoiceHistory: GetInvoiceHistory(invoiceRepository),
      getInvoiceDetails: GetInvoiceDetails(invoiceRepository),
      financeRepository: FinanceRepositoryImpl(
        remoteDataSource: FinanceRemoteDataSourceImpl(
          FinanceApiClient(
            baseUrl: baseUrl,
            getToken: () async => Supabase.instance.client.auth.currentSession?.accessToken,
            getTenantId: () async => await SecurityService().getTenantId(),
          ),
        ),
        realtimeDataSource: FinanceRealtimeDataSourceImpl(Supabase.instance.client),
      ),
      financeRepositoryNew: financeRepoNew,
      notificationRepository: notificationRepo,
      billingRepository: BillingRepositoryImpl(
        FinanceApiClient(
          baseUrl: baseUrl,
          getToken: () async => Supabase.instance.client.auth.currentSession?.accessToken,
          getTenantId: () async => await SecurityService().getTenantId(),
        ),
      ),
      servicesRepository: servicesRepo,
      servicesBackupService: servicesBackupService,
      getJobsUC: GetJobs(servicesRepo),
      createJobUC: CreateJob(servicesRepo),
      addPaymentUC: AddPayment(servicesRepo),
      updateJobStatusUC: UpdateJobStatus(servicesRepo),
      getCustomersUC: GetCustomers(servicesRepo),
      createCustomerUC: CreateCustomer(servicesRepo),
      printJobReceiptUC: PrintJobReceipt(printerService),
      getJobPaymentsUC: GetJobPayments(servicesRepo),
      getServicesAnalyticsUC: GetServicesAnalytics(servicesRepo),
      lessonNoteRepository: lessonNoteRepo,
      aiService: LessonNoteApiService(Dio(BaseOptions(baseUrl: baseUrl))),
      lessonNoteSyncService: LessonNoteSyncService(lessonNoteRepo),
      adminRepository: AdminRepositoryImpl(
        FinanceApiClient(
          baseUrl: baseUrl,
          getToken: () async => Supabase.instance.client.auth.currentSession?.accessToken,
          getTenantId: () async => await SecurityService().getTenantId(),
        ),
      ),
    );
  }
}

class InvolveApp extends StatefulWidget {
  final AppDependencies dependencies;
  const InvolveApp({super.key, required this.dependencies});

  @override
  State<InvolveApp> createState() => _InvolveAppState();
}

class _InvolveAppState extends State<InvolveApp> {
  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();

  @override
  Widget build(BuildContext context) {
    final dependencies = widget.dependencies;
    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider<ItemRepository>(create: (_) => dependencies.itemRepository),
        RepositoryProvider<InvoiceRepository>(create: (_) => dependencies.invoiceRepository),
        RepositoryProvider<SettingsRepository>(create: (_) => dependencies.settingsRepository),
        RepositoryProvider<CategoryRepository>(create: (_) => dependencies.categoryRepository),
        RepositoryProvider<StaffRepository>(create: (_) => dependencies.staffRepository),
        RepositoryProvider<SchoolRepository>(create: (_) => dependencies.schoolRepository),
        RepositoryProvider<SyncRepository>(create: (_) => dependencies.syncRepository),
        RepositoryProvider<IFinanceRepository>(create: (_) => dependencies.financeRepository),
        RepositoryProvider<FinanceRepository>(create: (_) => dependencies.financeRepositoryNew),
        RepositoryProvider<IBillingRepository>(create: (_) => dependencies.billingRepository),
        RepositoryProvider<IServicesRepository>(create: (_) => dependencies.servicesRepository),
        RepositoryProvider<ILessonNoteRepository>(create: (_) => dependencies.lessonNoteRepository),
        RepositoryProvider<IAdminRepository>(create: (_) => dependencies.adminRepository),
      ],

      child: MultiBlocProvider(
        providers: [
          BlocProvider(
            create: (_) => StockBloc(
              getItems: dependencies.getItems,
              addItem: dependencies.addItem,
              updateItem: dependencies.updateItem,
              deleteItem: dependencies.deleteItem,
              getCategories: dependencies.getCategories,
              addCategory: dependencies.addCategory,
              deleteCategory: dependencies.deleteCategory,
              increaseStock: dependencies.increaseStock,
              getStockHistory: dependencies.getStockHistory,
              getInventoryReport: dependencies.getInventoryReport,
              getProfitReport: dependencies.getProfitReport,
              addExpenseUC: dependencies.addExpense,
              getExpensesUC: dependencies.getExpenses,
              getTotalExpensesUC: dependencies.getTotalExpenses,
            )..add(LoadItems()),
          ),
          BlocProvider(
            create: (_) => InvoiceBloc(
              repository: dependencies.invoiceRepository,
              calculationService: dependencies.calculationService,
            ),
          ),
          BlocProvider(
            create: (_) => HistoryBloc(
              getHistory: dependencies.getInvoiceHistory,
              getInvoiceDetails: dependencies.getInvoiceDetails,
            ),
          ),
          BlocProvider(
            create: (_) => SettingsBloc(
              repository: dependencies.settingsRepository,
              securityService: dependencies.securityService,
              backupService: dependencies.backupService,
            )..add(LoadSettings()),
          ),
          BlocProvider(
            create: (_) => PrinterBloc(
              getDevices: dependencies.getDevices,
              connectPrinter: dependencies.connectPrinter,
              printInvoice: dependencies.printInvoice,
              repository: dependencies.printerRepository,
            )..add(AutoConnectPrinter()),
          ),
          BlocProvider(
            create: (_) => StaffBloc(
              repository: dependencies.staffRepository,
            )..add(LoadStaffList()),
          ),
          BlocProvider(
            create: (_) => SyncBloc(
              discoveryService: dependencies.discoveryService,
              bluetoothDiscoveryService: dependencies.bluetoothDiscoveryService,
              syncManager: dependencies.syncManager,
              syncServer: dependencies.syncServer,
              bluetoothSyncServer: dependencies.bluetoothSyncServer,
              syncRepository: dependencies.syncRepository,
              db: dependencies.database,
              deviceId: dependencies.deviceId,
            )..add(InitializeSync()),
          ),
          BlocProvider(
            create: (_) => SchoolBloc(
              repository: dependencies.schoolRepository,
              itemRepository: dependencies.itemRepository,
              invoiceRepository: dependencies.invoiceRepository,
            ),
          ),
          BlocProvider(
            create: (context) => FinanceBloc(
              repository: dependencies.financeRepository,
            ),
          ),
          BlocProvider(
            create: (context) => BillingBloc(
              repository: dependencies.billingRepository,
            ),
          ),
          BlocProvider(
            create: (context) => ServicesBloc(
              getJobs: dependencies.getJobsUC,
              createJob: dependencies.createJobUC,
              addPayment: dependencies.addPaymentUC,
              updateJobStatus: dependencies.updateJobStatusUC,
              getCustomers: dependencies.getCustomersUC,
              createCustomer: dependencies.createCustomerUC,
              backupService: dependencies.servicesBackupService,
              printJobReceipt: dependencies.printJobReceiptUC,
              getJobPayments: dependencies.getJobPaymentsUC,
              getServicesAnalytics: dependencies.getServicesAnalyticsUC,
            )..add(const LoadServicesJobs()),
          ),
          BlocProvider(
            create: (context) => LessonNoteBloc(
              repository: dependencies.lessonNoteRepository,
              aiService: dependencies.aiService,
              securityService: dependencies.securityService,
            ),
          ),
          BlocProvider(
            create: (context) => AdminBloc(
              repository: dependencies.adminRepository,
            )..add(LoadAuditLogs()),
          ),
          BlocProvider(
            create: (context) => ReconciliationBloc(
              repository: dependencies.financeRepositoryNew,
            )..add(const LoadReconciliation()),
          ),
          RepositoryProvider<LessonNoteSyncService>(
            create: (_) => dependencies.lessonNoteSyncService,
          ),
        ],

        child: BlocBuilder<SettingsBloc, SettingsState>(
        builder: (context, state) {
          final themeMode = state.settings?.themeMode ?? 'system';
          return MaterialApp(
            title: 'Invify',
            debugShowCheckedModeBanner: false,
            themeMode: themeMode == 'light' 
                ? ThemeMode.light 
                : themeMode == 'dark' 
                    ? ThemeMode.dark 
                    : ThemeMode.system,
            navigatorKey: _navigatorKey,
            builder: (context, child) {
              return GlobalPaymentNotificationListener(
                navigatorKey: _navigatorKey,
                child: child ?? const SizedBox(),
              );
            },
            theme: ThemeData(
              fontFamily: kIsWeb ? 'sans-serif' : null,
              colorScheme: ColorScheme.fromSeed(seedColor: Color(state.settings?.primaryColor ?? 0xFF2196F3)),
              useMaterial3: true,
              textSelectionTheme: TextSelectionThemeData(
                cursorColor: Color(state.settings?.primaryColor ?? 0xFF2196F3),
              ),
            ),
            darkTheme: ThemeData(
              fontFamily: kIsWeb ? 'sans-serif' : null,
              colorScheme: ColorScheme.fromSeed(
                seedColor: Color(state.settings?.primaryColor ?? 0xFF2196F3), 
                brightness: Brightness.dark,
              ),
              useMaterial3: true,
              textSelectionTheme: TextSelectionThemeData(
                cursorColor: Color(state.settings?.primaryColor ?? 0xFF2196F3),
              ),
            ),
            navigatorObservers: [AppRouteObserver(context)],
            home: const LandingPage(),
            routes: {
              DashboardPage.routeName: (_) => const DashboardPage(),
              ActivationPage.routeName: (_) => const ActivationPage(),
              '/payment_test': (_) => const PaymentLedgerTestPage(),
              '/school_finance': (_) => const SchoolFinanceDashboardPage(),
              '/payout_settings': (_) => const PayoutSettingsPage(),
              '/payout_history': (_) => const PayoutHistoryPage(),
              '/executive_finance': (_) => const ExecutiveFinanceDashboard(),
              '/defaulters': (_) => const DefaultersPage(),
              '/admin_hub': (_) => const AdminDashboardPage(),
              '/admin_finance': (_) => const AdminFinanceDashboardPage(),
              '/api_keys': (_) => const ApiKeyManagementPage(),
              '/inventory_report': (_) => const InventoryReportPage(),
              '/customer_lookup': (_) => const CustomerLookupPage(),
              '/create_invoice': (_) => const CreateInvoicePage(),
              '/printer_settings': (_) => const PrinterSettingsPage(),
              '/stock_management': (_) => const StockManagementPage(),
              '/invoice_history': (_) => const InvoiceHistoryPage(),
              '/calculator': (_) => const CalculatorPage(),
              '/settings': (_) => const SettingsPage(),
              '/super_admin_settings': (_) => const SuperAdminSettingsPage(),
              '/system_setup': (_) => const SystemSetupPage(),
              '/go_pro': (_) => const GoProPage(),
              '/services_dashboard': (_) => const ServicesDashboardPage(),
              '/create_job': (_) => const CreateJobPage(),
              '/jobs_list': (_) => const JobsListPage(),
              '/customers_list': (_) => const CustomersListPage(),
              '/student_analytics': (_) => const StudentAnalyticsPage(),
              '/student_list': (_) => const StudentListPage(),
              '/teacher_list': (_) => const TeacherListPage(),
              '/school_setup': (_) => const SchoolSetupPage(),
              '/fee_management': (_) => const FeeManagementPage(),
              '/manage_subjects': (_) => const ManageSubjectsPage(),
              '/result_entry': (_) => const ResultEntryPage(),
              '/lesson_notes_list': (_) => const LessonNotesListPage(),
              '/about': (_) => const AboutPage(),
              '/help': (_) => const HelpPage(),
              '/user_guide': (_) => const AppUserGuidePage(),
              '/device_sync': (_) => const DeviceSyncPage(),
            },

            );
          },
        ),
      ),
    );
  }
}
