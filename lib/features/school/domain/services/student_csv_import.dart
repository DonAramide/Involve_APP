import 'dart:convert';
import 'dart:typed_data';
import 'package:excel_community/excel_community.dart';
import 'package:involve_app/features/school/domain/entities/school_entities.dart';

class StudentCsvParseResult {
  final List<Student> students;
  final List<String> errors;
  final Map<Student, String> parentAddresses;

  const StudentCsvParseResult({
    required this.students,
    required this.errors,
    this.parentAddresses = const {},
  });
}

/// Parses a student CSV or Excel (.xlsx) file that matches the Add Student form fields.
class StudentCsvImport {
  static const template = 'first_name,middle_name,last_name,admission_number,date_of_birth,gender,class,department,parent_name,parent_phone,street_address,bus_stop,lga,state,country,notes\n'
      'Ada,Chiamaka,Okonkwo,00021,2015-03-12,Female,SS1,Science,Mrs Okonkwo,08012345678,"12 Commercial Ave",Palmgrove Bus Stop,Yaba,Lagos,Nigeria,"Mild asthma, allergic to penicillin"\n';

  static Uint8List createExcelTemplate() {
    final excel = Excel.createExcel();
    final defaultSheet = excel.getDefaultSheet() ?? 'Sheet1';
    final sheet = excel[defaultSheet];
    sheet.appendRow([
      TextCellValue('first_name'),
      TextCellValue('middle_name'),
      TextCellValue('last_name'),
      TextCellValue('admission_number'),
      TextCellValue('date_of_birth'),
      TextCellValue('gender'),
      TextCellValue('class'),
      TextCellValue('department'),
      TextCellValue('parent_name'),
      TextCellValue('parent_phone'),
      TextCellValue('street_address'),
      TextCellValue('bus_stop'),
      TextCellValue('lga'),
      TextCellValue('state'),
      TextCellValue('country'),
      TextCellValue('notes'),
    ]);
    sheet.appendRow([
      TextCellValue('Ada'),
      TextCellValue('Chiamaka'),
      TextCellValue('Okonkwo'),
      TextCellValue('00021'),
      TextCellValue('2015-03-12'),
      TextCellValue('Female'),
      TextCellValue('SS1'),
      TextCellValue('Science'),
      TextCellValue('Mrs Okonkwo'),
      TextCellValue('08012345678'),
      TextCellValue('12 Commercial Ave'),
      TextCellValue('Palmgrove Bus Stop'),
      TextCellValue('Yaba'),
      TextCellValue('Lagos'),
      TextCellValue('Nigeria'),
      TextCellValue('Mild asthma, allergic to penicillin'),
    ]);
    return Uint8List.fromList(excel.encode()!);
  }

  /// Automatically checks file extension or magic bytes to determine if the file is Excel (.xlsx/.xls) or CSV.
  static bool isExcelFile(Uint8List bytes, {String? fileName}) {
    if (fileName != null && fileName.trim().isNotEmpty) {
      final lower = fileName.toLowerCase().trim();
      if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return true;
      if (lower.endsWith('.csv')) return false;
    }
    // Check magic bytes for ZIP file (PK\x03\x04), which XLSX is:
    if (bytes.length >= 4 &&
        bytes[0] == 0x50 &&
        bytes[1] == 0x4B &&
        bytes[2] == 0x03 &&
        bytes[3] == 0x04) {
      return true;
    }
    return false;
  }

