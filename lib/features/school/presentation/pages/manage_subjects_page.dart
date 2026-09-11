import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/features/school/presentation/bloc/school_bloc.dart';
import 'package:involve_app/features/school/presentation/bloc/school_state.dart';
import 'package:involve_app/features/school/domain/entities/school_entities.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
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
            showFriendlyErrorSnackBar(context, state.error);
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
              final teacherNames = state.teachers
                  .where((t) => subject.isTaughtBy(t.id))
                  .map((t) => t.fullName)
                  .join(', ');
              final classNames = (subject.classIds == null || subject.classIds!.isEmpty)
                  ? 'All classes'
                  : state.classes
                      .where((c) => subject.classIds!.contains(c.id))
                      .map((c) => c.name)
                      .join(', ');
              final details = [
                if (subject.code != null && subject.code!.isNotEmpty) 'Code: ${subject.code}',
                if (teacherNames.isNotEmpty) 'Teachers: $teacherNames',
                'Classes: $classNames',
              ].join(' • ');
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  title: Text(subject.name),
                  subtitle: Text(details),
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
    final selectedTeacherIds = <int>{
      ...?subject?.assignedTeacherIds,
    };
    final selectedClassIds = <int>{
      ...?subject?.classIds,
    };

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
        child: StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text(subject == null ? 'Add Subject' : 'Edit Subject'),
              content: SizedBox(
                width: 420,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
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
                          final classes = [...state.classes]
                            ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
                          final teachers = [...state.teachers]
                            ..sort((a, b) => a.fullName.toLowerCase().compareTo(b.fullName.toLowerCase()));
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Teachers who offer this subject',
                                style: TextStyle(fontWeight: FontWeight.w700),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                selectedTeacherIds.isEmpty
                                    ? 'None selected'
                                    : '${selectedTeacherIds.length} teacher${selectedTeacherIds.length == 1 ? '' : 's'} selected',
                                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                              ),
                              const SizedBox(height: 8),
                              if (teachers.isEmpty)
                                const Text('Add teachers first, then assign them here.')
                              else
                                ...teachers.map((t) {
                                  final checked = selectedTeacherIds.contains(t.id);
                                  return CheckboxListTile(
                                    dense: true,
                                    contentPadding: EdgeInsets.zero,
                                    title: Text(t.fullName),
                                    subtitle: t.profession == null || t.profession!.isEmpty
                                        ? null
                                        : Text(t.profession!),
                                    value: checked,
                                    onChanged: (val) {
                                      setDialogState(() {
                                        if (val == true) {
                                          selectedTeacherIds.add(t.id!);
                                        } else {
                                          selectedTeacherIds.remove(t.id);
                                        }
                                      });
                                    },
                                  );
                                }),
                              const SizedBox(height: 16),
                              const Text(
                                'Classes that take this subject',
                                style: TextStyle(fontWeight: FontWeight.w700),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                selectedClassIds.isEmpty
                                    ? 'None selected — offered to all classes'
                                    : '${selectedClassIds.length} class${selectedClassIds.length == 1 ? '' : 'es'} selected',
                                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                              ),
                              const SizedBox(height: 8),
                              if (classes.isEmpty)
                                const Text('Add classes in Academic Setup first.')
                              else
                                ...classes.map((c) {
                                  final checked = selectedClassIds.contains(c.id);
                                  return CheckboxListTile(
                                    dense: true,
                                    contentPadding: EdgeInsets.zero,
                                    title: Text(c.name),
                                    value: checked,
                                    onChanged: (val) {
                                      setDialogState(() {
                                        if (val == true) {
                                          selectedClassIds.add(c.id!);
                                        } else {
                                          selectedClassIds.remove(c.id);
                                        }
                                      });
                                    },
                                  );
                                }),
                            ],
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
                ElevatedButton(
                  onPressed: () {
                    if (nameController.text.isEmpty) return;
                    final classIds = selectedClassIds.toList()..sort();
                    final teacherIds = selectedTeacherIds.toList()..sort();
                    if (subject == null) {
                      context.read<SchoolBloc>().add(AddSubjectEvent(
                        name: nameController.text,
                        code: codeController.text.isNotEmpty ? codeController.text : null,
                        teacherId: teacherIds.isEmpty ? null : teacherIds.first,
                        teacherIds: teacherIds,
                        classIds: classIds,
                      ));
                    } else {
                      context.read<SchoolBloc>().add(UpdateSubjectEvent(
                        subject.copyWith(
                          name: nameController.text,
                          code: codeController.text.isNotEmpty ? codeController.text : null,
                          teacherIds: teacherIds,
                          classIds: classIds,
                        ),
                      ));
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
            );
          },
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
