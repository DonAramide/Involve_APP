import 'package:drift/drift.dart';

@DataClassName('AcademicYear')
class AcademicYears extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().unique()(); // e.g., 2023/2024
  DateTimeColumn get startDate => dateTime()();
  DateTimeColumn get endDate => dateTime()();
  BoolColumn get isCurrent => boolean().withDefault(const Constant(false))();
}

@DataClassName('Term')
class Terms extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get academicYearId => integer().references(AcademicYears, #id)();
  TextColumn get name => text()(); // e.g., First Term
  DateTimeColumn get startDate => dateTime()();
  DateTimeColumn get endDate => dateTime()();
  BoolColumn get isCurrent => boolean().withDefault(const Constant(false))();

  @override
  List<Set<Column>> get uniqueKeys => [
    {academicYearId, name}
  ];
}

@DataClassName('ClassEntity')
class Classes extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().unique()(); // e.g., JSS 1, Primary 5
}

@DataClassName('FeeType')
class FeeTypes extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().unique()(); // e.g., Tuition, Hostel, Library
}

@DataClassName('Student')
class Students extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get admissionNumber => text().unique()();
  TextColumn get firstName => text()();
  TextColumn get lastName => text()();
  IntColumn get classId => integer().references(Classes, #id)();
  BlobColumn get image => blob().nullable()();
  DateTimeColumn get dateOfBirth => dateTime().nullable()();
  DateTimeColumn get registrationDate => dateTime().withDefault(currentDateAndTime)();
  
  // Sync
  TextColumn get syncId => text().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().nullable()();
  TextColumn get deviceId => text().nullable()();
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();
}

@DataClassName('BusinessSetting')
class BusinessSettings extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get businessMode => text().withDefault(const Constant('retail'))(); 
  DateTimeColumn get updatedAt => dateTime().nullable()();
}

@DataClassName('Subject')
class Subjects extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().unique()();
  TextColumn get code => text().nullable()();
}

@DataClassName('Result')
class Results extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get studentId => integer().references(Students, #id)();
  IntColumn get subjectId => integer().references(Subjects, #id)();
  IntColumn get termId => integer().references(Terms, #id)();
  IntColumn get academicYearId => integer().references(AcademicYears, #id)();
  RealColumn get score => real()();
  DateTimeColumn get dateEntered => dateTime().withDefault(currentDateAndTime)();
}

@DataClassName('GradingRuleTable')
class GradingRules extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get grade => text()(); // A1, B2, etc.
  RealColumn get minScore => real()();
  RealColumn get maxScore => real()();
  TextColumn get remarks => text().nullable()();
}