  /// Auto-detects whether bytes are CSV or XLSX and parses accordingly with fallback.
  static StudentCsvParseResult parseAuto(
    Uint8List bytes, {
    String? fileName,
    required List<SchoolClass> classes,
    required String startingAdmissionNumber,
  }) {
    if (isExcelFile(bytes, fileName: fileName)) {
      try {
        final result = parseExcel(
          bytes,
          classes: classes,
          startingAdmissionNumber: startingAdmissionNumber,
        );
        if (result.students.isNotEmpty || result.errors.isEmpty) {
          return result;
        }
      } catch (_) {}
      try {
        return parse(
          utf8.decode(bytes, allowMalformed: true),
          classes: classes,
          startingAdmissionNumber: startingAdmissionNumber,
        );
      } catch (_) {}
      return parseExcel(
        bytes,
        classes: classes,
        startingAdmissionNumber: startingAdmissionNumber,
      );
    } else {
      try {
        return parse(
          utf8.decode(bytes, allowMalformed: true),
          classes: classes,
          startingAdmissionNumber: startingAdmissionNumber,
        );
      } catch (_) {
        return parseExcel(
          bytes,
          classes: classes,
          startingAdmissionNumber: startingAdmissionNumber,
        );
      }
    }
  }

  static StudentCsvParseResult parse(
    String source, {
    required List<SchoolClass> classes,
    required String startingAdmissionNumber,
  }) {
    final lines = _splitRecords(source.replaceFirst(RegExp(r'^\uFEFF'), ''));
    if (lines.isEmpty) {
      return const StudentCsvParseResult(
        students: [],
        errors: ['The CSV file is empty.'],
      );
    }
    return parseRows(
      lines,
      classes: classes,
      startingAdmissionNumber: startingAdmissionNumber,
    );
  }

  static StudentCsvParseResult parseExcel(
    Uint8List bytes, {
    required List<SchoolClass> classes,
    required String startingAdmissionNumber,
  }) {
    Excel excel;
    try {
      excel = Excel.decodeBytes(bytes);
    } catch (e) {
      return StudentCsvParseResult(
        students: const [],
        errors: ['Could not read Excel file: $e'],
      );
    }

    if (excel.tables.isEmpty) {
      return const StudentCsvParseResult(
        students: [],
        errors: ['The Excel file contains no worksheets.'],
      );
    }

    final defaultSheetName = excel.getDefaultSheet();
    final sheet = (defaultSheetName != null ? excel.tables[defaultSheetName] : null) ??
        excel.tables.values.first;

    final lines = <List<String>>[];
    for (final row in sheet.rows) {
      final line = row.map((cell) => _cellToString(cell?.value)).toList();
      lines.add(line);
    }

    if (lines.isEmpty) {
      return const StudentCsvParseResult(
        students: [],
        errors: ['The Excel worksheet is empty.'],
      );
    }

    return parseRows(
      lines,
      classes: classes,
      startingAdmissionNumber: startingAdmissionNumber,
    );
  }

  static String _cellToString(CellValue? value) {
    if (value == null) return '';
    if (value is DateCellValue) {
      final y = value.year.toString().padLeft(4, '0');
      final m = value.month.toString().padLeft(2, '0');
      final d = value.day.toString().padLeft(2, '0');
      return '$y-$m-$d';
    } else if (value is DateTimeCellValue) {
      final y = value.year.toString().padLeft(4, '0');
      final m = value.month.toString().padLeft(2, '0');
      final d = value.day.toString().padLeft(2, '0');
      return '$y-$m-$d';
    }
    return value.toString().trim();
  }

