import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/features/school/domain/entities/school_entities.dart';
import 'package:involve_app/features/school/domain/services/student_csv_import.dart';

void main() {
  const classes = [
    SchoolClass(id: 1, name: 'SS1'),
    SchoolClass(id: 2, name: 'JSS2'),
  ];

  test('parses the Add Student CSV template', () {
    final result = StudentCsvImport.parse(
      StudentCsvImport.template,
      classes: classes,
      startingAdmissionNumber: '00022',
    );

    expect(result.errors, isEmpty);
    expect(result.students, hasLength(1));
    final student = result.students.single;
    expect(student.firstName, 'Ada');
    expect(student.middleName, 'Chiamaka');
    expect(student.lastName, 'Okonkwo');
    expect(student.admissionNumber, '00021');
    expect(student.classId, 1);
    expect(student.department, 'Science');
    expect(student.parentName, 'Mrs Okonkwo');
    expect(student.parentPhone, '08012345678');
    expect(student.fullName, 'Ada Chiamaka Okonkwo');
  });

  test('assigns the next admission number and reports unknown classes', () {
    const csv = 'first_name,last_name,class,parent_name,parent_phone\n'
        'Ike,Lopez,JSS2,Mrs Lopez,08011112222\n'
        'Bad,Row,UnknownClass,Mr Row,08033334444\n';

    final result = StudentCsvImport.parse(
      csv,
      classes: classes,
      startingAdmissionNumber: '00030',
    );

    expect(result.students, hasLength(1));
    expect(result.students.single.admissionNumber, '00030');
    expect(result.students.single.middleName, isNull);
    expect(result.errors.single, contains('class "UnknownClass" was not found'));
  });

  test('accepts quoted names and header aliases', () {
    const csv = 'First Name,Middle Name,Surname,Class,Parent,Phone\n'
        '"Ada, Jr",Chika,Okonkwo,SS1,Mrs Okonkwo,08012345678\n';

    final result = StudentCsvImport.parse(
      csv,
      classes: classes,
      startingAdmissionNumber: '00040',
    );

    expect(result.errors, isEmpty);
    expect(result.students.single.firstName, 'Ada, Jr');
    expect(result.students.single.middleName, 'Chika');
    expect(result.students.single.lastName, 'Okonkwo');
  });
}
