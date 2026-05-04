import '../entities/lesson_note_models.dart';

abstract class IAIService {
  /// Generates a structured lesson note based on the provided metadata.
  /// Implementations should handle provider-specific logic and retries.
  Future<StructuredNoteContent> generateLessonNote({
    required String className,
    required String subjectName,
    required String term,
    required int week,
    required String topic,
    required String schoolId,
    required String teacherId,
    bool forceRefresh = false,
  });
}
