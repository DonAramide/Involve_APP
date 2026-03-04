import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/entities/grading_rule.dart';
import '../../domain/entities/school_entities.dart';
import '../../domain/repositories/school_repository.dart';

part 'school_event.dart';
part 'school_state.dart';

class SchoolBloc extends Bloc<SchoolEvent, SchoolState> {
  final SchoolRepository repository;

  SchoolBloc(this.repository) : super(const SchoolState()) {
    on<LoadSchoolData>(_onLoadSchoolData);
    on<LoadGradingRules>(_onLoadGradingRules);
    on<AddGradingRuleEvent>(_onAddGradingRule);
    on<UpdateGradingRuleEvent>(_onUpdateGradingRule);
    on<DeleteGradingRuleEvent>(_onDeleteGradingRule);
    on<LoadStudentsEvent>(_onLoadStudents);
    on<SaveResultsEvent>(_onSaveResults);
  }

  Future<void> _onLoadSchoolData(LoadSchoolData event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true));
    try {
      final gradingRules = await repository.getGradingRules();
      final academicYears = await repository.getAcademicYears();
      final classes = await repository.getClasses();
      final subjects = await repository.getSubjects();
      
      emit(state.copyWith(
        gradingRules: gradingRules,
        academicYears: academicYears,
        classes: classes,
        subjects: subjects,
        isLoading: false,
      ));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  Future<void> _onLoadGradingRules(LoadGradingRules event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true));
    try {
      final rules = await repository.getGradingRules();
      emit(state.copyWith(gradingRules: rules, isLoading: false));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  Future<void> _onAddGradingRule(AddGradingRuleEvent event, Emitter<SchoolState> emit) async {
    try {
      await repository.addGradingRule(event.rule);
      add(LoadGradingRules());
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> _onUpdateGradingRule(UpdateGradingRuleEvent event, Emitter<SchoolState> emit) async {
    try {
      await repository.updateGradingRule(event.rule);
      add(LoadGradingRules());
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> _onDeleteGradingRule(DeleteGradingRuleEvent event, Emitter<SchoolState> emit) async {
    try {
      await repository.deleteGradingRule(event.id);
      add(LoadGradingRules());
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> _onLoadStudents(LoadStudentsEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true));
    try {
      final students = await repository.getStudents(event.classId);
      emit(state.copyWith(students: students, isLoading: false));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  Future<void> _onSaveResults(SaveResultsEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isSaving: true));
    try {
      await repository.saveResults(event.results);
      emit(state.copyWith(isSaving: false));
    } catch (e) {
      emit(state.copyWith(isSaving: false, error: e.toString()));
    }
  }
}
