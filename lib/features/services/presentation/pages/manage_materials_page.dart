import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import '../../domain/entities/service_material.dart';
import '../bloc/services_bloc.dart';
import '../bloc/services_event.dart';
import '../bloc/services_state.dart';
import '../../../../core/widgets/invify_loading_indicator.dart';

class ManageMaterialsPage extends StatefulWidget {
  const ManageMaterialsPage({super.key});

  @override
  State<ManageMaterialsPage> createState() => _ManageMaterialsPageState();
}

class _ManageMaterialsPageState extends State<ManageMaterialsPage> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    context.read<ServicesBloc>().add(const LoadServiceMaterials());
    context.read<ServicesBloc>().add(const LoadMaterialCategories());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Materials & Parts'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showMaterialDialog(context),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search materials...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: Colors.grey.shade50,
              ),
              onChanged: (v) {
                // Future implementation: Local search or Bloc event
              },
            ),
          ),
          Expanded(
            child: BlocBuilder<ServicesBloc, ServicesState>(
              builder: (context, state) {
                if (state.status == ServicesStatus.loading && state.materials.isEmpty) {
                  return const InvifyLoadingIndicator(message: 'SYNCING SERVICE MATERIALS...');
                }

                if (state.materials.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey),
                        const SizedBox(height: 16),
                        const Text('No materials found'),
                        TextButton(
                          onPressed: () => _showMaterialDialog(context),
                          child: const Text('Add your first material'),
                        ),
                      ],
                    ),
                  );
                }

                final categories = state.categories;
                final materials = state.materials;

                return ListView.builder(
                  itemCount: categories.length,
                  itemBuilder: (context, catIdx) {
                    final cat = categories[catIdx];
                    final catMaterials = materials.where((m) => m.category == cat).toList();

                    return ExpansionTile(
                      initiallyExpanded: true,
                      title: Text(cat, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
                      children: catMaterials.map((m) => ListTile(
                        title: Text(m.name),
                        subtitle: Text('Default: ${CurrencyFormatter.formatWithSymbol(m.defaultPrice)}'),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.edit_outlined, color: Colors.blue),
                              onPressed: () => _showMaterialDialog(context, material: m),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline, color: Colors.red),
                              onPressed: () => _confirmDelete(context, m),
                            ),
                          ],
                        ),
                      )).toList(),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _showMaterialDialog(BuildContext context, {ServiceMaterial? material}) {
    final nameCtrl = TextEditingController(text: material?.name);
    final catCtrl = TextEditingController(text: material?.category);
    final priceCtrl = TextEditingController(text: material?.defaultPrice.toString());
    final isEdit = material != null;

    showDialog(
      context: context,
      builder: (context) => BlocBuilder<ServicesBloc, ServicesState>(
        builder: (context, state) {
          return AlertDialog(
            title: Text(isEdit ? 'Edit Material' : 'Add Material'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Material Name',
                      hintText: 'e.g. Engine Oil',
                    ),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: state.categories.contains(catCtrl.text) ? catCtrl.text : (state.categories.isNotEmpty ? state.categories.first : null),
                    decoration: const InputDecoration(labelText: 'Category'),
                    items: state.categories.map((c) => DropdownMenuItem(
                      value: c,
                      child: Text(c),
                    )).toList(),
                    onChanged: (v) {
                      if (v != null) catCtrl.text = v;
                    },
                    hint: const Text('Select Category'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: priceCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Default Price',
                      prefixText: '₦ ',
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: () {
                  final name = nameCtrl.text;
                  final cat = catCtrl.text;
                  final price = double.tryParse(priceCtrl.text) ?? 0.0;

                  if (name.isNotEmpty && cat.isNotEmpty) {
                    if (isEdit) {
                      context.read<ServicesBloc>().add(UpdateServiceMaterial(
                        id: material.id,
                        name: name,
                        category: cat,
                        price: price,
                      ));
                    } else {
                      context.read<ServicesBloc>().add(AddServiceMaterial(
                        name: name,
                        category: cat,
                        price: price,
                      ));
                    }
                    Navigator.pop(context);
                  }
                },
                child: Text(isEdit ? 'Save Changes' : 'Add Material'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _confirmDelete(BuildContext context, ServiceMaterial material) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Material?'),
        content: Text('Are you sure you want to delete "${material.name}"? This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              context.read<ServicesBloc>().add(DeleteServiceMaterial(material.id));
              Navigator.pop(context);
            },
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}
