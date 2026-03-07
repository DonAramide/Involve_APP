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
                  keyboardType: TextInputType.phone,
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Required';
                    if (v.length < 11) return 'Min 11 digits';
                    if (v.length > 15) return 'Max 15 digits';
                    if (!RegExp(r'^\d+$').hasMatch(v)) return 'Digits only';
                    return null;
                  },
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
                      initialValue: selectedClassId,
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
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text('Date Joined: ${selectedEmploymentDate != null ? DateFormat('MMM dd, yyyy').format(selectedEmploymentDate!) : 'Select Date'}'),
                  trailing: const Icon(Icons.calendar_today),
                  shape: RoundedRectangleBorder(
                    side: BorderSide(color: Colors.grey.shade400),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  onTap: () async {
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
              Navigator.pop(context);
            }
          },
          child: const Text('Save'),
        ),
      ],
    );
  }
}
