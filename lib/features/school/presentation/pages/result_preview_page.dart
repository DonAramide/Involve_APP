import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:printing/printing.dart';
import '../../domain/entities/school_entities.dart';
import '../../domain/entities/attendance_models.dart';
import '../../data/services/attendance_local_storage.dart';
import '../../domain/services/result_service.dart';
import '../../../settings/presentation/bloc/settings_bloc.dart';

class ResultPreviewPage extends StatefulWidget {
  final Student student;
  final List<AcademicResult> results;
  final List<Subject> subjects;
  final AcademicYear? academicYear;
  final Term? term;
  final String? className;
  final double? classAverage;
  final int? studentPosition;
  final int? classSize;
  final StudentAttendanceSummary? attendanceSummary;

  const ResultPreviewPage({
    super.key,
    required this.student,
    required this.results,
    required this.subjects,
    this.academicYear,
    this.term,
    this.className,
    this.classAverage,
    this.studentPosition,
    this.classSize,
    this.attendanceSummary,
  });

  @override
  State<ResultPreviewPage> createState() => _ResultPreviewPageState();
}

class _ResultPreviewPageState extends State<ResultPreviewPage> {
  StudentAttendanceSummary? _attendanceSummary;

  @override
  void initState() {
    super.initState();
    _attendanceSummary = widget.attendanceSummary;
    if (_attendanceSummary == null) {
      _loadAttendance();
    }
  }

  Future<void> _loadAttendance() async {
    try {
      final summary = await AttendanceLocalStorage.getStudentSummaryOnlineOffline(
        studentId: widget.student.id.toString(),
        studentName: widget.student.fullName,
        className: widget.className ?? '',
        admissionNumber: widget.student.admissionNumber,
      );
      if (mounted) {
        setState(() => _attendanceSummary = summary);
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final settings = context.read<SettingsBloc>().state.settings;
    if (settings == null) {
      return const Scaffold(
        body: Center(child: Text('Settings not loaded')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Result Preview'),
      ),
      body: PdfPreview(
        build: (format) => ResultService().generateResultPdf(
          student: widget.student,
          results: widget.results,
          subjects: widget.subjects,
          settings: settings,
          academicYear: widget.academicYear,
          term: widget.term,
          className: widget.className,
          classAverage: widget.classAverage,
          studentPosition: widget.studentPosition,
          classSize: widget.classSize,
          attendanceSummary: _attendanceSummary,
        ),
        pdfFileName: 'Result-${widget.student.firstName}_${widget.student.lastName}.pdf',
      ),
    );
  }
}
