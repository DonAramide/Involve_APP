import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/school_bloc.dart';
import '../bloc/school_state.dart';
import '../../domain/entities/school_entities.dart';
import '../../domain/entities/grading_rule.dart';

class ResultEntryPage extends StatefulWidget {
  const ResultEntryPage({super.key});

  @override
  State<ResultEntryPage> createState() => _ResultEntryPageState();
}

class _ResultEntryPageState extends State<ResultEntryPage> {
  int? _selectedClassId;
  int? _selectedSubjectId;
  // Controllers keyed by studentId. These are NEVER cleared after a save —
  // only cleared when class/subject changes. Values are updated via .text= after reload.
  final Map<int, Map<String, TextEditingController>> _controllers = {};

  @override
  void initState() {
    super.initState();
    context.read<SchoolBloc>().add(LoadSubjectsEvent());
    context.read<SchoolBloc>().add(LoadGradingRules());
  }

  void _loadExistingResults() {
    if (_selectedClassId != null && _selectedSubjectId != null) {
      final state = context.read<SchoolBloc>().state;
      context.read<SchoolBloc>().add(LoadResultsEvent(
            classId: _selectedClassId,
            subjectId: _selectedSubjectId,
            termId: state.activeTerm?.id,
            academicYearId: state.activeYear?.id,
          ));
    }
  }

  /// Only initialises controllers for students not yet in the map.
  /// Does NOT overwrite controllers the user is actively editing.
  void _initControllers(List<Student> classStudents, List<AcademicResult> existingResults) {
    for (var student in classStudents) {
      if (!_controllers.containsKey(student.id)) {
        final result = existingResults.where((r) => r.studentId == student.id).firstOrNull;
        _controllers[student.id!] = {
          'ca': TextEditingController(text: result?.assessmentScore.toString() ?? '0.0'),
          'exam': TextEditingController(text: result?.examScore.toString() ?? '0.0'),
          'remarks': TextEditingController(text: result?.remarks ?? ''),
        };
      }
    }
  }

  /// Updates .text on existing controllers from fresh DB results without
  /// replacing the controller instances (which would lose focus / widget links).
  void _refreshControllersFromResults(List<AcademicResult> results) {
    _controllers.forEach((studentId, controllerMap) {
      final result = results.where((r) => r.studentId == studentId).firstOrNull;
      if (result != null) {
        controllerMap['ca']?.text = result.assessmentScore.toString();
        controllerMap['exam']?.text = result.examScore.toString();
        controllerMap['remarks']?.text = result.remarks ?? '';
      }
    });
  }

  void _disposeControllers() {
    for (var studentMap in _controllers.values) {
      for (var controller in studentMap.values) {
        controller.dispose();
      }
    }
    _controllers.clear();
  }

