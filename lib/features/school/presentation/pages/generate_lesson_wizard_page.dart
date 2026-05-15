import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/features/school/presentation/bloc/lesson_note_bloc.dart';
import 'package:involve_app/features/school/presentation/bloc/school_bloc.dart';
import 'package:involve_app/features/school/presentation/bloc/school_state.dart';
import 'package:involve_app/features/school/presentation/pages/lesson_note_editor_page.dart';
import 'package:involve_app/features/school/domain/repositories/school_repository.dart';

import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

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

  bool _isFetchingTopic = false;
  bool _userHasEditedTopic = false;
  String? _suggestedTopic;

  final List<int> _weeks = List.generate(13, (index) => index + 1);

  Future<void> _attemptTopicAutofill() async {
    if (_selectedClassId == null || _selectedSubjectId == null || _selectedTermId == null) return;
    
    setState(() => _isFetchingTopic = true);
    
    final repo = context.read<SchoolRepository>();
    final topic = await repo.getCurriculumTopic(_selectedClassId!, _selectedSubjectId!, _selectedTermId!, _selectedWeek);
    
    if (mounted) {
      setState(() {
        _isFetchingTopic = false;
        if (topic != null && topic.isNotEmpty) {
          _suggestedTopic = topic;
          if (!_userHasEditedTopic) {
            _topicController.text = topic;
          }
        } else {
          _suggestedTopic = null;
          if (!_userHasEditedTopic) {
            _topicController.text = '';
          }
        }
      });
    }
  }

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
          final settingsState = context.read<SettingsBloc>().state;
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
                builder: (_) => LessonNoteEditorPage(
                  note: state.note,
                  classId: _selectedClassId!,
                  subjectId: _selectedSubjectId!,
                  termId: _selectedTermId!,
                  schoolId: settingsState.settings?.organizationName ?? 'unknown_school',
                ),
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
        body: BlocBuilder<SettingsBloc, SettingsState>(
          builder: (context, settingsState) {
            return BlocBuilder<SchoolBloc, SchoolState>(
              builder: (context, schoolState) {
                return BlocBuilder<LessonNoteBloc, LessonNoteState>(
                  builder: (context, lessonState) {
                    final isGenerating = lessonState is LessonGenerating || lessonState is LessonNoteLoading;
                    if (isGenerating) {
                      return const InvifyLoadingIndicator(message: 'ORCHESTRATING AI LESSON GENERATION...');
                    }
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
                        onChanged: (val) {
                          setState(() => _selectedClassId = val);
                          _attemptTopicAutofill();
                        },
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
                        onChanged: (val) {
                          setState(() => _selectedSubjectId = val);
                          _attemptTopicAutofill();
                        },
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
                              onChanged: (val) {
                                setState(() => _selectedTermId = val);
                                _attemptTopicAutofill();
                              },
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
                              onChanged: (val) {
                                setState(() => _selectedWeek = val!);
                                _attemptTopicAutofill();
                              },
                              icon: Icons.timeline,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Topic Input
                      TextField(
                        controller: _topicController,
                        onChanged: (_) => setState(() => _userHasEditedTopic = true),
                        decoration: InputDecoration(
                          labelText: 'Lesson Topic',
                          hintText: 'e.g., Introduction to Agriculture',
                          prefixIcon: const Icon(Icons.title),
                          suffixIcon: _isFetchingTopic
                              ? const Padding(
                                  padding: EdgeInsets.all(12.0),
                                  child: SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: Icon(Icons.sync, size: 16, color: Colors.blue),
                                  ),
                                )
                              : null,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      if (_userHasEditedTopic && _suggestedTopic != null && _topicController.text != _suggestedTopic)
                        Padding(
                          padding: const EdgeInsets.only(top: 8, left: 4),
                          child: Row(
                            children: [
                              const Icon(Icons.lightbulb_outline, size: 16, color: Colors.orange),
                              const SizedBox(width: 4),
                              Text('Curriculum Suggests:', style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                              const SizedBox(width: 4),
                              Expanded(
                                child: TextButton(
                                  style: TextButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
                                    minimumSize: Size.zero,
                                    alignment: Alignment.centerLeft,
                                  ),
                                  onPressed: () {
                                    setState(() {
                                      _topicController.text = _suggestedTopic!;
                                      _userHasEditedTopic = false;
                                    });
                                  },
                                  child: Text('Use "$_suggestedTopic"', overflow: TextOverflow.ellipsis),
                                ),
                              ),
                            ],
                          ),
                        ),
                      const SizedBox(height: 40),

                      // Action Button
                      BlocBuilder<LessonNoteBloc, LessonNoteState>(
                        builder: (context, state) {
                          final isGenerating = state is LessonGenerating || state is LessonNoteLoading;
                          
                          return ElevatedButton(
                            onPressed: isGenerating ? null : () => _onGenerate(schoolState, settingsState),
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              backgroundColor: Theme.of(context).primaryColor,
                              foregroundColor: Colors.white,
                            ),
                            child: isGenerating
                                ? const Text('GENERATING...', style: TextStyle(fontWeight: FontWeight.bold))
                                : const Text('GENERATE LESSON NOTE', style: TextStyle(fontWeight: FontWeight.bold)),
                          );
                        },
                      ),
                    ],
                  ),
                );
                  },
                );
              },
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

  void _onGenerate(SchoolState schoolState, SettingsState settingsState) {
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
          schoolId: settingsState.settings?.organizationName ?? 'unknown_school',
          teacherId: 'default_teacher', // Placeholder: Expand if staff login is implemented
        ));
  }
}
