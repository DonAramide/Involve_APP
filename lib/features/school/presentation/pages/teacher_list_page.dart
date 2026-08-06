import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/features/school/presentation/bloc/school_bloc.dart';
import 'package:involve_app/features/school/presentation/bloc/school_state.dart';
import 'package:involve_app/features/school/presentation/pages/teacher_profile_page.dart';
import '../widgets/teacher_form_dialog.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

class TeacherListPage extends StatefulWidget {
  const TeacherListPage({super.key});

  @override
  State<TeacherListPage> createState() => _TeacherListPageState();
}

class _TeacherListPageState extends State<TeacherListPage> {
  @override
  void initState() {
    super.initState();
    context.read<SchoolBloc>().add(LoadSchoolData());
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Teachers'),
      ),
      body: BlocListener<SchoolBloc, SchoolState>(
        listener: (context, state) {
          if (state.error != null && state.error!.isNotEmpty) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.error!), backgroundColor: Colors.red),
            );
            context.read<SchoolBloc>().add(ResetSchoolStatus());
          }
        },
        child: BlocBuilder<SchoolBloc, SchoolState>(
          builder: (context, state) {
            if (state.isLoading && state.teachers.isEmpty) {
              return const InvifyLoadingIndicator(message: 'FETCHING TEACHERS DIRECTORY...');
            }

            if (state.teachers.isEmpty) {
              return const Center(
                child: Text('No teachers registered yet.\nTap + to add one.', textAlign: TextAlign.center),
              );
            }

            return ListView.builder(
              itemCount: state.teachers.length,
              padding: const EdgeInsets.all(8),
              itemBuilder: (context, index) {
                final teacher = state.teachers[index];
                final List<String> classNames = state.classes
                    .where((c) => teacher.classIds?.contains(c.id) == true || c.id == teacher.classId)
                    .map((c) => c.name)
                    .toList();
                final assignedClass = classNames.isNotEmpty ? classNames.join(', ') : 'No Class';
                final teacherSubjects = state.subjects
                    .where((s) => s.teacherId == teacher.id)
                    .map((s) => s.name)
                    .toList();
                final subjectsText = teacherSubjects.isNotEmpty
                    ? '  •  Subject: ${teacherSubjects.join(", ")}'
                    : '';

                return Card(
                  elevation: 2,
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundImage: teacher.image != null ? MemoryImage(teacher.image!) : null,
                      child: teacher.image == null ? const Icon(Icons.person) : null,
                    ),
                    title: Text(teacher.fullName, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('${teacher.profession ?? 'Staff'}  •  Class: $assignedClass$subjectsText'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => TeacherProfilePage(teacher: teacher),
                        ),
                      );
                    },
                  ),
                );
              },
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => TeacherFormDialog.show(context),
        child: const Icon(Icons.add),
      ),
    );
  }
}
