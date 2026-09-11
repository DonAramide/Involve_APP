import 'dart:convert';
import 'dart:typed_data';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';
import '../bloc/school_bloc.dart';
import '../bloc/school_state.dart';
import '../../domain/entities/school_entities.dart';
import '../../domain/services/student_csv_import.dart';
import 'package:involve_app/core/utils/phone_number_input.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
import './student_profile_page.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

class StudentListPage extends StatefulWidget {
  final int? initialClassFilter;
  const StudentListPage({super.key, this.initialClassFilter});

  @override
  State<StudentListPage> createState() => _StudentListPageState();
}

class _StudentListPageState extends State<StudentListPage> {
  final Set<int> _selectedStudentIds = {};
  bool _isSelectionMode = false;
  
  int? _selectedClassFilter;
  String _selectedOwingFilter = 'All'; // 'All', 'Owing', 'Not Owing'
  int? _selectedYearFilter;
  String _selectedDepartmentFilter = 'All'; // 'All', 'Science', 'Art', 'Commerce', 'None'
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _selectedClassFilter = widget.initialClassFilter;
  }

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
      listenWhen: (previous, current) =>
          previous.error != current.error ||
          previous.successMessage != current.successMessage,
      listener: (context, state) {
        if (state.error != null) {
          String message = friendlyApiError(state.error);
          final lower = '${state.error} $message'.toLowerCase();
          if (lower.contains('virtual account') ||
              lower.contains('payment account') ||
              lower.contains('free trial') ||
              lower.contains('api key')) {
            return;
          }
          if (state.error!.contains('UNIQUE constraint failed') &&
              state.error!.contains('admission_number')) {
            message = 'Admission number already exists. Please try a different one.';
          }

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(message),
              backgroundColor: Colors.red,
              duration: const Duration(seconds: 4),
            ),
          );
        } else if (state.successMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.successMessage!),
              backgroundColor: Colors.green.shade700,
              duration: const Duration(seconds: 4),
            ),
          );
        }
      },
      child: BlocBuilder<SchoolBloc, SchoolState>(
        builder: (context, state) {
          final filteredStudents = _getFilteredStudents(state.students, state.studentInvoices);
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
            onPressed: () => _showAddStudentOptions(context),
            child: const Icon(Icons.person_add),
          ),
          body: state.isLoading 
            ? const InvifyLoadingIndicator(message: 'FETCHING STUDENT DIRECTORY...')
            : Column(
                children: [
                  _buildFilterBar(state),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    color: Colors.blueGrey.shade50.withOpacity(0.5),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Showing ${filteredStudents.length} ${filteredStudents.length == 1 ? "student" : "students"}',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Colors.blueGrey.shade700,
                          ),
                        ),
                        if (_selectedClassFilter != null) ...[
                          (() {
                            final selectedClass = state.classes.firstWhere(
                              (c) => c.id == _selectedClassFilter,
                              orElse: () => const SchoolClass(id: 0, name: '')
                            );
                            if (selectedClass.name.isEmpty) return const SizedBox.shrink();
                            return Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.blue.shade50,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.blue.shade100),
                              ),
                              child: Text(
                                selectedClass.name,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blue.shade700,
                                ),
                              ),
                            );
                          })(),
                        ],
                      ],
                    ),
                  ),
                  Expanded(
                    child: state.students.isEmpty 
                      ? const Center(child: Text('No students found.'))
                      : _buildStudentList(state, filteredStudents),
                  ),
                ],
              ),
          );
        },
      ),
    );
  }

  Widget _buildFilterBar(SchoolState state) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: Theme.of(context).cardColor,
      child: Column(
        children: [
          // Search Bar
          TextField(
            decoration: InputDecoration(
              hintText: 'Search by name or admission ID...',
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(vertical: 8),
            ),
            onChanged: (val) => setState(() => _searchQuery = val.toLowerCase()),
          ),
          const SizedBox(height: 8),
          // Filters
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                // Class Filter
                DropdownButton<int?>(
                  value: _selectedClassFilter,
                  hint: const Text('All Classes'),
                  items: [
                    const DropdownMenuItem<int?>(value: null, child: Text('All Classes')),
                    ...state.classes.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))),
                  ],
                  onChanged: (val) => setState(() => _selectedClassFilter = val),
                ),
                const SizedBox(width: 16),
                
                // Department Filter
                DropdownButton<String>(
                  value: _selectedDepartmentFilter,
                  items: ['All', 'Science', 'Art', 'Commerce', 'None']
                      .map((d) => DropdownMenuItem(
                            value: d,
                            child: Text(d == 'All'
                                ? 'All Depts'
                                : d == 'None'
                                    ? 'No Dept'
                                    : d),
                          ))
                      .toList(),
                  onChanged: (val) => setState(() => _selectedDepartmentFilter = val ?? 'All'),
                ),
                const SizedBox(width: 16),
                
                // Owing Status Filter
                DropdownButton<String>(
                  value: _selectedOwingFilter,
                  items: ['All', 'Owing', 'Not Owing']
                      .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                      .toList(),
                  onChanged: (val) => setState(() => _selectedOwingFilter = val ?? 'All'),
                ),
                const SizedBox(width: 16),

                // Academic Year Filter
                DropdownButton<int?>(
                  value: _selectedYearFilter,
                  hint: const Text('All Years'),
                  items: [
                    const DropdownMenuItem<int?>(value: null, child: Text('All Years')),
                    ...state.academicYears.map((y) => DropdownMenuItem(value: y.id, child: Text(y.name))),
                  ],
                  onChanged: (val) => setState(() => _selectedYearFilter = val),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<Student> _getFilteredStudents(List<Student> students, List<Invoice> invoices) {
    final filtered = students.where((s) {
      if (_searchQuery.isNotEmpty) {
        final nameMatch = s.fullName.toLowerCase().contains(_searchQuery);
        final idMatch = (s.admissionNumber ?? '').toLowerCase().contains(_searchQuery);
        if (!nameMatch && !idMatch) return false;
      }
      
      if (_selectedClassFilter != null && s.classId != _selectedClassFilter) return false;
      
      if (_selectedYearFilter != null && s.academicYearId != _selectedYearFilter) return false;

      if (_selectedDepartmentFilter != 'All') {
        if (_selectedDepartmentFilter == 'None' && s.department != null) return false;
        if (_selectedDepartmentFilter != 'None' && s.department != _selectedDepartmentFilter) return false;
      }

      final invoiceOwing = invoices
          .where((inv) => inv.studentId == s.id)
          .fold(0.0, (sum, inv) => sum + (inv.totalAmount - inv.amountPaid));
      final dynamicBalance = s.balance > 0 ? s.balance : invoiceOwing;
      final isOwing = dynamicBalance > 0;
      if (_selectedOwingFilter == 'Owing' && !isOwing) return false;
      if (_selectedOwingFilter == 'Not Owing' && isOwing) return false;

      return true;
    }).toList();

    filtered.sort((a, b) => a.fullName.toLowerCase().compareTo(b.fullName.toLowerCase()));
    return filtered;
  }

  Widget _buildStudentList(SchoolState state, List<Student> filteredStudents) {
    if (filteredStudents.isEmpty) {
      return const Center(child: Text('No students match the selected filters.'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: filteredStudents.length,
      itemBuilder: (context, index) {
        final student = filteredStudents[index];
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
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Class: ${sClass.name}${student.department != null ? ' • ${student.department}' : ''} | ID: ${student.admissionNumber ?? 'N/A'}'),
                (() {
                  // Prefer student ledger balance (kept in sync with bills on VA credit).
                  // Fall back to invoice sum when student.balance is 0 but open bills exist.
                  final invoiceOwing = state.studentInvoices
                      .where((inv) => inv.studentId == student.id)
                      .fold(0.0, (sum, inv) => sum + (inv.totalAmount - inv.amountPaid));
                  final dynamicBalance =
                      student.balance > 0 ? student.balance : invoiceOwing;
                  if (dynamicBalance > 0) {
                    return Text(
                      'Balance: ${CurrencyFormatter.format(dynamicBalance)}',
                      style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 12),
                    );
                  }
                  if (student.creditBalance > 0) {
                    return Text(
                      'Credit: ${CurrencyFormatter.format(student.creditBalance)}',
                      style: TextStyle(color: Colors.green.shade700, fontWeight: FontWeight.bold, fontSize: 12),
                    );
                  }
                  return const SizedBox.shrink();
                })(),
              ],
            ),
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

  void _showAddStudentOptions(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.person_add_alt_1),
              title: const Text('Add single student'),
              subtitle: const Text('Enter one student record'),
              onTap: () {
                Navigator.pop(ctx);
                _showStudentDialog(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.upload_file),
              title: const Text('Upload students (CSV)'),
              subtitle: const Text('Import multiple records from a CSV file'),
              onTap: () {
                Navigator.pop(ctx);
                _importStudentsCsv(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.download),
              title: const Text('Download CSV template'),
              subtitle: const Text('Headers match the Add Student form'),
              onTap: () {
                Navigator.pop(ctx);
                _downloadStudentCsvTemplate(context);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _downloadStudentCsvTemplate(BuildContext context) async {
    try {
      final result = await FilePicker.platform.saveFile(
        dialogTitle: 'Save student CSV template',
        fileName: 'student_import_template.csv',
        bytes: Uint8List.fromList(utf8.encode(StudentCsvImport.template)),
      );
      if (!context.mounted || result == null) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('CSV template saved.')),
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Could not save the template: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _importStudentsCsv(BuildContext context) async {
    final bloc = context.read<SchoolBloc>();
    if (bloc.state.classes.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Add at least one class before importing students.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final picked = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['csv'],
      withData: true,
    );
    if (picked == null || picked.files.isEmpty) return;

    final file = picked.files.first;
    final bytes = file.bytes;
    if (bytes == null) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not read the selected CSV file.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final parsed = StudentCsvImport.parse(
      utf8.decode(bytes, allowMalformed: true),
      classes: bloc.state.classes,
      startingAdmissionNumber: bloc.state.nextAdmissionNumber ?? '0001',
    );

    if (!context.mounted) return;

    if (parsed.students.isEmpty) {
      await showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Could not import students'),
          content: SingleChildScrollView(
            child: Text(parsed.errors.join('\n')),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK')),
          ],
        ),
      );
      return;
    }

    var shouldImport = true;
    if (parsed.errors.isNotEmpty) {
      shouldImport = await showDialog<bool>(
            context: context,
            builder: (ctx) => AlertDialog(
              title: const Text('Some rows were skipped'),
              content: SingleChildScrollView(
                child: Text(
                  '${parsed.students.length} valid student${parsed.students.length == 1 ? '' : 's'} ready to import.\n\n'
                  '${parsed.errors.join('\n')}',
                ),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('CANCEL')),
                ElevatedButton(
                  onPressed: () => Navigator.pop(ctx, true),
                  child: Text('IMPORT ${parsed.students.length}'),
                ),
              ],
            ),
          ) ??
          false;
    } else {
      shouldImport = await showDialog<bool>(
            context: context,
            builder: (ctx) => AlertDialog(
              title: const Text('Import students'),
              content: Text(
                'Import ${parsed.students.length} student${parsed.students.length == 1 ? '' : 's'} from ${file.name}?',
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('CANCEL')),
                ElevatedButton(
                  onPressed: () => Navigator.pop(ctx, true),
                  child: const Text('IMPORT'),
                ),
              ],
            ),
          ) ??
          false;
    }

    if (!shouldImport || !context.mounted) return;
    bloc.add(ImportStudentsEvent(parsed.students));
  }

  void _showStudentDialog(BuildContext context, {Student? student}) {
    final formKey = GlobalKey<FormState>();
    final firstNameController = TextEditingController(text: student?.firstName);
    final middleNameController = TextEditingController(text: student?.middleName);
    final lastNameController = TextEditingController(text: student?.lastName);
    final admissionController = TextEditingController(
      text: student?.admissionNumber ?? context.read<SchoolBloc>().state.nextAdmissionNumber
    );
    final parentNameController = TextEditingController(text: student?.parentName);
    final parentPhoneController = TextEditingController(text: student?.parentPhone);
    final schoolState = context.read<SchoolBloc>().state;
    String? selectedExistingParentKey = student != null && student.hasParent
        ? student.parentKey
        : null;
    final alsoAssignIds = <int>{
      if (student != null && student.hasParent)
        ...schoolState.students
            .where((s) => s.id != student.id && s.parentKey == student.parentKey)
            .map((s) => s.id!)
            .whereType<int>(),
    };
    int? selectedClassId = student?.classId;
    String? selectedDepartment = student?.department;
    String? selectedGender = student?.gender;
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
                            final resizedBytes = await _resizeImage(bytes);
                            setDialogState(() => selectedImage = resizedBytes);
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
                      controller: middleNameController,
                      decoration: const InputDecoration(labelText: 'Middle Name'),
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
                    DropdownButtonFormField<String>(
                      value: selectedGender,
                      decoration: const InputDecoration(labelText: 'Gender'),
                      items: ['Male', 'Female', 'Other']
                          .map((g) => DropdownMenuItem(value: g, child: Text(g)))
                          .toList(),
                      onChanged: (val) => setDialogState(() => selectedGender = val),
                    ),
                    const SizedBox(height: 16),
                    BlocBuilder<SchoolBloc, SchoolState>(
                      builder: (context, state) {
                        return Column(
                          children: [
                            DropdownButtonFormField<int>(
                              value: selectedClassId,
                              decoration: const InputDecoration(labelText: 'Class *'),
                              items: state.classes.map((c) => DropdownMenuItem(value: c.id!, child: Text(c.name))).toList(),
                              onChanged: (val) => setDialogState(() => selectedClassId = val),
                              validator: (val) => val == null ? 'Please select a class' : null,
                            ),
                            const SizedBox(height: 16),
                            DropdownButtonFormField<String>(
                              value: selectedDepartment,
                              decoration: const InputDecoration(labelText: 'Department (Science/Art/Commerce)'),
                              items: [
                                const DropdownMenuItem<String>(value: null, child: Text('None')),
                                ...['Science', 'Art', 'Commerce']
                                    .map((d) => DropdownMenuItem(value: d, child: Text(d))),
                              ],
                              onChanged: (val) => setDialogState(() => selectedDepartment = val),
                            ),
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 16),
                    BlocBuilder<SchoolBloc, SchoolState>(
                      builder: (context, state) {
                        final parents = _uniqueParents(state.students);
                        return DropdownButtonFormField<String>(
                          value: parents.any((p) => p.key == selectedExistingParentKey)
                              ? selectedExistingParentKey
                              : null,
                          decoration: const InputDecoration(
                            labelText: 'Existing parent / guardian',
                          ),
                          items: [
                            const DropdownMenuItem<String>(
                              value: null,
                              child: Text('New parent (type below)'),
                            ),
                            ...parents.map(
                              (p) => DropdownMenuItem<String>(
                                value: p.key,
                                child: Text(
                                  '${p.name} · ${p.phone} (${p.childCount})',
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ),
                          ],
                          onChanged: (val) {
                            setDialogState(() {
                              selectedExistingParentKey = val;
                              if (val == null) return;
                              _ExistingParent? match;
                              for (final p in parents) {
                                if (p.key == val) {
                                  match = p;
                                  break;
                                }
                              }
                              if (match == null) return;
                              parentNameController.text = match.name;
                              parentPhoneController.text = match.phone;
                              alsoAssignIds
                                ..clear()
                                ..addAll(
                                  state.students
                                      .where((s) =>
                                          s.id != student?.id &&
                                          s.parentKey == val)
                                      .map((s) => s.id!)
                                      .whereType<int>(),
                                );
                            });
                          },
                        );
                      },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: parentNameController, 
                      decoration: const InputDecoration(labelText: 'Parent/Guardian Name *'),
                      validator: (val) => val == null || val.isEmpty ? 'Parent Name is required' : null,
                    ),
                    TextFormField(
                      controller: parentPhoneController, 
                      decoration: const InputDecoration(labelText: 'Parent Phone *'),
                      keyboardType: TextInputType.phone,
                      inputFormatters: PhoneNumberInput.formatters,
                      maxLength: PhoneNumberInput.maxDigits,
                      validator: (v) {
                        if (v == null || v.isEmpty) return 'Required';
                        return PhoneNumberInput.validate(v, required: true, minDigits: 11);
                      },
                    ),
                    const SizedBox(height: 8),
                    BlocBuilder<SchoolBloc, SchoolState>(
                      builder: (context, state) {
                        final others = state.students
                            .where((s) => s.id != student?.id)
                            .toList()
                          ..sort((a, b) => a.fullName.toLowerCase().compareTo(b.fullName.toLowerCase()));
                        final names = others
                            .where((s) => alsoAssignIds.contains(s.id))
                            .map((s) => s.fullName)
                            .join(', ');
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Also parent of'),
                          subtitle: Text(
                            alsoAssignIds.isEmpty
                                ? 'This student only'
                                : names,
                          ),
                          trailing: const Icon(Icons.arrow_drop_down),
                          onTap: others.isEmpty
                              ? null
                              : () => _showSiblingPicker(
                                    context,
                                    others: others,
                                    classes: state.classes,
                                    selectedIds: alsoAssignIds,
                                    onChanged: () => setDialogState(() {}),
                                  ),
                        );
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
                    final middleName = middleNameController.text.trim();
                    final newStudent = student?.copyWith(
                          firstName: firstNameController.text,
                          middleName: middleName,
                          lastName: lastNameController.text,
                          admissionNumber: admissionController.text,
                          parentName: parentNameController.text,
                          parentPhone: parentPhoneController.text,
                          classId: selectedClassId,
                          image: selectedImage,
                          dateOfBirth: selectedDob,
                          gender: selectedGender,
                          department: selectedDepartment,
                        ) ??
                        Student(
                          firstName: firstNameController.text,
                          middleName: middleName.isEmpty ? null : middleName,
                          lastName: lastNameController.text,
                          admissionNumber: admissionController.text,
                          parentName: parentNameController.text,
                          parentPhone: parentPhoneController.text,
                          classId: selectedClassId!,
                          image: selectedImage,
                          dateOfBirth: selectedDob,
                          gender: selectedGender,
                          registrationDate: DateTime.now(),
                          department: selectedDepartment,
                        );

                    if (student == null) {
                      context.read<SchoolBloc>().add(AddStudentEvent(
                            newStudent,
                            alsoAssignStudentIds: alsoAssignIds.toList(),
                          ));
                    } else {
                      context.read<SchoolBloc>().add(UpdateStudentEvent(
                            newStudent,
                            alsoAssignStudentIds: alsoAssignIds.toList(),
                          ));
                    }
                  }
                },
                child: BlocBuilder<SchoolBloc, SchoolState>(
                  builder: (context, state) {
                    if (state.isLoading && state.status == SchoolStatus.loading) {
                      return const Text('Saving...', style: TextStyle(fontWeight: FontWeight.bold));
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

  Future<Uint8List> _resizeImage(Uint8List bytes) async {
    final image = img.decodeImage(bytes);
    if (image == null) return bytes;

    // Resize to a maximum dimension of 400px while maintaining aspect ratio
    img.Image resized;
    if (image.width > image.height) {
      resized = img.copyResize(image, width: 400);
    } else {
      resized = img.copyResize(image, height: 400);
    }

    // Encode to JPG with 70% quality to keep it below 100KB typically
    return Uint8List.fromList(img.encodeJpg(resized, quality: 70));
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

  List<_ExistingParent> _uniqueParents(List<Student> students) {
    final byKey = <String, _ExistingParent>{};
    for (final s in students) {
      if (!s.hasParent) continue;
      final existing = byKey[s.parentKey];
      if (existing == null) {
        byKey[s.parentKey] = _ExistingParent(
          key: s.parentKey,
          name: s.parentName!.trim(),
          phone: (s.parentPhone ?? '').trim(),
          childCount: 1,
        );
      } else {
        byKey[s.parentKey] = existing.copyWith(childCount: existing.childCount + 1);
      }
    }
    final list = byKey.values.toList()
      ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    return list;
  }

  void _showSiblingPicker(
    BuildContext context, {
    required List<Student> others,
    required List<SchoolClass> classes,
    required Set<int> selectedIds,
    required VoidCallback onChanged,
  }) {
    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setPickerState) {
            return AlertDialog(
              title: const Text('Assign this parent to students'),
              content: SizedBox(
                width: double.maxFinite,
                child: others.isEmpty
                    ? const Text('No other students yet.')
                    : ListView(
                        shrinkWrap: true,
                        children: others.map((s) {
                          var className = '—';
                          for (final c in classes) {
                            if (c.id == s.classId) {
                              className = c.name;
                              break;
                            }
                          }
                          return CheckboxListTile(
                            title: Text(s.fullName),
                            subtitle: Text(className),
                            value: selectedIds.contains(s.id),
                            onChanged: (checked) {
                              setPickerState(() {
                                if (checked == true) {
                                  selectedIds.add(s.id!);
                                } else {
                                  selectedIds.remove(s.id);
                                }
                              });
                              onChanged();
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

class _ExistingParent {
  final String key;
  final String name;
  final String phone;
  final int childCount;

  const _ExistingParent({
    required this.key,
    required this.name,
    required this.phone,
    required this.childCount,
  });

  _ExistingParent copyWith({int? childCount}) {
    return _ExistingParent(
      key: key,
      name: name,
      phone: phone,
      childCount: childCount ?? this.childCount,
    );
  }
}
