import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/services_bloc.dart';
import '../bloc/services_event.dart';
import '../bloc/services_state.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';

class ManageLaborPage extends StatefulWidget {
  const ManageLaborPage({super.key});

  @override
  State<ManageLaborPage> createState() => _ManageLaborPageState();
}

class _ManageLaborPageState extends State<ManageLaborPage> {
  final _nameController = TextEditingController();
  final _amountController = TextEditingController();

  @override
  void initState() {
    super.initState();
    context.read<ServicesBloc>().add(const LoadLaborPresets());
  }

  @override
  void dispose() {
    _nameController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  void _addPreset() {
    final name = _nameController.text;
    final amount = double.tryParse(_amountController.text) ?? 0.0;
    
    if (name.isNotEmpty && amount > 0) {
      context.read<ServicesBloc>().add(AddLaborPreset(name: name, amount: amount));
      _nameController.clear();
      _amountController.clear();
      FocusScope.of(context).unfocus();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Labor Settings'),
      ),
      body: BlocBuilder<ServicesBloc, ServicesState>(
        builder: (context, state) {
          final presets = state.laborPresets;

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    TextField(
                      controller: _nameController,
                      decoration: const InputDecoration(
                        labelText: 'Preset Name (e.g. Standard Labor)',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _amountController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Amount',
                              prefixText: '₦ ',
                              border: OutlineInputBorder(),
                            ),
                            onSubmitted: (_) => _addPreset(),
                          ),
                        ),
                        const SizedBox(width: 12),
                        ElevatedButton(
                          onPressed: _addPreset,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 24),
                          ),
                          child: const Text('ADD'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const Divider(),
              Expanded(
                child: presets.isEmpty
                    ? const Center(child: Text('No labor presets added yet.'))
                    : ListView.builder(
                        itemCount: presets.length,
                        itemBuilder: (context, index) {
                          final preset = presets[index];
                          return ListTile(
                            leading: const CircleAvatar(
                              child: Icon(Icons.engineering),
                            ),
                            title: Text(preset.name),
                            subtitle: Text(CurrencyFormatter.formatWithSymbol(preset.amount)),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.edit_outlined, color: Colors.blue),
                                  onPressed: () => _editPreset(preset),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, color: Colors.red),
                                  onPressed: () => _confirmDelete(context, preset),
                                ),
                              ],
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

  void _editPreset(dynamic preset) {
    final nameCtrl = TextEditingController(text: preset.name);
    final amountCtrl = TextEditingController(text: preset.amount.toString());
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit Labor Preset'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Name')),
            TextField(
              controller: amountCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Amount', prefixText: '₦ '),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              final name = nameCtrl.text;
              final amount = double.tryParse(amountCtrl.text) ?? 0.0;
              if (name.isNotEmpty) {
                context.read<ServicesBloc>().add(UpdateLaborPreset(
                  id: preset.id,
                  name: name,
                  amount: amount,
                ));
                Navigator.pop(context);
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context, dynamic preset) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Preset?'),
        content: Text('Are you sure you want to delete "${preset.name}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          TextButton(
            onPressed: () {
              context.read<ServicesBloc>().add(DeleteLaborPreset(preset.id));
              Navigator.pop(ctx);
            },
            child: const Text('DELETE', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}
