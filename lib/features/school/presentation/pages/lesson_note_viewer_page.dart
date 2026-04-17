import 'package:flutter/material.dart';
import '../../domain/entities/lesson_note_models.dart';
import 'lesson_note_editor_page.dart';

class LessonNoteViewerPage extends StatelessWidget {
  final LessonNote note;
  const LessonNoteViewerPage({super.key, required this.note});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('View Lesson Note'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => LessonNoteEditorPage(note: note),
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: () {
              // Future: PDF Export or Sharing
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(context),
            const SizedBox(height: 24),
            
            _buildSection(context, 'Objectives', 
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: note.content.learningObjectives.map((e) => 
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6.0),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('• ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                        Expanded(child: Text(e, style: const TextStyle(fontSize: 16))),
                      ],
                    ),
                  )
                ).toList(),
              ),
            ),

            _buildSection(context, 'Introduction', 
              content: note.content.introduction,
            ),

            ...note.content.mainContent.map((section) => 
              _buildSection(context, section.heading, content: section.explanation)
            ),

            if (note.content.examples.isNotEmpty)
              _buildSection(context, 'Examples', 
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: note.content.examples.map((e) => 
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8.0),
                      child: Text('Example: $e', style: const TextStyle(fontStyle: FontStyle.italic)),
                    )
                  ).toList(),
                ),
              ),

            if (note.content.classActivity.isNotEmpty)
              _buildSection(context, 'Class Activity', 
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: note.content.classActivity.map((e) => 
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4.0),
                      child: Text('Task: $e'),
                    )
                  ).toList(),
                ),
              ),

            _buildSection(context, 'Summary', 
              content: note.content.summary,
              isLast: true,
            ),

            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).primaryColor.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).primaryColor.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            note.topic,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.school, size: 16, color: Colors.grey),
              const SizedBox(width: 8),
              Text(
                '${note.className} • ${note.subjectName}',
                style: const TextStyle(color: Colors.grey, fontSize: 14, fontWeight: FontWeight.w500),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(Icons.calendar_month, size: 16, color: Colors.grey),
              const SizedBox(width: 8),
              Text(
                'Term: ${note.term} • Week: ${note.week}',
                style: const TextStyle(color: Colors.grey, fontSize: 14),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSection(BuildContext context, String title, {String? content, Widget? child, bool isLast = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Theme.of(context).primaryColor,
            ),
          ),
          const SizedBox(height: 12),
          if (content != null)
            Text(
              content,
              style: const TextStyle(fontSize: 16, height: 1.5, letterSpacing: 0.2),
            ),
          if (child != null) child,
          if (!isLast)
            Padding(
              padding: const EdgeInsets.only(top: 16.0),
              child: Divider(color: Colors.grey.withOpacity(0.1)),
            ),
        ],
      ),
    );
  }
}
