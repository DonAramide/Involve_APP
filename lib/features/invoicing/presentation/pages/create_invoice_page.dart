import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/features/invoicing/presentation/bloc/invoice_bloc.dart';
import 'package:involve_app/features/invoicing/presentation/bloc/invoice_state.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_bloc.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_state.dart';
import 'package:involve_app/features/stock/domain/entities/item.dart';
import 'package:involve_app/features/invoicing/presentation/widgets/invoice_preview_dialog.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:involve_app/features/settings/domain/entities/settings.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';

class CreateInvoicePage extends StatelessWidget {
  const CreateInvoicePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('NEW INVOICE', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.2)),
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Theme.of(context).colorScheme.primary,
                Color.lerp(Theme.of(context).colorScheme.primary, Colors.black, 0.2)!,
              ],
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
              discountEnabled: settings.discountEnabled,
            ));
          }
        },
        child: BlocBuilder<SettingsBloc, SettingsState>(
          builder: (context, settingsState) {
            final settings = settingsState.settings;
            if (settings != null) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (context.mounted) {
                  context.read<InvoiceBloc>().add(UpdateInvoiceSettings(
                        taxRate: settings.taxRate,
                        taxEnabled: settings.taxEnabled,
                        discountEnabled: settings.discountEnabled,
                      ));
                }
              });
            }

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
                    // Left Side: Item Selection
                    Expanded(
                      flex: 3,
                      child: _ItemSelector(isMobile: false),
                    ),
                    // Right Side: Cart Summary
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
                      child: ListTile(
                        dense: true,
                        title: Text(item.item.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text(CurrencyFormatter.formatWithSymbol(item.unitPrice, symbol: settings?.currency ?? '₦')),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _QuickBtn(
                              icon: Icons.remove_circle_outline,
                              color: Colors.red,
                              onTap: () => context.read<InvoiceBloc>().add(AddItemToInvoice(item.item, -1)),
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              child: Text(
                                '${item.quantity}',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                            ),
                            _QuickBtn(
                              icon: Icons.add_circle_outline,
                              color: Colors.green,
                              onTap: () => context.read<InvoiceBloc>().add(AddItemToInvoice(item.item, 1)),
                            ),
                            const SizedBox(width: 16),
                            Text(
                              CurrencyFormatter.formatWithSymbol(
                                item.total,
                                symbol: settings?.currency ?? '₦',
                              ),
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                          ],
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
                          onPressed: () => _showDiscountDialog(context, state.discount),
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
                      title: Text(state.customerName ?? 'Add Customer', style: TextStyle(color: state.customerName != null ? Colors.black : Colors.blue)),
                      subtitle: state.customerAddress != null ? Text(state.customerAddress!) : null,
                      leading: Icon(Icons.person_outline, color: state.customerName != null ? Theme.of(context).colorScheme.primary : Colors.grey),
                      trailing: const Icon(Icons.edit, size: 16),
                      onTap: () => _showCustomerDialog(context, state.customerName, state.customerAddress),
                    ),
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
            ],
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

  void _showDiscountDialog(BuildContext context, double currentDiscount) {
    final controller = TextEditingController(text: currentDiscount > 0 ? currentDiscount.toString() : '');
    final invoiceBloc = context.read<InvoiceBloc>();
    final currency = context.read<SettingsBloc>().state.settings?.currency ?? '₦';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Apply Discount'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Enter fixed discount amount to apply to total.'),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              autofocus: true,
              decoration: InputDecoration(
                labelText: 'Discount Amount ($currency)',
                border: const OutlineInputBorder(),
                prefixText: currency,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          if (currentDiscount > 0)
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
              invoiceBloc.add(UpdateDiscount(discount));
              Navigator.pop(ctx);
            },
            child: const Text('APPLY'),
          ),
        ],
      ),
    );
  }

  void _showCustomerDialog(BuildContext context, String? currentName, String? currentAddress) {
    final nameController = TextEditingController(text: currentName);
    final addrController = TextEditingController(text: currentAddress);
    final invoiceBloc = context.read<InvoiceBloc>();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Customer Information'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(labelText: 'Customer Name', border: OutlineInputBorder()),
              autofocus: true,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: addrController,
              decoration: const InputDecoration(labelText: 'Customer Address', border: OutlineInputBorder()),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          ElevatedButton(
            onPressed: () {
              invoiceBloc.add(UpdateCustomerInfo(
                name: nameController.text.isEmpty ? null : nameController.text,
                address: addrController.text.isEmpty ? null : addrController.text,
              ));
              Navigator.pop(ctx);
            },
            child: const Text('SAVE'),
          ),
        ],
      ),
    );
  }
}
