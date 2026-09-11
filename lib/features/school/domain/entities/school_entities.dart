import 'package:equatable/equatable.dart';
import 'dart:typed_data';
import 'package:intl/intl.dart';

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

  String get dateRangeLabel {
    final fmt = DateFormat('dd MMM yyyy');
    return '${fmt.format(startDate)} – ${fmt.format(endDate)}';
  }

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
  final String? middleName;
  final String lastName;
  final int classId;
  final int? academicYearId;
  final int? parentId;
  final String? parentName;
  final String? parentPhone;
  final double balance;
  final double creditBalance;
  final Uint8List? image;
  final DateTime? dateOfBirth;
  final String? gender;
  final DateTime registrationDate;
  final String? virtualAccountNumber;
  final String? virtualAccountBank;
  final String? virtualAccountStatus;
  final String? department;

  const Student({
    this.id,
    required this.admissionNumber,
    required this.firstName,
    this.middleName,
    required this.lastName,
    required this.classId,
    this.academicYearId,
    this.parentId,
    this.parentName,
    this.parentPhone,
    this.balance = 0.0,
    this.creditBalance = 0.0,
    this.image,
    this.dateOfBirth,
    this.gender,
    required this.registrationDate,
    this.virtualAccountNumber,
    this.virtualAccountBank,
    this.virtualAccountStatus,
    this.department,
  });

  Student copyWith({
    int? id,
    String? admissionNumber,
    String? firstName,
    String? middleName,
    String? lastName,
    int? classId,
    int? academicYearId,
    int? parentId,
    String? parentName,
    String? parentPhone,
    double? balance,
    double? creditBalance,
    Uint8List? image,
    DateTime? dateOfBirth,
    String? gender,
    DateTime? registrationDate,
    String? virtualAccountNumber,
    String? virtualAccountBank,
    String? virtualAccountStatus,
    String? department,
  }) {
    return Student(
      id: id ?? this.id,
      admissionNumber: admissionNumber ?? this.admissionNumber,
      firstName: firstName ?? this.firstName,
      middleName: middleName ?? this.middleName,
      lastName: lastName ?? this.lastName,
      classId: classId ?? this.classId,
      academicYearId: academicYearId ?? this.academicYearId,
      parentId: parentId ?? this.parentId,
      parentName: parentName ?? this.parentName,
      parentPhone: parentPhone ?? this.parentPhone,
      balance: balance ?? this.balance,
      creditBalance: creditBalance ?? this.creditBalance,
      image: image ?? this.image,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      gender: gender ?? this.gender,
      registrationDate: registrationDate ?? this.registrationDate,
      virtualAccountNumber: virtualAccountNumber ?? this.virtualAccountNumber,
      virtualAccountBank: virtualAccountBank ?? this.virtualAccountBank,
      virtualAccountStatus: virtualAccountStatus ?? this.virtualAccountStatus,
      department: department ?? this.department,
    );
  }

  String get fullName {
    final mid = (middleName ?? '').trim();
    if (mid.isEmpty) return '$firstName $lastName';
    return '$firstName $mid $lastName';
  }

  /// Same name + phone means the same parent/guardian across siblings.
  static String parentIdentity(String? name, String? phone) {
    final n = (name ?? '').trim().toLowerCase();
    final p = (phone ?? '').replaceAll(RegExp(r'\D'), '');
    return '$n|$p';
  }

  String get parentKey => parentIdentity(parentName, parentPhone);

  bool get hasParent => (parentName ?? '').trim().isNotEmpty;

  @override
  List<Object?> get props => [
        id,
        admissionNumber,
        firstName,
        middleName,
        lastName,
        classId,
        academicYearId,
        parentId,
        parentName,
        parentPhone,
        balance,
        creditBalance,
        image,
        dateOfBirth,
        gender,
        registrationDate,
        virtualAccountNumber,
        virtualAccountBank,
        virtualAccountStatus,
        department,
      ];
}

class Subject extends Equatable {
  final int? id;
  final String name;
  final String? code;
  final int? teacherId;
  final List<int>? teacherIds;
  final List<int>? classIds;

  const Subject({
    this.id,
    required this.name,
    this.code,
    this.teacherId,
    this.teacherIds,
    this.classIds,
  });

  List<int> get assignedTeacherIds {
    final ids = <int>{...?teacherIds};
    if (teacherId != null) ids.add(teacherId!);
    return ids.toList()..sort();
  }

  bool isTaughtBy(int? id) => id != null && assignedTeacherIds.contains(id);

  Subject copyWith({
    int? id,
    String? name,
    String? code,
    int? teacherId,
    List<int>? teacherIds,
    List<int>? classIds,
  }) {
    final nextTeacherIds = teacherIds ?? this.teacherIds;
    return Subject(
      id: id ?? this.id,
      name: name ?? this.name,
      code: code ?? this.code,
      teacherId: teacherIds != null
          ? (teacherIds.isEmpty ? null : teacherIds.first)
          : (teacherId ?? this.teacherId),
      teacherIds: nextTeacherIds,
      classIds: classIds ?? this.classIds,
    );
  }

