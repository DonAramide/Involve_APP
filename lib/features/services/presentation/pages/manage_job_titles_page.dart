import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/services_bloc.dart';
import '../bloc/services_event.dart';
import '../bloc/services_state.dart';

class ManageJobTitlesPage extends StatefulWidget {
  const ManageJobTitlesPage({super.key});

  @override
  State<ManageJobTitlesPage> createState() => _ManageJobTitlesPageState();
}

class _ManageJobTitlesPageState extends State<ManageJobTitlesPage> {
  final _titleController = TextEditingController();
  final _searchController = TextEditingController();
  String _searchQuery = '';

  static const List<String> _commonSuggestions = [
    'Consultation',
    'General Inspection',
    'Diagnostics',
    'Maintenance & Servicing',
    'Standard Repair',
    'Installation & Setup',
    'Custom Order / Tailoring',
    'Deep Cleaning',
    'Emergency Callout',
    'Routine Checkup',
  ];

  @override
  void initState() {
    super.initState();
    context.read<ServicesBloc>().add(const LoadServicePresets());
  }

  @override
  void dispose() {
    _titleController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _addTitle([String? text]) {
    final title = (text ?? _titleController.text).trim();
    if (title.isEmpty) {
      _promptForJobType();
      return;
    }
    context.read<ServicesBloc>().add(AddServicePreset(title));
    _titleController.clear();
    FocusScope.of(context).unfocus();
  }

  Future<void> _promptForJobType() async {
    final inputCtrl = TextEditingController();
    String? errorText;

    final entered = await showDialog<String>(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            return AlertDialog(
              title: const Text('Enter Job Type'),
              content: TextField(
                controller: inputCtrl,
                autofocus: true,
                textCapitalization: TextCapitalization.words,
                decoration: InputDecoration(
                  labelText: 'Service Offering / Job Type',
                  hintText: 'e.g. Consultation, Repair, Maintenance',
                  errorText: errorText,
                  border: const OutlineInputBorder(),
                  prefixIcon: const Icon(Icons.design_services_outlined),
                ),
                onChanged: (_) {
                  if (errorText != null) setDialogState(() => errorText = null);
                },
                onSubmitted: (value) {
                  final title = value.trim();
                  if (title.isEmpty) {
                    setDialogState(() => errorText = 'Please enter a job type');
                    return;
                  }
                  Navigator.pop(ctx, title);
                },
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () {
                    final title = inputCtrl.text.trim();
                    if (title.isEmpty) {
                      setDialogState(() => errorText = 'Please enter a job type');
                      return;
                    }
                    Navigator.pop(ctx, title);
                  },
                  child: const Text('Add'),
                ),
              ],
            );
          },
        );
      },
    );

    inputCtrl.dispose();
    if (entered == null || entered.isEmpty || !mounted) return;
    _addTitle(entered);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Service Offerings & Presets'),
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
          final allPresets = state.presets;
          final filteredPresets = allPresets.where((p) {
            if (_searchQuery.isEmpty) return true;
            return p.toLowerCase().contains(_searchQuery.toLowerCase());
          }).toList();

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Add Input Card
              Container(
                padding: const EdgeInsets.all(16.0),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardColor,
                  border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _titleController,
                            decoration: const InputDecoration(
                              labelText: 'New Service Offering / Job Type',
                              hintText: 'e.g. Consultation, Repair, Maintenance',
                              border: OutlineInputBorder(),
                              prefixIcon: Icon(Icons.design_services_outlined),
                            ),
                            textCapitalization: TextCapitalization.words,
                            onSubmitted: (_) => _addTitle(),
                          ),
                        ),
                        const SizedBox(width: 12),
                        ElevatedButton(
                          onPressed: () => _addTitle(),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Theme.of(context).primaryColor,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 20),
                          ),
                          child: const Text('ADD'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    // Suggestion Chips
                    const Text(
                      'Popular Service Suggestions:',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey),
                    ),
                    const SizedBox(height: 6),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: _commonSuggestions
                            .where((s) => !allPresets.contains(s))
                            .take(6)
                            .map((s) => Padding(
                                  padding: const EdgeInsets.only(right: 6),
                                  child: ActionChip(
                                    avatar: const Icon(Icons.add, size: 14),
                                    label: Text(s, style: const TextStyle(fontSize: 12)),
                                    onPressed: () => _addTitle(s),
                                  ),
                                ))
                            .toList(),
                      ),
                    ),
                  ],
                ),
              ),

              if (allPresets.length > 5)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Search service presets...',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      isDense: true,
                      filled: true,
                      fillColor: Colors.grey.shade50,
                    ),
                    onChanged: (v) => setState(() => _searchQuery = v.trim()),
                  ),
                ),

              Expanded(
                child: allPresets.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.miscellaneous_services_outlined, size: 64, color: Colors.grey),
                              const SizedBox(height: 16),
                              const Text(
                                'No service offerings added yet',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                'Add common jobs or services so they can be picked with 1-click when creating new customer orders.',
                                textAlign: TextAlign.center,
                                style: TextStyle(color: Colors.grey),
                              ),
                              const SizedBox(height: 16),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                alignment: WrapAlignment.center,
                                children: _commonSuggestions.take(4).map((s) => ElevatedButton.icon(
                                  onPressed: () => _addTitle(s),
                                  icon: const Icon(Icons.add, size: 16),
                                  label: Text(s),
                                )).toList(),
                              ),
                            ],
                          ),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: filteredPresets.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 6),
                        itemBuilder: (context, index) {
                          final title = filteredPresets[index];
                          return Card(
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: Theme.of(context).primaryColor.withValues(alpha: 0.1),
                                child: Icon(Icons.build_circle_outlined, color: Theme.of(context).primaryColor, size: 20),
                              ),
                              title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                              trailing: IconButton(
                                icon: const Icon(Icons.delete_outline, color: Colors.red),
                                tooltip: 'Delete Preset',
                                onPressed: () => _confirmDelete(context, title),
                              ),
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

  void _confirmDelete(BuildContext context, String title) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Service Offering?'),
        content: Text('Are you sure you want to remove "$title" from presets?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          TextButton(
            onPressed: () {
              context.read<ServicesBloc>().add(DeleteServicePreset(title));
              Navigator.pop(ctx);
            },
            child: const Text('DELETE', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}
