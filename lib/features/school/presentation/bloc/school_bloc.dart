import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:image/image.dart' as img;
import 'package:involve_app/features/school/domain/repositories/school_repository.dart';
import 'package:involve_app/features/school/domain/entities/school_entities.dart';
import 'package:involve_app/features/school/domain/entities/grading_rule.dart';
import 'package:involve_app/features/stock/domain/repositories/item_repository.dart';
import 'package:involve_app/features/stock/domain/entities/item.dart';
import 'package:involve_app/features/school/presentation/bloc/school_state.dart';
import 'package:involve_app/features/invoicing/domain/repositories/invoice_repository.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:collection/collection.dart';
import 'package:equatable/equatable.dart';

part 'school_event.dart';

class SchoolBloc extends Bloc<SchoolEvent, SchoolState> {
  final SchoolRepository repository;
  final ItemRepository itemRepository;
  final InvoiceRepository invoiceRepository;

  SchoolBloc({
    required this.repository, 
    required this.itemRepository,
    required this.invoiceRepository,
  }) : super(const SchoolState()) {
    on<LoadSchoolData>(_onLoadSchoolData, transformer: sequential());
    on<AddAcademicYearEvent>(_onAddAcademicYear, transformer: sequential());
    on<UpdateAcademicYearEvent>(_onUpdateAcademicYear, transformer: sequential());
    on<SetActiveYearEvent>(_onSetActiveYear, transformer: sequential());
    on<AddTermEvent>(_onAddTerm, transformer: sequential());
    on<UpdateTermEvent>(_onUpdateTerm, transformer: sequential());
    on<SetActiveTermEvent>(_onSetActiveTerm, transformer: sequential());
    on<AddClassEvent>(_onAddClass, transformer: sequential());
    on<DeleteClassEvent>(_onDeleteClass, transformer: sequential());
    on<AddStudentEvent>(_onAddStudent, transformer: sequential());
    on<UpdateStudentEvent>(_onUpdateStudent, transformer: sequential());
    on<DeleteStudentEvent>(_onDeleteStudent, transformer: sequential());
    on<PromoteStudentsEvent>(_onPromoteStudents, transformer: sequential());
    on<LoadStudentRecordsEvent>(_onLoadStudentRecords, transformer: sequential());
    on<LoadSubjectsEvent>(_onLoadSubjects, transformer: sequential());
    on<AddSubjectEvent>(_onAddSubject, transformer: sequential());
    on<UpdateSubjectEvent>(_onUpdateSubject, transformer: sequential());
    on<DeleteSubjectEvent>(_onDeleteSubject, transformer: sequential());
    on<LoadResultsEvent>(_onLoadResults, transformer: sequential());
    on<SaveResultsEvent>(_onSaveResults, transformer: sequential());

    // Grading Rules
    on<LoadGradingRules>(_onLoadGradingRules, transformer: sequential());
    on<AddGradingRuleEvent>(_onAddGradingRule, transformer: sequential());
    on<UpdateGradingRuleEvent>(_onUpdateGradingRule, transformer: sequential());
    on<DeleteGradingRuleEvent>(_onDeleteGradingRule, transformer: sequential());

    // Teachers
    on<AddTeacherEvent>(_onAddTeacher, transformer: sequential());
    on<UpdateTeacherEvent>(_onUpdateTeacher, transformer: sequential());
    on<DeleteTeacherEvent>(_onDeleteTeacher, transformer: sequential());

    on<MakeStudentPaymentEvent>(_onMakeStudentPayment, transformer: sequential());

    on<ResetSchoolStatus>((event, emit) => emit(state.copyWith(status: SchoolStatus.initial, error: null)), transformer: sequential());
    
    add(LoadSchoolData());
  }

