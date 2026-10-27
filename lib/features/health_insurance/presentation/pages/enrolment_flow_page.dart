// lib/features/health_insurance/presentation/pages/enrolment_flow_page.dart
import 'dart:collection';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../school/domain/entities/school_entities.dart';
import '../../../school/domain/repositories/school_repository.dart';
import '../../domain/entities/health_insurance_entities.dart';
import '../bloc/health_insurance_bloc.dart';
import '../bloc/health_insurance_event.dart';
import '../bloc/health_insurance_state.dart';

/// Representation of a selectable student beneficiary.
class EnrolmentStudentItem {
  final String id;
  final String fullName;
  final String admissionNumber;
  final String className;
  final int? classId;

  const EnrolmentStudentItem({
    required this.id,
    required this.fullName,
    required this.admissionNumber,
    required this.className,
    this.classId,
  });
}

class EnrolmentFlowPage extends StatefulWidget {
  static const String routeName = '/health_wellness/enrol';
  final TenantPlanOffer? selectedOffer;
  final GuardianChild? preselectedChild;

  const EnrolmentFlowPage({
    super.key,
    this.selectedOffer,
    this.preselectedChild,
  });

  @override
  State<EnrolmentFlowPage> createState() => _EnrolmentFlowPageState();
}

class _EnrolmentFlowPageState extends State<EnrolmentFlowPage> {
  final _formKey = GlobalKey<FormState>();
  late TenantPlanOffer? _offer;

  // Student selection state
  List<EnrolmentStudentItem> _students = [];
  final Set<String> _selectedStudentIds = {};
  final Set<String> _collapsedClasses = {};
  bool _isLoadingStudents = false;
  String _searchQuery = '';
  bool _showManualEntry = false;

  final _searchController = TextEditingController();
  final _manualMemberIdController = TextEditingController();

  DateTime _startDate = DateTime.now();
  DateTime _endDate = DateTime.now().add(const Duration(days: 365));

  @override
  void initState() {
    super.initState();
    _offer = widget.selectedOffer;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadStudents();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _manualMemberIdController.dispose();
    super.dispose();
  }

  Future<void> _loadStudents() async {
    setState(() => _isLoadingStudents = true);

    try {
      SchoolRepository? schoolRepo;
      try {
        schoolRepo = context.read<SchoolRepository>();
      } catch (_) {}

      final List<EnrolmentStudentItem> items = [];

      if (schoolRepo != null) {
        final classes = await schoolRepo.getClasses().catchError((_) => <SchoolClass>[]);
        final classMap = {for (final c in classes) c.id: c.name};
        final students = await schoolRepo.getStudentSummaries().catchError((_) => <Student>[]);

        for (final s in students) {
          final className = classMap[s.classId] ?? (s.classId > 0 ? 'Class ${s.classId}' : 'Unassigned Class');
          final identifier = (s.syncId != null && s.syncId!.trim().isNotEmpty)
              ? s.syncId!.trim()
              : (s.admissionNumber.trim().isNotEmpty ? s.admissionNumber.trim() : (s.id?.toString() ?? ''));
          if (identifier.isNotEmpty) {
            items.add(EnrolmentStudentItem(
              id: identifier,
              fullName: s.fullName,
              admissionNumber: s.admissionNumber,
              className: className,
              classId: s.classId,
            ));
          }
        }
      }

      // If school repository has no students, fallback to verified guardian children
      if (items.isEmpty && mounted) {
        final state = context.read<HealthInsuranceBloc>().state;
        for (final c in state.guardianChildren.where((ch) => ch.isVerified)) {
          items.add(EnrolmentStudentItem(
            id: c.studentId,
            fullName: '${c.firstName} ${c.lastName}'.trim(),
            admissionNumber: c.admissionNumber,
            className: c.currentClass.isNotEmpty ? c.currentClass : 'General',
          ));
        }
      }

      if (mounted) {
        setState(() {
          _students = items;
          _isLoadingStudents = false;
          if (widget.preselectedChild != null) {
            _selectedStudentIds.add(widget.preselectedChild!.studentId);
          }
        });
      }
    } catch (e) {
      debugPrint('[Enrolment] Error loading students: $e');
      if (mounted) {
        setState(() => _isLoadingStudents = false);
      }
    }
  }

