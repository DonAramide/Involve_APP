import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/school_bloc.dart';
import '../../domain/entities/school_entities.dart';
import '../../domain/entities/grading_rule.dart';

class ResultEntryPage extends StatefulWidget {
  const ResultEntryPage({super.key});

  @override
  State<ResultEntryPage> createState() => _ResultEntryPageState();
}

class _ResultEntryPageState extends State<ResultEntryPage> {
  int? _selectedYearId;
  int? _selectedTermId;
  int? _selectedClassId;
  int? _selectedSubjectId;
  
  final Map<int, TextEditingController> _scoreControllers = {};

  @override
  void initState() {
    super.initState();
    context.read<SchoolBloc>().add(LoadSchoolData());
  }

  @override
  void dispose() {
    for (var controller in _scoreControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Result Entry')),
      body: BlocConsumer<SchoolBloc, SchoolState>(
        listener: (context, state) {
          if (state.error != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.error!), backgroundColor: Colors.red),
            );
          }
        },
        builder: (context, state) {
          return Column(
            children: [
              _buildFilters(context, state),
              const Divider(),
              Expanded(
                child: _buildStudentList(context, state),
              ),
              if (_selectedClassId != null && _selectedSubjectId != null && state.students.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: state.isSaving ? null : () => _saveResults(state),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        backgroundColor: Theme.of(context).primaryColor,
                        foregroundColor: Colors.white,
                      ),
                      child: state.isSaving 
                        ? const CircularProgressIndicator(color: Colors.white) 
                        : const Text('SAVE RESULTS', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildFilters(BuildContext context, SchoolState state) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<int>(
                  value: _selectedYearId,
                  decoration: const InputDecoration(labelText: 'Academic Year'),
                  items: state.academicYears.map((y) => DropdownMenuItem(value: y.id, child: Text(y.name))).toList(),
                  onChanged: (val) => setState(() => _selectedYearId = val),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: DropdownButtonFormField<int>(
                  value: _selectedClassId,
                  decoration: const InputDecoration(labelText: 'Class'),
                  items: state.classes.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))).toList(),
                  onChanged: (val) {
                    setState(() => _selectedClassId = val);
                    if (val != null) {
                      context.read<SchoolBloc>().add(LoadStudentsEvent(val));
                    }
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<int>(
                  value: _selectedSubjectId,
                  decoration: const InputDecoration(labelText: 'Subject'),
                  items: state.subjects.map((s) => DropdownMenuItem(value: s.id, child: Text(s.name))).toList(),
                  onChanged: (val) => setState(() => _selectedSubjectId = val),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: DropdownButtonFormField<int>(
                  value: _selectedTermId,
                  decoration: const InputDecoration(labelText: 'Term'),
                  items: state.academicYears.isEmpty ? [] : [
                    const DropdownMenuItem(value: 1, child: Text('Term 1')),
                    const DropdownMenuItem(value: 2, child: Text('Term 2')),
                    const DropdownMenuItem(value: 3, child: Text('Term 3')),
                  ],
                  onChanged: (val) => setState(() => _selectedTermId = val),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStudentList(BuildContext context, SchoolState state) {
    if (state.isLoading) return const Center(child: CircularProgressIndicator());
    if (_selectedClassId == null) return const Center(child: Text('Please select a class.'));
    if (state.students.isEmpty) return const Center(child: Text('No students found in this class.'));

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: state.students.length,
      separatorBuilder: (_, __) => const Divider(),
      itemBuilder: (context, index) {
        final student = state.students[index];
        _scoreControllers.putIfAbsent(student.id!, () => TextEditingController());

        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            children: [
              Expanded(
                flex: 2,
                child: Text(student.fullName, style: const TextStyle(fontWeight: FontWeight.bold)),
              ),
              const SizedBox(width: 16),
              Expanded(
                flex: 1,
                child: TextFormField(
                  controller: _scoreControllers[student.id],
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Score',
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (val) => setState(() {}), // Trigger grade recalc UI
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                flex: 1,
                child: _buildGradeBadge(context, _scoreControllers[student.id]?.text, state),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildGradeBadge(BuildContext context, String? scoreText, SchoolState state) {
    if (scoreText == null || scoreText.isEmpty) return const SizedBox.shrink();
    final score = double.tryParse(scoreText);
    if (score == null) return const Icon(Icons.error, color: Colors.red);

    final rule = state.gradingRules.firstWhere(
      (r) => score >= r.minScore && score <= r.maxScore,
      orElse: () => GradingRule(grade: '?', minScore: 0, maxScore: 0),
    );

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
      decoration: BoxDecoration(
        color: _getGradeColor(rule.grade),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Center(
        child: Text(
          rule.grade,
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  Color _getGradeColor(String grade) {
    if (grade.startsWith('A')) return Colors.green;
    if (grade.startsWith('B')) return Colors.blue;
    if (grade.startsWith('C')) return Colors.orange;
    if (grade.startsWith('D')) return Colors.orangeAccent;
    if (grade.startsWith('E')) return Colors.deepOrange;
    if (grade.startsWith('F')) return Colors.red;
    return Colors.grey;
  }

  void _saveResults(SchoolState state) {
    if (_selectedYearId == null || _selectedTermId == null || _selectedSubjectId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select year, term and subject'), backgroundColor: Colors.orange),
      );
      return;
    }

    final results = <Result>[];
    for (final student in state.students) {
      final scoreVal = _scoreControllers[student.id]?.text;
      if (scoreVal != null && scoreVal.isNotEmpty) {
        final score = double.tryParse(scoreVal);
        if (score != null) {
          results.add(Result(
            studentId: student.id!,
            subjectId: _selectedSubjectId!,
            termId: _selectedTermId!,
            academicYearId: _selectedYearId!,
            score: score,
            dateEntered: DateTime.now(),
          ));
        }
      }
    }

    if (results.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No scores entered')),
      );
      return;
    }

    context.read<SchoolBloc>().add(SaveResultsEvent(results));
  }
}
