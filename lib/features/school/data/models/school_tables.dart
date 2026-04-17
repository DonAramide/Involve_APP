import 'package:drift/drift.dart';

@DataClassName('AcademicYearTable')
class AcademicYears extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().unique()();
  DateTimeColumn get startDate => dateTime()();
  DateTimeColumn get endDate => dateTime()();
  BoolColumn get isCurrent => boolean().withDefault(const Constant(false))();

  // Sync Columns
  TextColumn get syncId => text().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().nullable()();
  TextColumn get deviceId => text().nullable()();
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();
}

@DataClassName('TermTable')
class Terms extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get academicYearId => integer().references(AcademicYears, #id)();
  TextColumn get name => text()();
  DateTimeColumn get startDate => dateTime()();
  DateTimeColumn get endDate => dateTime()();
  BoolColumn get isCurrent => boolean().withDefault(const Constant(false))();

  @override
  List<Set<Column>> get uniqueKeys => [
    {academicYearId, name}
  ];

  // Sync Columns
  TextColumn get syncId => text().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().nullable()();
  TextColumn get deviceId => text().nullable()();
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();
}

@DataClassName('ClassTable')
class Classes extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().unique()();
  TextColumn get description => text().nullable()();

  // Sync Columns
  TextColumn get syncId => text().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().nullable()();
  TextColumn get deviceId => text().nullable()();
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();
}

@DataClassName('TeacherTable')
class Teachers extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get fullName => text()();
  TextColumn get phone => text().nullable()();
  TextColumn get profession => text().nullable()();
  IntColumn get classId => integer().nullable().references(Classes, #id)();
  RealColumn get salary => real().withDefault(const Constant(0.0))();
  IntColumn get yearsInSchool => integer().withDefault(const Constant(0))();
  DateTimeColumn get employmentDate => dateTime().withDefault(currentDateAndTime)();
  TextColumn get certificates => text().nullable()();
  BlobColumn get image => blob().nullable()();

  // Sync Columns
  TextColumn get syncId => text().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().nullable()();
  TextColumn get deviceId => text().nullable()();
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();
}

@DataClassName('StudentTable')
class Students extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get admissionNumber => text().unique()();
  TextColumn get firstName => text()();
  TextColumn get lastName => text()();
  IntColumn get classId => integer().references(Classes, #id)();
  IntColumn get academicYearId => integer().nullable().references(AcademicYears, #id)();
  TextColumn get parentName => text().nullable()();
  TextColumn get parentPhone => text().nullable()();
  RealColumn get balance => real().withDefault(const Constant(0.0))();
  DateTimeColumn get dateOfBirth => dateTime().nullable()();
  TextColumn get gender => text().nullable()();
  DateTimeColumn get registrationDate => dateTime().withDefault(currentDateAndTime)();
  BlobColumn get image => blob().nullable()();

  // Sync Columns
  TextColumn get syncId => text().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().nullable()();
  TextColumn get deviceId => text().nullable()();
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();
}

@DataClassName('BusinessSettingTable')
class BusinessSettings extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get businessMode => text().withDefault(const Constant('retail'))(); 
  DateTimeColumn get updatedAt => dateTime().nullable()();
}

@DataClassName('SubjectTable')
class Subjects extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().unique()();
  TextColumn get code => text().nullable()();
  IntColumn get teacherId => integer().nullable().references(Teachers, #id)();

  // Sync Columns
  TextColumn get syncId => text().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().nullable()();
  TextColumn get deviceId => text().nullable()();
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();
}

@DataClassName('ResultTable')
class Results extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get studentId => integer().references(Students, #id)();
  IntColumn get subjectId => integer().references(Subjects, #id)();
  IntColumn get termId => integer().references(Terms, #id)();
  IntColumn get academicYearId => integer().references(AcademicYears, #id)();
  
  RealColumn get assessmentScore => real().withDefault(const Constant(0.0))();
  RealColumn get examScore => real().withDefault(const Constant(0.0))();
  RealColumn get totalScore => real().withDefault(const Constant(0.0))();
  TextColumn get grade => text().nullable()();
  TextColumn get remarks => text().nullable()();
  DateTimeColumn get dateEntered => dateTime().withDefault(currentDateAndTime)();

  @override
  List<Set<Column>> get uniqueKeys => [
    {studentId, subjectId, termId, academicYearId}
  ];

  // Sync Columns
  TextColumn get syncId => text().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().nullable()();
  TextColumn get deviceId => text().nullable()();
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();
}

@DataClassName('GradingRuleTable')
class GradingRules extends Table {
  IntColumn get id => integer().autoIncrement()();
  RealColumn get minScore => real()();
  RealColumn get maxScore => real()();
  TextColumn get grade => text()();
  TextColumn get remarks => text().nullable()();

  // Sync Columns
  TextColumn get syncId => text().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().nullable()();
  TextColumn get deviceId => text().nullable()();
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();
}

@DataClassName('CurriculumMapTable')
class CurriculumMap extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get classId => integer().references(Classes, #id, onDelete: KeyAction.cascade)();
  IntColumn get subjectId => integer().references(Subjects, #id, onDelete: KeyAction.cascade)();
  IntColumn get termId => integer().references(Terms, #id, onDelete: KeyAction.cascade)();
  IntColumn get week => integer()();
  TextColumn get topic => text()();

  @override
  List<Set<Column>> get uniqueKeys => [
    {classId, subjectId, termId, week, topic}
  ];

  @override
  List<Index> get indexes => [
    Index('idx_curriculum_lookup', 'class_id, subject_id, term_id')
  ];
}

@DataClassName('LessonNoteTable')
class LessonNotes extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get curriculumId => integer().nullable().references(CurriculumMap, #id, onDelete: KeyAction.setNull)();
  
  // Basic metadata to ensure identity independent of curriculum_id if needed
  TextColumn get className => text()();
  TextColumn get subjectName => text()();
  TextColumn get term => text()();
  IntColumn get week => integer()();
  TextColumn get topic => text()();

  TextColumn get content => text()(); // JSON string
  TextColumn get contentHash => text()(); // SHA256 of metadata
  BoolColumn get isAiGenerated => boolean().withDefault(const Constant(true))();
  IntColumn get version => integer().withDefault(const Constant(1))();
  
  // Sync & Lifecycle Columns
  IntColumn get syncStatus => integer().withDefault(const Constant(0))(); // 0: pending
  TextColumn get syncId => text().nullable()(); // immutable once set
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();
  TextColumn get deviceId => text().nullable()();
  
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  List<Set<Column>> get uniqueKeys => [
    {contentHash, version}
  ];

  @override
  List<Index> get indexes => [
    Index('idx_lesson_hash', 'content_hash'),
    Index('idx_lesson_curriculum', 'curriculum_id'),
    Index('idx_lesson_created', 'created_at'),
    Index('idx_lesson_sync_status', 'sync_status'),
    Index('idx_lesson_deleted', 'is_deleted'),
    Index('idx_lesson_sync_id', 'sync_id'),
  ];
}
