import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:involve_app/features/school/domain/entities/lesson_note_models.dart';
import 'package:involve_app/features/school/domain/repositories/lesson_note_repository.dart';
import 'package:involve_app/features/school/domain/services/ai_service_interface.dart';
import 'package:involve_app/features/settings/domain/services/security_service.dart';
import 'package:involve_app/core/utils/hashing_utils.dart';

// --- Events ---
abstract class LessonNoteEvent extends Equatable {
  const LessonNoteEvent();
  @override
  List<Object?> get props => [];
}

class LoadLessonNotes extends LessonNoteEvent {
  final bool refresh;
  const LoadLessonNotes({this.refresh = false});
}

class LoadMoreLessons extends LessonNoteEvent {}

class GenerateLesson extends LessonNoteEvent {
  final int classId;
  final String className;
  final int subjectId;
  final String subjectName;
  final int termId;
  final String termName;
  final int week;
  final String topic;

  final String schoolId;
  final String teacherId;
  final bool forceRefresh;

  const GenerateLesson({
    required this.classId,
    required this.className,
    required this.subjectId,
    required this.subjectName,
    required this.termId,
    required this.termName,
    required this.week,
    required this.topic,
    required this.schoolId,
    required this.teacherId,
    this.forceRefresh = false,
  });

  @override
  List<Object?> get props => [classId, className, subjectId, subjectName, termId, termName, week, topic, schoolId, teacherId, forceRefresh];
}

class SaveLessonVersion extends LessonNoteEvent {
  final LessonNote note;
  const SaveLessonVersion(this.note);
  @override
  List<Object?> get props => [note];
}

class DeleteLesson extends LessonNoteEvent {
  final String hash;
  const DeleteLesson(this.hash);
  @override
  List<Object?> get props => [hash];
}

// --- States ---
class LessonNoteState extends Equatable {
  final List<LessonNote> lessons;
  final bool isLoading;
  final bool isGenerating;
  final LessonNote? generatedNote;
  final String? successMessage;
  final String? error;
  final bool hasReachedMax;
  final DateTime? lastUpdatedAt;
  final int? lastId;

  const LessonNoteState({
    this.lessons = const [],
    this.isLoading = false,
    this.isGenerating = false,
    this.generatedNote,
    this.successMessage,
    this.error,
    this.hasReachedMax = false,
    this.lastUpdatedAt,
    this.lastId,
  });

  @override
  List<Object?> get props => [
        lessons,
        isLoading,
        isGenerating,
        generatedNote,
        successMessage,
        error,
        hasReachedMax,
        lastUpdatedAt,
        lastId,
      ];

  LessonNoteState copyWith({
    List<LessonNote>? lessons,
    bool? isLoading,
    bool? isGenerating,
    LessonNote? generatedNote,
    String? successMessage,
    String? error,
    bool? hasReachedMax,
    DateTime? lastUpdatedAt,
    int? lastId,
  }) {
    return LessonNoteState(
      lessons: lessons ?? this.lessons,
      isLoading: isLoading ?? this.isLoading,
      isGenerating: isGenerating ?? this.isGenerating,
      generatedNote: generatedNote ?? this.generatedNote,
      successMessage: successMessage ?? this.successMessage,
      error: error ?? this.error,
      hasReachedMax: hasReachedMax ?? this.hasReachedMax,
      lastUpdatedAt: lastUpdatedAt ?? this.lastUpdatedAt,
      lastId: lastId ?? this.lastId,
    );
  }
}

class LessonNoteInitial extends LessonNoteState {
  const LessonNoteInitial() : super();
}

class LessonNoteLoading extends LessonNoteState {
  const LessonNoteLoading({super.lessons}) : super(isLoading: true);
}

class LessonGenerating extends LessonNoteState {
  const LessonGenerating({super.lessons}) : super(isGenerating: true);
}

class LessonReady extends LessonNoteState {
  final LessonNote note;
  const LessonReady(this.note, {super.lessons}) : super(generatedNote: note);
  @override
  List<Object?> get props => [...super.props, note];
}

class LessonError extends LessonNoteState {
  final String message;
  const LessonError(this.message, {super.lessons}) : super(error: message);
  @override
  List<Object?> get props => [...super.props, message];
}

// --- Bloc ---
class LessonNoteBloc extends Bloc<LessonNoteEvent, LessonNoteState> {
  final ILessonNoteRepository repository;
  final IAIService aiService;
  final SecurityService securityService;

