import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/school_bloc.dart';
import '../bloc/school_state.dart';
import '../../domain/entities/school_entities.dart';
import '../../domain/entities/grading_rule.dart';
import 'manage_grading_rules_page.dart';

class SchoolSetupPage extends StatelessWidget {
  const SchoolSetupPage({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Academic Setup'),
          actions: [
            IconButton(
              icon: const Icon(Icons.rule),
              tooltip: 'Grading Rules',
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ManageGradingRulesPage()),
                );
              },
            ),
          ],
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Years', icon: Icon(Icons.calendar_today)),
              Tab(text: 'Terms', icon: Icon(Icons.segment)),
              Tab(text: 'Classes', icon: Icon(Icons.class_)),
            ],
          ),
        ),
        body: BlocListener<SchoolBloc, SchoolState>(
          listener: (context, state) {
            if (state.error != null) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.error!),
                  backgroundColor: Colors.red,
                ),
              );
            }
          },
          child: BlocBuilder<SchoolBloc, SchoolState>(
            builder: (context, state) {
              if (state.isLoading) return const Center(child: CircularProgressIndicator());
              
              return TabBarView(
                children: [
                  _YearsTab(state: state),
                  _TermsTab(state: state),
                  _ClassesTab(state: state),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _YearsTab extends StatelessWidget {
  final SchoolState state;
  const _YearsTab({required this.state});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddYearDialog(context),
        child: const Icon(Icons.add),
      ),
      body: ListView.builder(
        itemCount: state.academicYears.length,
        itemBuilder: (context, index) {
          final year = state.academicYears[index];
          return ListTile(
            title: Text(year.name, style: const TextStyle(fontWeight: FontWeight.bold)),
            trailing: year.isActive 
              ? const Icon(Icons.check_circle, color: Colors.green)
              : ElevatedButton(
                  onPressed: () => context.read<SchoolBloc>().add(SetActiveYearEvent(year.id!)),
                  child: const Text('Set Active'),
                ),
          );
        },
      ),
    );
  }

  void _showAddYearDialog(BuildContext context) {
    final controller = TextEditingController();
    context.read<SchoolBloc>().add(ResetSchoolStatus());
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => BlocListener<SchoolBloc, SchoolState>(
        listenWhen: (previous, current) => previous.status != current.status,
        listener: (context, state) {
          if (state.status == SchoolStatus.success) {
            Navigator.of(ctx).pop();
          }
        },
        child: AlertDialog(
          title: const Text('Add Academic Year'),
          content: TextField(
            controller: controller,
            decoration: const InputDecoration(hintText: 'e.g. 2023/2024'),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                if (controller.text.isNotEmpty) {
                  context.read<SchoolBloc>().add(AddAcademicYearEvent(
                    name: controller.text,
                    startDate: DateTime.now(),
                    endDate: DateTime.now().add(const Duration(days: 365)),
                  ));
                }
              },
              child: BlocBuilder<SchoolBloc, SchoolState>(
                builder: (context, state) {
                  if (state.isLoading && state.status == SchoolStatus.loading) {
                    return const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    );
                  }
                  return const Text('Add');
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TermsTab extends StatelessWidget {
  final SchoolState state;
  const _TermsTab({required this.state});

  @override
  Widget build(BuildContext context) {
    final activeYear = state.activeYear;
    if (activeYear == null) {
      return const Center(child: Text('Please add an Academic Year first.'));
    }

    return Scaffold(
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddTermDialog(context, activeYear.id!),
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Text('Terms for ${activeYear.name}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: state.terms.length,
              itemBuilder: (context, index) {
                final term = state.terms[index];
                return ListTile(
                  title: Text(term.name),
                  trailing: term.isActive
                    ? const Icon(Icons.check_circle, color: Colors.green)
                    : ElevatedButton(
                        onPressed: () => context.read<SchoolBloc>().add(SetActiveTermEvent(term.id!)),
                        child: const Text('Set Active'),
                      ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _showAddTermDialog(BuildContext context, int yearId) {
    final controller = TextEditingController();
    context.read<SchoolBloc>().add(ResetSchoolStatus());
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => BlocListener<SchoolBloc, SchoolState>(
        listenWhen: (previous, current) => previous.status != current.status,
        listener: (context, state) {
          if (state.status == SchoolStatus.success) {
            Navigator.of(ctx).pop();
          }
        },
        child: AlertDialog(
          title: const Text('Add Term'),
          content: TextField(
            controller: controller,
            decoration: const InputDecoration(hintText: 'e.g. First Term'),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                if (controller.text.isNotEmpty) {
                  context.read<SchoolBloc>().add(AddTermEvent(
                    academicYearId: yearId, 
                    name: controller.text,
                    startDate: DateTime.now(),
                    endDate: DateTime.now().add(const Duration(days: 90)),
                  ));
                }
              },
              child: BlocBuilder<SchoolBloc, SchoolState>(
                builder: (context, state) {
                  if (state.isLoading && state.status == SchoolStatus.loading) {
                    return const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    );
                  }
                  return const Text('Add');
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ClassesTab extends StatelessWidget {
  final SchoolState state;
  const _ClassesTab({required this.state});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddClassDialog(context),
        child: const Icon(Icons.add),
      ),
      body: ListView.builder(
        itemCount: state.classes.length,
        itemBuilder: (context, index) {
          final sClass = state.classes[index];
          return ListTile(
            title: Text(sClass.name, style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: sClass.description != null ? Text(sClass.description!) : null,
            trailing: IconButton(
              icon: const Icon(Icons.delete_outline, color: Colors.red),
              onPressed: () => context.read<SchoolBloc>().add(DeleteClassEvent(sClass.id!)),
            ),
          );
        },
      ),
    );
  }

  void _showAddClassDialog(BuildContext context) {
    final nameController = TextEditingController();
    final descController = TextEditingController();
    context.read<SchoolBloc>().add(ResetSchoolStatus());
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => BlocListener<SchoolBloc, SchoolState>(
        listenWhen: (previous, current) => previous.status != current.status,
        listener: (context, state) {
          if (state.status == SchoolStatus.success) {
            Navigator.of(ctx).pop();
          }
        },
        child: AlertDialog(
          title: const Text('Add Class'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameController, decoration: const InputDecoration(labelText: 'Class Name')),
              TextField(controller: descController, decoration: const InputDecoration(labelText: 'Description (Optional)')),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                if (nameController.text.isNotEmpty) {
                  context.read<SchoolBloc>().add(AddClassEvent(nameController.text, description: descController.text));
                }
              },
              child: BlocBuilder<SchoolBloc, SchoolState>(
                builder: (context, state) {
                  if (state.isLoading && state.status == SchoolStatus.loading) {
                    return const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    );
                  }
                  return const Text('Add');
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