  Map<String, List<EnrolmentStudentItem>> _getGroupedStudents() {
    final query = _searchQuery.trim().toLowerCase();
    final filtered = query.isEmpty
        ? _students
        : _students.where((s) =>
            s.fullName.toLowerCase().contains(query) ||
            s.admissionNumber.toLowerCase().contains(query) ||
            s.className.toLowerCase().contains(query)).toList();

    final grouped = SplayTreeMap<String, List<EnrolmentStudentItem>>((a, b) => a.compareTo(b));
    for (final s in filtered) {
      grouped.putIfAbsent(s.className, () => []).add(s);
    }
    for (final entry in grouped.entries) {
      entry.value.sort((a, b) => a.fullName.toLowerCase().compareTo(b.fullName.toLowerCase()));
    }
    return grouped;
  }

  List<EnrolmentStudentItem> _getFilteredStudents() {
    final query = _searchQuery.trim().toLowerCase();
    if (query.isEmpty) return _students;
    return _students.where((s) =>
        s.fullName.toLowerCase().contains(query) ||
        s.admissionNumber.toLowerCase().contains(query) ||
        s.className.toLowerCase().contains(query)).toList();
  }

  void _toggleSelectAll(List<EnrolmentStudentItem> currentList) {
    setState(() {
      final allSelected = currentList.isNotEmpty && currentList.every((s) => _selectedStudentIds.contains(s.id));
      if (allSelected) {
        for (final s in currentList) {
          _selectedStudentIds.remove(s.id);
        }
      } else {
        for (final s in currentList) {
          _selectedStudentIds.add(s.id);
        }
      }
    });
  }

  void _toggleSelectClass(List<EnrolmentStudentItem> classStudents) {
    setState(() {
      final allInClassSelected = classStudents.isNotEmpty && classStudents.every((s) => _selectedStudentIds.contains(s.id));
      if (allInClassSelected) {
        for (final s in classStudents) {
          _selectedStudentIds.remove(s.id);
        }
      } else {
        for (final s in classStudents) {
          _selectedStudentIds.add(s.id);
        }
      }
    });
  }

