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

  AcademicYear copyWith({
    int? id,
    String? name,
    DateTime? startDate,
    DateTime? endDate,
    bool? isCurrent,
  }) {
    return AcademicYear(
      id: id ?? this.id,
      name: name ?? this.name,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      isCurrent: isCurrent ?? this.isCurrent,
    );
  }

  bool get isActive => isCurrent;

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

  Term copyWith({
    int? id,
    int? academicYearId,
    String? name,
    DateTime? startDate,
    DateTime? endDate,
    bool? isCurrent,
  }) {
    return Term(
      id: id ?? this.id,
      academicYearId: academicYearId ?? this.academicYearId,
      name: name ?? this.name,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      isCurrent: isCurrent ?? this.isCurrent,
    );
  }

  bool get isActive => isCurrent;

  @override
  List<Object?> get props => [id, academicYearId, name, startDate, endDate, isCurrent];
}

class SchoolClass extends Equatable {
  final int? id;
  final String name;
  final String? description;

  const SchoolClass({this.id, required this.name, this.description});

  SchoolClass copyWith({
    int? id,
    String? name,
    String? description,
  }) {
    return SchoolClass(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
    );
  }

  @override
  List<Object?> get props => [id, name, description];
}

class Student extends Equatable {
  final int? id;
  final String admissionNumber;
  final String firstName;
  final String lastName;
  final int classId;
  final String? parentName;
  final String? parentPhone;
  final double balance;
  final Uint8List? image;
  final DateTime? dateOfBirth;
  final DateTime registrationDate;

  const Student({
    this.id,
    required this.admissionNumber,
    required this.firstName,
    required this.lastName,
    required this.classId,
    this.parentName,
    this.parentPhone,
    this.balance = 0.0,
    this.image,
    this.dateOfBirth,
    required this.registrationDate,
  });

  Student copyWith({
    int? id,
    String? admissionNumber,
    String? firstName,
    String? lastName,
    int? classId,
    String? parentName,
    String? parentPhone,
    double? balance,
    Uint8List? image,
    DateTime? dateOfBirth,
    DateTime? registrationDate,
  }) {
    return Student(
      id: id ?? this.id,
      admissionNumber: admissionNumber ?? this.admissionNumber,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      classId: classId ?? this.classId,
      parentName: parentName ?? this.parentName,
      parentPhone: parentPhone ?? this.parentPhone,
      balance: balance ?? this.balance,
      image: image ?? this.image,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      registrationDate: registrationDate ?? this.registrationDate,
    );
  }

  String get fullName => '$firstName $lastName';

  @override
  List<Object?> get props => [id, admissionNumber, firstName, lastName, classId, parentName, parentPhone, balance, image, dateOfBirth, registrationDate];
}

class Subject extends Equatable {
  final int? id;
  final String name;
  final String? code;
  final int? teacherId;

  const Subject({
    this.id,
    required this.name,
    this.code,
    this.teacherId,
  });

  Subject copyWith({
    int? id,
    String? name,
    String? code,
    int? teacherId,
  }) {
    return Subject(
      id: id ?? this.id,
      name: name ?? this.name,
      code: code ?? this.code,
      teacherId: teacherId ?? this.teacherId,
    );
  }

  @override
  List<Object?> get props => [id, name, code, teacherId];
}

class AcademicResult extends Equatable {
  final int? id;
  final int studentId;
  final int subjectId;
  final int termId;
  final int academicYearId;
  final double assessmentScore;
  final double examScore;
  final double totalScore;
  final String? grade;
  final String? remarks;
  final DateTime dateEntered;

  const AcademicResult({
    this.id,
    required this.studentId,
    required this.subjectId,
    required this.termId,
    required this.academicYearId,
    this.assessmentScore = 0.0,
    this.examScore = 0.0,
    this.totalScore = 0.0,
    this.grade,
    this.remarks,
    required this.dateEntered,
  });

  AcademicResult copyWith({
    int? id,
    int? studentId,
    int? subjectId,
    int? termId,
    int? academicYearId,
    double? assessmentScore,
    double? examScore,
    double? totalScore,
    String? grade,
    String? remarks,
    DateTime? dateEntered,
  }) {
    return AcademicResult(
      id: id ?? this.id,
      studentId: studentId ?? this.studentId,
      subjectId: subjectId ?? this.subjectId,
      termId: termId ?? this.termId,
      academicYearId: academicYearId ?? this.academicYearId,
      assessmentScore: assessmentScore ?? this.assessmentScore,
      examScore: examScore ?? this.examScore,
      totalScore: totalScore ?? this.totalScore,
      grade: grade ?? this.grade,
      remarks: remarks ?? this.remarks,
      dateEntered: dateEntered ?? this.dateEntered,
    );
  }

  @override
  List<Object?> get props => [id, studentId, subjectId, termId, academicYearId, assessmentScore, examScore, totalScore, grade, remarks, dateEntered];
}

class Teacher extends Equatable {
  final int? id;
  final String fullName;
  final String? phone;
  final String? profession;
  final int? classId;
  final double salary;
  final DateTime employmentDate;
  final String? certificates;
  final Uint8List? image;

  const Teacher({
    this.id,
    required this.fullName,
    this.phone,
    this.profession,
    this.classId,
    this.salary = 0.0,
    required this.employmentDate,
    this.certificates,
    this.image,
  });

  int get yearsInSchool {
    final now = DateTime.now();
    int years = now.year - employmentDate.year;
    if (now.month < employmentDate.month || (now.month == employmentDate.month && now.day < employmentDate.day)) {
      years--;
    }
    return years >= 0 ? years : 0;
  }

  Teacher copyWith({
    int? id,
    String? fullName,
    String? phone,
    String? profession,
    int? classId,
    double? salary,
    DateTime? employmentDate,
    String? certificates,
    Uint8List? image,
  }) {
    return Teacher(
      id: id ?? this.id,
      fullName: fullName ?? this.fullName,
      phone: phone ?? this.phone,
      profession: profession ?? this.profession,
      classId: classId ?? this.classId,
      salary: salary ?? this.salary,
      employmentDate: employmentDate ?? this.employmentDate,
      certificates: certificates ?? this.certificates,
      image: image ?? this.image,
    );
  }

  @override
  List<Object?> get props => [
        id,
        fullName,
        phone,
        profession,
        classId,
        salary,
        employmentDate,
        certificates,
        image,
      ];
}
