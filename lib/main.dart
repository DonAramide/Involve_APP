import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
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
import 'features/printer/data/repositories/cross_platform_printer_service.dart';
import 'features/printer/data/repositories/network_printer_service.dart';
import 'features/printer/data/repositories/unified_printer_service.dart';
import 'features/printer/domain/repositories/printer_service.dart';
import 'features/printer/domain/usecases/printer_usecases.dart';
import 'features/printer/presentation/bloc/printer_bloc.dart';
import 'features/stock/presentation/bloc/stock_state.dart';
import 'features/settings/presentation/bloc/settings_state.dart';
import 'features/dashboard/presentation/pages/dashboard_page.dart';
import 'core/services/backup_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set up global BLoC observer
  Bloc.observer = SimpleBlocObserver();
  
  // Initialize database
  final database = AppDatabase();
  
  // Initialize repositories
  final itemRepository = ItemRepositoryImpl(database);
  final invoiceRepository = InvoiceRepositoryImpl(database);
  final settingsRepository = SettingsRepositoryImpl(database);
  final categoryRepository = CategoryRepositoryImpl(database);
  
  // Initialize services
  final bluetoothService = CrossPlatformPrinterService();
  final networkService = NetworkPrinterService();
  final printerService = UnifiedPrinterService(
    bluetoothService: bluetoothService,
    networkService: networkService,
  );
  final securityService = SecurityService();
  final calculationService = InvoiceCalculationService();
  final backupService = BackupService();
  
  // Initialize use cases
  final getItems = GetItems(itemRepository);
  final addItem = AddItem(itemRepository);
  final updateItem = UpdateItem(itemRepository);
  final deleteItem = DeleteItem(itemRepository);

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
      ],
      child: BlocBuilder<SettingsBloc, SettingsState>(
        builder: (context, state) {
          final themeMode = state.settings?.themeMode ?? 'system';
          return MaterialApp(
            title: 'Bar & Hotel POS',
            debugShowCheckedModeBanner: false,
            themeMode: themeMode == 'light' 
                ? ThemeMode.light 
                : themeMode == 'dark' 
                    ? ThemeMode.dark 
                    : ThemeMode.system,
            theme: ThemeData(
              colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
              useMaterial3: true,
            ),
            darkTheme: ThemeData(
              colorScheme: ColorScheme.fromSeed(
                seedColor: Colors.blue, 
                brightness: Brightness.dark,
              ),
              useMaterial3: true,
            ),
            home: const DashboardPage(),
          );
        },
      ),
    );
  }
}
