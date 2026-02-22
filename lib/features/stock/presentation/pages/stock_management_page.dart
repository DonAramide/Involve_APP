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
import 'package:collection/collection.dart';

class StockManagementPage extends StatelessWidget {
  const StockManagementPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Stock Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.category, size: 28),
            tooltip: 'Manage Categories',
            onPressed: () => _verifyAndExecute(
              context,
              () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ManageCategoriesPage()),
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.assessment_outlined),
            tooltip: 'Inventory Report',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const InventoryReportPage()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.add, size: 32),
            onPressed: () => _verifyAndExecute(
              context,
              () => _showItemDialog(context),
            ),
          ),
        ],
      ),
      body: BlocBuilder<SettingsBloc, SettingsState>(
        builder: (context, settingsState) {
          return BlocBuilder<StockBloc, StockState>(
            builder: (context, state) {
              // Always try to show the list if we have items, 
              // even if we are in a specialized state or loading.
              if (state.items.isNotEmpty) {
                // Group items by category
                final groupedItems = groupBy(state.items, (Item item) {
                  if (item.categoryId != null) {
                    final cat = state.categories.firstWhereOrNull((c) => c.id == item.categoryId);
                    return cat?.name ?? 'Uncategorized';
                  }
                  return item.category.name.toUpperCase();
                });

                final sortedCategories = groupedItems.keys.toList()..sort();

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
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
                );
              }

              // Fallback if no items
              if (state is StockLoading && state.items.isEmpty) {
                return const Center(child: CircularProgressIndicator());
              } else if (state is StockError && state.items.isEmpty) {
                return Center(child: Text(state.message));
              }

              return const Center(child: Text('Add your first item!'));
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
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        leading: item.image != null
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
        title: Text(item.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Qty: ${item.stockQty}', style: TextStyle(color: item.stockQty <= item.minStockQty ? Colors.red : Colors.grey[600])),
            if (item.stockQty <= item.minStockQty && item.type != 'service')
              const Text('LOW STOCK', style: TextStyle(color: Colors.red, fontSize: 10, fontWeight: FontWeight.bold)),
          ],
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              CurrencyFormatter.formatWithSymbol(
                item.price,
                symbol: settings?.currency ?? '₦',
              ),
              style: const TextStyle(fontSize: 18, color: Colors.green, fontWeight: FontWeight.bold),
            ),
            const SizedBox(width: 8),
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert),
              onSelected: (value) => _handleMenuSelection(context, value, item),
              itemBuilder: (context) => [
                const PopupMenuItem(value: 'edit', child: ListTile(leading: Icon(Icons.edit), title: Text('Edit / Min Alert'))),
                const PopupMenuItem(value: 'stock_up', child: ListTile(leading: Icon(Icons.add_box), title: Text('Stock Up'))),
                const PopupMenuItem(value: 'history', child: ListTile(leading: Icon(Icons.history), title: Text('Adding History'))),
                const PopupMenuItem(value: 'delete', child: ListTile(leading: Icon(Icons.delete, color: Colors.red), title: Text('Delete', style: TextStyle(color: Colors.red)))),
              ],
            ),
          ],
        ),
        onTap: () => _verifyAndExecute(
          context,
          () => _showItemDialog(context, item: item),
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
      builder: (_) => ItemFormDialog(item: item, stockBloc: context.read<StockBloc>()),
    );
  }
}
