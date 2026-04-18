import 'dart:typed_data';
import 'package:image_picker/image_picker.dart';
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

class StockManagementPage extends StatefulWidget {
  const StockManagementPage({super.key});

  @override
  State<StockManagementPage> createState() => _StockManagementPageState();
}

class _StockManagementPageState extends State<StockManagementPage> {
  bool _showLowStockOnly = false;

  @override
  void initState() {
    super.initState();
    final businessMode = context.read<SettingsBloc>().state.settings?.businessMode;
    context.read<StockBloc>().add(LoadItems(businessMode: businessMode));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: BlocBuilder<SettingsBloc, SettingsState>(
          builder: (context, state) => Text(state.settings?.stockLabel ?? 'Stock Management'),
        ),
        actions: [
          BlocBuilder<SettingsBloc, SettingsState>(
            builder: (context, state) {
              if (state.settings?.businessMode == 'school') return const SizedBox.shrink();
              return IconButton(
                icon: Icon(
                  _showLowStockOnly ? Icons.filter_list_off : Icons.filter_list,
                  color: _showLowStockOnly ? Colors.orange : null,
                ),
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
            builder: (context, settingsState) => IconButton(
              icon: const Icon(Icons.category, size: 28),
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
          IconButton(
            icon: const Icon(Icons.assessment_outlined),
            tooltip: 'Inventory Report',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const InventoryReportPage()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.show_chart),
            tooltip: 'Profit Report',
            onPressed: () => _verifyAndExecute(
              context,
              () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ProfitReportPage()),
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.payments_outlined),
            tooltip: 'Log Expense',
            onPressed: () => _verifyAndExecute(
              context,
              () => _showLogExpenseDialog(context),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.add, size: 32),
            onPressed: () => _verifyAndExecute(
              context,
              () => _showItemDialog(context),
            ),
          ),
          BlocBuilder<SettingsBloc, SettingsState>(
            builder: (context, state) {
              if (state.settings?.businessMode != 'school') return const SizedBox.shrink();
              return IconButton(
                icon: const Icon(Icons.school_outlined),
                tooltip: 'Academic Setup (Years/Terms/Classes)',
                onPressed: () => _verifyAndExecute(
                  context,
                  () => _showSchoolSetup(context),
                ),
              );
            },
          ),
        ],
      ),
      body: BlocBuilder<SettingsBloc, SettingsState>(
        builder: (context, settingsState) {
          final businessMode = settingsState.settings?.businessMode;
          return BlocBuilder<StockBloc, StockState>(
            builder: (context, state) {
              // Reload if needed or manually pass mode to events
              final displayItems = state.items;
              if (displayItems.isNotEmpty) {
                // 1. Efficient Categorization
                final categoryMap = {for (var c in state.categories) c.id: c.name};
                
                // 2. Filter if needed
                final filteredItems = _showLowStockOnly
                    ? displayItems.where((item) => item.type != 'service' && item.stockQty <= item.minStockQty).toList()
                    : displayItems;

                if (filteredItems.isEmpty) return Center(child: Text(_showLowStockOnly ? 'No low stock items!' : 'No items found.'));

                // 3. Group and Flatten for true lazy loading
                final grouped = groupBy(filteredItems, (Item item) {
                  return categoryMap[item.categoryId] ?? item.category.name.toUpperCase();
                });
                
                final sortedCategoryNames = grouped.keys.toList()..sort();
                
                // Construct a flat list of display elements (Headers and Items)
                final List<dynamic> flatList = [];
                for (final catName in sortedCategoryNames) {
                  flatList.add(catName); // Add header
                  flatList.addAll(grouped[catName]!); // Add items
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: flatList.length,
                  itemBuilder: (context, index) {
                    final element = flatList[index];
                    
                    if (element is String) {
                      // Category Header
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 12.0, horizontal: 4.0),
                        child: Text(
                          element,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.primary.withOpacity(0.8),
                            letterSpacing: 1.2,
                          ),
                        ),
                      );
                    } else {
                      // Item Card
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12.0),
                        child: _buildItemCard(context, element as Item, settingsState.settings),
                      );
                    }
                  },
                );
              }

              // Fallback if no items
              if (state is StockLoading && state.items.isEmpty) {
                return const Center(child: CircularProgressIndicator());
              } else if (state is StockError && state.items.isEmpty) {
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
                        image: DecorationImage(image: ResizeImage(MemoryImage(item.image!), width: 100), fit: BoxFit.cover),
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
    final supplierController = TextEditingController();
    final remarksController = TextEditingController();
    Uint8List? selectedImage;
    bool isSaving = false;

    showDialog(
      context: context,
      barrierDismissible: false, // Prevent accidental dismissal during save
      builder: (ctx) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text('Stock Up: ${item.name}'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Current Stock: ${item.stockQty}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 16),
                TextField(
                  enabled: !isSaving,
                  controller: qtyController,
                  decoration: const InputDecoration(labelText: 'Quantity to Add', border: OutlineInputBorder()),
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 12),
                TextField(
                  enabled: !isSaving,
                  controller: supplierController,
                  decoration: const InputDecoration(labelText: 'Supplier Name', border: OutlineInputBorder(), prefixIcon: Icon(Icons.business)),
                ),
                const SizedBox(height: 12),
                TextField(
                  enabled: !isSaving,
                  controller: remarksController,
                  decoration: const InputDecoration(labelText: 'Remarks (Optional)', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 16),
                const Text('Supply Invoice/Note', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                InkWell(
                  onTap: isSaving ? null : () async {
                    final picker = ImagePicker();
                    final source = await showDialog<ImageSource>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: const Text('Select Image Source'),
                        content: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            ListTile(
                              leading: const Icon(Icons.camera_alt),
                              title: const Text('Camera'),
                              onTap: () => Navigator.pop(ctx, ImageSource.camera),
                            ),
                            ListTile(
                              leading: const Icon(Icons.image),
                              title: const Text('Gallery'),
                              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
                            ),
                          ],
                        ),
                      ),
                    );
                    
                    if (source != null) {
                      final image = await picker.pickImage(source: source, imageQuality: 70);
                      if (image != null) {
                        final bytes = await image.readAsBytes();
                        setState(() => selectedImage = bytes);
                      }
                    }
                  },
                  child: Container(
                    height: 120,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(8),
                      color: isSaving ? Colors.grey.shade200 : Colors.grey.shade50,
                    ),
                    child: selectedImage != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.memory(selectedImage!, fit: BoxFit.cover),
                          )
                        : const Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.add_a_photo_outlined, size: 32, color: Colors.grey),
                              SizedBox(height: 4),
                              Text('Tap to Upload Invoice', style: TextStyle(color: Colors.grey, fontSize: 12)),
                            ],
                          ),
                  ),
                ),
                if (selectedImage != null && !isSaving)
                  TextButton.icon(
                    onPressed: () => setState(() => selectedImage = null),
                    icon: const Icon(Icons.delete_outline, size: 16, color: Colors.red),
                    label: const Text('Remove Image', style: TextStyle(color: Colors.red, fontSize: 12)),
                  ),
                if (isSaving)
                  const Padding(
                    padding: EdgeInsets.only(top: 20.0),
                    child: Center(
                      child: Column(
                        children: [
                          CircularProgressIndicator(),
                          SizedBox(height: 8),
                          Text('Saving Stock Entry...', style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic)),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: isSaving ? null : () => Navigator.pop(ctx), 
              child: const Text('CANCEL')
            ),
            ElevatedButton(
              onPressed: isSaving ? null : () async {
                final qty = int.tryParse(qtyController.text);
                if (qty != null && qty > 0) {
                  setState(() => isSaving = true);
                  
                  // Allow the UI to update to show loading state
                  await Future.delayed(const Duration(milliseconds: 500));
                  
                  if (!context.mounted) return;
                  
                  context.read<StockBloc>().add(StockIncrementRequested(
                    item.id!,
                    qty,
                    remarks: remarksController.text,
                    supplierName: supplierController.text,
                    supplyInvoiceImage: selectedImage,
                  ));
                  
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Added $qty to ${item.name}')),
                  );
                }
              },
              child: Text(isSaving ? 'UPLOADING...' : 'ADD'),
            ),
          ],
        ),
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
