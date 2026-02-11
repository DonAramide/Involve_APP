import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/invoice_bloc.dart';
import '../bloc/invoice_state.dart';
import '../../../stock/presentation/bloc/stock_bloc.dart';
import '../../../stock/presentation/bloc/stock_state.dart';
import '../../../stock/domain/entities/item.dart';
import '../widgets/invoice_preview_dialog.dart';

class CreateInvoicePage extends StatelessWidget {
  const CreateInvoicePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New Invoice')),
      body: Row(
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
                                onAdd: () => context.read<InvoiceBloc>().add(AddItemToInvoice(item, 1)),
                                onRemove: quantity > 0 ? () => context.read<InvoiceBloc>().add(AddItemToInvoice(item, -1)) : null,
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
}

class _POSItemCard extends StatelessWidget {
  final Item item;
  final int quantity;
  final VoidCallback onAdd;
  final VoidCallback? onRemove;

  const _POSItemCard({
    required this.item,
    required this.quantity,
    required this.onAdd,
    this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      elevation: quantity > 0 ? 4 : 1,
      color: quantity > 0 ? Colors.blue[50] : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: quantity > 0 ? Colors.blue : Colors.transparent,
          width: 2,
        ),
      ),
      child: Stack(
        children: [
          // Main Tappable Area
          InkWell(
            onTap: onAdd,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Product Image
                Expanded(
                  flex: 3,
                  child: Container(
                    color: Colors.grey[200],
                    child: item.image != null
                        ? Image.memory(
                            item.image!,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) {
                              return Icon(
                                Icons.image_not_supported,
                                size: 40,
                                color: Colors.grey[400],
                              );
                            },
                          )
                        : Icon(
                            Icons.shopping_bag,
                            size: 40,
                            color: Colors.grey[400],
                          ),
                  ),
                ),
                
                // Product Info
                Expanded(
                  flex: 2,
                  child: Padding(
                    padding: const EdgeInsets.all(4.0), // Reduced from 8.0 to fix overflow
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          item.name,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '\$${item.price.toStringAsFixed(2)}',
                          style: const TextStyle(
                            color: Colors.green,
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
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
              top: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: const BoxDecoration(
                  color: Colors.blue,
                  borderRadius: BorderRadius.only(bottomLeft: Radius.circular(12)),
                ),
                child: Text(
                  'x$quantity',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          // Quick Action Buttons
          Positioned(
            bottom: 4,
            left: 4,
            right: 4,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (onRemove != null)
                  _QuickBtn(icon: Icons.remove, color: Colors.red, onTap: onRemove!),
                if (onRemove == null) const Spacer(),
                _QuickBtn(icon: Icons.add, color: Colors.blue, onTap: onAdd),
              ],
            ),
          ),
        ],
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
    return BlocBuilder<InvoiceBloc, InvoiceState>(
      builder: (context, state) {
        return Container(
          decoration: BoxDecoration(border: Border(left: BorderSide(color: Colors.grey[300]!))),
          child: Column(
            children: [
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
                        subtitle: Text('${item.quantity} x \$${item.unitPrice}'),
                        trailing: Text(
                          '\$${item.total.toStringAsFixed(2)}',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const Divider(),
              _buildSummaryRow('Subtotal', state.subtotal),
              _buildSummaryRow('Tax (15%)', state.tax),
              _buildSummaryRow('Discount', state.discount),
              _buildSummaryRow('Total', state.total, isTotal: true),
              const SizedBox(height: 20),
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    Expanded(
                      child: ElevatedButton(
                        onPressed: state.items.isEmpty ? null : () => _showPreview(context),
                        style: ElevatedButton.styleFrom(minimumSize: const Size(0, 50)),
                        child: const Text('PREVIEW'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSummaryRow(String label, double amount, {bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: isTotal ? 20 : 16, fontWeight: isTotal ? FontWeight.bold : FontWeight.normal)),
          Text('\$${amount.toStringAsFixed(2)}', style: TextStyle(fontSize: isTotal ? 22 : 16, fontWeight: isTotal ? FontWeight.bold : FontWeight.normal, color: isTotal ? Colors.blue : Colors.black)),
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
