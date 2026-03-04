import 'dart:typed_data';
import 'package:drift/drift.dart';
import '../../../stock/data/datasources/app_database.dart';
import '../../domain/entities/academic_year.dart';
import '../../domain/entities/term.dart';
import '../../domain/entities/school_class.dart';
import '../../domain/entities/student.dart';
import '../../domain/entities/subject.dart';
import '../../domain/entities/academic_result.dart';
import '../../domain/repositories/school_repository.dart';

class SchoolRepositoryImpl implements SchoolRepository {
  final AppDatabase db;

  SchoolRepositoryImpl(this.db);

  @override
  Future<List<AcademicYear>> getAcademicYears() async {
    final rows = await db.select(db.academicYears).get();
    return rows.map((row) => AcademicYear(
      id: row.id,
      name: row.name,
      isActive: row.isActive,
    )).toList();
  }

  @override
  Future<void> addAcademicYear(AcademicYear year) async {
    try {
      await db.into(db.academicYears).insert(AcademicYearsCompanion(
        name: Value(year.name),
        isActive: Value(year.isActive),
      ));
    } catch (e) {
      if (e.toString().contains('UNIQUE constraint failed')) {
        throw Exception('Academic year "${year.name}" already exists.');
      }
      rethrow;
    }
  }

  @override
  Future<void> updateAcademicYear(AcademicYear year) async {
    await (db.update(db.academicYears)..where((t) => t.id.equals(year.id!)))
        .write(AcademicYearsCompanion(
      name: Value(year.name),
      isActive: Value(year.isActive),
    ));
  }

  @override
  Future<void> deleteAcademicYear(int id) async {
    await (db.delete(db.academicYears)..where((t) => t.id.equals(id))).go();
  }

  @override
  Future<void> setActiveYear(int id) async {
    await db.batch((batch) {
      batch.update(db.academicYears, const AcademicYearsCompanion(isActive: Value(false)));
      batch.update(db.academicYears, const AcademicYearsCompanion(isActive: Value(true)),
          where: (t) => t.id.equals(id));
    });
  }

  @override
  Future<List<Term>> getTerms(int academicYearId) async {
    final rows = await (db.select(db.terms)..where((t) => t.academicYearId.equals(academicYearId))).get();
    return rows.map((row) => Term(
      id: row.id,
      academicYearId: row.academicYearId,
      name: row.name,
      isActive: row.isActive,
    )).toList();
  }

  @override
  Future<void> addTerm(Term term) async {
    try {
      await db.into(db.terms).insert(TermsCompanion(
        academicYearId: Value(term.academicYearId),
        name: Value(term.name),
        isActive: Value(term.isActive),
      ));
    } catch (e) {
      if (e.toString().contains('UNIQUE constraint failed')) {
        throw Exception('Term "${term.name}" already exists in this academic year.');
      }
      rethrow;
    }
  }

  @override
  Future<void> updateTerm(Term term) async {
    await (db.update(db.terms)..where((t) => t.id.equals(term.id!)))
        .write(TermsCompanion(
      name: Value(term.name),
      isActive: Value(term.isActive),
    ));
  }

  @override
  Future<void> deleteTerm(int id) async {
    await (db.delete(db.terms)..where((t) => t.id.equals(id))).go();
  }

  @override
  Future<void> setActiveTerm(int id) async {
    // Note: We might want to set active term within a specific year, 
    // but usually only one term is active globally in this app's context.
    await db.batch((batch) {
      batch.update(db.terms, const TermsCompanion(isActive: Value(false)));
      batch.update(db.terms, const TermsCompanion(isActive: Value(true)),
          where: (t) => t.id.equals(id));
    });
  }

  @override
  Future<List<SchoolClass>> getClasses() async {
    final rows = await db.select(db.classes).get();
    return rows.map((row) => SchoolClass(
      id: row.id,
      name: row.name,
      description: row.description,
    )).toList();
  }

  @override
  Future<void> addClass(SchoolClass schoolClass) async {
    try {
      await db.into(db.classes).insert(ClassesCompanion(
        name: Value(schoolClass.name),
        description: Value(schoolClass.description),
      ));
    } catch (e) {
      if (e.toString().contains('UNIQUE constraint failed')) {
        throw Exception('Class "${schoolClass.name}" already exists.');
      }
      rethrow;
    }
  }

  @override
  Future<void> updateClass(SchoolClass schoolClass) async {
    await (db.update(db.classes)..where((t) => t.id.equals(schoolClass.id!)))
        .write(ClassesCompanion(
      name: Value(schoolClass.name),
      description: Value(schoolClass.description),
    ));
  }

