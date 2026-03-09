import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/features/invoicing/presentation/bloc/invoice_bloc.dart';
import 'package:involve_app/features/invoicing/presentation/bloc/invoice_state.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_bloc.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_state.dart';
import 'package:involve_app/features/stock/domain/entities/item.dart';
import 'package:involve_app/features/invoicing/presentation/widgets/invoice_preview_dialog.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:involve_app/features/settings/domain/entities/settings.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/invoicing/presentation/widgets/service_booking_dialog.dart';
import 'package:involve_app/features/invoicing/domain/repositories/invoice_repository.dart';
import 'package:involve_app/features/settings/domain/entities/staff.dart';
import 'package:involve_app/features/invoicing/presentation/widgets/staff_auth_dialog.dart';
import 'dart:convert';
import 'package:involve_app/core/utils/terminology.dart';
import 'package:involve_app/features/school/presentation/bloc/school_bloc.dart';
import 'package:involve_app/features/school/presentation/bloc/school_state.dart';
import 'package:involve_app/features/invoicing/presentation/history/pages/invoice_history_page.dart';

class CreateInvoicePage extends StatefulWidget {
  const CreateInvoicePage({super.key});

  @override
  State<CreateInvoicePage> createState() => _CreateInvoicePageState();
}

class _CreateInvoicePageState extends State<CreateInvoicePage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        final settings = context.read<SettingsBloc>().state.settings;
        if (settings != null) {
          context.read<InvoiceBloc>().add(UpdateInvoiceSettings(
                taxRate: settings.taxRate,
                taxEnabled: settings.taxEnabled,
                discountEnabled: settings.discountEnabled,
              ));

          if (settings.staffManagementEnabled &&
              context.read<InvoiceBloc>().state.staffId == null) {
            _showStaffAuth(context);
          }

          // Set business mode in bloc
          context.read<InvoiceBloc>().add(UpdateBusinessMode(settings.businessMode));
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: false,
      appBar: AppBar(
        title: BlocBuilder<SettingsBloc, SettingsState>(
          builder: (context, state) => Text(
            state.settings?.newSaleLabel ?? 'NEW INVOICE',
            style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.2),
          ),
        ),
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Theme.of(context).colorScheme.primary,
                Color.lerp(
                    Theme.of(context).colorScheme.primary, Colors.black, 0.2)!,
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        foregroundColor: Colors.white,
      ),
      body: MultiBlocListener(
        listeners: [
          BlocListener<SettingsBloc, SettingsState>(
            listener: (context, settingsState) {
              final settings = settingsState.settings;
              if (settings != null) {
                context.read<InvoiceBloc>().add(UpdateInvoiceSettings(
                      taxRate: settings.taxRate,
                      taxEnabled: settings.taxEnabled,
                      discountEnabled: settings.discountEnabled,
                    ));

                // Check for staff authentication if enabled
                if (settings.staffManagementEnabled &&
                    context.read<InvoiceBloc>().state.staffId == null) {
                  _showStaffAuth(context);
                }
              }
            },
          ),
          BlocListener<InvoiceBloc, InvoiceState>(
            listenWhen: (prev, curr) => (!prev.isSaved && curr.isSaved) || (prev.error != curr.error && curr.error != null),
            listener: (context, state) {
              if (state.error != null) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Error: ${state.error}'),
                    backgroundColor: Colors.red,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
                return;
              }

              if (state.isSaved) {
                // 1. Reload stock (since items were sold)
                context.read<StockBloc>().add(LoadItems());

                // 2. Format name for success message
                final name = state.customerName ?? 'Transaction';

                // Grab states before popping context
                final nav = Navigator.of(context);
                final messenger = ScaffoldMessenger.of(context);
                final invoiceBloc = context.read<InvoiceBloc>();

                // 3. Clear all modal overlays (Preview Dialog AND Cart Bottom Sheet)
                // and return to the main menu (Dashboard)
                nav.popUntil((route) => route.isFirst);

                // 4. Show success feedback
                messenger.showSnackBar(
                  SnackBar(
                    content: Text('$name has been saved and printed successfully!'),
                    backgroundColor: Colors.green,
                    behavior: SnackBarBehavior.floating,
                    duration: const Duration(seconds: 5),
                    action: SnackBarAction(
                      label: 'VIEW HISTORY',
                      textColor: Colors.white,
                      onPressed: () {
                        nav.push(
                          MaterialPageRoute(builder: (_) => InvoiceHistoryPage()),
                        );
                      },
                    ),
                  ),
                );

                // 5. Reset flow for next transaction
                invoiceBloc.add(ResetInvoice());
              }
            },
          ),
        ],
        child: BlocBuilder<SettingsBloc, SettingsState>(
          builder: (context, settingsState) {
            return LayoutBuilder(
              builder: (context, constraints) {
                final isMobile = constraints.maxWidth < 800;

                if (isMobile) {
                  return Stack(
                    children: [
                      _ItemSelector(isMobile: true),
                      Positioned(
                        bottom: 16,
                        right: 16,
                        child: _MobileCartButton(),
                      ),
                    ],
                  );
                }

                return Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: _ItemSelector(isMobile: false),
                    ),
                    _CartSummary(isSidePanel: true),
                  ],
                );
              },
            );
          },
        ),
      ),
    );
  }

  Future<void> _showStaffAuth(BuildContext context) async {
    // We need to wait a bit for the UI to settle before showing dialog on load
    await Future.delayed(const Duration(milliseconds: 500));
    if (!mounted) return;

    final staff = await showDialog<Staff>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const StaffAuthDialog(),
    );

    if (staff != null && mounted) {
      context.read<InvoiceBloc>().add(UpdateStaffInfo(
            staffId: staff.id,
            staffName: staff.name,
          ));
    } else if (mounted) {
      // If cancelled, exit the page
      Navigator.pop(context);
    }
  }
}
class _MobileCartButton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocBuilder<InvoiceBloc, InvoiceState>(
      builder: (context, state) {
        if (state.items.isEmpty) return const SizedBox.shrink();

        return FloatingActionButton.extended(
          onPressed: () {
            showModalBottomSheet(
              context: context,
              isScrollControlled: true,
              backgroundColor: Colors.transparent,
              builder: (context) => DraggableScrollableSheet(
                initialChildSize: 0.85,
                minChildSize: 0.5,
                maxChildSize: 1.0,
                builder: (_, controller) => Container(
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                  ),
                  child: _CartSummary(isSidePanel: false, scrollController: controller),
                ),
              ),
            );
          },
          label: Row(
            children: [
              Text(
                'VIEW CART (${state.items.length})',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(width: 12),
              const Text('|', style: TextStyle(color: Colors.white54)),
              const SizedBox(width: 12),
              Text(
                CurrencyFormatter.formatWithSymbol(
                  state.total,
                  symbol: context.watch<SettingsBloc>().state.settings?.currency ?? '₦',
                ),
                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
              ),
            ],
          ),
          icon: const Icon(Icons.shopping_cart),
          backgroundColor: Theme.of(context).colorScheme.primary,
        );
      },
    );
  }
}

