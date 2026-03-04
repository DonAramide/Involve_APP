import '../entities/grading_rule.dart';
import '../entities/school_entities.dart';

abstract class SchoolRepository {
  // Grading Rules
  Future<List<GradingRule>> getGradingRules();
  Future<int> addGradingRule(GradingRule rule);
  Future<void> updateGradingRule(GradingRule rule);
  Future<void> deleteGradingRule(int id);

  // Academic Setup
  Future<List<AcademicYear>> getAcademicYears();
  Future<List<Term>> getTerms(int academicYearId);
  Future<List<ClassEntity>> getClasses();
  Future<List<Subject>> getSubjects();
  
  // Results & Students
  Future<List<Student>> getStudents(int classId);
  Future<List<Result>> getResults({required int classId, required int subjectId, required int termId, required int academicYearId});
  Future<void> saveResults(List<Result> results);
}
