import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/school_bloc.dart';
import '../bloc/school_state.dart';
import '../../domain/entities/academic_result.dart';
import '../../domain/entities/student.dart';
import '../../domain/entities/subject.dart';
import '../../domain/entities/school_class.dart';

class ResultEntryPage extends StatefulWidget {
  const ResultEntryPage({super.key});

  @override
  State<ResultEntryPage> createState() => _ResultEntryPageState();
}

class _ResultEntryPageState extends State<ResultEntryPage> {
  int? _selectedClassId;
  int? _selectedSubjectId;
  final Map<int, Map<String, TextEditingController>> _controllers = {};

  @override
  void initState() {
    super.initState();
    context.read<SchoolBloc>().add(LoadSubjectsEvent());
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

  @override
  void dispose() {
    for (var studentMap in _controllers.values) {
      for (var controller in studentMap.values) {
        controller.dispose();
      }
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<SchoolBloc, SchoolState>(
      listener: (context, state) {
        if (state.status == SchoolStatus.success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Results saved successfully!'), backgroundColor: Colors.green),
          );
          context.read<SchoolBloc>().add(ResetSchoolStatus());
        }
        if (state.error != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.error!), backgroundColor: Colors.red),
          );
          context.read<SchoolBloc>().add(ResetSchoolStatus());
        }
      },
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
                  icon: const Icon(Icons.save, color: Colors.white),
                  label: const Text('SAVE', style: TextStyle(color: Colors.white)),
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
                          : _buildResultGrid(classStudents),
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
                  items: state.classes.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))).toList(),
                  onChanged: (val) {
                    setState(() {
                      _selectedClassId = val;
                      _controllers.clear();
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
                  items: state.subjects.map((s) => DropdownMenuItem(value: s.id, child: Text(s.name))).toList(),
                  onChanged: (val) {
                    setState(() {
                      _selectedSubjectId = val;
                      _controllers.clear();
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

  Widget _buildResultGrid(List<Student> students) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: students.length,
      separatorBuilder: (_, __) => const Divider(),
      itemBuilder: (context, index) {
        final student = students[index];
        final controllers = _controllers[student.id]!;

        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(student.fullName, style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: controllers['ca'],
                      decoration: const InputDecoration(labelText: 'CA (40)', border: OutlineInputBorder()),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: controllers['exam'],
                      decoration: const InputDecoration(labelText: 'Exam (60)', border: OutlineInputBorder()),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    flex: 2,
                    child: TextField(
                      controller: controllers['remarks'],
                      decoration: const InputDecoration(labelText: 'Remarks', border: OutlineInputBorder()),
                    ),
                  ),
                ],
              ),
            ],
          ),
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
      
      results.add(AcademicResult(
        studentId: studentId,
        subjectId: _selectedSubjectId!,
        termId: state.activeTerm!.id!,
        academicYearId: state.activeYear!.id!,
        assessmentScore: ca,
        examScore: exam,
        totalScore: total,
        grade: _calculateGrade(total),
        remarks: studentControllers['remarks']!.text,
      ));
    });

    context.read<SchoolBloc>().add(SaveResultsEvent(results));
  }

  String _calculateGrade(double total) {
    if (total >= 75) return 'A1';
    if (total >= 70) return 'B2';
    if (total >= 65) return 'B3';
    if (total >= 60) return 'C4';
    if (total >= 55) return 'C5';
    if (total >= 50) return 'C6';
    if (total >= 45) return 'D7';
    if (total >= 40) return 'E8';
    return 'F9';
  }
}
