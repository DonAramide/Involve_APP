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
              if (state is StockLoading) {
                return const Center(child: CircularProgressIndicator());
              } else if (state is StockLoaded) {
                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: state.items.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final item = state.items[index];
                    return _buildItemCard(context, item, settingsState.settings);
                  },
                );
              } else if (state is StockError) {
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
        subtitle: Text('Qty: ${item.stockQty}', 
                       style: TextStyle(color: Colors.grey[600])),
        trailing: Text('${settings?.currency ?? '₦'}${item.price.toStringAsFixed(2)}', 
                        style: const TextStyle(fontSize: 20, color: Colors.green, fontWeight: FontWeight.bold)),
        onTap: () => _verifyAndExecute(
          context,
          () => _showItemDialog(context, item: item),
        ),
        onLongPress: () => _verifyAndExecute(
          context,
          () => _confirmDelete(context, item),
        ),
      ),
    );
  }

  void _verifyAndExecute(BuildContext context, VoidCallback onSuccess) {
    final settingsBloc = context.read<SettingsBloc>();
    
    // Reset auth to ensure listener catches new success
    settingsBloc.add(ResetSystemAuth());
    
    // Show password dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => BlocListener<SettingsBloc, SettingsState>(
        bloc: settingsBloc,
        listener: (context, state) {
          if (state.isAuthorized) {
            // Dialog closes itself. Just execute action.
            onSuccess();
            // No need to update settings here intentionally
          } else if (state.error != null) {
            // Show error but keep dialog open
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.error!), backgroundColor: Colors.red),
            );
          }
        },
        child: PasswordDialog(bloc: settingsBloc),
      ),
    );
  }

  void _showItemDialog(BuildContext context, {Item? item}) {
    showDialog(
      context: context,
      builder: (_) => ItemFormDialog(item: item, stockBloc: context.read<StockBloc>()),
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
}
