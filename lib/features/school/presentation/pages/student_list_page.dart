import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';
import '../bloc/school_bloc.dart';
import '../bloc/school_state.dart';
import '../../domain/entities/school_entities.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import './student_profile_page.dart';
import 'package:intl/intl.dart';

class StudentListPage extends StatefulWidget {
  const StudentListPage({super.key});

  @override
  State<StudentListPage> createState() => _StudentListPageState();
}

class _StudentListPageState extends State<StudentListPage> {
  final Set<int> _selectedStudentIds = {};
  bool _isSelectionMode = false;

  void _toggleSelection(int id) {
    setState(() {
      if (_selectedStudentIds.contains(id)) {
        _selectedStudentIds.remove(id);
        if (_selectedStudentIds.isEmpty) _isSelectionMode = false;
      } else {
        _selectedStudentIds.add(id);
        _isSelectionMode = true;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<SchoolBloc, SchoolState>(
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
          return Scaffold(
          appBar: AppBar(
            title: Text(_isSelectionMode ? '${_selectedStudentIds.length} Selected' : 'Students'),
            actions: [
              if (_isSelectionMode) ...[
                IconButton(
                  icon: const Icon(Icons.upgrade),
                  tooltip: 'Promote',
                  onPressed: () => _showPromotionDialog(context, state.classes),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => setState(() {
                    _selectedStudentIds.clear();
                    _isSelectionMode = false;
                  }),
                ),
              ],
            ],
          ),
          floatingActionButton: _isSelectionMode ? null : FloatingActionButton(
            onPressed: () => _showStudentDialog(context),
            child: const Icon(Icons.person_add),
          ),
          body: state.isLoading 
            ? const Center(child: CircularProgressIndicator())
            : state.students.isEmpty 
              ? const Center(child: Text('No students added yet.'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: state.students.length,
                  itemBuilder: (context, index) {
                    final student = state.students[index];
                    final isSelected = _selectedStudentIds.contains(student.id);
                    final sClass = state.classes.firstWhere(
                      (c) => c.id == student.classId, 
                      orElse: () => const SchoolClass(id: 0, name: 'No Class')
                    );
                    
                    return Card(
                      elevation: isSelected ? 4 : 1,
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: isSelected ? BorderSide(color: Theme.of(context).primaryColor, width: 2) : BorderSide.none,
                      ),
                      child: ListTile(
                        leading: GestureDetector(
                          onTap: _isSelectionMode ? () => _toggleSelection(student.id!) : null,
                          child: CircleAvatar(
                            backgroundImage: student.image != null ? MemoryImage(student.image!) : null,
                            child: student.image == null ? Text(student.firstName[0] + student.lastName[0]) : null,
                          ),
                        ),
                        title: Text(student.fullName, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('Class: ${sClass.name} | ID: ${student.admissionNumber ?? 'N/A'}'),
                        trailing: _isSelectionMode 
                          ? Checkbox(
                              value: isSelected,
                              onChanged: (_) => _toggleSelection(student.id!),
                            )
                          : PopupMenuButton<String>(
                              icon: const Icon(Icons.more_vert),
                              onSelected: (value) {
                                if (value == 'edit') {
                                  _showStudentDialog(context, student: student);
                                } else if (value == 'profile') {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (_) => StudentProfilePage(studentId: student.id!)),
                                  );
                                } else if (value == 'delete') {
                                  _confirmDeleteStudent(context, student);
                                }
                              },
                              itemBuilder: (context) => [
                                const PopupMenuItem(value: 'profile', child: ListTile(leading: Icon(Icons.person_outline), title: Text('Profile'))),
                                const PopupMenuItem(value: 'edit', child: ListTile(leading: Icon(Icons.edit_outlined), title: Text('Edit'))),
                                const PopupMenuItem(value: 'delete', child: ListTile(leading: Icon(Icons.delete_outline, color: Colors.red), title: Text('Delete', style: TextStyle(color: Colors.red)))),
                              ],
                            ),
                        onLongPress: () => _toggleSelection(student.id!),
                        onTap: () {
                          if (_isSelectionMode) {
                            _toggleSelection(student.id!);
                          } else {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => StudentProfilePage(studentId: student.id!)),
                            );
                          }
                        },
                      ),
                    );
                  },
                ),
          );
        },
      ),
    );
  }

  void _showPromotionDialog(BuildContext context, List<SchoolClass> classes) {
    int? targetClassId;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Promote Students'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Move ${_selectedStudentIds.length} students to:'),
            const SizedBox(height: 16),
            StatefulBuilder(
              builder: (context, setDialogState) => DropdownButtonFormField<int>(
                decoration: const InputDecoration(labelText: 'Destination Class', border: OutlineInputBorder()),
                items: classes.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))).toList(),
                onChanged: (val) => setDialogState(() => targetClassId = val),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          ElevatedButton(
            onPressed: () {
              if (targetClassId != null) {
                context.read<SchoolBloc>().add(PromoteStudentsEvent(
                  studentIds: _selectedStudentIds.toList(),
                  targetClassId: targetClassId!,
                ));
                setState(() {
                  _selectedStudentIds.clear();
                  _isSelectionMode = false;
                });
                Navigator.pop(ctx);
              }
            },
            child: const Text('PROMOTE'),
          ),
        ],
      ),
    );
  }

  void _showStudentDialog(BuildContext context, {Student? student}) {
    final formKey = GlobalKey<FormState>();
    final firstNameController = TextEditingController(text: student?.firstName);
    final lastNameController = TextEditingController(text: student?.lastName);
    final admissionController = TextEditingController(text: student?.admissionNumber);
    final parentNameController = TextEditingController(text: student?.parentName);
    final parentPhoneController = TextEditingController(text: student?.parentPhone);
    int? selectedClassId = student?.classId;
    Uint8List? selectedImage = student?.image;
    DateTime? selectedDob = student?.dateOfBirth;
    final ImagePicker picker = ImagePicker();
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
        child: StatefulBuilder(
          builder: (context, setDialogState) => AlertDialog(
            title: Text(student == null ? 'Add Student' : 'Edit Student'),
            content: SingleChildScrollView(
              child: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    GestureDetector(
                      onTap: () async {
                        final source = await showModalBottomSheet<ImageSource>(
                          context: context,
                          builder: (ctx) => SafeArea(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                ListTile(
                                  leading: const Icon(Icons.camera_alt),
                                  title: const Text('Take Photo'),
                                  onTap: () => Navigator.pop(ctx, ImageSource.camera),
                                ),
                                ListTile(
                                  leading: const Icon(Icons.photo_library),
                                  title: const Text('Choose from Gallery'),
                                  onTap: () => Navigator.pop(ctx, ImageSource.gallery),
                                ),
                              ],
                            ),
                          ),
                        );
                        if (source != null) {
                          final XFile? image = await picker.pickImage(source: source, imageQuality: 50);
                          if (image != null) {
                            final bytes = await image.readAsBytes();
                            setDialogState(() => selectedImage = bytes);
                          }
                        }
                      },
                      child: CircleAvatar(
                        radius: 40,
                        backgroundColor: Colors.grey[200],
                        backgroundImage: selectedImage != null ? MemoryImage(selectedImage!) : null,
                        child: selectedImage == null ? const Icon(Icons.camera_alt, size: 30, color: Colors.grey) : null,
                      ),
                    ),
                    const Text('Tap to set photo', style: TextStyle(fontSize: 10, color: Colors.grey)),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: firstNameController, 
                      decoration: const InputDecoration(labelText: 'First Name *'),
                      validator: (val) => val == null || val.isEmpty ? 'First Name is required' : null,
                    ),
                    TextFormField(
                      controller: lastNameController, 
                      decoration: const InputDecoration(labelText: 'Last Name *'),
                      validator: (val) => val == null || val.isEmpty ? 'Last Name is required' : null,
                    ),
                    TextFormField(
                      controller: admissionController, 
                      decoration: const InputDecoration(labelText: 'Admission Number'),
                    ),
                    const SizedBox(height: 16),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Date of Birth'),
                      subtitle: Text(selectedDob == null ? 'Not Set' : DateFormat('dd MMM yyyy').format(selectedDob!)),
                      trailing: const Icon(Icons.calendar_today),
                      onTap: () async {
                        final date = await showDatePicker(
                          context: context,
                          initialDate: selectedDob ?? DateTime(2015),
                          firstDate: DateTime(1990),
                          lastDate: DateTime.now(),
                        );
                        if (date != null) setDialogState(() => selectedDob = date);
                      },
                    ),
                    const SizedBox(height: 8),
                    const SizedBox(height: 16),
                    BlocBuilder<SchoolBloc, SchoolState>(
                      builder: (context, state) {
                        return DropdownButtonFormField<int>(
                          value: selectedClassId,
                          decoration: const InputDecoration(labelText: 'Class *'),
                          items: state.classes.map((c) => DropdownMenuItem(value: c.id!, child: Text(c.name))).toList(),
                          onChanged: (val) => setDialogState(() => selectedClassId = val),
                          validator: (val) => val == null ? 'Please select a class' : null,
                        );
                      },
                    ),
                    TextFormField(
                      controller: parentNameController, 
                      decoration: const InputDecoration(labelText: 'Parent/Guardian Name *'),
                      validator: (val) => val == null || val.isEmpty ? 'Parent Name is required' : null,
                    ),
                    TextFormField(
                      controller: parentPhoneController, 
                      decoration: const InputDecoration(labelText: 'Parent Phone *'),
                      keyboardType: TextInputType.phone,
                      validator: (val) {
                        if (val == null || val.isEmpty) return 'Phone number is required';
                        if (!RegExp(r'^\d{10,15}$').hasMatch(val.replaceAll(' ', ''))) {
                          return 'Enter a valid phone number';
                        }
                        return null;
                      },
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
              ElevatedButton(
                onPressed: () {
                  if (formKey.currentState!.validate()) {
                    final newStudent = student?.copyWith(
                          firstName: firstNameController.text,
                          lastName: lastNameController.text,
                          admissionNumber: admissionController.text,
                          parentName: parentNameController.text,
                          parentPhone: parentPhoneController.text,
                          classId: selectedClassId,
                          image: selectedImage,
                          dateOfBirth: selectedDob,
                        ) ??
                        Student(
                          firstName: firstNameController.text,
                          lastName: lastNameController.text,
                          admissionNumber: admissionController.text,
                          parentName: parentNameController.text,
                          parentPhone: parentPhoneController.text,
                          classId: selectedClassId!,
                          image: selectedImage,
                          dateOfBirth: selectedDob,
                          registrationDate: DateTime.now(),
                        );

                    if (student == null) {
                      context.read<SchoolBloc>().add(AddStudentEvent(newStudent));
                    } else {
                      context.read<SchoolBloc>().add(UpdateStudentEvent(newStudent));
                    }
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
                    return Text(student == null ? 'Add' : 'Save');
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmDeleteStudent(BuildContext context, Student student) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Student?'),
        content: Text('Are you sure you want to delete ${student.fullName}? This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          TextButton(
            onPressed: () {
              context.read<SchoolBloc>().add(DeleteStudentEvent(student.id!));
              Navigator.pop(ctx);
            },
            child: const Text('DELETE', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}
