import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/school_bloc.dart';
import '../bloc/school_state.dart';
import '../../domain/entities/grading_rule.dart';

class ManageGradingRulesPage extends StatefulWidget {
  const ManageGradingRulesPage({super.key});

  @override
  State<ManageGradingRulesPage> createState() => _ManageGradingRulesPageState();
}

class _ManageGradingRulesPageState extends State<ManageGradingRulesPage> {
  @override
  void initState() {
    super.initState();
    context.read<SchoolBloc>().add(LoadGradingRules());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Manage Grading Rules'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => context.read<SchoolBloc>().add(LoadGradingRules()),
          ),
        ],
      ),
      body: BlocConsumer<SchoolBloc, SchoolState>(
        listener: (context, state) {
          if (state.error != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.error!), backgroundColor: Colors.red),
            );
          }
        },
        builder: (context, state) {
          if (state.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state.gradingRules.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('No grading rules found.'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => _showRuleDialog(context),
                    child: const Text('Add Rule'),
                  ),
                ],
              ),
            );
          }

          final sortedRules = List<GradingRule>.from(state.gradingRules)
            ..sort((a, b) => b.minScore.compareTo(a.minScore));

          return ListView.builder(
            itemCount: sortedRules.length,
            itemBuilder: (context, index) {
              final rule = sortedRules[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    child: Text(rule.grade),
                  ),
                  title: Text('${rule.minScore.toStringAsFixed(0)} - ${rule.maxScore.toStringAsFixed(0)}'),
                  subtitle: rule.remarks != null ? Text(rule.remarks!) : null,
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit, color: Colors.blue),
                        onPressed: () => _showRuleDialog(context, rule: rule),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete, color: Colors.red),
                        onPressed: () => _confirmDelete(context, rule),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showRuleDialog(context),
        child: const Icon(Icons.add),
      ),
    );
  }

  void _showRuleDialog(BuildContext context, {GradingRule? rule}) {
    final gradeController = TextEditingController(text: rule?.grade);
    final minController = TextEditingController(text: rule?.minScore.toString());
    final maxController = TextEditingController(text: rule?.maxScore.toString());
    final remarksController = TextEditingController(text: rule?.remarks);
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(rule == null ? 'Add Grading Rule' : 'Edit Grading Rule'),
        content: Form(
          key: formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: gradeController,
                  decoration: const InputDecoration(labelText: 'Grade (e.g., A1)'),
                  validator: (val) => val == null || val.isEmpty ? 'Required' : null,
                  textCapitalization: TextCapitalization.characters,
                ),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: minController,
                        decoration: const InputDecoration(labelText: 'Min Score'),
                        keyboardType: TextInputType.number,
                        validator: (val) => double.tryParse(val ?? '') == null ? 'Invalid' : null,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: TextFormField(
                        controller: maxController,
                        decoration: const InputDecoration(labelText: 'Max Score'),
                        keyboardType: TextInputType.number,
                        validator: (val) => double.tryParse(val ?? '') == null ? 'Invalid' : null,
                      ),
                    ),
                  ],
                ),
                TextFormField(
                  controller: remarksController,
                  decoration: const InputDecoration(labelText: 'Remarks (e.g., Excellent)'),
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          ElevatedButton(
            onPressed: () {
              if (formKey.currentState!.validate()) {
                final newRule = GradingRule(
                  id: rule?.id,
                  grade: gradeController.text,
                  minScore: double.parse(minController.text),
                  maxScore: double.parse(maxController.text),
                  remarks: remarksController.text.isEmpty ? null : remarksController.text,
                );
                
                if (rule == null) {
                  context.read<SchoolBloc>().add(AddGradingRuleEvent(newRule));
                } else {
                  context.read<SchoolBloc>().add(UpdateGradingRuleEvent(newRule));
                }
                Navigator.pop(ctx);
              }
            },
            child: const Text('SAVE'),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context, GradingRule rule) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirm Delete'),
        content: Text('Delete grading rule for ${rule.grade}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          TextButton(
            onPressed: () {
              context.read<SchoolBloc>().add(DeleteGradingRuleEvent(rule.id!));
              Navigator.pop(ctx);
            },
            child: const Text('DELETE', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}
