import 'dart:typed_data';
import 'package:drift/drift.dart';
import '../../domain/entities/school_entities.dart';
import '../../domain/entities/grading_rule.dart';
import '../../domain/repositories/school_repository.dart';
import '../../../stock/data/datasources/app_database.dart' as db;

class SchoolRepositoryImpl implements SchoolRepository {
  final db.AppDatabase database;

  SchoolRepositoryImpl(this.database);

  @override
  Future<List<AcademicYear>> getAcademicYears() async {
    final rows = await database.select(database.academicYears).get();
    return rows.map((row) => AcademicYear(
      id: row.id,
      name: row.name,
      startDate: row.startDate,
      endDate: row.endDate,
      isCurrent: row.isCurrent,
    )).toList();
  }

  @override
  Future<void> addAcademicYear(AcademicYear year) async {
    await database.into(database.academicYears).insert(db.AcademicYearsCompanion.insert(
      name: year.name,
      startDate: year.startDate,
      endDate: year.endDate,
      isCurrent: Value(year.isCurrent),
    ));
  }

  @override
  Future<void> updateAcademicYear(AcademicYear year) async {
    await (database.update(database.academicYears)..where((t) => t.id.equals(year.id!)))
        .write(db.AcademicYearsCompanion(
      name: Value(year.name),
      startDate: Value(year.startDate),
      endDate: Value(year.endDate),
      isCurrent: Value(year.isCurrent),
    ));
  }

  @override
  Future<void> deleteAcademicYear(int id) async {
    await (database.delete(database.academicYears)..where((t) => t.id.equals(id))).go();
  }

  @override
  Future<void> setActiveYear(int id) async {
    await database.batch((batch) {
      batch.update(database.academicYears, const db.AcademicYearsCompanion(isCurrent: Value(false)));
      batch.update(database.academicYears, const db.AcademicYearsCompanion(isCurrent: Value(true)),
          where: (t) => t.id.equals(id));
    });
  }

  @override
  Future<List<Term>> getTerms(int academicYearId) async {
    final query = database.select(database.terms)..where((t) => t.academicYearId.equals(academicYearId));
    final rows = await query.get();
    return rows.map((row) => Term(
      id: row.id,
      academicYearId: row.academicYearId,
      name: row.name,
      startDate: row.startDate,
      endDate: row.endDate,
      isCurrent: row.isCurrent,
    )).toList();
  }

  @override
  Future<void> addTerm(Term term) async {
    await database.into(database.terms).insert(db.TermsCompanion.insert(
      academicYearId: term.academicYearId,
      name: term.name,
      startDate: term.startDate,
      endDate: term.endDate,
      isCurrent: Value(term.isCurrent),
    ));
  }

  @override
  Future<void> updateTerm(Term term) async {
    await (database.update(database.terms)..where((t) => t.id.equals(term.id!)))
        .write(db.TermsCompanion(
      academicYearId: Value(term.academicYearId),
      name: Value(term.name),
      startDate: Value(term.startDate),
      endDate: Value(term.endDate),
      isCurrent: Value(term.isCurrent),
    ));
  }

  @override
  Future<void> deleteTerm(int id) async {
    await (database.delete(database.terms)..where((t) => t.id.equals(id))).go();
  }

  @override
  Future<void> setActiveTerm(int id) async {
    await database.batch((batch) {
      batch.update(database.terms, const db.TermsCompanion(isCurrent: Value(false)));
      batch.update(database.terms, const db.TermsCompanion(isCurrent: Value(true)),
          where: (t) => t.id.equals(id));
    });
  }

  @override
  Future<List<SchoolClass>> getClasses() async {
    final rows = await database.select(database.classes).get();
    return rows.map((row) => SchoolClass(
      id: row.id,
      name: row.name,
    )).toList();
  }

  @override
  Future<void> addClass(SchoolClass schoolClass) async {
    await database.into(database.classes).insert(db.ClassesCompanion.insert(
      name: schoolClass.name,
    ));
  }

  @override
  Future<void> updateClass(SchoolClass schoolClass) async {
    await (database.update(database.classes)..where((t) => t.id.equals(schoolClass.id!)))
        .write(db.ClassesCompanion(
      name: Value(schoolClass.name),
    ));
  }

  @override
  Future<void> deleteClass(int id) async {
    await (database.delete(database.classes)..where((t) => t.id.equals(id))).go();
  }

  @override
  Future<List<Student>> getStudents() async {
    final rows = await database.select(database.students).get();
    return rows.map((row) => Student(
      id: row.id,
      admissionNumber: row.admissionNumber,
      firstName: row.firstName,
      lastName: row.lastName,
      classId: row.classId,
      parentName: row.parentName,
      parentPhone: row.parentPhone,
      balance: row.balance,
      image: row.image,
      dateOfBirth: row.dateOfBirth,
      registrationDate: row.registrationDate,
    )).toList();
  }

