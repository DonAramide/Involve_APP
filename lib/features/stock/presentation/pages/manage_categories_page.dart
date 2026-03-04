import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/category.dart';
import '../bloc/stock_bloc.dart';
import '../bloc/stock_state.dart';

class ManageCategoriesPage extends StatefulWidget {
  const ManageCategoriesPage({super.key});

  @override
  State<ManageCategoriesPage> createState() => _ManageCategoriesPageState();
}

class _ManageCategoriesPageState extends State<ManageCategoriesPage> {
  @override
  void initState() {
    super.initState();
    // Trigger load only once
    context.read<StockBloc>().add(LoadCategories());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Manage Categories')),
      body: BlocConsumer<StockBloc, StockState>(
        listener: (context, state) {
          if (state is StockError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.red),
            );
          }
        },
        builder: (context, state) {
          List<Category> categories = [];
          if (state is StockLoaded) {
            categories = state.categories;
          }

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: _AddCategoryForm(),
              ),
              const Divider(),
              Expanded(
                child: categories.isEmpty
                    ? const Center(child: Text('No categories added yet.'))
                    : ListView.builder(
                        itemCount: categories.length,
                        itemBuilder: (context, index) {
                          final category = categories[index];
                          final hasStock = state.items.any((item) => 
                            (item.categoryId == category.id || item.category == category.name) && 
                            item.stockQty > 0
                          );

                          return ListTile(
                            leading: const Icon(Icons.category),
                            title: Text(category.name),
                            trailing: IconButton(
                              icon: Icon(Icons.delete, color: hasStock ? Colors.grey : Colors.red),
                              onPressed: hasStock 
                                ? () {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text('You have to sell all items in "${category.name}" before you can delete it.'),
                                        backgroundColor: Colors.orange,
                                      ),
                                    );
                                  }
                                : () => _confirmDelete(context, category),
                              tooltip: hasStock ? 'Cannot delete: items still in stock' : 'Delete Category',
                            ),
                          );
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  void _confirmDelete(BuildContext context, Category category) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Category?'),
        content: Text('Delete "${category.name}"? Items in this category will not be deleted but may lose their linkage.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          TextButton(
            onPressed: () {
              if (category.id != null) {
                context.read<StockBloc>().add(DeleteCategory(category.id!));
              }
              Navigator.pop(ctx);
            },
            child: const Text('DELETE', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}

class _AddCategoryForm extends StatefulWidget {
  @override
  State<_AddCategoryForm> createState() => _AddCategoryFormState();
}

class _AddCategoryFormState extends State<_AddCategoryForm> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _submit() {
    print('Submit called. Text: ${_controller.text}'); // Debug
    if (_controller.text.isNotEmpty) {
      context.read<StockBloc>().add(AddCategory(_controller.text));
      _controller.clear();
      // Keep focus for rapid entry
      _focusNode.requestFocus();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _controller,
            focusNode: _focusNode,
            autofocus: false, // Disabled for debugging
            decoration: const InputDecoration(
              labelText: 'New Category Name',
              border: OutlineInputBorder(),
            ),
            onSubmitted: (_) => _submit(),
          ),
        ),
        const SizedBox(width: 10),
        ElevatedButton.icon(
          onPressed: _submit,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.deepPurple,
            foregroundColor: Colors.white,
          ),
          icon: const Icon(Icons.add),
          label: const Text('ADD'),
        ),
      ],
    );
  }
}
