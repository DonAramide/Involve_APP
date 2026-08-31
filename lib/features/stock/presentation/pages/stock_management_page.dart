import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_bloc.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_state.dart';
import 'package:involve_app/features/stock/domain/entities/item.dart';
import 'package:involve_app/features/stock/presentation/widgets/item_form_dialog.dart';
import 'package:involve_app/features/stock/presentation/pages/manage_categories_page.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:involve_app/features/settings/domain/entities/settings.dart';
import 'package:involve_app/features/settings/presentation/widgets/password_dialog.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/stock/presentation/pages/stock_history_page.dart';
import 'package:involve_app/features/stock/presentation/pages/inventory_report_page.dart';
import 'package:involve_app/features/stock/presentation/pages/profit_report_page.dart';
import 'package:involve_app/features/stock/presentation/widgets/log_expense_dialog.dart';
import 'package:collection/collection.dart';
import '../../../../core/utils/terminology.dart';
import 'package:involve_app/features/school/presentation/pages/school_setup_page.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

class StockManagementPage extends StatefulWidget {
  const StockManagementPage({super.key});

  @override
  State<StockManagementPage> createState() => _StockManagementPageState();
}

class _StockManagementPageState extends State<StockManagementPage> {
  bool _showLowStockOnly = false;
  String _selectedCategoryFilter = 'All';

