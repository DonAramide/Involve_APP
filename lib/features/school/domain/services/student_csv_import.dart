import 'package:involve_app/features/school/domain/entities/school_entities.dart';

class StudentCsvParseResult {
  final List<Student> students;
  final List<String> errors;

  const StudentCsvParseResult({
    required this.students,
    required this.errors,
  });
}

/// Parses a student CSV that matches the Add Student form fields.
class StudentCsvImport {
  static const template = 'first_name,middle_name,last_name,admission_number,date_of_birth,gender,class,department,parent_name,parent_phone\n'
      'Ada,Chiamaka,Okonkwo,00021,2015-03-12,Female,SS1,Science,Mrs Okonkwo,08012345678\n';

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

    if (firstIdx == null || lastIdx == null || classIdx == null || parentIdx == null || phoneIdx == null) {
      return const StudentCsvParseResult(
        students: [],
        errors: [
          'CSV header must include first_name, last_name, class, parent_name, and parent_phone.',
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
      final parentPhone = at(phoneIdx).replaceAll(RegExp(r'\D'), '');
      final middleName = at(middleIdx);
      final admission = at(admIdx);
      final genderRaw = at(genderIdx);
      final deptRaw = at(deptIdx);
      final dobRaw = at(dobIdx);

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

      students.add(Student(
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
      ));
    }

    if (students.isEmpty && errors.isEmpty) {
      errors.add('No student rows were found after the header.');
    }

    return StudentCsvParseResult(students: students, errors: errors);
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
