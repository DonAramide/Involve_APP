import 'package:equatable/equatable.dart';
import 'dart:typed_data';

class Student extends Equatable {
  final int? id;
  final String? admissionNumber;
  final String firstName;
  final String lastName;
  final int? classId;
  final String? parentName;
  final String? parentPhone;
  final double balance;
  final Uint8List? image;
  final DateTime? dateOfBirth;
  final DateTime? registrationDate;

  const Student({
    this.id,
    this.admissionNumber,
    required this.firstName,
    required this.lastName,
    this.classId,
    this.parentName,
    this.parentPhone,
    this.balance = 0.0,
    this.image,
    this.dateOfBirth,
    this.registrationDate,
  });

  String get fullName => '$firstName $lastName';

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

  @override
  List<Object?> get props => [
    id, admissionNumber, firstName, lastName, classId, parentName, parentPhone, balance, image, dateOfBirth, registrationDate
  ];
}