  @override
  Future<void> deleteClass(int id) async {
    await (db.delete(db.classes)..where((t) => t.id.equals(id))).go();
  }

  @override
  Future<List<Student>> getStudents() async {
    final rows = await db.select(db.students).get();
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
    try {
      await db.into(db.students).insert(StudentsCompanion(
        admissionNumber: Value(student.admissionNumber),
        firstName: Value(student.firstName),
        lastName: Value(student.lastName),
        classId: Value(student.classId),
        parentName: Value(student.parentName),
        parentPhone: Value(student.parentPhone),
        balance: Value(student.balance),
        image: Value(student.image),
        dateOfBirth: Value(student.dateOfBirth),
        registrationDate: student.registrationDate != null ? Value(student.registrationDate!) : const Value.absent(),
      ));
    } catch (e) {
      if (e.toString().contains('UNIQUE constraint failed')) {
        throw Exception('Student with admission number "${student.admissionNumber}" already exists.');
      }
      rethrow;
    }
  }

  @override
  Future<void> updateStudent(Student student) async {
    await (db.update(db.students)..where((t) => t.id.equals(student.id!)))
        .write(StudentsCompanion(
      admissionNumber: Value(student.admissionNumber),
      firstName: Value(student.firstName),
      lastName: Value(student.lastName),
      classId: Value(student.classId),
      parentName: Value(student.parentName),
      parentPhone: Value(student.parentPhone),
      balance: Value(student.balance),
      image: Value(student.image),
      dateOfBirth: Value(student.dateOfBirth),
      registrationDate: student.registrationDate != null ? Value(student.registrationDate!) : const Value.absent(),
    ));
  }

  @override
  Future<void> deleteStudent(int id) async {
    await (db.delete(db.students)..where((t) => t.id.equals(id))).go();
  }

  @override
  Future<void> promoteStudents(List<int> studentIds, int targetClassId) async {
    await (db.update(db.students)
          ..where((t) => t.id.isIn(studentIds)))
        .write(StudentsCompanion(
      classId: Value(targetClassId),
    ));
  }

  // Subjects Implementation
  @override
  Future<List<Subject>> getSubjects() async {
    final rows = await db.select(db.subjects).get();
    return rows.map((row) => Subject(
      id: row.id,
      name: row.name,
      code: row.code,
    )).toList();
  }

  @override
  Future<void> addSubject(Subject subject) async {
    try {
      await db.into(db.subjects).insert(SubjectsCompanion(
        name: Value(subject.name),
        code: Value(subject.code),
        createdAt: Value(DateTime.now()),
        updatedAt: Value(DateTime.now()),
      ));
    } catch (e) {
      if (e.toString().contains('UNIQUE constraint failed')) {
        throw Exception('Subject "${subject.name}" already exists.');
      }
      rethrow;
    }
  }

  @override
  Future<void> updateSubject(Subject subject) async {
    await (db.update(db.subjects)..where((t) => t.id.equals(subject.id!)))
        .write(SubjectsCompanion(
      name: Value(subject.name),
      code: Value(subject.code),
      updatedAt: Value(DateTime.now()),
    ));
  }

  @override
  Future<void> deleteSubject(int id) async {
    await (db.delete(db.subjects)..where((t) => t.id.equals(id))).go();
  }

  // Results Implementation
  @override
  Future<List<AcademicResult>> getResults({
    int? studentId,
    int? classId,
    int? subjectId,
    int? termId,
    int? academicYearId,
  }) async {
    final query = db.select(db.results);
    
    if (studentId != null) query.where((t) => t.studentId.equals(studentId));
    if (subjectId != null) query.where((t) => t.subjectId.equals(subjectId));
    if (termId != null) query.where((t) => t.termId.equals(termId));
    if (academicYearId != null) query.where((t) => t.academicYearId.equals(academicYearId));

    if (classId != null) {
      final studentIds = await (db.select(db.students)
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
    )).toList();
  }

  @override
  Future<void> saveResults(List<AcademicResult> results) async {
    await db.batch((batch) {
      for (final res in results) {
        batch.insert(
          db.results,
          ResultsCompanion(
            studentId: Value(res.studentId),
            subjectId: Value(res.subjectId),
            termId: Value(res.termId),
            academicYearId: Value(res.academicYearId),
            assessmentScore: Value(res.assessmentScore),
            examScore: Value(res.examScore),
            totalScore: Value(res.totalScore),
            grade: Value(res.grade),
            remarks: Value(res.remarks),
            createdAt: Value(DateTime.now()),
            updatedAt: Value(DateTime.now()),
          ),
          mode: InsertMode.insertOrReplace,
        );
      }
    });
  }
}
