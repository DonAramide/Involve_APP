// lib/features/school/presentation/pages/attendance_dashboard_page.dart
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:collection/collection.dart';
import '../../../../core/utils/api_error_message.dart';
import '../../../../core/widgets/invify_loading_indicator.dart';
import '../bloc/school_bloc.dart';
import '../bloc/school_state.dart';
import '../../domain/entities/attendance_models.dart';
import '../../domain/entities/school_entities.dart';
import '../../domain/repositories/school_repository.dart';
import '../../data/services/attendance_api_service.dart';
import '../../data/services/attendance_local_storage.dart';
import 'school_setup_page.dart';

class AttendanceDashboardPage extends StatefulWidget {
  final String? initialClassName;

  const AttendanceDashboardPage({super.key, this.initialClassName});

  @override
  State<AttendanceDashboardPage> createState() => _AttendanceDashboardPageState();
}

class _AttendanceDashboardPageState extends State<AttendanceDashboardPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final AttendanceApiService _apiService = AttendanceApiService();

  // State: Classes & Selection
  String? _selectedClass;
  DateTime _selectedDate = DateTime.now();
  String? _selectedSubject;
  List<String> _availableClasses = [];
  Map<String, int> _classStudentCounts = {};
  List<Map<String, dynamic>> _assignments = [];

  // State: Tab 1 - Register
  bool _isLoadingRegister = false;
  String? _registerError;
  AttendanceRegisterData? _registerData;
  List<AttendanceStudent> _draftStudents = [];
  bool _isOfflineRegister = false;
  int _pendingSyncCount = 0;

  // State: Tab 2 - Report
  bool _isLoadingReport = false;
  String? _reportError;
  ClassAttendanceReport? _reportData;
  final DateTime _reportPeriodFrom = DateTime.now().subtract(const Duration(days: 90));
  final DateTime _reportPeriodTo = DateTime.now();

  // State: Tab 3 - Student History
  bool _isLoadingHistory = false;
  String? _historyError;
  String? _selectedStudentId;
  String? _selectedStudentName;
  Map<String, dynamic>? _studentHistoryData;
  final TextEditingController _studentSearchController = TextEditingController();

  final DateFormat _dateFormat = DateFormat('yyyy-MM-dd');
  final DateFormat _displayDateFormat = DateFormat('EEE, MMM d, yyyy');

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (_tabController.index == 2 && !_tabController.indexIsChanging) {
        _syncStudentHistoryForCurrentClass();
      }
    });
    _initializeClasses();
    _refreshSyncStatus();
  }

  Future<void> _refreshSyncStatus() async {
    final count = await AttendanceLocalStorage.getPendingSyncCount();
    if (mounted) setState(() => _pendingSyncCount = count);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _studentSearchController.dispose();
    super.dispose();
  }

  Map<String, int> _computeClassStudentCounts(List<SchoolClass> classes, List<Student> students) {
    final counts = <String, int>{};
    for (final c in classes) {
      final cName = c.name.trim();
      if (cName.isEmpty) continue;
      final selClassClean = cName.toLowerCase();
      final count = students.where((s) {
        if (s.isGraduated) return false;
        if (s.classId == c.id) return true;
        final cObj = classes.firstWhereOrNull((cl) => cl.id == s.classId);
        if (cObj != null &&
            (cObj.name.trim().toLowerCase() == selClassClean ||
             cObj.name.replaceAll(RegExp(r'\s+'), '').toLowerCase() == selClassClean.replaceAll(RegExp(r'\s+'), ''))) {
          return true;
        }
        return false;
      }).length;
      counts[cName] = count;
    }
    return counts;
  }

  List<AttendanceStudent> _getStudentsForCurrentClass() {
    if (_selectedClass == null) return const [];

    final schoolState = context.read<SchoolBloc>().state;
    final classes = schoolState.classes;
    final allStudents = schoolState.students;
    final selClassClean = _selectedClass!.trim().toLowerCase();

    final matchingClass = classes.firstWhereOrNull(
      (c) => c.name.trim().toLowerCase() == selClassClean ||
             c.name.replaceAll(RegExp(r'\s+'), '').toLowerCase() == selClassClean.replaceAll(RegExp(r'\s+'), ''),
    );

    List<Student> localStudents = [];
    if (matchingClass != null && matchingClass.id != null) {
      localStudents = allStudents
          .where((s) => s.classId == matchingClass.id && !s.isGraduated)
          .toList();
    }
    if (localStudents.isEmpty) {
      localStudents = allStudents.where((s) {
        if (s.isGraduated) return false;
        final cObj = classes.firstWhereOrNull((c) => c.id == s.classId);
        if (cObj != null &&
            (cObj.name.trim().toLowerCase() == selClassClean ||
             cObj.name.replaceAll(RegExp(r'\s+'), '').toLowerCase() == selClassClean.replaceAll(RegExp(r'\s+'), ''))) {
          return true;
        }
        return false;
      }).toList();
    }

    if (localStudents.isNotEmpty) {
      return localStudents.map((s) {
        return AttendanceStudent(
          id: s.id?.toString() ?? s.admissionNumber,
          fullName: s.fullName,
          admissionNumber: s.admissionNumber,
          currentClass: _selectedClass!,
          status: AttendanceStatus.unrecorded,
        );
      }).toList();
    }

    if (_draftStudents.isNotEmpty &&
        _draftStudents.first.currentClass.trim().toLowerCase() == selClassClean) {
      return _draftStudents;
    }

    return const [];
  }

  void _syncStudentHistoryForCurrentClass({bool forceRefresh = false}) {
    if (_selectedClass == null) return;
    final classStudents = _getStudentsForCurrentClass();
    if (classStudents.isEmpty) {
      if (mounted) {
        setState(() {
          _selectedStudentId = null;
          _selectedStudentName = null;
          _studentHistoryData = null;
        });
      }
      return;
    }

    final activeStudent = classStudents.firstWhereOrNull(
      (s) => s.id == _selectedStudentId || s.admissionNumber == _selectedStudentId,
    );

    if (activeStudent != null && !forceRefresh && _studentHistoryData != null) {
      return;
    }

    final target = activeStudent ?? classStudents.first;
    _loadStudentHistory(target.id, target.fullName);
  }

  void _syncClassesFromAcademicSetup(SchoolState schoolState) {
    if (!mounted) return;
    final academicClassNames = schoolState.classes
        .map((c) => c.name.trim())
        .where((n) => n.isNotEmpty)
        .toSet()
        .toList()
      ..sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));

    final counts = _computeClassStudentCounts(schoolState.classes, schoolState.students);

    List<String> finalClasses = academicClassNames;
    if (_assignments.isNotEmpty) {
      final assignedNames = _assignments
          .map((a) => (a['class_name'] ?? a['className'])?.toString().trim().toLowerCase())
          .whereType<String>()
          .toSet();
      if (assignedNames.isNotEmpty) {
        final filtered = academicClassNames
            .where((c) => assignedNames.contains(c.toLowerCase()))
            .toList();
        if (filtered.isNotEmpty) {
          finalClasses = filtered;
        }
      }
    }

    if (!listEquals(_availableClasses, finalClasses) || !mapEquals(_classStudentCounts, counts)) {
      setState(() {
        _availableClasses = finalClasses;
        _classStudentCounts = counts;
        if (_selectedClass == null || !_availableClasses.contains(_selectedClass)) {
          _selectedClass = _availableClasses.isNotEmpty ? _availableClasses.first : null;
        }
      });
      if (_selectedClass != null) {
        _loadRegister();
      }
    }
  }

  Future<void> _initializeClasses() async {
    final schoolBloc = context.read<SchoolBloc>();
    final repo = context.read<SchoolRepository>();

    // 1. Dispatch event to ensure SchoolBloc has loaded full academic data
    schoolBloc.add(LoadSchoolData());

    // 2. Fetch classes and students immediately and directly from local SQLite DB (Academic Setup)
    List<SchoolClass> academicClasses = [];
    List<Student> allStudents = [];
    try {
      academicClasses = await repo.getClasses();
      allStudents = await repo.getStudentSummaries();
    } catch (e) {
      debugPrint('Error loading classes from SchoolRepository: $e');
    }

    // 3. Fallback to SchoolBloc state if repository was empty
    if (academicClasses.isEmpty) {
      academicClasses = schoolBloc.state.classes;
    }
    if (allStudents.isEmpty) {
      allStudents = schoolBloc.state.students;
    }

    final counts = _computeClassStudentCounts(academicClasses, allStudents);

    // 4. Fetch class assignments from backend to see if teacher has restrictions
    try {
      final assignments = await _apiService.getAssignments();
      _assignments = assignments;
    } catch (_) {
      // Graceful fallback if offline or table uninitialized
    }

    final academicClassNames = academicClasses
        .map((c) => c.name.trim())
        .where((n) => n.isNotEmpty)
        .toSet()
        .toList()
      ..sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));

    List<String> finalClasses = academicClassNames;
    if (_assignments.isNotEmpty) {
      final assignedNames = _assignments
          .map((a) => (a['class_name'] ?? a['className'])?.toString().trim().toLowerCase())
          .whereType<String>()
          .toSet();
      if (assignedNames.isNotEmpty) {
        final filtered = academicClassNames
            .where((c) => assignedNames.contains(c.toLowerCase()))
            .toList();
        if (filtered.isNotEmpty) {
          finalClasses = filtered;
        }
      }
    }

    if (!mounted) return;
    setState(() {
      _availableClasses = finalClasses;
      _classStudentCounts = counts;
      if (widget.initialClassName != null && _availableClasses.contains(widget.initialClassName)) {
        _selectedClass = widget.initialClassName;
      } else if (_selectedClass == null || !_availableClasses.contains(_selectedClass)) {
        _selectedClass = _availableClasses.isNotEmpty ? _availableClasses.first : null;
      }
    });

    if (_selectedClass != null) {
      _loadRegister();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tab 1: Register Operations (Offline First)
  // ─────────────────────────────────────────────────────────────────────────────

  List<AttendanceStudent> _reconcileRegisterStudents({
    required List<AttendanceStudent> savedStudents,
    required List<AttendanceStudent> enrolledStudents,
    required String className,
  }) {
    if (enrolledStudents.isEmpty) return savedStudents;

    final result = <AttendanceStudent>[];
    final savedCopy = List<AttendanceStudent>.from(savedStudents);

    // 1. For every active enrolled student in this class, ensure they are present in roster
    for (final enrolled in enrolledStudents) {
      final match = savedCopy.firstWhereOrNull((s) {
        final sid = s.id.trim().toLowerCase();
        final adm = s.admissionNumber.trim().toLowerCase();
        final eid = enrolled.id.trim().toLowerCase();
        final eAdm = enrolled.admissionNumber.trim().toLowerCase();
        final sName = s.fullName.trim().toLowerCase();
        final eName = enrolled.fullName.trim().toLowerCase();
        return sid == eid ||
            (adm.isNotEmpty && adm == eAdm) ||
            (sName.isNotEmpty && sName == eName);
      });

      if (match != null) {
        // Keep their recorded attendance status and notes, but use latest full name & adm
        result.add(match.copyWith(
          fullName: enrolled.fullName,
          admissionNumber: enrolled.admissionNumber.isNotEmpty ? enrolled.admissionNumber : match.admissionNumber,
          currentClass: className,
        ));
      } else {
        // Student newly added to class: append as unrecorded
        result.add(enrolled.copyWith(
          status: AttendanceStatus.unrecorded,
          currentClass: className,
        ));
      }
    }

    // 2. Include any students from saved register who might not be in active enrolled list (e.g. historical records)
    for (final s in savedCopy) {
      final alreadyInResult = result.any((r) {
        final rid = r.id.trim().toLowerCase();
        final radm = r.admissionNumber.trim().toLowerCase();
        final sid = s.id.trim().toLowerCase();
        final sadm = s.admissionNumber.trim().toLowerCase();
        final rName = r.fullName.trim().toLowerCase();
        final sName = s.fullName.trim().toLowerCase();
        return rid == sid || (radm.isNotEmpty && radm == sadm) || (rName.isNotEmpty && rName == sName);
      });
      if (!alreadyInResult) {
        result.add(s);
      }
    }

    return result;
  }

  Future<void> _loadRegister() async {
    if (_selectedClass == null) return;
    final schoolBloc = context.read<SchoolBloc>();
    final repo = context.read<SchoolRepository>();
    setState(() {
      _isLoadingRegister = true;
      _registerError = null;
    });

    final dateStr = _dateFormat.format(_selectedDate);

    // Always resolve current active enrolled students from Academic Setup
    final schoolState = schoolBloc.state;
    List<SchoolClass> classes = schoolState.classes;
    List<Student> allStudents = schoolState.students;
    if (classes.isEmpty || allStudents.isEmpty) {
      try {
        if (classes.isEmpty) classes = await repo.getClasses();
        if (allStudents.isEmpty) allStudents = await repo.getStudentSummaries();
      } catch (_) {}
    }

    final selClassClean = _selectedClass!.trim().toLowerCase();

    final matchingClass = classes.firstWhereOrNull(
      (c) => c.name.trim().toLowerCase() == selClassClean ||
             c.name.replaceAll(RegExp(r'\s+'), '').toLowerCase() == selClassClean.replaceAll(RegExp(r'\s+'), ''),
    );

    List<Student> localStudents = [];
    if (matchingClass != null && matchingClass.id != null) {
      localStudents = allStudents
          .where((s) => s.classId == matchingClass.id && !s.isGraduated)
          .toList();
    }

    if (localStudents.isEmpty) {
      localStudents = allStudents.where((s) {
        if (s.isGraduated) return false;
        final cObj = classes.firstWhereOrNull((c) => c.id == s.classId);
        if (cObj != null &&
            (cObj.name.trim().toLowerCase() == selClassClean ||
             cObj.name.replaceAll(RegExp(r'\s+'), '').toLowerCase() == selClassClean.replaceAll(RegExp(r'\s+'), ''))) {
          return true;
        }
        return false;
      }).toList();
    }

    final enrolledStudents = localStudents.map((s) {
      return AttendanceStudent(
        id: s.id?.toString() ?? s.admissionNumber,
        fullName: s.fullName,
        admissionNumber: s.admissionNumber,
        currentClass: _selectedClass!,
        status: AttendanceStatus.unrecorded,
      );
    }).toList();

    // 1. FIRST: Check on-device local storage (Offline-First)
    final localReg = await AttendanceLocalStorage.getRegister(
      className: _selectedClass!,
      date: dateStr,
      subjectName: _selectedSubject,
    );

    if (localReg != null && localReg.students.isNotEmpty) {
      final isSynced = await AttendanceLocalStorage.isRegisterSynced(
        className: _selectedClass!,
        date: dateStr,
        subjectName: _selectedSubject,
      );

      final fullRoster = _reconcileRegisterStudents(
        savedStudents: localReg.students,
        enrolledStudents: enrolledStudents,
        className: _selectedClass!,
      );
      final reconciledReg = localReg.copyWith(students: fullRoster);

      if (mounted) {
        setState(() {
          _registerData = reconciledReg;
          _draftStudents = fullRoster;
          _isOfflineRegister = !isSynced;
          _isLoadingRegister = false;
        });
      }
    } else {
      final initialRoster = enrolledStudents;
      final generatedRegister = AttendanceRegisterData(
        className: _selectedClass!,
        date: dateStr,
        subjectName: _selectedSubject,
        isFinalized: false,
        students: initialRoster,
      );

      if (mounted) {
        setState(() {
          _registerData = generatedRegister;
          _draftStudents = List.from(initialRoster);
          _isOfflineRegister = true;
          _isLoadingRegister = false;
        });
      }
    }

    // 2. Non-blocking attempt to fetch cloud register to sync latest updates
    try {
      final cloudRegister = await _apiService.getRegister(
        className: _selectedClass!,
        date: dateStr,
        subjectName: _selectedSubject,
      );

      if (!mounted) return;
      if (cloudRegister.students.isNotEmpty) {
        final fullCloudRoster = _reconcileRegisterStudents(
          savedStudents: cloudRegister.students,
          enrolledStudents: enrolledStudents,
          className: _selectedClass!,
        );
        final reconciledCloud = cloudRegister.copyWith(students: fullCloudRoster);

        setState(() {
          _registerData = reconciledCloud;
          _draftStudents = fullCloudRoster;
          _isOfflineRegister = false;
          _isLoadingRegister = false;
          _registerError = null;
        });
        await AttendanceLocalStorage.saveRegister(register: reconciledCloud, isSynced: true);
      } else if (_draftStudents.isNotEmpty) {
        setState(() {
          _isLoadingRegister = false;
          _registerError = null;
        });
      } else {
        setState(() {
          _registerData = cloudRegister.copyWith(students: enrolledStudents);
          _draftStudents = List.from(enrolledStudents);
          _isLoadingRegister = false;
          _registerError = null;
        });
      }
    } catch (e) {
      if (!mounted) return;
      if (_draftStudents.isNotEmpty || _registerData != null) {
        // Keep working with on-device data seamlessly
        setState(() {
          _isLoadingRegister = false;
          _registerError = null;
          _isOfflineRegister = true;
        });
      } else {
        setState(() {
          _isLoadingRegister = false;
          _registerError = friendlyApiError(e, fallback: 'Could not load register.');
        });
      }
    } finally {
      _refreshSyncStatus();
    }
  }

  void _updateStudentStatus(int index, AttendanceStatus newStatus) {
    if (_registerData?.isFinalized == true) {
      // Must use audited correction dialog if finalized
      _showAuditedCorrectionDialog(_draftStudents[index]);
      return;
    }

    setState(() {
      _draftStudents[index] = _draftStudents[index].copyWith(status: newStatus);
    });
  }

  Future<void> _confirmBulkMarkPresent() async {
    if (_draftStudents.isEmpty) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.check_circle_outline, color: Colors.green),
            SizedBox(width: 8),
            Text('Mark All Present'),
          ],
        ),
        content: Text(
          'Are you sure you want to mark all ${_draftStudents.length} students as Present for ${_displayDateFormat.format(_selectedDate)}?\n\n'
          'Existing statuses will be updated.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.green),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    final hasUnrecorded = _draftStudents.any((s) => s.status == AttendanceStatus.unrecorded);
    if (_registerData?.isFinalized == true && !hasUnrecorded) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Cannot bulk-update an already finalized register. Use corrections.'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _draftStudents = _draftStudents.map((s) {
        if (_registerData?.isFinalized == true) {
          if (s.status == AttendanceStatus.unrecorded) {
            return s.copyWith(status: AttendanceStatus.present);
          }
          return s;
        }
        return s.copyWith(status: AttendanceStatus.present);
      }).toList();
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('All students marked Present. Remember to save or finalize.'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  Future<void> _saveRegister({required bool finalize}) async {
    if (_selectedClass == null) return;

    if (finalize) {
      final unrecordedCount =
          _draftStudents.where((s) => s.status == AttendanceStatus.unrecorded).length;
      final prompt = unrecordedCount > 0
          ? 'Warning: $unrecordedCount student(s) still have unrecorded attendance.\n\nFinalizing will lock this register for ${_displayDateFormat.format(_selectedDate)}. Future changes will require an audited reason. Proceed?'
          : 'Finalizing will lock this register for ${_displayDateFormat.format(_selectedDate)}. Future changes will require an audited reason. Proceed?';

      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Finalize Attendance Register'),
          content: Text(prompt),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: Colors.green),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Finalize'),
            ),
          ],
        ),
      );
      if (confirmed != true || !mounted) return;
    }

    setState(() => _isLoadingRegister = true);
    final dateStr = _dateFormat.format(_selectedDate);

    // 1. SAVE ON DEVICE IMMEDIATELY (Offline-First)
    final updatedRegister = AttendanceRegisterData(
      sessionId: _registerData?.sessionId,
      className: _selectedClass!,
      date: dateStr,
      teacherName: _registerData?.teacherName,
      subjectName: _selectedSubject,
      isFinalized: finalize,
      students: _draftStudents,
    );

    await AttendanceLocalStorage.saveRegister(
      register: updatedRegister,
      isSynced: false,
    );

    if (mounted) {
      setState(() {
        _registerData = updatedRegister;
        _isOfflineRegister = true;
      });
    }

    // 2. ATTEMPT CLOUD SYNC PUSH
    bool cloudSuccess = false;
    try {
      await _apiService.saveRegister(
        className: _selectedClass!,
        date: dateStr,
        students: _draftStudents,
        subjectName: _selectedSubject,
        finalize: finalize,
      );
      await AttendanceLocalStorage.markRegisterSynced(_selectedClass!, dateStr, _selectedSubject);
      cloudSuccess = true;
    } catch (_) {
      // Offline / Basic tier: saved on device safely!
      cloudSuccess = false;
    }

    await _refreshSyncStatus();
    if (!mounted) return;

    setState(() {
      _isLoadingRegister = false;
      _isOfflineRegister = !cloudSuccess;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              cloudSuccess ? Icons.cloud_done : Icons.phone_android,
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                cloudSuccess
                    ? (finalize ? 'Attendance finalized and synced with cloud!' : 'Attendance draft saved and synced with cloud!')
                    : (finalize
                        ? 'Attendance finalized on device (Offline). Will push to cloud upon sync.'
                        : 'Attendance saved on device (Offline). Will push to cloud upon sync.'),
              ),
            ),
          ],
        ),
        backgroundColor: cloudSuccess ? (finalize ? Colors.green : Colors.blueGrey) : Colors.teal.shade700,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  Future<void> _showAuditedCorrectionDialog(AttendanceStudent student) async {
    AttendanceStatus selectedStatus =
        student.status == AttendanceStatus.unrecorded ? AttendanceStatus.present : student.status;
    final reasonController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    final applied = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            title: const Text('Audited Attendance Correction'),
            content: Form(
              key: formKey,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Student: ${student.fullName}',
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    Text('Admission No: ${student.admissionNumber}',
                        style: const TextStyle(color: Colors.grey)),
                    const SizedBox(height: 16),
                    const Text('New Status:', style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: [
                        _buildStatusChoiceChip(
                          label: 'Present',
                          status: AttendanceStatus.present,
                          current: selectedStatus,
                          onSelected: () => setDialogState(() => selectedStatus = AttendanceStatus.present),
                        ),
                        _buildStatusChoiceChip(
                          label: 'Absent',
                          status: AttendanceStatus.absent,
                          current: selectedStatus,
                          onSelected: () => setDialogState(() => selectedStatus = AttendanceStatus.absent),
                        ),
                        _buildStatusChoiceChip(
                          label: 'Late',
                          status: AttendanceStatus.late,
                          current: selectedStatus,
                          onSelected: () => setDialogState(() => selectedStatus = AttendanceStatus.late),
                        ),
                        _buildStatusChoiceChip(
                          label: 'Excused',
                          status: AttendanceStatus.excused,
                          current: selectedStatus,
                          onSelected: () => setDialogState(() => selectedStatus = AttendanceStatus.excused),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: reasonController,
                      decoration: const InputDecoration(
                        labelText: 'Reason for Correction *',
                        hintText: 'e.g. Student arrived with doctor excuse note',
                        border: OutlineInputBorder(),
                      ),
                      maxLines: 2,
                      validator: (val) {
                        if (val == null || val.trim().length < 5) {
                          return 'Please provide a reason of at least 5 characters.';
                        }
                        return null;
                      },
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () async {
                  if (formKey.currentState?.validate() != true) return;
                  Navigator.pop(ctx, true);
                },
                child: const Text('Save Correction'),
              ),
            ],
          );
        },
      ),
    );

    if (applied == true) {
      if (!mounted) return;
      final dateStr = _dateFormat.format(_selectedDate);
      final reason = reasonController.text.trim();

      // 1. Update in-memory state
      final index = _draftStudents.indexWhere((s) => s.id == student.id);
      if (index != -1) {
        setState(() {
          _draftStudents[index] = _draftStudents[index].copyWith(status: selectedStatus);
        });
      }

      // 2. Save to local device storage immediately
      final updatedReg = _registerData?.copyWith(students: _draftStudents) ??
          AttendanceRegisterData(
            className: _selectedClass!,
            date: dateStr,
            isFinalized: true,
            students: _draftStudents,
          );

      await AttendanceLocalStorage.saveRegister(
        register: updatedReg,
        isSynced: false,
      );

      await AttendanceLocalStorage.saveLocalCorrection({
        'className': _selectedClass!,
        'date': dateStr,
        'studentId': student.id,
        'studentName': student.fullName,
        'previousStatus': student.status.toApiString(),
        'newStatus': selectedStatus.toApiString(),
        'reason': reason,
      });

      // 3. Try to push correction to cloud if session exists
      final sessionId = _registerData?.sessionId;
      bool cloudSuccess = false;
      if (sessionId != null) {
        try {
          await _apiService.correctEntry(
            sessionId: sessionId,
            studentId: student.id,
            newStatus: selectedStatus,
            reason: reason,
          );
          cloudSuccess = true;
          await AttendanceLocalStorage.markRegisterSynced(_selectedClass!, dateStr, _selectedSubject);
        } catch (_) {
          cloudSuccess = false;
        }
      }

      await _refreshSyncStatus();
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(cloudSuccess
              ? 'Attendance correction recorded and synced with cloud.'
              : 'Attendance correction saved on device (Offline). Will push upon sync.'),
          backgroundColor: cloudSuccess ? Colors.green : Colors.teal.shade700,
        ),
      );
    }
  }

  Widget _buildStatusChoiceChip({
    required String label,
    required AttendanceStatus status,
    required AttendanceStatus current,
    required VoidCallback onSelected,
  }) {
    final isSelected = current == status;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => onSelected(),
      selectedColor: _getStatusColor(status).withValues(alpha: 0.3),
      labelStyle: TextStyle(
        color: isSelected ? _getStatusColor(status) : null,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tab 2: Class Attendance Report (Reference 1 - Offline First)
  // ─────────────────────────────────────────────────────────────────────────────

  Future<void> _loadReport() async {
    if (_selectedClass == null) return;
    setState(() {
      _isLoadingReport = true;
      _reportError = null;
    });

    // 1. Try cloud report first
    try {
      final report = await _apiService.getClassReport(
        className: _selectedClass!,
        periodFrom: _dateFormat.format(_reportPeriodFrom),
        periodTo: _dateFormat.format(_reportPeriodTo),
        subjectName: _selectedSubject,
      );

      if (!mounted) return;
      setState(() {
        _reportData = report;
        _isLoadingReport = false;
      });
      return;
    } catch (_) {
      // Cloud not reachable / offline / basic tier
    }

    // 2. Compute report directly on-device from local attendance registers!
    final localReport = await AttendanceLocalStorage.computeLocalReport(
      className: _selectedClass!,
    );

    if (!mounted) return;
    if (localReport != null && localReport.students.isNotEmpty) {
      setState(() {
        _reportData = localReport;
        _isLoadingReport = false;
        _reportError = null;
      });
    } else {
      // Fallback: build placeholder report from SchoolBloc students
      final schoolState = context.read<SchoolBloc>().state;
      final selClassClean = _selectedClass!.trim().toLowerCase();
      final matchingClass = schoolState.classes.firstWhereOrNull(
        (c) => c.name.trim().toLowerCase() == selClassClean ||
               c.name.replaceAll(RegExp(r'\s+'), '').toLowerCase() == selClassClean.replaceAll(RegExp(r'\s+'), ''),
      );
      final students = schoolState.students.where((s) {
        if (s.isGraduated) return false;
        if (matchingClass != null && s.classId == matchingClass.id) return true;
        return false;
      }).toList();

      setState(() {
        _reportData = ClassAttendanceReport(
          schoolName: 'School',
          periodFrom: _dateFormat.format(_reportPeriodFrom),
          periodTo: _dateFormat.format(_reportPeriodTo),
          enrolledStudents: students.length,
          instructionalDays: 0,
          overallRate: null,
          thresholdPercent: 80.0,
          belowThresholdCount: 0,
          months: const [],
          students: students.map((s) => StudentReportItem(
            studentId: s.id?.toString() ?? s.admissionNumber,
            studentName: s.fullName,
            admissionNumber: s.admissionNumber,
            overallRate: null,
            belowThreshold: false,
            monthlyRates: const {},
          )).toList(),
        );
        _isLoadingReport = false;
        _reportError = null;
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tab 3: Student History
  // ─────────────────────────────────────────────────────────────────────────────

  Future<void> _loadStudentHistory(String studentId, String studentName) async {
    setState(() {
      _selectedStudentId = studentId;
      _selectedStudentName = studentName;
      _isLoadingHistory = true;
      _historyError = null;
    });

    try {
      final data = await _apiService.getStudentHistory(
        studentId: studentId,
        periodFrom: _dateFormat.format(DateTime.now().subtract(const Duration(days: 90))),
        periodTo: _dateFormat.format(DateTime.now()),
      );

      if (!mounted) return;
      setState(() {
        _studentHistoryData = data;
        _isLoadingHistory = false;
      });
      return;
    } catch (_) {
      // Cloud not reachable: build student history from local records
    }

    final registers = await AttendanceLocalStorage.getRegistersForClass(_selectedClass ?? '');
    final logs = <Map<String, dynamic>>[];
    int present = 0;
    int absent = 0;
    int lateCount = 0;
    int excused = 0;

    for (final reg in registers) {
      final entry = reg.students.firstWhereOrNull((s) {
        final sid = s.id.trim().toLowerCase();
        final adm = s.admissionNumber.trim().toLowerCase();
        final targetId = studentId.trim().toLowerCase();
        final sName = s.fullName.trim().toLowerCase();
        final targetName = studentName.trim().toLowerCase();
        return sid == targetId || adm == targetId || (sName.isNotEmpty && sName == targetName);
      });
      if (entry != null && entry.status != AttendanceStatus.unrecorded) {
        logs.add({
          'id': '${reg.className}_${reg.date}_$studentId',
          'date': reg.date,
          'status': entry.status.toApiString(),
          'className': reg.className,
          'subjectName': reg.subjectName,
          'notes': entry.notes,
        });

        switch (entry.status) {
          case AttendanceStatus.present:
            present++;
            break;
          case AttendanceStatus.absent:
            absent++;
            break;
          case AttendanceStatus.late:
            lateCount++;
            break;
          case AttendanceStatus.excused:
            excused++;
            break;
          case AttendanceStatus.unrecorded:
            break;
        }
      }
    }

    logs.sort((a, b) => (b['date'] as String).compareTo(a['date'] as String));

    final attended = present + lateCount;
    final denominator = attended + absent;
    final ratePercent = denominator > 0 ? ((attended / denominator) * 100.0) : null;

    final localHistory = {
      'student': {
        'id': studentId,
        'name': studentName,
        'fullName': studentName,
        'className': _selectedClass ?? '',
      },
      'summary': {
        'studentId': studentId,
        'overall': {
          'ratePercent': ratePercent,
          'counts': {
            'present': present,
            'absent': absent,
            'late': lateCount,
            'excused': excused,
            'unrecorded': 0,
          },
        },
      },
      'metrics': {
        'ratePercent': ratePercent,
        'presentDays': present,
        'absentDays': absent,
        'lateDays': lateCount,
        'excusedDays': excused,
      },
      'dailyLogs': logs,
      'logs': logs,
    };

    if (!mounted) return;
    setState(() {
      _studentHistoryData = localHistory;
      _isLoadingHistory = false;
      _historyError = null;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Cloud Sync Handler
  // ─────────────────────────────────────────────────────────────────────────────

  Future<void> _syncPendingWithCloud() async {
    final pendingRegisters = await AttendanceLocalStorage.getPendingSyncRegisters();
    final count = await AttendanceLocalStorage.getPendingSyncCount();
    if (count == 0 && pendingRegisters.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('All attendance records are up to date and synced with cloud.'),
            backgroundColor: Colors.green,
          ),
        );
      }
      return;
    }

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Pushing ${pendingRegisters.length} offline register(s) to cloud...'),
        duration: const Duration(seconds: 2),
      ),
    );

    int synced = 0;
    int failed = 0;

    for (final reg in pendingRegisters) {
      try {
        await _apiService.saveRegister(
          className: reg.className,
          date: reg.date,
          students: reg.students,
          subjectName: reg.subjectName,
          finalize: reg.isFinalized,
        );
        await AttendanceLocalStorage.markRegisterSynced(reg.className, reg.date, reg.subjectName);
        synced++;
      } catch (e) {
        failed++;
      }
    }

    await _refreshSyncStatus();
    if (!mounted) return;

    if (failed == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Successfully synced $synced register(s) with cloud!'),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Synced $synced register(s). $failed failed (will retry when network is available).'),
          backgroundColor: Colors.orange,
        ),
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Main Build
  // ─────────────────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('School Attendance'),
        elevation: 0,
        actions: [
          IconButton(
            tooltip: 'Academic Setup',
            icon: const Icon(Icons.tune),
            onPressed: () async {
              await Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const SchoolSetupPage()),
              );
              _initializeClasses();
            },
          ),
          IconButton(
            tooltip: 'Sync with Cloud',
            icon: Stack(
              children: [
                const Icon(Icons.cloud_sync_outlined),
                if (_pendingSyncCount > 0)
                  Positioned(
                    right: 0,
                    top: 0,
                    child: Container(
                      padding: const EdgeInsets.all(2),
                      decoration: const BoxDecoration(
                        color: Colors.orange,
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                      child: Text(
                        '$_pendingSyncCount',
                        style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            ),
            onPressed: _syncPendingWithCloud,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.calendar_today), text: 'Register'),
            Tab(icon: Icon(Icons.analytics), text: 'Class Report'),
            Tab(icon: Icon(Icons.history), text: 'Student History'),
          ],
        ),
      ),
      body: BlocListener<SchoolBloc, SchoolState>(
        listener: (context, schoolState) {
          _syncClassesFromAcademicSetup(schoolState);
        },
        child: _availableClasses.isEmpty
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.school_outlined, size: 64, color: theme.colorScheme.primary.withValues(alpha: 0.6)),
                      const SizedBox(height: 16),
                      const Text(
                        'No Classes in Academic Setup',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'School Attendance requires classes from your Academic Setup. Please add classes in Academic Setup first.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.grey),
                      ),
                      const SizedBox(height: 20),
                      FilledButton.icon(
                        icon: const Icon(Icons.settings),
                        label: const Text('Open Academic Setup'),
                        onPressed: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const SchoolSetupPage()),
                          );
                          _initializeClasses();
                        },
                      ),
                      const SizedBox(height: 8),
                      TextButton.icon(
                        icon: const Icon(Icons.refresh),
                        label: const Text('Refresh Classes'),
                        onPressed: _initializeClasses,
                      ),
                    ],
                  ),
                ),
              )
            : Column(
                children: [
                  // Global Selector Bar (Class & Date)
                  _buildTopSelectorBar(theme),

                  // Tab views
                  Expanded(
                    child: TabBarView(
                      controller: _tabController,
                      children: [
                        _buildRegisterTab(theme),
                        _buildReportTab(theme),
                        _buildHistoryTab(theme),
                      ],
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildTopSelectorBar(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: theme.cardColor,
        border: Border(bottom: BorderSide(color: theme.dividerColor.withValues(alpha: 0.2))),
      ),
      child: Row(
        children: [
          // Class Dropdown
          Expanded(
            flex: 4,
            child: DropdownButtonFormField<String>(
              key: ValueKey('class-picker-${_selectedClass ?? "none"}-${_availableClasses.join(",")}-${_classStudentCounts.entries.map((e) => "${e.key}:${e.value}").join(",")}'),
              initialValue: _availableClasses.contains(_selectedClass) ? _selectedClass : null,
              decoration: const InputDecoration(
                labelText: 'Class / Form',
                isDense: true,
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(),
              ),
              items: _availableClasses.map((c) {
                final count = _classStudentCounts[c] ?? 0;
                return DropdownMenuItem(
                  value: c,
                  child: Text('$c ($count)', overflow: TextOverflow.ellipsis),
                );
              }).toList(),
              onChanged: (val) {
                if (val != null && val != _selectedClass) {
                  setState(() {
                    _selectedClass = val;
                    _selectedStudentId = null;
                    _selectedStudentName = null;
                    _studentHistoryData = null;
                  });
                  _loadRegister();
                  if (_tabController.index == 1) _loadReport();
                  if (_tabController.index == 2) _syncStudentHistoryForCurrentClass();
                }
              },
            ),
          ),
          const SizedBox(width: 12),

          // Date Picker Button
          Expanded(
            flex: 5,
            child: InkWell(
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _selectedDate,
                  firstDate: DateTime(2020),
                  lastDate: DateTime(2035),
                );
                if (picked != null && picked != _selectedDate) {
                  setState(() => _selectedDate = picked);
                  _loadRegister();
                }
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  border: Border.all(color: theme.dividerColor),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.calendar_month, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _displayDateFormat.format(_selectedDate),
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          const SizedBox(width: 8),
          IconButton(
            tooltip: 'Refresh',
            icon: const Icon(Icons.refresh),
            onPressed: () {
              if (_tabController.index == 0) _loadRegister();
              if (_tabController.index == 1) _loadReport();
              if (_tabController.index == 2) _syncStudentHistoryForCurrentClass(forceRefresh: true);
            },
          ),
        ],
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tab 1: Register View
  // ─────────────────────────────────────────────────────────────────────────────

  Widget _buildRegisterTab(ThemeData theme) {
    if (_isLoadingRegister) {
      return const Center(child: InvifyLoadingIndicator(message: 'LOADING ATTENDANCE REGISTER...'));
    }

    if (_registerError != null && _draftStudents.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 12),
              Text(_registerError!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _loadRegister,
                icon: const Icon(Icons.refresh),
                label: const Text('Try Again'),
              ),
            ],
          ),
        ),
      );
    }

    if (_draftStudents.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.people_outline, size: 48, color: Colors.grey),
              const SizedBox(height: 12),
              Text(
                'No students found enrolled in ${_selectedClass ?? "this class"}.',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              const Text(
                'Enrol students or select another class.',
                style: TextStyle(color: Colors.grey),
              ),
            ],
          ),
        ),
      );
    }

    final isFinalized = _registerData?.isFinalized == true;
    final presentCount = _draftStudents.where((s) => s.status == AttendanceStatus.present).length;
    final absentCount = _draftStudents.where((s) => s.status == AttendanceStatus.absent).length;
    final lateCount = _draftStudents.where((s) => s.status == AttendanceStatus.late).length;
    final excusedCount = _draftStudents.where((s) => s.status == AttendanceStatus.excused).length;
    final unrecordedCount = _draftStudents.where((s) => s.status == AttendanceStatus.unrecorded).length;

    return Column(
      children: [
        if (_registerError != null)
          Container(
            color: Colors.amber.shade100,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Row(
              children: [
                Icon(Icons.info_outline, size: 16, color: Colors.amber.shade900),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Operating on-device: $_registerError',
                    style: TextStyle(fontSize: 11, color: Colors.amber.shade900),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        // Status and Action Bar
        Container(
          color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.35),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              // Finalized Badge
              // Finalized / Partial / Draft Badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: !isFinalized
                      ? Colors.orange.withValues(alpha: 0.2)
                      : (unrecordedCount > 0
                          ? Colors.amber.withValues(alpha: 0.2)
                          : Colors.green.withValues(alpha: 0.2)),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(
                    color: !isFinalized
                        ? Colors.orange
                        : (unrecordedCount > 0 ? Colors.amber.shade700 : Colors.green),
                  ),
                ),
                child: Text(
                  !isFinalized
                      ? 'DRAFT'
                      : (unrecordedCount > 0 ? 'PARTIAL ($unrecordedCount PENDING)' : 'FINALIZED'),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: !isFinalized
                        ? Colors.orange.shade900
                        : (unrecordedCount > 0 ? Colors.amber.shade900 : Colors.green.shade800),
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // On-Device / Cloud Synced Badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _isOfflineRegister ? Colors.blueGrey.withValues(alpha: 0.15) : Colors.blue.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: _isOfflineRegister ? Colors.blueGrey : Colors.blue),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      _isOfflineRegister ? Icons.phone_android : Icons.cloud_done,
                      size: 13,
                      color: _isOfflineRegister ? Colors.blueGrey.shade800 : Colors.blue.shade800,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      _isOfflineRegister ? 'On-Device' : 'Cloud Synced',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: _isOfflineRegister ? Colors.blueGrey.shade800 : Colors.blue.shade800,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),

              // Bulk Present Button
              if (!isFinalized || unrecordedCount > 0) ...[
                OutlinedButton.icon(
                  onPressed: _confirmBulkMarkPresent,
                  icon: const Icon(Icons.done_all, size: 16),
                  label: const Text('Mark All Present'),
                  style: OutlinedButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    foregroundColor: Colors.green,
                  ),
                ),
                const SizedBox(width: 8),
              ],

              // Save Draft Button
              if (!isFinalized || unrecordedCount > 0)
                ElevatedButton(
                  onPressed: () => _saveRegister(finalize: false),
                  style: ElevatedButton.styleFrom(visualDensity: VisualDensity.compact),
                  child: const Text('Save Draft'),
                ),
              const SizedBox(width: 8),

              // Finalize Button
              if (!isFinalized || unrecordedCount > 0)
                FilledButton(
                  onPressed: () => _saveRegister(finalize: true),
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.green,
                    visualDensity: VisualDensity.compact,
                  ),
                  child: const Text('Finalize'),
                ),
            ],
          ),
        ),

        // KPI Summary Bar
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildMetricChip('Present', presentCount, Colors.green),
              _buildMetricChip('Absent', absentCount, Colors.red),
              _buildMetricChip('Late', lateCount, Colors.amber.shade800),
              _buildMetricChip('Excused', excusedCount, Colors.indigo),
              if (unrecordedCount > 0)
                _buildMetricChip('Unmarked', unrecordedCount, Colors.grey),
            ],
          ),
        ),
        const Divider(height: 1),

        // Students List
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.only(bottom: 24),
            itemCount: _draftStudents.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (ctx, index) {
              final student = _draftStudents[index];
              return _buildStudentRegisterTile(student, index, isFinalized, theme);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildMetricChip(String label, int count, Color color) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          '$count',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: color),
        ),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
      ],
    );
  }

  Widget _buildStudentRegisterTile(
    AttendanceStudent student,
    int index,
    bool isFinalized,
    ThemeData theme,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          // S/N & Details
          CircleAvatar(
            radius: 14,
            backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.1),
            child: Text(
              '${index + 1}',
              style: TextStyle(fontSize: 11, color: theme.colorScheme.primary, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  student.fullName,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                ),
                Text(
                  'Adm: ${student.admissionNumber.isNotEmpty ? student.admissionNumber : "N/A"}',
                  style: const TextStyle(color: Colors.grey, fontSize: 11),
                ),
              ],
            ),
          ),

          // Status Button Group or Correction Pill
          if (isFinalized && student.status != AttendanceStatus.unrecorded) ...[
            InkWell(
              onTap: () => _showAuditedCorrectionDialog(student),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: _getStatusColor(student.status).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: _getStatusColor(student.status)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      student.status.name.toUpperCase(),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: _getStatusColor(student.status),
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.edit, size: 12, color: Colors.grey),
                  ],
                ),
              ),
            ),
          ] else ...[
            _buildStatusTogglePill(
              label: 'P',
              status: AttendanceStatus.present,
              current: student.status,
              onTap: () => _updateStudentStatus(index, AttendanceStatus.present),
            ),
            const SizedBox(width: 4),
            _buildStatusTogglePill(
              label: 'A',
              status: AttendanceStatus.absent,
              current: student.status,
              onTap: () => _updateStudentStatus(index, AttendanceStatus.absent),
            ),
            const SizedBox(width: 4),
            _buildStatusTogglePill(
              label: 'L',
              status: AttendanceStatus.late,
              current: student.status,
              onTap: () => _updateStudentStatus(index, AttendanceStatus.late),
            ),
            const SizedBox(width: 4),
            _buildStatusTogglePill(
              label: 'E',
              status: AttendanceStatus.excused,
              current: student.status,
              onTap: () => _updateStudentStatus(index, AttendanceStatus.excused),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStatusTogglePill({
    required String label,
    required AttendanceStatus status,
    required AttendanceStatus current,
    required VoidCallback onTap,
  }) {
    final isSelected = current == status;
    final color = _getStatusColor(status);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(4),
      child: Container(
        width: 32,
        height: 32,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isSelected ? color : Colors.transparent,
          border: Border.all(color: isSelected ? color : Colors.grey.shade400),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: isSelected ? Colors.white : Colors.grey.shade700,
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(AttendanceStatus status) {
    switch (status) {
      case AttendanceStatus.present:
        return Colors.green;
      case AttendanceStatus.absent:
        return Colors.red;
      case AttendanceStatus.late:
        return Colors.orange.shade800;
      case AttendanceStatus.excused:
        return Colors.indigo;
      case AttendanceStatus.unrecorded:
        return Colors.grey;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tab 2: Class Attendance Report View (Reference Image 1)
  // ─────────────────────────────────────────────────────────────────────────────

  Widget _buildReportTab(ThemeData theme) {
    if (_reportData == null && !_isLoadingReport && _reportError == null) {
      // Trigger load on first display
      _loadReport();
    }

    if (_isLoadingReport) {
      return const Center(child: InvifyLoadingIndicator(message: 'GENERATING ATTENDANCE REPORT...'));
    }

    if (_reportError != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 12),
              Text(_reportError!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _loadReport,
                icon: const Icon(Icons.refresh),
                label: const Text('Try Again'),
              ),
            ],
          ),
        ),
      );
    }

    final report = _reportData;
    if (report == null) {
      return const Center(child: Text('No report generated.'));
    }

    final hasWarnings = report.belowThresholdCount > 0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Warning Banner if students are below threshold
          if (hasWarnings)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.1),
                border: Border.all(color: Colors.red),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: Colors.red, size: 28),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      '${report.belowThresholdCount} student(s) have fallen below the minimum ${report.thresholdPercent.toStringAsFixed(0)}% attendance threshold.',
                      style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),

          // 4 KPI Summary Cards
          Row(
            children: [
              Expanded(
                child: _buildReportKpiCard(
                  title: 'ENROLLED',
                  value: '${report.enrolledStudents}',
                  icon: Icons.people,
                  color: Colors.blue,
                  theme: theme,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildReportKpiCard(
                  title: 'WORKING DAYS',
                  value: '${report.instructionalDays}',
                  icon: Icons.calendar_today,
                  color: Colors.teal,
                  theme: theme,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _buildReportKpiCard(
                  title: 'CLASS RATE',
                  value: report.overallRate != null
                      ? '${report.overallRate!.toStringAsFixed(1)}%'
                      : 'N/A',
                  icon: Icons.percent,
                  color: (report.overallRate ?? 0) >= report.thresholdPercent ? Colors.green : Colors.red,
                  theme: theme,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildReportKpiCard(
                  title: 'CRITICAL (<${report.thresholdPercent.toStringAsFixed(0)}%)',
                  value: '${report.belowThresholdCount}',
                  icon: Icons.warning,
                  color: hasWarnings ? Colors.red : Colors.grey,
                  theme: theme,
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Monthly Attendance Rates Section
          if (report.months.isNotEmpty) ...[
            const Text(
              'MONTHLY ATTENDANCE BREAKDOWN',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 1),
            ),
            const SizedBox(height: 8),
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                side: BorderSide(color: theme.dividerColor.withValues(alpha: 0.3)),
                borderRadius: BorderRadius.circular(8),
              ),
              child: ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: report.months.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (ctx, i) {
                  final m = report.months[i];
                  return ListTile(
                    dense: true,
                    title: Text(m.month, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('${m.instructionalDays} working days'),
                    trailing: Text(
                      m.ratePercent != null ? '${m.ratePercent!.toStringAsFixed(1)}%' : 'N/A',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: (m.ratePercent ?? 0) >= report.thresholdPercent ? Colors.green : Colors.red,
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 24),
          ],

          // Student Attendance Table
          const Text(
            'STUDENT ATTENDANCE ROSTER',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 1),
          ),
          const SizedBox(height: 8),
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              side: BorderSide(color: theme.dividerColor.withValues(alpha: 0.3)),
              borderRadius: BorderRadius.circular(8),
            ),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: report.students.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (ctx, i) {
                final s = report.students[i];
                final isLow = s.belowThreshold;

                return ListTile(
                  dense: true,
                  onTap: () {
                    _tabController.animateTo(2);
                    _loadStudentHistory(s.studentId, s.studentName);
                  },
                  title: Text(s.studentName, style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text('Adm: ${s.admissionNumber}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (isLow)
                        Container(
                          margin: const EdgeInsets.only(right: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.red.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'LOW',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.red),
                          ),
                        ),
                      Text(
                        s.overallRate != null ? '${s.overallRate!.toStringAsFixed(1)}%' : 'N/A',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: isLow ? Colors.red : Colors.green,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.chevron_right, size: 16, color: Colors.grey),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReportKpiCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    required ThemeData theme,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color, letterSpacing: 0.5),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color),
          ),
        ],
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tab 3: Student History View
  // ─────────────────────────────────────────────────────────────────────────────

  Widget _buildHistoryTab(ThemeData theme) {
    final classStudents = _getStudentsForCurrentClass();

    if (classStudents.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.school_outlined, size: 56, color: Colors.grey),
              const SizedBox(height: 12),
              Text(
                'No students found in ${_selectedClass ?? "selected class"}.',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 8),
              const Text(
                'Ensure students are enrolled in this class under Academic Setup or choose another class from the dropdown above.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
            ],
          ),
        ),
      );
    }

    final activeStudent = classStudents.firstWhereOrNull(
      (s) => s.id == _selectedStudentId || s.admissionNumber == _selectedStudentId,
    );

    // If current selected student doesn't belong to this class, automatically switch to first student in this class
    if (activeStudent == null) {
      final first = classStudents.first;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _loadStudentHistory(first.id, first.fullName);
        }
      });
      return const Center(child: InvifyLoadingIndicator(message: 'FETCHING STUDENT ATTENDANCE HISTORY...'));
    }

    if (_isLoadingHistory && _studentHistoryData == null) {
      return const Center(child: InvifyLoadingIndicator(message: 'FETCHING STUDENT ATTENDANCE HISTORY...'));
    }

    if (_historyError != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 12),
              Text(_historyError!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                icon: const Icon(Icons.refresh),
                label: const Text('RETRY'),
                onPressed: () => _loadStudentHistory(activeStudent.id, activeStudent.fullName),
              ),
            ],
          ),
        ),
      );
    }

    final data = _studentHistoryData;
    final rawLogs = (data?['dailyLogs'] ?? data?['logs']) as List<dynamic>? ?? [];
    final logs = rawLogs
        .map((l) => DailyAttendanceLog.fromJson(l as Map<String, dynamic>))
        .toList();

    final presentFromLogs = logs.where((l) => l.status == AttendanceStatus.present).length;
    final absentFromLogs = logs.where((l) => l.status == AttendanceStatus.absent).length;
    final lateFromLogs = logs.where((l) => l.status == AttendanceStatus.late).length;
    final excusedFromLogs = logs.where((l) => l.status == AttendanceStatus.excused).length;

    final summaryOverall = (data?['summary'] as Map<String, dynamic>?)?['overall'] as Map<String, dynamic>?;
    final summaryCounts = summaryOverall?['counts'] as Map<String, dynamic>?;
    final metrics = data?['metrics'] as Map<String, dynamic>?;

    int present = (summaryCounts?['present'] as num?)?.toInt() ??
        (metrics?['presentDays'] as num?)?.toInt() ??
        presentFromLogs;

    int absent = (summaryCounts?['absent'] as num?)?.toInt() ??
        (metrics?['absentDays'] as num?)?.toInt() ??
        absentFromLogs;

    int lateCount = (summaryCounts?['late'] as num?)?.toInt() ??
        (metrics?['lateDays'] as num?)?.toInt() ??
        lateFromLogs;

    int excused = (summaryCounts?['excused'] as num?)?.toInt() ??
        (metrics?['excusedDays'] as num?)?.toInt() ??
        excusedFromLogs;

    // Direct fallback: if summary counts are zero but logs has entries, use log counts
    if (present == 0 && absent == 0 && lateCount == 0 && excused == 0 && logs.isNotEmpty) {
      present = presentFromLogs;
      absent = absentFromLogs;
      lateCount = lateFromLogs;
      excused = excusedFromLogs;
    }

    double? rate = (summaryOverall?['ratePercent'] as num?)?.toDouble() ??
        (metrics?['ratePercent'] as num?)?.toDouble();

    if (rate == null) {
      final denominator = present + lateCount + absent;
      if (denominator > 0) {
        rate = ((present + lateCount) / denominator) * 100.0;
      }
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Student Dropdown Picker for the active class
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            decoration: BoxDecoration(
              color: theme.cardColor,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: theme.dividerColor.withValues(alpha: 0.3)),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                key: ValueKey('history-student-picker-${activeStudent.id}-${classStudents.length}'),
                isExpanded: true,
                value: activeStudent.id,
                icon: const Icon(Icons.arrow_drop_down),
                items: classStudents.map((s) {
                  return DropdownMenuItem<String>(
                    value: s.id,
                    child: Row(
                      children: [
                        const Icon(Icons.person, size: 20, color: Colors.blueGrey),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '${s.fullName} (Adm: ${s.admissionNumber})',
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (newId) {
                  if (newId != null && newId != _selectedStudentId) {
                    final target = classStudents.firstWhereOrNull((s) => s.id == newId);
                    if (target != null) {
                      _loadStudentHistory(target.id, target.fullName);
                    }
                  }
                },
              ),
            ),
          ),
          const SizedBox(height: 12),

          if (_isLoadingHistory)
            const Padding(
              padding: EdgeInsets.only(bottom: 12.0),
              child: LinearProgressIndicator(),
            ),

          // Header Card
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              side: BorderSide(color: theme.dividerColor.withValues(alpha: 0.3)),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const CircleAvatar(radius: 20, child: Icon(Icons.person)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              activeStudent.fullName,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            Text(
                              'Class: ${_selectedClass ?? "N/A"} • Adm: ${activeStudent.admissionNumber}',
                              style: const TextStyle(color: Colors.grey, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      if (rate != null)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: (rate >= 80 ? Colors.green : Colors.red).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '${rate.toStringAsFixed(1)}%',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: rate >= 80 ? Colors.green : Colors.red,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildMetricChip('Present', present, Colors.green),
                      _buildMetricChip('Absent', absent, Colors.red),
                      _buildMetricChip('Late', lateCount, Colors.amber.shade800),
                      _buildMetricChip('Excused', excused, Colors.indigo),
                    ],
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),
          const Text(
            'ATTENDANCE LOGS',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 1),
          ),
          const SizedBox(height: 8),

          if (logs.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24.0),
              child: Center(
                child: Text('No attendance logs recorded for this period.'),
              ),
            )
          else
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                side: BorderSide(color: theme.dividerColor.withValues(alpha: 0.3)),
                borderRadius: BorderRadius.circular(8),
              ),
              child: ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: logs.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (ctx, i) {
                  final log = logs[i];
                  return ListTile(
                    dense: true,
                    leading: Container(
                      width: 28,
                      height: 28,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: _getStatusColor(log.status),
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        log.status.shortLabel,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ),
                    title: Text(log.date, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: log.notes.isNotEmpty ? Text(log.notes) : null,
                    trailing: Text(
                      log.status.name.toUpperCase(),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: _getStatusColor(log.status),
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
