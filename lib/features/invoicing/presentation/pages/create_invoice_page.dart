import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:invify/features/invoicing/presentation/bloc/invoice_bloc.dart';
import 'package:invify/features/invoicing/presentation/bloc/invoice_state.dart';
import 'package:invify/features/stock/presentation/bloc/stock_bloc.dart';
import 'package:invify/features/stock/presentation/bloc/stock_state.dart';
import 'package:invify/features/stock/domain/entities/item.dart';
import 'package:invify/features/invoicing/presentation/widgets/invoice_preview_dialog.dart';
import 'package:invify/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:invify/features/settings/presentation/bloc/settings_state.dart';
import 'package:invify/features/settings/domain/entities/settings.dart';
import 'package:invify/core/utils/currency_formatter.dart';

class CreateInvoicePage extends StatelessWidget {
  const CreateInvoicePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('NEW INVOICE', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.2)),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Colors.blue, Colors.indigo],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        foregroundColor: Colors.white,
      ),
      body: BlocListener<SettingsBloc, SettingsState>(
        listener: (context, settingsState) {
          final settings = settingsState.settings;
          if (settings != null) {
            context.read<InvoiceBloc>().add(UpdateInvoiceSettings(
              taxRate: settings.taxRate,
              taxEnabled: settings.taxEnabled,
            ));
          }
        },
        child: Row(
          children: [
            // Left Side: Item Selection
            Expanded(
              flex: 3,
              child: _ItemSelector(),
            ),
            // Right Side: Cart Summary
            Expanded(
              flex: 2,
              child: _CartSummary(),
            ),
          ],
        ),
      ),
    );
  }
}

class _ItemSelector extends StatefulWidget {
  @override
  State<_ItemSelector> createState() => _ItemSelectorState();
}

class _ItemSelectorState extends State<_ItemSelector> {
  int? _selectedCategoryId;
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
    return BlocBuilder<SettingsBloc, SettingsState>(
      builder: (context, settingsState) {
        final settings = settingsState.settings;
        return BlocBuilder<StockBloc, StockState>(
          builder: (context, state) {
            if (state is StockLoaded) {
              // Filter Items by category and search query
              var filteredItems = _selectedCategoryId == null
                  ? state.items
                  : state.items.where((i) => i.categoryId == _selectedCategoryId).toList();
              
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
                    hintText: 'Search products...',
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
                    fillColor: Colors.grey[100],
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
                    _buildFilterChip('All', null),
                    ...state.categories.map((cat) => _buildFilterChip(cat.name, cat.id)),
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
                                  ? 'No products found for "$_searchQuery"'
                                  : 'No items in this category.',
                              style: TextStyle(color: Colors.grey[600]),
                            ),
                          ],
                        ),
                      )
                    : GridView.builder(
                        padding: const EdgeInsets.all(16),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          childAspectRatio: 0.8, // Adjusted for image
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

  Widget _buildFilterChip(String label, int? id) {
    final isSelected = _selectedCategoryId == id;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (selected) {
          setState(() {
            _selectedCategoryId = id;
          });
        },
      ),
    );
  }

  void _handleItemAdd(BuildContext context, Item item, AppSettings? settings) {
    if (settings?.confirmPriceOnSelection == true) {
      _showPriceConfirmation(context, item, settings?.currency ?? '₦');
    } else {
      context.read<InvoiceBloc>().add(AddItemToInvoice(item, 1));
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
    final currency = settings?.currency ?? '₦';

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      margin: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: quantity > 0 ? Colors.blue.withOpacity(0.05) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: quantity > 0 ? Colors.blue : Colors.grey[200]!,
          width: quantity > 0 ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: quantity > 0 
                ? Colors.blue.withOpacity(0.2) 
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
                          : Icon(Icons.inventory_2_outlined, size: 40, color: Colors.blue.withOpacity(0.3)),
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
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            CurrencyFormatter.formatWithSymbol(
                              item.price,
                              symbol: currency,
                            ),
                            style: TextStyle(
                              color: Colors.blue[700],
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
                            ),
                          ),
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
                    color: Colors.blue,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(color: Colors.blue.withOpacity(0.3), blurRadius: 4, spreadRadius: 1),
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
  @override
  Widget build(BuildContext context) {
    final settings = context.watch<SettingsBloc>().state.settings;
    
    return Container(
      width: 350, // Fixed width for cart summary on tablets/desktop
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(left: BorderSide(color: Colors.grey[200]!)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(-5, 0)),
        ],
      ),
      child: BlocBuilder<InvoiceBloc, InvoiceState>(
        builder: (context, state) {
          return Column(
            children: [
              // Header
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
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
                      decoration: BoxDecoration(color: Colors.blue, borderRadius: BorderRadius.circular(12)),
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
                        context.read<InvoiceBloc>().add(AddItemToInvoice(item.item, -item.quantity));
                      },
                      child: ListTile(
                        dense: true,
                        title: Text(item.item.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('${item.quantity} x ${CurrencyFormatter.formatWithSymbol(item.unitPrice, symbol: settings?.currency ?? '₦')}'),
                        trailing: Text(
                          CurrencyFormatter.formatWithSymbol(
                            item.total,
                            symbol: settings?.currency ?? '₦',
                          ),
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const Divider(height: 1),
              // Summary Area (Fixed Layout)
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildSummaryRow('Subtotal', state.subtotal, settings?.currency ?? '₦'),
                    _buildSummaryRow('Tax (${(state.taxRate * 100).toStringAsFixed(0)}%)', state.tax, settings?.currency ?? '₦'),
                    if (state.discount > 0)
                      _buildSummaryRow('Discount', -state.discount, settings?.currency ?? '₦'),
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8.0),
                      child: Divider(),
                    ),
                    _buildSummaryRow('Total Amount', state.total, settings?.currency ?? '₦', isTotal: true),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      height: 54,
                      child: ElevatedButton(
                        onPressed: state.items.isEmpty ? null : () => _showPreview(context),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue[700],
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
            ],
          );
        },
      ),
    );
  }

  Widget _buildSummaryRow(String label, double amount, String currency, {bool isTotal = false}) {
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
              color: isTotal ? Colors.blue[800] : Colors.black,
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
}