class _ItemSelector extends StatefulWidget {
  final bool isMobile;
  const _ItemSelector({required this.isMobile});

  @override
  State<_ItemSelector> createState() => _ItemSelectorState();
}

class _ItemSelectorState extends State<_ItemSelector> {
  int? _selectedCategoryId;
  String? _selectedServiceType; // New: For service type filtering
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    // Ensure data is loaded
    context.read<StockBloc>().add(LoadCategories());
    
    // Listen to search changes
    _searchController.addListener(() {
      setState(() {
        _searchQuery = _searchController.text.toLowerCase();
      });
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return BlocBuilder<SettingsBloc, SettingsState>(
      builder: (context, settingsState) {
        final settings = settingsState.settings;
        final serviceTypes = settings?.serviceTypes ?? [];

        return BlocBuilder<StockBloc, StockState>(
          builder: (context, state) {
            if (state is StockLoaded) {
              // Filter Items Logic
              List<Item> filteredItems = state.items;

              if (_selectedServiceType != null) {
                // Filter by Service Type
                filteredItems = filteredItems.where((i) => 
                  i.type == 'service' && i.serviceCategory == _selectedServiceType
                ).toList();
              } else if (_selectedCategoryId != null) {
                 // Filter by Stock Category
                 filteredItems = filteredItems.where((i) => i.categoryId == _selectedCategoryId).toList();
              }
              
              // Apply search filter
              if (_searchQuery.isNotEmpty) {
                filteredItems = filteredItems
                    .where((i) => i.name.toLowerCase().contains(_searchQuery))
                    .toList();
              }

              return Column(
                children: [
                  // Search Bar
                  Padding(
                padding: const EdgeInsets.all(12.0),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: settings?.searchItemsHint ?? 'Search products...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                            },
                          )
                        : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    filled: true,
                    fillColor: isDark ? theme.colorScheme.surface : Colors.grey[100],
                  ),
                ),
              ),
              
              // Category Chips
              Container(
                height: 50,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    _buildFilterChip('All', null, null),
                    // Standard Categories
                    ...state.categories.map((cat) => _buildFilterChip(cat.name, cat.id, null)),
                    // Service Types (if enabled)
                    if (settings?.serviceBillingEnabled == true)
                      ...serviceTypes.map((type) => _buildFilterChip(type, null, type, isService: true)),
                  ],
                ),
              ),
              const Divider(height: 1),
              
              // Item Grid
              Expanded(
                child: filteredItems.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.search_off, size: 64, color: Colors.grey[400]),
                            const SizedBox(height: 16),
                            Text(
                              _searchQuery.isNotEmpty
                                  ? '${settings?.noItemsFound ?? 'No items found'} for "$_searchQuery"'
                                  : 'No items in this category.',
                              style: TextStyle(color: Colors.grey[600]),
                            ),
                          ],
                        ),
                      )
                    : GridView.builder(
                        padding: const EdgeInsets.all(16),
                        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: widget.isMobile ? 2 : 3,
                          childAspectRatio: 0.85, 
                          mainAxisSpacing: 10,
                          crossAxisSpacing: 10,
                        ),
                        itemCount: filteredItems.length,
                        itemBuilder: (context, index) {
                          final item = filteredItems[index];
                          return BlocBuilder<InvoiceBloc, InvoiceState>(
                            builder: (context, invState) {
                              final cartItem = invState.items.where((i) => i.item.id == item.id).firstOrNull;
                              final quantity = cartItem?.quantity ?? 0;

                                return _POSItemCard(
                                  item: item,
                                  quantity: quantity,
                                  onAdd: () => _handleItemAdd(context, item, settings),
                                  onRemove: quantity > 0 ? () => context.read<InvoiceBloc>().add(AddItemToInvoice(item, -1)) : null,
                                  settings: settings,
                                );
                            },
                          );
                        },
                      ),
              ),
              ],
              );
            }
            return const Center(child: CircularProgressIndicator());
          },
        );
      },
    );
  }

  Widget _buildFilterChip(String label, int? categoryId, String? serviceType, {bool isService = false}) {
    final isSelected = (serviceType != null && _selectedServiceType == serviceType) || 
                       (serviceType == null && _selectedServiceType == null && _selectedCategoryId == categoryId);
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        selectedColor: isService ? Colors.orangeAccent.withOpacity(0.2) : null,
        checkmarkColor: isService ? Colors.orange[800] : null,
        labelStyle: TextStyle(
          color: isSelected ? (isService ? Colors.orange[900] : Colors.white) : null,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
        onSelected: (selected) {
          setState(() {
            if (serviceType != null) {
              _selectedServiceType = serviceType;
              _selectedCategoryId = null;
            } else {
              _selectedCategoryId = categoryId;
              _selectedServiceType = null;
            }
          });
        },
      ),
    );
  }

  Future<void> _handleItemAdd(BuildContext context, Item item, AppSettings? settings) async {
    if (item.type == 'service') {
      // Show booking dialog
      final result = await showDialog<Map<String, dynamic>>(
        context: context,
        builder: (ctx) => ServiceBookingDialog(
          item: item,
          checkAvailability: (start, end) => 
            context.read<InvoiceRepository>().checkServiceAvailability(item.id!, start, end),
        ),
      );

      if (result != null) {
        // Add service item with meta
        final qty = (result['quantity'] as num).toInt(); // Convert double to int if needed, or update bloc to accept double
        // InvoiceItem quantity is int? "final int quantity;"
        // If billing is per hour/day, quantity might be 1.5 days?
        // InvoiceItem.quantity is int.
        // If I need partial days, I might need to change quantity to double or use a different field.
        // For now, I'll stick to int or ceil. Dialog returns double.
        // If I need to support partial, I should change InvoiceItem quantity to double.
        // But for now, let's cast to int.
        context.read<InvoiceBloc>().add(AddItemToInvoice(
          item, 
          qty,
          serviceMeta: jsonEncode(result),
        ));
      }
    } else {
      if (settings?.confirmPriceOnSelection == true) {
        _showPriceConfirmation(context, item, settings?.currency ?? '₦');
      } else {
        context.read<InvoiceBloc>().add(AddItemToInvoice(item, 1));
      }
    }
  }

  Future<void> _showPriceConfirmation(BuildContext context, Item item, String currency) async {
    final controller = TextEditingController(text: item.price.toStringAsFixed(2));
    final invoiceBloc = context.read<InvoiceBloc>();
    
    return showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirm Price'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Item: ${item.name}', style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              autofocus: true,
              decoration: InputDecoration(
                labelText: 'Price ($currency)',
                border: const OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          ElevatedButton(
            onPressed: () {
              final newPrice = double.tryParse(controller.text);
              if (newPrice != null) {
                // Update item price and add to invoice
                final updatedItem = item.copyWith(price: newPrice);
                invoiceBloc.add(AddItemToInvoice(updatedItem, 1));
              }
              Navigator.pop(ctx);
            },
            child: const Text('CONFIRM'),
          ),
        ],
      ),
    );
  }
}

