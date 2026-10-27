import 'package:equatable/equatable.dart';

class DescriptionFieldType {
  static const text = 'text';
  static const checkbox = 'checkbox';
  static const number = 'number';

  static const labels = <String, String>{
    text: 'Text input',
    checkbox: 'Checkbox',
    number: 'Number',
  };

  static String labelOf(String type) => labels[type] ?? 'Text input';

  static bool isValid(String type) => labels.containsKey(type);
}

class ServiceDescriptionFormatCategory extends Equatable {
  final int id;
  final String name;

  const ServiceDescriptionFormatCategory({
    required this.id,
    required this.name,
  });

  @override
  List<Object?> get props => [id, name];
}

class ServiceDescriptionFormatField extends Equatable {
  final int id;
  final int categoryId;
  final String name;
  final String fieldType;
  final int sortOrder;

  const ServiceDescriptionFormatField({
    required this.id,
    required this.categoryId,
    required this.name,
    required this.fieldType,
    this.sortOrder = 0,
  });

  bool get isCheckbox => fieldType == DescriptionFieldType.checkbox;
  bool get isNumber => fieldType == DescriptionFieldType.number;

  @override
  List<Object?> get props => [id, categoryId, name, fieldType, sortOrder];
}

class ServiceDescriptionFormatBundle extends Equatable {
  final ServiceDescriptionFormatCategory category;
  final List<ServiceDescriptionFormatField> fields;

  const ServiceDescriptionFormatBundle({
    required this.category,
    this.fields = const [],
  });

  @override
  List<Object?> get props => [category, fields];
}
