import 'dart:typed_data';

import 'package:equatable/equatable.dart';

class ServiceMaterial extends Equatable {
  final int id;
  final String name;
  final String category;
  final double defaultPrice;
  final Uint8List? image;

  const ServiceMaterial({
    required this.id,
    required this.name,
    required this.category,
    required this.defaultPrice,
    this.image,
  });

  @override
  List<Object?> get props => [id, name, category, defaultPrice, image];
}
