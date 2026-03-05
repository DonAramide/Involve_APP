import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/school_bloc.dart';
import '../bloc/school_state.dart';
import '../../domain/entities/school_entities.dart';
import 'teacher_profile_page.dart';
import 'dart:typed_data';
import 'package:image_picker/image_picker.dart';

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

  void _showTeacherDialog([Teacher? teacher]) {
    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController(text: teacher?.fullName);
    final phoneCtrl = TextEditingController(text: teacher?.phone);
    final professionCtrl = TextEditingController(text: teacher?.profession);
    final salaryCtrl = TextEditingController(text: teacher?.salary.toString() ?? '0');
    final yearsCtrl = TextEditingController(text: teacher?.yearsInSchool.toString() ?? '0');
    final certCtrl = TextEditingController(text: teacher?.certificates);
    int? selectedClassId = teacher?.classId;
    Uint8List? imageBytes = teacher?.image;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: Text(teacher == null ? 'Add Teacher' : 'Edit Teacher'),
              content: SizedBox(
                width: double.maxFinite,
                child: Form(
                  key: formKey,
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        GestureDetector(
                          onTap: () async {
                            final picker = ImagePicker();
                            final pickedFile = await picker.pickImage(source: ImageSource.gallery);
                            if (pickedFile != null) {
                              final bytes = await pickedFile.readAsBytes();
                              setState(() {
                                imageBytes = bytes;
                              });
                            }
                          },
                          child: CircleAvatar(
                            radius: 40,
                            backgroundImage: imageBytes != null ? MemoryImage(imageBytes!) : null,
                            child: imageBytes == null ? const Icon(Icons.add_a_photo) : null,
                          ),
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: nameCtrl,
                          decoration: const InputDecoration(labelText: 'Full Name', border: OutlineInputBorder()),
                          validator: (v) => v!.isEmpty ? 'Required' : null,
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: phoneCtrl,
                          decoration: const InputDecoration(labelText: 'Phone Number', border: OutlineInputBorder()),
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: professionCtrl,
                          decoration: const InputDecoration(labelText: 'Profession/Role', border: OutlineInputBorder()),
                        ),
                        const SizedBox(height: 16),
                        BlocBuilder<SchoolBloc, SchoolState>(
                          builder: (context, state) {
                            return DropdownButtonFormField<int>(
                              value: selectedClassId,
                              decoration: const InputDecoration(labelText: 'Assign to Class', border: OutlineInputBorder()),
                              items: [
                                const DropdownMenuItem<int>(value: null, child: Text('None')),
                                ...state.classes.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))),
                              ],
                              onChanged: (v) => setState(() => selectedClassId = v),
                            );
                          },
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: salaryCtrl,
                          decoration: const InputDecoration(labelText: 'Salary', border: OutlineInputBorder()),
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: yearsCtrl,
                          decoration: const InputDecoration(labelText: 'Years in School', border: OutlineInputBorder()),
                          keyboardType: TextInputType.number,
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: certCtrl,
                          decoration: const InputDecoration(labelText: 'Certificates', border: OutlineInputBorder()),
                          maxLines: 2,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () {
                    if (formKey.currentState!.validate()) {
                      final newTeacher = Teacher(
                        id: teacher?.id,
                        fullName: nameCtrl.text,
                        phone: phoneCtrl.text,
                        profession: professionCtrl.text,
                        classId: selectedClassId,
                        salary: double.tryParse(salaryCtrl.text) ?? 0.0,
                        yearsInSchool: int.tryParse(yearsCtrl.text) ?? 0,
                        certificates: certCtrl.text,
                        image: imageBytes,
                      );
                      
                      if (teacher == null) {
                        context.read<SchoolBloc>().add(AddTeacherEvent(newTeacher));
                      } else {
                        context.read<SchoolBloc>().add(UpdateTeacherEvent(newTeacher));
                      }
                      Navigator.pop(context);
                    }
                  },
                  child: const Text('Save'),
                ),
              ],
            );
          }
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Teachers'),
      ),
      body: BlocBuilder<SchoolBloc, SchoolState>(
        builder: (context, state) {
          if (state.isLoading && state.teachers.isEmpty) {
            return const Center(child: CircularProgressIndicator());
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
              final assignedClass = state.classes.where((c) => c.id == teacher.classId).firstOrNull?.name ?? 'No Class';

              return Card(
                elevation: 2,
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundImage: teacher.image != null ? MemoryImage(teacher.image!) : null,
                    child: teacher.image == null ? const Icon(Icons.person) : null,
                  ),
                  title: Text(teacher.fullName, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text('${teacher.profession ?? 'Staff'}  •  Class: $assignedClass'),
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
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showTeacherDialog(),
        child: const Icon(Icons.add),
      ),
    );
  }
}
