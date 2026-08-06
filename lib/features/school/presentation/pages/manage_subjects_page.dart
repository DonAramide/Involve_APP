import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/features/school/presentation/bloc/school_bloc.dart';
import 'package:involve_app/features/school/presentation/bloc/school_state.dart';
import 'package:involve_app/features/school/domain/entities/school_entities.dart';
import 'package:collection/collection.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:involve_app/features/settings/presentation/widgets/super_admin_password_dialog.dart';

class ManageSubjectsPage extends StatefulWidget {
  const ManageSubjectsPage({super.key});

  @override
  State<ManageSubjectsPage> createState() => _ManageSubjectsPageState();
}

class _ManageSubjectsPageState extends State<ManageSubjectsPage> {
  @override
  void initState() {
    super.initState();
    context.read<SchoolBloc>().add(LoadSubjectsEvent());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Subjects'),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showSubjectDialog(context),
        child: const Icon(Icons.add),
      ),
      body: BlocConsumer<SchoolBloc, SchoolState>(
        listener: (context, state) {
          if (state.error != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.error!), backgroundColor: Colors.red),
            );
            context.read<SchoolBloc>().add(ResetSchoolStatus());
          }
        },
        builder: (context, state) {
          if (state.isLoading && state.subjects.isEmpty) {
            return const InvifyLoadingIndicator(message: 'FETCHING ACADEMIC SUBJECTS...');
          }

          if (state.subjects.isEmpty) {
            return const Center(child: Text('No subjects defined yet.'));
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: state.subjects.length,
            itemBuilder: (context, index) {
              final subject = state.subjects[index];
              final teacher = state.teachers.firstWhereOrNull((t) => t.id == subject.teacherId);
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  title: Text(subject.name),
                  subtitle: subject.code != null 
                    ? Text('Code: ${subject.code}${teacher != null ? ' • Teacher: ${teacher.fullName}' : ''}') 
                    : teacher != null ? Text('Teacher: ${teacher.fullName}') : null,
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit_outlined),
                        onPressed: () => _showSubjectDialog(context, subject: subject),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, color: Colors.red),
                        onPressed: () => _confirmDeleteSubject(context, subject),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  void _showSubjectDialog(BuildContext context, {Subject? subject}) {
    final nameController = TextEditingController(text: subject?.name);
    final codeController = TextEditingController(text: subject?.code);
    int? selectedTeacherId = subject?.teacherId;

    showDialog(
      context: context,
      builder: (ctx) => BlocListener<SchoolBloc, SchoolState>(
        listenWhen: (previous, current) => previous.status != current.status,
        listener: (context, state) {
          if (state.status == SchoolStatus.success) {
            Navigator.pop(ctx);
            context.read<SchoolBloc>().add(ResetSchoolStatus());
          }
        },
        child: AlertDialog(
          title: Text(subject == null ? 'Add Subject' : 'Edit Subject'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Subject Name (e.g. Mathematics)'),
                autofocus: true,
              ),
              TextField(
                controller: codeController,
                decoration: const InputDecoration(labelText: 'Subject Code (Optional)'),
              ),
              const SizedBox(height: 16),
              BlocBuilder<SchoolBloc, SchoolState>(
                builder: (context, state) {
                  return DropdownButtonFormField<int>(
                    value: selectedTeacherId,
                    decoration: const InputDecoration(labelText: 'Assign Teacher', border: OutlineInputBorder()),
                    items: [
                      const DropdownMenuItem<int>(value: null, child: Text('None')),
                      ...state.teachers.map((t) => DropdownMenuItem(value: t.id, child: Text(t.fullName))),
                    ],
                    onChanged: (v) => selectedTeacherId = v,
                  );
                },
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
            ElevatedButton(
              onPressed: () {
                if (nameController.text.isNotEmpty) {
                  if (subject == null) {
                    context.read<SchoolBloc>().add(AddSubjectEvent(
                      name: nameController.text,
                      code: codeController.text.isNotEmpty ? codeController.text : null,
                      teacherId: selectedTeacherId,
                    ));
                  } else {
                    context.read<SchoolBloc>().add(UpdateSubjectEvent(
                      subject.copyWith(
                        name: nameController.text,
                        code: codeController.text.isNotEmpty ? codeController.text : null,
                        teacherId: selectedTeacherId,
                      ),
                    ));
                  }
                }
              },
              child: BlocBuilder<SchoolBloc, SchoolState>(
                builder: (context, state) {
                  if (state.isLoading && state.status == SchoolStatus.loading) {
                    return const Text('SAVING...', style: TextStyle(fontWeight: FontWeight.bold));
                  }
                  return Text(subject == null ? 'ADD' : 'SAVE');
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmDeleteSubject(BuildContext context, Subject subject) async {
    final settingsBloc = context.read<SettingsBloc>();
    settingsBloc.add(ResetSuperAdminAuth());

    final authorized = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => SuperAdminPasswordDialog(bloc: settingsBloc),
    );

    if (authorized == true) {
      if (!context.mounted) return;
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Delete Subject?'),
          content: Text('Are you sure you want to delete ${subject.name}? This might affect existing results.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
            TextButton(
              onPressed: () {
                context.read<SchoolBloc>().add(DeleteSubjectEvent(subject.id!));
                Navigator.pop(ctx);
              },
              child: const Text('DELETE', style: TextStyle(color: Colors.red)),
            ),
          ],
        ),
      );
    }
  }
}