class _POSItemCard extends StatelessWidget {
  final Item item;
  final int quantity;
  final VoidCallback onAdd;
  final VoidCallback? onRemove;
  final AppSettings? settings;

  const _POSItemCard({
    required this.item,
    required this.quantity,
    required this.onAdd,
    this.onRemove,
    this.settings,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final currency = settings?.currency ?? '₦';

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      margin: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: quantity > 0 ? Theme.of(context).colorScheme.primary.withOpacity(0.05) : (isDark ? theme.colorScheme.surface : Colors.white),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: quantity > 0 ? Theme.of(context).colorScheme.primary : (isDark ? theme.colorScheme.outline : Colors.grey[200]!),
          width: quantity > 0 ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: quantity > 0 
                ? Theme.of(context).colorScheme.primary.withOpacity(0.2) 
                : Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Stack(
          children: [
            InkWell(
              onTap: onAdd,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Image Area
                  Expanded(
                    flex: 3,
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        gradient: LinearGradient(
                          colors: [Colors.grey[100]!, Colors.grey[200]!],
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                        ),
                      ),
                      child: item.image != null
                          ? Image.memory(item.image!, fit: BoxFit.cover)
                          : Icon(Icons.inventory_2_outlined, size: 40, color: Theme.of(context).colorScheme.primary.withOpacity(0.3)),
                    ),
                  ),
                  // Info Area
                  Expanded(
                    flex: 2,
                    child: Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            item.name.toUpperCase(),
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            CurrencyFormatter.formatWithSymbol(
                              item.price,
                              symbol: currency,
                            ),
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.primary,
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
                            ),
                          ),
                          if (item.type != 'service') ...[
                            const SizedBox(height: 2),
                            Text(
                              'Rem: ${item.stockQty}',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: item.stockQty <= item.minStockQty ? Colors.red : Colors.grey[600],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Quantity Badge
            if (quantity > 0)
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primary,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(color: Theme.of(context).colorScheme.primary.withOpacity(0.3), blurRadius: 4, spreadRadius: 1),
                    ],
                  ),
                  child: Text(
                    'x$quantity',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _QuickBtn extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _QuickBtn({required this.icon, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color.withOpacity(0.1),
      shape: const CircleBorder(),
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: Padding(
          padding: const EdgeInsets.all(6.0),
          child: Icon(icon, color: color, size: 20),
        ),
      ),
    );
  }
}

class _CartSummary extends StatelessWidget {
  final bool isSidePanel;
  final ScrollController? scrollController;

  const _CartSummary({required this.isSidePanel, this.scrollController});

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<SettingsBloc>().state.settings;
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      width: isSidePanel ? 400 : double.infinity, 
      decoration: BoxDecoration(
        color: isDark ? theme.colorScheme.surface : Colors.white,
        border: isSidePanel ? Border(left: BorderSide(color: isDark ? theme.colorScheme.outline.withOpacity(0.2) : Colors.grey[200]!)) : null,
        boxShadow: isSidePanel ? [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(-5, 0)),
        ] : null,
      ),
      child: BlocBuilder<InvoiceBloc, InvoiceState>(
        builder: (context, state) {
          return ClipRect(
            child: Column(
            children: [
              // Header
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  border: Border(bottom: BorderSide(color: Colors.grey[100]!)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.shopping_cart_outlined, color: Colors.blue),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'YOUR CART',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, letterSpacing: 1.1),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary, borderRadius: BorderRadius.circular(12)),
                      child: Text(
                        '${state.items.length}',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
              // Cart Items List
              Expanded(
                child: ListView.builder(
                  controller: scrollController,
                  itemCount: state.items.length,
                  itemBuilder: (context, index) {
                    final item = state.items[index];
                    return Dismissible(
                      key: ValueKey(item.item.id),
                      direction: DismissDirection.endToStart,
                      background: Container(
                        alignment: Alignment.centerRight,
                        padding: const EdgeInsets.only(right: 20),
                        color: Colors.red,
                        child: const Icon(Icons.delete, color: Colors.white),
                      ),
                      onDismissed: (_) {
                        context.read<InvoiceBloc>().add(RemoveItemFromInvoice(item.item));
                      },
                      child: Container(
                        decoration: BoxDecoration(
                          border: Border(bottom: BorderSide(color: Colors.grey[100]!)),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Row 1: Name and Unit Price
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Text(
                                    item.item.name, 
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      CurrencyFormatter.formatWithSymbol(item.unitPrice, symbol: settings?.currency ?? '₦'),
                                      style: TextStyle(color: Colors.grey[600], fontSize: 13),
                                    ),
                                    if (settings?.customReceiptPricingEnabled == true)
                                      InkWell(
                                        onTap: () => _showPrintPriceDialog(context, item, settings?.currency ?? '₦'),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(Icons.edit_note, size: 16, color: Colors.blue[300]),
                                            const SizedBox(width: 2),
                                            Text(
                                              item.printPrice != null 
                                                ? CurrencyFormatter.formatWithSymbol(item.printPrice!, symbol: settings?.currency ?? '₦')
                                                : 'Set Receipt Price',
                                              style: TextStyle(
                                                fontSize: 11, 
                                                color: item.printPrice != null ? Colors.blue[700] : Colors.grey[400],
                                                fontWeight: item.printPrice != null ? FontWeight.bold : FontWeight.normal,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                  ],
                                ),
                              ],
                            ),
                            if (item.type == 'service' && item.serviceMeta != null) ...[
                              const SizedBox(height: 4),
                              _ServiceDetailsText(serviceMeta: item.serviceMeta!),
                            ],
                            const SizedBox(height: 12),
                            // Row 2: Total and Controls
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                // Total Price (Left)
                                Text(
                                  CurrencyFormatter.formatWithSymbol(
                                    item.total,
                                    symbol: settings?.currency ?? '₦',
                                  ),
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold, 
                                    fontSize: 16, 
                                    color: Theme.of(context).colorScheme.primary
                                  ),
                                ),
                                // Controls (Right)
                                Container(
                                  decoration: BoxDecoration(
                                    color: Colors.grey[100],
                                    borderRadius: BorderRadius.circular(24),
                                  ),
                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      _QuickBtn(
                                        icon: Icons.remove,
                                        color: Colors.red[700]!,
                                        onTap: () => context.read<InvoiceBloc>().add(AddItemToInvoice(item.item, -1)),
                                      ),
                                      GestureDetector(
                                        onLongPress: () => _showQuantityDialog(context, item),
                                        child: SizedBox(
                                          width: 32,
                                          child: Text(
                                            '${item.quantity}',
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                            textAlign: TextAlign.center,
                                          ),
                                        ),
                                      ),
                                      _QuickBtn(
                                        icon: Icons.add,
                                        color: Colors.green[700]!,
                                        onTap: () => context.read<InvoiceBloc>().add(AddItemToInvoice(item.item, 1)),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              const Divider(height: 1),
              // Summary Area (Flexible Layout)
              Flexible(
                flex: state.items.isEmpty ? 0 : 1,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.grey[50],
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                  ),
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _buildSummaryRow(context, 'Subtotal', state.subtotal, settings?.currency ?? '₦'),
                        _buildSummaryRow(context, 'Tax (${(state.taxRate * 100).toStringAsFixed(0)}%)', state.tax, settings?.currency ?? '₦'),
                        if (state.discount > 0)
                          _buildSummaryRow(context, 'Discount', -state.discount, settings?.currency ?? '₦'),
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8.0),
                          child: Divider(),
                        ),
                        if (settings?.discountEnabled == true) ...[
                          SizedBox(
                            width: double.infinity,
                            child: TextButton.icon(
                              onPressed: () => _showDiscountDialog(context, state.discount, state.discountType),
                              icon: const Icon(Icons.add_circle_outline, size: 18),
                              label: Text(state.discount > 0 ? 'CHANGE DISCOUNT' : 'ADD DISCOUNT'),
                              style: TextButton.styleFrom(
                                foregroundColor: Theme.of(context).colorScheme.primary,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                        ],
                        _buildSummaryRow(context, 'Total Amount', state.total, settings?.currency ?? '₦', isTotal: true),
                        const SizedBox(height: 12),
                        const Divider(),
                        ListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          title: Text(
                            state.customerName != null 
                              ? '${state.customerName}${state.customerPhone != null ? " (${state.customerPhone})" : ""}'
                              : (settings?.assignToCustomerLabel ?? 'Add Customer Name & Phone'), 
                            style: TextStyle(color: state.customerName != null ? Colors.black : Colors.blue)
                          ),
                          subtitle: state.customerAddress != null ? Text(state.customerAddress!) : null,
                          leading: Icon(Icons.person_outline, color: state.customerName != null ? Theme.of(context).colorScheme.primary : Colors.grey),
                          trailing: const Icon(Icons.edit, size: 16),
                          onTap: () => _showCustomerDialog(context, state.customerName, state.customerPhone, state.customerAddress),
                        ),
                        if (settings?.businessMode == 'school') ...[
                          const Divider(),
                          _buildSchoolInfoTile(context, state),
                        ],
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          height: 54,
                          child: ElevatedButton(
                            onPressed: state.items.isEmpty ? null : () => _showPreview(context),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Theme.of(context).colorScheme.primary,
                              foregroundColor: Colors.white,
                              elevation: 0,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: const Text('PROCEED TO CHECKOUT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSummaryRow(BuildContext context, String label, double amount, String currency, {bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: isTotal ? 18 : 14,
                fontWeight: isTotal ? FontWeight.bold : FontWeight.w500,
                color: isTotal ? Colors.black : Colors.grey[600],
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            CurrencyFormatter.formatWithSymbol(
              amount,
              symbol: currency,
            ),
            style: TextStyle(
              fontSize: isTotal ? 20 : 15,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.w600,
              color: isTotal ? Theme.of(context).colorScheme.primary : Colors.black,
            ),
          ),
        ],
      ),
    );
  }

  void _showPreview(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => InvoicePreviewDialog(invoiceBloc: context.read<InvoiceBloc>()),
    );
  }

  Widget _buildSchoolInfoTile(BuildContext context, InvoiceState state) {
    return BlocBuilder<SchoolBloc, SchoolState>(
      builder: (context, schoolState) {
        final activeYear = schoolState.activeYear;
        final activeTerm = schoolState.terms.where((t) => t.isActive).firstOrNull ?? schoolState.terms.firstOrNull;
        
        // Auto-update bloc if not set
        if (state.academicYearId == null && activeYear != null) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
             context.read<InvoiceBloc>().add(UpdateSchoolInfo(
               academicYearId: activeYear.id,
               termId: activeTerm?.id,
             ));
          });
        }

        return Column(
          children: [
            ListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              title: Text(activeYear != null ? 'Year: ${activeYear.name}' : 'No Active Year'),
              subtitle: Text(activeTerm != null ? 'Term: ${activeTerm.name}' : 'No Active Term'),
              leading: const Icon(Icons.calendar_today, size: 20),
              trailing: const Icon(Icons.settings, size: 16),
              onTap: () => _showSchoolSetupWarning(context),
            ),
          ],
        );
      },
    );
  }

  void _showSchoolSetupWarning(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Change academic year/term in Academic Setup.')),
    );
  }

  void _showDiscountDialog(BuildContext context, double currentPriceDiscount, DiscountType currentDiscountType) {
    final controller = TextEditingController(text: currentPriceDiscount > 0 ? (currentPriceDiscount % 1 == 0 ? currentPriceDiscount.toInt().toString() : currentPriceDiscount.toString()) : '');
    final invoiceBloc = context.read<InvoiceBloc>();
    final currency = context.read<SettingsBloc>().state.settings?.currency ?? '₦';
    
    // We need to track local state for the dialog
    DiscountType selectedType = currentDiscountType;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setState) {
          return AlertDialog(
            title: const Text('Apply Discount'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Toggle Button for Discount Type
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () => setState(() => selectedType = DiscountType.amount),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(
                              color: selectedType == DiscountType.amount ? Colors.white : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                              boxShadow: selectedType == DiscountType.amount ? [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 4)] : null,
                            ),
                            child: const Text('AMOUNT', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          ),
                        ),
                      ),
                      Expanded(
                        child: InkWell(
                          onTap: () => setState(() => selectedType = DiscountType.percentage),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(
                              color: selectedType == DiscountType.percentage ? Colors.white : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                              boxShadow: selectedType == DiscountType.percentage ? [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 4)] : null,
                            ),
                            child: const Text('PERCENTAGE', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: controller,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  autofocus: true,
                  decoration: InputDecoration(
                    labelText: selectedType == DiscountType.amount ? 'Discount Amount ($currency)' : 'Discount Percentage (%)',
                    border: const OutlineInputBorder(),
                    prefixText: selectedType == DiscountType.amount ? currency : null,
                    suffixText: selectedType == DiscountType.percentage ? '%' : null,
                  ),
                ),
                if (selectedType == DiscountType.percentage) ...[
                  const SizedBox(height: 8),
                  const Text('Enter percentage (0-100) to apply to subtotal + tax.', style: TextStyle(fontSize: 11, color: Colors.grey)),
                ],
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
              if (currentPriceDiscount > 0)
                TextButton(
                  onPressed: () {
                    invoiceBloc.add(UpdateDiscount(0));
                    Navigator.pop(ctx);
                  },
                  child: const Text('REMOVE', style: TextStyle(color: Colors.red)),
                ),
              ElevatedButton(
                onPressed: () {
                  final discount = double.tryParse(controller.text) ?? 0;
                  // Basic validation for percentage
                  if (selectedType == DiscountType.percentage && (discount < 0 || discount > 100)) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Please enter a percentage between 0 and 100')),
                    );
                    return;
                  }
                  invoiceBloc.add(UpdateDiscount(discount, type: selectedType));
                  Navigator.pop(ctx);
                },
                child: const Text('APPLY'),
              ),
            ],
          );
        },
      ),
    );
  }
}