  Future<void> _onLoadSchoolData(LoadSchoolData event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading, error: null));
    try {
      final years = await repository.getAcademicYears();
      final classes = await repository.getClasses();
      final students = await repository.getStudentSummaries();
      final items = await itemRepository.getAllItems();
      final subjects = await repository.getSubjects();
      final teachers = await repository.getTeachers();
      
      final activeYear = years.where((y) => y.isActive).firstOrNull ?? years.firstOrNull;
      List<Term> terms = [];
      if (activeYear != null) {
        terms = await repository.getTerms(activeYear.id!);
      }

      final lastAdm = await repository.getLastAdmissionNumber();
      final nextAdm = _formatNextAdmissionNumber(lastAdm);

      emit(state.copyWith(
        academicYears: years,
        classes: classes,
        terms: terms,
        students: students,
        items: items,
        subjects: subjects,
        teachers: teachers,
        nextAdmissionNumber: nextAdm,
        isLoading: false,
        status: SchoolStatus.initial,
      ));

      // Run image cleanup in the background to fix CursorWindow issues for existing students
      _cleanupLargeImages();
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  Future<void> _onAddAcademicYear(AddAcademicYearEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading, error: null));
    try {
      final newYear = AcademicYear(
        name: event.name, 
        startDate: event.startDate,
        endDate: event.endDate,
        isCurrent: state.academicYears.isEmpty,
      );
      await repository.addAcademicYear(newYear);
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onSetActiveYear(SetActiveYearEvent event, Emitter<SchoolState> emit) async {
    try {
      await repository.setActiveYear(event.id);
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> _onAddTerm(AddTermEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading, error: null));
    try {
      final newTerm = Term(
        academicYearId: event.academicYearId,
        name: event.name,
        startDate: event.startDate,
        endDate: event.endDate,
        isCurrent: state.terms.isEmpty,
      );
      await repository.addTerm(newTerm);
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onSetActiveTerm(SetActiveTermEvent event, Emitter<SchoolState> emit) async {
    try {
      await repository.setActiveTerm(event.id);
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> _onUpdateAcademicYear(UpdateAcademicYearEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading));
    try {
      await repository.updateAcademicYear(event.year);
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onUpdateTerm(UpdateTermEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading));
    try {
      await repository.updateTerm(event.term);
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onAddClass(AddClassEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading, error: null));
    try {
      final newClass = SchoolClass(name: event.name, description: event.description);
      await repository.addClass(newClass);
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onDeleteClass(DeleteClassEvent event, Emitter<SchoolState> emit) async {
    try {
      await repository.deleteClass(event.id);
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> _onAddStudent(AddStudentEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading, error: null));
    try {
      await repository.addStudent(event.student);
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onUpdateStudent(UpdateStudentEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading, error: null));
    try {
      await repository.updateStudent(event.student);
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onDeleteStudent(DeleteStudentEvent event, Emitter<SchoolState> emit) async {
    try {
      await repository.deleteStudent(event.id);
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> _onPromoteStudents(PromoteStudentsEvent event, Emitter<SchoolState> emit) async {
    try {
      await repository.promoteStudents(event.studentIds, event.targetClassId);
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> _onLoadStudentRecords(LoadStudentRecordsEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true));
    try {
      final invoices = await invoiceRepository.getInvoicesByStudentId(event.studentId);
      final results = await repository.getResults(studentId: event.studentId);
      
      // Also refresh the specific student's data to get the latest balance
      final student = await repository.getStudentById(event.studentId);

      double? studentAverage;
      int? studentPosition;
      int? classSize;

      if (student != null) {
        final activeYear = state.activeYear;
        final activeTerm = state.activeTerm;

        if (activeYear != null && activeTerm != null) {
          // Fetch all results for the class to calculate position
          final classResults = await repository.getResults(
            classId: student.classId,
            termId: activeTerm.id,
            academicYearId: activeYear.id,
          );

          if (classResults.isNotEmpty) {
            // Group results by student
            final resultsByStudent = groupBy(classResults, (AcademicResult r) => r.studentId);
            
            // Calculate total scores for each student
            final studentTotals = <int, double>{};
            resultsByStudent.forEach((sId, studentResults) {
              final total = studentResults.fold(0.0, (sum, r) => sum + r.totalScore);
              studentTotals[sId] = total;
            });

            // Sort students by total score descending
            final sortedStudents = studentTotals.entries.toList()
              ..sort((a, b) => b.value.compareTo(a.value));

            // Find current student's position
            final index = sortedStudents.indexWhere((e) => e.key == event.studentId);
            if (index != -1) {
              studentPosition = index + 1;
            }

            classSize = resultsByStudent.keys.length;

            // Calculate average for current student
            final currentStudentResults = results.where((r) => 
              r.termId == activeTerm.id && r.academicYearId == activeYear.id
            ).toList();

            if (currentStudentResults.isNotEmpty) {
              final sumOfTotals = currentStudentResults.fold(0.0, (sum, r) => sum + r.totalScore);
              studentAverage = sumOfTotals / currentStudentResults.length;
            }
          }
        }
      }
      
      emit(state.copyWith(
        studentInvoices: invoices, 
        results: results,
        students: student != null 
            ? state.students.map((s) => s.id == student.id ? student : s).toList()
            : state.students,
        studentAverage: studentAverage,
        studentPosition: studentPosition,
        classSize: classSize,
        isLoading: false
      ));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  Future<void> _onLoadSubjects(LoadSubjectsEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true));
    try {
      final subjects = await repository.getSubjects();
      emit(state.copyWith(subjects: subjects, isLoading: false));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  Future<void> _onAddSubject(AddSubjectEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading));
    try {
      await repository.addSubject(Subject(name: event.name, code: event.code, teacherId: event.teacherId));
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadSubjectsEvent());
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onUpdateSubject(UpdateSubjectEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading));
    try {
      await repository.updateSubject(event.subject);
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadSubjectsEvent());
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onDeleteSubject(DeleteSubjectEvent event, Emitter<SchoolState> emit) async {
    try {
      await repository.deleteSubject(event.id);
      add(LoadSubjectsEvent());
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> _onLoadResults(LoadResultsEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true));
    try {
      final results = await repository.getResults(
        studentId: event.studentId,
        classId: event.classId,
        subjectId: event.subjectId,
        termId: event.termId,
        academicYearId: event.academicYearId,
      );
      emit(state.copyWith(results: results, isLoading: false));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  Future<void> _onSaveResults(SaveResultsEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading));
    try {
      await repository.saveResults(event.results);
      emit(state.copyWith(isLoading: false, status: SchoolStatus.success));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString(), status: SchoolStatus.failure));
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
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading));
    try {
      await repository.addGradingRule(event.rule);
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadGradingRules());
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onUpdateGradingRule(UpdateGradingRuleEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading));
    try {
      await repository.updateGradingRule(event.rule);
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadGradingRules());
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
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

  // Teacher Handlers
  Future<void> _onAddTeacher(AddTeacherEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, error: null, status: SchoolStatus.loading));
    try {
      var teacher = event.teacher;
      if (teacher.image != null && teacher.image!.length > 200 * 1024) {
        final resized = await _performResize(teacher.image!);
        if (resized != null) {
          teacher = teacher.copyWith(image: resized);
        }
      }
      await repository.addTeacher(teacher);
      final teachers = await repository.getTeachers();
      emit(state.copyWith(isLoading: false, teachers: teachers, status: SchoolStatus.success));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onUpdateTeacher(UpdateTeacherEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, error: null, status: SchoolStatus.loading));
    try {
      var teacher = event.teacher;
      if (teacher.image != null && teacher.image!.length > 200 * 1024) {
        final resized = await _performResize(teacher.image!);
        if (resized != null) {
          teacher = teacher.copyWith(image: resized);
        }
      }
      await repository.updateTeacher(teacher);
      final teachers = await repository.getTeachers();
      emit(state.copyWith(isLoading: false, teachers: teachers, status: SchoolStatus.success));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onDeleteTeacher(DeleteTeacherEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, error: null, status: SchoolStatus.loading));
    try {
      await repository.deleteTeacher(event.id);
      final teachers = await repository.getTeachers();
      emit(state.copyWith(isLoading: false, teachers: teachers, status: SchoolStatus.success));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onMakeStudentPayment(MakeStudentPaymentEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading, error: null));
    try {
      final student = state.students.firstWhere((s) => s.id == event.studentId);
      final newBalance = student.balance - event.amount;
      
      // 1. Update Student Balance
      await repository.updateStudent(student.copyWith(balance: newBalance));
      
      // 2. Generate Payment Receipt Invoice
      final activeTerm = state.terms.where((t) => t.isActive).firstOrNull ?? state.terms.firstOrNull;
      final activeYear = state.academicYears.where((y) => y.isActive).firstOrNull ?? state.academicYears.firstOrNull;
      
      final invoice = Invoice(
        invoiceNumber: 'PMT-${student.admissionNumber ?? student.id}-${DateTime.now().millisecondsSinceEpoch}',
        dateCreated: DateTime.now(),
        items: [
          InvoiceItem(
            item: Item(
              id: -99,
              name: 'School Fees Payment ${event.remarks ?? ""}',
              price: event.amount,
              category: ItemCategory.service,
              type: 'service',
              stockQty: 0,
            ),
            quantity: 1,
            unitPrice: event.amount,
            type: 'service',
          )
        ],
        subtotal: event.amount,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: event.amount,
        paymentStatus: 'Paid',
        amountPaid: event.amount,
        balanceAmount: 0,
        customerName: student.fullName,
        customerPhone: student.parentPhone,
        paymentMethod: event.method,
        businessMode: 'school',
        studentId: student.id,
        classId: student.classId,
        termId: activeTerm?.id,
        academicYearId: activeYear?.id,
      );
      
      await invoiceRepository.saveInvoice(invoice);
      
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadSchoolData());
      add(LoadStudentRecordsEvent(event.studentId)); // Refresh invoices list
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
    }
  }

  String _formatNextAdmissionNumber(String? lastAdm) {
    if (lastAdm == null) return '0001';
    final parsed = int.tryParse(lastAdm);
    if (parsed == null) return '0001';
    return (parsed + 1).toString().padLeft(4, '0');
  }

  Future<void> _cleanupLargeImages() async {
    try {
      // 1. Optimize Student Images
      final summaries = await repository.getStudentSummaries();
      for (final summary in summaries) {
        final student = await repository.getStudentById(summary.id!);
        if (student == null) continue;
        if (student.image != null && student.image!.length > 200 * 1024) { // > 200KB
          final resized = await _performResize(student.image!);
          if (resized != null) {
            await repository.updateStudent(student.copyWith(image: resized));
            debugPrint('Optimized image for student: ${student.fullName} (${student.image!.length} -> ${resized.length})');
          }
        }
      }

      // 2. Optimize Teacher Images
      final teachers = await repository.getTeachers();
      for (final teacher in teachers) {
        if (teacher.image != null && teacher.image!.length > 200 * 1024) {
          final resized = await _performResize(teacher.image!);
          if (resized != null) {
            await repository.updateTeacher(teacher.copyWith(image: resized));
            debugPrint('Optimized image for teacher: ${teacher.fullName} (${teacher.image!.length} -> ${resized.length})');
          }
        }
      }
    } catch (e) {
      debugPrint('Error during image cleanup: $e');
    }
  }

  Future<Uint8List?> _performResize(Uint8List bytes) async {
    try {
      final image = img.decodeImage(bytes);
      if (image == null) return null;

      img.Image resized;
      if (image.width > image.height) {
        resized = img.copyResize(image, width: 400);
      } else {
        resized = img.copyResize(image, height: 400);
      }

      return Uint8List.fromList(img.encodeJpg(resized, quality: 70));
    } catch (_) {
      return null;
    }
  }
}