  LessonNoteBloc({
    required this.repository,
    required this.aiService,
    required this.securityService,
  }) : super(const LessonNoteInitial()) {
    on<LoadLessonNotes>(_onLoadLessons);
    on<LoadMoreLessons>(_onLoadMore);
    on<GenerateLesson>(_onGenerateLesson);
    on<SaveLessonVersion>(_onSaveLessonVersion);
    on<DeleteLesson>(_onDeleteLesson);
  }

  Future<void> _onLoadLessons(LoadLessonNotes event, Emitter<LessonNoteState> emit) async {
    emit(event.refresh 
      ? state.copyWith(isLoading: true, lessons: [], lastUpdatedAt: null, lastId: null, hasReachedMax: false) 
      : state.copyWith(isLoading: true));
    try {
      final lessons = await repository.getLatestLessonsCursor(limit: 20);
      final lastLesson = lessons.isNotEmpty ? lessons.last : null;
      
      emit(state.copyWith(
        isLoading: false, 
        lessons: lessons,
        lastUpdatedAt: lastLesson?.updatedAt,
        lastId: lastLesson?.id,
        hasReachedMax: lessons.length < 20,
      ));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  Future<void> _onLoadMore(LoadMoreLessons event, Emitter<LessonNoteState> emit) async {
    if (state.hasReachedMax) return;
    try {
      final moreLessons = await repository.getLatestLessonsCursor(
        lastUpdatedAt: state.lastUpdatedAt,
        lastId: state.lastId,
        limit: 20,
      );
      
      if (moreLessons.isEmpty) {
        emit(state.copyWith(hasReachedMax: true));
      } else {
        final lastLesson = moreLessons.last;
        emit(state.copyWith(
          lessons: List.of(state.lessons)..addAll(moreLessons),
          lastUpdatedAt: lastLesson.updatedAt,
          lastId: lastLesson.id,
          hasReachedMax: moreLessons.length < 20,
        ));
      }
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> _onGenerateLesson(GenerateLesson event, Emitter<LessonNoteState> emit) async {
    final hash = HashingUtils.generateContentHash(
      className: event.className,
      subjectName: event.subjectName,
      term: event.termName,
      week: event.week,
      topic: event.topic,
    );

    // 1. Check Cache (if not forced)
    emit(LessonNoteLoading());
    try {
      if (!event.forceRefresh) {
        final existing = await repository.getLatestLessonByHash(hash);
        if (existing != null) {
          emit(LessonReady(existing));
          return;
        }
      }
    } catch (e) {
      // Log error but continue to AI if possible
    }

    // 2. AI Generation
    emit(LessonGenerating());
    try {
      final content = await aiService.generateLessonNote(
        className: event.className,
        subjectName: event.subjectName,
        term: event.termName,
        week: event.week,
        topic: event.topic,
        schoolId: event.schoolId,
        teacherId: event.teacherId,
        forceRefresh: event.forceRefresh,
      );

      // Create Curriculum Entry
      final curriculum = await repository.getOrCreateCurriculumEntry(CurriculumEntry(
        classId: event.classId,
        subjectId: event.subjectId,
        termId: event.termId,
        week: event.week,
        topic: event.topic,
      ));

      final newNote = LessonNote(
        curriculumId: curriculum.id,
        classId: event.classId,
        subjectId: event.subjectId,
        termId: event.termId,
        className: event.className,
        subjectName: event.subjectName,
        term: event.termName,
        week: event.week,
        topic: event.topic,
        content: content,
        contentHash: hash,
        isAiGenerated: true,
      );

      // 3. Save automatically to local database for offline-first support
      await repository.saveLessonNote(newNote);
      add(const LoadLessonNotes()); // Refresh list background

      emit(LessonReady(newNote));
    } catch (e) {
      emit(LessonError('Generation failed: $e'));
    }
  }

  Future<void> _onSaveLessonVersion(SaveLessonVersion event, Emitter<LessonNoteState> emit) async {
    try {
      await repository.saveLessonNote(event.note);
      add(const LoadLessonNotes()); // Reload list
    } catch (e) {
      emit(LessonError('Failed to save lesson: $e'));
    }
  }

  Future<void> _onDeleteLesson(DeleteLesson event, Emitter<LessonNoteState> emit) async {
    try {
      await repository.deleteLesson(event.hash);
      add(const LoadLessonNotes());
    } catch (e) {
      emit(LessonError('Failed to delete lesson: $e'));
    }
  }
}