  @override
  void dispose() {
    _disposeControllers();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<SchoolBloc, SchoolState>(
      listenWhen: (prev, curr) =>
          prev.status != curr.status ||
          prev.error != curr.error ||
          prev.results != curr.results,
      listener: (context, state) {
        if (state.status == SchoolStatus.success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Results saved successfully!'), backgroundColor: Colors.green),
          );
          
          context.read<SchoolBloc>().add(ResetSchoolStatus());
          
          // Reload from DB to confirm persisted values
          _loadExistingResults();
        }
        
        if (state.error != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.error!), backgroundColor: Colors.red),
          );
          context.read<SchoolBloc>().add(ResetSchoolStatus());
        }

        // Always update controllers when results change, not just on initial status
        if (state.results.isNotEmpty) {
          _refreshControllersFromResults(state.results);
        }
      },
      buildWhen: (prev, curr) =>
          prev.isLoading != curr.isLoading ||
          prev.students != curr.students ||
          prev.subjects != curr.subjects ||
          prev.classes != curr.classes ||
          prev.gradingRules != curr.gradingRules ||
          prev.results != curr.results,
      builder: (context, state) {
        final classStudents = _selectedClassId == null
            ? <Student>[]
            : state.students.where((s) => s.classId == _selectedClassId).toList();

        if (classStudents.isNotEmpty) {
          _initControllers(classStudents, state.results);
        }

        return Scaffold(
          appBar: AppBar(
            title: const Text('Enter Results'),
            actions: [
              if (classStudents.isNotEmpty && _selectedSubjectId != null)
                TextButton.icon(
                  onPressed: () => _saveResults(state),
                  icon: Icon(Icons.save, color: Theme.of(context).primaryColor),
                  label: Text('SAVE', style: TextStyle(color: Theme.of(context).primaryColor, fontWeight: FontWeight.bold)),
                ),
            ],
          ),
          body: Column(
            children: [
              _buildFilters(state),
              if (_selectedClassId != null && _selectedSubjectId != null)
                Expanded(
                  child: state.isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : classStudents.isEmpty
                          ? const Center(child: Text('No students in this class.'))
                          : _buildResultGrid(classStudents, state.gradingRules),
                )
              else
                const Expanded(
                  child: Center(child: Text('Please select Class and Subject.')),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildFilters(SchoolState state) {
    return Container(
      padding: const EdgeInsets.all(16),
      color: Theme.of(context).primaryColor.withOpacity(0.05),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<int>(
                  value: _selectedClassId,
                  decoration: const InputDecoration(labelText: 'Class', border: OutlineInputBorder()),
                  items: state.classes.map((c) => DropdownMenuItem(value: c.id!, child: Text(c.name))).toList(),
                  onChanged: (val) {
                    // Class changed: clear controllers so they reload for the new class
                    _disposeControllers();
                    setState(() {
                      _selectedClassId = val;
                    });
                    _loadExistingResults();
                  },
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: DropdownButtonFormField<int>(
                  value: _selectedSubjectId,
                  decoration: const InputDecoration(labelText: 'Subject', border: OutlineInputBorder()),
                  items: state.subjects.map((s) => DropdownMenuItem(value: s.id!, child: Text(s.name))).toList(),
                  onChanged: (val) {
                    // Subject changed: clear controllers so they reload for the new subject
                    _disposeControllers();
                    setState(() {
                      _selectedSubjectId = val;
                    });
                    _loadExistingResults();
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Term: ${state.activeTerm?.name ?? 'N/A'} | Year: ${state.activeYear?.name ?? 'N/A'}',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildResultGrid(List<Student> students, List<GradingRule> rules) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: students.length,
      separatorBuilder: (_, __) => const Divider(),
      itemBuilder: (context, index) {
        final student = students[index];
        final controllers = _controllers[student.id];
        if (controllers == null) return const SizedBox.shrink();
        
        return AnimatedBuilder(
          animation: Listenable.merge([controllers['ca'], controllers['exam']]),
          builder: (context, child) {
            final ca = double.tryParse(controllers['ca']!.text) ?? 0.0;
            final exam = double.tryParse(controllers['exam']!.text) ?? 0.0;
            final total = ca + exam;
            final gradeStr = _calculateGrade(total, rules);

            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          student.fullName, 
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          'Total: $total | Grade: $gradeStr', 
                          style: TextStyle(
                            fontWeight: FontWeight.bold, 
                            color: total >= 50 ? Colors.green : Colors.red,
                            fontSize: 13,
                          ),
                          textAlign: TextAlign.end,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: controllers['ca'],
                          decoration: const InputDecoration(labelText: 'CA', border: OutlineInputBorder(), contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8)),
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: controllers['exam'],
                          decoration: const InputDecoration(labelText: 'Exam', border: OutlineInputBorder(), contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8)),
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 2,
                        child: TextField(
                          controller: controllers['remarks'],
                          decoration: const InputDecoration(labelText: 'Remarks', border: OutlineInputBorder(), contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          }
        );
      },
    );
  }

  void _saveResults(SchoolState state) {
    final results = <AcademicResult>[];
    
    _controllers.forEach((studentId, studentControllers) {
      final ca = double.tryParse(studentControllers['ca']!.text) ?? 0.0;
      final exam = double.tryParse(studentControllers['exam']!.text) ?? 0.0;
      final total = ca + exam;
      
      debugPrint('Saving result for student $studentId: CA=$ca, Exam=$exam, Total=$total');
      
      results.add(AcademicResult(
        studentId: studentId,
        subjectId: _selectedSubjectId!,
        termId: state.activeTerm!.id!,
        academicYearId: state.activeYear!.id!,
        assessmentScore: ca,
        examScore: exam,
        totalScore: total,
        grade: _calculateGrade(total, state.gradingRules).split(' ').first,
        remarks: studentControllers['remarks']!.text,
        dateEntered: DateTime.now(),
      ));
    });

    debugPrint('Submitting ${results.length} results to Bloc');
    context.read<SchoolBloc>().add(SaveResultsEvent(results));
  }

  String _calculateGrade(double total, List<GradingRule> rules) {
    if (rules.isEmpty) return 'N/A';
    
    final sortedRules = List<GradingRule>.from(rules)
      ..sort((a, b) => b.minScore.compareTo(a.minScore));

    for (final rule in sortedRules) {
      if (total >= rule.minScore) {
        return '${rule.grade} (${rule.remarks})';
      }
    }
    return 'F';
  }
}