class _ServiceDetailsText extends StatelessWidget {
  final String serviceMeta;
  const _ServiceDetailsText({required this.serviceMeta});

  @override
  Widget build(BuildContext context) {
    try {
      final meta = jsonDecode(serviceMeta) as Map<String, dynamic>;
      final startStr = meta['startDate'];
      final endStr = meta['endDate'];
      
      if (startStr == null || endStr == null) return const SizedBox.shrink();
      
      final start = DateTime.parse(startStr);
      final end = DateTime.parse(endStr);
      
      return Text(
        '${_formatDate(start)} - ${_formatDate(end)}',
        style: const TextStyle(fontSize: 12, color: Colors.blueGrey, fontStyle: FontStyle.italic),
      );
    } catch (_) {
      return const SizedBox.shrink();
    }
  }
  
  String _formatDate(DateTime dt) {
    return dt.toString().substring(0, 16); // YYYY-MM-DD HH:MM
  }
}

void _showCustomerDialog(BuildContext context, String? currentName, String? currentPhone, String? currentAddress) {
  final settings = context.read<SettingsBloc>().state.settings;
  if (settings?.businessMode == 'school') {
    _showStudentPicker(context);
    return;
  }
  
  final formKey = GlobalKey<FormState>();
  final nameController = TextEditingController(text: currentName);
  final phoneController = TextEditingController(text: currentPhone);
  final addrController = TextEditingController(text: currentAddress);
  final invoiceBloc = context.read<InvoiceBloc>();

  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(settings?.customerInfoLabel ?? 'Customer Information'),
      content: Form(
        key: formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: nameController,
              decoration: InputDecoration(
                labelText: settings?.customerNameLabel ?? 'Customer Name', 
                border: const OutlineInputBorder(),
                prefixIcon: const Icon(Icons.person),
              ),
              autofocus: true,
              validator: (val) => (val == null || val.trim().isEmpty) ? 'Please enter customer name' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: phoneController,
              decoration: InputDecoration(
                labelText: settings?.customerPhoneLabel ?? 'Customer Phone', 
                border: const OutlineInputBorder(),
                prefixIcon: const Icon(Icons.phone),
                hintText: 'e.g. 08012345678',
              ),
              keyboardType: TextInputType.phone,
              validator: (val) {
                if (val == null || val.isEmpty) return 'Phone number required';
                final digitsOnly = val.replaceAll(RegExp(r'\D'), '');
                if (digitsOnly.length < 11 || digitsOnly.length > 15) {
                  return 'Phone must be 11 to 15 digits';
                }
                return null;
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: addrController,
              decoration: InputDecoration(
                labelText: settings?.customerAddressLabel ?? 'Customer Address', 
                border: const OutlineInputBorder(),
                prefixIcon: const Icon(Icons.location_on),
              ),
              maxLines: 2,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
        ElevatedButton(
          onPressed: () {
            if (formKey.currentState?.validate() ?? false) {
              invoiceBloc.add(UpdateCustomerInfo(
                name: nameController.text.trim(),
                phone: phoneController.text.trim(),
                address: addrController.text.isEmpty ? null : addrController.text.trim(),
              ));
              Navigator.pop(ctx);
            }
          },
          child: const Text('SAVE'),
        ),
      ],
    ),
  );
}

