import 'package:equatable/equatable.dart';
import 'dart:typed_data';

class ServiceCustomer extends Equatable {
  final String id;
  final String name;
  final String? phone;
  final String? email;
  final String? address;
  final Uint8List? image;
  final DateTime? createdAt;

  const ServiceCustomer({
    required this.id,
    required this.name,
    this.phone,
    this.email,
    this.address,
    this.image,
    this.createdAt,
  });

  @override
  List<Object?> get props => [id, name, phone, email, address, image, createdAt];
}
