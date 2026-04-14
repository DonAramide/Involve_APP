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

  @override
  void initState() {
    super.initState();
    context.read<ServicesBloc>().add(const LoadServicePresets());
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  void _addTitle() {
    if (_titleController.text.isNotEmpty) {
      context.read<ServicesBloc>().add(AddServicePreset(_titleController.text));
      _titleController.clear();
      FocusScope.of(context).unfocus();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Manage Job Types'),
      ),
      body: BlocBuilder<ServicesBloc, ServicesState>(
        builder: (context, state) {
          final presets = state.presets;

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _titleController,
                        decoration: const InputDecoration(
                          labelText: 'New Job Type (e.g. Repairs, Consultation)',
                          border: OutlineInputBorder(),
                        ),
                        onSubmitted: (_) => _addTitle(),
                      ),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton(
                      onPressed: _addTitle,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).primaryColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
                      ),
                      child: const Text('ADD'),
                    ),
                  ],
                ),
              ),
              const Divider(),
              Expanded(
                child: presets.isEmpty
                    ? const Center(child: Text('No custom titles added yet.'))
                    : ListView.builder(
                        itemCount: presets.length,
                        itemBuilder: (context, index) {
                          final title = presets[index];
                          return ListTile(
                            leading: const Icon(Icons.style),
                            title: Text(title),
                            trailing: IconButton(
                              icon: const Icon(Icons.delete, color: Colors.red),
                              onPressed: () => _confirmDelete(context, title),
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
        title: const Text('Delete Title?'),
        content: Text('Are you sure you want to delete "$title"?'),
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
