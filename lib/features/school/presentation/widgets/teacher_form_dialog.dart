import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import 'package:involve_app/features/school/presentation/bloc/school_bloc.dart';
import '../bloc/school_state.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
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
  List<int> selectedClassIds = [];
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
    selectedClassIds = widget.teacher?.classIds != null
        ? List<int>.from(widget.teacher!.classIds!)
        : (widget.teacher?.classId != null ? [widget.teacher!.classId!] : []);
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
          showFriendlyErrorSnackBar(
            context,
            state.error,
            fallback: 'Failed to save teacher',
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
                      GestureDetector(
                        onTap: state.isLoading ? null : () => _showMultiSelectClassesDialog(context, state.classes),
                        child: AbsorbPointer(
                          child: TextFormField(
                            key: ValueKey(selectedClassIds.length),
                            decoration: const InputDecoration(
                              labelText: 'Assign to Classes',
                              border: OutlineInputBorder(),
                              suffixIcon: Icon(Icons.arrow_drop_down),
                            ),
                            controller: TextEditingController(
                              text: selectedClassIds.isEmpty
                                  ? 'None'
                                  : state.classes
                                      .where((c) => selectedClassIds.contains(c.id))
                                      .map((c) => c.name)
                                      .join(', '),
                            ),
                          ),
                        ),
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
                            classId: selectedClassIds.isNotEmpty ? selectedClassIds.first : null,
                            classIds: selectedClassIds,
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
                    ? const Text('Saving...', style: TextStyle(fontWeight: FontWeight.bold))
                    : const Text('Save'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showMultiSelectClassesDialog(BuildContext context, List<SchoolClass> classes) {
    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Select Classes'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: classes.map((c) {
                    final isSelected = selectedClassIds.contains(c.id);
                    return CheckboxListTile(
                      title: Text(c.name),
                      value: isSelected,
                      onChanged: (checked) {
                        setDialogState(() {
                          if (checked == true) {
                            selectedClassIds.add(c.id!);
                          } else {
                            selectedClassIds.remove(c.id);
                          }
                        });
                        setState(() {});
                      },
                    );
                  }).toList(),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('OK'),
                ),
              ],
            );
          },
        );
      },
    );
  }
}
