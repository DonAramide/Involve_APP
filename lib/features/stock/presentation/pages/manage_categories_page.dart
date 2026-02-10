import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/category.dart';
import '../bloc/stock_bloc.dart';
import '../bloc/stock_state.dart';

class ManageCategoriesPage extends StatelessWidget {
  const ManageCategoriesPage({super.key});

  @override
  Widget build(BuildContext context) {
    // Trigger load on enter
    context.read<StockBloc>().add(LoadCategories());

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
                          return ListTile(
                            leading: const Icon(Icons.category),
                            title: Text(category.name),
                            trailing: IconButton(
                              icon: const Icon(Icons.delete, color: Colors.red),
                              onPressed: () => _confirmDelete(context, category),
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
              context.read<StockBloc>().add(DeleteCategory(category.id));
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

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _controller,
            decoration: const InputDecoration(
              labelText: 'New Category Name',
              border: OutlineInputBorder(),
            ),
          ),
        ),
        const SizedBox(width: 10),
        ElevatedButton.icon(
          onPressed: () {
            if (_controller.text.isNotEmpty) {
              context.read<StockBloc>().add(AddCategory(_controller.text));
              _controller.clear();
            }
          },
          icon: const Icon(Icons.add),
          label: const Text('ADD'),
        ),
      ],
    );
  }
}
