import '../../domain/entities/school_entities.dart';
import '../../domain/entities/grading_rule.dart';

abstract class SchoolRepository {
  // Academic Years
  Future<List<AcademicYear>> getAcademicYears();
  Future<void> addAcademicYear(AcademicYear year);
  Future<void> updateAcademicYear(AcademicYear year);
  Future<void> deleteAcademicYear(int id);
  Future<void> setActiveYear(int id);

  // Terms
  Future<List<Term>> getTerms(int academicYearId);
  Future<void> addTerm(Term term);
  Future<void> updateTerm(Term term);
  Future<void> deleteTerm(int id);
  Future<void> setActiveTerm(int id);

  // Classes
  Future<List<SchoolClass>> getClasses();
  Future<void> addClass(SchoolClass schoolClass);
  Future<void> updateClass(SchoolClass schoolClass);
  Future<void> deleteClass(int id);

  // Students
  Future<List<Student>> getStudents();
  Future<List<Student>> getStudentSummaries();
  Future<int> addStudent(Student student);
  Future<void> updateStudent(Student student);
  Future<void> deleteStudent(int id);
  Future<void> promoteStudents(List<int> studentIds, int targetClassId, {int? academicYearId});
  Future<void> assignParentToStudents({
    required List<int> studentIds,
    required String parentName,
    required String parentPhone,
  });
  Future<List<SchoolParent>> getParents();
  Future<SchoolParent?> getParentById(int id);
  Future<SchoolParent> ensureParent({
    required String fullName,
    String? phone,
    String? email,
  });
  Future<SchoolParent> linkStudentsToParent({
    required int parentId,
    required List<int> studentIds,
  });
  Future<SchoolParent?> findParentByVirtualAccount(String accountNumber);
  Future<void> saveParentVirtualAccount({
    required int parentId,
    required String accountNumber,
    String? bankName,
    String? accountName,
    required bool canonical,
  });
  Future<void> updateParent(SchoolParent parent);
  Future<bool> parentPaymentExists(String reference);
  Future<ParentPaymentRecord> recordParentPayment(ParentPaymentRecord payment);
  Future<List<ParentPaymentRecord>> getParentPayments(int parentId);
  Future<void> backfillParentsFromStudents();
  Future<String?> getLastAdmissionNumber();
  Future<Student?> getStudentById(int id);
  Future<Student?> getStudentByVirtualAccount(String accountNumber);
  Future<Student?> getStudentByAdmissionNumber(String admissionNumber);
  /// Apply a VA deposit: reduce debt first, remainder increases creditBalance.
  Future<Student?> creditStudentFromDeposit({
    required double amount,
    required String reference,
    String? virtualAccountNumber,
    String? admissionNumber,
    String? studentKey,
  });

  // Subjects
  Future<List<Subject>> getSubjects();
  Future<void> addSubject(Subject subject);
  Future<void> updateSubject(Subject subject);
  Future<void> deleteSubject(int id);

  // Results
  Future<List<AcademicResult>> getResults({
    int? studentId,
    int? classId,
    int? subjectId,
    int? termId,
    int? academicYearId,
  });
  Future<void> saveResults(List<AcademicResult> results);

  // Grading Rules
  Future<List<GradingRule>> getGradingRules();
  Future<void> addGradingRule(GradingRule rule);
  Future<void> updateGradingRule(GradingRule rule);
  Future<void> deleteGradingRule(int id);

  // Teachers
  Future<List<Teacher>> getTeachers();
  Future<int> addTeacher(Teacher teacher);
  Future<void> updateTeacher(Teacher teacher);
  Future<void> deleteTeacher(int id);
  Future<void> assignTeacherToSubjects(int teacherId, List<int> subjectIds);

  // Curriculum
  Future<String?> getCurriculumTopic(int classId, int subjectId, int termId, int week);
}