  static StudentCsvParseResult parseRows(
    List<List<String>> lines, {
    required List<SchoolClass> classes,
    required String startingAdmissionNumber,
  }) {
    if (lines.isEmpty) {
      return const StudentCsvParseResult(
        students: [],
        errors: ['The file is empty.'],
      );
    }

    final header = lines.first.map(_normalizeHeader).toList();
    final index = <String, int>{};
    for (var i = 0; i < header.length; i++) {
      final key = header[i];
      if (key.isNotEmpty) index[key] = i;
    }

    int? col(List<String> aliases) {
      for (final alias in aliases) {
        final hit = index[alias];
        if (hit != null) return hit;
      }
      return null;
    }

    final firstIdx = col(['first_name', 'firstname', 'first name']);
    final middleIdx = col(['middle_name', 'middlename', 'middle name']);
    final lastIdx = col(['last_name', 'lastname', 'last name', 'surname']);
    final admIdx = col(['admission_number', 'admission number', 'admission', 'student_id', 'student id', 'id']);
    final dobIdx = col(['date_of_birth', 'date of birth', 'dob', 'birthday']);
    final genderIdx = col(['gender', 'sex']);
    final classIdx = col(['class', 'class_name', 'classname', 'class name']);
    final deptIdx = col(['department', 'dept']);
    final parentIdx = col(['parent_name', 'parent name', 'parent/guardian name', 'guardian name', 'parent', 'guardian']);
    final phoneIdx = col(['parent_phone', 'parent phone', 'phone', 'guardian phone', 'parent/guardian phone']);
    final addressIdx = col(['parent_address', 'address', 'residential_address', 'home_address', 'parent address', 'residential address', 'home address']);
    final streetIdx = col(['street_address', 'street', 'street address']);
    final busStopIdx = col(['bus_stop', 'bus stop', 'nearest_bus_stop', 'nearest bus stop', 'landmark']);
    final lgaIdx = col(['lga', 'local_government', 'local government', 'local government area', 'local_government_area']);
    final stateIdx = col(['state']);
    final countryIdx = col(['country']);
    final notesIdx = col(['notes', 'note', 'health_condition', 'health condition', 'health', 'medical_condition', 'medical condition', 'medical_notes', 'medical notes', 'condition', 'special_notes', 'special notes']);

    if (firstIdx == null || lastIdx == null || classIdx == null || parentIdx == null || phoneIdx == null) {
      return const StudentCsvParseResult(
        students: [],
        errors: [
          'Header must include first_name, last_name, class, parent_name, and parent_phone.',
        ],
      );
    }

    final classByName = <String, SchoolClass>{};
    for (final c in classes) {
      classByName[c.name.trim().toLowerCase()] = c;
    }

    var nextAdm = startingAdmissionNumber;
    final students = <Student>[];
    final errors = <String>[];
    final parentAddresses = <Student, String>{};

    for (var rowNum = 2; rowNum <= lines.length; rowNum++) {
      final row = lines[rowNum - 1];
      if (row.every((cell) => cell.trim().isEmpty)) continue;

      String at(int? idx) {
        if (idx == null || idx >= row.length) return '';
        return row[idx].trim();
      }

      final firstName = at(firstIdx);
      final lastName = at(lastIdx);
      final className = at(classIdx);
      final parentName = at(parentIdx);
      var parentPhone = at(phoneIdx).replaceAll(RegExp(r'\D'), '');
      if (parentPhone.length == 10 && RegExp(r'^[789]').hasMatch(parentPhone)) {
        parentPhone = '0$parentPhone';
      }
      final middleName = at(middleIdx);
      final admission = at(admIdx);
      final genderRaw = at(genderIdx);
      final deptRaw = at(deptIdx);
      final dobRaw = at(dobIdx);
      final notesRaw = at(notesIdx);

      final rowErrors = <String>[];
      if (firstName.isEmpty) rowErrors.add('first name is required');
      if (lastName.isEmpty) rowErrors.add('last name is required');
      if (className.isEmpty) rowErrors.add('class is required');
      if (parentName.isEmpty) rowErrors.add('parent/guardian name is required');
      if (parentPhone.isEmpty) {
        rowErrors.add('parent phone is required');
      } else if (parentPhone.length < 11) {
        rowErrors.add('parent phone must be at least 11 digits');
      }

      final matchedClass = classByName[className.toLowerCase()];
      if (className.isNotEmpty && matchedClass == null) {
        rowErrors.add('class "$className" was not found');
      }

      if (rowErrors.isNotEmpty) {
        errors.add('Row $rowNum: ${rowErrors.join('; ')}');
        continue;
      }

      final admissionNumber = admission.isEmpty ? nextAdm : admission;
      if (admission.isEmpty) {
        nextAdm = _nextAdmission(nextAdm);
      }

      String? resolvedAddress;
      final directAddress = at(addressIdx);
      if (directAddress.isNotEmpty) {
        resolvedAddress = directAddress;
      } else {
        final bStop = at(busStopIdx);
        final bStopPart = bStop.isNotEmpty
            ? (RegExp(r'^(?:b/stop|bus stop|bus-stop|landmark):', caseSensitive: false).hasMatch(bStop)
                ? bStop
                : 'B/Stop: $bStop')
            : '';
        final addressParts = [
          at(streetIdx),
          bStopPart,
          at(lgaIdx),
          at(stateIdx),
          at(countryIdx),
        ].where((p) => p.isNotEmpty).toList();
        if (addressParts.isNotEmpty) {
          resolvedAddress = addressParts.join(', ');
        }
      }

      final student = Student(
        firstName: firstName,
        middleName: middleName.isEmpty ? null : middleName,
        lastName: lastName,
        admissionNumber: admissionNumber,
        classId: matchedClass!.id!,
        parentName: parentName,
        parentPhone: parentPhone,
        gender: _normalizeGender(genderRaw),
        department: _normalizeDepartment(deptRaw),
        dateOfBirth: _parseDate(dobRaw),
        registrationDate: DateTime.now(),
        notes: notesRaw.isNotEmpty ? notesRaw : null,
      );

      students.add(student);
      if (resolvedAddress != null && resolvedAddress.isNotEmpty) {
        parentAddresses[student] = resolvedAddress;
      }
    }

    if (students.isEmpty && errors.isEmpty) {
      errors.add('No student rows were found after the header.');
    }

    return StudentCsvParseResult(
      students: students,
      errors: errors,
      parentAddresses: parentAddresses,
    );
  }

