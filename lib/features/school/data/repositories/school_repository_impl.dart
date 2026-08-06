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
      creditBalance: row.creditBalance,
      academicYearId: row.academicYearId,
      image: row.image,
      dateOfBirth: row.dateOfBirth,
      gender: row.gender,
      registrationDate: row.registrationDate!,
      virtualAccountNumber: row.virtualAccountNumber,
      virtualAccountBank: row.virtualAccountBank,
      virtualAccountStatus: row.virtualAccountStatus,
      department: row.department,
    )).toList();
  }

  @override
  Future<List<Student>> getStudentSummaries() async {
    final query = database.selectOnly(database.students)..addColumns([
      database.students.id,
      database.students.admissionNumber,
      database.students.firstName,
      database.students.lastName,
      database.students.classId,
      database.students.parentName,
      database.students.parentPhone,
      database.students.balance,
      database.students.creditBalance,
      database.students.academicYearId,
      database.students.dateOfBirth,
      database.students.gender,
      database.students.registrationDate,
      database.students.virtualAccountNumber,
      database.students.virtualAccountBank,
      database.students.virtualAccountStatus,
      database.students.department,
    ]);
    
    final rows = await query.get();
    return rows.map((row) => Student(
      id: row.read(database.students.id)!,
      admissionNumber: row.read(database.students.admissionNumber)!,
      firstName: row.read(database.students.firstName)!,
      lastName: row.read(database.students.lastName)!,
      classId: row.read(database.students.classId)!,
      parentName: row.read(database.students.parentName),
      parentPhone: row.read(database.students.parentPhone),
      balance: row.read(database.students.balance)!,
      creditBalance: row.read(database.students.creditBalance)!,
      academicYearId: row.read(database.students.academicYearId),
      dateOfBirth: row.read(database.students.dateOfBirth),
      gender: row.read(database.students.gender),
      registrationDate: row.read(database.students.registrationDate)!,
      image: null,
      virtualAccountNumber: row.read(database.students.virtualAccountNumber),
      virtualAccountBank: row.read(database.students.virtualAccountBank),
      virtualAccountStatus: row.read(database.students.virtualAccountStatus),
      department: row.read(database.students.department),
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
      creditBalance: Value(student.creditBalance),
      academicYearId: Value(student.academicYearId),
      image: Value(student.image),
      dateOfBirth: Value(student.dateOfBirth),
      gender: Value(student.gender),
      registrationDate: Value(student.registrationDate),
      virtualAccountNumber: Value(student.virtualAccountNumber),
      virtualAccountBank: Value(student.virtualAccountBank),
      virtualAccountStatus: Value(student.virtualAccountStatus),
      department: Value(student.department),
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
      creditBalance: Value(student.creditBalance),
      academicYearId: Value(student.academicYearId),
      image: Value(student.image),
      dateOfBirth: Value(student.dateOfBirth),
      gender: Value(student.gender),
      registrationDate: Value(student.registrationDate),
      virtualAccountNumber: Value(student.virtualAccountNumber),
      virtualAccountBank: Value(student.virtualAccountBank),
      virtualAccountStatus: Value(student.virtualAccountStatus),
      department: Value(student.department),
    ));
  }

  @override
  Future<void> deleteStudent(int id) async {
    await (database.delete(database.students)..where((t) => t.id.equals(id))).go();
  }

  @override
  Future<void> promoteStudents(List<int> studentIds, int targetClassId, {int? academicYearId}) async {
    await (database.update(database.students)
          ..where((t) => t.id.isIn(studentIds)))
        .write(db.StudentsCompanion(
      classId: Value(targetClassId),
      academicYearId: academicYearId != null ? Value(academicYearId) : const Value.absent(),
    ));
  }


  @override
  Future<String?> getLastAdmissionNumber() async {
    final query = database.selectOnly(database.students)..addColumns([database.students.admissionNumber]);
    final rows = await query.get();
    
    if (rows.isEmpty) return null;

    int maxNum = 0;
    for (final row in rows) {
      final adm = row.read(database.students.admissionNumber);
      if (adm != null && adm.isNotEmpty) {
        final parsed = int.tryParse(adm);
        if (parsed != null && parsed > maxNum) {
          maxNum = parsed;
        }
      }
    }
    
    return maxNum == 0 ? null : maxNum.toString().padLeft(4, '0');
  }

  @override
  Future<Student?> getStudentById(int id) async {
    final query = database.select(database.students)..where((t) => t.id.equals(id));
    final row = await query.getSingleOrNull();
    if (row == null) return null;
    return Student(
      id: row.id,
      admissionNumber: row.admissionNumber,
      firstName: row.firstName,
      lastName: row.lastName,
      classId: row.classId,
      parentName: row.parentName,
      parentPhone: row.parentPhone,
      balance: row.balance,
      creditBalance: row.creditBalance,
      academicYearId: row.academicYearId,
      image: row.image,
      dateOfBirth: row.dateOfBirth,
      gender: row.gender,
      registrationDate: row.registrationDate!,
      virtualAccountNumber: row.virtualAccountNumber,
      virtualAccountBank: row.virtualAccountBank,
      virtualAccountStatus: row.virtualAccountStatus,
    );
  }

  @override
  Future<List<Subject>> getSubjects() async {
    final rows = await database.select(database.subjects).get();
    return rows.map((row) => Subject(
      id: row.id,
      name: row.name,
      code: row.code,
      teacherId: row.teacherId,
    )).toList();
  }

  @override
  Future<void> addSubject(Subject subject) async {
    await database.into(database.subjects).insert(db.SubjectsCompanion.insert(
      name: subject.name,
      code: Value(subject.code),
      teacherId: Value(subject.teacherId),
    ));
  }

  @override
  Future<void> updateSubject(Subject subject) async {
    await (database.update(database.subjects)..where((t) => t.id.equals(subject.id!)))
        .write(db.SubjectsCompanion(
      name: Value(subject.name),
      code: Value(subject.code),
      teacherId: Value(subject.teacherId),
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
    await database.transaction(() async {
      for (final res in results) {
        final existingResult = await (database.select(database.results)
          ..where((t) => 
            t.studentId.equals(res.studentId) &
            t.subjectId.equals(res.subjectId) &
            t.termId.equals(res.termId) &
            t.academicYearId.equals(res.academicYearId)
          )).getSingleOrNull();

        if (existingResult != null) {
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
    });
  }

  @override
  Future<List<GradingRule>> getGradingRules() async {
    final rows = await database.select(database.gradingRules).get();
    return rows.map((row) => GradingRule(
      id: row.id,
      minScore: row.minScore,
      maxScore: row.maxScore,
      grade: row.grade,
      remarks: row.remarks,
    )).toList();
  }

  @override
  Future<void> addGradingRule(GradingRule rule) async {
    await database.into(database.gradingRules).insert(db.GradingRulesCompanion.insert(
      minScore: rule.minScore,
      maxScore: rule.maxScore,
      grade: rule.grade,
      remarks: Value(rule.remarks),
    ));
  }

  @override
  Future<void> updateGradingRule(GradingRule rule) async {
    await (database.update(database.gradingRules)
      ..where((t) => t.id.equals(rule.id!)))
    .write(db.GradingRulesCompanion(
      minScore: Value(rule.minScore),
      maxScore: Value(rule.maxScore),
      grade: Value(rule.grade),
      remarks: Value(rule.remarks),
    ));
  }

  @override
  Future<void> deleteGradingRule(int id) async {
    await (database.delete(database.gradingRules)..where((t) => t.id.equals(id))).go();
  }

  // Teachers
  @override
  Future<List<Teacher>> getTeachers() async {
    final rows = await database.select(database.teachers).get();
    return rows.map((row) => Teacher(
      id: row.id,
      fullName: row.fullName,
      phone: row.phone,
      profession: row.profession,
      classId: row.classId,
      salary: row.salary,
      employmentDate: row.employmentDate,
      certificates: row.certificates,
      image: row.image,
      classIds: row.classIds != null && row.classIds!.isNotEmpty
          ? row.classIds!.split(',').where((s) => s.isNotEmpty).map(int.parse).toList()
          : null,
    )).toList();
  }

  @override
  Future<void> addTeacher(Teacher teacher) async {
    final firstClassId = teacher.classIds != null && teacher.classIds!.isNotEmpty
        ? teacher.classIds!.first
        : teacher.classId;

    await database.into(database.teachers).insert(db.TeachersCompanion.insert(
      fullName: teacher.fullName,
      phone: Value(teacher.phone),
      profession: Value(teacher.profession),
      classId: Value(firstClassId),
      salary: Value(teacher.salary),
      employmentDate: Value(teacher.employmentDate),
      yearsInSchool: const Value(0),
      certificates: Value(teacher.certificates),
      image: Value(teacher.image),
      classIds: Value(teacher.classIds?.join(',')),
    ));
  }

  @override
  Future<void> updateTeacher(Teacher teacher) async {
    final firstClassId = teacher.classIds != null && teacher.classIds!.isNotEmpty
        ? teacher.classIds!.first
        : teacher.classId;

    await (database.update(database.teachers)..where((t) => t.id.equals(teacher.id!)))
        .write(db.TeachersCompanion(
      fullName: Value(teacher.fullName),
      phone: Value(teacher.phone),
      profession: Value(teacher.profession),
      classId: Value(firstClassId),
      salary: Value(teacher.salary),
      employmentDate: Value(teacher.employmentDate),
      certificates: Value(teacher.certificates),
      image: Value(teacher.image),
      classIds: Value(teacher.classIds?.join(',')),
    ));
  }

  @override
  Future<void> deleteTeacher(int id) async {
    await (database.delete(database.teachers)..where((t) => t.id.equals(id))).go();
  }

  // Curriculum
  @override
  Future<String?> getCurriculumTopic(int classId, int subjectId, int termId, int week) async {
    final query = database.select(database.curriculumMap)
      ..where((t) => 
          t.classId.equals(classId) &
          t.subjectId.equals(subjectId) &
          t.termId.equals(termId) &
          t.week.equals(week)
      );
    final result = await query.getSingleOrNull();
    return result?.topic;
  }
}
