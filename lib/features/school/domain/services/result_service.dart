import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';
import '../entities/school_entities.dart';
import '../entities/attendance_models.dart';
import '../../../settings/domain/entities/settings.dart';
import 'package:involve_app/features/invoicing/domain/templates/invoice_template.dart';

class ResultService {
  Future<Uint8List> generateResultPdf({
    required Student student,
    required List<AcademicResult> results,
    required List<Subject> subjects,
    required AppSettings settings,
    AcademicYear? academicYear,
    Term? term,
    String? className,
    double? classAverage,
    int? studentPosition,
    int? classSize,
    StudentAttendanceSummary? attendanceSummary,
  }) async {
    final font = await PdfGoogleFonts.robotoRegular();
    final boldFont = await PdfGoogleFonts.robotoBold();
    final italicFont = await PdfGoogleFonts.robotoItalic();

    final pdf = pw.Document(
      theme: pw.ThemeData.withFont(
        base: font,
        bold: boldFont,
        italic: italicFont,
      ),
    );

    // Decode logo if available
    pw.ImageProvider? logoImage;
    if (settings.showLogo && settings.logo != null && settings.logo!.isNotEmpty) {
      try {
        logoImage = pw.MemoryImage(settings.logo!);
      } catch (e) {
        // Ignore logo error
      }
    }

    // Decode admin signature if available
    pw.ImageProvider? adminSignatureImage;
    if (settings.showAdminSignature && settings.adminSignature != null && settings.adminSignature!.isNotEmpty) {
      try {
        adminSignatureImage = pw.MemoryImage(settings.adminSignature!);
      } catch (e) {
        // Ignore signature error
      }
    }

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // School Header
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  if (logoImage != null)
                    pw.Container(
                      width: 80,
                      height: 80,
                      child: pw.Image(logoImage),
                    ),
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.center,
                      children: [
                        pw.Text(settings.organizationName.toUpperCase(),
                            style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold)),
                        pw.SizedBox(height: 4),
                        pw.Text(settings.address, textAlign: pw.TextAlign.center, style: const pw.TextStyle(fontSize: 10)),
                        if (settings.phone.isNotEmpty)
                          pw.Text('Tel: ${settings.phone}', style: const pw.TextStyle(fontSize: 10)),
                      ],
                    ),
                  ),
                  pw.SizedBox(width: logoImage != null ? 80 : 0), // Balance the logo space
                ],
              ),
              pw.SizedBox(height: 10),
              pw.Divider(thickness: 2),
              pw.SizedBox(height: 10),

              // Title
              pw.Center(
                child: pw.Text('STUDENT ACADEMIC REPORT',
                    style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold, decoration: pw.TextDecoration.underline)),
              ),
              pw.SizedBox(height: 20),

              // Student Info
              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        _infoRow('Student Name:', student.fullName),
                        _infoRow('Admission No:', student.admissionNumber ?? 'N/A'),
                        _infoRow('Class:', className ?? 'N/A'),
                      ],
                    ),
                  ),
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        if (academicYear != null) _infoRow('Academic Year:', academicYear.name),
                        if (term != null) _infoRow('Term:', term.name),
                        if (term != null) _infoRow('Term Dates:', term.dateRangeLabel),
                        _infoRow('Date:', DateFormat('dd MMM, yyyy').format(DateTime.now())),
                      ],
                    ),
                  ),
                ],
              ),
              pw.SizedBox(height: 20),

              // Results Table
              pw.Table(
                border: pw.TableBorder.all(),
                columnWidths: {
                  0: const pw.FlexColumnWidth(3), // Subject
                  1: const pw.FlexColumnWidth(1), // Assessment
                  2: const pw.FlexColumnWidth(1), // Exam
                  3: const pw.FlexColumnWidth(1), // Total
                  4: const pw.FlexColumnWidth(1), // Grade
                  5: const pw.FlexColumnWidth(2), // Remarks
                },
                children: [
                  // Table Header
                  pw.TableRow(
                    decoration: const pw.BoxDecoration(color: PdfColors.grey200),
                    children: [
                      _tableHeader('SUBJECT'),
                      _tableHeader('CA'),
                      _tableHeader('EXAM'),
                      _tableHeader('TOTAL'),
                      _tableHeader('GRADE'),
                      _tableHeader('REMARKS'),
                    ],
                  ),
                  // Table Rows
                  ...results.map((result) {
                    final subject = subjects.firstWhere(
                      (s) => s.id == result.subjectId,
                      orElse: () => Subject(name: 'Unknown Subject', id: result.subjectId),
                    );
                    return pw.TableRow(
                      children: [
                        _tableCell(subject.name),
                        _tableCell(result.assessmentScore.toStringAsFixed(1), align: pw.Alignment.center),
                        _tableCell(result.examScore.toStringAsFixed(1), align: pw.Alignment.center),
                        _tableCell(result.totalScore.toStringAsFixed(1), align: pw.Alignment.center, isBold: true),
                        _tableCell(result.grade ?? '-', align: pw.Alignment.center),
                        _tableCell(result.remarks ?? '-'),
                      ],
                    );
                  }).toList(),
                ],
              ),
              pw.SizedBox(height: 20),

              // Summary
              if (results.isNotEmpty) ...[
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    // Class Statistics
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        if (studentPosition != null)
                          pw.Text('Class Position: $studentPosition${_getOrdinalSuffix(studentPosition)} ${classSize != null ? "out of $classSize" : ""}',
                              style: const pw.TextStyle(fontSize: 10)),
                        if (classAverage != null)
                          pw.Text('Class Average: ${classAverage.toStringAsFixed(2)}%',
                              style: const pw.TextStyle(fontSize: 10)),
                      ],
                    ),
                    // Student Statistics
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.end,
                      children: [
                        pw.Text('Total Score: ${results.fold(0.0, (sum, r) => sum + r.totalScore).toStringAsFixed(1)}',
                            style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 11)),
                        pw.Text('Student Average: ${(results.fold(0.0, (sum, r) => sum + r.totalScore) / results.length).toStringAsFixed(2)}%',
                            style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 11)),
                      ],
                    ),
                  ],
                ),
              ],

              pw.SizedBox(height: 12),

              // Attendance Record
              pw.Container(
                padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: pw.BoxDecoration(
                  border: pw.Border.all(color: PdfColors.grey400, width: 0.8),
                  borderRadius: const pw.BorderRadius.all(pw.Radius.circular(4)),
                  color: PdfColors.grey100,
                ),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(
                          'ATTENDANCE RECORD',
                          style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9, color: PdfColors.blueGrey800),
                        ),
                        pw.SizedBox(height: 2),
                        pw.Text(
                          'Total Attendance: ${attendanceSummary?.totalDays ?? 0} days',
                          style: const pw.TextStyle(fontSize: 9),
                        ),
                      ],
                    ),
                    pw.Row(
                      children: [
                        _pdfAttendanceItem('Present', '${attendanceSummary?.present ?? 0}', PdfColors.green800),
                        pw.SizedBox(width: 12),
                        _pdfAttendanceItem('Absent', '${attendanceSummary?.absent ?? 0}', PdfColors.red800),
                        pw.SizedBox(width: 12),
                        _pdfAttendanceItem('Late', '${attendanceSummary?.lateCount ?? 0}', PdfColors.amber800),
                        pw.SizedBox(width: 14),
                        pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.end,
                          children: [
                            pw.Text('Attendance Rate', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700)),
                            pw.SizedBox(height: 1),
                            pw.Text(
                              attendanceSummary?.formattedRate ?? 'N/A',
                              style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 11, color: PdfColors.blue900),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              pw.Spacer(),

              // Footer / Signatures
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    children: [
                      pw.SizedBox(height: 40, width: 120),
                      pw.Container(width: 120, height: 1, color: PdfColors.black),
                      pw.Text('Class Teacher', style: const pw.TextStyle(fontSize: 10)),
                    ],
                  ),
                  if (adminSignatureImage != null)
                    pw.Column(
                      children: [
                        pw.Container(
                          height: 40,
                          width: 100,
                          child: pw.Image(adminSignatureImage, fit: pw.BoxFit.contain),
                        ),
                        pw.Container(width: 120, height: 1, color: PdfColors.black),
                        pw.Text('Principal\'s Signature', style: const pw.TextStyle(fontSize: 10)),
                      ],
                    )
                  else
                    pw.Column(
                      children: [
                        pw.SizedBox(height: 40, width: 120),
                        pw.Container(width: 120, height: 1, color: PdfColors.black),
                        pw.Text('Principal\'s Signature', style: const pw.TextStyle(fontSize: 10)),
                      ],
                    ),
                ],
              ),
              pw.SizedBox(height: 20),
              pw.Center(
                child: pw.Text('Powered by Invify.org', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey)),
              ),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }

  pw.Widget _infoRow(String label, String value) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 2),
      child: pw.Row(
        mainAxisSize: pw.MainAxisSize.min,
        children: [
          pw.Text(label, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
          pw.SizedBox(width: 5),
          pw.Text(value, style: const pw.TextStyle(fontSize: 10)),
        ],
      ),
    );
  }

  pw.Widget _tableHeader(String text) {
    return pw.Padding(
      padding: const pw.EdgeInsets.all(5),
      child: pw.Align(
        alignment: pw.Alignment.center,
        child: pw.Text(text, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
      ),
    );
  }

  pw.Widget _tableCell(String text, {pw.Alignment align = pw.Alignment.centerLeft, bool isBold = false}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.all(5),
      child: pw.Align(
        alignment: align,
        child: pw.Text(text, style: pw.TextStyle(fontSize: 9, fontWeight: isBold ? pw.FontWeight.bold : pw.FontWeight.normal)),
      ),
    );
  }

  pw.Widget _pdfAttendanceItem(String label, String value, PdfColor textColor) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.center,
      children: [
        pw.Text(label, style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700)),
        pw.SizedBox(height: 1),
        pw.Text(
          value,
          style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: textColor),
        ),
      ],
    );
  }

  String _getOrdinalSuffix(int value) {
    if (value >= 11 && value <= 13) {
      return 'th';
    }
    switch (value % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  }

  List<PrintCommand> generateResultThermalCommands({
    required Student student,
    required List<AcademicResult> results,
    required List<Subject> subjects,
    required AppSettings settings,
    AcademicYear? academicYear,
    Term? term,
    String? className,
    double? classAverage,
    int? studentPosition,
    int? classSize,
    StudentAttendanceSummary? attendanceSummary,
  }) {
    final List<PrintCommand> commands = [];

    // Header
    commands.add(TextCommand(settings.organizationName.toUpperCase(), isBold: true, align: 'center'));
    if (settings.address.isNotEmpty) {
      commands.add(TextCommand(settings.address, align: 'center'));
    }
    if (settings.phone.isNotEmpty) {
      commands.add(TextCommand('Tel: ${settings.phone}', align: 'center'));
    }
    commands.add(DividerCommand());

    // Title
    commands.add(TextCommand('ACADEMIC REPORT CARD', isBold: true, align: 'center'));
    commands.add(SizedBoxCommand(height: 1));

    // Student Info
    commands.add(TextCommand('Student: ${student.fullName}', isBold: true));
    commands.add(TextCommand('Adm No: ${student.admissionNumber}'));
    if (className != null) {
      commands.add(TextCommand('Class: $className'));
    }
    if (academicYear != null) {
      commands.add(TextCommand('Year: ${academicYear.name}'));
    }
    if (term != null) {
      commands.add(TextCommand('Term: ${term.name}'));
      commands.add(TextCommand('Dates: ${term.dateRangeLabel}'));
    }
    commands.add(DividerCommand());

    // Results Header
    commands.add(TextCommand('SUBJECT RESULTS', isBold: true, align: 'center'));
    commands.add(SizedBoxCommand(height: 1));

    // Results List
    for (final result in results) {
      final subject = subjects.firstWhere(
        (s) => s.id == result.subjectId,
        orElse: () => Subject(name: 'Unknown Subject', id: result.subjectId),
      );
      commands.add(TextCommand(subject.name.toUpperCase(), isBold: true));
      commands.add(TextCommand(
        'CA: ${result.assessmentScore.toStringAsFixed(1)} | Exam: ${result.examScore.toStringAsFixed(1)}',
      ));
      final gradeStr = result.grade != null ? ' [${result.grade}]' : '';
      commands.add(TextCommand(
        'Total: ${result.totalScore.toStringAsFixed(1)}$gradeStr',
        isBold: true,
      ));
      if (result.remarks != null && result.remarks!.isNotEmpty) {
        commands.add(TextCommand('Remarks: ${result.remarks}'));
      }
      commands.add(SizedBoxCommand(height: 1));
    }
    commands.add(DividerCommand());

    // Summary Statistics
    if (results.isNotEmpty) {
      final totalScore = results.fold(0.0, (sum, r) => sum + r.totalScore);
      final avgScore = totalScore / results.length;
      commands.add(TextCommand('Total Score: ${totalScore.toStringAsFixed(1)}', isBold: true));
      commands.add(TextCommand('Student Avg: ${avgScore.toStringAsFixed(2)}%', isBold: true));
      if (classAverage != null) {
        commands.add(TextCommand('Class Avg: ${classAverage.toStringAsFixed(2)}%'));
      }
      if (studentPosition != null) {
        final ordinal = _getOrdinalSuffix(studentPosition);
        final sizeStr = classSize != null ? ' out of $classSize' : '';
        commands.add(TextCommand('Position: $studentPosition$ordinal$sizeStr', isBold: true));
      }
      commands.add(DividerCommand());
    }

    // Attendance Statistics
    if (attendanceSummary != null) {
      commands.add(TextCommand('ATTENDANCE RECORD', isBold: true, align: 'center'));
      commands.add(TextCommand('Total Attendance: ${attendanceSummary.totalDays} days'));
      commands.add(TextCommand(
        'Present: ${attendanceSummary.present} | Absent: ${attendanceSummary.absent} | Late: ${attendanceSummary.lateCount}',
      ));
      commands.add(TextCommand(
        'Attendance Rate: ${attendanceSummary.formattedRate}',
        isBold: true,
      ));
      commands.add(DividerCommand());
    }

    commands.add(TextCommand('Powered by Invify.org', align: 'center'));
    commands.add(SizedBoxCommand(height: 3)); // feed paper

    return commands;
  }
}
