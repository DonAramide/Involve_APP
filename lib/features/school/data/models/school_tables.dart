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

class Students extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get admissionNumber => text().unique()();
  TextColumn get firstName => text()();
  TextColumn get lastName => text()();
  IntColumn get classId => integer().references(Classes, #id)();
  TextColumn get parentName => text().nullable()();
  TextColumn get parentPhone => text().nullable()();
  RealColumn get balance => real().withDefault(const Constant(0.0))();
  DateTimeColumn get dateOfBirth => dateTime().nullable()();
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

