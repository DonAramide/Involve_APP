import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_bloc/flutter_bloc.dart';
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

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set up global BLoC observer
  Bloc.observer = SimpleBlocObserver();
  
  runApp(RestartWidget<AppDependencies>(
    initialize: () => AppDependencies.initialize(),
    childBuilder: (context, deps) => MyApp(dependencies: deps),
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
  final String deviceId;
  final SchoolRepositoryImpl schoolRepository;
  final PrinterRepository printerRepository;

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
  });

  static Future<AppDependencies> initialize() async {
    // 1. Database
    final database = AppDatabase();
    
    // 2. License Service
    LicenseService.init(database);
    
    // 3. Repositories
    final itemRepository = ItemRepositoryImpl(database);
    final invoiceRepository = InvoiceRepositoryImpl(database);
    final settingsRepository = SettingsRepositoryImpl(database);
    final categoryRepository = CategoryRepositoryImpl(database);
    final staffRepository = StaffRepositoryImpl(database);
    final schoolRepository = SchoolRepositoryImpl(database);
    final printerRepository = PrinterRepositoryImpl(database);
    final syncRepository = SyncRepositoryImpl(database);
    
    // 4. Services
    final bleService = CrossPlatformPrinterService();
    final sppService = BlueThermalPrinterService();
    final networkService = NetworkPrinterService();
    final printerService = UnifiedPrinterService(
      bleService: bleService,
      sppService: sppService,
      networkService: networkService,
    );
    final securityService = SecurityService();
    final calculationService = InvoiceCalculationService();
    final backupService = BackupService(database: database);
    
    final discoveryService = DiscoveryService();
    final deviceId = await DeviceInfoService.getDeviceSuffix();
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
    
    final syncManager = SyncManager(
      database: database,
      discoveryService: discoveryService,
      syncRepository: syncRepository,
      deviceId: deviceId,
      secretToken: secretToken,
    );
    
    // 5. Use Cases
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
      syncManager: syncManager,
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
    );
  }
}

class MyApp extends StatelessWidget {
  final AppDependencies dependencies;

  const MyApp({
    super.key,
    required this.dependencies,
  });

  @override
  Widget build(BuildContext context) {
    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider<ItemRepository>(create: (_) => dependencies.itemRepository),
        RepositoryProvider<InvoiceRepository>(create: (_) => dependencies.invoiceRepository),
        RepositoryProvider<SettingsRepository>(create: (_) => dependencies.settingsRepository),
        RepositoryProvider<CategoryRepository>(create: (_) => dependencies.categoryRepository),
        RepositoryProvider<StaffRepository>(create: (_) => dependencies.staffRepository),
        RepositoryProvider<SchoolRepository>(create: (_) => dependencies.schoolRepository),
        RepositoryProvider<SyncRepository>(create: (_) => dependencies.syncRepository),
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
            },
            );
          },
        ),
      ),
    );
  }
}
