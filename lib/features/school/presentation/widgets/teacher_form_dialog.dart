import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import 'package:involve_app/features/school/presentation/bloc/school_bloc.dart';
import '../bloc/school_state.dart';
import '../../domain/entities/school_entities.dart';

class TeacherFormDialog extends StatefulWidget {
  final Teacher? teacher;

  const TeacherFormDialog({super.key, this.teacher});

  static Future<void> show(BuildContext context, {Teacher? teacher}) {
    return showDialog(
      context: context,
      builder: (context) => TeacherFormDialog(teacher: teacher),
    );
  }

  @override
  State<TeacherFormDialog> createState() => _TeacherFormDialogState();
}

class _TeacherFormDialogState extends State<TeacherFormDialog> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController nameCtrl;
  late TextEditingController phoneCtrl;
  late TextEditingController professionCtrl;
  late TextEditingController salaryCtrl;
  late TextEditingController certCtrl;
  DateTime? selectedEmploymentDate;
  int? selectedClassId;
  Uint8List? imageBytes;

  @override
  void initState() {
    super.initState();
    nameCtrl = TextEditingController(text: widget.teacher?.fullName);
    phoneCtrl = TextEditingController(text: widget.teacher?.phone);
    professionCtrl = TextEditingController(text: widget.teacher?.profession);
    salaryCtrl = TextEditingController(text: widget.teacher?.salary.toString() ?? '0');
    certCtrl = TextEditingController(text: widget.teacher?.certificates);
    selectedEmploymentDate = widget.teacher?.employmentDate ?? DateTime.now();
    selectedClassId = widget.teacher?.classId;
    imageBytes = widget.teacher?.image;
  }

  @override
  void dispose() {
    nameCtrl.dispose();
    phoneCtrl.dispose();
    professionCtrl.dispose();
    salaryCtrl.dispose();
    certCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<SchoolBloc, SchoolState>(
      listener: (context, state) {
        if (state.status == SchoolStatus.success) {
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Teacher saved successfully')),
          );
          context.read<SchoolBloc>().add(ResetSchoolStatus());
        } else if (state.status == SchoolStatus.failure) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.error ?? 'Failed to save teacher'),
              backgroundColor: Colors.red,
            ),
          );
          context.read<SchoolBloc>().add(ResetSchoolStatus());
        }
      },
      child: BlocBuilder<SchoolBloc, SchoolState>(
        builder: (context, state) {
          return AlertDialog(
            title: Text(widget.teacher == null ? 'Add Teacher' : 'Edit Teacher'),
            content: SizedBox(
              width: double.maxFinite,
              child: Form(
                key: _formKey,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      GestureDetector(
                        onTap: state.isLoading ? null : () async {
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
                        enabled: !state.isLoading,
                        decoration: const InputDecoration(labelText: 'Full Name', border: OutlineInputBorder()),
                        validator: (v) => v!.isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: phoneCtrl,
                        enabled: !state.isLoading,
                        decoration: const InputDecoration(labelText: 'Phone Number', border: OutlineInputBorder()),
                        keyboardType: TextInputType.phone,
                        maxLength: 15,
                        validator: (v) {
                          if (v == null || v.isEmpty) return 'Required';
                          final cleanVal = v.replaceAll(' ', '');
                          if (!RegExp(r'^\d{11,15}$').hasMatch(cleanVal)) {
                            return 'Enter a valid phone (11-15 digits)';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: professionCtrl,
                        enabled: !state.isLoading,
                        decoration: const InputDecoration(labelText: 'Profession/Role', border: OutlineInputBorder()),
                      ),
                      const SizedBox(height: 16),
                      DropdownButtonFormField<int>(
                        value: selectedClassId,
                        decoration: const InputDecoration(labelText: 'Assign to Class', border: OutlineInputBorder()),
                        items: [
                          const DropdownMenuItem<int>(value: null, child: Text('None')),
                          ...state.classes.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))),
                        ],
                        onChanged: state.isLoading ? null : (v) => setState(() => selectedClassId = v),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: salaryCtrl,
                        enabled: !state.isLoading,
                        decoration: const InputDecoration(labelText: 'Salary', border: OutlineInputBorder()),
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      ),
                      const SizedBox(height: 16),
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text('Date Joined: ${selectedEmploymentDate != null ? DateFormat('MMM dd, yyyy').format(selectedEmploymentDate!) : 'Select Date'}'),
                        trailing: const Icon(Icons.calendar_today),
                        shape: RoundedRectangleBorder(
                          side: BorderSide(color: Colors.grey.shade400),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        onTap: state.isLoading ? null : () async {
                          final date = await showDatePicker(
                            context: context,
                            initialDate: selectedEmploymentDate ?? DateTime.now(),
                            firstDate: DateTime(1900),
                            lastDate: DateTime.now(),
                            initialEntryMode: DatePickerEntryMode.calendar,
                          );
                          if (date != null) {
                            setState(() => selectedEmploymentDate = date);
                          }
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: certCtrl,
                        enabled: !state.isLoading,
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
                onPressed: state.isLoading ? null : () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: state.isLoading
                    ? null
                    : () {
                        if (_formKey.currentState!.validate()) {
                          final newTeacher = Teacher(
                            id: widget.teacher?.id,
                            fullName: nameCtrl.text,
                            phone: phoneCtrl.text,
                            profession: professionCtrl.text,
                            classId: selectedClassId,
                            salary: double.tryParse(salaryCtrl.text) ?? 0.0,
                            employmentDate: selectedEmploymentDate ?? DateTime.now(),
                            certificates: certCtrl.text,
                            image: imageBytes,
                          );

                          if (widget.teacher == null) {
                            context.read<SchoolBloc>().add(AddTeacherEvent(newTeacher));
                          } else {
                            context.read<SchoolBloc>().add(UpdateTeacherEvent(newTeacher));
                          }
                        }
                      },
                child: state.isLoading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Save'),
              ),
            ],
          );
        },
      ),
    );
  }
}
