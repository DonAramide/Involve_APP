import 'dart:convert';
import 'package:drift/drift.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:involve_app/features/school/domain/entities/lesson_note_models.dart';
import 'package:involve_app/features/school/domain/repositories/lesson_note_repository.dart';

class LessonNoteRepositoryImpl implements ILessonNoteRepository {
  final AppDatabase db;

  LessonNoteRepositoryImpl(this.db);

  @override
  Future<LessonNote?> getLatestLessonByHash(String hash) async {
    final query = db.select(db.lessonNotes)
      ..where((t) => t.contentHash.equals(hash) & t.isDeleted.equals(false))
      ..orderBy([(t) => OrderingTerm(expression: t.version, mode: OrderingMode.desc)])
      ..limit(1);

    final row = await query.getSingleOrNull();
    return row != null ? _mapToEntity(row) : null;
  }

  @override
  Future<List<LessonNote>> getLessonHistory(String hash) async {
    final query = db.select(db.lessonNotes)
      ..where((t) => t.contentHash.equals(hash) & t.isDeleted.equals(false))
      ..orderBy([(t) => OrderingTerm(expression: t.version, mode: OrderingMode.desc)]);

    final rows = await query.get();
    return rows.map(_mapToEntity).toList();
  }

  @override
  Future<CurriculumEntry> getOrCreateCurriculumEntry(CurriculumEntry entry) async {
    final query = db.select(db.curriculumMap)..where((t) => 
      t.classId.equals(entry.classId) & 
      t.subjectId.equals(entry.subjectId) & 
      t.termId.equals(entry.termId) & 
      t.week.equals(entry.week) & 
      t.topic.equals(entry.topic)
    );
    
    final existing = await query.getSingleOrNull();
    if (existing != null) {
      return CurriculumEntry(
        id: existing.id,
        classId: existing.classId,
        subjectId: existing.subjectId,
        termId: existing.termId,
        week: existing.week,
        topic: existing.topic,
      );
    }
    
    final id = await db.into(db.curriculumMap).insert(
      CurriculumMapCompanion.insert(
        classId: entry.classId,
        subjectId: entry.subjectId,
        termId: entry.termId,
        week: entry.week,
        topic: entry.topic,
      )
    );
    
    return entry.id == null ? CurriculumEntry(
      id: id,
      classId: entry.classId,
      subjectId: entry.subjectId,
      termId: entry.termId,
      week: entry.week,
      topic: entry.topic,
    ) : entry;
  }


  @override
  Future<List<LessonNote>> getLatestLessonsCursor({
    DateTime? lastUpdatedAt,
    int? lastId,
    int limit = 20,
  }) async {
    final results = await db.customSelect(
      '''
      SELECT * FROM lesson_notes t1
      WHERE t1.is_deleted = 0
      AND t1.version = (
        SELECT MAX(version) FROM lesson_notes t2
        WHERE t2.content_hash = t1.content_hash
        AND t2.is_deleted = 0
      )
      ${lastUpdatedAt != null && lastId != null ? 'AND (t1.updated_at < ? OR (t1.updated_at = ? AND t1.id < ?))' : ''}
      ORDER BY t1.updated_at DESC, t1.id DESC
      LIMIT ?
      ''',
      variables: [
        if (lastUpdatedAt != null && lastId != null) ...[
          Variable.withDateTime(lastUpdatedAt),
          Variable.withDateTime(lastUpdatedAt),
          Variable.withInt(lastId),
        ],
        Variable.withInt(limit),
      ],
    ).get();

    return results.map((row) => _mapToEntity(db.lessonNotes.map(row.data))).toList();
  }

  @override
  Future<void> resetStuckSyncs() async {
    await (db.update(db.lessonNotes)
          ..where((t) => t.syncStatus.equals(1))) // 1 is 'syncing'
        .write(const LessonNotesCompanion(syncStatus: Value(0))); // 0 is 'pending'
  }

  @override
  Future<List<LessonNote>> getSyncReadyLessons({int limit = 50}) async {
    final query = db.select(db.lessonNotes)
      ..where((t) => (t.syncStatus.equals(0) | t.syncStatus.equals(3)) & t.retryCount.isSmallerThanValue(5))
      ..limit(limit);
    
    final rows = await query.get();
    return rows.map(_mapToEntity).toList();
  }

  @override
  Future<void> updateSyncStatus(String syncId, SyncStatus status, {int? retryCount, String? error}) async {
    await (db.update(db.lessonNotes)..where((t) => t.syncId.equals(syncId)))
        .write(LessonNotesCompanion(
          syncStatus: Value(status.index),
          retryCount: retryCount != null ? Value(retryCount) : const Value.absent(),
          updatedAt: Value(DateTime.now()),
        ));
  }

  @override
  Future<void> saveLessonNote(LessonNote note) async {
    await db.transaction(() async {
      final latest = await getLatestLessonByHash(note.contentHash);
      final nextVersion = (latest?.version ?? 0) + 1;
      final syncId = '${note.contentHash}-v$nextVersion';

      // Logic Clock Drift Protection:
      // Ensure local updatedAt is strictly greater than the previous version's updatedAt
      var updatedAt = DateTime.now().toUtc();
      if (latest != null && latest.updatedAt != null) {
        if (!updatedAt.isAfter(latest.updatedAt!)) {
          updatedAt = latest.updatedAt!.add(const Duration(milliseconds: 1));
        }
      }

      await db.into(db.lessonNotes).insert(
            LessonNotesCompanion.insert(
              curriculumId: Value(note.curriculumId),
              classId: Value(note.classId),
              subjectId: Value(note.subjectId),
              termId: Value(note.termId),
              className: note.className,
              subjectName: note.subjectName,
              term: note.term,
              week: note.week,
              topic: note.topic,
              content: jsonEncode(note.content.toJson()),
              contentHash: note.contentHash,
              isAiGenerated: Value(note.isAiGenerated),
              version: Value(nextVersion),
              syncStatus: const Value(0), // pending
              syncId: Value(syncId),
              retryCount: const Value(0),
              isDeleted: const Value(false),
              createdAt: Value(DateTime.now().toUtc()),
              updatedAt: Value(updatedAt),
            ),
          );
    });
  }

  @override
  Future<void> deleteLesson(String hash) async {
    await db.transaction(() async {
      await (db.update(db.lessonNotes)..where((t) => t.contentHash.equals(hash)))
          .write(const LessonNotesCompanion(
            isDeleted: Value(true),
            syncStatus: Value(0), // Mark for sync as deleted
          ));
    });
  }

  LessonNote _mapToEntity(LessonNoteTable data) {
    return LessonNote(
      id: data.id,
      curriculumId: data.curriculumId,
      classId: data.classId,
      subjectId: data.subjectId,
      termId: data.termId,
      className: data.className,
      subjectName: data.subjectName,
      term: data.term,
      week: data.week,
      topic: data.topic,
      content: StructuredNoteContent.fromJson(jsonDecode(data.content)),
      contentHash: data.contentHash,
      isAiGenerated: data.isAiGenerated,
      version: data.version,
      syncStatus: SyncStatus.values[data.syncStatus],
      syncId: data.syncId,
      retryCount: data.retryCount,
      isDeleted: data.isDeleted,
      deviceId: data.deviceId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    );
  }
}
