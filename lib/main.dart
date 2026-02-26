import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/core/license/landing_page.dart';
import 'core/utils/bloc_observer.dart';
import 'features/stock/data/datasources/app_database.dart';
import 'features/stock/data/repositories/item_repository_impl.dart';
import 'features/stock/data/repositories/category_repository_impl.dart';
import 'features/stock/domain/usecases/stock_usecases.dart';
import 'features/stock/presentation/bloc/stock_bloc.dart';
import 'features/invoicing/data/repositories/invoice_repository_impl.dart';
import 'features/invoicing/domain/usecases/history_usecases.dart';
import 'features/invoicing/domain/services/invoice_calculation_service.dart';
import 'features/invoicing/presentation/bloc/invoice_bloc.dart';
import 'features/invoicing/presentation/history/bloc/history_bloc.dart';
import 'features/settings/data/repositories/settings_repository_impl.dart';
import 'features/settings/domain/services/security_service.dart';
import 'features/settings/presentation/bloc/settings_bloc.dart';
import 'features/settings/presentation/bloc/staff_bloc.dart';
import 'features/settings/presentation/bloc/staff_state.dart';
import 'features/settings/data/repositories/staff_repository_impl.dart';
import 'features/printer/data/repositories/cross_platform_printer_service.dart';
import 'features/printer/data/repositories/blue_thermal_printer_service.dart';
import 'features/printer/data/repositories/network_printer_service.dart';
import 'features/printer/data/repositories/unified_printer_service.dart';
import 'features/printer/domain/repositories/printer_service.dart';
import 'features/printer/domain/usecases/printer_usecases.dart';
import 'features/printer/presentation/bloc/printer_bloc.dart';
import 'features/stock/presentation/bloc/stock_state.dart';
import 'features/settings/presentation/bloc/settings_state.dart';
// import 'features/dashboard/presentation/pages/dashboard_page.dart';
import 'core/services/backup_service.dart';
import 'core/sync/data/repositories/sync_repository_impl.dart';
import 'core/sync/domain/services/discovery_service.dart';
import 'core/sync/domain/services/sync_server.dart';
import 'core/sync/domain/services/sync_manager.dart';
import 'core/sync/presentation/bloc/sync_bloc.dart';
import 'core/sync/domain/services/bluetooth_discovery_service.dart';
import 'core/sync/domain/services/bluetooth_sync_server.dart';
import 'core/sync/domain/services/bluetooth_discovery_service_stub.dart'
    if (dart.library.io) 'core/sync/domain/services/bluetooth_discovery_service_native.dart'
    if (dart.library.html) 'core/sync/domain/services/bluetooth_discovery_service_web.dart';
import 'core/utils/device_info_service.dart';

import 'package:involve_app/core/license/license_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set up global BLoC observer
  Bloc.observer = SimpleBlocObserver();
  
  // Initialize database
  final database = AppDatabase();
  
  // Initialize License Service
  LicenseService.init(database);
  
  // Initialize repositories
  final itemRepository = ItemRepositoryImpl(database);
  final invoiceRepository = InvoiceRepositoryImpl(database);
  final settingsRepository = SettingsRepositoryImpl(database);
  final categoryRepository = CategoryRepositoryImpl(database);
  final staffRepository = StaffRepositoryImpl(database);
  
  // Initialize services
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
  
  // Initialize Sync Infrastructure
  final syncRepository = SyncRepositoryImpl(database);
  final discoveryService = DiscoveryService();
  final deviceId = await DeviceInfoService.getDeviceSuffix();
  final secretToken = 'PRO-TOKEN-123'; // TODO: Load from secure storage
  
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
  
  // Initialize use cases
  final getItems = GetItems(itemRepository);
  final addItem = AddItem(itemRepository);
  final updateItem = UpdateItem(itemRepository);
  final deleteItem = DeleteItem(itemRepository);
  final increaseStock = IncreaseStock(itemRepository);
  final getStockHistory = GetStockHistory(itemRepository);
  final getInventoryReport = GetInventoryReport(itemRepository);
  final getProfitReport = GetProfitReport(itemRepository);
  final addExpense = AddExpense(itemRepository);
  final getExpenses = GetExpenses(itemRepository);
  final getTotalExpenses = GetTotalExpenses(itemRepository);

  // Category Use Cases
  final getCategories = GetCategories(categoryRepository);
  final addCategory = AddNewCategory(categoryRepository);
  final deleteCategory = DeleteCategoryUseCase(categoryRepository);
  
  final getDevices = GetBluetoothDevices(printerService);
  final connectPrinter = ConnectToPrinter(printerService);
  final printInvoice = PrintInvoiceCommands(printerService);
  
  final getInvoiceHistory = GetInvoiceHistory(invoiceRepository);
  final getInvoiceDetails = GetInvoiceDetails(invoiceRepository);
  
  runApp(MyApp(
    database: database,
    itemRepository: itemRepository,
    categoryRepository: categoryRepository,
    invoiceRepository: invoiceRepository,
    settingsRepository: settingsRepository,
    printerService: printerService,
    securityService: securityService,
    calculationService: calculationService,
    backupService: backupService,
    getItems: getItems,
    addItem: addItem,
    updateItem: updateItem,
    deleteItem: deleteItem,
    getCategories: getCategories,
    addCategory: addCategory,
    deleteCategory: deleteCategory,
    getDevices: getDevices,
    connectPrinter: connectPrinter,
    printInvoice: printInvoice,
    getInvoiceHistory: getInvoiceHistory,
    getInvoiceDetails: getInvoiceDetails,
    increaseStock: increaseStock,
    getStockHistory: getStockHistory,
    getInventoryReport: getInventoryReport,
    getProfitReport: getProfitReport,
    addExpense: addExpense,
    getExpenses: getExpenses,
    getTotalExpenses: getTotalExpenses,
    staffRepository: staffRepository,
    syncRepository: syncRepository,
    discoveryService: discoveryService,
    syncServer: syncServer,
    syncManager: syncManager,
    bluetoothDiscoveryService: bluetoothDiscoveryService,
    bluetoothSyncServer: bluetoothSyncServer,
    deviceId: deviceId,
  ));
}