void _showStudentPicker(BuildContext context) {
  final invoiceBloc = context.read<InvoiceBloc>();
  int? selectedClassId;
  String studentSearchQuery = '';

  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => StatefulBuilder(
      builder: (context, setState) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.all(16),
        height: MediaQuery.of(context).size.height * 0.85,
        child: Column(
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Text('Select Student', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            
            // Search Bar for Students
            TextField(
              decoration: InputDecoration(
                hintText: 'Search by name or admission number...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: Colors.grey[100],
              ),
              onChanged: (val) => setState(() => studentSearchQuery = val.toLowerCase()),
            ),
            const SizedBox(height: 12),

            // Class Filter
            BlocBuilder<SchoolBloc, SchoolState>(
              builder: (context, state) {
                return SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      FilterChip(
                        label: const Text('All Classes'),
                        selected: selectedClassId == null,
                        onSelected: (selected) => setState(() => selectedClassId = null),
                      ),
                      const SizedBox(width: 8),
                      ...state.classes.map((cls) => Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: FilterChip(
                          label: Text(cls.name),
                          selected: selectedClassId == cls.id,
                          onSelected: (selected) => setState(() => selectedClassId = selected ? cls.id : null),
                        ),
                      )),
                    ],
                  ),
                );
              },
            ),
            const Divider(),
            
            Expanded(
              child: BlocBuilder<SchoolBloc, SchoolState>(
                builder: (context, state) {
                  if (state.isLoading) return const Center(child: CircularProgressIndicator());
                  
                  var filteredStudents = state.students;
                  
                  // Filter by Class
                  if (selectedClassId != null) {
                    filteredStudents = filteredStudents.where((s) => s.classId == selectedClassId).toList();
                  }
                  
                  // Filter by Search Query
                  if (studentSearchQuery.isNotEmpty) {
                    filteredStudents = filteredStudents.where((s) => 
                      s.fullName.toLowerCase().contains(studentSearchQuery) || 
                      s.admissionNumber.toLowerCase().contains(studentSearchQuery)
                    ).toList();
                  }

                  if (filteredStudents.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.person_off_outlined, size: 64, color: Colors.grey[300]),
                          const SizedBox(height: 16),
                          Text(studentSearchQuery.isEmpty && selectedClassId == null 
                            ? 'No students found. Add students first.' 
                            : 'No students matching your filters.',
                            style: TextStyle(color: Colors.grey[600]),
                          ),
                        ],
                      ),
                    );
                  }
                  
                  return ListView.separated(
                    itemCount: filteredStudents.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final student = filteredStudents[index];
                      final className = state.classes.where((c) => c.id == student.classId).firstOrNull?.name ?? 'No Class';
                      
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundImage: student.image != null ? MemoryImage(student.image!) : null,
                          child: student.image == null ? const Icon(Icons.person) : null,
                        ),
                        title: Text(student.fullName, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('ID: ${student.admissionNumber} | Class: $className'),
                        trailing: student.balance > 0 
                          ? Text(
                              'Debt: ${CurrencyFormatter.formatWithSymbol(student.balance, symbol: context.watch<SettingsBloc>().state.settings?.currency ?? '₦')}',
                              style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 12),
                            )
                          : null,
                        onTap: () {
                          invoiceBloc.add(UpdateCustomerInfo(
                            name: student.fullName,
                            phone: student.parentPhone,
                          ));
                          final term = state.activeTerm;
                          final year = state.activeYear;

                          invoiceBloc.add(UpdateSchoolInfo(
                            studentId: student.id,
                            classId: student.classId,
                            termId: term?.id,
                            academicYearId: year?.id,
                            admissionNumber: student.admissionNumber,
                            className: className,
                            termName: term?.name,
                            academicYearName: year?.name,
                            studentImage: student.image,
                          ));
                          
                          // Carry Forward Logic
                          if (student.balance > 0) {
                            final hasBalanceItem = invoiceBloc.state.items.any((i) => i.item.name == 'Previous Term Balance');
                            if (!hasBalanceItem) {
                              invoiceBloc.add(AddItemToInvoice(
                                Item(
                                  id: -1, 
                                  name: 'Previous Term Balance',
                                  price: student.balance,
                                  category: ItemCategory.service,
                                  type: 'service',
                                  stockQty: 0,
                                ),
                                1,
                              ));
                            }
                          }
                          Navigator.pop(ctx);
                        },
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

