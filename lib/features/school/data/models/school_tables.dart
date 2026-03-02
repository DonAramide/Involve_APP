import 'package:drift/drift.dart';

@DataClassName('AcademicYearTable')
class AcademicYears extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().unique()();
  BoolColumn get isActive => boolean().withDefault(const Constant(false))();
}

@DataClassName('TermTable')
class Terms extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get academicYearId => integer().references(AcademicYears, #id)();
  TextColumn get name => text()();

  @override
  List<Set<Column>> get uniqueKeys => [
    {academicYearId, name}
  ];
  BoolColumn get isActive => boolean().withDefault(const Constant(false))();
}

@DataClassName('ClassTable')
class Classes extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().unique()();
  TextColumn get description => text().nullable()();
}

@DataClassName('FeeTypeTable')
class FeeTypes extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().unique()();
  TextColumn get description => text().nullable()();
}

@DataClassName('StudentTable')
class Students extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get admissionNumber => text().nullable().unique()();
  TextColumn get firstName => text()();
  TextColumn get lastName => text()();
  IntColumn get classId => integer().nullable().references(Classes, #id)();
  TextColumn get parentName => text().nullable()();
  TextColumn get parentPhone => text().nullable()();
  DateTimeColumn get dateOfBirth => dateTime().nullable()();
  DateTimeColumn get registrationDate => dateTime().withDefault(currentDateAndTime)();
  RealColumn get balance => real().withDefault(const Constant(0.0))();
  BlobColumn get image => blob().nullable()();
}

@DataClassName('BusinessSettingTable')
class BusinessSettings extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get businessMode => text().withDefault(const Constant('retail'))(); // 'retail' or 'school'
  DateTimeColumn get updatedAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
}