class MyApp extends StatelessWidget {
  final AppDatabase database;
  final ItemRepositoryImpl itemRepository;
  final CategoryRepositoryImpl categoryRepository; // NEW
  final InvoiceRepositoryImpl invoiceRepository;
  final SettingsRepositoryImpl settingsRepository;
  final IPrinterService printerService;
  final SecurityService securityService;
  final InvoiceCalculationService calculationService;
  final BackupService backupService;
  final GetItems getItems;
  final AddItem addItem;
  final UpdateItem updateItem;
  final DeleteItem deleteItem;
  
  // Category Use Cases
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

  const MyApp({
    super.key,
    required this.database,
    required this.itemRepository,
    required this.categoryRepository, // NEW
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
  });

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (_) => StockBloc(
            getItems: getItems,
            addItem: addItem,
            updateItem: updateItem,
            deleteItem: deleteItem,
            getCategories: getCategories,
            addCategory: addCategory,
            deleteCategory: deleteCategory,
            increaseStock: increaseStock,
            getStockHistory: getStockHistory,
            getInventoryReport: getInventoryReport,
            getProfitReport: getProfitReport,
            addExpenseUC: addExpense,
            getExpensesUC: getExpenses,
            getTotalExpensesUC: getTotalExpenses,
          )..add(LoadItems()),
        ),
        BlocProvider(
          create: (_) => InvoiceBloc(
            repository: invoiceRepository,
            calculationService: calculationService,
          ),
        ),
        BlocProvider(
          create: (_) => HistoryBloc(
            getHistory: getInvoiceHistory,
            getInvoiceDetails: getInvoiceDetails,
          ),
        ),
        BlocProvider(
          create: (_) => SettingsBloc(
            repository: settingsRepository,
            securityService: securityService,
            backupService: backupService,
          )..add(LoadSettings()),
        ),
        BlocProvider(
          create: (_) => PrinterBloc(
            getDevices: getDevices,
            connectPrinter: connectPrinter,
            printInvoice: printInvoice,
          ),
        ),
        BlocProvider(
          create: (_) => StaffBloc(
            repository: staffRepository,
          )..add(LoadStaffList()),
        ),
        BlocProvider(
          create: (_) => SyncBloc(
            discoveryService: discoveryService,
            bluetoothDiscoveryService: bluetoothDiscoveryService,
            syncManager: syncManager,
            syncServer: syncServer,
            bluetoothSyncServer: bluetoothSyncServer,
            syncRepository: syncRepository,
            db: database,
            deviceId: deviceId,
          )..add(InitializeSync()),
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
              colorScheme: ColorScheme.fromSeed(seedColor: Color(state.settings?.primaryColor ?? 0xFF2196F3)),
              useMaterial3: true,
              textSelectionTheme: TextSelectionThemeData(
                cursorColor: Color(state.settings?.primaryColor ?? 0xFF2196F3),
              ),
            ),
            darkTheme: ThemeData(
              colorScheme: ColorScheme.fromSeed(
                seedColor: Color(state.settings?.primaryColor ?? 0xFF2196F3), 
                brightness: Brightness.dark,
              ),
              useMaterial3: true,
              textSelectionTheme: TextSelectionThemeData(
                cursorColor: Color(state.settings?.primaryColor ?? 0xFF2196F3),
              ),
            ),
            home: const LandingPage(),
          );
        },
      ),
    );
  }
}
