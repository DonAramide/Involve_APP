import 'dart:convert';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:involve_app/features/school/domain/services/ai_service_interface.dart';
import 'package:involve_app/features/school/domain/entities/lesson_note_models.dart';
import 'package:involve_app/features/school/domain/services/lesson_note_validator.dart';

class GeminiAIService implements IAIService {
  static const int maxRetries = 3;

  @override
  Future<StructuredNoteContent> generateLessonNote({
    required String className,
    required String subjectName,
    required String term,
    required int week,
    required String topic,
    required String apiKey,
  }) async {
    final model = GenerativeModel(
      model: 'gemini-1.5-flash',
      apiKey: apiKey,
      generationConfig: GenerationConfig(
        responseMimeType: 'application/json',
      ),
    );

    final prompt = _buildPrompt(className, subjectName, term, week, topic);
    
    int attempt = 0;
    while (attempt < maxRetries) {
      try {
        final content = [Content.text(prompt)];
        final response = await model.generateContent(content);
        
        if (response.text == null || response.text!.isEmpty) {
          throw const FormatException('Empty response from Gemini');
        }

        // Validate and Parse
        return LessonNoteValidator.validateAndRepair(response.text!);
      } catch (e) {
        attempt++;
        if (attempt >= maxRetries) {
          rethrow;
        }
        // Small delay before retry
        await Future.delayed(Duration(seconds: 1 * attempt));
      }
    }
    
    throw Exception('Failed to generate lesson note after $maxRetries attempts');
  }

  String _buildPrompt(String className, String subjectName, String term, int week, String topic) {
    return '''
You are an expert Nigerian teacher following the NERDC curriculum.

TASK:
Generate a structured lesson note for a Nigerian school.

INPUT:
Class: $className
Subject: $subjectName
Term: $term
Week: $week
Topic: $topic

REQUIREMENTS:
1. Follow Nigerian scheme of work (NERDC standards).
2. Use simple language appropriate for $className level.
3. Keep it student-friendly and clear.
4. Output EXACTLY in the requested JSON format.
5. NO placeholders, NO external links, NO ads.
6. NO introduction like "Welcome to class".

OUTPUT JSON FORMAT:
{
  "topic": "$topic",
  "learning_objectives": ["bullet points"],
  "introduction": "short overview",
  "main_content": [
    {
      "heading": "sub-topic heading",
      "explanation": "detailed explanation"
    }
  ],
  "examples": ["practical examples"],
  "class_activity": ["class work"],
  "assessment": ["evaluation questions"],
  "summary": "lesson wrap-up"
}
''';
  }
}
