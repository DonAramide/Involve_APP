import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/core/utils/logo_compressor.dart';
import '../../domain/entities/service_material.dart';
import '../bloc/services_bloc.dart';
import '../bloc/services_event.dart';
import '../bloc/services_state.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

class ManageMaterialsPage extends StatefulWidget {
  const ManageMaterialsPage({super.key});

  @override
  State<ManageMaterialsPage> createState() => _ManageMaterialsPageState();
}

class _ManageMaterialsPageState extends State<ManageMaterialsPage> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() {
    context.read<ServicesBloc>().add(const LoadServiceMaterials());
    context.read<ServicesBloc>().add(const LoadMaterialCategories());
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Materials & Parts'),
        actions: [
          Tooltip(
            message: 'Refresh',
            child: InkWell(
              onTap: _loadData,
              borderRadius: BorderRadius.circular(8),
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.refresh, size: 20),
                    SizedBox(height: 2),
                    Text('Refresh', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ),
          ),
          Tooltip(
            message: 'Add Material',
            child: InkWell(
              onTap: () => _showMaterialDialog(context),
              borderRadius: BorderRadius.circular(8),
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.add_circle_outline, size: 20),
                    SizedBox(height: 2),
                    Text('Add', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 4),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showMaterialDialog(context),
        icon: const Icon(Icons.add),
        label: const Text('Add Material'),
      ),
      body: BlocConsumer<ServicesBloc, ServicesState>(
        listener: (context, state) {
          if (state.errorMessage != null && state.errorMessage!.isNotEmpty) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.errorMessage!), backgroundColor: Colors.red),
            );
          }
          if (state.successMessage != null && state.successMessage!.isNotEmpty) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.successMessage!), backgroundColor: Colors.green),
            );
          }
        },
        builder: (context, state) {
          if (state.status == ServicesStatus.loading && state.materials.isEmpty) {
            return const InvifyLoadingIndicator(message: 'SYNCING SERVICE MATERIALS...');
          }

          final allMaterials = state.materials;
          final filteredMaterials = allMaterials.where((m) {
            if (_searchQuery.isEmpty) return true;
            final q = _searchQuery.toLowerCase();
            return m.name.toLowerCase().contains(q) || m.category.toLowerCase().contains(q);
          }).toList();

          // Build group map of category -> list of materials
          final Map<String, List<ServiceMaterial>> grouped = {};
          
          // Seed configured categories first
          for (final cat in state.categories) {
            if (cat.trim().isNotEmpty) {
              grouped[cat.trim()] = [];
            }
          }

          // Populate with filtered materials
          for (final m in filteredMaterials) {
            final catKey = m.category.trim().isNotEmpty ? m.category.trim() : 'General';
            grouped.putIfAbsent(catKey, () => []).add(m);
          }

          // Filter out empty category headers when searching, but keep them when viewing all
          final displayCategories = grouped.keys.where((cat) {
            if (_searchQuery.isNotEmpty) {
              return (grouped[cat]?.isNotEmpty ?? false);
            }
            return true;
          }).toList()..sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search materials or parts...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                          )
                        : null,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: Colors.grey.shade50,
                  ),
                  onChanged: (v) => setState(() => _searchQuery = v.trim()),
                ),
              ),
              Expanded(
                child: allMaterials.isEmpty && state.categories.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey),
                            const SizedBox(height: 16),
                            const Text(
                              'No materials or parts added yet',
                              style: TextStyle(fontSize: 16, color: Colors.grey),
                            ),
                            const SizedBox(height: 12),
                            ElevatedButton.icon(
                              onPressed: () => _showMaterialDialog(context),
                              icon: const Icon(Icons.add),
                              label: const Text('Add your first material'),
                            ),
                          ],
                        ),
                      )
                    : filteredMaterials.isEmpty && _searchQuery.isNotEmpty
                        ? Center(
                            child: Text(
                              'No materials match "$_searchQuery"',
                              style: const TextStyle(fontSize: 16, color: Colors.grey),
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: () async => _loadData(),
                            child: ListView.builder(
                              padding: const EdgeInsets.only(bottom: 80),
                              itemCount: displayCategories.length,
                              itemBuilder: (context, catIdx) {
                                final cat = displayCategories[catIdx];
                                final catMaterials = grouped[cat] ?? [];

                                return Card(
                                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  clipBehavior: Clip.antiAlias,
                                  child: ExpansionTile(
                                    initiallyExpanded: true,
                                    title: Row(
                                      children: [
                                        Text(
                                          cat,
                                          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blue),
                                        ),
                                        const SizedBox(width: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: Colors.blue.withValues(alpha: 0.1),
                                            borderRadius: BorderRadius.circular(10),
                                          ),
                                          child: Text(
                                            '${catMaterials.length}',
                                            style: const TextStyle(fontSize: 12, color: Colors.blue, fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                      ],
                                    ),
                                    children: catMaterials.isEmpty
                                        ? [
                                            ListTile(
                                              title: Text('No items in $cat', style: TextStyle(color: Colors.grey.shade500, fontStyle: FontStyle.italic)),
                                              trailing: TextButton.icon(
                                                onPressed: () => _showMaterialDialog(context, initialCategory: cat),
                                                icon: const Icon(Icons.add, size: 16),
                                                label: const Text('Add Item'),
                                              ),
                                            )
                                          ]
                                        : catMaterials.map((m) => ListTile(
                                            leading: _materialAvatar(context, m),
                                            title: Text(m.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                                            subtitle: Text('Default: ${CurrencyFormatter.formatWithSymbol(m.defaultPrice)}'),
                                            trailing: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                IconButton(
                                                  icon: const Icon(Icons.edit_outlined, color: Colors.blue),
                                                  tooltip: 'Edit',
                                                  onPressed: () => _showMaterialDialog(context, material: m),
                                                ),
                                                IconButton(
                                                  icon: const Icon(Icons.delete_outline, color: Colors.red),
                                                  tooltip: 'Delete',
                                                  onPressed: () => _confirmDelete(context, m),
                                                ),
                                              ],
                                            ),
                                          )).toList(),
                                  ),
                                );
                              },
                            ),
                          ),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showMaterialDialog(BuildContext context, {ServiceMaterial? material, String? initialCategory}) {
    final state = context.read<ServicesBloc>().state;
    final isEdit = material != null;

    final nameCtrl = TextEditingController(text: material?.name ?? '');
    final priceCtrl = TextEditingController(
      text: material != null ? (material.defaultPrice == 0.0 ? '' : material.defaultPrice.toStringAsFixed(0)) : '',
    );
    final customCatCtrl = TextEditingController();

    // Determine starting category
    final availableCategories = state.categories.where((c) => c.trim().isNotEmpty).toList();
    if (!availableCategories.contains('General')) {
      availableCategories.add('General');
    }

    String selectedCategory = material?.category ?? initialCategory ?? (availableCategories.isNotEmpty ? availableCategories.first : 'General');
    bool isAddingNewCategory = false;
    String? nameError;
    String? priceError;
    Uint8List? imageBytes = material?.image;

    Future<void> pickImage(ImageSource source, void Function(void Function()) setDialogState) async {
      final picker = ImagePicker();
      final file = await picker.pickImage(
        source: source,
        maxWidth: 800,
        imageQuality: 80,
      );
      if (file == null) return;
      final compressed = LogoCompressor.compress(
        await file.readAsBytes(),
        maxDimension: 512,
        quality: 80,
      );
      setDialogState(() => imageBytes = compressed);
    }

    Future<void> chooseImageSource(void Function(void Function()) setDialogState) async {
      final source = await showModalBottomSheet<ImageSource>(
        context: context,
        builder: (ctx) => SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text('Material / part photo', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
              ListTile(
                leading: const Icon(Icons.camera_alt),
                title: const Text('Take photo'),
                onTap: () => Navigator.pop(ctx, ImageSource.camera),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library),
                title: const Text('Choose from gallery'),
                onTap: () => Navigator.pop(ctx, ImageSource.gallery),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      );
      if (source != null) await pickImage(source, setDialogState);
    }

    showDialog(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            title: Text(isEdit ? 'Edit Material / Part' : 'Add Material / Part'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: nameCtrl,
                    decoration: InputDecoration(
                      labelText: 'Material Name (Required)',
                      hintText: 'e.g. Engine Oil, Zipper, Brake Pad',
                      errorText: nameError,
                      border: const OutlineInputBorder(),
                    ),
                    textCapitalization: TextCapitalization.words,
                    onChanged: (_) {
                      if (nameError != null) setDialogState(() => nameError = null);
                    },
                  ),
                  const SizedBox(height: 14),
                  if (!isAddingNewCategory) ...[
                    DropdownButtonFormField<String>(
                      value: availableCategories.contains(selectedCategory) ? selectedCategory : (availableCategories.isNotEmpty ? availableCategories.first : null),
                      decoration: const InputDecoration(
                        labelText: 'Category',
                        border: OutlineInputBorder(),
                      ),
                      items: availableCategories.map((c) => DropdownMenuItem(
                        value: c,
                        child: Text(c),
                      )).toList(),
                      onChanged: (v) {
                        if (v != null) {
                          setDialogState(() => selectedCategory = v);
                        }
                      },
                    ),
                    const SizedBox(height: 4),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton.icon(
                        onPressed: () {
                          setDialogState(() => isAddingNewCategory = true);
                        },
                        icon: const Icon(Icons.add, size: 16),
                        label: const Text('Add New Category', style: TextStyle(fontSize: 12)),
                      ),
                    ),
                  ] else ...[
                    TextField(
                      controller: customCatCtrl,
                      decoration: const InputDecoration(
                        labelText: 'New Category Name',
                        hintText: 'e.g. Fluids, Fasteners, Tools',
                        border: OutlineInputBorder(),
                      ),
                      textCapitalization: TextCapitalization.words,
                    ),
                    const SizedBox(height: 4),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () {
                          setDialogState(() => isAddingNewCategory = false);
                        },
                        child: const Text('Select Existing Category', style: TextStyle(fontSize: 12)),
                      ),
                    ),
                  ],
                  const SizedBox(height: 10),
                  const Text('Photo', style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  if (imageBytes != null)
                    Stack(
                      alignment: Alignment.topRight,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.memory(
                            imageBytes!,
                            height: 140,
                            width: double.infinity,
                            fit: BoxFit.cover,
                          ),
                        ),
                        IconButton(
                          onPressed: () => setDialogState(() => imageBytes = null),
                          tooltip: 'Remove photo',
                          icon: const CircleAvatar(
                            radius: 14,
                            backgroundColor: Colors.black54,
                            child: Icon(Icons.close, size: 16, color: Colors.white),
                          ),
                        ),
                      ],
                    )
                  else
                    OutlinedButton.icon(
                      onPressed: () => chooseImageSource(setDialogState),
                      icon: const Icon(Icons.add_a_photo_outlined),
                      label: const Text('Take photo or pick from gallery'),
                    ),
                  if (imageBytes != null) ...[
                    const SizedBox(height: 8),
                    TextButton.icon(
                      onPressed: () => chooseImageSource(setDialogState),
                      icon: const Icon(Icons.swap_horiz),
                      label: const Text('Replace photo'),
                    ),
                  ],
                  const SizedBox(height: 10),
                  TextField(
                    controller: priceCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(
                      labelText: 'Default Price',
                      prefixText: '₦ ',
                      errorText: priceError,
                      border: const OutlineInputBorder(),
                    ),
                    onChanged: (_) {
                      if (priceError != null) setDialogState(() => priceError = null);
                    },
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogCtx),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: () {
                  final name = nameCtrl.text.trim();
                  final rawPrice = priceCtrl.text.trim();
                  final price = double.tryParse(rawPrice) ?? 0.0;
                  
                  final category = isAddingNewCategory
                      ? (customCatCtrl.text.trim().isNotEmpty ? customCatCtrl.text.trim() : 'General')
                      : selectedCategory.trim();

                  if (name.isEmpty) {
                    setDialogState(() => nameError = 'Material name is required');
                    return;
                  }

                  if (isEdit) {
                    context.read<ServicesBloc>().add(UpdateServiceMaterial(
                      id: material.id,
                      name: name,
                      category: category,
                      price: price,
                      image: imageBytes,
                    ));
                  } else {
                    context.read<ServicesBloc>().add(AddServiceMaterial(
                      name: name,
                      category: category,
                      price: price,
                      image: imageBytes,
                    ));
                  }

                  Navigator.pop(dialogCtx);
                },
                child: Text(isEdit ? 'Save Changes' : 'Add Material'),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _materialAvatar(BuildContext context, ServiceMaterial material) {
    return GestureDetector(
      onTap: material.image == null ? null : () => _viewMaterialImage(context, material),
      child: CircleAvatar(
        backgroundColor: Colors.blue.withValues(alpha: 0.1),
        backgroundImage: material.image != null ? MemoryImage(material.image!) : null,
        child: material.image == null
            ? const Icon(Icons.build_outlined, color: Colors.blue, size: 20)
            : null,
      ),
    );
  }

  void _viewMaterialImage(BuildContext context, ServiceMaterial material) {
    final bytes = material.image;
    if (bytes == null) return;
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(material.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                  ),
                  IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close)),
                ],
              ),
            ),
            Flexible(
              child: InteractiveViewer(
                child: Image.memory(bytes, fit: BoxFit.contain),
              ),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  void _confirmDelete(BuildContext context, ServiceMaterial material) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Material?'),
        content: Text('Are you sure you want to delete "${material.name}"? This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              context.read<ServicesBloc>().add(DeleteServiceMaterial(material.id));
              Navigator.pop(ctx);
            },
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}
