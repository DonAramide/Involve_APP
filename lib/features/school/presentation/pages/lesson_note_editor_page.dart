import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/lesson_note_bloc.dart';
import '../../domain/entities/lesson_note_models.dart';

class LessonNoteEditorPage extends StatefulWidget {
  final LessonNote note;
  final int classId;
  final int subjectId;
  final int termId;
  final String schoolId;

  const LessonNoteEditorPage({
    super.key, 
    required this.note,
    required this.classId,
    required this.subjectId,
    required this.termId,
    required this.schoolId,
  });

  @override
  State<LessonNoteEditorPage> createState() => _LessonNoteEditorPageState();
}

class _LessonNoteEditorPageState extends State<LessonNoteEditorPage> {
  late TextEditingController _introController;
  late TextEditingController _summaryController;
  late List<TextEditingController> _objectiveControllers;
  late List<_SectionControllers> _contentControllers;

  @override
  void initState() {
    super.initState();
    _introController = TextEditingController(text: widget.note.content.introduction);
    _summaryController = TextEditingController(text: widget.note.content.summary);
    _objectiveControllers = widget.note.content.learningObjectives
        .map((e) => TextEditingController(text: e))
        .toList();
    _contentControllers = widget.note.content.mainContent
        .map((e) => _SectionControllers(
              heading: TextEditingController(text: e.heading),
              explanation: TextEditingController(text: e.explanation),
            ))
        .toList();
  }

  @override
  void dispose() {
    _introController.dispose();
    _summaryController.dispose();
    for (var c in _objectiveControllers) {
      c.dispose();
    }
    for (var c in _contentControllers) {
      c.heading.dispose();
      c.explanation.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Review Lesson Note'),
        actions: [
          IconButton(
            onPressed: _onRegenerate,
            icon: const Icon(Icons.refresh, color: Colors.white),
            tooltip: 'Regenerate with AI',
          ),
          TextButton.icon(
            onPressed: _onSave,
            icon: const Icon(Icons.check, color: Colors.white),
            label: const Text('SAVE', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(),
            const Divider(height: 32),
            _buildSectionTitle('Introduction'),
            _buildTextField(_introController, maxLines: 3),
            const SizedBox(height: 24),
            
            _buildSectionTitle('Learning Objectives'),
            ..._buildObjectiveFields(),
            _buildAddButton('Add Objective', () => setState(() => _objectiveControllers.add(TextEditingController()))),
            const SizedBox(height: 24),

            _buildSectionTitle('Main Content'),
            ..._buildContentFields(),
            _buildAddButton('Add Section', () => setState(() => _contentControllers.add(_SectionControllers(
                  heading: TextEditingController(),
                  explanation: TextEditingController(),
                )))),
            const SizedBox(height: 24),

            _buildSectionTitle('Summary'),
            _buildTextField(_summaryController, maxLines: 3),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.note.topic,
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        Text(
          '${widget.note.className} • ${widget.note.subjectName}',
          style: const TextStyle(color: Colors.grey, fontSize: 16),
        ),
        Text(
          'Term: ${widget.note.term} • Week: ${widget.note.week}',
          style: const TextStyle(color: Colors.grey),
        ),
      ],
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: Theme.of(context).primaryColor,
        ),
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, {int maxLines = 1, String? hint}) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      decoration: InputDecoration(
        hintText: hint,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        contentPadding: const EdgeInsets.all(12),
      ),
    );
  }

  List<Widget> _buildObjectiveFields() {
    return _objectiveControllers.asMap().entries.map((entry) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 8.0),
        child: Row(
          children: [
            Expanded(child: _buildTextField(entry.value, hint: 'Objective ${entry.key + 1}')),
            IconButton(
              icon: const Icon(Icons.remove_circle_outline, color: Colors.red),
              onPressed: () => setState(() => _objectiveControllers.removeAt(entry.key)),
            ),
          ],
        ),
      );
    }).toList();
  }

  List<Widget> _buildContentFields() {
    return _contentControllers.asMap().entries.map((entry) {
      return Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.withOpacity(0.3)),
          borderRadius: BorderRadius.circular(12),
          color: Colors.grey.withOpacity(0.02),
        ),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(child: _buildTextField(entry.value.heading, hint: 'Heading')),
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: Colors.red),
                  onPressed: () => setState(() => _contentControllers.removeAt(entry.key)),
                ),
              ],
            ),
            const SizedBox(height: 8),
            _buildTextField(entry.value.explanation, maxLines: 5, hint: 'Explanation'),
          ],
        ),
      );
    }).toList();
  }

  Widget _buildAddButton(String label, VoidCallback onPressed) {
    return TextButton.icon(
      onPressed: onPressed,
      icon: const Icon(Icons.add),
      label: Text(label),
    );
  }

  void _onSave() {
    final updatedContent = StructuredNoteContent(
      topic: widget.note.topic,
      learningObjectives: _objectiveControllers.map((e) => e.text).where((e) => e.isNotEmpty).toList(),
      introduction: _introController.text,
      mainContent: _contentControllers
          .map((e) => LessonContentSection(heading: e.heading.text, explanation: e.explanation.text))
          .where((e) => e.heading.isNotEmpty)
          .toList(),
      examples: widget.note.content.examples, // Preserve others for now
      classActivity: widget.note.content.classActivity,
      assessment: widget.note.content.assessment,
      summary: _summaryController.text,
    );

    final updatedNote = widget.note.copyWith(
      content: updatedContent,
      updatedAt: DateTime.now(),
    );

    context.read<LessonNoteBloc>().add(SaveLessonVersion(updatedNote));
    Navigator.pop(context); // Back to wizard which will pop to list
  }

  void _onRegenerate() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Regenerate Lesson?'),
        content: const Text('This will discard your current edits and generate a new version using AI. Continue?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('CANCEL')),
          TextButton(
            onPressed: () => Navigator.pop(context, true), 
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('REGENERATE'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      // We need schoolId and teacherId. We can get them from the Bloc's state or pass them.
      // For now, we take from the current note or context. 
      // Actually, GenerateLessonWizardPage already has them.
      
      // We trigger the same generation but with forceRefresh: true
      context.read<LessonNoteBloc>().add(GenerateLesson(
        classId: widget.classId,
        className: widget.note.className,
        subjectId: widget.subjectId,
        subjectName: widget.note.subjectName,
        termId: widget.termId,
        termName: widget.note.term,
        week: widget.note.week,
        topic: widget.note.topic,
        schoolId: widget.schoolId,
        teacherId: 'default_teacher',
        forceRefresh: true,
      ));
      
      Navigator.pop(context); // Go back to loader in Wizard
    }
  }
}

class _SectionControllers {
  final TextEditingController heading;
  final TextEditingController explanation;
  _SectionControllers({required this.heading, required this.explanation});
}
