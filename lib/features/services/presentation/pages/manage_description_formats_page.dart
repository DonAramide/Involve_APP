import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/service_description_format.dart';
import '../../domain/repositories/services_repository.dart';

class ManageDescriptionFormatsPage extends StatefulWidget {
  const ManageDescriptionFormatsPage({super.key});

  @override
  State<ManageDescriptionFormatsPage> createState() =>
      _ManageDescriptionFormatsPageState();
}

class _ManageDescriptionFormatsPageState
    extends State<ManageDescriptionFormatsPage> {
  final _categoryController = TextEditingController();
  List<ServiceDescriptionFormatBundle> _bundles = [];
  bool _loading = true;

  IServicesRepository get _repo => context.read<IServicesRepository>();

  @override
  void initState() {
    super.initState();
    _reload();
  }

  @override
  void dispose() {
    _categoryController.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    setState(() => _loading = true);
    try {
      final bundles = await _repo.getDescriptionFormatBundles();
      if (!mounted) return;
      setState(() {
        _bundles = bundles;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not load description formats: $e')),
      );
    }
  }

  Future<void> _addCategory() async {
    final text = _categoryController.text.trim();
    if (text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a category name.')),
      );
      return;
    }
    try {
      await _repo.addDescriptionFormatCategory(text);
      _categoryController.clear();
      FocusScope.of(context).unfocus();
      await _reload();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Description Format')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Create categories, then add fields such as text inputs and checkboxes. Those fields appear as a table when creating a job.',
                  style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _categoryController,
                        decoration: const InputDecoration(
                          labelText: 'New category (e.g. Hotel Check-in)',
                          border: OutlineInputBorder(),
                        ),
                        onSubmitted: (_) => _addCategory(),
                      ),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton(
                      onPressed: _addCategory,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                            vertical: 16, horizontal: 24),
                      ),
                      child: const Text('ADD'),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _bundles.isEmpty
                    ? const Center(
                        child: Text('No description format categories yet.'),
                      )
                    : ListView.separated(
                        itemCount: _bundles.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final bundle = _bundles[index];
                          final count = bundle.fields.length;
                          return ListTile(
                            leading: const CircleAvatar(
                              child: Icon(Icons.table_chart_outlined),
                            ),
                            title: Text(bundle.category.name),
                            subtitle: Text(
                              count == 0
                                  ? 'No fields yet — tap to add'
                                  : '$count field${count == 1 ? '' : 's'}',
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.edit_outlined,
                                      color: Colors.blue),
                                  onPressed: () =>
                                      _editCategory(bundle.category),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline,
                                      color: Colors.red),
                                  onPressed: () =>
                                      _confirmDeleteCategory(bundle.category),
                                ),
                                const Icon(Icons.chevron_right),
                              ],
                            ),
                            onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => ManageDescriptionFormatFieldsPage(
                                    category: bundle.category,
                                  ),
                                ),
                              );
                              await _reload();
                            },
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  void _editCategory(ServiceDescriptionFormatCategory category) {
    final editController = TextEditingController(text: category.name);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Edit Category'),
        content: TextField(
          controller: editController,
          decoration: const InputDecoration(labelText: 'Category Name'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              try {
                await _repo.updateDescriptionFormatCategory(
                  id: category.id,
                  name: editController.text,
                );
                if (ctx.mounted) Navigator.pop(ctx);
                await _reload();
              } catch (e) {
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
                );
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteCategory(ServiceDescriptionFormatCategory category) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Category?'),
        content: Text(
          'Delete "${category.name}" and all of its description fields?',
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('CANCEL')),
          TextButton(
            onPressed: () async {
              await _repo.deleteDescriptionFormatCategory(category.id);
              if (ctx.mounted) Navigator.pop(ctx);
              await _reload();
            },
            child: const Text('DELETE', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}

class ManageDescriptionFormatFieldsPage extends StatefulWidget {
  final ServiceDescriptionFormatCategory category;

  const ManageDescriptionFormatFieldsPage({
    super.key,
    required this.category,
  });

  @override
  State<ManageDescriptionFormatFieldsPage> createState() =>
      _ManageDescriptionFormatFieldsPageState();
}

class _ManageDescriptionFormatFieldsPageState
    extends State<ManageDescriptionFormatFieldsPage> {
  List<ServiceDescriptionFormatField> _fields = [];
  bool _loading = true;

  IServicesRepository get _repo => context.read<IServicesRepository>();

  @override
  void initState() {
    super.initState();
    _reload();
  }

  Future<void> _reload() async {
    setState(() => _loading = true);
    try {
      final fields =
          await _repo.getDescriptionFormatFields(widget.category.id);
      if (!mounted) return;
      setState(() {
        _fields = fields;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not load fields: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.category.name)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showFieldDialog(),
        icon: const Icon(Icons.add),
        label: const Text('Add Field'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _fields.isEmpty
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      'No fields in this category yet.\nTap Add Field to create a text input or checkbox.',
                      textAlign: TextAlign.center,
                    ),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(8, 8, 8, 88),
                  itemCount: _fields.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final field = _fields[index];
                    return ListTile(
                      leading: Icon(
                        field.isCheckbox
                            ? Icons.check_box_outlined
                            : field.isNumber
                                ? Icons.pin_outlined
                                : Icons.short_text,
                      ),
                      title: Text(field.name),
                      subtitle: Text(DescriptionFieldType.labelOf(field.fieldType)),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.edit_outlined, color: Colors.blue),
                            onPressed: () => _showFieldDialog(field: field),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, color: Colors.red),
                            onPressed: () => _confirmDeleteField(field),
                          ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }

  Future<void> _showFieldDialog({ServiceDescriptionFormatField? field}) async {
    final nameController = TextEditingController(text: field?.name ?? '');
    var type = field?.fieldType ?? DescriptionFieldType.text;
    if (!DescriptionFieldType.isValid(type)) {
      type = DescriptionFieldType.text;
    }

    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text(field == null ? 'Add Field' : 'Edit Field'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Format name',
                  hintText: 'e.g. Extra towels, Guest notes',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Input type',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Colors.grey.shade800,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              ...DescriptionFieldType.labels.entries.map(
                (e) => RadioListTile<String>(
                  contentPadding: EdgeInsets.zero,
                  dense: true,
                  title: Text(e.value),
                  value: e.key,
                  groupValue: type,
                  onChanged: (val) {
                    if (val != null) setDialogState(() => type = val);
                  },
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('CANCEL'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('SAVE'),
            ),
          ],
        ),
      ),
    );

    if (saved != true || !mounted) return;
    try {
      if (field == null) {
        await _repo.addDescriptionFormatField(
          categoryId: widget.category.id,
          name: nameController.text,
          fieldType: type,
        );
      } else {
        await _repo.updateDescriptionFormatField(
          id: field.id,
          name: nameController.text,
          fieldType: type,
        );
      }
      await _reload();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
      );
    }
  }

  void _confirmDeleteField(ServiceDescriptionFormatField field) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Field?'),
        content: Text('Remove "${field.name}" from ${widget.category.name}?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('CANCEL')),
          TextButton(
            onPressed: () async {
              await _repo.deleteDescriptionFormatField(field.id);
              if (ctx.mounted) Navigator.pop(ctx);
              await _reload();
            },
            child: const Text('DELETE', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}
