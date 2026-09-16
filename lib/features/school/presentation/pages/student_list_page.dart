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
import 'package:involve_app/core/utils/validators.dart';
import 'package:involve_app/features/activation/data/nigeria_states_lgas.dart';
import 'package:collection/collection.dart';

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
  String _enrollmentFilter = 'Enrolled'; // 'Enrolled', 'Promoted', 'Graduated', 'All'
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

  void _selectAllFiltered(List<Student> filtered) {
    final ids = filtered.map((s) => s.id).whereType<int>().toList();
    if (ids.isEmpty) return;
    setState(() {
      _selectedStudentIds
        ..clear()
        ..addAll(ids);
      _isSelectionMode = true;
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
              IconButton(
                icon: const Icon(Icons.select_all),
                tooltip: 'Select all shown',
                onPressed: () => _selectAllFiltered(filteredStudents),
              ),
              if (_isSelectionMode) ...[
                IconButton(
                  icon: const Icon(Icons.upgrade),
                  tooltip: 'Promote',
                  onPressed: _selectedStudentIds.isEmpty
                      ? null
                      : () => _showPromotionDialog(context, state.classes),
                ),
                IconButton(
                  icon: const Icon(Icons.school),
                  tooltip: 'Mark graduated',
                  onPressed: _selectedStudentIds.isEmpty
                      ? null
                      : () => _showGraduateDialog(context),
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
                const SizedBox(width: 16),
                DropdownButton<String>(
                  value: _enrollmentFilter,
                  items: const [
                    DropdownMenuItem(value: 'Enrolled', child: Text('Enrolled')),
                    DropdownMenuItem(value: 'Promoted', child: Text('Promoted')),
                    DropdownMenuItem(value: 'Graduated', child: Text('Graduated')),
                    DropdownMenuItem(value: 'All', child: Text('All statuses')),
                  ],
                  onChanged: (val) => setState(() => _enrollmentFilter = val ?? 'Enrolled'),
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

      if (_enrollmentFilter == 'Enrolled' && s.isGraduated) return false;
      if (_enrollmentFilter == 'Promoted' && !s.isPromoted) return false;
      if (_enrollmentFilter == 'Graduated' && !s.isGraduated) return false;

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
            title: Row(
              children: [
                Expanded(
                  child: Text(student.fullName, style: const TextStyle(fontWeight: FontWeight.bold)),
                ),
                if (student.isPromoted || student.isGraduated)
                  Container(
                    margin: const EdgeInsets.only(left: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: student.isGraduated ? Colors.grey.shade200 : Colors.green.shade50,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      student.enrollmentLabel,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: student.isGraduated ? Colors.grey.shade700 : Colors.green.shade800,
                      ),
                    ),
                  ),
              ],
            ),
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
            Text(
              'Move ${_selectedStudentIds.length} selected student${_selectedStudentIds.length == 1 ? '' : 's'} to the next class. They will be marked Promoted.',
            ),
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

  void _showGraduateDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Mark as graduated'),
        content: Text(
          'Mark ${_selectedStudentIds.length} selected student${_selectedStudentIds.length == 1 ? '' : 's'} as graduated? '
          'They stay in records and the Graduated filter, and leave the Enrolled list.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          ElevatedButton(
            onPressed: () {
              context.read<SchoolBloc>().add(
                    GraduateStudentsEvent(_selectedStudentIds.toList()),
                  );
              setState(() {
                _selectedStudentIds.clear();
                _isSelectionMode = false;
              });
              Navigator.pop(ctx);
            },
            child: const Text('GRADUATE'),
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
    SchoolParent? initialParent;
    if (student?.parentId != null) {
      initialParent = schoolState.parents.firstWhereOrNull((p) => p.id == student!.parentId);
    }
    if (initialParent == null && student != null && student.hasParent) {
      final key = student.parentKey;
      initialParent = schoolState.parents.firstWhereOrNull(
        (p) => '${p.fullName.trim()}|${(p.phone ?? '').trim()}' == key || ((p.phone ?? '').trim().isNotEmpty && (p.phone ?? '').trim() == (student.parentPhone ?? '').trim()),
      );
    }

    final streetController = TextEditingController();
    final busStopController = TextEditingController();
    final stateTextController = TextEditingController();
    String selectedCountry = 'Nigeria';
    String? selectedState;
    String? selectedLga;

    void applyAddressString(String? addressStr) {
      if (addressStr == null || addressStr.trim().isEmpty) return;
      var raw = addressStr.trim();
      String bus = '';
      String cntry = 'Nigeria';
      String? st;
      String? lg;

      final bStopMatch = RegExp(r'(?:B/Stop|Bus Stop|Bus-stop|Landmark):\s*([^,]+)', caseSensitive: false).firstMatch(raw);
      if (bStopMatch != null) {
        bus = bStopMatch.group(1)?.trim() ?? '';
        raw = raw.replaceRange(bStopMatch.start, bStopMatch.end, '').replaceAll(RegExp(r',\s*,'), ',');
      }

      for (final c in africaCountries) {
        if (raw.endsWith(c) || raw.contains(', $c') || raw.contains(' $c')) {
          cntry = c;
          raw = raw.replaceAll(c, '').replaceAll(RegExp(r',\s*$'), '').trim();
          break;
        }
      }

      if (cntry == 'Nigeria') {
        for (final item in nigeriaStatesAndLgas) {
          final sName = item['state'] as String;
          if (raw.contains(sName)) {
            st = sName;
            raw = raw.replaceAll(sName, '').replaceAll(RegExp(r',\s*$'), '').trim();
            final lgas = List<String>.from(item['lgas'] as List);
            for (final lga in lgas) {
              if (raw.contains(lga)) {
                lg = lga;
                raw = raw.replaceAll(lga, '').replaceAll(RegExp(r',\s*$'), '').trim();
                break;
              }
            }
            break;
          }
        }
      }

      final cleaned = raw.replaceAll(RegExp(r',\s*,'), ',').replaceAll(RegExp(r'^,\s*|,\s*$'), '').trim();
      streetController.text = cleaned.isNotEmpty ? cleaned : addressStr.trim();
      busStopController.text = bus;
      selectedCountry = cntry;
      selectedState = st;
      selectedLga = lg;
      if (cntry != 'Nigeria') {
        stateTextController.text = st ?? '';
      }
    }

    if (initialParent?.address != null) {
      applyAddressString(initialParent!.address);
    }

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
      useSafeArea: false,
      builder: (ctx) => BlocListener<SchoolBloc, SchoolState>(
        listenWhen: (previous, current) => previous.status != current.status,
        listener: (context, state) {
          if (state.status == SchoolStatus.success) {
            Navigator.of(ctx).pop();
          }
        },
        child: StatefulBuilder(
          builder: (context, setDialogState) {
            final stateList = nigeriaStatesAndLgas.map((s) => s['state'] as String).toList()..sort();
            List<String> lgaList = [];
            if (selectedState != null) {
              final match = nigeriaStatesAndLgas.firstWhereOrNull((s) => s['state'] == selectedState);
              if (match != null && match['lgas'] != null) {
                lgaList = List<String>.from(match['lgas'] as List)..sort();
              }
            }
            return Dialog.fullscreen(
            child: Scaffold(
              appBar: AppBar(
                automaticallyImplyLeading: false,
                title: Text(student == null ? 'Register Student' : 'Edit Student'),
                actions: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back),
                    tooltip: 'Back',
                    onPressed: () => Navigator.pop(ctx),
                  ),
                  const SizedBox(width: 4),
                ],
              ),
              body: SafeArea(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  child: Form(
                    key: formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Center(
                          child: GestureDetector(
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
                              radius: 44,
                              backgroundColor: Colors.grey[200],
                              backgroundImage: selectedImage != null ? MemoryImage(selectedImage!) : null,
                              child: selectedImage == null ? const Icon(Icons.camera_alt, size: 32, color: Colors.grey) : null,
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Center(
                          child: Text('Tap to set photo', style: TextStyle(fontSize: 11, color: Colors.grey)),
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: firstNameController, 
                          decoration: const InputDecoration(labelText: 'First Name *', border: OutlineInputBorder()),
                          validator: (val) => val == null || val.isEmpty ? 'First Name is required' : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: middleNameController,
                          decoration: const InputDecoration(labelText: 'Middle Name', border: OutlineInputBorder()),
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: lastNameController, 
                          decoration: const InputDecoration(labelText: 'Last Name *', border: OutlineInputBorder()),
                          validator: (val) => val == null || val.isEmpty ? 'Last Name is required' : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: admissionController, 
                          decoration: const InputDecoration(labelText: 'Admission Number', border: OutlineInputBorder()),
                        ),
                        const SizedBox(height: 12),
                        ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          shape: RoundedRectangleBorder(
                            side: BorderSide(color: Colors.grey.shade400),
                            borderRadius: BorderRadius.circular(4),
                          ),
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
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          value: selectedGender,
                          decoration: const InputDecoration(labelText: 'Gender', border: OutlineInputBorder()),
                          items: ['Male', 'Female', 'Other']
                              .map((g) => DropdownMenuItem(value: g, child: Text(g)))
                              .toList(),
                          onChanged: (val) => setDialogState(() => selectedGender = val),
                        ),
                        const SizedBox(height: 12),
                        BlocBuilder<SchoolBloc, SchoolState>(
                          builder: (context, state) {
                            return Column(
                              children: [
                                DropdownButtonFormField<int>(
                                  value: selectedClassId,
                                  decoration: const InputDecoration(labelText: 'Class *', border: OutlineInputBorder()),
                                  items: state.classes.map((c) => DropdownMenuItem(value: c.id!, child: Text(c.name))).toList(),
                                  onChanged: (val) => setDialogState(() => selectedClassId = val),
                                  validator: (val) => val == null ? 'Please select a class' : null,
                                ),
                                const SizedBox(height: 12),
                                DropdownButtonFormField<String>(
                                  value: selectedDepartment,
                                  decoration: const InputDecoration(labelText: 'Department (Science/Art/Commerce)', border: OutlineInputBorder()),
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
                        const SizedBox(height: 12),
                        BlocBuilder<SchoolBloc, SchoolState>(
                          builder: (context, state) {
                            final parents = _uniqueParents(state.students, state.parents);
                            return DropdownButtonFormField<String>(
                              value: parents.any((p) => p.key == selectedExistingParentKey)
                                  ? selectedExistingParentKey
                                  : null,
                              decoration: const InputDecoration(
                                labelText: 'Existing parent / guardian',
                                border: OutlineInputBorder(),
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
                                  if (match.address != null && match.address!.trim().isNotEmpty) {
                                    applyAddressString(match.address);
                                  }
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
                          decoration: const InputDecoration(labelText: 'Parent/Guardian Name *', border: OutlineInputBorder()),
                          validator: (val) => val == null || val.isEmpty ? 'Parent Name is required' : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: parentPhoneController, 
                          decoration: const InputDecoration(labelText: 'Parent Phone *', border: OutlineInputBorder()),
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
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              shape: RoundedRectangleBorder(
                                side: BorderSide(color: Colors.grey.shade400),
                                borderRadius: BorderRadius.circular(4),
                              ),
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
                        const SizedBox(height: 16),
                        const Divider(),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Icon(Icons.home_outlined, size: 20, color: Theme.of(context).primaryColor),
                            const SizedBox(width: 8),
                            const Text(
                              'Residential Address',
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        ValueListenableBuilder<TextEditingValue>(
                          valueListenable: streetController,
                          builder: (context, val, _) {
                            final text = val.text.trim();
                            final checkError = InputValidator.validateStreetAddress(text);
                            final isValid = text.isNotEmpty && checkError == null;
                            return TextFormField(
                              controller: streetController,
                              decoration: InputDecoration(
                                labelText: 'Street Address *',
                                hintText: 'e.g. 12 Adeola Street, Ikeja',
                                helperText: isValid
                                    ? '✓ Address verified'
                                    : 'Min. 9 characters, at least 3 words (e.g. 12 Adeola Street)',
                                helperStyle: TextStyle(
                                  color: isValid ? Colors.green.shade700 : Colors.grey.shade600,
                                  fontSize: 11,
                                  fontWeight: isValid ? FontWeight.bold : FontWeight.normal,
                                ),
                                prefixIcon: const Icon(Icons.location_on_outlined),
                                suffixIcon: text.isEmpty
                                    ? null
                                    : Padding(
                                        padding: const EdgeInsets.only(right: 8.0),
                                        child: Icon(
                                          isValid ? Icons.check_circle : Icons.error_outline,
                                          color: isValid ? Colors.green : Colors.orange,
                                          size: 22,
                                        ),
                                      ),
                                border: const OutlineInputBorder(),
                              ),
                              validator: (v) => InputValidator.validateStreetAddress(v),
                            );
                          },
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: busStopController,
                          decoration: const InputDecoration(
                            labelText: 'Nearest Bus Stop / Landmark',
                            hintText: 'e.g. Palmgrove Bus Stop',
                            prefixIcon: Icon(Icons.directions_bus_outlined),
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          value: africaCountries.contains(selectedCountry) ? selectedCountry : 'Nigeria',
                          isExpanded: true,
                          decoration: const InputDecoration(
                            labelText: 'Country *',
                            prefixIcon: Icon(Icons.public),
                            border: OutlineInputBorder(),
                          ),
                          items: africaCountries
                              .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                              .toList(),
                          onChanged: (val) {
                            setDialogState(() {
                              selectedCountry = val ?? 'Nigeria';
                              if (selectedCountry != 'Nigeria') {
                                selectedState = null;
                                selectedLga = null;
                              }
                            });
                          },
                        ),
                        const SizedBox(height: 12),
                        if (selectedCountry == 'Nigeria') ...[
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: DropdownButtonFormField<String>(
                                  value: stateList.contains(selectedState) ? selectedState : null,
                                  isExpanded: true,
                                  decoration: const InputDecoration(
                                    labelText: 'State *',
                                    prefixIcon: Icon(Icons.map_outlined),
                                    border: OutlineInputBorder(),
                                  ),
                                  items: stateList
                                      .map((s) => DropdownMenuItem(value: s, child: Text(s, overflow: TextOverflow.ellipsis)))
                                      .toList(),
                                  onChanged: (val) {
                                    setDialogState(() {
                                      selectedState = val;
                                      selectedLga = null;
                                    });
                                  },
                                  validator: (val) => (selectedCountry == 'Nigeria' && (val == null || val.isEmpty)) ? 'Select State' : null,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: DropdownButtonFormField<String>(
                                  value: lgaList.contains(selectedLga) ? selectedLga : null,
                                  isExpanded: true,
                                  decoration: InputDecoration(
                                    labelText: 'LGA *',
                                    prefixIcon: const Icon(Icons.location_city_outlined),
                                    border: const OutlineInputBorder(),
                                    hintText: selectedState == null ? 'Select state first' : 'Select LGA',
                                  ),
                                  items: lgaList
                                      .map((l) => DropdownMenuItem(value: l, child: Text(l, overflow: TextOverflow.ellipsis)))
                                      .toList(),
                                  onChanged: selectedState == null
                                      ? null
                                      : (val) {
                                          setDialogState(() {
                                            selectedLga = val;
                                          });
                                        },
                                  validator: (val) => (selectedCountry == 'Nigeria' && (val == null || val.isEmpty)) ? 'Select LGA' : null,
                                ),
                              ),
                            ],
                          ),
                        ] else ...[
                          TextFormField(
                            controller: stateTextController,
                            decoration: const InputDecoration(
                              labelText: 'State / Region *',
                              prefixIcon: Icon(Icons.map_outlined),
                              border: OutlineInputBorder(),
                            ),
                            validator: (val) => (selectedCountry != 'Nigeria' && (val == null || val.trim().isEmpty)) ? 'State/Region is required' : null,
                          ),
                        ],
                        const SizedBox(height: 24),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
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

                              final street = streetController.text.trim();
                              final busStop = busStopController.text.trim();
                              final country = selectedCountry;
                              final state = country == 'Nigeria' ? (selectedState ?? '') : stateTextController.text.trim();
                              final lga = country == 'Nigeria' ? (selectedLga ?? '') : '';

                              final addressParts = <String>[];
                              if (street.isNotEmpty) addressParts.add(street);
                              if (busStop.isNotEmpty) addressParts.add('B/Stop: $busStop');
                              if (lga.isNotEmpty) addressParts.add(lga);
                              if (state.isNotEmpty) addressParts.add(state);
                              if (country.isNotEmpty) addressParts.add(country);

                              final fullAddress = addressParts.join(', ');
                              final parentAddress = fullAddress.isEmpty ? null : fullAddress;

                              if (student == null) {
                                context.read<SchoolBloc>().add(AddStudentEvent(
                                      newStudent,
                                      alsoAssignStudentIds: alsoAssignIds.toList(),
                                      parentAddress: parentAddress,
                                    ));
                              } else {
                                context.read<SchoolBloc>().add(UpdateStudentEvent(
                                      newStudent,
                                      alsoAssignStudentIds: alsoAssignIds.toList(),
                                      parentAddress: parentAddress,
                                    ));
                              }
                            }
                          },
                          child: BlocBuilder<SchoolBloc, SchoolState>(
                            builder: (context, state) {
                              if (state.isLoading && state.status == SchoolStatus.loading) {
                                return const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                    ),
                                    SizedBox(width: 10),
                                    Text('Saving...', style: TextStyle(fontWeight: FontWeight.bold)),
                                  ],
                                );
                              }
                              return Text(
                                student == null ? 'Register Student' : 'Save Changes',
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                              );
                            },
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: () => Navigator.pop(ctx),
                          child: const Text('Cancel'),
                        ),
                        const SizedBox(height: 24),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          );
        },
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

  List<_ExistingParent> _uniqueParents(List<Student> students, [List<SchoolParent> schoolParents = const []]) {
    final parentAddressMap = <String, String>{};
    for (final p in schoolParents) {
      if (p.address != null && p.address!.trim().isNotEmpty) {
        final name = p.fullName.trim();
        final phone = (p.phone ?? '').trim();
        final key = '$name|$phone';
        parentAddressMap[key] = p.address!.trim();
        if (phone.isNotEmpty) {
          parentAddressMap[phone] = p.address!.trim();
        }
      }
    }

    final byKey = <String, _ExistingParent>{};
    for (final s in students) {
      if (!s.hasParent) continue;
      final existing = byKey[s.parentKey];
      final addr = parentAddressMap[s.parentKey] ??
          (s.parentPhone != null ? parentAddressMap[s.parentPhone!.trim()] : null);
      if (existing == null) {
        byKey[s.parentKey] = _ExistingParent(
          key: s.parentKey,
          name: s.parentName!.trim(),
          phone: (s.parentPhone ?? '').trim(),
          address: addr,
          childCount: 1,
        );
      } else {
        byKey[s.parentKey] = existing.copyWith(
          childCount: existing.childCount + 1,
          address: existing.address ?? addr,
        );
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
  final String? address;
  final int childCount;

  const _ExistingParent({
    required this.key,
    required this.name,
    required this.phone,
    this.address,
    required this.childCount,
  });

  _ExistingParent copyWith({int? childCount, String? address}) {
    return _ExistingParent(
      key: key,
      name: name,
      phone: phone,
      address: address ?? this.address,
      childCount: childCount ?? this.childCount,
    );
  }
}