  String _getCategoryName(Item item, List<dynamic> categories) {
    if (item.categoryId != null) {
      final cat = categories.firstWhereOrNull((c) => c.id == item.categoryId);
      return cat?.name ?? 'Uncategorized';
    }
    final name = item.name.toLowerCase();
    if (name.contains('rice') || name.contains('beans') || name.contains('food')) {
      return 'Grains & Food';
    }
    if (name.contains('book') || name.contains('fee') || name.contains('tuition')) {
      return 'Education';
    }
    return 'General Store';
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onPressed,
    Color? color,
    String? tooltip,
    double iconSize = 20,
  }) {
    return Tooltip(
      message: tooltip ?? label,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 5.0, vertical: 4.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: iconSize, color: color),
              const SizedBox(height: 2),
              Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        final businessMode = context.read<SettingsBloc>().state.settings?.businessMode;
        context.read<StockBloc>().add(LoadItems(businessMode: businessMode));
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: BlocBuilder<SettingsBloc, SettingsState>(
          builder: (context, state) => Text(
            state.settings?.stockLabel ?? 'Stock',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ),
        actions: [
          BlocBuilder<SettingsBloc, SettingsState>(
            builder: (context, state) {
              if (state.settings?.businessMode == 'school') return const SizedBox.shrink();
              return _buildActionButton(
                icon: _showLowStockOnly ? Icons.filter_list_off : Icons.filter_list,
                label: _showLowStockOnly ? 'All Items' : 'Low Stock',
                color: _showLowStockOnly ? Colors.orange : null,
                tooltip: _showLowStockOnly ? 'Show All Items' : 'Show Low Stock Only',
                onPressed: () {
                  setState(() {
                    _showLowStockOnly = !_showLowStockOnly;
                  });
                },
              );
            },
          ),
          BlocBuilder<SettingsBloc, SettingsState>(
            builder: (context, settingsState) => _buildActionButton(
              icon: Icons.category_outlined,
              label: settingsState.settings?.categoryLabel ?? 'Categories',
              tooltip: 'Manage ${settingsState.settings?.categoryLabel ?? 'Categories'}',
              onPressed: () => _verifyAndExecute(
                context,
                () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ManageCategoriesPage()),
                ),
              ),
            ),
          ),
          _buildActionButton(
            icon: Icons.assessment_outlined,
            label: 'Inventory',
            tooltip: 'Inventory Report',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const InventoryReportPage()),
            ),
          ),
          _buildActionButton(
            icon: Icons.show_chart,
            label: 'Profit',
            tooltip: 'Profit Report',
            onPressed: () => _verifyAndExecute(
              context,
              () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ProfitReportPage()),
              ),
            ),
          ),
          _buildActionButton(
            icon: Icons.payments_outlined,
            label: 'Expense',
            tooltip: 'Log Expense',
            onPressed: () => _verifyAndExecute(
              context,
              () => _showLogExpenseDialog(context),
            ),
          ),
          BlocBuilder<SettingsBloc, SettingsState>(
            builder: (context, settingsState) => _buildActionButton(
              icon: Icons.add_circle_outline,
              label: 'Add ${settingsState.settings?.productLabel ?? 'Item'}',
              tooltip: 'Add ${settingsState.settings?.productLabel ?? 'Item'}',
              onPressed: () => _verifyAndExecute(
                context,
                () => _showItemDialog(context),
              ),
            ),
          ),
          BlocBuilder<SettingsBloc, SettingsState>(
            builder: (context, state) {
              if (state.settings?.businessMode != 'school') return const SizedBox.shrink();
              return _buildActionButton(
                icon: Icons.school_outlined,
                label: 'Setup',
                tooltip: 'Academic Setup (Years/Terms/Classes)',
                onPressed: () => _verifyAndExecute(
                  context,
                  () => _showSchoolSetup(context),
                ),
              );
            },
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: BlocBuilder<SettingsBloc, SettingsState>(
        builder: (context, settingsState) {
          return BlocBuilder<StockBloc, StockState>(
            builder: (context, state) {
              if (state is StockLoading) {
                return const InvifyLoadingIndicator(message: 'BACKGROUND SYNCING STOCK...');
              }

              // Reload if needed or manually pass mode to events
              var displayItems = state.items;
              if (_showLowStockOnly) {
                displayItems = displayItems.where((item) => 
                  item.type != 'service' && item.stockQty <= item.minStockQty
                ).toList();
              }

              // All unique categories for filter row
              final allCategories = groupBy(state.items, (Item item) => _getCategoryName(item, state.categories)).keys.toList()..sort();

              // Filter displayItems by category filter
              if (_selectedCategoryFilter != 'All') {
                displayItems = displayItems.where((item) => 
                  _getCategoryName(item, state.categories) == _selectedCategoryFilter
                ).toList();
              }

              // Group displayItems by category
              final groupedItems = groupBy(displayItems, (Item item) => _getCategoryName(item, state.categories));
              final sortedCategories = groupedItems.keys.toList()..sort();

              if (displayItems.isNotEmpty) {
                return Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      child: Row(
                        children: [
                          Expanded(
                            child: Card(
                              elevation: 2,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                                child: Column(
                                  children: [
                                    Text(
                                      'Categories',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey[600],
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${allCategories.length}',
                                      style: const TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Card(
                              elevation: 2,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                                child: Column(
                                  children: [
                                    Text(
                                      'Total Products',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey[600],
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${displayItems.length}',
                                      style: const TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    
                    // Category Filters scrolling row
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: Row(
                        children: [
                          'All',
                          ...allCategories
                        ].map((catName) {
                          final isSelected = _selectedCategoryFilter == catName;
                          return Padding(
                            padding: const EdgeInsets.only(right: 8.0),
                            child: ChoiceChip(
                              label: Text(
                                catName,
                                style: TextStyle(
                                  color: isSelected ? Colors.black : Colors.grey[700],
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              selected: isSelected,
                              selectedColor: Theme.of(context).colorScheme.primary,
                              backgroundColor: Colors.grey[200],
                              onSelected: (selected) {
                                setState(() {
                                  _selectedCategoryFilter = catName;
                                });
                              },
                            ),
                          );
                        }).toList(),
                      ),
                    ),

                    Expanded(
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        itemCount: sortedCategories.length,
                        itemBuilder: (context, catIndex) {
                          final categoryName = sortedCategories[catIndex];
                          final items = groupedItems[categoryName]!;

                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Padding(
                                padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
                                child: Text(
                                  categoryName,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: Theme.of(context).colorScheme.primary.withOpacity(0.8),
                                    letterSpacing: 1.2,
                                  ),
                                ),
                              ),
                              ...items.map((item) => Padding(
                                padding: const EdgeInsets.only(bottom: 12.0),
                                child: _buildItemCard(context, item, settingsState.settings),
                              )),
                              const SizedBox(height: 16),
                            ],
                          );
                        },
                      ),
                    ),
                  ],
                );
              }

              if (state is StockError && state.items.isEmpty) {
                return Center(child: Text(state.message));
              }

              return Center(
                child: Text(_showLowStockOnly 
                  ? 'No low stock items found!' 
                  : 'Add your first item!'),
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildItemCard(BuildContext context, Item item, AppSettings? settings) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () => _verifyAndExecute(
          context,
          () => _showItemDialog(context, item: item),
        ),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              // Image/Icon
              item.image != null
                  ? Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        image: DecorationImage(image: MemoryImage(item.image!), fit: BoxFit.cover),
                      ),
                    )
                  : Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(color: Colors.grey[200], borderRadius: BorderRadius.circular(8)),
                      child: const Icon(Icons.inventory_2, color: Colors.grey),
                    ),
              const SizedBox(width: 16),
              // Name and Qty (Flexible to take middle space)
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      item.name,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (item.type != 'service') ...[
                      const SizedBox(height: 4),
                      Text(
                        'Qty: ${item.stockQty}',
                        style: TextStyle(
                          fontSize: 13,
                          color: item.stockQty <= item.minStockQty ? Colors.red : Colors.grey[600],
                          fontWeight: item.stockQty <= item.minStockQty ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                      if (item.stockQty <= item.minStockQty)
                        const Text(
                          'LOW STOCK',
                          style: TextStyle(color: Colors.red, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                    ] else ...[
                      const SizedBox(height: 4),
                      Text(
                        settings?.businessMode == 'school' ? 'Fixed Fee' : 'Service',
                        style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              // Price and Menu
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    CurrencyFormatter.formatWithSymbol(
                      item.price,
                      symbol: settings?.currency ?? '₦',
                    ),
                    style: const TextStyle(fontSize: 16, color: Colors.green, fontWeight: FontWeight.bold),
                  ),
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert),
                    onSelected: (value) => _handleMenuSelection(context, value, item),
                    itemBuilder: (context) => [
                      const PopupMenuItem(value: 'edit', child: ListTile(leading: Icon(Icons.edit), title: Text('Edit'))),
                      if (item.type != 'service') ...[
                        const PopupMenuItem(value: 'stock_up', child: ListTile(leading: Icon(Icons.add_box), title: Text('Stock Up'))),
                        PopupMenuItem(value: 'history', child: ListTile(leading: Icon(Icons.history), title: Text(settings?.stockHistoryLabel ?? 'Stock History'))),
                      ],
                      PopupMenuItem(
                        value: 'delete',
                        enabled: item.type == 'service' || item.stockQty <= 0,
                        child: ListTile(
                          leading: Icon(Icons.delete, color: (item.type == 'service' || item.stockQty <= 0) ? Colors.red : Colors.grey),
                          title: Text(
                            'Delete',
                            style: TextStyle(color: (item.type == 'service' || item.stockQty <= 0) ? Colors.red : Colors.grey),
                          ),
                          subtitle: (item.type != 'service' && item.stockQty > 0) ? const Text('Empty stock first', style: TextStyle(fontSize: 10)) : null,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _handleMenuSelection(BuildContext context, String value, Item item) {
    switch (value) {
      case 'edit':
        _verifyAndExecute(context, () => _showItemDialog(context, item: item));
        break;
      case 'stock_up':
        _verifyAndExecute(context, () => _showStockUpDialog(context, item));
        break;
      case 'history':
        Navigator.push(context, MaterialPageRoute(builder: (_) => StockHistoryPage(item: item)));
        break;
      case 'delete':
        _verifyAndExecute(context, () => _confirmDelete(context, item));
        break;
    }
  }

  void _showStockUpDialog(BuildContext context, Item item) {
    final qtyController = TextEditingController();
    final remarksController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Stock Up: ${item.name}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Current Stock: ${item.stockQty}', 
                 style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 16),
            TextField(
              controller: qtyController,
              decoration: const InputDecoration(labelText: 'Quantity to Add'),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: remarksController,
              decoration: const InputDecoration(labelText: 'Remarks (Optional)'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          ElevatedButton(
            onPressed: () {
              final qty = int.tryParse(qtyController.text);
              if (qty != null && qty > 0) {
                context.read<StockBloc>().add(StockIncrementRequested(
                      item.id!,
                      qty,
                      remarks: remarksController.text,
                    ));
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Added $qty to ${item.name}')),
                );
              }
            },
            child: const Text('ADD'),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context, Item item) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Item?'),
        content: Text('Are you sure you want to delete ${item.name}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          TextButton(
            onPressed: () {
              context.read<StockBloc>().add(DeleteStockItem(item.id!));
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('${item.name} deleted')),
              );
            },
            child: const Text('DELETE', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _verifyAndExecute(BuildContext context, VoidCallback onSuccess) {
    final settingsBloc = context.read<SettingsBloc>();
    
    // Reset auth to ensure listener catches new success
    settingsBloc.add(ResetSystemAuth());
    
    // Show password dialog
    showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => PasswordDialog(bloc: settingsBloc),
    ).then((authorized) {
      if (authorized == true && context.mounted) {
        onSuccess();
      }
    });
  }

  void _showItemDialog(BuildContext context, {Item? item}) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => ItemFormDialog(item: item, stockBloc: context.read<StockBloc>()),
    );
  }

  void _showLogExpenseDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => LogExpenseDialog(stockBloc: context.read<StockBloc>()),
    );
  }

  void _showSchoolSetup(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const SchoolSetupPage()),
    );
  }
}