  bool isOfferedTo(int? classId) {
    if (classId == null) return true;
    if (classIds == null || classIds!.isEmpty) return true;
    return classIds!.contains(classId);
  }

  @override
  List<Object?> get props => [id, name, code, teacherId, teacherIds, classIds];
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
  final List<int>? classIds;

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
    this.classIds,
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
    List<int>? classIds,
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
      classIds: classIds ?? this.classIds,
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
        classIds,
      ];
}

class SchoolParent extends Equatable {
  final int? id;
  final String? syncId;
  final String fullName;
  final String? phone;
  final String? email;
  final String? virtualAccountNumber;
  final String? virtualAccountBank;
  final String? virtualAccountName;
  final String? virtualAccountStatus;
  final double creditBalance;
  final DateTime createdAt;
  final List<ParentVaAccount> virtualAccounts;

  const SchoolParent({
    this.id,
    this.syncId,
    required this.fullName,
    this.phone,
    this.email,
    this.virtualAccountNumber,
    this.virtualAccountBank,
    this.virtualAccountName,
    this.virtualAccountStatus,
    this.creditBalance = 0,
    required this.createdAt,
    this.virtualAccounts = const [],
  });

  String get parentKey => Student.parentIdentity(fullName, phone);

  bool get hasCanonicalVa =>
      (virtualAccountNumber ?? '').trim().isNotEmpty;

  SchoolParent copyWith({
    int? id,
    String? syncId,
    String? fullName,
    String? phone,
    String? email,
    String? virtualAccountNumber,
    String? virtualAccountBank,
    String? virtualAccountName,
    String? virtualAccountStatus,
    double? creditBalance,
    DateTime? createdAt,
    List<ParentVaAccount>? virtualAccounts,
  }) {
    return SchoolParent(
      id: id ?? this.id,
      syncId: syncId ?? this.syncId,
      fullName: fullName ?? this.fullName,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      virtualAccountNumber: virtualAccountNumber ?? this.virtualAccountNumber,
      virtualAccountBank: virtualAccountBank ?? this.virtualAccountBank,
      virtualAccountName: virtualAccountName ?? this.virtualAccountName,
      virtualAccountStatus: virtualAccountStatus ?? this.virtualAccountStatus,
      creditBalance: creditBalance ?? this.creditBalance,
      createdAt: createdAt ?? this.createdAt,
      virtualAccounts: virtualAccounts ?? this.virtualAccounts,
    );
  }

  @override
  List<Object?> get props => [
        id,
        syncId,
        fullName,
        phone,
        email,
        virtualAccountNumber,
        virtualAccountBank,
        virtualAccountName,
        virtualAccountStatus,
        creditBalance,
        createdAt,
        virtualAccounts,
      ];
}

class ParentVaAccount extends Equatable {
  final int? id;
  final int parentId;
  final String accountNumber;
  final String? bankName;
  final String? accountName;
  final String kind;
  final bool isCanonical;

  const ParentVaAccount({
    this.id,
    required this.parentId,
    required this.accountNumber,
    this.bankName,
    this.accountName,
    this.kind = 'legacy',
    this.isCanonical = false,
  });

  @override
  List<Object?> get props =>
      [id, parentId, accountNumber, bankName, accountName, kind, isCanonical];
}

class ParentPaymentRecord extends Equatable {
  final int? id;
  final int parentId;
  final String reference;
  final double amount;
  final double appliedToDebt;
  final double toCredit;
  final double parentOutstandingBefore;
  final double parentOutstandingAfter;
  final double parentCreditBefore;
  final double parentCreditAfter;
  final String? virtualAccountNumber;
  final String source;
  final DateTime createdAt;
  final List<ParentPaymentAllocationRecord> allocations;

  const ParentPaymentRecord({
    this.id,
    required this.parentId,
    required this.reference,
    required this.amount,
    this.appliedToDebt = 0,
    this.toCredit = 0,
    this.parentOutstandingBefore = 0,
    this.parentOutstandingAfter = 0,
    this.parentCreditBefore = 0,
    this.parentCreditAfter = 0,
    this.virtualAccountNumber,
    this.source = 'va_deposit',
    required this.createdAt,
    this.allocations = const [],
  });

  @override
  List<Object?> get props => [
        id,
        parentId,
        reference,
        amount,
        appliedToDebt,
        toCredit,
        parentOutstandingBefore,
        parentOutstandingAfter,
        parentCreditBefore,
        parentCreditAfter,
        virtualAccountNumber,
        source,
        createdAt,
        allocations,
      ];
}

class ParentPaymentAllocationRecord extends Equatable {
  final int studentId;
  final double outstandingBefore;
  final double allocated;
  final double outstandingAfter;

  const ParentPaymentAllocationRecord({
    required this.studentId,
    required this.outstandingBefore,
    required this.allocated,
    required this.outstandingAfter,
  });

  @override
  List<Object?> get props =>
      [studentId, outstandingBefore, allocated, outstandingAfter];
}
