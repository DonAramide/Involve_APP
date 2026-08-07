import 'package:dio/dio.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../models/school_tables.dart';
import '../../domain/services/ai_service_interface.dart';
import '../../domain/entities/lesson_note_models.dart';
import '../../domain/services/lesson_note_validator.dart';

class LessonNoteApiService implements IAIService {
  final Dio _dio;
  final Connectivity _connectivity;

  LessonNoteApiService(this._dio, {Connectivity? connectivity}) 
      : _connectivity = connectivity ?? Connectivity();

  @override
  Future<StructuredNoteContent> generateLessonNote({
    required String className,
    required String subjectName,
    required String term,
    required int week,
    required String topic,
    required String schoolId,
    required String teacherId,
    bool forceRefresh = false,
  }) async {
    // 1. Connectivity Check
    final connectivityResult = await _connectivity.checkConnectivity();
    if (connectivityResult == ConnectivityResult.none) {
      throw const NetworkException('Internet required for AI generation. Please connect and try again.');
    }

    try {
      // 2. API Request
      final response = await _dio.post(
        '/api/ai/lesson-note/generate',
        data: {
          'schoolId': schoolId,
          'teacherId': teacherId,
          'className': className,
          'subjectName': subjectName,
          'term': term,
          'week': week,
          'topic': topic,
          'forceRefresh': forceRefresh,
        },
      );

      if (response.statusCode == 200) {
        final data = response.data;
        if (data == null) {
          throw const FormatException('Empty response from AI server');
        }

        // 3. Parse and Validate
        // The validator now handles both Map (direct JSON) and String inputs.
        return LessonNoteValidator.validateAndRepair(data);
      } else {
        throw Exception('AI Server error: ${response.statusCode}');
      }
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout || e.type == DioExceptionType.receiveTimeout) {
        throw const NetworkException('Connection timed out. Please check your signal.');
      }
      if (e.response?.statusCode == 404) {
        throw Exception(
          'Lesson note AI endpoint not found on server. Please update/restart the backend.',
        );
      }
      final serverMsg = e.response?.data is Map
          ? (e.response!.data['error'] ?? e.response!.data['message'])
          : null;
      throw Exception(
        serverMsg != null
            ? 'Generation failed: $serverMsg'
            : 'Generation failed (${e.response?.statusCode ?? 'network error'}). Please try again.',
      );
    } catch (e) {
      rethrow;
    }
  }
}

class NetworkException implements Exception {
  final String message;
  const NetworkException(this.message);
  @override
  String toString() => message;
}
