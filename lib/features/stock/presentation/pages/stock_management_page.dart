import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/stock_bloc.dart';
import '../bloc/stock_state.dart';
import '../../domain/entities/item.dart';
import '../widgets/item_form_dialog.dart';
import 'manage_categories_page.dart';

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
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ManageCategoriesPage()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.add, size: 32),
            onPressed: () => _showItemDialog(context),
          ),
        ],
      ),
      body: BlocBuilder<StockBloc, StockState>(
        builder: (context, state) {
          if (state is StockLoading) {
            return const Center(child: CircularProgressIndicator());
          } else if (state is StockLoaded) {
            // Check if we need to filter by category? 
            // For now just list all
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: state.items.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final item = state.items[index];
                return _buildItemCard(context, item);
              },
            );
          } else if (state is StockError) {
            return Center(child: Text(state.message));
          }
          return const Center(child: Text('Add your first item!'));
        },
      ),
    );
  }

  Widget _buildItemCard(BuildContext context, Item item) {
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
        trailing: Text('\$${item.price.toStringAsFixed(2)}', 
                        style: const TextStyle(fontSize: 20, color: Colors.green, fontWeight: FontWeight.bold)),
        onTap: () => _showItemDialog(context, item: item),
        onLongPress: () => _confirmDelete(context, item),
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
            },
            child: const Text('DELETE', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}
