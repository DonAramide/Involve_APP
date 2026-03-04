import 'package:drift/drift.dart';
import '../../domain/entities/grading_rule.dart';
import '../../domain/entities/school_entities.dart';
import '../../domain/repositories/school_repository.dart';
import '../../../stock/data/datasources/app_database.dart' as db;

class SchoolRepositoryImpl implements SchoolRepository {
  final db.AppDatabase database;

  SchoolRepositoryImpl(this.database);

  @override
  Future<List<GradingRule>> getGradingRules() async {
    final rows = await database.select(database.gradingRules).get();
    return rows.map((row) => GradingRule(
      id: row.id,
      grade: row.grade,
      minScore: row.minScore,
      maxScore: row.maxScore,
      remarks: row.remarks,
    )).toList();
  }

  @override
  Future<int> addGradingRule(GradingRule rule) {
    return database.into(database.gradingRules).insert(db.GradingRulesCompanion.insert(
      grade: rule.grade,
      minScore: rule.minScore,
      maxScore: rule.maxScore,
      remarks: Value(rule.remarks),
    ));
  }

  @override
  Future<void> updateGradingRule(GradingRule rule) {
    return (database.update(database.gradingRules)..where((t) => t.id.equals(rule.id!))).write(
      db.GradingRulesCompanion(
        grade: Value(rule.grade),
        minScore: Value(rule.minScore),
        maxScore: Value(rule.maxScore),
        remarks: Value(rule.remarks),
      ),
    );
  }

  @override
  Future<void> deleteGradingRule(int id) {
    return (database.delete(database.gradingRules)..where((t) => t.id.equals(id))).go();
  }

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
  Future<List<ClassEntity>> getClasses() async {
    final rows = await database.select(database.classes).get();
    return rows.map((row) => ClassEntity(
      id: row.id,
      name: row.name,
    )).toList();
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
  Future<List<Student>> getStudents(int classId) async {
    final query = database.select(database.students)..where((t) => t.classId.equals(classId));
    final rows = await query.get();
    return rows.map((row) => Student(
      id: row.id,
      admissionNumber: row.admissionNumber,
      firstName: row.firstName,
      lastName: row.lastName,
      classId: row.classId,
      image: row.image,
      dateOfBirth: row.dateOfBirth,
      registrationDate: row.registrationDate,
    )).toList();
  }

  @override
  Future<List<Result>> getResults({
    required int classId, 
    required int subjectId, 
    required int termId, 
    required int academicYearId
  }) async {
    final query = database.select(database.results).join([
      innerJoin(database.students, database.students.id.equalsExp(database.results.studentId)),
    ])..where(
      database.students.classId.equals(classId) &
      database.results.subjectId.equals(subjectId) &
      database.results.termId.equals(termId) &
      database.results.academicYearId.equals(academicYearId)
    );

    final rows = await query.get();
    return rows.map((row) {
      final r = row.readTable(database.results);
      return Result(
        id: r.id,
        studentId: r.studentId,
        subjectId: r.subjectId,
        termId: r.termId,
        academicYearId: r.academicYearId,
        score: r.score,
        dateEntered: r.dateEntered,
      );
    }).toList();
  }

  @override
  Future<void> saveResults(List<Result> results) async {
    await database.transaction(() async {
      for (final result in results) {
        await database.into(database.results).insert(
          db.ResultsCompanion.insert(
            studentId: result.studentId,
            subjectId: result.subjectId,
            termId: result.termId,
            academicYearId: result.academicYearId,
            score: result.score,
            dateEntered: Value(result.dateEntered),
          ),
          mode: InsertMode.replace,
        );
      }
    });
  }
}