  static String _normalizeHeader(String raw) {
    return raw.trim().toLowerCase().replaceAll(RegExp(r'[\s/\-]+'), ' ').replaceAll(' ', '_');
  }

  static String _nextAdmission(String current) {
    final parsed = int.tryParse(current);
    if (parsed == null) return '0001';
    return (parsed + 1).toString().padLeft(current.length < 4 ? 4 : current.length, '0');
  }

  static String? _normalizeGender(String raw) {
    if (raw.isEmpty) return null;
    final lower = raw.toLowerCase();
    if (lower.startsWith('m')) return 'Male';
    if (lower.startsWith('f')) return 'Female';
    if (lower.startsWith('o')) return 'Other';
    return raw;
  }

  static String? _normalizeDepartment(String raw) {
    if (raw.isEmpty) return null;
    final lower = raw.toLowerCase();
    if (lower == 'none' || lower == 'n/a') return null;
    if (lower.startsWith('sci')) return 'Science';
    if (lower.startsWith('art')) return 'Art';
    if (lower.startsWith('com')) return 'Commerce';
    return raw;
  }

  static DateTime? _parseDate(String raw) {
    if (raw.isEmpty) return null;
    final iso = DateTime.tryParse(raw);
    if (iso != null) return iso;
    final slash = RegExp(r'^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$').firstMatch(raw);
    if (slash != null) {
      final d = int.parse(slash.group(1)!);
      final m = int.parse(slash.group(2)!);
      final y = int.parse(slash.group(3)!);
      return DateTime(y, m, d);
    }
    return null;
  }

  static List<List<String>> _splitRecords(String source) {
    final rows = <List<String>>[];
    var field = StringBuffer();
    var row = <String>[];
    var inQuotes = false;

    for (var i = 0; i < source.length; i++) {
      final ch = source[i];
      if (inQuotes) {
        if (ch == '"') {
          if (i + 1 < source.length && source[i + 1] == '"') {
            field.write('"');
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field.write(ch);
        }
      } else if (ch == '"') {
        inQuotes = true;
      } else if (ch == ',') {
        row.add(field.toString());
        field = StringBuffer();
      } else if (ch == '\n') {
        row.add(field.toString());
        rows.add(row);
        row = <String>[];
        field = StringBuffer();
      } else if (ch != '\r') {
        field.write(ch);
      }
    }

    if (field.isNotEmpty || row.isNotEmpty) {
      row.add(field.toString());
      rows.add(row);
    }
    return rows;
  }
}
