import 'package:equatable/equatable.dart';
import 'dart:typed_data';

class ServiceCustomer extends Equatable {
  final String id;
  final String name;
  final String? phone;
  final String? email;
  final String? address;
  final Uint8List? image;
  final double balance;
  final String? virtualAccountNumber;
  final String? virtualAccountName;
  final String? virtualAccountBank;
  final DateTime? createdAt;

  static const walkInName = 'Walk-in Customer';

  static bool isWalkInName(String? name) {
    final normalized = (name ?? '').trim().toLowerCase().replaceAll(RegExp(r'[\s_-]+'), '');
    return normalized == 'walkincustomer' ||
        normalized == 'walkinclient' ||
        normalized == 'walkin' ||
        normalized == 'workincustomer' ||
        normalized == 'workin';
  }

  const ServiceCustomer({
    required this.id,
    required this.name,
    this.phone,
    this.email,
    this.address,
    this.image,
    this.balance = 0.0,
    this.virtualAccountNumber,
    this.virtualAccountName,
    this.virtualAccountBank,
    this.createdAt,
  });

  @override
  List<Object?> get props => [id, name, phone, email, address, image, balance, virtualAccountNumber, virtualAccountName, virtualAccountBank, createdAt];

  ServiceCustomer copyWith({
    String? id,
    String? name,
    String? phone,
    String? email,
    String? address,
    Uint8List? image,
    double? balance,
    String? virtualAccountNumber,
    String? virtualAccountName,
    String? virtualAccountBank,
    DateTime? createdAt,
  }) {
    return ServiceCustomer(
      id: id ?? this.id,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      address: address ?? this.address,
      image: image ?? this.image,
      balance: balance ?? this.balance,
      virtualAccountNumber: virtualAccountNumber ?? this.virtualAccountNumber,
      virtualAccountName: virtualAccountName ?? this.virtualAccountName,
      virtualAccountBank: virtualAccountBank ?? this.virtualAccountBank,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
