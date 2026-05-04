import 'dart:convert';
import '../entities/lesson_note_models.dart';

class LessonNoteValidator {
  /// Validates the raw AI response and attempts to repair minor issues.
  /// Throws a FormatException if the content is fundamentally invalid.
  static StructuredNoteContent validateAndRepair(dynamic content) {
    try {
      final Map<String, dynamic> json;
      if (content is String) {
        json = jsonDecode(content);
      } else if (content is Map<String, dynamic>) {
        json = content;
      } else {
        throw const FormatException('Invalid content type for validation');
      }
      
      // Basic structure validation
      final requiredKeys = [
        'topic', 
        'learning_objectives', 
        'introduction', 
        'main_content', 
        'summary'
      ];
      
      for (final key in requiredKeys) {
        if (!json.containsKey(key) || json[key] == null) {
          throw FormatException('Missing required field: $key');
        }
      }

      // Specific field validation & repair
      final topic = json['topic'].toString().trim();
      if (topic.isEmpty) throw const FormatException('Topic cannot be empty');

      final objectives = List<String>.from(json['learning_objectives']);
      if (objectives.isEmpty) {
        objectives.add('Understand the basic concepts of $topic');
      }

      final introduction = json['introduction'].toString().trim();
      if (introduction.isEmpty) throw const FormatException('Introduction cannot be empty');

      final mainContent = (json['main_content'] as List);
      if (mainContent.isEmpty) {
        throw const FormatException('Main content cannot be empty');
      }
      
      // Strict hierarchical validation
      for (final item in mainContent) {
        if (item is! Map<String, dynamic>) {
          throw const FormatException('Main content items must be structured objects');
        }
        final heading = item['heading']?.toString().trim() ?? '';
        final explanation = item['explanation']?.toString().trim() ?? '';
        
        if (heading.isEmpty) throw const FormatException('Section heading cannot be empty');
        if (explanation.isEmpty) throw const FormatException('Section explanation cannot be empty');
      }

      final summary = json['summary'].toString().trim();
      // Simple repair for summary if missing
      final repairedSummary = summary.isNotEmpty 
          ? summary 
          : 'In this lesson, we studied $topic, covering its key principles and applications.';

      final Map<String, dynamic> repairedJson = {
        ...json,
        'topic': topic,
        'learning_objectives': objectives,
        'introduction': introduction,
        'summary': repairedSummary,
      };

      return StructuredNoteContent.fromJson(repairedJson);
    } catch (e) {
      if (e is FormatException) rethrow;
      throw FormatException('Invalid AI Response Format: $e');
    }
  }
}
