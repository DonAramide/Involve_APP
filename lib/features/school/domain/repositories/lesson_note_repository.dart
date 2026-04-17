import '../entities/lesson_note_models.dart';

abstract class ILessonNoteRepository {
  /// Fetches the latest version of a lesson note by its content hash.
  Future<LessonNote?> getLatestLessonByHash(String hash);

  /// Fetches all versions of a lesson note for history.
  Future<List<LessonNote>> getLessonHistory(String hash);

  /// Saves a new lesson note or a new version of an existing one.
  /// Must be handled within a transaction.
  Future<void> saveLessonNote(LessonNote note);

  /// High-performance cursor-based pagination of latest versions
  Future<List<LessonNote>> getLatestLessonsCursor({
    DateTime? lastUpdatedAt,
    int? lastId,
    int limit = 20,
  });

  /// Maintenance: Resets 'syncing' records to 'pending' on startup
  Future<void> resetStuckSyncs();

  /// Sync: Fetch records ready for upload (including soft-deletions)
  Future<List<LessonNote>> getSyncReadyLessons({int limit = 50});

  /// Sync: Atomically update sync status
  Future<void> updateSyncStatus(String syncId, SyncStatus status, {int? retryCount, String? error});

  /// Deletes a lesson note and all its versions.
  Future<void> deleteLesson(String hash);

  /// Fetches or creates a curriculum entry.
  Future<CurriculumEntry> getOrCreateCurriculumEntry(CurriculumEntry entry);
}
