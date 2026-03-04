import 'package:equatable/equatable.dart';
import 'dart:typed_data';

class AcademicYear extends Equatable {
  final int? id;
  final String name;
  final DateTime startDate;
  final DateTime endDate;
  final bool isCurrent;

  const AcademicYear({
    this.id,
    required this.name,
    required this.startDate,
    required this.endDate,
    this.isCurrent = false,
  });

  @override
  List<Object?> get props => [id, name, startDate, endDate, isCurrent];
}

class Term extends Equatable {
  final int? id;
  final int academicYearId;
  final String name;
  final DateTime startDate;
  final DateTime endDate;
  final bool isCurrent;

  const Term({
    this.id,
    required this.academicYearId,
    required this.name,
    required this.startDate,
    required this.endDate,
    this.isCurrent = false,
  });

  @override
  List<Object?> get props => [id, academicYearId, name, startDate, endDate, isCurrent];
}

class ClassEntity extends Equatable {
  final int? id;
  final String name;

  const ClassEntity({this.id, required this.name});

  @override
  List<Object?> get props => [id, name];
}

class Student extends Equatable {
  final int? id;
  final String admissionNumber;
  final String firstName;
  final String lastName;
  final int classId;
  final Uint8List? image;
  final DateTime? dateOfBirth;
  final DateTime registrationDate;

  const Student({
    this.id,
    required this.admissionNumber,
    required this.firstName,
    required this.lastName,
    required this.classId,
    this.image,
    this.dateOfBirth,
    required this.registrationDate,
  });

  String get fullName => '$firstName $lastName';

  @override
  List<Object?> get props => [id, admissionNumber, firstName, lastName, classId, image, dateOfBirth, registrationDate];
}

class Subject extends Equatable {
  final int? id;
  final String name;
  final String? code;

  const Subject({this.id, required this.name, this.code});

  @override
  List<Object?> get props => [id, name, code];
}

class Result extends Equatable {
  final int? id;
  final int studentId;
  final int subjectId;
  final int termId;
  final int academicYearId;
  final double score;
  final DateTime dateEntered;

  const Result({
    this.id,
    required this.studentId,
    required this.subjectId,
    required this.termId,
    required this.academicYearId,
    required this.score,
    required this.dateEntered,
  });

  @override
  List<Object?> get props => [id, studentId, subjectId, termId, academicYearId, score, dateEntered];
}