  @override
  Future<void> addStudent(Student student) async {
    await database.into(database.students).insert(db.StudentsCompanion.insert(
      admissionNumber: student.admissionNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      classId: student.classId,
      parentName: Value(student.parentName),
      parentPhone: Value(student.parentPhone),
      balance: Value(student.balance),
      image: Value(student.image),
      dateOfBirth: Value(student.dateOfBirth),
      registrationDate: Value(student.registrationDate),
    ));
  }

  @override
  Future<void> updateStudent(Student student) async {
    await (database.update(database.students)..where((t) => t.id.equals(student.id!)))
        .write(db.StudentsCompanion(
      admissionNumber: Value(student.admissionNumber),
      firstName: Value(student.firstName),
      lastName: Value(student.lastName),
      classId: Value(student.classId),
      parentName: Value(student.parentName),
      parentPhone: Value(student.parentPhone),
      balance: Value(student.balance),
      image: Value(student.image),
      dateOfBirth: Value(student.dateOfBirth),
      registrationDate: Value(student.registrationDate),
    ));
  }

  @override
  Future<void> deleteStudent(int id) async {
    await (database.delete(database.students)..where((t) => t.id.equals(id))).go();
  }

  @override
  Future<void> promoteStudents(List<int> studentIds, int targetClassId) async {
    await (database.update(database.students)
          ..where((t) => t.id.isIn(studentIds)))
        .write(db.StudentsCompanion(
      classId: Value(targetClassId),
    ));
  }

  @override
  Future<List<Subject>> getSubjects() async {
    final rows = await database.select(database.subjects).get();
    return rows.map((row) => Subject(
      id: row.id,
      name: row.name,
      code: row.code,
    )).toList();
  }

  @override
  Future<void> addSubject(Subject subject) async {
    await database.into(database.subjects).insert(db.SubjectsCompanion.insert(
      name: subject.name,
      code: Value(subject.code),
    ));
  }

  @override
  Future<void> updateSubject(Subject subject) async {
    await (database.update(database.subjects)..where((t) => t.id.equals(subject.id!)))
        .write(db.SubjectsCompanion(
      name: Value(subject.name),
      code: Value(subject.code),
    ));
  }

  @override
  Future<void> deleteSubject(int id) async {
    await (database.delete(database.subjects)..where((t) => t.id.equals(id))).go();
  }

  @override
  Future<List<AcademicResult>> getResults({
    int? studentId,
    int? classId,
    int? subjectId,
    int? termId,
    int? academicYearId,
  }) async {
    final query = database.select(database.results);
    
    if (studentId != null) query.where((t) => t.studentId.equals(studentId));
    if (subjectId != null) query.where((t) => t.subjectId.equals(subjectId));
    if (termId != null) query.where((t) => t.termId.equals(termId));
    if (academicYearId != null) query.where((t) => t.academicYearId.equals(academicYearId));

    if (classId != null) {
      final studentIds = await (database.select(database.students)
            ..where((t) => t.classId.equals(classId)))
          .get()
          .then((rows) => rows.map((r) => r.id).toList());
      query.where((t) => t.studentId.isIn(studentIds));
    }

    final rows = await query.get();
    return rows.map((row) => AcademicResult(
      id: row.id,
      studentId: row.studentId,
      subjectId: row.subjectId,
      termId: row.termId,
      academicYearId: row.academicYearId,
      assessmentScore: row.assessmentScore,
      examScore: row.examScore,
      totalScore: row.totalScore,
      grade: row.grade,
      remarks: row.remarks,
      dateEntered: row.dateEntered,
    )).toList();
  }

  @override
  Future<void> saveResults(List<AcademicResult> results) async {
    for (final res in results) {
      final existingResult = await (database.select(database.results)
        ..where((t) => 
          t.studentId.equals(res.studentId) &
          t.subjectId.equals(res.subjectId) &
          t.termId.equals(res.termId) &
          t.academicYearId.equals(res.academicYearId)
        )).getSingleOrNull();

      if (existingResult != null) {
        // Update existing
        await (database.update(database.results)
          ..where((t) => t.id.equals(existingResult.id)))
        .write(
          db.ResultsCompanion(
            assessmentScore: Value(res.assessmentScore),
            examScore: Value(res.examScore),
            totalScore: Value(res.totalScore),
            grade: Value(res.grade),
            remarks: Value(res.remarks),
            dateEntered: Value(DateTime.now()),
            updatedAt: Value(DateTime.now()),
          )
        );
      } else {
        // Insert new
        await database.into(database.results).insert(
          db.ResultsCompanion.insert(
            studentId: res.studentId,
            subjectId: res.subjectId,
            termId: res.termId,
            academicYearId: res.academicYearId,
            assessmentScore: Value(res.assessmentScore),
            examScore: Value(res.examScore),
            totalScore: Value(res.totalScore),
            grade: Value(res.grade),
            remarks: Value(res.remarks),
            dateEntered: Value(DateTime.now()),
            createdAt: Value(DateTime.now()),
            updatedAt: Value(DateTime.now()),
          )
        );
      }
    }
  }
}
