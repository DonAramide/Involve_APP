import '../entities/academic_year.dart';
import '../entities/term.dart';
import '../entities/school_class.dart';
import '../entities/student.dart';

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
  Future<void> addStudent(Student student);
  Future<void> updateStudent(Student student);
  Future<void> deleteStudent(int id);
  Future<void> promoteStudents(List<int> studentIds, int targetClassId);
}