void _showQuantityDialog(BuildContext context, InvoiceItem item) {
  final controller = TextEditingController(text: item.quantity.toString());
  final invoiceBloc = context.read<InvoiceBloc>();

  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text('Update Quantity: ${item.item.name}'),
      content: TextField(
        controller: controller,
        keyboardType: TextInputType.number,
        autofocus: true,
        decoration: const InputDecoration(
          labelText: 'Quantity',
          border: OutlineInputBorder(),
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
        ElevatedButton(
          onPressed: () {
            final newQty = int.tryParse(controller.text);
            if (newQty != null && newQty > 0) {
              // To set exact quantity, we calculate the difference
              final diff = newQty - item.quantity;
              invoiceBloc.add(AddItemToInvoice(item.item, diff, serviceMeta: item.serviceMeta));
            } else if (newQty == 0) {
              invoiceBloc.add(RemoveItemFromInvoice(item.item));
            }
            Navigator.pop(ctx);
          },
          child: const Text('UPDATE'),
        ),
      ],
    ),
  );
}

void _showPrintPriceDialog(BuildContext context, InvoiceItem item, String currency) {
  final controller = TextEditingController(
    text: item.printPrice != null ? item.printPrice.toString() : item.unitPrice.toString(),
  );
  final invoiceBloc = context.read<InvoiceBloc>();

  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Custom Receipt Price'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Enter the price you want to show ON THE RECEIPT for this item.'),
          const SizedBox(height: 16),
          TextField(
            controller: controller,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            autofocus: true,
            decoration: InputDecoration(
              labelText: 'Receipt Price ($currency)',
              border: const OutlineInputBorder(),
              prefixText: currency,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Real Price: ${CurrencyFormatter.formatWithSymbol(item.unitPrice, symbol: currency)}',
            style: const TextStyle(fontSize: 12, color: Colors.grey),
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
        if (item.printPrice != null)
          TextButton(
            onPressed: () {
              invoiceBloc.add(UpdateItemPrintPrice(item.item.id!, null));
              Navigator.pop(ctx);
            },
            child: const Text('RESET', style: TextStyle(color: Colors.red)),
          ),
        ElevatedButton(
          onPressed: () {
            final newPrice = double.tryParse(controller.text);
            if (newPrice != null) {
              invoiceBloc.add(UpdateItemPrintPrice(item.item.id!, newPrice));
            }
            Navigator.pop(ctx);
          },
          child: const Text('SET PRICE'),
        ),
      ],
    ),
  );
}