  void _toggleStudent(String id) {
    setState(() {
      if (_selectedStudentIds.contains(id)) {
        _selectedStudentIds.remove(id);
      } else {
        _selectedStudentIds.add(id);
      }
    });
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    if (_offer == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No active health plan is available for enrolment. Please contact your school administrator.'),
          backgroundColor: Colors.amber,
        ),
      );
      return;
    }

    final startStr = _startDate.toIso8601String().split('T').first;
    final endStr = _endDate.toIso8601String().split('T').first;

    if (_showManualEntry) {
      final memberId = _manualMemberIdController.text.trim();
      if (memberId.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please enter a valid Member or Student ID')),
        );
        return;
      }

      context.read<HealthInsuranceBloc>().add(
            SubmitEnrolmentRequest(
              memberId: memberId,
              planVersionId: _offer!.planVersionId,
              periodStart: startStr,
              periodEnd: endStr,
            ),
          );
      return;
    }

    if (_selectedStudentIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least one student for enrolment')),
      );
      return;
    }

    if (_selectedStudentIds.length == 1) {
      context.read<HealthInsuranceBloc>().add(
            SubmitEnrolmentRequest(
              memberId: _selectedStudentIds.first,
              planVersionId: _offer!.planVersionId,
              periodStart: startStr,
              periodEnd: endStr,
            ),
          );
    } else {
      context.read<HealthInsuranceBloc>().add(
            SubmitBulkEnrolmentRequest(
              memberIds: _selectedStudentIds.toList(),
              planVersionId: _offer!.planVersionId,
              periodStart: startStr,
              periodEnd: endStr,
            ),
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final formatter = NumberFormat('#,##0', 'en_US');
    final dateFormatter = DateFormat('yyyy-MM-dd');

    return BlocConsumer<HealthInsuranceBloc, HealthInsuranceState>(
      listener: (context, state) {
        if (state.actionSuccessMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.actionSuccessMessage!),
              backgroundColor: Colors.green,
            ),
          );
          Navigator.pop(context);
        } else if (state.errorMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.errorMessage!),
              backgroundColor: Colors.red,
            ),
          );
        }
      },
      builder: (context, state) {
        final eligibleOffers = state.offers.where((o) {
          final cats = o.plan.memberCategories;
          if (cats.isEmpty) return true;
          return cats.any((c) =>
              c.toLowerCase() == 'student' ||
              c.toLowerCase() == 'all' ||
              c.toLowerCase() == 'general' ||
              c.toLowerCase() == 'dependent');
        }).toList();

        if (_offer == null && eligibleOffers.isNotEmpty) {
          _offer = eligibleOffers.first;
        } else if (_offer != null && !eligibleOffers.contains(_offer)) {
          _offer = eligibleOffers.isNotEmpty ? eligibleOffers.first : null;
        }

        final filteredStudents = _getFilteredStudents();
        final groupedStudents = _getGroupedStudents();
        final isAllSelected = filteredStudents.isNotEmpty &&
            filteredStudents.every((s) => _selectedStudentIds.contains(s.id));

        return Scaffold(
          appBar: AppBar(
            title: const Text('New Health Enrolment'),
            actions: [
              if (_students.isNotEmpty && !_showManualEntry)
                IconButton(
                  tooltip: 'Manual Entry',
                  icon: const Icon(Icons.edit_note),
                  onPressed: () {
                    setState(() {
                      _showManualEntry = true;
                    });
                  },
                ),
            ],
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Beneficiary Selection Section
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '1. Select Beneficiaries',
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      if (_showManualEntry && _students.isNotEmpty)
                        TextButton.icon(
                          onPressed: () => setState(() => _showManualEntry = false),
                          icon: const Icon(Icons.list, size: 18),
                          label: const Text('Back to Student Roster'),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  if (_showManualEntry || (_students.isEmpty && !_isLoadingStudents)) ...[
                    // Manual ID fallback input
                    TextFormField(
                      controller: _manualMemberIdController,
                      decoration: InputDecoration(
                        labelText: 'Member / Student UUID',
                        hintText: 'Enter student UUID, admission number, or staff ID',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        prefixIcon: const Icon(Icons.badge),
                        suffixIcon: _students.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.close),
                                onPressed: () => setState(() => _showManualEntry = false),
                              )
                            : null,
                      ),
                      validator: (val) {
                        if (!_showManualEntry && _selectedStudentIds.isNotEmpty) return null;
                        return (val == null || val.trim().isEmpty) ? 'Member ID is required' : null;
                      },
                    ),
                    const SizedBox(height: 12),
                  ] else if (_isLoadingStudents) ...[
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Center(
                        child: Column(
                          children: [
                            CircularProgressIndicator(),
                            SizedBox(height: 12),
                            Text('Loading students and classes roster...', style: TextStyle(color: Colors.grey)),
                          ],
                        ),
                      ),
                    ),
                  ] else ...[
                    // Roster Search and Quick Action Toolbar
                    TextField(
                      controller: _searchController,
                      decoration: InputDecoration(
                        hintText: 'Search by student name, admission no, or class...',
                        prefixIcon: const Icon(Icons.search, size: 20),
                        suffixIcon: _searchQuery.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear, size: 18),
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() => _searchQuery = '');
                                },
                              )
                            : null,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        filled: true,
                        fillColor: theme.colorScheme.surfaceVariant.withOpacity(0.3),
                      ),
                      onChanged: (val) {
                        setState(() => _searchQuery = val);
                      },
                    ),
                    const SizedBox(height: 10),

                    // Selection Control Bar
                    Row(
                      children: [
                        // Master Select All / Deselect All
                        InkWell(
                          borderRadius: BorderRadius.circular(8),
                          onTap: filteredStudents.isEmpty ? null : () => _toggleSelectAll(filteredStudents),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 6),
                            child: Row(
                              children: [
                                Checkbox(
                                  value: isAllSelected,
                                  tristate: filteredStudents.any((s) => _selectedStudentIds.contains(s.id)) && !isAllSelected,
                                  onChanged: filteredStudents.isEmpty ? null : (_) => _toggleSelectAll(filteredStudents),
                                ),
                                Text(
                                  isAllSelected ? 'Deselect All' : 'Select All (${filteredStudents.length})',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const Spacer(),

                        // Selected Counter Badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: _selectedStudentIds.isEmpty
                                ? Colors.grey.withOpacity(0.15)
                                : theme.colorScheme.primary.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: _selectedStudentIds.isEmpty
                                  ? Colors.grey.withOpacity(0.3)
                                  : theme.colorScheme.primary,
                            ),
                          ),
                          child: Text(
                            '${_selectedStudentIds.length} Selected',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                              color: _selectedStudentIds.isEmpty
                                  ? Colors.grey
                                  : theme.colorScheme.primary,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // Grouped List by Class
                    if (groupedStudents.isEmpty) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.grey.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Center(
                          child: Text(
                            _searchQuery.isNotEmpty
                                ? 'No students found matching "$_searchQuery"'
                                : 'No students found in roster.',
                            style: const TextStyle(color: Colors.grey),
                          ),
                        ),
                      ),
                    ] else ...[
                      ConstrainedBox(
                        constraints: const BoxConstraints(maxHeight: 380),
                        child: ListView.builder(
                          shrinkWrap: true,
                          itemCount: groupedStudents.length,
                          itemBuilder: (context, index) {
                            final className = groupedStudents.keys.elementAt(index);
                            final classStudents = groupedStudents[className]!;
                            final isCollapsed = _collapsedClasses.contains(className);
                            final selectedInClass = classStudents.where((s) => _selectedStudentIds.contains(s.id)).length;
                            final isClassFullySelected = selectedInClass == classStudents.length;
                            final isClassPartiallySelected = selectedInClass > 0 && !isClassFullySelected;

                            return Card(
                              margin: const EdgeInsets.only(bottom: 10),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                                side: BorderSide(
                                  color: selectedInClass > 0
                                      ? theme.colorScheme.primary.withOpacity(0.4)
                                      : Colors.grey.withOpacity(0.2),
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Class Header Tile
                                  InkWell(
                                    borderRadius: const BorderRadius.vertical(top: Radius.circular(10)),
                                    onTap: () {
                                      setState(() {
                                        if (isCollapsed) {
                                          _collapsedClasses.remove(className);
                                        } else {
                                          _collapsedClasses.add(className);
                                        }
                                      });
                                    },
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                      child: Row(
                                        children: [
                                          // Class Checkbox (Select entire class)
                                          Checkbox(
                                            value: isClassFullySelected
                                                ? true
                                                : (isClassPartiallySelected ? null : false),
                                            tristate: true,
                                            onChanged: (_) => _toggleSelectClass(classStudents),
                                          ),
                                          const Icon(Icons.school_outlined, size: 18, color: Colors.blueGrey),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Row(
                                              children: [
                                                Text(
                                                  className,
                                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                                ),
                                                const SizedBox(width: 8),
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                  decoration: BoxDecoration(
                                                    color: Colors.grey.withOpacity(0.15),
                                                    borderRadius: BorderRadius.circular(10),
                                                  ),
                                                  child: Text(
                                                    '${classStudents.length}',
                                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          if (selectedInClass > 0)
                                            Text(
                                              '$selectedInClass/${classStudents.length} selected',
                                              style: TextStyle(
                                                fontSize: 11,
                                                fontWeight: FontWeight.bold,
                                                color: theme.colorScheme.primary,
                                              ),
                                            ),
                                          const SizedBox(width: 4),
                                          Icon(
                                            isCollapsed ? Icons.keyboard_arrow_down : Icons.keyboard_arrow_up,
                                            color: Colors.grey,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),

                                  // Students in this Class
                                  if (!isCollapsed) ...[
                                    const Divider(height: 1),
                                    ...classStudents.map((student) {
                                      final isSelected = _selectedStudentIds.contains(student.id);
                                      final initials = student.fullName.trim().split(' ').map((n) => n.isNotEmpty ? n[0] : '').take(2).join().toUpperCase();

                                      return CheckboxListTile(
                                        dense: true,
                                        value: isSelected,
                                        controlAffinity: ListTileControlAffinity.leading,
                                        onChanged: (_) => _toggleStudent(student.id),
                                        secondary: CircleAvatar(
                                          radius: 14,
                                          backgroundColor: isSelected
                                              ? theme.colorScheme.primary.withOpacity(0.2)
                                              : Colors.blueGrey.withOpacity(0.12),
                                          child: Text(
                                            initials.isNotEmpty ? initials : 'S',
                                            style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
                                              color: isSelected ? theme.colorScheme.primary : Colors.blueGrey,
                                            ),
                                          ),
                                        ),
                                        title: Text(
                                          student.fullName,
                                          style: TextStyle(
                                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                            fontSize: 13,
                                          ),
                                        ),
                                        subtitle: Text(
                                          'Adm: ${student.admissionNumber}',
                                          style: const TextStyle(fontSize: 11, color: Colors.grey),
                                        ),
                                      );
                                    }),
                                  ],
                                ],
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ],

                  const SizedBox(height: 20),

                  // 2. Select Insurance Plan
                  Text(
                    '2. Select Insurance Plan',
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  if (eligibleOffers.isNotEmpty) ...[
                    DropdownButtonFormField<TenantPlanOffer>(
                      value: _offer ?? eligibleOffers.first,
                      decoration: InputDecoration(
                        labelText: 'Offered School Plan',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        prefixIcon: const Icon(Icons.health_and_safety),
                      ),
                      items: eligibleOffers
                          .map((o) => DropdownMenuItem(
                                value: o,
                                child: Text(
                                  '${o.plan.name} (₦${formatter.format(o.plan.premiumNaira)}/yr)',
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ))
                          .toList(),
                      onChanged: (val) {
                        setState(() {
                          _offer = val;
                        });
                      },
                    ),

                    // Cost estimation summary for multi-selection
                    if (_offer != null && _selectedStudentIds.length > 1) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primary.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: theme.colorScheme.primary.withOpacity(0.2)),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.calculate_outlined, size: 18, color: theme.colorScheme.primary),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Total Estimated Premium: ₦${formatter.format(_offer!.plan.premiumNaira * _selectedStudentIds.length)}/yr (${_selectedStudentIds.length} students × ₦${formatter.format(_offer!.plan.premiumNaira)})',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: theme.colorScheme.primary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ] else ...[
                    Card(
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                        side: BorderSide(color: Colors.amber.shade700.withOpacity(0.4)),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(Icons.info_outline, color: Colors.amber.shade700, size: 22),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'No Active Health Plans Offered',
                                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    'Your school administration has not configured active health plan packages for student enrollment yet. Please contact your school administrator.',
                                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],

                  const SizedBox(height: 24),

                  // 3. Coverage Period
                  Text(
                    '3. Coverage Period',
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Card(
                    elevation: 1,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Starts', style: TextStyle(fontSize: 12, color: Colors.grey)),
                                const SizedBox(height: 2),
                                Text(
                                  dateFormatter.format(_startDate),
                                  style: const TextStyle(fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.arrow_forward, color: Colors.grey),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                const Text('Expires', style: TextStyle(fontSize: 12, color: Colors.grey)),
                                const SizedBox(height: 2),
                                Text(
                                  dateFormatter.format(_endDate),
                                  style: const TextStyle(fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Financial & Activation Notice
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.blue.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.blue.withOpacity(0.3)),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.security, size: 18, color: Colors.blue),
                            SizedBox(width: 8),
                            Text(
                              'Coverage Activation Policy',
                              style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue),
                            ),
                          ],
                        ),
                        SizedBox(height: 6),
                        Text(
                          'Submitting this enrolment will register the request with the school. Once approved, premium payment can be completed. Coverage is confirmed only upon direct insurer policy activation.',
                          style: TextStyle(fontSize: 12, height: 1.35),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 32),

                  // Submit Button
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton.icon(
                      onPressed: state.isActionLoading ? null : _submit,
                      icon: state.isActionLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Icon(Icons.check_circle),
                      label: Text(
                        state.isActionLoading
                            ? 'SUBMITTING...'
                            : (_showManualEntry
                                ? 'SUBMIT ENROLMENT'
                                : (_selectedStudentIds.length <= 1
                                    ? 'SUBMIT ENROLMENT'
                                    : 'SUBMIT ENROLMENT (${_selectedStudentIds.length} STUDENTS)')),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: theme.colorScheme.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
