import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:printing/printing.dart';
import '../../domain/entities/school_entities.dart';
import '../../domain/services/result_service.dart';
import '../../../settings/presentation/bloc/settings_bloc.dart';

class ResultPreviewPage extends StatelessWidget {
  final Student student;
  final List<AcademicResult> results;
  final List<Subject> subjects;
  final AcademicYear? academicYear;
  final Term? term;
  final String? className;
  final double? classAverage;
  final int? studentPosition;
  final int? classSize;

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
  });

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
          student: student,
          results: results,
          subjects: subjects,
          settings: settings,
          academicYear: academicYear,
          term: term,
          className: className,
          classAverage: classAverage,
          studentPosition: studentPosition,
          classSize: classSize,
        ),
        pdfFileName: 'Result-${student.firstName}_${student.lastName}.pdf',
      ),
    );
  }
}
