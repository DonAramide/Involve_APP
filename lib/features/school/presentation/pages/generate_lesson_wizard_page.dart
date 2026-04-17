import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/lesson_note_bloc.dart';
import 'package:involve_app/features/school/presentation/bloc/school_bloc.dart';
import 'package:involve_app/features/school/presentation/bloc/school_state.dart';
import 'lesson_note_editor_page.dart';

class GenerateLessonWizardPage extends StatefulWidget {
  const GenerateLessonWizardPage({super.key});

  @override
  State<GenerateLessonWizardPage> createState() => _GenerateLessonWizardPageState();
}

class _GenerateLessonWizardPageState extends State<GenerateLessonWizardPage> {
  int? _selectedClassId;
  int? _selectedSubjectId;
  int? _selectedTermId;
  int _selectedWeek = 1;
  final TextEditingController _topicController = TextEditingController();

  final List<int> _weeks = List.generate(13, (index) => index + 1);

  @override
  void dispose() {
    _topicController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<LessonNoteBloc, LessonNoteState>(
      listener: (context, state) {
        if (state is LessonReady) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (_) => LessonNoteEditorPage(note: state.note),
            ),
          );
        } else if (state is LessonError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: Colors.red),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('New Lesson Note'),
        ),
        body: BlocBuilder<SchoolBloc, SchoolState>(
          builder: (context, schoolState) {
            return SingleChildScrollView(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Curriculum Details',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Select the target class, subject, and topic to generate a structured lesson note.',
                    style: TextStyle(color: Colors.grey),
                  ),
                  const SizedBox(height: 24),

                  // Class Selection
                  _buildDropdown<int>(
                    label: 'Class',
                    value: _selectedClassId,
                    items: schoolState.classes.map((c) => 
                      DropdownMenuItem(value: c.id, child: Text(c.name))
                    ).toList(),
                    onChanged: (val) => setState(() => _selectedClassId = val),
                    icon: Icons.class_,
                  ),
                  const SizedBox(height: 16),

                  // Subject Selection
                  _buildDropdown<int>(
                    label: 'Subject',
                    value: _selectedSubjectId,
                    items: schoolState.subjects.map((s) => 
                      DropdownMenuItem(value: s.id, child: Text(s.name))
                    ).toList(),
                    onChanged: (val) => setState(() => _selectedSubjectId = val),
                    icon: Icons.subject,
                  ),
                  const SizedBox(height: 16),

                  Row(
                    children: [
                      // Term Selection
                      Expanded(
                        flex: 2,
                        child: _buildDropdown<int>(
                          label: 'Term',
                          value: _selectedTermId,
                          items: schoolState.terms.map((t) => 
                            DropdownMenuItem(value: t.id, child: Text(t.name))
                          ).toList(),
                          onChanged: (val) => setState(() => _selectedTermId = val),
                          icon: Icons.calendar_today,
                        ),
                      ),
                      const SizedBox(width: 16),
                      // Week Selection
                      Expanded(
                        child: _buildDropdown<int>(
                          label: 'Week',
                          value: _selectedWeek,
                          items: _weeks.map((w) => 
                            DropdownMenuItem(value: w, child: Text('Week $w'))
                          ).toList(),
                          onChanged: (val) => setState(() => _selectedWeek = val!),
                          icon: Icons.timeline,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Topic Input
                  TextField(
                    controller: _topicController,
                    decoration: InputDecoration(
                      labelText: 'Lesson Topic',
                      hintText: 'e.g., Introduction to Agriculture',
                      prefixIcon: const Icon(Icons.title),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 40),

                  // Action Button
                  BlocBuilder<LessonNoteBloc, LessonNoteState>(
                    builder: (context, state) {
                      final isGenerating = state is LessonGenerating || state is LessonNoteLoading;
                      
                      return ElevatedButton(
                        onPressed: isGenerating ? null : () => _onGenerate(schoolState),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          backgroundColor: Theme.of(context).primaryColor,
                          foregroundColor: Colors.white,
                        ),
                        child: isGenerating
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : const Text('GENERATE LESSON NOTE', style: TextStyle(fontWeight: FontWeight.bold)),
                      );
                    },
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildDropdown<T>({
    required String label,
    required T? value,
    required List<DropdownMenuItem<T>> items,
    required ValueChanged<T?> onChanged,
    required IconData icon,
  }) {
    return DropdownButtonFormField<T>(
      value: value,
      items: items,
      onChanged: onChanged,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
        fillColor: Colors.grey.withOpacity(0.05),
      ),
    );
  }

  void _onGenerate(SchoolState schoolState) {
    if (_selectedClassId == null || _selectedSubjectId == null || _selectedTermId == null || _topicController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill in all fields')),
      );
      return;
    }

    final sClass = schoolState.classes.firstWhere((c) => c.id == _selectedClassId);
    final subject = schoolState.subjects.firstWhere((s) => s.id == _selectedSubjectId);
    final term = schoolState.terms.firstWhere((t) => t.id == _selectedTermId);

    context.read<LessonNoteBloc>().add(GenerateLesson(
          classId: _selectedClassId!,
          className: sClass.name,
          subjectId: _selectedSubjectId!,
          subjectName: subject.name,
          termId: _selectedTermId!,
          termName: term.name,
          week: _selectedWeek,
          topic: _topicController.text,
        ));
  }
}
