// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $CategoriesTable extends Categories
    with TableInfo<$CategoriesTable, CategoryTable> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CategoriesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
      'name', aliasedName, false,
      additionalChecks:
          GeneratedColumn.checkTextLength(minTextLength: 1, maxTextLength: 50),
      type: DriftSqlType.string,
      requiredDuringInsert: true,
      defaultConstraints: GeneratedColumn.constraintIsAlways('UNIQUE'));
  static const VerificationMeta _syncIdMeta = const VerificationMeta('syncId');
  @override
  late final GeneratedColumn<String> syncId = GeneratedColumn<String>(
      'sync_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _deviceIdMeta =
      const VerificationMeta('deviceId');
  @override
  late final GeneratedColumn<String> deviceId = GeneratedColumn<String>(
      'device_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _isDeletedMeta =
      const VerificationMeta('isDeleted');
  @override
  late final GeneratedColumn<bool> isDeleted = GeneratedColumn<bool>(
      'is_deleted', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_deleted" IN (0, 1))'),
      defaultValue: const Constant(false));
  @override
  List<GeneratedColumn> get $columns =>
      [id, name, syncId, updatedAt, createdAt, deviceId, isDeleted];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'categories';
  @override
  VerificationContext validateIntegrity(Insertable<CategoryTable> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('name')) {
      context.handle(
          _nameMeta, name.isAcceptableOrUnknown(data['name']!, _nameMeta));
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('sync_id')) {
      context.handle(_syncIdMeta,
          syncId.isAcceptableOrUnknown(data['sync_id']!, _syncIdMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('device_id')) {
      context.handle(_deviceIdMeta,
          deviceId.isAcceptableOrUnknown(data['device_id']!, _deviceIdMeta));
    }
    if (data.containsKey('is_deleted')) {
      context.handle(_isDeletedMeta,
          isDeleted.isAcceptableOrUnknown(data['is_deleted']!, _isDeletedMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  CategoryTable map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CategoryTable(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      name: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}name'])!,
      syncId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sync_id']),
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at']),
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at']),
      deviceId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}device_id']),
      isDeleted: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_deleted'])!,
    );
  }

  @override
  $CategoriesTable createAlias(String alias) {
    return $CategoriesTable(attachedDatabase, alias);
  }
}

class CategoryTable extends DataClass implements Insertable<CategoryTable> {
  final int id;
  final String name;
  final String? syncId;
  final DateTime? updatedAt;
  final DateTime? createdAt;
  final String? deviceId;
  final bool isDeleted;
  const CategoryTable(
      {required this.id,
      required this.name,
      this.syncId,
      this.updatedAt,
      this.createdAt,
      this.deviceId,
      required this.isDeleted});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['name'] = Variable<String>(name);
    if (!nullToAbsent || syncId != null) {
      map['sync_id'] = Variable<String>(syncId);
    }
    if (!nullToAbsent || updatedAt != null) {
      map['updated_at'] = Variable<DateTime>(updatedAt);
    }
    if (!nullToAbsent || createdAt != null) {
      map['created_at'] = Variable<DateTime>(createdAt);
    }
    if (!nullToAbsent || deviceId != null) {
      map['device_id'] = Variable<String>(deviceId);
    }
    map['is_deleted'] = Variable<bool>(isDeleted);
    return map;
  }

  CategoriesCompanion toCompanion(bool nullToAbsent) {
    return CategoriesCompanion(
      id: Value(id),
      name: Value(name),
      syncId:
          syncId == null && nullToAbsent ? const Value.absent() : Value(syncId),
      updatedAt: updatedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(updatedAt),
      createdAt: createdAt == null && nullToAbsent
          ? const Value.absent()
          : Value(createdAt),
      deviceId: deviceId == null && nullToAbsent
          ? const Value.absent()
          : Value(deviceId),
      isDeleted: Value(isDeleted),
    );
  }

  factory CategoryTable.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CategoryTable(
      id: serializer.fromJson<int>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      syncId: serializer.fromJson<String?>(json['syncId']),
      updatedAt: serializer.fromJson<DateTime?>(json['updatedAt']),
      createdAt: serializer.fromJson<DateTime?>(json['createdAt']),
      deviceId: serializer.fromJson<String?>(json['deviceId']),
      isDeleted: serializer.fromJson<bool>(json['isDeleted']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'name': serializer.toJson<String>(name),
      'syncId': serializer.toJson<String?>(syncId),
      'updatedAt': serializer.toJson<DateTime?>(updatedAt),
      'createdAt': serializer.toJson<DateTime?>(createdAt),
      'deviceId': serializer.toJson<String?>(deviceId),
      'isDeleted': serializer.toJson<bool>(isDeleted),
    };
  }

  CategoryTable copyWith(
          {int? id,
          String? name,
          Value<String?> syncId = const Value.absent(),
          Value<DateTime?> updatedAt = const Value.absent(),
          Value<DateTime?> createdAt = const Value.absent(),
          Value<String?> deviceId = const Value.absent(),
          bool? isDeleted}) =>
      CategoryTable(
        id: id ?? this.id,
        name: name ?? this.name,
        syncId: syncId.present ? syncId.value : this.syncId,
        updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
        createdAt: createdAt.present ? createdAt.value : this.createdAt,
        deviceId: deviceId.present ? deviceId.value : this.deviceId,
        isDeleted: isDeleted ?? this.isDeleted,
      );
  CategoryTable copyWithCompanion(CategoriesCompanion data) {
    return CategoryTable(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      syncId: data.syncId.present ? data.syncId.value : this.syncId,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      deviceId: data.deviceId.present ? data.deviceId.value : this.deviceId,
      isDeleted: data.isDeleted.present ? data.isDeleted.value : this.isDeleted,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CategoryTable(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, name, syncId, updatedAt, createdAt, deviceId, isDeleted);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CategoryTable &&
          other.id == this.id &&
          other.name == this.name &&
          other.syncId == this.syncId &&
          other.updatedAt == this.updatedAt &&
          other.createdAt == this.createdAt &&
          other.deviceId == this.deviceId &&
          other.isDeleted == this.isDeleted);
}

class CategoriesCompanion extends UpdateCompanion<CategoryTable> {
  final Value<int> id;
  final Value<String> name;
  final Value<String?> syncId;
  final Value<DateTime?> updatedAt;
  final Value<DateTime?> createdAt;
  final Value<String?> deviceId;
  final Value<bool> isDeleted;
  const CategoriesCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  });
  CategoriesCompanion.insert({
    this.id = const Value.absent(),
    required String name,
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  }) : name = Value(name);
  static Insertable<CategoryTable> custom({
    Expression<int>? id,
    Expression<String>? name,
    Expression<String>? syncId,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? createdAt,
    Expression<String>? deviceId,
    Expression<bool>? isDeleted,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (syncId != null) 'sync_id': syncId,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (createdAt != null) 'created_at': createdAt,
      if (deviceId != null) 'device_id': deviceId,
      if (isDeleted != null) 'is_deleted': isDeleted,
    });
  }

  CategoriesCompanion copyWith(
      {Value<int>? id,
      Value<String>? name,
      Value<String?>? syncId,
      Value<DateTime?>? updatedAt,
      Value<DateTime?>? createdAt,
      Value<String?>? deviceId,
      Value<bool>? isDeleted}) {
    return CategoriesCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      syncId: syncId ?? this.syncId,
      updatedAt: updatedAt ?? this.updatedAt,
      createdAt: createdAt ?? this.createdAt,
      deviceId: deviceId ?? this.deviceId,
      isDeleted: isDeleted ?? this.isDeleted,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (syncId.present) {
      map['sync_id'] = Variable<String>(syncId.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (deviceId.present) {
      map['device_id'] = Variable<String>(deviceId.value);
    }
    if (isDeleted.present) {
      map['is_deleted'] = Variable<bool>(isDeleted.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CategoriesCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted')
          ..write(')'))
        .toString();
  }
}

class $ItemsTable extends Items with TableInfo<$ItemsTable, ItemTable> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ItemsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
      'name', aliasedName, false,
      additionalChecks:
          GeneratedColumn.checkTextLength(minTextLength: 1, maxTextLength: 100),
      type: DriftSqlType.string,
      requiredDuringInsert: true);
  static const VerificationMeta _categoryMeta =
      const VerificationMeta('category');
  @override
  late final GeneratedColumn<String> category = GeneratedColumn<String>(
      'category', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _priceMeta = const VerificationMeta('price');
  @override
  late final GeneratedColumn<double> price = GeneratedColumn<double>(
      'price', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _stockQtyMeta =
      const VerificationMeta('stockQty');
  @override
  late final GeneratedColumn<int> stockQty = GeneratedColumn<int>(
      'stock_qty', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _minStockQtyMeta =
      const VerificationMeta('minStockQty');
  @override
  late final GeneratedColumn<double> minStockQty = GeneratedColumn<double>(
      'min_stock_qty', aliasedName, false,
      type: DriftSqlType.double,
      requiredDuringInsert: false,
      defaultValue: const Constant(0.0));
  static const VerificationMeta _imageMeta = const VerificationMeta('image');
  @override
  late final GeneratedColumn<Uint8List> image = GeneratedColumn<Uint8List>(
      'image', aliasedName, true,
      type: DriftSqlType.blob, requiredDuringInsert: false);
  static const VerificationMeta _categoryIdMeta =
      const VerificationMeta('categoryId');
  @override
  late final GeneratedColumn<int> categoryId = GeneratedColumn<int>(
      'category_id', aliasedName, true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('REFERENCES categories (id)'));
  static const VerificationMeta _typeMeta = const VerificationMeta('type');
  @override
  late final GeneratedColumn<String> type = GeneratedColumn<String>(
      'type', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('product'));
  static const VerificationMeta _billingTypeMeta =
      const VerificationMeta('billingType');
  @override
  late final GeneratedColumn<String> billingType = GeneratedColumn<String>(
      'billing_type', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _serviceCategoryMeta =
      const VerificationMeta('serviceCategory');
  @override
  late final GeneratedColumn<String> serviceCategory = GeneratedColumn<String>(
      'service_category', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _requiresTimeTrackingMeta =
      const VerificationMeta('requiresTimeTracking');
  @override
  late final GeneratedColumn<bool> requiresTimeTracking = GeneratedColumn<bool>(
      'requires_time_tracking', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("requires_time_tracking" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _syncIdMeta = const VerificationMeta('syncId');
  @override
  late final GeneratedColumn<String> syncId = GeneratedColumn<String>(
      'sync_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _deviceIdMeta =
      const VerificationMeta('deviceId');
  @override
  late final GeneratedColumn<String> deviceId = GeneratedColumn<String>(
      'device_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _isDeletedMeta =
      const VerificationMeta('isDeleted');
  @override
  late final GeneratedColumn<bool> isDeleted = GeneratedColumn<bool>(
      'is_deleted', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_deleted" IN (0, 1))'),
      defaultValue: const Constant(false));
  @override
  List<GeneratedColumn> get $columns => [
        id,
        name,
        category,
        price,
        stockQty,
        minStockQty,
        image,
        categoryId,
        type,
        billingType,
        serviceCategory,
        requiresTimeTracking,
        syncId,
        updatedAt,
        createdAt,
        deviceId,
        isDeleted
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'items';
  @override
  VerificationContext validateIntegrity(Insertable<ItemTable> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('name')) {
      context.handle(
          _nameMeta, name.isAcceptableOrUnknown(data['name']!, _nameMeta));
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('category')) {
      context.handle(_categoryMeta,
          category.isAcceptableOrUnknown(data['category']!, _categoryMeta));
    } else if (isInserting) {
      context.missing(_categoryMeta);
    }
    if (data.containsKey('price')) {
      context.handle(
          _priceMeta, price.isAcceptableOrUnknown(data['price']!, _priceMeta));
    } else if (isInserting) {
      context.missing(_priceMeta);
    }
    if (data.containsKey('stock_qty')) {
      context.handle(_stockQtyMeta,
          stockQty.isAcceptableOrUnknown(data['stock_qty']!, _stockQtyMeta));
    }
    if (data.containsKey('min_stock_qty')) {
      context.handle(
          _minStockQtyMeta,
          minStockQty.isAcceptableOrUnknown(
              data['min_stock_qty']!, _minStockQtyMeta));
    }
    if (data.containsKey('image')) {
      context.handle(
          _imageMeta, image.isAcceptableOrUnknown(data['image']!, _imageMeta));
    }
    if (data.containsKey('category_id')) {
      context.handle(
          _categoryIdMeta,
          categoryId.isAcceptableOrUnknown(
              data['category_id']!, _categoryIdMeta));
    }
    if (data.containsKey('type')) {
      context.handle(
          _typeMeta, type.isAcceptableOrUnknown(data['type']!, _typeMeta));
    }
    if (data.containsKey('billing_type')) {
      context.handle(
          _billingTypeMeta,
          billingType.isAcceptableOrUnknown(
              data['billing_type']!, _billingTypeMeta));
    }
    if (data.containsKey('service_category')) {
      context.handle(
          _serviceCategoryMeta,
          serviceCategory.isAcceptableOrUnknown(
              data['service_category']!, _serviceCategoryMeta));
    }
    if (data.containsKey('requires_time_tracking')) {
      context.handle(
          _requiresTimeTrackingMeta,
          requiresTimeTracking.isAcceptableOrUnknown(
              data['requires_time_tracking']!, _requiresTimeTrackingMeta));
    }
    if (data.containsKey('sync_id')) {
      context.handle(_syncIdMeta,
          syncId.isAcceptableOrUnknown(data['sync_id']!, _syncIdMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('device_id')) {
      context.handle(_deviceIdMeta,
          deviceId.isAcceptableOrUnknown(data['device_id']!, _deviceIdMeta));
    }
    if (data.containsKey('is_deleted')) {
      context.handle(_isDeletedMeta,
          isDeleted.isAcceptableOrUnknown(data['is_deleted']!, _isDeletedMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  ItemTable map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return ItemTable(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      name: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}name'])!,
      category: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}category'])!,
      price: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}price'])!,
      stockQty: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}stock_qty'])!,
      minStockQty: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}min_stock_qty'])!,
      image: attachedDatabase.typeMapping
          .read(DriftSqlType.blob, data['${effectivePrefix}image']),
      categoryId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}category_id']),
      type: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}type'])!,
      billingType: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}billing_type']),
      serviceCategory: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}service_category']),
      requiresTimeTracking: attachedDatabase.typeMapping.read(
          DriftSqlType.bool, data['${effectivePrefix}requires_time_tracking'])!,
      syncId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sync_id']),
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at']),
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at']),
      deviceId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}device_id']),
      isDeleted: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_deleted'])!,
    );
  }

  @override
  $ItemsTable createAlias(String alias) {
    return $ItemsTable(attachedDatabase, alias);
  }
}

class ItemTable extends DataClass implements Insertable<ItemTable> {
  final int id;
  final String name;
  final String category;
  final double price;
  final int stockQty;
  final double minStockQty;
  final Uint8List? image;
  final int? categoryId;
  final String type;
  final String? billingType;
  final String? serviceCategory;
  final bool requiresTimeTracking;
  final String? syncId;
  final DateTime? updatedAt;
  final DateTime? createdAt;
  final String? deviceId;
  final bool isDeleted;
  const ItemTable(
      {required this.id,
      required this.name,
      required this.category,
      required this.price,
      required this.stockQty,
      required this.minStockQty,
      this.image,
      this.categoryId,
      required this.type,
      this.billingType,
      this.serviceCategory,
      required this.requiresTimeTracking,
      this.syncId,
      this.updatedAt,
      this.createdAt,
      this.deviceId,
      required this.isDeleted});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['name'] = Variable<String>(name);
    map['category'] = Variable<String>(category);
    map['price'] = Variable<double>(price);
    map['stock_qty'] = Variable<int>(stockQty);
    map['min_stock_qty'] = Variable<double>(minStockQty);
    if (!nullToAbsent || image != null) {
      map['image'] = Variable<Uint8List>(image);
    }
    if (!nullToAbsent || categoryId != null) {
      map['category_id'] = Variable<int>(categoryId);
    }
    map['type'] = Variable<String>(type);
    if (!nullToAbsent || billingType != null) {
      map['billing_type'] = Variable<String>(billingType);
    }
    if (!nullToAbsent || serviceCategory != null) {
      map['service_category'] = Variable<String>(serviceCategory);
    }
    map['requires_time_tracking'] = Variable<bool>(requiresTimeTracking);
    if (!nullToAbsent || syncId != null) {
      map['sync_id'] = Variable<String>(syncId);
    }
    if (!nullToAbsent || updatedAt != null) {
      map['updated_at'] = Variable<DateTime>(updatedAt);
    }
    if (!nullToAbsent || createdAt != null) {
      map['created_at'] = Variable<DateTime>(createdAt);
    }
    if (!nullToAbsent || deviceId != null) {
      map['device_id'] = Variable<String>(deviceId);
    }
    map['is_deleted'] = Variable<bool>(isDeleted);
    return map;
  }

  ItemsCompanion toCompanion(bool nullToAbsent) {
    return ItemsCompanion(
      id: Value(id),
      name: Value(name),
      category: Value(category),
      price: Value(price),
      stockQty: Value(stockQty),
      minStockQty: Value(minStockQty),
      image:
          image == null && nullToAbsent ? const Value.absent() : Value(image),
      categoryId: categoryId == null && nullToAbsent
          ? const Value.absent()
          : Value(categoryId),
      type: Value(type),
      billingType: billingType == null && nullToAbsent
          ? const Value.absent()
          : Value(billingType),
      serviceCategory: serviceCategory == null && nullToAbsent
          ? const Value.absent()
          : Value(serviceCategory),
      requiresTimeTracking: Value(requiresTimeTracking),
      syncId:
          syncId == null && nullToAbsent ? const Value.absent() : Value(syncId),
      updatedAt: updatedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(updatedAt),
      createdAt: createdAt == null && nullToAbsent
          ? const Value.absent()
          : Value(createdAt),
      deviceId: deviceId == null && nullToAbsent
          ? const Value.absent()
          : Value(deviceId),
      isDeleted: Value(isDeleted),
    );
  }

  factory ItemTable.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return ItemTable(
      id: serializer.fromJson<int>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      category: serializer.fromJson<String>(json['category']),
      price: serializer.fromJson<double>(json['price']),
      stockQty: serializer.fromJson<int>(json['stockQty']),
      minStockQty: serializer.fromJson<double>(json['minStockQty']),
      image: serializer.fromJson<Uint8List?>(json['image']),
      categoryId: serializer.fromJson<int?>(json['categoryId']),
      type: serializer.fromJson<String>(json['type']),
      billingType: serializer.fromJson<String?>(json['billingType']),
      serviceCategory: serializer.fromJson<String?>(json['serviceCategory']),
      requiresTimeTracking:
          serializer.fromJson<bool>(json['requiresTimeTracking']),
      syncId: serializer.fromJson<String?>(json['syncId']),
      updatedAt: serializer.fromJson<DateTime?>(json['updatedAt']),
      createdAt: serializer.fromJson<DateTime?>(json['createdAt']),
      deviceId: serializer.fromJson<String?>(json['deviceId']),
      isDeleted: serializer.fromJson<bool>(json['isDeleted']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'name': serializer.toJson<String>(name),
      'category': serializer.toJson<String>(category),
      'price': serializer.toJson<double>(price),
      'stockQty': serializer.toJson<int>(stockQty),
      'minStockQty': serializer.toJson<double>(minStockQty),
      'image': serializer.toJson<Uint8List?>(image),
      'categoryId': serializer.toJson<int?>(categoryId),
      'type': serializer.toJson<String>(type),
      'billingType': serializer.toJson<String?>(billingType),
      'serviceCategory': serializer.toJson<String?>(serviceCategory),
      'requiresTimeTracking': serializer.toJson<bool>(requiresTimeTracking),
      'syncId': serializer.toJson<String?>(syncId),
      'updatedAt': serializer.toJson<DateTime?>(updatedAt),
      'createdAt': serializer.toJson<DateTime?>(createdAt),
      'deviceId': serializer.toJson<String?>(deviceId),
      'isDeleted': serializer.toJson<bool>(isDeleted),
    };
  }

  ItemTable copyWith(
          {int? id,
          String? name,
          String? category,
          double? price,
          int? stockQty,
          double? minStockQty,
          Value<Uint8List?> image = const Value.absent(),
          Value<int?> categoryId = const Value.absent(),
          String? type,
          Value<String?> billingType = const Value.absent(),
          Value<String?> serviceCategory = const Value.absent(),
          bool? requiresTimeTracking,
          Value<String?> syncId = const Value.absent(),
          Value<DateTime?> updatedAt = const Value.absent(),
          Value<DateTime?> createdAt = const Value.absent(),
          Value<String?> deviceId = const Value.absent(),
          bool? isDeleted}) =>
      ItemTable(
        id: id ?? this.id,
        name: name ?? this.name,
        category: category ?? this.category,
        price: price ?? this.price,
        stockQty: stockQty ?? this.stockQty,
        minStockQty: minStockQty ?? this.minStockQty,
        image: image.present ? image.value : this.image,
        categoryId: categoryId.present ? categoryId.value : this.categoryId,
        type: type ?? this.type,
        billingType: billingType.present ? billingType.value : this.billingType,
        serviceCategory: serviceCategory.present
            ? serviceCategory.value
            : this.serviceCategory,
        requiresTimeTracking: requiresTimeTracking ?? this.requiresTimeTracking,
        syncId: syncId.present ? syncId.value : this.syncId,
        updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
        createdAt: createdAt.present ? createdAt.value : this.createdAt,
        deviceId: deviceId.present ? deviceId.value : this.deviceId,
        isDeleted: isDeleted ?? this.isDeleted,
      );
  ItemTable copyWithCompanion(ItemsCompanion data) {
    return ItemTable(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      category: data.category.present ? data.category.value : this.category,
      price: data.price.present ? data.price.value : this.price,
      stockQty: data.stockQty.present ? data.stockQty.value : this.stockQty,
      minStockQty:
          data.minStockQty.present ? data.minStockQty.value : this.minStockQty,
      image: data.image.present ? data.image.value : this.image,
      categoryId:
          data.categoryId.present ? data.categoryId.value : this.categoryId,
      type: data.type.present ? data.type.value : this.type,
      billingType:
          data.billingType.present ? data.billingType.value : this.billingType,
      serviceCategory: data.serviceCategory.present
          ? data.serviceCategory.value
          : this.serviceCategory,
      requiresTimeTracking: data.requiresTimeTracking.present
          ? data.requiresTimeTracking.value
          : this.requiresTimeTracking,
      syncId: data.syncId.present ? data.syncId.value : this.syncId,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      deviceId: data.deviceId.present ? data.deviceId.value : this.deviceId,
      isDeleted: data.isDeleted.present ? data.isDeleted.value : this.isDeleted,
    );
  }

  @override
  String toString() {
    return (StringBuffer('ItemTable(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('category: $category, ')
          ..write('price: $price, ')
          ..write('stockQty: $stockQty, ')
          ..write('minStockQty: $minStockQty, ')
          ..write('image: $image, ')
          ..write('categoryId: $categoryId, ')
          ..write('type: $type, ')
          ..write('billingType: $billingType, ')
          ..write('serviceCategory: $serviceCategory, ')
          ..write('requiresTimeTracking: $requiresTimeTracking, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      name,
      category,
      price,
      stockQty,
      minStockQty,
      $driftBlobEquality.hash(image),
      categoryId,
      type,
      billingType,
      serviceCategory,
      requiresTimeTracking,
      syncId,
      updatedAt,
      createdAt,
      deviceId,
      isDeleted);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ItemTable &&
          other.id == this.id &&
          other.name == this.name &&
          other.category == this.category &&
          other.price == this.price &&
          other.stockQty == this.stockQty &&
          other.minStockQty == this.minStockQty &&
          $driftBlobEquality.equals(other.image, this.image) &&
          other.categoryId == this.categoryId &&
          other.type == this.type &&
          other.billingType == this.billingType &&
          other.serviceCategory == this.serviceCategory &&
          other.requiresTimeTracking == this.requiresTimeTracking &&
          other.syncId == this.syncId &&
          other.updatedAt == this.updatedAt &&
          other.createdAt == this.createdAt &&
          other.deviceId == this.deviceId &&
          other.isDeleted == this.isDeleted);
}

class ItemsCompanion extends UpdateCompanion<ItemTable> {
  final Value<int> id;
  final Value<String> name;
  final Value<String> category;
  final Value<double> price;
  final Value<int> stockQty;
  final Value<double> minStockQty;
  final Value<Uint8List?> image;
  final Value<int?> categoryId;
  final Value<String> type;
  final Value<String?> billingType;
  final Value<String?> serviceCategory;
  final Value<bool> requiresTimeTracking;
  final Value<String?> syncId;
  final Value<DateTime?> updatedAt;
  final Value<DateTime?> createdAt;
  final Value<String?> deviceId;
  final Value<bool> isDeleted;
  const ItemsCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.category = const Value.absent(),
    this.price = const Value.absent(),
    this.stockQty = const Value.absent(),
    this.minStockQty = const Value.absent(),
    this.image = const Value.absent(),
    this.categoryId = const Value.absent(),
    this.type = const Value.absent(),
    this.billingType = const Value.absent(),
    this.serviceCategory = const Value.absent(),
    this.requiresTimeTracking = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  });
  ItemsCompanion.insert({
    this.id = const Value.absent(),
    required String name,
    required String category,
    required double price,
    this.stockQty = const Value.absent(),
    this.minStockQty = const Value.absent(),
    this.image = const Value.absent(),
    this.categoryId = const Value.absent(),
    this.type = const Value.absent(),
    this.billingType = const Value.absent(),
    this.serviceCategory = const Value.absent(),
    this.requiresTimeTracking = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  })  : name = Value(name),
        category = Value(category),
        price = Value(price);
  static Insertable<ItemTable> custom({
    Expression<int>? id,
    Expression<String>? name,
    Expression<String>? category,
    Expression<double>? price,
    Expression<int>? stockQty,
    Expression<double>? minStockQty,
    Expression<Uint8List>? image,
    Expression<int>? categoryId,
    Expression<String>? type,
    Expression<String>? billingType,
    Expression<String>? serviceCategory,
    Expression<bool>? requiresTimeTracking,
    Expression<String>? syncId,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? createdAt,
    Expression<String>? deviceId,
    Expression<bool>? isDeleted,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (category != null) 'category': category,
      if (price != null) 'price': price,
      if (stockQty != null) 'stock_qty': stockQty,
      if (minStockQty != null) 'min_stock_qty': minStockQty,
      if (image != null) 'image': image,
      if (categoryId != null) 'category_id': categoryId,
      if (type != null) 'type': type,
      if (billingType != null) 'billing_type': billingType,
      if (serviceCategory != null) 'service_category': serviceCategory,
      if (requiresTimeTracking != null)
        'requires_time_tracking': requiresTimeTracking,
      if (syncId != null) 'sync_id': syncId,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (createdAt != null) 'created_at': createdAt,
      if (deviceId != null) 'device_id': deviceId,
      if (isDeleted != null) 'is_deleted': isDeleted,
    });
  }

  ItemsCompanion copyWith(
      {Value<int>? id,
      Value<String>? name,
      Value<String>? category,
      Value<double>? price,
      Value<int>? stockQty,
      Value<double>? minStockQty,
      Value<Uint8List?>? image,
      Value<int?>? categoryId,
      Value<String>? type,
      Value<String?>? billingType,
      Value<String?>? serviceCategory,
      Value<bool>? requiresTimeTracking,
      Value<String?>? syncId,
      Value<DateTime?>? updatedAt,
      Value<DateTime?>? createdAt,
      Value<String?>? deviceId,
      Value<bool>? isDeleted}) {
    return ItemsCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      category: category ?? this.category,
      price: price ?? this.price,
      stockQty: stockQty ?? this.stockQty,
      minStockQty: minStockQty ?? this.minStockQty,
      image: image ?? this.image,
      categoryId: categoryId ?? this.categoryId,
      type: type ?? this.type,
      billingType: billingType ?? this.billingType,
      serviceCategory: serviceCategory ?? this.serviceCategory,
      requiresTimeTracking: requiresTimeTracking ?? this.requiresTimeTracking,
      syncId: syncId ?? this.syncId,
      updatedAt: updatedAt ?? this.updatedAt,
      createdAt: createdAt ?? this.createdAt,
      deviceId: deviceId ?? this.deviceId,
      isDeleted: isDeleted ?? this.isDeleted,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (category.present) {
      map['category'] = Variable<String>(category.value);
    }
    if (price.present) {
      map['price'] = Variable<double>(price.value);
    }
    if (stockQty.present) {
      map['stock_qty'] = Variable<int>(stockQty.value);
    }
    if (minStockQty.present) {
      map['min_stock_qty'] = Variable<double>(minStockQty.value);
    }
    if (image.present) {
      map['image'] = Variable<Uint8List>(image.value);
    }
    if (categoryId.present) {
      map['category_id'] = Variable<int>(categoryId.value);
    }
    if (type.present) {
      map['type'] = Variable<String>(type.value);
    }
    if (billingType.present) {
      map['billing_type'] = Variable<String>(billingType.value);
    }
    if (serviceCategory.present) {
      map['service_category'] = Variable<String>(serviceCategory.value);
    }
    if (requiresTimeTracking.present) {
      map['requires_time_tracking'] =
          Variable<bool>(requiresTimeTracking.value);
    }
    if (syncId.present) {
      map['sync_id'] = Variable<String>(syncId.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (deviceId.present) {
      map['device_id'] = Variable<String>(deviceId.value);
    }
    if (isDeleted.present) {
      map['is_deleted'] = Variable<bool>(isDeleted.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ItemsCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('category: $category, ')
          ..write('price: $price, ')
          ..write('stockQty: $stockQty, ')
          ..write('minStockQty: $minStockQty, ')
          ..write('image: $image, ')
          ..write('categoryId: $categoryId, ')
          ..write('type: $type, ')
          ..write('billingType: $billingType, ')
          ..write('serviceCategory: $serviceCategory, ')
          ..write('requiresTimeTracking: $requiresTimeTracking, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted')
          ..write(')'))
        .toString();
  }
}

class $InvoicesTable extends Invoices
    with TableInfo<$InvoicesTable, InvoiceTable> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $InvoicesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _invoiceNumberMeta =
      const VerificationMeta('invoiceNumber');
  @override
  late final GeneratedColumn<String> invoiceNumber = GeneratedColumn<String>(
      'invoice_number', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _dateCreatedMeta =
      const VerificationMeta('dateCreated');
  @override
  late final GeneratedColumn<DateTime> dateCreated = GeneratedColumn<DateTime>(
      'date_created', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  static const VerificationMeta _subtotalMeta =
      const VerificationMeta('subtotal');
  @override
  late final GeneratedColumn<double> subtotal = GeneratedColumn<double>(
      'subtotal', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _taxAmountMeta =
      const VerificationMeta('taxAmount');
  @override
  late final GeneratedColumn<double> taxAmount = GeneratedColumn<double>(
      'tax_amount', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _discountAmountMeta =
      const VerificationMeta('discountAmount');
  @override
  late final GeneratedColumn<double> discountAmount = GeneratedColumn<double>(
      'discount_amount', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _totalAmountMeta =
      const VerificationMeta('totalAmount');
  @override
  late final GeneratedColumn<double> totalAmount = GeneratedColumn<double>(
      'total_amount', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _paymentStatusMeta =
      const VerificationMeta('paymentStatus');
  @override
  late final GeneratedColumn<String> paymentStatus = GeneratedColumn<String>(
      'payment_status', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _amountPaidMeta =
      const VerificationMeta('amountPaid');
  @override
  late final GeneratedColumn<double> amountPaid = GeneratedColumn<double>(
      'amount_paid', aliasedName, false,
      type: DriftSqlType.double,
      requiredDuringInsert: false,
      defaultValue: const Constant(0.0));
  static const VerificationMeta _balanceAmountMeta =
      const VerificationMeta('balanceAmount');
  @override
  late final GeneratedColumn<double> balanceAmount = GeneratedColumn<double>(
      'balance_amount', aliasedName, false,
      type: DriftSqlType.double,
      requiredDuringInsert: false,
      defaultValue: const Constant(0.0));
  static const VerificationMeta _customerNameMeta =
      const VerificationMeta('customerName');
  @override
  late final GeneratedColumn<String> customerName = GeneratedColumn<String>(
      'customer_name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _customerAddressMeta =
      const VerificationMeta('customerAddress');
  @override
  late final GeneratedColumn<String> customerAddress = GeneratedColumn<String>(
      'customer_address', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _paymentMethodMeta =
      const VerificationMeta('paymentMethod');
  @override
  late final GeneratedColumn<String> paymentMethod = GeneratedColumn<String>(
      'payment_method', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _staffIdMeta =
      const VerificationMeta('staffId');
  @override
  late final GeneratedColumn<int> staffId = GeneratedColumn<int>(
      'staff_id', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _staffNameMeta =
      const VerificationMeta('staffName');
  @override
  late final GeneratedColumn<String> staffName = GeneratedColumn<String>(
      'staff_name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _syncIdMeta = const VerificationMeta('syncId');
  @override
  late final GeneratedColumn<String> syncId = GeneratedColumn<String>(
      'sync_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _deviceIdMeta =
      const VerificationMeta('deviceId');
  @override
  late final GeneratedColumn<String> deviceId = GeneratedColumn<String>(
      'device_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _isDeletedMeta =
      const VerificationMeta('isDeleted');
  @override
  late final GeneratedColumn<bool> isDeleted = GeneratedColumn<bool>(
      'is_deleted', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_deleted" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _totalPrintAmountMeta =
      const VerificationMeta('totalPrintAmount');
  @override
  late final GeneratedColumn<double> totalPrintAmount = GeneratedColumn<double>(
      'total_print_amount', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        invoiceNumber,
        dateCreated,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        paymentStatus,
        amountPaid,
        balanceAmount,
        customerName,
        customerAddress,
        paymentMethod,
        staffId,
        staffName,
        syncId,
        updatedAt,
        createdAt,
        deviceId,
        isDeleted,
        totalPrintAmount
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'invoices';
  @override
  VerificationContext validateIntegrity(Insertable<InvoiceTable> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('invoice_number')) {
      context.handle(
          _invoiceNumberMeta,
          invoiceNumber.isAcceptableOrUnknown(
              data['invoice_number']!, _invoiceNumberMeta));
    } else if (isInserting) {
      context.missing(_invoiceNumberMeta);
    }
    if (data.containsKey('date_created')) {
      context.handle(
          _dateCreatedMeta,
          dateCreated.isAcceptableOrUnknown(
              data['date_created']!, _dateCreatedMeta));
    }
    if (data.containsKey('subtotal')) {
      context.handle(_subtotalMeta,
          subtotal.isAcceptableOrUnknown(data['subtotal']!, _subtotalMeta));
    } else if (isInserting) {
      context.missing(_subtotalMeta);
    }
    if (data.containsKey('tax_amount')) {
      context.handle(_taxAmountMeta,
          taxAmount.isAcceptableOrUnknown(data['tax_amount']!, _taxAmountMeta));
    } else if (isInserting) {
      context.missing(_taxAmountMeta);
    }
    if (data.containsKey('discount_amount')) {
      context.handle(
          _discountAmountMeta,
          discountAmount.isAcceptableOrUnknown(
              data['discount_amount']!, _discountAmountMeta));
    } else if (isInserting) {
      context.missing(_discountAmountMeta);
    }
    if (data.containsKey('total_amount')) {
      context.handle(
          _totalAmountMeta,
          totalAmount.isAcceptableOrUnknown(
              data['total_amount']!, _totalAmountMeta));
    } else if (isInserting) {
      context.missing(_totalAmountMeta);
    }
    if (data.containsKey('payment_status')) {
      context.handle(
          _paymentStatusMeta,
          paymentStatus.isAcceptableOrUnknown(
              data['payment_status']!, _paymentStatusMeta));
    } else if (isInserting) {
      context.missing(_paymentStatusMeta);
    }
    if (data.containsKey('amount_paid')) {
      context.handle(
          _amountPaidMeta,
          amountPaid.isAcceptableOrUnknown(
              data['amount_paid']!, _amountPaidMeta));
    }
    if (data.containsKey('balance_amount')) {
      context.handle(
          _balanceAmountMeta,
          balanceAmount.isAcceptableOrUnknown(
              data['balance_amount']!, _balanceAmountMeta));
    }
    if (data.containsKey('customer_name')) {
      context.handle(
          _customerNameMeta,
          customerName.isAcceptableOrUnknown(
              data['customer_name']!, _customerNameMeta));
    }
    if (data.containsKey('customer_address')) {
      context.handle(
          _customerAddressMeta,
          customerAddress.isAcceptableOrUnknown(
              data['customer_address']!, _customerAddressMeta));
    }
    if (data.containsKey('payment_method')) {
      context.handle(
          _paymentMethodMeta,
          paymentMethod.isAcceptableOrUnknown(
              data['payment_method']!, _paymentMethodMeta));
    }
    if (data.containsKey('staff_id')) {
      context.handle(_staffIdMeta,
          staffId.isAcceptableOrUnknown(data['staff_id']!, _staffIdMeta));
    }
    if (data.containsKey('staff_name')) {
      context.handle(_staffNameMeta,
          staffName.isAcceptableOrUnknown(data['staff_name']!, _staffNameMeta));
    }
    if (data.containsKey('sync_id')) {
      context.handle(_syncIdMeta,
          syncId.isAcceptableOrUnknown(data['sync_id']!, _syncIdMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('device_id')) {
      context.handle(_deviceIdMeta,
          deviceId.isAcceptableOrUnknown(data['device_id']!, _deviceIdMeta));
    }
    if (data.containsKey('is_deleted')) {
      context.handle(_isDeletedMeta,
          isDeleted.isAcceptableOrUnknown(data['is_deleted']!, _isDeletedMeta));
    }
    if (data.containsKey('total_print_amount')) {
      context.handle(
          _totalPrintAmountMeta,
          totalPrintAmount.isAcceptableOrUnknown(
              data['total_print_amount']!, _totalPrintAmountMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  InvoiceTable map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return InvoiceTable(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      invoiceNumber: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}invoice_number'])!,
      dateCreated: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}date_created'])!,
      subtotal: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}subtotal'])!,
      taxAmount: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}tax_amount'])!,
      discountAmount: attachedDatabase.typeMapping.read(
          DriftSqlType.double, data['${effectivePrefix}discount_amount'])!,
      totalAmount: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}total_amount'])!,
      paymentStatus: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}payment_status'])!,
      amountPaid: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}amount_paid'])!,
      balanceAmount: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}balance_amount'])!,
      customerName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}customer_name']),
      customerAddress: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}customer_address']),
      paymentMethod: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}payment_method']),
      staffId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}staff_id']),
      staffName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}staff_name']),
      syncId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sync_id']),
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at']),
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at']),
      deviceId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}device_id']),
      isDeleted: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_deleted'])!,
      totalPrintAmount: attachedDatabase.typeMapping.read(
          DriftSqlType.double, data['${effectivePrefix}total_print_amount']),
    );
  }

  @override
  $InvoicesTable createAlias(String alias) {
    return $InvoicesTable(attachedDatabase, alias);
  }
}

class InvoiceTable extends DataClass implements Insertable<InvoiceTable> {
  final int id;
  final String invoiceNumber;
  final DateTime dateCreated;
  final double subtotal;
  final double taxAmount;
  final double discountAmount;
  final double totalAmount;
  final String paymentStatus;
  final double amountPaid;
  final double balanceAmount;
  final String? customerName;
  final String? customerAddress;
  final String? paymentMethod;
  final int? staffId;
  final String? staffName;
  final String? syncId;
  final DateTime? updatedAt;
  final DateTime? createdAt;
  final String? deviceId;
  final bool isDeleted;
  final double? totalPrintAmount;
  const InvoiceTable(
      {required this.id,
      required this.invoiceNumber,
      required this.dateCreated,
      required this.subtotal,
      required this.taxAmount,
      required this.discountAmount,
      required this.totalAmount,
      required this.paymentStatus,
      required this.amountPaid,
      required this.balanceAmount,
      this.customerName,
      this.customerAddress,
      this.paymentMethod,
      this.staffId,
      this.staffName,
      this.syncId,
      this.updatedAt,
      this.createdAt,
      this.deviceId,
      required this.isDeleted,
      this.totalPrintAmount});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['invoice_number'] = Variable<String>(invoiceNumber);
    map['date_created'] = Variable<DateTime>(dateCreated);
    map['subtotal'] = Variable<double>(subtotal);
    map['tax_amount'] = Variable<double>(taxAmount);
    map['discount_amount'] = Variable<double>(discountAmount);
    map['total_amount'] = Variable<double>(totalAmount);
    map['payment_status'] = Variable<String>(paymentStatus);
    map['amount_paid'] = Variable<double>(amountPaid);
    map['balance_amount'] = Variable<double>(balanceAmount);
    if (!nullToAbsent || customerName != null) {
      map['customer_name'] = Variable<String>(customerName);
    }
    if (!nullToAbsent || customerAddress != null) {
      map['customer_address'] = Variable<String>(customerAddress);
    }
    if (!nullToAbsent || paymentMethod != null) {
      map['payment_method'] = Variable<String>(paymentMethod);
    }
    if (!nullToAbsent || staffId != null) {
      map['staff_id'] = Variable<int>(staffId);
    }
    if (!nullToAbsent || staffName != null) {
      map['staff_name'] = Variable<String>(staffName);
    }
    if (!nullToAbsent || syncId != null) {
      map['sync_id'] = Variable<String>(syncId);
    }
    if (!nullToAbsent || updatedAt != null) {
      map['updated_at'] = Variable<DateTime>(updatedAt);
    }
    if (!nullToAbsent || createdAt != null) {
      map['created_at'] = Variable<DateTime>(createdAt);
    }
    if (!nullToAbsent || deviceId != null) {
      map['device_id'] = Variable<String>(deviceId);
    }
    map['is_deleted'] = Variable<bool>(isDeleted);
    if (!nullToAbsent || totalPrintAmount != null) {
      map['total_print_amount'] = Variable<double>(totalPrintAmount);
    }
    return map;
  }

  InvoicesCompanion toCompanion(bool nullToAbsent) {
    return InvoicesCompanion(
      id: Value(id),
      invoiceNumber: Value(invoiceNumber),
      dateCreated: Value(dateCreated),
      subtotal: Value(subtotal),
      taxAmount: Value(taxAmount),
      discountAmount: Value(discountAmount),
      totalAmount: Value(totalAmount),
      paymentStatus: Value(paymentStatus),
      amountPaid: Value(amountPaid),
      balanceAmount: Value(balanceAmount),
      customerName: customerName == null && nullToAbsent
          ? const Value.absent()
          : Value(customerName),
      customerAddress: customerAddress == null && nullToAbsent
          ? const Value.absent()
          : Value(customerAddress),
      paymentMethod: paymentMethod == null && nullToAbsent
          ? const Value.absent()
          : Value(paymentMethod),
      staffId: staffId == null && nullToAbsent
          ? const Value.absent()
          : Value(staffId),
      staffName: staffName == null && nullToAbsent
          ? const Value.absent()
          : Value(staffName),
      syncId:
          syncId == null && nullToAbsent ? const Value.absent() : Value(syncId),
      updatedAt: updatedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(updatedAt),
      createdAt: createdAt == null && nullToAbsent
          ? const Value.absent()
          : Value(createdAt),
      deviceId: deviceId == null && nullToAbsent
          ? const Value.absent()
          : Value(deviceId),
      isDeleted: Value(isDeleted),
      totalPrintAmount: totalPrintAmount == null && nullToAbsent
          ? const Value.absent()
          : Value(totalPrintAmount),
    );
  }

  factory InvoiceTable.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return InvoiceTable(
      id: serializer.fromJson<int>(json['id']),
      invoiceNumber: serializer.fromJson<String>(json['invoiceNumber']),
      dateCreated: serializer.fromJson<DateTime>(json['dateCreated']),
      subtotal: serializer.fromJson<double>(json['subtotal']),
      taxAmount: serializer.fromJson<double>(json['taxAmount']),
      discountAmount: serializer.fromJson<double>(json['discountAmount']),
      totalAmount: serializer.fromJson<double>(json['totalAmount']),
      paymentStatus: serializer.fromJson<String>(json['paymentStatus']),
      amountPaid: serializer.fromJson<double>(json['amountPaid']),
      balanceAmount: serializer.fromJson<double>(json['balanceAmount']),
      customerName: serializer.fromJson<String?>(json['customerName']),
      customerAddress: serializer.fromJson<String?>(json['customerAddress']),
      paymentMethod: serializer.fromJson<String?>(json['paymentMethod']),
      staffId: serializer.fromJson<int?>(json['staffId']),
      staffName: serializer.fromJson<String?>(json['staffName']),
      syncId: serializer.fromJson<String?>(json['syncId']),
      updatedAt: serializer.fromJson<DateTime?>(json['updatedAt']),
      createdAt: serializer.fromJson<DateTime?>(json['createdAt']),
      deviceId: serializer.fromJson<String?>(json['deviceId']),
      isDeleted: serializer.fromJson<bool>(json['isDeleted']),
      totalPrintAmount: serializer.fromJson<double?>(json['totalPrintAmount']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'invoiceNumber': serializer.toJson<String>(invoiceNumber),
      'dateCreated': serializer.toJson<DateTime>(dateCreated),
      'subtotal': serializer.toJson<double>(subtotal),
      'taxAmount': serializer.toJson<double>(taxAmount),
      'discountAmount': serializer.toJson<double>(discountAmount),
      'totalAmount': serializer.toJson<double>(totalAmount),
      'paymentStatus': serializer.toJson<String>(paymentStatus),
      'amountPaid': serializer.toJson<double>(amountPaid),
      'balanceAmount': serializer.toJson<double>(balanceAmount),
      'customerName': serializer.toJson<String?>(customerName),
      'customerAddress': serializer.toJson<String?>(customerAddress),
      'paymentMethod': serializer.toJson<String?>(paymentMethod),
      'staffId': serializer.toJson<int?>(staffId),
      'staffName': serializer.toJson<String?>(staffName),
      'syncId': serializer.toJson<String?>(syncId),
      'updatedAt': serializer.toJson<DateTime?>(updatedAt),
      'createdAt': serializer.toJson<DateTime?>(createdAt),
      'deviceId': serializer.toJson<String?>(deviceId),
      'isDeleted': serializer.toJson<bool>(isDeleted),
      'totalPrintAmount': serializer.toJson<double?>(totalPrintAmount),
    };
  }

  InvoiceTable copyWith(
          {int? id,
          String? invoiceNumber,
          DateTime? dateCreated,
          double? subtotal,
          double? taxAmount,
          double? discountAmount,
          double? totalAmount,
          String? paymentStatus,
          double? amountPaid,
          double? balanceAmount,
          Value<String?> customerName = const Value.absent(),
          Value<String?> customerAddress = const Value.absent(),
          Value<String?> paymentMethod = const Value.absent(),
          Value<int?> staffId = const Value.absent(),
          Value<String?> staffName = const Value.absent(),
          Value<String?> syncId = const Value.absent(),
          Value<DateTime?> updatedAt = const Value.absent(),
          Value<DateTime?> createdAt = const Value.absent(),
          Value<String?> deviceId = const Value.absent(),
          bool? isDeleted,
          Value<double?> totalPrintAmount = const Value.absent()}) =>
      InvoiceTable(
        id: id ?? this.id,
        invoiceNumber: invoiceNumber ?? this.invoiceNumber,
        dateCreated: dateCreated ?? this.dateCreated,
        subtotal: subtotal ?? this.subtotal,
        taxAmount: taxAmount ?? this.taxAmount,
        discountAmount: discountAmount ?? this.discountAmount,
        totalAmount: totalAmount ?? this.totalAmount,
        paymentStatus: paymentStatus ?? this.paymentStatus,
        amountPaid: amountPaid ?? this.amountPaid,
        balanceAmount: balanceAmount ?? this.balanceAmount,
        customerName:
            customerName.present ? customerName.value : this.customerName,
        customerAddress: customerAddress.present
            ? customerAddress.value
            : this.customerAddress,
        paymentMethod:
            paymentMethod.present ? paymentMethod.value : this.paymentMethod,
        staffId: staffId.present ? staffId.value : this.staffId,
        staffName: staffName.present ? staffName.value : this.staffName,
        syncId: syncId.present ? syncId.value : this.syncId,
        updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
        createdAt: createdAt.present ? createdAt.value : this.createdAt,
        deviceId: deviceId.present ? deviceId.value : this.deviceId,
        isDeleted: isDeleted ?? this.isDeleted,
        totalPrintAmount: totalPrintAmount.present
            ? totalPrintAmount.value
            : this.totalPrintAmount,
      );
  InvoiceTable copyWithCompanion(InvoicesCompanion data) {
    return InvoiceTable(
      id: data.id.present ? data.id.value : this.id,
      invoiceNumber: data.invoiceNumber.present
          ? data.invoiceNumber.value
          : this.invoiceNumber,
      dateCreated:
          data.dateCreated.present ? data.dateCreated.value : this.dateCreated,
      subtotal: data.subtotal.present ? data.subtotal.value : this.subtotal,
      taxAmount: data.taxAmount.present ? data.taxAmount.value : this.taxAmount,
      discountAmount: data.discountAmount.present
          ? data.discountAmount.value
          : this.discountAmount,
      totalAmount:
          data.totalAmount.present ? data.totalAmount.value : this.totalAmount,
      paymentStatus: data.paymentStatus.present
          ? data.paymentStatus.value
          : this.paymentStatus,
      amountPaid:
          data.amountPaid.present ? data.amountPaid.value : this.amountPaid,
      balanceAmount: data.balanceAmount.present
          ? data.balanceAmount.value
          : this.balanceAmount,
      customerName: data.customerName.present
          ? data.customerName.value
          : this.customerName,
      customerAddress: data.customerAddress.present
          ? data.customerAddress.value
          : this.customerAddress,
      paymentMethod: data.paymentMethod.present
          ? data.paymentMethod.value
          : this.paymentMethod,
      staffId: data.staffId.present ? data.staffId.value : this.staffId,
      staffName: data.staffName.present ? data.staffName.value : this.staffName,
      syncId: data.syncId.present ? data.syncId.value : this.syncId,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      deviceId: data.deviceId.present ? data.deviceId.value : this.deviceId,
      isDeleted: data.isDeleted.present ? data.isDeleted.value : this.isDeleted,
      totalPrintAmount: data.totalPrintAmount.present
          ? data.totalPrintAmount.value
          : this.totalPrintAmount,
    );
  }

  @override
  String toString() {
    return (StringBuffer('InvoiceTable(')
          ..write('id: $id, ')
          ..write('invoiceNumber: $invoiceNumber, ')
          ..write('dateCreated: $dateCreated, ')
          ..write('subtotal: $subtotal, ')
          ..write('taxAmount: $taxAmount, ')
          ..write('discountAmount: $discountAmount, ')
          ..write('totalAmount: $totalAmount, ')
          ..write('paymentStatus: $paymentStatus, ')
          ..write('amountPaid: $amountPaid, ')
          ..write('balanceAmount: $balanceAmount, ')
          ..write('customerName: $customerName, ')
          ..write('customerAddress: $customerAddress, ')
          ..write('paymentMethod: $paymentMethod, ')
          ..write('staffId: $staffId, ')
          ..write('staffName: $staffName, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted, ')
          ..write('totalPrintAmount: $totalPrintAmount')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hashAll([
        id,
        invoiceNumber,
        dateCreated,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        paymentStatus,
        amountPaid,
        balanceAmount,
        customerName,
        customerAddress,
        paymentMethod,
        staffId,
        staffName,
        syncId,
        updatedAt,
        createdAt,
        deviceId,
        isDeleted,
        totalPrintAmount
      ]);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is InvoiceTable &&
          other.id == this.id &&
          other.invoiceNumber == this.invoiceNumber &&
          other.dateCreated == this.dateCreated &&
          other.subtotal == this.subtotal &&
          other.taxAmount == this.taxAmount &&
          other.discountAmount == this.discountAmount &&
          other.totalAmount == this.totalAmount &&
          other.paymentStatus == this.paymentStatus &&
          other.amountPaid == this.amountPaid &&
          other.balanceAmount == this.balanceAmount &&
          other.customerName == this.customerName &&
          other.customerAddress == this.customerAddress &&
          other.paymentMethod == this.paymentMethod &&
          other.staffId == this.staffId &&
          other.staffName == this.staffName &&
          other.syncId == this.syncId &&
          other.updatedAt == this.updatedAt &&
          other.createdAt == this.createdAt &&
          other.deviceId == this.deviceId &&
          other.isDeleted == this.isDeleted &&
          other.totalPrintAmount == this.totalPrintAmount);
}

class InvoicesCompanion extends UpdateCompanion<InvoiceTable> {
  final Value<int> id;
  final Value<String> invoiceNumber;
  final Value<DateTime> dateCreated;
  final Value<double> subtotal;
  final Value<double> taxAmount;
  final Value<double> discountAmount;
  final Value<double> totalAmount;
  final Value<String> paymentStatus;
  final Value<double> amountPaid;
  final Value<double> balanceAmount;
  final Value<String?> customerName;
  final Value<String?> customerAddress;
  final Value<String?> paymentMethod;
  final Value<int?> staffId;
  final Value<String?> staffName;
  final Value<String?> syncId;
  final Value<DateTime?> updatedAt;
  final Value<DateTime?> createdAt;
  final Value<String?> deviceId;
  final Value<bool> isDeleted;
  final Value<double?> totalPrintAmount;
  const InvoicesCompanion({
    this.id = const Value.absent(),
    this.invoiceNumber = const Value.absent(),
    this.dateCreated = const Value.absent(),
    this.subtotal = const Value.absent(),
    this.taxAmount = const Value.absent(),
    this.discountAmount = const Value.absent(),
    this.totalAmount = const Value.absent(),
    this.paymentStatus = const Value.absent(),
    this.amountPaid = const Value.absent(),
    this.balanceAmount = const Value.absent(),
    this.customerName = const Value.absent(),
    this.customerAddress = const Value.absent(),
    this.paymentMethod = const Value.absent(),
    this.staffId = const Value.absent(),
    this.staffName = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
    this.totalPrintAmount = const Value.absent(),
  });
  InvoicesCompanion.insert({
    this.id = const Value.absent(),
    required String invoiceNumber,
    this.dateCreated = const Value.absent(),
    required double subtotal,
    required double taxAmount,
    required double discountAmount,
    required double totalAmount,
    required String paymentStatus,
    this.amountPaid = const Value.absent(),
    this.balanceAmount = const Value.absent(),
    this.customerName = const Value.absent(),
    this.customerAddress = const Value.absent(),
    this.paymentMethod = const Value.absent(),
    this.staffId = const Value.absent(),
    this.staffName = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
    this.totalPrintAmount = const Value.absent(),
  })  : invoiceNumber = Value(invoiceNumber),
        subtotal = Value(subtotal),
        taxAmount = Value(taxAmount),
        discountAmount = Value(discountAmount),
        totalAmount = Value(totalAmount),
        paymentStatus = Value(paymentStatus);
  static Insertable<InvoiceTable> custom({
    Expression<int>? id,
    Expression<String>? invoiceNumber,
    Expression<DateTime>? dateCreated,
    Expression<double>? subtotal,
    Expression<double>? taxAmount,
    Expression<double>? discountAmount,
    Expression<double>? totalAmount,
    Expression<String>? paymentStatus,
    Expression<double>? amountPaid,
    Expression<double>? balanceAmount,
    Expression<String>? customerName,
    Expression<String>? customerAddress,
    Expression<String>? paymentMethod,
    Expression<int>? staffId,
    Expression<String>? staffName,
    Expression<String>? syncId,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? createdAt,
    Expression<String>? deviceId,
    Expression<bool>? isDeleted,
    Expression<double>? totalPrintAmount,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (invoiceNumber != null) 'invoice_number': invoiceNumber,
      if (dateCreated != null) 'date_created': dateCreated,
      if (subtotal != null) 'subtotal': subtotal,
      if (taxAmount != null) 'tax_amount': taxAmount,
      if (discountAmount != null) 'discount_amount': discountAmount,
      if (totalAmount != null) 'total_amount': totalAmount,
      if (paymentStatus != null) 'payment_status': paymentStatus,
      if (amountPaid != null) 'amount_paid': amountPaid,
      if (balanceAmount != null) 'balance_amount': balanceAmount,
      if (customerName != null) 'customer_name': customerName,
      if (customerAddress != null) 'customer_address': customerAddress,
      if (paymentMethod != null) 'payment_method': paymentMethod,
      if (staffId != null) 'staff_id': staffId,
      if (staffName != null) 'staff_name': staffName,
      if (syncId != null) 'sync_id': syncId,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (createdAt != null) 'created_at': createdAt,
      if (deviceId != null) 'device_id': deviceId,
      if (isDeleted != null) 'is_deleted': isDeleted,
      if (totalPrintAmount != null) 'total_print_amount': totalPrintAmount,
    });
  }

  InvoicesCompanion copyWith(
      {Value<int>? id,
      Value<String>? invoiceNumber,
      Value<DateTime>? dateCreated,
      Value<double>? subtotal,
      Value<double>? taxAmount,
      Value<double>? discountAmount,
      Value<double>? totalAmount,
      Value<String>? paymentStatus,
      Value<double>? amountPaid,
      Value<double>? balanceAmount,
      Value<String?>? customerName,
      Value<String?>? customerAddress,
      Value<String?>? paymentMethod,
      Value<int?>? staffId,
      Value<String?>? staffName,
      Value<String?>? syncId,
      Value<DateTime?>? updatedAt,
      Value<DateTime?>? createdAt,
      Value<String?>? deviceId,
      Value<bool>? isDeleted,
      Value<double?>? totalPrintAmount}) {
    return InvoicesCompanion(
      id: id ?? this.id,
      invoiceNumber: invoiceNumber ?? this.invoiceNumber,
      dateCreated: dateCreated ?? this.dateCreated,
      subtotal: subtotal ?? this.subtotal,
      taxAmount: taxAmount ?? this.taxAmount,
      discountAmount: discountAmount ?? this.discountAmount,
      totalAmount: totalAmount ?? this.totalAmount,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      amountPaid: amountPaid ?? this.amountPaid,
      balanceAmount: balanceAmount ?? this.balanceAmount,
      customerName: customerName ?? this.customerName,
      customerAddress: customerAddress ?? this.customerAddress,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      staffId: staffId ?? this.staffId,
      staffName: staffName ?? this.staffName,
      syncId: syncId ?? this.syncId,
      updatedAt: updatedAt ?? this.updatedAt,
      createdAt: createdAt ?? this.createdAt,
      deviceId: deviceId ?? this.deviceId,
      isDeleted: isDeleted ?? this.isDeleted,
      totalPrintAmount: totalPrintAmount ?? this.totalPrintAmount,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (invoiceNumber.present) {
      map['invoice_number'] = Variable<String>(invoiceNumber.value);
    }
    if (dateCreated.present) {
      map['date_created'] = Variable<DateTime>(dateCreated.value);
    }
    if (subtotal.present) {
      map['subtotal'] = Variable<double>(subtotal.value);
    }
    if (taxAmount.present) {
      map['tax_amount'] = Variable<double>(taxAmount.value);
    }
    if (discountAmount.present) {
      map['discount_amount'] = Variable<double>(discountAmount.value);
    }
    if (totalAmount.present) {
      map['total_amount'] = Variable<double>(totalAmount.value);
    }
    if (paymentStatus.present) {
      map['payment_status'] = Variable<String>(paymentStatus.value);
    }
    if (amountPaid.present) {
      map['amount_paid'] = Variable<double>(amountPaid.value);
    }
    if (balanceAmount.present) {
      map['balance_amount'] = Variable<double>(balanceAmount.value);
    }
    if (customerName.present) {
      map['customer_name'] = Variable<String>(customerName.value);
    }
    if (customerAddress.present) {
      map['customer_address'] = Variable<String>(customerAddress.value);
    }
    if (paymentMethod.present) {
      map['payment_method'] = Variable<String>(paymentMethod.value);
    }
    if (staffId.present) {
      map['staff_id'] = Variable<int>(staffId.value);
    }
    if (staffName.present) {
      map['staff_name'] = Variable<String>(staffName.value);
    }
    if (syncId.present) {
      map['sync_id'] = Variable<String>(syncId.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (deviceId.present) {
      map['device_id'] = Variable<String>(deviceId.value);
    }
    if (isDeleted.present) {
      map['is_deleted'] = Variable<bool>(isDeleted.value);
    }
    if (totalPrintAmount.present) {
      map['total_print_amount'] = Variable<double>(totalPrintAmount.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('InvoicesCompanion(')
          ..write('id: $id, ')
          ..write('invoiceNumber: $invoiceNumber, ')
          ..write('dateCreated: $dateCreated, ')
          ..write('subtotal: $subtotal, ')
          ..write('taxAmount: $taxAmount, ')
          ..write('discountAmount: $discountAmount, ')
          ..write('totalAmount: $totalAmount, ')
          ..write('paymentStatus: $paymentStatus, ')
          ..write('amountPaid: $amountPaid, ')
          ..write('balanceAmount: $balanceAmount, ')
          ..write('customerName: $customerName, ')
          ..write('customerAddress: $customerAddress, ')
          ..write('paymentMethod: $paymentMethod, ')
          ..write('staffId: $staffId, ')
          ..write('staffName: $staffName, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted, ')
          ..write('totalPrintAmount: $totalPrintAmount')
          ..write(')'))
        .toString();
  }
}

class $InvoiceItemsTable extends InvoiceItems
    with TableInfo<$InvoiceItemsTable, InvoiceItemTable> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $InvoiceItemsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _invoiceIdMeta =
      const VerificationMeta('invoiceId');
  @override
  late final GeneratedColumn<int> invoiceId = GeneratedColumn<int>(
      'invoice_id', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: true,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('REFERENCES invoices (id)'));
  static const VerificationMeta _itemIdMeta = const VerificationMeta('itemId');
  @override
  late final GeneratedColumn<int> itemId = GeneratedColumn<int>(
      'item_id', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: true,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('REFERENCES items (id)'));
  static const VerificationMeta _quantityMeta =
      const VerificationMeta('quantity');
  @override
  late final GeneratedColumn<int> quantity = GeneratedColumn<int>(
      'quantity', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _unitPriceMeta =
      const VerificationMeta('unitPrice');
  @override
  late final GeneratedColumn<double> unitPrice = GeneratedColumn<double>(
      'unit_price', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _typeMeta = const VerificationMeta('type');
  @override
  late final GeneratedColumn<String> type = GeneratedColumn<String>(
      'type', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('product'));
  static const VerificationMeta _serviceMetaMeta =
      const VerificationMeta('serviceMeta');
  @override
  late final GeneratedColumn<String> serviceMeta = GeneratedColumn<String>(
      'service_meta', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _syncIdMeta = const VerificationMeta('syncId');
  @override
  late final GeneratedColumn<String> syncId = GeneratedColumn<String>(
      'sync_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _deviceIdMeta =
      const VerificationMeta('deviceId');
  @override
  late final GeneratedColumn<String> deviceId = GeneratedColumn<String>(
      'device_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _isDeletedMeta =
      const VerificationMeta('isDeleted');
  @override
  late final GeneratedColumn<bool> isDeleted = GeneratedColumn<bool>(
      'is_deleted', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_deleted" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _printPriceMeta =
      const VerificationMeta('printPrice');
  @override
  late final GeneratedColumn<double> printPrice = GeneratedColumn<double>(
      'print_price', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        invoiceId,
        itemId,
        quantity,
        unitPrice,
        type,
        serviceMeta,
        syncId,
        updatedAt,
        createdAt,
        deviceId,
        isDeleted,
        printPrice
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'invoice_items';
  @override
  VerificationContext validateIntegrity(Insertable<InvoiceItemTable> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('invoice_id')) {
      context.handle(_invoiceIdMeta,
          invoiceId.isAcceptableOrUnknown(data['invoice_id']!, _invoiceIdMeta));
    } else if (isInserting) {
      context.missing(_invoiceIdMeta);
    }
    if (data.containsKey('item_id')) {
      context.handle(_itemIdMeta,
          itemId.isAcceptableOrUnknown(data['item_id']!, _itemIdMeta));
    } else if (isInserting) {
      context.missing(_itemIdMeta);
    }
    if (data.containsKey('quantity')) {
      context.handle(_quantityMeta,
          quantity.isAcceptableOrUnknown(data['quantity']!, _quantityMeta));
    } else if (isInserting) {
      context.missing(_quantityMeta);
    }
    if (data.containsKey('unit_price')) {
      context.handle(_unitPriceMeta,
          unitPrice.isAcceptableOrUnknown(data['unit_price']!, _unitPriceMeta));
    } else if (isInserting) {
      context.missing(_unitPriceMeta);
    }
    if (data.containsKey('type')) {
      context.handle(
          _typeMeta, type.isAcceptableOrUnknown(data['type']!, _typeMeta));
    }
    if (data.containsKey('service_meta')) {
      context.handle(
          _serviceMetaMeta,
          serviceMeta.isAcceptableOrUnknown(
              data['service_meta']!, _serviceMetaMeta));
    }
    if (data.containsKey('sync_id')) {
      context.handle(_syncIdMeta,
          syncId.isAcceptableOrUnknown(data['sync_id']!, _syncIdMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('device_id')) {
      context.handle(_deviceIdMeta,
          deviceId.isAcceptableOrUnknown(data['device_id']!, _deviceIdMeta));
    }
    if (data.containsKey('is_deleted')) {
      context.handle(_isDeletedMeta,
          isDeleted.isAcceptableOrUnknown(data['is_deleted']!, _isDeletedMeta));
    }
    if (data.containsKey('print_price')) {
      context.handle(
          _printPriceMeta,
          printPrice.isAcceptableOrUnknown(
              data['print_price']!, _printPriceMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  InvoiceItemTable map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return InvoiceItemTable(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      invoiceId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}invoice_id'])!,
      itemId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}item_id'])!,
      quantity: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}quantity'])!,
      unitPrice: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}unit_price'])!,
      type: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}type'])!,
      serviceMeta: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}service_meta']),
      syncId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sync_id']),
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at']),
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at']),
      deviceId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}device_id']),
      isDeleted: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_deleted'])!,
      printPrice: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}print_price']),
    );
  }

  @override
  $InvoiceItemsTable createAlias(String alias) {
    return $InvoiceItemsTable(attachedDatabase, alias);
  }
}

class InvoiceItemTable extends DataClass
    implements Insertable<InvoiceItemTable> {
  final int id;
  final int invoiceId;
  final int itemId;
  final int quantity;
  final double unitPrice;
  final String type;
  final String? serviceMeta;
  final String? syncId;
  final DateTime? updatedAt;
  final DateTime? createdAt;
  final String? deviceId;
  final bool isDeleted;
  final double? printPrice;
  const InvoiceItemTable(
      {required this.id,
      required this.invoiceId,
      required this.itemId,
      required this.quantity,
      required this.unitPrice,
      required this.type,
      this.serviceMeta,
      this.syncId,
      this.updatedAt,
      this.createdAt,
      this.deviceId,
      required this.isDeleted,
      this.printPrice});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['invoice_id'] = Variable<int>(invoiceId);
    map['item_id'] = Variable<int>(itemId);
    map['quantity'] = Variable<int>(quantity);
    map['unit_price'] = Variable<double>(unitPrice);
    map['type'] = Variable<String>(type);
    if (!nullToAbsent || serviceMeta != null) {
      map['service_meta'] = Variable<String>(serviceMeta);
    }
    if (!nullToAbsent || syncId != null) {
      map['sync_id'] = Variable<String>(syncId);
    }
    if (!nullToAbsent || updatedAt != null) {
      map['updated_at'] = Variable<DateTime>(updatedAt);
    }
    if (!nullToAbsent || createdAt != null) {
      map['created_at'] = Variable<DateTime>(createdAt);
    }
    if (!nullToAbsent || deviceId != null) {
      map['device_id'] = Variable<String>(deviceId);
    }
    map['is_deleted'] = Variable<bool>(isDeleted);
    if (!nullToAbsent || printPrice != null) {
      map['print_price'] = Variable<double>(printPrice);
    }
    return map;
  }

  InvoiceItemsCompanion toCompanion(bool nullToAbsent) {
    return InvoiceItemsCompanion(
      id: Value(id),
      invoiceId: Value(invoiceId),
      itemId: Value(itemId),
      quantity: Value(quantity),
      unitPrice: Value(unitPrice),
      type: Value(type),
      serviceMeta: serviceMeta == null && nullToAbsent
          ? const Value.absent()
          : Value(serviceMeta),
      syncId:
          syncId == null && nullToAbsent ? const Value.absent() : Value(syncId),
      updatedAt: updatedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(updatedAt),
      createdAt: createdAt == null && nullToAbsent
          ? const Value.absent()
          : Value(createdAt),
      deviceId: deviceId == null && nullToAbsent
          ? const Value.absent()
          : Value(deviceId),
      isDeleted: Value(isDeleted),
      printPrice: printPrice == null && nullToAbsent
          ? const Value.absent()
          : Value(printPrice),
    );
  }

  factory InvoiceItemTable.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return InvoiceItemTable(
      id: serializer.fromJson<int>(json['id']),
      invoiceId: serializer.fromJson<int>(json['invoiceId']),
      itemId: serializer.fromJson<int>(json['itemId']),
      quantity: serializer.fromJson<int>(json['quantity']),
      unitPrice: serializer.fromJson<double>(json['unitPrice']),
      type: serializer.fromJson<String>(json['type']),
      serviceMeta: serializer.fromJson<String?>(json['serviceMeta']),
      syncId: serializer.fromJson<String?>(json['syncId']),
      updatedAt: serializer.fromJson<DateTime?>(json['updatedAt']),
      createdAt: serializer.fromJson<DateTime?>(json['createdAt']),
      deviceId: serializer.fromJson<String?>(json['deviceId']),
      isDeleted: serializer.fromJson<bool>(json['isDeleted']),
      printPrice: serializer.fromJson<double?>(json['printPrice']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'invoiceId': serializer.toJson<int>(invoiceId),
      'itemId': serializer.toJson<int>(itemId),
      'quantity': serializer.toJson<int>(quantity),
      'unitPrice': serializer.toJson<double>(unitPrice),
      'type': serializer.toJson<String>(type),
      'serviceMeta': serializer.toJson<String?>(serviceMeta),
      'syncId': serializer.toJson<String?>(syncId),
      'updatedAt': serializer.toJson<DateTime?>(updatedAt),
      'createdAt': serializer.toJson<DateTime?>(createdAt),
      'deviceId': serializer.toJson<String?>(deviceId),
      'isDeleted': serializer.toJson<bool>(isDeleted),
      'printPrice': serializer.toJson<double?>(printPrice),
    };
  }

  InvoiceItemTable copyWith(
          {int? id,
          int? invoiceId,
          int? itemId,
          int? quantity,
          double? unitPrice,
          String? type,
          Value<String?> serviceMeta = const Value.absent(),
          Value<String?> syncId = const Value.absent(),
          Value<DateTime?> updatedAt = const Value.absent(),
          Value<DateTime?> createdAt = const Value.absent(),
          Value<String?> deviceId = const Value.absent(),
          bool? isDeleted,
          Value<double?> printPrice = const Value.absent()}) =>
      InvoiceItemTable(
        id: id ?? this.id,
        invoiceId: invoiceId ?? this.invoiceId,
        itemId: itemId ?? this.itemId,
        quantity: quantity ?? this.quantity,
        unitPrice: unitPrice ?? this.unitPrice,
        type: type ?? this.type,
        serviceMeta: serviceMeta.present ? serviceMeta.value : this.serviceMeta,
        syncId: syncId.present ? syncId.value : this.syncId,
        updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
        createdAt: createdAt.present ? createdAt.value : this.createdAt,
        deviceId: deviceId.present ? deviceId.value : this.deviceId,
        isDeleted: isDeleted ?? this.isDeleted,
        printPrice: printPrice.present ? printPrice.value : this.printPrice,
      );
  InvoiceItemTable copyWithCompanion(InvoiceItemsCompanion data) {
    return InvoiceItemTable(
      id: data.id.present ? data.id.value : this.id,
      invoiceId: data.invoiceId.present ? data.invoiceId.value : this.invoiceId,
      itemId: data.itemId.present ? data.itemId.value : this.itemId,
      quantity: data.quantity.present ? data.quantity.value : this.quantity,
      unitPrice: data.unitPrice.present ? data.unitPrice.value : this.unitPrice,
      type: data.type.present ? data.type.value : this.type,
      serviceMeta:
          data.serviceMeta.present ? data.serviceMeta.value : this.serviceMeta,
      syncId: data.syncId.present ? data.syncId.value : this.syncId,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      deviceId: data.deviceId.present ? data.deviceId.value : this.deviceId,
      isDeleted: data.isDeleted.present ? data.isDeleted.value : this.isDeleted,
      printPrice:
          data.printPrice.present ? data.printPrice.value : this.printPrice,
    );
  }

  @override
  String toString() {
    return (StringBuffer('InvoiceItemTable(')
          ..write('id: $id, ')
          ..write('invoiceId: $invoiceId, ')
          ..write('itemId: $itemId, ')
          ..write('quantity: $quantity, ')
          ..write('unitPrice: $unitPrice, ')
          ..write('type: $type, ')
          ..write('serviceMeta: $serviceMeta, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted, ')
          ..write('printPrice: $printPrice')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      invoiceId,
      itemId,
      quantity,
      unitPrice,
      type,
      serviceMeta,
      syncId,
      updatedAt,
      createdAt,
      deviceId,
      isDeleted,
      printPrice);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is InvoiceItemTable &&
          other.id == this.id &&
          other.invoiceId == this.invoiceId &&
          other.itemId == this.itemId &&
          other.quantity == this.quantity &&
          other.unitPrice == this.unitPrice &&
          other.type == this.type &&
          other.serviceMeta == this.serviceMeta &&
          other.syncId == this.syncId &&
          other.updatedAt == this.updatedAt &&
          other.createdAt == this.createdAt &&
          other.deviceId == this.deviceId &&
          other.isDeleted == this.isDeleted &&
          other.printPrice == this.printPrice);
}

class InvoiceItemsCompanion extends UpdateCompanion<InvoiceItemTable> {
  final Value<int> id;
  final Value<int> invoiceId;
  final Value<int> itemId;
  final Value<int> quantity;
  final Value<double> unitPrice;
  final Value<String> type;
  final Value<String?> serviceMeta;
  final Value<String?> syncId;
  final Value<DateTime?> updatedAt;
  final Value<DateTime?> createdAt;
  final Value<String?> deviceId;
  final Value<bool> isDeleted;
  final Value<double?> printPrice;
  const InvoiceItemsCompanion({
    this.id = const Value.absent(),
    this.invoiceId = const Value.absent(),
    this.itemId = const Value.absent(),
    this.quantity = const Value.absent(),
    this.unitPrice = const Value.absent(),
    this.type = const Value.absent(),
    this.serviceMeta = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
    this.printPrice = const Value.absent(),
  });
  InvoiceItemsCompanion.insert({
    this.id = const Value.absent(),
    required int invoiceId,
    required int itemId,
    required int quantity,
    required double unitPrice,
    this.type = const Value.absent(),
    this.serviceMeta = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
    this.printPrice = const Value.absent(),
  })  : invoiceId = Value(invoiceId),
        itemId = Value(itemId),
        quantity = Value(quantity),
        unitPrice = Value(unitPrice);
  static Insertable<InvoiceItemTable> custom({
    Expression<int>? id,
    Expression<int>? invoiceId,
    Expression<int>? itemId,
    Expression<int>? quantity,
    Expression<double>? unitPrice,
    Expression<String>? type,
    Expression<String>? serviceMeta,
    Expression<String>? syncId,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? createdAt,
    Expression<String>? deviceId,
    Expression<bool>? isDeleted,
    Expression<double>? printPrice,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (invoiceId != null) 'invoice_id': invoiceId,
      if (itemId != null) 'item_id': itemId,
      if (quantity != null) 'quantity': quantity,
      if (unitPrice != null) 'unit_price': unitPrice,
      if (type != null) 'type': type,
      if (serviceMeta != null) 'service_meta': serviceMeta,
      if (syncId != null) 'sync_id': syncId,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (createdAt != null) 'created_at': createdAt,
      if (deviceId != null) 'device_id': deviceId,
      if (isDeleted != null) 'is_deleted': isDeleted,
      if (printPrice != null) 'print_price': printPrice,
    });
  }

  InvoiceItemsCompanion copyWith(
      {Value<int>? id,
      Value<int>? invoiceId,
      Value<int>? itemId,
      Value<int>? quantity,
      Value<double>? unitPrice,
      Value<String>? type,
      Value<String?>? serviceMeta,
      Value<String?>? syncId,
      Value<DateTime?>? updatedAt,
      Value<DateTime?>? createdAt,
      Value<String?>? deviceId,
      Value<bool>? isDeleted,
      Value<double?>? printPrice}) {
    return InvoiceItemsCompanion(
      id: id ?? this.id,
      invoiceId: invoiceId ?? this.invoiceId,
      itemId: itemId ?? this.itemId,
      quantity: quantity ?? this.quantity,
      unitPrice: unitPrice ?? this.unitPrice,
      type: type ?? this.type,
      serviceMeta: serviceMeta ?? this.serviceMeta,
      syncId: syncId ?? this.syncId,
      updatedAt: updatedAt ?? this.updatedAt,
      createdAt: createdAt ?? this.createdAt,
      deviceId: deviceId ?? this.deviceId,
      isDeleted: isDeleted ?? this.isDeleted,
      printPrice: printPrice ?? this.printPrice,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (invoiceId.present) {
      map['invoice_id'] = Variable<int>(invoiceId.value);
    }
    if (itemId.present) {
      map['item_id'] = Variable<int>(itemId.value);
    }
    if (quantity.present) {
      map['quantity'] = Variable<int>(quantity.value);
    }
    if (unitPrice.present) {
      map['unit_price'] = Variable<double>(unitPrice.value);
    }
    if (type.present) {
      map['type'] = Variable<String>(type.value);
    }
    if (serviceMeta.present) {
      map['service_meta'] = Variable<String>(serviceMeta.value);
    }
    if (syncId.present) {
      map['sync_id'] = Variable<String>(syncId.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (deviceId.present) {
      map['device_id'] = Variable<String>(deviceId.value);
    }
    if (isDeleted.present) {
      map['is_deleted'] = Variable<bool>(isDeleted.value);
    }
    if (printPrice.present) {
      map['print_price'] = Variable<double>(printPrice.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('InvoiceItemsCompanion(')
          ..write('id: $id, ')
          ..write('invoiceId: $invoiceId, ')
          ..write('itemId: $itemId, ')
          ..write('quantity: $quantity, ')
          ..write('unitPrice: $unitPrice, ')
          ..write('type: $type, ')
          ..write('serviceMeta: $serviceMeta, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted, ')
          ..write('printPrice: $printPrice')
          ..write(')'))
        .toString();
  }
}

class $SettingsTable extends Settings
    with TableInfo<$SettingsTable, SettingsTable> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SettingsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _organizationNameMeta =
      const VerificationMeta('organizationName');
  @override
  late final GeneratedColumn<String> organizationName = GeneratedColumn<String>(
      'organization_name', aliasedName, false,
      additionalChecks:
          GeneratedColumn.checkTextLength(minTextLength: 1, maxTextLength: 100),
      type: DriftSqlType.string,
      requiredDuringInsert: true);
  static const VerificationMeta _addressMeta =
      const VerificationMeta('address');
  @override
  late final GeneratedColumn<String> address = GeneratedColumn<String>(
      'address', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _phoneMeta = const VerificationMeta('phone');
  @override
  late final GeneratedColumn<String> phone = GeneratedColumn<String>(
      'phone', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _businessDescriptionMeta =
      const VerificationMeta('businessDescription');
  @override
  late final GeneratedColumn<String> businessDescription =
      GeneratedColumn<String>('business_description', aliasedName, true,
          type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _taxIdMeta = const VerificationMeta('taxId');
  @override
  late final GeneratedColumn<String> taxId = GeneratedColumn<String>(
      'tax_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _logoPathMeta =
      const VerificationMeta('logoPath');
  @override
  late final GeneratedColumn<String> logoPath = GeneratedColumn<String>(
      'logo_path', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _logoMeta = const VerificationMeta('logo');
  @override
  late final GeneratedColumn<Uint8List> logo = GeneratedColumn<Uint8List>(
      'logo', aliasedName, true,
      type: DriftSqlType.blob, requiredDuringInsert: false);
  static const VerificationMeta _themeModeMeta =
      const VerificationMeta('themeMode');
  @override
  late final GeneratedColumn<String> themeMode = GeneratedColumn<String>(
      'theme_mode', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('system'));
  static const VerificationMeta _currencyMeta =
      const VerificationMeta('currency');
  @override
  late final GeneratedColumn<String> currency = GeneratedColumn<String>(
      'currency', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('NGN'));
  static const VerificationMeta _taxEnabledMeta =
      const VerificationMeta('taxEnabled');
  @override
  late final GeneratedColumn<bool> taxEnabled = GeneratedColumn<bool>(
      'tax_enabled', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("tax_enabled" IN (0, 1))'),
      defaultValue: const Constant(true));
  static const VerificationMeta _discountEnabledMeta =
      const VerificationMeta('discountEnabled');
  @override
  late final GeneratedColumn<bool> discountEnabled = GeneratedColumn<bool>(
      'discount_enabled', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("discount_enabled" IN (0, 1))'),
      defaultValue: const Constant(true));
  static const VerificationMeta _defaultInvoiceTemplateMeta =
      const VerificationMeta('defaultInvoiceTemplate');
  @override
  late final GeneratedColumn<String> defaultInvoiceTemplate =
      GeneratedColumn<String>('default_invoice_template', aliasedName, false,
          type: DriftSqlType.string,
          requiredDuringInsert: false,
          defaultValue: const Constant('compact'));
  static const VerificationMeta _confirmPriceOnSelectionMeta =
      const VerificationMeta('confirmPriceOnSelection');
  @override
  late final GeneratedColumn<bool> confirmPriceOnSelection =
      GeneratedColumn<bool>('confirm_price_on_selection', aliasedName, false,
          type: DriftSqlType.bool,
          requiredDuringInsert: false,
          defaultConstraints: GeneratedColumn.constraintIsAlways(
              'CHECK ("confirm_price_on_selection" IN (0, 1))'),
          defaultValue: const Constant(false));
  static const VerificationMeta _taxRateMeta =
      const VerificationMeta('taxRate');
  @override
  late final GeneratedColumn<double> taxRate = GeneratedColumn<double>(
      'tax_rate', aliasedName, false,
      type: DriftSqlType.double,
      requiredDuringInsert: false,
      defaultValue: const Constant(0.15));
  static const VerificationMeta _bankNameMeta =
      const VerificationMeta('bankName');
  @override
  late final GeneratedColumn<String> bankName = GeneratedColumn<String>(
      'bank_name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _accountNumberMeta =
      const VerificationMeta('accountNumber');
  @override
  late final GeneratedColumn<String> accountNumber = GeneratedColumn<String>(
      'account_number', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _accountNameMeta =
      const VerificationMeta('accountName');
  @override
  late final GeneratedColumn<String> accountName = GeneratedColumn<String>(
      'account_name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _showAccountDetailsMeta =
      const VerificationMeta('showAccountDetails');
  @override
  late final GeneratedColumn<bool> showAccountDetails = GeneratedColumn<bool>(
      'show_account_details', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("show_account_details" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _receiptFooterMeta =
      const VerificationMeta('receiptFooter');
  @override
  late final GeneratedColumn<String> receiptFooter = GeneratedColumn<String>(
      'receipt_footer', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('Thank you!'));
  static const VerificationMeta _showSignatureSpaceMeta =
      const VerificationMeta('showSignatureSpace');
  @override
  late final GeneratedColumn<bool> showSignatureSpace = GeneratedColumn<bool>(
      'show_signature_space', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("show_signature_space" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _paymentMethodsEnabledMeta =
      const VerificationMeta('paymentMethodsEnabled');
  @override
  late final GeneratedColumn<bool> paymentMethodsEnabled =
      GeneratedColumn<bool>('payment_methods_enabled', aliasedName, false,
          type: DriftSqlType.bool,
          requiredDuringInsert: false,
          defaultConstraints: GeneratedColumn.constraintIsAlways(
              'CHECK ("payment_methods_enabled" IN (0, 1))'),
          defaultValue: const Constant(false));
  static const VerificationMeta _primaryColorMeta =
      const VerificationMeta('primaryColor');
  @override
  late final GeneratedColumn<int> primaryColor = GeneratedColumn<int>(
      'primary_color', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0xFF2196F3));
  static const VerificationMeta _failedAttemptsMeta =
      const VerificationMeta('failedAttempts');
  @override
  late final GeneratedColumn<int> failedAttempts = GeneratedColumn<int>(
      'failed_attempts', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _isLockedMeta =
      const VerificationMeta('isLocked');
  @override
  late final GeneratedColumn<bool> isLocked = GeneratedColumn<bool>(
      'is_locked', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_locked" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _lockedAtMeta =
      const VerificationMeta('lockedAt');
  @override
  late final GeneratedColumn<DateTime> lockedAt = GeneratedColumn<DateTime>(
      'locked_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _showDateTimeMeta =
      const VerificationMeta('showDateTime');
  @override
  late final GeneratedColumn<bool> showDateTime = GeneratedColumn<bool>(
      'show_date_time', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("show_date_time" IN (0, 1))'),
      defaultValue: const Constant(true));
  static const VerificationMeta _serviceBillingEnabledMeta =
      const VerificationMeta('serviceBillingEnabled');
  @override
  late final GeneratedColumn<bool> serviceBillingEnabled =
      GeneratedColumn<bool>('service_billing_enabled', aliasedName, false,
          type: DriftSqlType.bool,
          requiredDuringInsert: false,
          defaultConstraints: GeneratedColumn.constraintIsAlways(
              'CHECK ("service_billing_enabled" IN (0, 1))'),
          defaultValue: const Constant(false));
  static const VerificationMeta _serviceTypesMeta =
      const VerificationMeta('serviceTypes');
  @override
  late final GeneratedColumn<String> serviceTypes = GeneratedColumn<String>(
      'service_types', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _staffManagementEnabledMeta =
      const VerificationMeta('staffManagementEnabled');
  @override
  late final GeneratedColumn<bool> staffManagementEnabled =
      GeneratedColumn<bool>('staff_management_enabled', aliasedName, false,
          type: DriftSqlType.bool,
          requiredDuringInsert: false,
          defaultConstraints: GeneratedColumn.constraintIsAlways(
              'CHECK ("staff_management_enabled" IN (0, 1))'),
          defaultValue: const Constant(false));
  static const VerificationMeta _paperWidthMeta =
      const VerificationMeta('paperWidth');
  @override
  late final GeneratedColumn<int> paperWidth = GeneratedColumn<int>(
      'paper_width', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(80));
  static const VerificationMeta _halfDayStartHourMeta =
      const VerificationMeta('halfDayStartHour');
  @override
  late final GeneratedColumn<int> halfDayStartHour = GeneratedColumn<int>(
      'half_day_start_hour', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(6));
  static const VerificationMeta _halfDayEndHourMeta =
      const VerificationMeta('halfDayEndHour');
  @override
  late final GeneratedColumn<int> halfDayEndHour = GeneratedColumn<int>(
      'half_day_end_hour', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(18));
  static const VerificationMeta _showSyncStatusMeta =
      const VerificationMeta('showSyncStatus');
  @override
  late final GeneratedColumn<bool> showSyncStatus = GeneratedColumn<bool>(
      'show_sync_status', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("show_sync_status" IN (0, 1))'),
      defaultValue: const Constant(true));
  static const VerificationMeta _customReceiptPricingEnabledMeta =
      const VerificationMeta('customReceiptPricingEnabled');
  @override
  late final GeneratedColumn<bool> customReceiptPricingEnabled =
      GeneratedColumn<bool>(
          'custom_receipt_pricing_enabled', aliasedName, false,
          type: DriftSqlType.bool,
          requiredDuringInsert: false,
          defaultConstraints: GeneratedColumn.constraintIsAlways(
              'CHECK ("custom_receipt_pricing_enabled" IN (0, 1))'),
          defaultValue: const Constant(false));
  static const VerificationMeta _showLogoMeta =
      const VerificationMeta('showLogo');
  @override
  late final GeneratedColumn<bool> showLogo = GeneratedColumn<bool>(
      'show_logo', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("show_logo" IN (0, 1))'),
      defaultValue: const Constant(true));
  static const VerificationMeta _cacNumberMeta =
      const VerificationMeta('cacNumber');
  @override
  late final GeneratedColumn<String> cacNumber = GeneratedColumn<String>(
      'cac_number', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _showCacNumberMeta =
      const VerificationMeta('showCacNumber');
  @override
  late final GeneratedColumn<bool> showCacNumber = GeneratedColumn<bool>(
      'show_cac_number', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("show_cac_number" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _showTotalSalesCardMeta =
      const VerificationMeta('showTotalSalesCard');
  @override
  late final GeneratedColumn<bool> showTotalSalesCard = GeneratedColumn<bool>(
      'show_total_sales_card', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("show_total_sales_card" IN (0, 1))'),
      defaultValue: const Constant(true));
  @override
  List<GeneratedColumn> get $columns => [
        id,
        organizationName,
        address,
        phone,
        businessDescription,
        taxId,
        logoPath,
        logo,
        themeMode,
        currency,
        taxEnabled,
        discountEnabled,
        defaultInvoiceTemplate,
        confirmPriceOnSelection,
        taxRate,
        bankName,
        accountNumber,
        accountName,
        showAccountDetails,
        receiptFooter,
        showSignatureSpace,
        paymentMethodsEnabled,
        primaryColor,
        failedAttempts,
        isLocked,
        lockedAt,
        showDateTime,
        serviceBillingEnabled,
        serviceTypes,
        staffManagementEnabled,
        paperWidth,
        halfDayStartHour,
        halfDayEndHour,
        showSyncStatus,
        customReceiptPricingEnabled,
        showLogo,
        cacNumber,
        showCacNumber,
        showTotalSalesCard
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'settings';
  @override
  VerificationContext validateIntegrity(Insertable<SettingsTable> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('organization_name')) {
      context.handle(
          _organizationNameMeta,
          organizationName.isAcceptableOrUnknown(
              data['organization_name']!, _organizationNameMeta));
    } else if (isInserting) {
      context.missing(_organizationNameMeta);
    }
    if (data.containsKey('address')) {
      context.handle(_addressMeta,
          address.isAcceptableOrUnknown(data['address']!, _addressMeta));
    } else if (isInserting) {
      context.missing(_addressMeta);
    }
    if (data.containsKey('phone')) {
      context.handle(
          _phoneMeta, phone.isAcceptableOrUnknown(data['phone']!, _phoneMeta));
    } else if (isInserting) {
      context.missing(_phoneMeta);
    }
    if (data.containsKey('business_description')) {
      context.handle(
          _businessDescriptionMeta,
          businessDescription.isAcceptableOrUnknown(
              data['business_description']!, _businessDescriptionMeta));
    }
    if (data.containsKey('tax_id')) {
      context.handle(
          _taxIdMeta, taxId.isAcceptableOrUnknown(data['tax_id']!, _taxIdMeta));
    }
    if (data.containsKey('logo_path')) {
      context.handle(_logoPathMeta,
          logoPath.isAcceptableOrUnknown(data['logo_path']!, _logoPathMeta));
    }
    if (data.containsKey('logo')) {
      context.handle(
          _logoMeta, logo.isAcceptableOrUnknown(data['logo']!, _logoMeta));
    }
    if (data.containsKey('theme_mode')) {
      context.handle(_themeModeMeta,
          themeMode.isAcceptableOrUnknown(data['theme_mode']!, _themeModeMeta));
    }
    if (data.containsKey('currency')) {
      context.handle(_currencyMeta,
          currency.isAcceptableOrUnknown(data['currency']!, _currencyMeta));
    }
    if (data.containsKey('tax_enabled')) {
      context.handle(
          _taxEnabledMeta,
          taxEnabled.isAcceptableOrUnknown(
              data['tax_enabled']!, _taxEnabledMeta));
    }
    if (data.containsKey('discount_enabled')) {
      context.handle(
          _discountEnabledMeta,
          discountEnabled.isAcceptableOrUnknown(
              data['discount_enabled']!, _discountEnabledMeta));
    }
    if (data.containsKey('default_invoice_template')) {
      context.handle(
          _defaultInvoiceTemplateMeta,
          defaultInvoiceTemplate.isAcceptableOrUnknown(
              data['default_invoice_template']!, _defaultInvoiceTemplateMeta));
    }
    if (data.containsKey('confirm_price_on_selection')) {
      context.handle(
          _confirmPriceOnSelectionMeta,
          confirmPriceOnSelection.isAcceptableOrUnknown(
              data['confirm_price_on_selection']!,
              _confirmPriceOnSelectionMeta));
    }
    if (data.containsKey('tax_rate')) {
      context.handle(_taxRateMeta,
          taxRate.isAcceptableOrUnknown(data['tax_rate']!, _taxRateMeta));
    }
    if (data.containsKey('bank_name')) {
      context.handle(_bankNameMeta,
          bankName.isAcceptableOrUnknown(data['bank_name']!, _bankNameMeta));
    }
    if (data.containsKey('account_number')) {
      context.handle(
          _accountNumberMeta,
          accountNumber.isAcceptableOrUnknown(
              data['account_number']!, _accountNumberMeta));
    }
    if (data.containsKey('account_name')) {
      context.handle(
          _accountNameMeta,
          accountName.isAcceptableOrUnknown(
              data['account_name']!, _accountNameMeta));
    }
    if (data.containsKey('show_account_details')) {
      context.handle(
          _showAccountDetailsMeta,
          showAccountDetails.isAcceptableOrUnknown(
              data['show_account_details']!, _showAccountDetailsMeta));
    }
    if (data.containsKey('receipt_footer')) {
      context.handle(
          _receiptFooterMeta,
          receiptFooter.isAcceptableOrUnknown(
              data['receipt_footer']!, _receiptFooterMeta));
    }
    if (data.containsKey('show_signature_space')) {
      context.handle(
          _showSignatureSpaceMeta,
          showSignatureSpace.isAcceptableOrUnknown(
              data['show_signature_space']!, _showSignatureSpaceMeta));
    }
    if (data.containsKey('payment_methods_enabled')) {
      context.handle(
          _paymentMethodsEnabledMeta,
          paymentMethodsEnabled.isAcceptableOrUnknown(
              data['payment_methods_enabled']!, _paymentMethodsEnabledMeta));
    }
    if (data.containsKey('primary_color')) {
      context.handle(
          _primaryColorMeta,
          primaryColor.isAcceptableOrUnknown(
              data['primary_color']!, _primaryColorMeta));
    }
    if (data.containsKey('failed_attempts')) {
      context.handle(
          _failedAttemptsMeta,
          failedAttempts.isAcceptableOrUnknown(
              data['failed_attempts']!, _failedAttemptsMeta));
    }
    if (data.containsKey('is_locked')) {
      context.handle(_isLockedMeta,
          isLocked.isAcceptableOrUnknown(data['is_locked']!, _isLockedMeta));
    }
    if (data.containsKey('locked_at')) {
      context.handle(_lockedAtMeta,
          lockedAt.isAcceptableOrUnknown(data['locked_at']!, _lockedAtMeta));
    }
    if (data.containsKey('show_date_time')) {
      context.handle(
          _showDateTimeMeta,
          showDateTime.isAcceptableOrUnknown(
              data['show_date_time']!, _showDateTimeMeta));
    }
    if (data.containsKey('service_billing_enabled')) {
      context.handle(
          _serviceBillingEnabledMeta,
          serviceBillingEnabled.isAcceptableOrUnknown(
              data['service_billing_enabled']!, _serviceBillingEnabledMeta));
    }
    if (data.containsKey('service_types')) {
      context.handle(
          _serviceTypesMeta,
          serviceTypes.isAcceptableOrUnknown(
              data['service_types']!, _serviceTypesMeta));
    }
    if (data.containsKey('staff_management_enabled')) {
      context.handle(
          _staffManagementEnabledMeta,
          staffManagementEnabled.isAcceptableOrUnknown(
              data['staff_management_enabled']!, _staffManagementEnabledMeta));
    }
    if (data.containsKey('paper_width')) {
      context.handle(
          _paperWidthMeta,
          paperWidth.isAcceptableOrUnknown(
              data['paper_width']!, _paperWidthMeta));
    }
    if (data.containsKey('half_day_start_hour')) {
      context.handle(
          _halfDayStartHourMeta,
          halfDayStartHour.isAcceptableOrUnknown(
              data['half_day_start_hour']!, _halfDayStartHourMeta));
    }
    if (data.containsKey('half_day_end_hour')) {
      context.handle(
          _halfDayEndHourMeta,
          halfDayEndHour.isAcceptableOrUnknown(
              data['half_day_end_hour']!, _halfDayEndHourMeta));
    }
    if (data.containsKey('show_sync_status')) {
      context.handle(
          _showSyncStatusMeta,
          showSyncStatus.isAcceptableOrUnknown(
              data['show_sync_status']!, _showSyncStatusMeta));
    }
    if (data.containsKey('custom_receipt_pricing_enabled')) {
      context.handle(
          _customReceiptPricingEnabledMeta,
          customReceiptPricingEnabled.isAcceptableOrUnknown(
              data['custom_receipt_pricing_enabled']!,
              _customReceiptPricingEnabledMeta));
    }
    if (data.containsKey('show_logo')) {
      context.handle(_showLogoMeta,
          showLogo.isAcceptableOrUnknown(data['show_logo']!, _showLogoMeta));
    }
    if (data.containsKey('cac_number')) {
      context.handle(_cacNumberMeta,
          cacNumber.isAcceptableOrUnknown(data['cac_number']!, _cacNumberMeta));
    }
    if (data.containsKey('show_cac_number')) {
      context.handle(
          _showCacNumberMeta,
          showCacNumber.isAcceptableOrUnknown(
              data['show_cac_number']!, _showCacNumberMeta));
    }
    if (data.containsKey('show_total_sales_card')) {
      context.handle(
          _showTotalSalesCardMeta,
          showTotalSalesCard.isAcceptableOrUnknown(
              data['show_total_sales_card']!, _showTotalSalesCardMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  SettingsTable map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return SettingsTable(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      organizationName: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}organization_name'])!,
      address: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}address'])!,
      phone: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}phone'])!,
      businessDescription: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}business_description']),
      taxId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}tax_id']),
      logoPath: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}logo_path']),
      logo: attachedDatabase.typeMapping
          .read(DriftSqlType.blob, data['${effectivePrefix}logo']),
      themeMode: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}theme_mode'])!,
      currency: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}currency'])!,
      taxEnabled: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}tax_enabled'])!,
      discountEnabled: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}discount_enabled'])!,
      defaultInvoiceTemplate: attachedDatabase.typeMapping.read(
          DriftSqlType.string,
          data['${effectivePrefix}default_invoice_template'])!,
      confirmPriceOnSelection: attachedDatabase.typeMapping.read(
          DriftSqlType.bool,
          data['${effectivePrefix}confirm_price_on_selection'])!,
      taxRate: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}tax_rate'])!,
      bankName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}bank_name']),
      accountNumber: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}account_number']),
      accountName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}account_name']),
      showAccountDetails: attachedDatabase.typeMapping.read(
          DriftSqlType.bool, data['${effectivePrefix}show_account_details'])!,
      receiptFooter: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}receipt_footer'])!,
      showSignatureSpace: attachedDatabase.typeMapping.read(
          DriftSqlType.bool, data['${effectivePrefix}show_signature_space'])!,
      paymentMethodsEnabled: attachedDatabase.typeMapping.read(
          DriftSqlType.bool,
          data['${effectivePrefix}payment_methods_enabled'])!,
      primaryColor: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}primary_color'])!,
      failedAttempts: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}failed_attempts'])!,
      isLocked: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_locked'])!,
      lockedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}locked_at']),
      showDateTime: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}show_date_time'])!,
      serviceBillingEnabled: attachedDatabase.typeMapping.read(
          DriftSqlType.bool,
          data['${effectivePrefix}service_billing_enabled'])!,
      serviceTypes: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}service_types']),
      staffManagementEnabled: attachedDatabase.typeMapping.read(
          DriftSqlType.bool,
          data['${effectivePrefix}staff_management_enabled'])!,
      paperWidth: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}paper_width'])!,
      halfDayStartHour: attachedDatabase.typeMapping.read(
          DriftSqlType.int, data['${effectivePrefix}half_day_start_hour'])!,
      halfDayEndHour: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}half_day_end_hour'])!,
      showSyncStatus: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}show_sync_status'])!,
      customReceiptPricingEnabled: attachedDatabase.typeMapping.read(
          DriftSqlType.bool,
          data['${effectivePrefix}custom_receipt_pricing_enabled'])!,
      showLogo: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}show_logo'])!,
      cacNumber: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}cac_number']),
      showCacNumber: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}show_cac_number'])!,
      showTotalSalesCard: attachedDatabase.typeMapping.read(
          DriftSqlType.bool, data['${effectivePrefix}show_total_sales_card'])!,
    );
  }

  @override
  $SettingsTable createAlias(String alias) {
    return $SettingsTable(attachedDatabase, alias);
  }
}

class SettingsTable extends DataClass implements Insertable<SettingsTable> {
  final int id;
  final String organizationName;
  final String address;
  final String phone;
  final String? businessDescription;
  final String? taxId;
  final String? logoPath;
  final Uint8List? logo;
  final String themeMode;
  final String currency;
  final bool taxEnabled;
  final bool discountEnabled;
  final String defaultInvoiceTemplate;
  final bool confirmPriceOnSelection;
  final double taxRate;
  final String? bankName;
  final String? accountNumber;
  final String? accountName;
  final bool showAccountDetails;
  final String receiptFooter;
  final bool showSignatureSpace;
  final bool paymentMethodsEnabled;
  final int primaryColor;
  final int failedAttempts;
  final bool isLocked;
  final DateTime? lockedAt;
  final bool showDateTime;
  final bool serviceBillingEnabled;
  final String? serviceTypes;
  final bool staffManagementEnabled;
  final int paperWidth;
  final int halfDayStartHour;
  final int halfDayEndHour;
  final bool showSyncStatus;
  final bool customReceiptPricingEnabled;
  final bool showLogo;
  final String? cacNumber;
  final bool showCacNumber;
  final bool showTotalSalesCard;
  const SettingsTable(
      {required this.id,
      required this.organizationName,
      required this.address,
      required this.phone,
      this.businessDescription,
      this.taxId,
      this.logoPath,
      this.logo,
      required this.themeMode,
      required this.currency,
      required this.taxEnabled,
      required this.discountEnabled,
      required this.defaultInvoiceTemplate,
      required this.confirmPriceOnSelection,
      required this.taxRate,
      this.bankName,
      this.accountNumber,
      this.accountName,
      required this.showAccountDetails,
      required this.receiptFooter,
      required this.showSignatureSpace,
      required this.paymentMethodsEnabled,
      required this.primaryColor,
      required this.failedAttempts,
      required this.isLocked,
      this.lockedAt,
      required this.showDateTime,
      required this.serviceBillingEnabled,
      this.serviceTypes,
      required this.staffManagementEnabled,
      required this.paperWidth,
      required this.halfDayStartHour,
      required this.halfDayEndHour,
      required this.showSyncStatus,
      required this.customReceiptPricingEnabled,
      required this.showLogo,
      this.cacNumber,
      required this.showCacNumber,
      required this.showTotalSalesCard});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['organization_name'] = Variable<String>(organizationName);
    map['address'] = Variable<String>(address);
    map['phone'] = Variable<String>(phone);
    if (!nullToAbsent || businessDescription != null) {
      map['business_description'] = Variable<String>(businessDescription);
    }
    if (!nullToAbsent || taxId != null) {
      map['tax_id'] = Variable<String>(taxId);
    }
    if (!nullToAbsent || logoPath != null) {
      map['logo_path'] = Variable<String>(logoPath);
    }
    if (!nullToAbsent || logo != null) {
      map['logo'] = Variable<Uint8List>(logo);
    }
    map['theme_mode'] = Variable<String>(themeMode);
    map['currency'] = Variable<String>(currency);
    map['tax_enabled'] = Variable<bool>(taxEnabled);
    map['discount_enabled'] = Variable<bool>(discountEnabled);
    map['default_invoice_template'] = Variable<String>(defaultInvoiceTemplate);
    map['confirm_price_on_selection'] = Variable<bool>(confirmPriceOnSelection);
    map['tax_rate'] = Variable<double>(taxRate);
    if (!nullToAbsent || bankName != null) {
      map['bank_name'] = Variable<String>(bankName);
    }
    if (!nullToAbsent || accountNumber != null) {
      map['account_number'] = Variable<String>(accountNumber);
    }
    if (!nullToAbsent || accountName != null) {
      map['account_name'] = Variable<String>(accountName);
    }
    map['show_account_details'] = Variable<bool>(showAccountDetails);
    map['receipt_footer'] = Variable<String>(receiptFooter);
    map['show_signature_space'] = Variable<bool>(showSignatureSpace);
    map['payment_methods_enabled'] = Variable<bool>(paymentMethodsEnabled);
    map['primary_color'] = Variable<int>(primaryColor);
    map['failed_attempts'] = Variable<int>(failedAttempts);
    map['is_locked'] = Variable<bool>(isLocked);
    if (!nullToAbsent || lockedAt != null) {
      map['locked_at'] = Variable<DateTime>(lockedAt);
    }
    map['show_date_time'] = Variable<bool>(showDateTime);
    map['service_billing_enabled'] = Variable<bool>(serviceBillingEnabled);
    if (!nullToAbsent || serviceTypes != null) {
      map['service_types'] = Variable<String>(serviceTypes);
    }
    map['staff_management_enabled'] = Variable<bool>(staffManagementEnabled);
    map['paper_width'] = Variable<int>(paperWidth);
    map['half_day_start_hour'] = Variable<int>(halfDayStartHour);
    map['half_day_end_hour'] = Variable<int>(halfDayEndHour);
    map['show_sync_status'] = Variable<bool>(showSyncStatus);
    map['custom_receipt_pricing_enabled'] =
        Variable<bool>(customReceiptPricingEnabled);
    map['show_logo'] = Variable<bool>(showLogo);
    if (!nullToAbsent || cacNumber != null) {
      map['cac_number'] = Variable<String>(cacNumber);
    }
    map['show_cac_number'] = Variable<bool>(showCacNumber);
    map['show_total_sales_card'] = Variable<bool>(showTotalSalesCard);
    return map;
  }

  SettingsCompanion toCompanion(bool nullToAbsent) {
    return SettingsCompanion(
      id: Value(id),
      organizationName: Value(organizationName),
      address: Value(address),
      phone: Value(phone),
      businessDescription: businessDescription == null && nullToAbsent
          ? const Value.absent()
          : Value(businessDescription),
      taxId:
          taxId == null && nullToAbsent ? const Value.absent() : Value(taxId),
      logoPath: logoPath == null && nullToAbsent
          ? const Value.absent()
          : Value(logoPath),
      logo: logo == null && nullToAbsent ? const Value.absent() : Value(logo),
      themeMode: Value(themeMode),
      currency: Value(currency),
      taxEnabled: Value(taxEnabled),
      discountEnabled: Value(discountEnabled),
      defaultInvoiceTemplate: Value(defaultInvoiceTemplate),
      confirmPriceOnSelection: Value(confirmPriceOnSelection),
      taxRate: Value(taxRate),
      bankName: bankName == null && nullToAbsent
          ? const Value.absent()
          : Value(bankName),
      accountNumber: accountNumber == null && nullToAbsent
          ? const Value.absent()
          : Value(accountNumber),
      accountName: accountName == null && nullToAbsent
          ? const Value.absent()
          : Value(accountName),
      showAccountDetails: Value(showAccountDetails),
      receiptFooter: Value(receiptFooter),
      showSignatureSpace: Value(showSignatureSpace),
      paymentMethodsEnabled: Value(paymentMethodsEnabled),
      primaryColor: Value(primaryColor),
      failedAttempts: Value(failedAttempts),
      isLocked: Value(isLocked),
      lockedAt: lockedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lockedAt),
      showDateTime: Value(showDateTime),
      serviceBillingEnabled: Value(serviceBillingEnabled),
      serviceTypes: serviceTypes == null && nullToAbsent
          ? const Value.absent()
          : Value(serviceTypes),
      staffManagementEnabled: Value(staffManagementEnabled),
      paperWidth: Value(paperWidth),
      halfDayStartHour: Value(halfDayStartHour),
      halfDayEndHour: Value(halfDayEndHour),
      showSyncStatus: Value(showSyncStatus),
      customReceiptPricingEnabled: Value(customReceiptPricingEnabled),
      showLogo: Value(showLogo),
      cacNumber: cacNumber == null && nullToAbsent
          ? const Value.absent()
          : Value(cacNumber),
      showCacNumber: Value(showCacNumber),
      showTotalSalesCard: Value(showTotalSalesCard),
    );
  }

  factory SettingsTable.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return SettingsTable(
      id: serializer.fromJson<int>(json['id']),
      organizationName: serializer.fromJson<String>(json['organizationName']),
      address: serializer.fromJson<String>(json['address']),
      phone: serializer.fromJson<String>(json['phone']),
      businessDescription:
          serializer.fromJson<String?>(json['businessDescription']),
      taxId: serializer.fromJson<String?>(json['taxId']),
      logoPath: serializer.fromJson<String?>(json['logoPath']),
      logo: serializer.fromJson<Uint8List?>(json['logo']),
      themeMode: serializer.fromJson<String>(json['themeMode']),
      currency: serializer.fromJson<String>(json['currency']),
      taxEnabled: serializer.fromJson<bool>(json['taxEnabled']),
      discountEnabled: serializer.fromJson<bool>(json['discountEnabled']),
      defaultInvoiceTemplate:
          serializer.fromJson<String>(json['defaultInvoiceTemplate']),
      confirmPriceOnSelection:
          serializer.fromJson<bool>(json['confirmPriceOnSelection']),
      taxRate: serializer.fromJson<double>(json['taxRate']),
      bankName: serializer.fromJson<String?>(json['bankName']),
      accountNumber: serializer.fromJson<String?>(json['accountNumber']),
      accountName: serializer.fromJson<String?>(json['accountName']),
      showAccountDetails: serializer.fromJson<bool>(json['showAccountDetails']),
      receiptFooter: serializer.fromJson<String>(json['receiptFooter']),
      showSignatureSpace: serializer.fromJson<bool>(json['showSignatureSpace']),
      paymentMethodsEnabled:
          serializer.fromJson<bool>(json['paymentMethodsEnabled']),
      primaryColor: serializer.fromJson<int>(json['primaryColor']),
      failedAttempts: serializer.fromJson<int>(json['failedAttempts']),
      isLocked: serializer.fromJson<bool>(json['isLocked']),
      lockedAt: serializer.fromJson<DateTime?>(json['lockedAt']),
      showDateTime: serializer.fromJson<bool>(json['showDateTime']),
      serviceBillingEnabled:
          serializer.fromJson<bool>(json['serviceBillingEnabled']),
      serviceTypes: serializer.fromJson<String?>(json['serviceTypes']),
      staffManagementEnabled:
          serializer.fromJson<bool>(json['staffManagementEnabled']),
      paperWidth: serializer.fromJson<int>(json['paperWidth']),
      halfDayStartHour: serializer.fromJson<int>(json['halfDayStartHour']),
      halfDayEndHour: serializer.fromJson<int>(json['halfDayEndHour']),
      showSyncStatus: serializer.fromJson<bool>(json['showSyncStatus']),
      customReceiptPricingEnabled:
          serializer.fromJson<bool>(json['customReceiptPricingEnabled']),
      showLogo: serializer.fromJson<bool>(json['showLogo']),
      cacNumber: serializer.fromJson<String?>(json['cacNumber']),
      showCacNumber: serializer.fromJson<bool>(json['showCacNumber']),
      showTotalSalesCard: serializer.fromJson<bool>(json['showTotalSalesCard']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'organizationName': serializer.toJson<String>(organizationName),
      'address': serializer.toJson<String>(address),
      'phone': serializer.toJson<String>(phone),
      'businessDescription': serializer.toJson<String?>(businessDescription),
      'taxId': serializer.toJson<String?>(taxId),
      'logoPath': serializer.toJson<String?>(logoPath),
      'logo': serializer.toJson<Uint8List?>(logo),
      'themeMode': serializer.toJson<String>(themeMode),
      'currency': serializer.toJson<String>(currency),
      'taxEnabled': serializer.toJson<bool>(taxEnabled),
      'discountEnabled': serializer.toJson<bool>(discountEnabled),
      'defaultInvoiceTemplate':
          serializer.toJson<String>(defaultInvoiceTemplate),
      'confirmPriceOnSelection':
          serializer.toJson<bool>(confirmPriceOnSelection),
      'taxRate': serializer.toJson<double>(taxRate),
      'bankName': serializer.toJson<String?>(bankName),
      'accountNumber': serializer.toJson<String?>(accountNumber),
      'accountName': serializer.toJson<String?>(accountName),
      'showAccountDetails': serializer.toJson<bool>(showAccountDetails),
      'receiptFooter': serializer.toJson<String>(receiptFooter),
      'showSignatureSpace': serializer.toJson<bool>(showSignatureSpace),
      'paymentMethodsEnabled': serializer.toJson<bool>(paymentMethodsEnabled),
      'primaryColor': serializer.toJson<int>(primaryColor),
      'failedAttempts': serializer.toJson<int>(failedAttempts),
      'isLocked': serializer.toJson<bool>(isLocked),
      'lockedAt': serializer.toJson<DateTime?>(lockedAt),
      'showDateTime': serializer.toJson<bool>(showDateTime),
      'serviceBillingEnabled': serializer.toJson<bool>(serviceBillingEnabled),
      'serviceTypes': serializer.toJson<String?>(serviceTypes),
      'staffManagementEnabled': serializer.toJson<bool>(staffManagementEnabled),
      'paperWidth': serializer.toJson<int>(paperWidth),
      'halfDayStartHour': serializer.toJson<int>(halfDayStartHour),
      'halfDayEndHour': serializer.toJson<int>(halfDayEndHour),
      'showSyncStatus': serializer.toJson<bool>(showSyncStatus),
      'customReceiptPricingEnabled':
          serializer.toJson<bool>(customReceiptPricingEnabled),
      'showLogo': serializer.toJson<bool>(showLogo),
      'cacNumber': serializer.toJson<String?>(cacNumber),
      'showCacNumber': serializer.toJson<bool>(showCacNumber),
      'showTotalSalesCard': serializer.toJson<bool>(showTotalSalesCard),
    };
  }

  SettingsTable copyWith(
          {int? id,
          String? organizationName,
          String? address,
          String? phone,
          Value<String?> businessDescription = const Value.absent(),
          Value<String?> taxId = const Value.absent(),
          Value<String?> logoPath = const Value.absent(),
          Value<Uint8List?> logo = const Value.absent(),
          String? themeMode,
          String? currency,
          bool? taxEnabled,
          bool? discountEnabled,
          String? defaultInvoiceTemplate,
          bool? confirmPriceOnSelection,
          double? taxRate,
          Value<String?> bankName = const Value.absent(),
          Value<String?> accountNumber = const Value.absent(),
          Value<String?> accountName = const Value.absent(),
          bool? showAccountDetails,
          String? receiptFooter,
          bool? showSignatureSpace,
          bool? paymentMethodsEnabled,
          int? primaryColor,
          int? failedAttempts,
          bool? isLocked,
          Value<DateTime?> lockedAt = const Value.absent(),
          bool? showDateTime,
          bool? serviceBillingEnabled,
          Value<String?> serviceTypes = const Value.absent(),
          bool? staffManagementEnabled,
          int? paperWidth,
          int? halfDayStartHour,
          int? halfDayEndHour,
          bool? showSyncStatus,
          bool? customReceiptPricingEnabled,
          bool? showLogo,
          Value<String?> cacNumber = const Value.absent(),
          bool? showCacNumber,
          bool? showTotalSalesCard}) =>
      SettingsTable(
        id: id ?? this.id,
        organizationName: organizationName ?? this.organizationName,
        address: address ?? this.address,
        phone: phone ?? this.phone,
        businessDescription: businessDescription.present
            ? businessDescription.value
            : this.businessDescription,
        taxId: taxId.present ? taxId.value : this.taxId,
        logoPath: logoPath.present ? logoPath.value : this.logoPath,
        logo: logo.present ? logo.value : this.logo,
        themeMode: themeMode ?? this.themeMode,
        currency: currency ?? this.currency,
        taxEnabled: taxEnabled ?? this.taxEnabled,
        discountEnabled: discountEnabled ?? this.discountEnabled,
        defaultInvoiceTemplate:
            defaultInvoiceTemplate ?? this.defaultInvoiceTemplate,
        confirmPriceOnSelection:
            confirmPriceOnSelection ?? this.confirmPriceOnSelection,
        taxRate: taxRate ?? this.taxRate,
        bankName: bankName.present ? bankName.value : this.bankName,
        accountNumber:
            accountNumber.present ? accountNumber.value : this.accountNumber,
        accountName: accountName.present ? accountName.value : this.accountName,
        showAccountDetails: showAccountDetails ?? this.showAccountDetails,
        receiptFooter: receiptFooter ?? this.receiptFooter,
        showSignatureSpace: showSignatureSpace ?? this.showSignatureSpace,
        paymentMethodsEnabled:
            paymentMethodsEnabled ?? this.paymentMethodsEnabled,
        primaryColor: primaryColor ?? this.primaryColor,
        failedAttempts: failedAttempts ?? this.failedAttempts,
        isLocked: isLocked ?? this.isLocked,
        lockedAt: lockedAt.present ? lockedAt.value : this.lockedAt,
        showDateTime: showDateTime ?? this.showDateTime,
        serviceBillingEnabled:
            serviceBillingEnabled ?? this.serviceBillingEnabled,
        serviceTypes:
            serviceTypes.present ? serviceTypes.value : this.serviceTypes,
        staffManagementEnabled:
            staffManagementEnabled ?? this.staffManagementEnabled,
        paperWidth: paperWidth ?? this.paperWidth,
        halfDayStartHour: halfDayStartHour ?? this.halfDayStartHour,
        halfDayEndHour: halfDayEndHour ?? this.halfDayEndHour,
        showSyncStatus: showSyncStatus ?? this.showSyncStatus,
        customReceiptPricingEnabled:
            customReceiptPricingEnabled ?? this.customReceiptPricingEnabled,
        showLogo: showLogo ?? this.showLogo,
        cacNumber: cacNumber.present ? cacNumber.value : this.cacNumber,
        showCacNumber: showCacNumber ?? this.showCacNumber,
        showTotalSalesCard: showTotalSalesCard ?? this.showTotalSalesCard,
      );
  SettingsTable copyWithCompanion(SettingsCompanion data) {
    return SettingsTable(
      id: data.id.present ? data.id.value : this.id,
      organizationName: data.organizationName.present
          ? data.organizationName.value
          : this.organizationName,
      address: data.address.present ? data.address.value : this.address,
      phone: data.phone.present ? data.phone.value : this.phone,
      businessDescription: data.businessDescription.present
          ? data.businessDescription.value
          : this.businessDescription,
      taxId: data.taxId.present ? data.taxId.value : this.taxId,
      logoPath: data.logoPath.present ? data.logoPath.value : this.logoPath,
      logo: data.logo.present ? data.logo.value : this.logo,
      themeMode: data.themeMode.present ? data.themeMode.value : this.themeMode,
      currency: data.currency.present ? data.currency.value : this.currency,
      taxEnabled:
          data.taxEnabled.present ? data.taxEnabled.value : this.taxEnabled,
      discountEnabled: data.discountEnabled.present
          ? data.discountEnabled.value
          : this.discountEnabled,
      defaultInvoiceTemplate: data.defaultInvoiceTemplate.present
          ? data.defaultInvoiceTemplate.value
          : this.defaultInvoiceTemplate,
      confirmPriceOnSelection: data.confirmPriceOnSelection.present
          ? data.confirmPriceOnSelection.value
          : this.confirmPriceOnSelection,
      taxRate: data.taxRate.present ? data.taxRate.value : this.taxRate,
      bankName: data.bankName.present ? data.bankName.value : this.bankName,
      accountNumber: data.accountNumber.present
          ? data.accountNumber.value
          : this.accountNumber,
      accountName:
          data.accountName.present ? data.accountName.value : this.accountName,
      showAccountDetails: data.showAccountDetails.present
          ? data.showAccountDetails.value
          : this.showAccountDetails,
      receiptFooter: data.receiptFooter.present
          ? data.receiptFooter.value
          : this.receiptFooter,
      showSignatureSpace: data.showSignatureSpace.present
          ? data.showSignatureSpace.value
          : this.showSignatureSpace,
      paymentMethodsEnabled: data.paymentMethodsEnabled.present
          ? data.paymentMethodsEnabled.value
          : this.paymentMethodsEnabled,
      primaryColor: data.primaryColor.present
          ? data.primaryColor.value
          : this.primaryColor,
      failedAttempts: data.failedAttempts.present
          ? data.failedAttempts.value
          : this.failedAttempts,
      isLocked: data.isLocked.present ? data.isLocked.value : this.isLocked,
      lockedAt: data.lockedAt.present ? data.lockedAt.value : this.lockedAt,
      showDateTime: data.showDateTime.present
          ? data.showDateTime.value
          : this.showDateTime,
      serviceBillingEnabled: data.serviceBillingEnabled.present
          ? data.serviceBillingEnabled.value
          : this.serviceBillingEnabled,
      serviceTypes: data.serviceTypes.present
          ? data.serviceTypes.value
          : this.serviceTypes,
      staffManagementEnabled: data.staffManagementEnabled.present
          ? data.staffManagementEnabled.value
          : this.staffManagementEnabled,
      paperWidth:
          data.paperWidth.present ? data.paperWidth.value : this.paperWidth,
      halfDayStartHour: data.halfDayStartHour.present
          ? data.halfDayStartHour.value
          : this.halfDayStartHour,
      halfDayEndHour: data.halfDayEndHour.present
          ? data.halfDayEndHour.value
          : this.halfDayEndHour,
      showSyncStatus: data.showSyncStatus.present
          ? data.showSyncStatus.value
          : this.showSyncStatus,
      customReceiptPricingEnabled: data.customReceiptPricingEnabled.present
          ? data.customReceiptPricingEnabled.value
          : this.customReceiptPricingEnabled,
      showLogo: data.showLogo.present ? data.showLogo.value : this.showLogo,
      cacNumber: data.cacNumber.present ? data.cacNumber.value : this.cacNumber,
      showCacNumber: data.showCacNumber.present
          ? data.showCacNumber.value
          : this.showCacNumber,
      showTotalSalesCard: data.showTotalSalesCard.present
          ? data.showTotalSalesCard.value
          : this.showTotalSalesCard,
    );
  }

  @override
  String toString() {
    return (StringBuffer('SettingsTable(')
          ..write('id: $id, ')
          ..write('organizationName: $organizationName, ')
          ..write('address: $address, ')
          ..write('phone: $phone, ')
          ..write('businessDescription: $businessDescription, ')
          ..write('taxId: $taxId, ')
          ..write('logoPath: $logoPath, ')
          ..write('logo: $logo, ')
          ..write('themeMode: $themeMode, ')
          ..write('currency: $currency, ')
          ..write('taxEnabled: $taxEnabled, ')
          ..write('discountEnabled: $discountEnabled, ')
          ..write('defaultInvoiceTemplate: $defaultInvoiceTemplate, ')
          ..write('confirmPriceOnSelection: $confirmPriceOnSelection, ')
          ..write('taxRate: $taxRate, ')
          ..write('bankName: $bankName, ')
          ..write('accountNumber: $accountNumber, ')
          ..write('accountName: $accountName, ')
          ..write('showAccountDetails: $showAccountDetails, ')
          ..write('receiptFooter: $receiptFooter, ')
          ..write('showSignatureSpace: $showSignatureSpace, ')
          ..write('paymentMethodsEnabled: $paymentMethodsEnabled, ')
          ..write('primaryColor: $primaryColor, ')
          ..write('failedAttempts: $failedAttempts, ')
          ..write('isLocked: $isLocked, ')
          ..write('lockedAt: $lockedAt, ')
          ..write('showDateTime: $showDateTime, ')
          ..write('serviceBillingEnabled: $serviceBillingEnabled, ')
          ..write('serviceTypes: $serviceTypes, ')
          ..write('staffManagementEnabled: $staffManagementEnabled, ')
          ..write('paperWidth: $paperWidth, ')
          ..write('halfDayStartHour: $halfDayStartHour, ')
          ..write('halfDayEndHour: $halfDayEndHour, ')
          ..write('showSyncStatus: $showSyncStatus, ')
          ..write('customReceiptPricingEnabled: $customReceiptPricingEnabled, ')
          ..write('showLogo: $showLogo, ')
          ..write('cacNumber: $cacNumber, ')
          ..write('showCacNumber: $showCacNumber, ')
          ..write('showTotalSalesCard: $showTotalSalesCard')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hashAll([
        id,
        organizationName,
        address,
        phone,
        businessDescription,
        taxId,
        logoPath,
        $driftBlobEquality.hash(logo),
        themeMode,
        currency,
        taxEnabled,
        discountEnabled,
        defaultInvoiceTemplate,
        confirmPriceOnSelection,
        taxRate,
        bankName,
        accountNumber,
        accountName,
        showAccountDetails,
        receiptFooter,
        showSignatureSpace,
        paymentMethodsEnabled,
        primaryColor,
        failedAttempts,
        isLocked,
        lockedAt,
        showDateTime,
        serviceBillingEnabled,
        serviceTypes,
        staffManagementEnabled,
        paperWidth,
        halfDayStartHour,
        halfDayEndHour,
        showSyncStatus,
        customReceiptPricingEnabled,
        showLogo,
        cacNumber,
        showCacNumber,
        showTotalSalesCard
      ]);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is SettingsTable &&
          other.id == this.id &&
          other.organizationName == this.organizationName &&
          other.address == this.address &&
          other.phone == this.phone &&
          other.businessDescription == this.businessDescription &&
          other.taxId == this.taxId &&
          other.logoPath == this.logoPath &&
          $driftBlobEquality.equals(other.logo, this.logo) &&
          other.themeMode == this.themeMode &&
          other.currency == this.currency &&
          other.taxEnabled == this.taxEnabled &&
          other.discountEnabled == this.discountEnabled &&
          other.defaultInvoiceTemplate == this.defaultInvoiceTemplate &&
          other.confirmPriceOnSelection == this.confirmPriceOnSelection &&
          other.taxRate == this.taxRate &&
          other.bankName == this.bankName &&
          other.accountNumber == this.accountNumber &&
          other.accountName == this.accountName &&
          other.showAccountDetails == this.showAccountDetails &&
          other.receiptFooter == this.receiptFooter &&
          other.showSignatureSpace == this.showSignatureSpace &&
          other.paymentMethodsEnabled == this.paymentMethodsEnabled &&
          other.primaryColor == this.primaryColor &&
          other.failedAttempts == this.failedAttempts &&
          other.isLocked == this.isLocked &&
          other.lockedAt == this.lockedAt &&
          other.showDateTime == this.showDateTime &&
          other.serviceBillingEnabled == this.serviceBillingEnabled &&
          other.serviceTypes == this.serviceTypes &&
          other.staffManagementEnabled == this.staffManagementEnabled &&
          other.paperWidth == this.paperWidth &&
          other.halfDayStartHour == this.halfDayStartHour &&
          other.halfDayEndHour == this.halfDayEndHour &&
          other.showSyncStatus == this.showSyncStatus &&
          other.customReceiptPricingEnabled ==
              this.customReceiptPricingEnabled &&
          other.showLogo == this.showLogo &&
          other.cacNumber == this.cacNumber &&
          other.showCacNumber == this.showCacNumber &&
          other.showTotalSalesCard == this.showTotalSalesCard);
}

class SettingsCompanion extends UpdateCompanion<SettingsTable> {
  final Value<int> id;
  final Value<String> organizationName;
  final Value<String> address;
  final Value<String> phone;
  final Value<String?> businessDescription;
  final Value<String?> taxId;
  final Value<String?> logoPath;
  final Value<Uint8List?> logo;
  final Value<String> themeMode;
  final Value<String> currency;
  final Value<bool> taxEnabled;
  final Value<bool> discountEnabled;
  final Value<String> defaultInvoiceTemplate;
  final Value<bool> confirmPriceOnSelection;
  final Value<double> taxRate;
  final Value<String?> bankName;
  final Value<String?> accountNumber;
  final Value<String?> accountName;
  final Value<bool> showAccountDetails;
  final Value<String> receiptFooter;
  final Value<bool> showSignatureSpace;
  final Value<bool> paymentMethodsEnabled;
  final Value<int> primaryColor;
  final Value<int> failedAttempts;
  final Value<bool> isLocked;
  final Value<DateTime?> lockedAt;
  final Value<bool> showDateTime;
  final Value<bool> serviceBillingEnabled;
  final Value<String?> serviceTypes;
  final Value<bool> staffManagementEnabled;
  final Value<int> paperWidth;
  final Value<int> halfDayStartHour;
  final Value<int> halfDayEndHour;
  final Value<bool> showSyncStatus;
  final Value<bool> customReceiptPricingEnabled;
  final Value<bool> showLogo;
  final Value<String?> cacNumber;
  final Value<bool> showCacNumber;
  final Value<bool> showTotalSalesCard;
  const SettingsCompanion({
    this.id = const Value.absent(),
    this.organizationName = const Value.absent(),
    this.address = const Value.absent(),
    this.phone = const Value.absent(),
    this.businessDescription = const Value.absent(),
    this.taxId = const Value.absent(),
    this.logoPath = const Value.absent(),
    this.logo = const Value.absent(),
    this.themeMode = const Value.absent(),
    this.currency = const Value.absent(),
    this.taxEnabled = const Value.absent(),
    this.discountEnabled = const Value.absent(),
    this.defaultInvoiceTemplate = const Value.absent(),
    this.confirmPriceOnSelection = const Value.absent(),
    this.taxRate = const Value.absent(),
    this.bankName = const Value.absent(),
    this.accountNumber = const Value.absent(),
    this.accountName = const Value.absent(),
    this.showAccountDetails = const Value.absent(),
    this.receiptFooter = const Value.absent(),
    this.showSignatureSpace = const Value.absent(),
    this.paymentMethodsEnabled = const Value.absent(),
    this.primaryColor = const Value.absent(),
    this.failedAttempts = const Value.absent(),
    this.isLocked = const Value.absent(),
    this.lockedAt = const Value.absent(),
    this.showDateTime = const Value.absent(),
    this.serviceBillingEnabled = const Value.absent(),
    this.serviceTypes = const Value.absent(),
    this.staffManagementEnabled = const Value.absent(),
    this.paperWidth = const Value.absent(),
    this.halfDayStartHour = const Value.absent(),
    this.halfDayEndHour = const Value.absent(),
    this.showSyncStatus = const Value.absent(),
    this.customReceiptPricingEnabled = const Value.absent(),
    this.showLogo = const Value.absent(),
    this.cacNumber = const Value.absent(),
    this.showCacNumber = const Value.absent(),
    this.showTotalSalesCard = const Value.absent(),
  });
  SettingsCompanion.insert({
    this.id = const Value.absent(),
    required String organizationName,
    required String address,
    required String phone,
    this.businessDescription = const Value.absent(),
    this.taxId = const Value.absent(),
    this.logoPath = const Value.absent(),
    this.logo = const Value.absent(),
    this.themeMode = const Value.absent(),
    this.currency = const Value.absent(),
    this.taxEnabled = const Value.absent(),
    this.discountEnabled = const Value.absent(),
    this.defaultInvoiceTemplate = const Value.absent(),
    this.confirmPriceOnSelection = const Value.absent(),
    this.taxRate = const Value.absent(),
    this.bankName = const Value.absent(),
    this.accountNumber = const Value.absent(),
    this.accountName = const Value.absent(),
    this.showAccountDetails = const Value.absent(),
    this.receiptFooter = const Value.absent(),
    this.showSignatureSpace = const Value.absent(),
    this.paymentMethodsEnabled = const Value.absent(),
    this.primaryColor = const Value.absent(),
    this.failedAttempts = const Value.absent(),
    this.isLocked = const Value.absent(),
    this.lockedAt = const Value.absent(),
    this.showDateTime = const Value.absent(),
    this.serviceBillingEnabled = const Value.absent(),
    this.serviceTypes = const Value.absent(),
    this.staffManagementEnabled = const Value.absent(),
    this.paperWidth = const Value.absent(),
    this.halfDayStartHour = const Value.absent(),
    this.halfDayEndHour = const Value.absent(),
    this.showSyncStatus = const Value.absent(),
    this.customReceiptPricingEnabled = const Value.absent(),
    this.showLogo = const Value.absent(),
    this.cacNumber = const Value.absent(),
    this.showCacNumber = const Value.absent(),
    this.showTotalSalesCard = const Value.absent(),
  })  : organizationName = Value(organizationName),
        address = Value(address),
        phone = Value(phone);
  static Insertable<SettingsTable> custom({
    Expression<int>? id,
    Expression<String>? organizationName,
    Expression<String>? address,
    Expression<String>? phone,
    Expression<String>? businessDescription,
    Expression<String>? taxId,
    Expression<String>? logoPath,
    Expression<Uint8List>? logo,
    Expression<String>? themeMode,
    Expression<String>? currency,
    Expression<bool>? taxEnabled,
    Expression<bool>? discountEnabled,
    Expression<String>? defaultInvoiceTemplate,
    Expression<bool>? confirmPriceOnSelection,
    Expression<double>? taxRate,
    Expression<String>? bankName,
    Expression<String>? accountNumber,
    Expression<String>? accountName,
    Expression<bool>? showAccountDetails,
    Expression<String>? receiptFooter,
    Expression<bool>? showSignatureSpace,
    Expression<bool>? paymentMethodsEnabled,
    Expression<int>? primaryColor,
    Expression<int>? failedAttempts,
    Expression<bool>? isLocked,
    Expression<DateTime>? lockedAt,
    Expression<bool>? showDateTime,
    Expression<bool>? serviceBillingEnabled,
    Expression<String>? serviceTypes,
    Expression<bool>? staffManagementEnabled,
    Expression<int>? paperWidth,
    Expression<int>? halfDayStartHour,
    Expression<int>? halfDayEndHour,
    Expression<bool>? showSyncStatus,
    Expression<bool>? customReceiptPricingEnabled,
    Expression<bool>? showLogo,
    Expression<String>? cacNumber,
    Expression<bool>? showCacNumber,
    Expression<bool>? showTotalSalesCard,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (organizationName != null) 'organization_name': organizationName,
      if (address != null) 'address': address,
      if (phone != null) 'phone': phone,
      if (businessDescription != null)
        'business_description': businessDescription,
      if (taxId != null) 'tax_id': taxId,
      if (logoPath != null) 'logo_path': logoPath,
      if (logo != null) 'logo': logo,
      if (themeMode != null) 'theme_mode': themeMode,
      if (currency != null) 'currency': currency,
      if (taxEnabled != null) 'tax_enabled': taxEnabled,
      if (discountEnabled != null) 'discount_enabled': discountEnabled,
      if (defaultInvoiceTemplate != null)
        'default_invoice_template': defaultInvoiceTemplate,
      if (confirmPriceOnSelection != null)
        'confirm_price_on_selection': confirmPriceOnSelection,
      if (taxRate != null) 'tax_rate': taxRate,
      if (bankName != null) 'bank_name': bankName,
      if (accountNumber != null) 'account_number': accountNumber,
      if (accountName != null) 'account_name': accountName,
      if (showAccountDetails != null)
        'show_account_details': showAccountDetails,
      if (receiptFooter != null) 'receipt_footer': receiptFooter,
      if (showSignatureSpace != null)
        'show_signature_space': showSignatureSpace,
      if (paymentMethodsEnabled != null)
        'payment_methods_enabled': paymentMethodsEnabled,
      if (primaryColor != null) 'primary_color': primaryColor,
      if (failedAttempts != null) 'failed_attempts': failedAttempts,
      if (isLocked != null) 'is_locked': isLocked,
      if (lockedAt != null) 'locked_at': lockedAt,
      if (showDateTime != null) 'show_date_time': showDateTime,
      if (serviceBillingEnabled != null)
        'service_billing_enabled': serviceBillingEnabled,
      if (serviceTypes != null) 'service_types': serviceTypes,
      if (staffManagementEnabled != null)
        'staff_management_enabled': staffManagementEnabled,
      if (paperWidth != null) 'paper_width': paperWidth,
      if (halfDayStartHour != null) 'half_day_start_hour': halfDayStartHour,
      if (halfDayEndHour != null) 'half_day_end_hour': halfDayEndHour,
      if (showSyncStatus != null) 'show_sync_status': showSyncStatus,
      if (customReceiptPricingEnabled != null)
        'custom_receipt_pricing_enabled': customReceiptPricingEnabled,
      if (showLogo != null) 'show_logo': showLogo,
      if (cacNumber != null) 'cac_number': cacNumber,
      if (showCacNumber != null) 'show_cac_number': showCacNumber,
      if (showTotalSalesCard != null)
        'show_total_sales_card': showTotalSalesCard,
    });
  }

  SettingsCompanion copyWith(
      {Value<int>? id,
      Value<String>? organizationName,
      Value<String>? address,
      Value<String>? phone,
      Value<String?>? businessDescription,
      Value<String?>? taxId,
      Value<String?>? logoPath,
      Value<Uint8List?>? logo,
      Value<String>? themeMode,
      Value<String>? currency,
      Value<bool>? taxEnabled,
      Value<bool>? discountEnabled,
      Value<String>? defaultInvoiceTemplate,
      Value<bool>? confirmPriceOnSelection,
      Value<double>? taxRate,
      Value<String?>? bankName,
      Value<String?>? accountNumber,
      Value<String?>? accountName,
      Value<bool>? showAccountDetails,
      Value<String>? receiptFooter,
      Value<bool>? showSignatureSpace,
      Value<bool>? paymentMethodsEnabled,
      Value<int>? primaryColor,
      Value<int>? failedAttempts,
      Value<bool>? isLocked,
      Value<DateTime?>? lockedAt,
      Value<bool>? showDateTime,
      Value<bool>? serviceBillingEnabled,
      Value<String?>? serviceTypes,
      Value<bool>? staffManagementEnabled,
      Value<int>? paperWidth,
      Value<int>? halfDayStartHour,
      Value<int>? halfDayEndHour,
      Value<bool>? showSyncStatus,
      Value<bool>? customReceiptPricingEnabled,
      Value<bool>? showLogo,
      Value<String?>? cacNumber,
      Value<bool>? showCacNumber,
      Value<bool>? showTotalSalesCard}) {
    return SettingsCompanion(
      id: id ?? this.id,
      organizationName: organizationName ?? this.organizationName,
      address: address ?? this.address,
      phone: phone ?? this.phone,
      businessDescription: businessDescription ?? this.businessDescription,
      taxId: taxId ?? this.taxId,
      logoPath: logoPath ?? this.logoPath,
      logo: logo ?? this.logo,
      themeMode: themeMode ?? this.themeMode,
      currency: currency ?? this.currency,
      taxEnabled: taxEnabled ?? this.taxEnabled,
      discountEnabled: discountEnabled ?? this.discountEnabled,
      defaultInvoiceTemplate:
          defaultInvoiceTemplate ?? this.defaultInvoiceTemplate,
      confirmPriceOnSelection:
          confirmPriceOnSelection ?? this.confirmPriceOnSelection,
      taxRate: taxRate ?? this.taxRate,
      bankName: bankName ?? this.bankName,
      accountNumber: accountNumber ?? this.accountNumber,
      accountName: accountName ?? this.accountName,
      showAccountDetails: showAccountDetails ?? this.showAccountDetails,
      receiptFooter: receiptFooter ?? this.receiptFooter,
      showSignatureSpace: showSignatureSpace ?? this.showSignatureSpace,
      paymentMethodsEnabled:
          paymentMethodsEnabled ?? this.paymentMethodsEnabled,
      primaryColor: primaryColor ?? this.primaryColor,
      failedAttempts: failedAttempts ?? this.failedAttempts,
      isLocked: isLocked ?? this.isLocked,
      lockedAt: lockedAt ?? this.lockedAt,
      showDateTime: showDateTime ?? this.showDateTime,
      serviceBillingEnabled:
          serviceBillingEnabled ?? this.serviceBillingEnabled,
      serviceTypes: serviceTypes ?? this.serviceTypes,
      staffManagementEnabled:
          staffManagementEnabled ?? this.staffManagementEnabled,
      paperWidth: paperWidth ?? this.paperWidth,
      halfDayStartHour: halfDayStartHour ?? this.halfDayStartHour,
      halfDayEndHour: halfDayEndHour ?? this.halfDayEndHour,
      showSyncStatus: showSyncStatus ?? this.showSyncStatus,
      customReceiptPricingEnabled:
          customReceiptPricingEnabled ?? this.customReceiptPricingEnabled,
      showLogo: showLogo ?? this.showLogo,
      cacNumber: cacNumber ?? this.cacNumber,
      showCacNumber: showCacNumber ?? this.showCacNumber,
      showTotalSalesCard: showTotalSalesCard ?? this.showTotalSalesCard,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (organizationName.present) {
      map['organization_name'] = Variable<String>(organizationName.value);
    }
    if (address.present) {
      map['address'] = Variable<String>(address.value);
    }
    if (phone.present) {
      map['phone'] = Variable<String>(phone.value);
    }
    if (businessDescription.present) {
      map['business_description'] = Variable<String>(businessDescription.value);
    }
    if (taxId.present) {
      map['tax_id'] = Variable<String>(taxId.value);
    }
    if (logoPath.present) {
      map['logo_path'] = Variable<String>(logoPath.value);
    }
    if (logo.present) {
      map['logo'] = Variable<Uint8List>(logo.value);
    }
    if (themeMode.present) {
      map['theme_mode'] = Variable<String>(themeMode.value);
    }
    if (currency.present) {
      map['currency'] = Variable<String>(currency.value);
    }
    if (taxEnabled.present) {
      map['tax_enabled'] = Variable<bool>(taxEnabled.value);
    }
    if (discountEnabled.present) {
      map['discount_enabled'] = Variable<bool>(discountEnabled.value);
    }
    if (defaultInvoiceTemplate.present) {
      map['default_invoice_template'] =
          Variable<String>(defaultInvoiceTemplate.value);
    }
    if (confirmPriceOnSelection.present) {
      map['confirm_price_on_selection'] =
          Variable<bool>(confirmPriceOnSelection.value);
    }
    if (taxRate.present) {
      map['tax_rate'] = Variable<double>(taxRate.value);
    }
    if (bankName.present) {
      map['bank_name'] = Variable<String>(bankName.value);
    }
    if (accountNumber.present) {
      map['account_number'] = Variable<String>(accountNumber.value);
    }
    if (accountName.present) {
      map['account_name'] = Variable<String>(accountName.value);
    }
    if (showAccountDetails.present) {
      map['show_account_details'] = Variable<bool>(showAccountDetails.value);
    }
    if (receiptFooter.present) {
      map['receipt_footer'] = Variable<String>(receiptFooter.value);
    }
    if (showSignatureSpace.present) {
      map['show_signature_space'] = Variable<bool>(showSignatureSpace.value);
    }
    if (paymentMethodsEnabled.present) {
      map['payment_methods_enabled'] =
          Variable<bool>(paymentMethodsEnabled.value);
    }
    if (primaryColor.present) {
      map['primary_color'] = Variable<int>(primaryColor.value);
    }
    if (failedAttempts.present) {
      map['failed_attempts'] = Variable<int>(failedAttempts.value);
    }
    if (isLocked.present) {
      map['is_locked'] = Variable<bool>(isLocked.value);
    }
    if (lockedAt.present) {
      map['locked_at'] = Variable<DateTime>(lockedAt.value);
    }
    if (showDateTime.present) {
      map['show_date_time'] = Variable<bool>(showDateTime.value);
    }
    if (serviceBillingEnabled.present) {
      map['service_billing_enabled'] =
          Variable<bool>(serviceBillingEnabled.value);
    }
    if (serviceTypes.present) {
      map['service_types'] = Variable<String>(serviceTypes.value);
    }
    if (staffManagementEnabled.present) {
      map['staff_management_enabled'] =
          Variable<bool>(staffManagementEnabled.value);
    }
    if (paperWidth.present) {
      map['paper_width'] = Variable<int>(paperWidth.value);
    }
    if (halfDayStartHour.present) {
      map['half_day_start_hour'] = Variable<int>(halfDayStartHour.value);
    }
    if (halfDayEndHour.present) {
      map['half_day_end_hour'] = Variable<int>(halfDayEndHour.value);
    }
    if (showSyncStatus.present) {
      map['show_sync_status'] = Variable<bool>(showSyncStatus.value);
    }
    if (customReceiptPricingEnabled.present) {
      map['custom_receipt_pricing_enabled'] =
          Variable<bool>(customReceiptPricingEnabled.value);
    }
    if (showLogo.present) {
      map['show_logo'] = Variable<bool>(showLogo.value);
    }
    if (cacNumber.present) {
      map['cac_number'] = Variable<String>(cacNumber.value);
    }
    if (showCacNumber.present) {
      map['show_cac_number'] = Variable<bool>(showCacNumber.value);
    }
    if (showTotalSalesCard.present) {
      map['show_total_sales_card'] = Variable<bool>(showTotalSalesCard.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SettingsCompanion(')
          ..write('id: $id, ')
          ..write('organizationName: $organizationName, ')
          ..write('address: $address, ')
          ..write('phone: $phone, ')
          ..write('businessDescription: $businessDescription, ')
          ..write('taxId: $taxId, ')
          ..write('logoPath: $logoPath, ')
          ..write('logo: $logo, ')
          ..write('themeMode: $themeMode, ')
          ..write('currency: $currency, ')
          ..write('taxEnabled: $taxEnabled, ')
          ..write('discountEnabled: $discountEnabled, ')
          ..write('defaultInvoiceTemplate: $defaultInvoiceTemplate, ')
          ..write('confirmPriceOnSelection: $confirmPriceOnSelection, ')
          ..write('taxRate: $taxRate, ')
          ..write('bankName: $bankName, ')
          ..write('accountNumber: $accountNumber, ')
          ..write('accountName: $accountName, ')
          ..write('showAccountDetails: $showAccountDetails, ')
          ..write('receiptFooter: $receiptFooter, ')
          ..write('showSignatureSpace: $showSignatureSpace, ')
          ..write('paymentMethodsEnabled: $paymentMethodsEnabled, ')
          ..write('primaryColor: $primaryColor, ')
          ..write('failedAttempts: $failedAttempts, ')
          ..write('isLocked: $isLocked, ')
          ..write('lockedAt: $lockedAt, ')
          ..write('showDateTime: $showDateTime, ')
          ..write('serviceBillingEnabled: $serviceBillingEnabled, ')
          ..write('serviceTypes: $serviceTypes, ')
          ..write('staffManagementEnabled: $staffManagementEnabled, ')
          ..write('paperWidth: $paperWidth, ')
          ..write('halfDayStartHour: $halfDayStartHour, ')
          ..write('halfDayEndHour: $halfDayEndHour, ')
          ..write('showSyncStatus: $showSyncStatus, ')
          ..write('customReceiptPricingEnabled: $customReceiptPricingEnabled, ')
          ..write('showLogo: $showLogo, ')
          ..write('cacNumber: $cacNumber, ')
          ..write('showCacNumber: $showCacNumber, ')
          ..write('showTotalSalesCard: $showTotalSalesCard')
          ..write(')'))
        .toString();
  }
}

class $LicenseHistoryTable extends LicenseHistory
    with TableInfo<$LicenseHistoryTable, LicenseHistoryData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $LicenseHistoryTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _licenseIdMeta =
      const VerificationMeta('licenseId');
  @override
  late final GeneratedColumn<String> licenseId = GeneratedColumn<String>(
      'license_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _businessNameMeta =
      const VerificationMeta('businessName');
  @override
  late final GeneratedColumn<String> businessName = GeneratedColumn<String>(
      'business_name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _codeMeta = const VerificationMeta('code');
  @override
  late final GeneratedColumn<String> code = GeneratedColumn<String>(
      'code', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _planMeta = const VerificationMeta('plan');
  @override
  late final GeneratedColumn<String> plan = GeneratedColumn<String>(
      'plan', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _expiryDateMeta =
      const VerificationMeta('expiryDate');
  @override
  late final GeneratedColumn<DateTime> expiryDate = GeneratedColumn<DateTime>(
      'expiry_date', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _isActivatedMeta =
      const VerificationMeta('isActivated');
  @override
  late final GeneratedColumn<bool> isActivated = GeneratedColumn<bool>(
      'is_activated', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("is_activated" IN (0, 1))'),
      defaultValue: const Constant(false));
  @override
  List<GeneratedColumn> get $columns => [
        id,
        licenseId,
        businessName,
        code,
        plan,
        expiryDate,
        createdAt,
        isActivated
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'license_history';
  @override
  VerificationContext validateIntegrity(Insertable<LicenseHistoryData> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('license_id')) {
      context.handle(_licenseIdMeta,
          licenseId.isAcceptableOrUnknown(data['license_id']!, _licenseIdMeta));
    } else if (isInserting) {
      context.missing(_licenseIdMeta);
    }
    if (data.containsKey('business_name')) {
      context.handle(
          _businessNameMeta,
          businessName.isAcceptableOrUnknown(
              data['business_name']!, _businessNameMeta));
    } else if (isInserting) {
      context.missing(_businessNameMeta);
    }
    if (data.containsKey('code')) {
      context.handle(
          _codeMeta, code.isAcceptableOrUnknown(data['code']!, _codeMeta));
    } else if (isInserting) {
      context.missing(_codeMeta);
    }
    if (data.containsKey('plan')) {
      context.handle(
          _planMeta, plan.isAcceptableOrUnknown(data['plan']!, _planMeta));
    } else if (isInserting) {
      context.missing(_planMeta);
    }
    if (data.containsKey('expiry_date')) {
      context.handle(
          _expiryDateMeta,
          expiryDate.isAcceptableOrUnknown(
              data['expiry_date']!, _expiryDateMeta));
    } else if (isInserting) {
      context.missing(_expiryDateMeta);
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('is_activated')) {
      context.handle(
          _isActivatedMeta,
          isActivated.isAcceptableOrUnknown(
              data['is_activated']!, _isActivatedMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  LicenseHistoryData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return LicenseHistoryData(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      licenseId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}license_id'])!,
      businessName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}business_name'])!,
      code: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}code'])!,
      plan: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}plan'])!,
      expiryDate: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}expiry_date'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
      isActivated: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_activated'])!,
    );
  }

  @override
  $LicenseHistoryTable createAlias(String alias) {
    return $LicenseHistoryTable(attachedDatabase, alias);
  }
}

class LicenseHistoryData extends DataClass
    implements Insertable<LicenseHistoryData> {
  final int id;
  final String licenseId;
  final String businessName;
  final String code;
  final String plan;
  final DateTime expiryDate;
  final DateTime createdAt;
  final bool isActivated;
  const LicenseHistoryData(
      {required this.id,
      required this.licenseId,
      required this.businessName,
      required this.code,
      required this.plan,
      required this.expiryDate,
      required this.createdAt,
      required this.isActivated});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['license_id'] = Variable<String>(licenseId);
    map['business_name'] = Variable<String>(businessName);
    map['code'] = Variable<String>(code);
    map['plan'] = Variable<String>(plan);
    map['expiry_date'] = Variable<DateTime>(expiryDate);
    map['created_at'] = Variable<DateTime>(createdAt);
    map['is_activated'] = Variable<bool>(isActivated);
    return map;
  }

  LicenseHistoryCompanion toCompanion(bool nullToAbsent) {
    return LicenseHistoryCompanion(
      id: Value(id),
      licenseId: Value(licenseId),
      businessName: Value(businessName),
      code: Value(code),
      plan: Value(plan),
      expiryDate: Value(expiryDate),
      createdAt: Value(createdAt),
      isActivated: Value(isActivated),
    );
  }

  factory LicenseHistoryData.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return LicenseHistoryData(
      id: serializer.fromJson<int>(json['id']),
      licenseId: serializer.fromJson<String>(json['licenseId']),
      businessName: serializer.fromJson<String>(json['businessName']),
      code: serializer.fromJson<String>(json['code']),
      plan: serializer.fromJson<String>(json['plan']),
      expiryDate: serializer.fromJson<DateTime>(json['expiryDate']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      isActivated: serializer.fromJson<bool>(json['isActivated']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'licenseId': serializer.toJson<String>(licenseId),
      'businessName': serializer.toJson<String>(businessName),
      'code': serializer.toJson<String>(code),
      'plan': serializer.toJson<String>(plan),
      'expiryDate': serializer.toJson<DateTime>(expiryDate),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'isActivated': serializer.toJson<bool>(isActivated),
    };
  }

  LicenseHistoryData copyWith(
          {int? id,
          String? licenseId,
          String? businessName,
          String? code,
          String? plan,
          DateTime? expiryDate,
          DateTime? createdAt,
          bool? isActivated}) =>
      LicenseHistoryData(
        id: id ?? this.id,
        licenseId: licenseId ?? this.licenseId,
        businessName: businessName ?? this.businessName,
        code: code ?? this.code,
        plan: plan ?? this.plan,
        expiryDate: expiryDate ?? this.expiryDate,
        createdAt: createdAt ?? this.createdAt,
        isActivated: isActivated ?? this.isActivated,
      );
  LicenseHistoryData copyWithCompanion(LicenseHistoryCompanion data) {
    return LicenseHistoryData(
      id: data.id.present ? data.id.value : this.id,
      licenseId: data.licenseId.present ? data.licenseId.value : this.licenseId,
      businessName: data.businessName.present
          ? data.businessName.value
          : this.businessName,
      code: data.code.present ? data.code.value : this.code,
      plan: data.plan.present ? data.plan.value : this.plan,
      expiryDate:
          data.expiryDate.present ? data.expiryDate.value : this.expiryDate,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      isActivated:
          data.isActivated.present ? data.isActivated.value : this.isActivated,
    );
  }

  @override
  String toString() {
    return (StringBuffer('LicenseHistoryData(')
          ..write('id: $id, ')
          ..write('licenseId: $licenseId, ')
          ..write('businessName: $businessName, ')
          ..write('code: $code, ')
          ..write('plan: $plan, ')
          ..write('expiryDate: $expiryDate, ')
          ..write('createdAt: $createdAt, ')
          ..write('isActivated: $isActivated')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, licenseId, businessName, code, plan,
      expiryDate, createdAt, isActivated);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is LicenseHistoryData &&
          other.id == this.id &&
          other.licenseId == this.licenseId &&
          other.businessName == this.businessName &&
          other.code == this.code &&
          other.plan == this.plan &&
          other.expiryDate == this.expiryDate &&
          other.createdAt == this.createdAt &&
          other.isActivated == this.isActivated);
}

class LicenseHistoryCompanion extends UpdateCompanion<LicenseHistoryData> {
  final Value<int> id;
  final Value<String> licenseId;
  final Value<String> businessName;
  final Value<String> code;
  final Value<String> plan;
  final Value<DateTime> expiryDate;
  final Value<DateTime> createdAt;
  final Value<bool> isActivated;
  const LicenseHistoryCompanion({
    this.id = const Value.absent(),
    this.licenseId = const Value.absent(),
    this.businessName = const Value.absent(),
    this.code = const Value.absent(),
    this.plan = const Value.absent(),
    this.expiryDate = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.isActivated = const Value.absent(),
  });
  LicenseHistoryCompanion.insert({
    this.id = const Value.absent(),
    required String licenseId,
    required String businessName,
    required String code,
    required String plan,
    required DateTime expiryDate,
    required DateTime createdAt,
    this.isActivated = const Value.absent(),
  })  : licenseId = Value(licenseId),
        businessName = Value(businessName),
        code = Value(code),
        plan = Value(plan),
        expiryDate = Value(expiryDate),
        createdAt = Value(createdAt);
  static Insertable<LicenseHistoryData> custom({
    Expression<int>? id,
    Expression<String>? licenseId,
    Expression<String>? businessName,
    Expression<String>? code,
    Expression<String>? plan,
    Expression<DateTime>? expiryDate,
    Expression<DateTime>? createdAt,
    Expression<bool>? isActivated,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (licenseId != null) 'license_id': licenseId,
      if (businessName != null) 'business_name': businessName,
      if (code != null) 'code': code,
      if (plan != null) 'plan': plan,
      if (expiryDate != null) 'expiry_date': expiryDate,
      if (createdAt != null) 'created_at': createdAt,
      if (isActivated != null) 'is_activated': isActivated,
    });
  }

  LicenseHistoryCompanion copyWith(
      {Value<int>? id,
      Value<String>? licenseId,
      Value<String>? businessName,
      Value<String>? code,
      Value<String>? plan,
      Value<DateTime>? expiryDate,
      Value<DateTime>? createdAt,
      Value<bool>? isActivated}) {
    return LicenseHistoryCompanion(
      id: id ?? this.id,
      licenseId: licenseId ?? this.licenseId,
      businessName: businessName ?? this.businessName,
      code: code ?? this.code,
      plan: plan ?? this.plan,
      expiryDate: expiryDate ?? this.expiryDate,
      createdAt: createdAt ?? this.createdAt,
      isActivated: isActivated ?? this.isActivated,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (licenseId.present) {
      map['license_id'] = Variable<String>(licenseId.value);
    }
    if (businessName.present) {
      map['business_name'] = Variable<String>(businessName.value);
    }
    if (code.present) {
      map['code'] = Variable<String>(code.value);
    }
    if (plan.present) {
      map['plan'] = Variable<String>(plan.value);
    }
    if (expiryDate.present) {
      map['expiry_date'] = Variable<DateTime>(expiryDate.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (isActivated.present) {
      map['is_activated'] = Variable<bool>(isActivated.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('LicenseHistoryCompanion(')
          ..write('id: $id, ')
          ..write('licenseId: $licenseId, ')
          ..write('businessName: $businessName, ')
          ..write('code: $code, ')
          ..write('plan: $plan, ')
          ..write('expiryDate: $expiryDate, ')
          ..write('createdAt: $createdAt, ')
          ..write('isActivated: $isActivated')
          ..write(')'))
        .toString();
  }
}

class $StaffTable extends Staff with TableInfo<$StaffTable, StaffTable> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $StaffTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
      'name', aliasedName, false,
      additionalChecks:
          GeneratedColumn.checkTextLength(minTextLength: 1, maxTextLength: 100),
      type: DriftSqlType.string,
      requiredDuringInsert: true);
  static const VerificationMeta _staffCodeMeta =
      const VerificationMeta('staffCode');
  @override
  late final GeneratedColumn<String> staffCode = GeneratedColumn<String>(
      'staff_code', aliasedName, false,
      additionalChecks:
          GeneratedColumn.checkTextLength(minTextLength: 4, maxTextLength: 4),
      type: DriftSqlType.string,
      requiredDuringInsert: true);
  static const VerificationMeta _isActiveMeta =
      const VerificationMeta('isActive');
  @override
  late final GeneratedColumn<bool> isActive = GeneratedColumn<bool>(
      'is_active', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_active" IN (0, 1))'),
      defaultValue: const Constant(true));
  static const VerificationMeta _syncIdMeta = const VerificationMeta('syncId');
  @override
  late final GeneratedColumn<String> syncId = GeneratedColumn<String>(
      'sync_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _deviceIdMeta =
      const VerificationMeta('deviceId');
  @override
  late final GeneratedColumn<String> deviceId = GeneratedColumn<String>(
      'device_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _isDeletedMeta =
      const VerificationMeta('isDeleted');
  @override
  late final GeneratedColumn<bool> isDeleted = GeneratedColumn<bool>(
      'is_deleted', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_deleted" IN (0, 1))'),
      defaultValue: const Constant(false));
  @override
  List<GeneratedColumn> get $columns => [
        id,
        name,
        staffCode,
        isActive,
        syncId,
        updatedAt,
        createdAt,
        deviceId,
        isDeleted
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'staff';
  @override
  VerificationContext validateIntegrity(Insertable<StaffTable> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('name')) {
      context.handle(
          _nameMeta, name.isAcceptableOrUnknown(data['name']!, _nameMeta));
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('staff_code')) {
      context.handle(_staffCodeMeta,
          staffCode.isAcceptableOrUnknown(data['staff_code']!, _staffCodeMeta));
    } else if (isInserting) {
      context.missing(_staffCodeMeta);
    }
    if (data.containsKey('is_active')) {
      context.handle(_isActiveMeta,
          isActive.isAcceptableOrUnknown(data['is_active']!, _isActiveMeta));
    }
    if (data.containsKey('sync_id')) {
      context.handle(_syncIdMeta,
          syncId.isAcceptableOrUnknown(data['sync_id']!, _syncIdMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('device_id')) {
      context.handle(_deviceIdMeta,
          deviceId.isAcceptableOrUnknown(data['device_id']!, _deviceIdMeta));
    }
    if (data.containsKey('is_deleted')) {
      context.handle(_isDeletedMeta,
          isDeleted.isAcceptableOrUnknown(data['is_deleted']!, _isDeletedMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  StaffTable map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return StaffTable(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      name: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}name'])!,
      staffCode: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}staff_code'])!,
      isActive: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_active'])!,
      syncId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sync_id']),
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at']),
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at']),
      deviceId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}device_id']),
      isDeleted: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_deleted'])!,
    );
  }

  @override
  $StaffTable createAlias(String alias) {
    return $StaffTable(attachedDatabase, alias);
  }
}

class StaffTable extends DataClass implements Insertable<StaffTable> {
  final int id;
  final String name;
  final String staffCode;
  final bool isActive;
  final String? syncId;
  final DateTime? updatedAt;
  final DateTime? createdAt;
  final String? deviceId;
  final bool isDeleted;
  const StaffTable(
      {required this.id,
      required this.name,
      required this.staffCode,
      required this.isActive,
      this.syncId,
      this.updatedAt,
      this.createdAt,
      this.deviceId,
      required this.isDeleted});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['name'] = Variable<String>(name);
    map['staff_code'] = Variable<String>(staffCode);
    map['is_active'] = Variable<bool>(isActive);
    if (!nullToAbsent || syncId != null) {
      map['sync_id'] = Variable<String>(syncId);
    }
    if (!nullToAbsent || updatedAt != null) {
      map['updated_at'] = Variable<DateTime>(updatedAt);
    }
    if (!nullToAbsent || createdAt != null) {
      map['created_at'] = Variable<DateTime>(createdAt);
    }
    if (!nullToAbsent || deviceId != null) {
      map['device_id'] = Variable<String>(deviceId);
    }
    map['is_deleted'] = Variable<bool>(isDeleted);
    return map;
  }

  StaffCompanion toCompanion(bool nullToAbsent) {
    return StaffCompanion(
      id: Value(id),
      name: Value(name),
      staffCode: Value(staffCode),
      isActive: Value(isActive),
      syncId:
          syncId == null && nullToAbsent ? const Value.absent() : Value(syncId),
      updatedAt: updatedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(updatedAt),
      createdAt: createdAt == null && nullToAbsent
          ? const Value.absent()
          : Value(createdAt),
      deviceId: deviceId == null && nullToAbsent
          ? const Value.absent()
          : Value(deviceId),
      isDeleted: Value(isDeleted),
    );
  }

  factory StaffTable.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return StaffTable(
      id: serializer.fromJson<int>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      staffCode: serializer.fromJson<String>(json['staffCode']),
      isActive: serializer.fromJson<bool>(json['isActive']),
      syncId: serializer.fromJson<String?>(json['syncId']),
      updatedAt: serializer.fromJson<DateTime?>(json['updatedAt']),
      createdAt: serializer.fromJson<DateTime?>(json['createdAt']),
      deviceId: serializer.fromJson<String?>(json['deviceId']),
      isDeleted: serializer.fromJson<bool>(json['isDeleted']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'name': serializer.toJson<String>(name),
      'staffCode': serializer.toJson<String>(staffCode),
      'isActive': serializer.toJson<bool>(isActive),
      'syncId': serializer.toJson<String?>(syncId),
      'updatedAt': serializer.toJson<DateTime?>(updatedAt),
      'createdAt': serializer.toJson<DateTime?>(createdAt),
      'deviceId': serializer.toJson<String?>(deviceId),
      'isDeleted': serializer.toJson<bool>(isDeleted),
    };
  }

  StaffTable copyWith(
          {int? id,
          String? name,
          String? staffCode,
          bool? isActive,
          Value<String?> syncId = const Value.absent(),
          Value<DateTime?> updatedAt = const Value.absent(),
          Value<DateTime?> createdAt = const Value.absent(),
          Value<String?> deviceId = const Value.absent(),
          bool? isDeleted}) =>
      StaffTable(
        id: id ?? this.id,
        name: name ?? this.name,
        staffCode: staffCode ?? this.staffCode,
        isActive: isActive ?? this.isActive,
        syncId: syncId.present ? syncId.value : this.syncId,
        updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
        createdAt: createdAt.present ? createdAt.value : this.createdAt,
        deviceId: deviceId.present ? deviceId.value : this.deviceId,
        isDeleted: isDeleted ?? this.isDeleted,
      );
  StaffTable copyWithCompanion(StaffCompanion data) {
    return StaffTable(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      staffCode: data.staffCode.present ? data.staffCode.value : this.staffCode,
      isActive: data.isActive.present ? data.isActive.value : this.isActive,
      syncId: data.syncId.present ? data.syncId.value : this.syncId,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      deviceId: data.deviceId.present ? data.deviceId.value : this.deviceId,
      isDeleted: data.isDeleted.present ? data.isDeleted.value : this.isDeleted,
    );
  }

  @override
  String toString() {
    return (StringBuffer('StaffTable(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('staffCode: $staffCode, ')
          ..write('isActive: $isActive, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, name, staffCode, isActive, syncId,
      updatedAt, createdAt, deviceId, isDeleted);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is StaffTable &&
          other.id == this.id &&
          other.name == this.name &&
          other.staffCode == this.staffCode &&
          other.isActive == this.isActive &&
          other.syncId == this.syncId &&
          other.updatedAt == this.updatedAt &&
          other.createdAt == this.createdAt &&
          other.deviceId == this.deviceId &&
          other.isDeleted == this.isDeleted);
}

class StaffCompanion extends UpdateCompanion<StaffTable> {
  final Value<int> id;
  final Value<String> name;
  final Value<String> staffCode;
  final Value<bool> isActive;
  final Value<String?> syncId;
  final Value<DateTime?> updatedAt;
  final Value<DateTime?> createdAt;
  final Value<String?> deviceId;
  final Value<bool> isDeleted;
  const StaffCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.staffCode = const Value.absent(),
    this.isActive = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  });
  StaffCompanion.insert({
    this.id = const Value.absent(),
    required String name,
    required String staffCode,
    this.isActive = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  })  : name = Value(name),
        staffCode = Value(staffCode);
  static Insertable<StaffTable> custom({
    Expression<int>? id,
    Expression<String>? name,
    Expression<String>? staffCode,
    Expression<bool>? isActive,
    Expression<String>? syncId,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? createdAt,
    Expression<String>? deviceId,
    Expression<bool>? isDeleted,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (staffCode != null) 'staff_code': staffCode,
      if (isActive != null) 'is_active': isActive,
      if (syncId != null) 'sync_id': syncId,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (createdAt != null) 'created_at': createdAt,
      if (deviceId != null) 'device_id': deviceId,
      if (isDeleted != null) 'is_deleted': isDeleted,
    });
  }

  StaffCompanion copyWith(
      {Value<int>? id,
      Value<String>? name,
      Value<String>? staffCode,
      Value<bool>? isActive,
      Value<String?>? syncId,
      Value<DateTime?>? updatedAt,
      Value<DateTime?>? createdAt,
      Value<String?>? deviceId,
      Value<bool>? isDeleted}) {
    return StaffCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      staffCode: staffCode ?? this.staffCode,
      isActive: isActive ?? this.isActive,
      syncId: syncId ?? this.syncId,
      updatedAt: updatedAt ?? this.updatedAt,
      createdAt: createdAt ?? this.createdAt,
      deviceId: deviceId ?? this.deviceId,
      isDeleted: isDeleted ?? this.isDeleted,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (staffCode.present) {
      map['staff_code'] = Variable<String>(staffCode.value);
    }
    if (isActive.present) {
      map['is_active'] = Variable<bool>(isActive.value);
    }
    if (syncId.present) {
      map['sync_id'] = Variable<String>(syncId.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (deviceId.present) {
      map['device_id'] = Variable<String>(deviceId.value);
    }
    if (isDeleted.present) {
      map['is_deleted'] = Variable<bool>(isDeleted.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('StaffCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('staffCode: $staffCode, ')
          ..write('isActive: $isActive, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted')
          ..write(')'))
        .toString();
  }
}

class $SyncMetaTable extends SyncMeta
    with TableInfo<$SyncMetaTable, SyncMetaTable> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SyncMetaTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _deviceIdMeta =
      const VerificationMeta('deviceId');
  @override
  late final GeneratedColumn<String> deviceId = GeneratedColumn<String>(
      'device_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _deviceNameMeta =
      const VerificationMeta('deviceName');
  @override
  late final GeneratedColumn<String> deviceName = GeneratedColumn<String>(
      'device_name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _isMasterMeta =
      const VerificationMeta('isMaster');
  @override
  late final GeneratedColumn<bool> isMaster = GeneratedColumn<bool>(
      'is_master', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_master" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _secretTokenMeta =
      const VerificationMeta('secretToken');
  @override
  late final GeneratedColumn<String> secretToken = GeneratedColumn<String>(
      'secret_token', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _lastSyncTimeMeta =
      const VerificationMeta('lastSyncTime');
  @override
  late final GeneratedColumn<DateTime> lastSyncTime = GeneratedColumn<DateTime>(
      'last_sync_time', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns =>
      [id, deviceId, deviceName, isMaster, secretToken, lastSyncTime];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'sync_meta';
  @override
  VerificationContext validateIntegrity(Insertable<SyncMetaTable> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('device_id')) {
      context.handle(_deviceIdMeta,
          deviceId.isAcceptableOrUnknown(data['device_id']!, _deviceIdMeta));
    } else if (isInserting) {
      context.missing(_deviceIdMeta);
    }
    if (data.containsKey('device_name')) {
      context.handle(
          _deviceNameMeta,
          deviceName.isAcceptableOrUnknown(
              data['device_name']!, _deviceNameMeta));
    } else if (isInserting) {
      context.missing(_deviceNameMeta);
    }
    if (data.containsKey('is_master')) {
      context.handle(_isMasterMeta,
          isMaster.isAcceptableOrUnknown(data['is_master']!, _isMasterMeta));
    }
    if (data.containsKey('secret_token')) {
      context.handle(
          _secretTokenMeta,
          secretToken.isAcceptableOrUnknown(
              data['secret_token']!, _secretTokenMeta));
    }
    if (data.containsKey('last_sync_time')) {
      context.handle(
          _lastSyncTimeMeta,
          lastSyncTime.isAcceptableOrUnknown(
              data['last_sync_time']!, _lastSyncTimeMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  SyncMetaTable map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return SyncMetaTable(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      deviceId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}device_id'])!,
      deviceName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}device_name'])!,
      isMaster: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_master'])!,
      secretToken: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}secret_token']),
      lastSyncTime: attachedDatabase.typeMapping.read(
          DriftSqlType.dateTime, data['${effectivePrefix}last_sync_time']),
    );
  }

  @override
  $SyncMetaTable createAlias(String alias) {
    return $SyncMetaTable(attachedDatabase, alias);
  }
}

class SyncMetaTable extends DataClass implements Insertable<SyncMetaTable> {
  final int id;
  final String deviceId;
  final String deviceName;
  final bool isMaster;
  final String? secretToken;
  final DateTime? lastSyncTime;
  const SyncMetaTable(
      {required this.id,
      required this.deviceId,
      required this.deviceName,
      required this.isMaster,
      this.secretToken,
      this.lastSyncTime});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['device_id'] = Variable<String>(deviceId);
    map['device_name'] = Variable<String>(deviceName);
    map['is_master'] = Variable<bool>(isMaster);
    if (!nullToAbsent || secretToken != null) {
      map['secret_token'] = Variable<String>(secretToken);
    }
    if (!nullToAbsent || lastSyncTime != null) {
      map['last_sync_time'] = Variable<DateTime>(lastSyncTime);
    }
    return map;
  }

  SyncMetaCompanion toCompanion(bool nullToAbsent) {
    return SyncMetaCompanion(
      id: Value(id),
      deviceId: Value(deviceId),
      deviceName: Value(deviceName),
      isMaster: Value(isMaster),
      secretToken: secretToken == null && nullToAbsent
          ? const Value.absent()
          : Value(secretToken),
      lastSyncTime: lastSyncTime == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncTime),
    );
  }

  factory SyncMetaTable.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return SyncMetaTable(
      id: serializer.fromJson<int>(json['id']),
      deviceId: serializer.fromJson<String>(json['deviceId']),
      deviceName: serializer.fromJson<String>(json['deviceName']),
      isMaster: serializer.fromJson<bool>(json['isMaster']),
      secretToken: serializer.fromJson<String?>(json['secretToken']),
      lastSyncTime: serializer.fromJson<DateTime?>(json['lastSyncTime']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'deviceId': serializer.toJson<String>(deviceId),
      'deviceName': serializer.toJson<String>(deviceName),
      'isMaster': serializer.toJson<bool>(isMaster),
      'secretToken': serializer.toJson<String?>(secretToken),
      'lastSyncTime': serializer.toJson<DateTime?>(lastSyncTime),
    };
  }

  SyncMetaTable copyWith(
          {int? id,
          String? deviceId,
          String? deviceName,
          bool? isMaster,
          Value<String?> secretToken = const Value.absent(),
          Value<DateTime?> lastSyncTime = const Value.absent()}) =>
      SyncMetaTable(
        id: id ?? this.id,
        deviceId: deviceId ?? this.deviceId,
        deviceName: deviceName ?? this.deviceName,
        isMaster: isMaster ?? this.isMaster,
        secretToken: secretToken.present ? secretToken.value : this.secretToken,
        lastSyncTime:
            lastSyncTime.present ? lastSyncTime.value : this.lastSyncTime,
      );
  SyncMetaTable copyWithCompanion(SyncMetaCompanion data) {
    return SyncMetaTable(
      id: data.id.present ? data.id.value : this.id,
      deviceId: data.deviceId.present ? data.deviceId.value : this.deviceId,
      deviceName:
          data.deviceName.present ? data.deviceName.value : this.deviceName,
      isMaster: data.isMaster.present ? data.isMaster.value : this.isMaster,
      secretToken:
          data.secretToken.present ? data.secretToken.value : this.secretToken,
      lastSyncTime: data.lastSyncTime.present
          ? data.lastSyncTime.value
          : this.lastSyncTime,
    );
  }

  @override
  String toString() {
    return (StringBuffer('SyncMetaTable(')
          ..write('id: $id, ')
          ..write('deviceId: $deviceId, ')
          ..write('deviceName: $deviceName, ')
          ..write('isMaster: $isMaster, ')
          ..write('secretToken: $secretToken, ')
          ..write('lastSyncTime: $lastSyncTime')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id, deviceId, deviceName, isMaster, secretToken, lastSyncTime);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is SyncMetaTable &&
          other.id == this.id &&
          other.deviceId == this.deviceId &&
          other.deviceName == this.deviceName &&
          other.isMaster == this.isMaster &&
          other.secretToken == this.secretToken &&
          other.lastSyncTime == this.lastSyncTime);
}

class SyncMetaCompanion extends UpdateCompanion<SyncMetaTable> {
  final Value<int> id;
  final Value<String> deviceId;
  final Value<String> deviceName;
  final Value<bool> isMaster;
  final Value<String?> secretToken;
  final Value<DateTime?> lastSyncTime;
  const SyncMetaCompanion({
    this.id = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.deviceName = const Value.absent(),
    this.isMaster = const Value.absent(),
    this.secretToken = const Value.absent(),
    this.lastSyncTime = const Value.absent(),
  });
  SyncMetaCompanion.insert({
    this.id = const Value.absent(),
    required String deviceId,
    required String deviceName,
    this.isMaster = const Value.absent(),
    this.secretToken = const Value.absent(),
    this.lastSyncTime = const Value.absent(),
  })  : deviceId = Value(deviceId),
        deviceName = Value(deviceName);
  static Insertable<SyncMetaTable> custom({
    Expression<int>? id,
    Expression<String>? deviceId,
    Expression<String>? deviceName,
    Expression<bool>? isMaster,
    Expression<String>? secretToken,
    Expression<DateTime>? lastSyncTime,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (deviceId != null) 'device_id': deviceId,
      if (deviceName != null) 'device_name': deviceName,
      if (isMaster != null) 'is_master': isMaster,
      if (secretToken != null) 'secret_token': secretToken,
      if (lastSyncTime != null) 'last_sync_time': lastSyncTime,
    });
  }

  SyncMetaCompanion copyWith(
      {Value<int>? id,
      Value<String>? deviceId,
      Value<String>? deviceName,
      Value<bool>? isMaster,
      Value<String?>? secretToken,
      Value<DateTime?>? lastSyncTime}) {
    return SyncMetaCompanion(
      id: id ?? this.id,
      deviceId: deviceId ?? this.deviceId,
      deviceName: deviceName ?? this.deviceName,
      isMaster: isMaster ?? this.isMaster,
      secretToken: secretToken ?? this.secretToken,
      lastSyncTime: lastSyncTime ?? this.lastSyncTime,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (deviceId.present) {
      map['device_id'] = Variable<String>(deviceId.value);
    }
    if (deviceName.present) {
      map['device_name'] = Variable<String>(deviceName.value);
    }
    if (isMaster.present) {
      map['is_master'] = Variable<bool>(isMaster.value);
    }
    if (secretToken.present) {
      map['secret_token'] = Variable<String>(secretToken.value);
    }
    if (lastSyncTime.present) {
      map['last_sync_time'] = Variable<DateTime>(lastSyncTime.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SyncMetaCompanion(')
          ..write('id: $id, ')
          ..write('deviceId: $deviceId, ')
          ..write('deviceName: $deviceName, ')
          ..write('isMaster: $isMaster, ')
          ..write('secretToken: $secretToken, ')
          ..write('lastSyncTime: $lastSyncTime')
          ..write(')'))
        .toString();
  }
}

class $StockIncrementsTable extends StockIncrements
    with TableInfo<$StockIncrementsTable, StockIncrementTable> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $StockIncrementsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _itemIdMeta = const VerificationMeta('itemId');
  @override
  late final GeneratedColumn<int> itemId = GeneratedColumn<int>(
      'item_id', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: true,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('REFERENCES items (id)'));
  static const VerificationMeta _quantityAddedMeta =
      const VerificationMeta('quantityAdded');
  @override
  late final GeneratedColumn<int> quantityAdded = GeneratedColumn<int>(
      'quantity_added', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _quantityBeforeMeta =
      const VerificationMeta('quantityBefore');
  @override
  late final GeneratedColumn<int> quantityBefore = GeneratedColumn<int>(
      'quantity_before', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _quantityAfterMeta =
      const VerificationMeta('quantityAfter');
  @override
  late final GeneratedColumn<int> quantityAfter = GeneratedColumn<int>(
      'quantity_after', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _dateAddedMeta =
      const VerificationMeta('dateAdded');
  @override
  late final GeneratedColumn<DateTime> dateAdded = GeneratedColumn<DateTime>(
      'date_added', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  static const VerificationMeta _remarksMeta =
      const VerificationMeta('remarks');
  @override
  late final GeneratedColumn<String> remarks = GeneratedColumn<String>(
      'remarks', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _syncIdMeta = const VerificationMeta('syncId');
  @override
  late final GeneratedColumn<String> syncId = GeneratedColumn<String>(
      'sync_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _deviceIdMeta =
      const VerificationMeta('deviceId');
  @override
  late final GeneratedColumn<String> deviceId = GeneratedColumn<String>(
      'device_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _isDeletedMeta =
      const VerificationMeta('isDeleted');
  @override
  late final GeneratedColumn<bool> isDeleted = GeneratedColumn<bool>(
      'is_deleted', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_deleted" IN (0, 1))'),
      defaultValue: const Constant(false));
  @override
  List<GeneratedColumn> get $columns => [
        id,
        itemId,
        quantityAdded,
        quantityBefore,
        quantityAfter,
        dateAdded,
        remarks,
        syncId,
        updatedAt,
        createdAt,
        deviceId,
        isDeleted
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'stock_increments';
  @override
  VerificationContext validateIntegrity(
      Insertable<StockIncrementTable> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('item_id')) {
      context.handle(_itemIdMeta,
          itemId.isAcceptableOrUnknown(data['item_id']!, _itemIdMeta));
    } else if (isInserting) {
      context.missing(_itemIdMeta);
    }
    if (data.containsKey('quantity_added')) {
      context.handle(
          _quantityAddedMeta,
          quantityAdded.isAcceptableOrUnknown(
              data['quantity_added']!, _quantityAddedMeta));
    } else if (isInserting) {
      context.missing(_quantityAddedMeta);
    }
    if (data.containsKey('quantity_before')) {
      context.handle(
          _quantityBeforeMeta,
          quantityBefore.isAcceptableOrUnknown(
              data['quantity_before']!, _quantityBeforeMeta));
    }
    if (data.containsKey('quantity_after')) {
      context.handle(
          _quantityAfterMeta,
          quantityAfter.isAcceptableOrUnknown(
              data['quantity_after']!, _quantityAfterMeta));
    }
    if (data.containsKey('date_added')) {
      context.handle(_dateAddedMeta,
          dateAdded.isAcceptableOrUnknown(data['date_added']!, _dateAddedMeta));
    }
    if (data.containsKey('remarks')) {
      context.handle(_remarksMeta,
          remarks.isAcceptableOrUnknown(data['remarks']!, _remarksMeta));
    }
    if (data.containsKey('sync_id')) {
      context.handle(_syncIdMeta,
          syncId.isAcceptableOrUnknown(data['sync_id']!, _syncIdMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('device_id')) {
      context.handle(_deviceIdMeta,
          deviceId.isAcceptableOrUnknown(data['device_id']!, _deviceIdMeta));
    }
    if (data.containsKey('is_deleted')) {
      context.handle(_isDeletedMeta,
          isDeleted.isAcceptableOrUnknown(data['is_deleted']!, _isDeletedMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  StockIncrementTable map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return StockIncrementTable(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      itemId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}item_id'])!,
      quantityAdded: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}quantity_added'])!,
      quantityBefore: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}quantity_before'])!,
      quantityAfter: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}quantity_after'])!,
      dateAdded: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}date_added'])!,
      remarks: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}remarks']),
      syncId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sync_id']),
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at']),
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at']),
      deviceId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}device_id']),
      isDeleted: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_deleted'])!,
    );
  }

  @override
  $StockIncrementsTable createAlias(String alias) {
    return $StockIncrementsTable(attachedDatabase, alias);
  }
}

class StockIncrementTable extends DataClass
    implements Insertable<StockIncrementTable> {
  final int id;
  final int itemId;
  final int quantityAdded;
  final int quantityBefore;
  final int quantityAfter;
  final DateTime dateAdded;
  final String? remarks;
  final String? syncId;
  final DateTime? updatedAt;
  final DateTime? createdAt;
  final String? deviceId;
  final bool isDeleted;
  const StockIncrementTable(
      {required this.id,
      required this.itemId,
      required this.quantityAdded,
      required this.quantityBefore,
      required this.quantityAfter,
      required this.dateAdded,
      this.remarks,
      this.syncId,
      this.updatedAt,
      this.createdAt,
      this.deviceId,
      required this.isDeleted});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['item_id'] = Variable<int>(itemId);
    map['quantity_added'] = Variable<int>(quantityAdded);
    map['quantity_before'] = Variable<int>(quantityBefore);
    map['quantity_after'] = Variable<int>(quantityAfter);
    map['date_added'] = Variable<DateTime>(dateAdded);
    if (!nullToAbsent || remarks != null) {
      map['remarks'] = Variable<String>(remarks);
    }
    if (!nullToAbsent || syncId != null) {
      map['sync_id'] = Variable<String>(syncId);
    }
    if (!nullToAbsent || updatedAt != null) {
      map['updated_at'] = Variable<DateTime>(updatedAt);
    }
    if (!nullToAbsent || createdAt != null) {
      map['created_at'] = Variable<DateTime>(createdAt);
    }
    if (!nullToAbsent || deviceId != null) {
      map['device_id'] = Variable<String>(deviceId);
    }
    map['is_deleted'] = Variable<bool>(isDeleted);
    return map;
  }

  StockIncrementsCompanion toCompanion(bool nullToAbsent) {
    return StockIncrementsCompanion(
      id: Value(id),
      itemId: Value(itemId),
      quantityAdded: Value(quantityAdded),
      quantityBefore: Value(quantityBefore),
      quantityAfter: Value(quantityAfter),
      dateAdded: Value(dateAdded),
      remarks: remarks == null && nullToAbsent
          ? const Value.absent()
          : Value(remarks),
      syncId:
          syncId == null && nullToAbsent ? const Value.absent() : Value(syncId),
      updatedAt: updatedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(updatedAt),
      createdAt: createdAt == null && nullToAbsent
          ? const Value.absent()
          : Value(createdAt),
      deviceId: deviceId == null && nullToAbsent
          ? const Value.absent()
          : Value(deviceId),
      isDeleted: Value(isDeleted),
    );
  }

  factory StockIncrementTable.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return StockIncrementTable(
      id: serializer.fromJson<int>(json['id']),
      itemId: serializer.fromJson<int>(json['itemId']),
      quantityAdded: serializer.fromJson<int>(json['quantityAdded']),
      quantityBefore: serializer.fromJson<int>(json['quantityBefore']),
      quantityAfter: serializer.fromJson<int>(json['quantityAfter']),
      dateAdded: serializer.fromJson<DateTime>(json['dateAdded']),
      remarks: serializer.fromJson<String?>(json['remarks']),
      syncId: serializer.fromJson<String?>(json['syncId']),
      updatedAt: serializer.fromJson<DateTime?>(json['updatedAt']),
      createdAt: serializer.fromJson<DateTime?>(json['createdAt']),
      deviceId: serializer.fromJson<String?>(json['deviceId']),
      isDeleted: serializer.fromJson<bool>(json['isDeleted']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'itemId': serializer.toJson<int>(itemId),
      'quantityAdded': serializer.toJson<int>(quantityAdded),
      'quantityBefore': serializer.toJson<int>(quantityBefore),
      'quantityAfter': serializer.toJson<int>(quantityAfter),
      'dateAdded': serializer.toJson<DateTime>(dateAdded),
      'remarks': serializer.toJson<String?>(remarks),
      'syncId': serializer.toJson<String?>(syncId),
      'updatedAt': serializer.toJson<DateTime?>(updatedAt),
      'createdAt': serializer.toJson<DateTime?>(createdAt),
      'deviceId': serializer.toJson<String?>(deviceId),
      'isDeleted': serializer.toJson<bool>(isDeleted),
    };
  }

  StockIncrementTable copyWith(
          {int? id,
          int? itemId,
          int? quantityAdded,
          int? quantityBefore,
          int? quantityAfter,
          DateTime? dateAdded,
          Value<String?> remarks = const Value.absent(),
          Value<String?> syncId = const Value.absent(),
          Value<DateTime?> updatedAt = const Value.absent(),
          Value<DateTime?> createdAt = const Value.absent(),
          Value<String?> deviceId = const Value.absent(),
          bool? isDeleted}) =>
      StockIncrementTable(
        id: id ?? this.id,
        itemId: itemId ?? this.itemId,
        quantityAdded: quantityAdded ?? this.quantityAdded,
        quantityBefore: quantityBefore ?? this.quantityBefore,
        quantityAfter: quantityAfter ?? this.quantityAfter,
        dateAdded: dateAdded ?? this.dateAdded,
        remarks: remarks.present ? remarks.value : this.remarks,
        syncId: syncId.present ? syncId.value : this.syncId,
        updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
        createdAt: createdAt.present ? createdAt.value : this.createdAt,
        deviceId: deviceId.present ? deviceId.value : this.deviceId,
        isDeleted: isDeleted ?? this.isDeleted,
      );
  StockIncrementTable copyWithCompanion(StockIncrementsCompanion data) {
    return StockIncrementTable(
      id: data.id.present ? data.id.value : this.id,
      itemId: data.itemId.present ? data.itemId.value : this.itemId,
      quantityAdded: data.quantityAdded.present
          ? data.quantityAdded.value
          : this.quantityAdded,
      quantityBefore: data.quantityBefore.present
          ? data.quantityBefore.value
          : this.quantityBefore,
      quantityAfter: data.quantityAfter.present
          ? data.quantityAfter.value
          : this.quantityAfter,
      dateAdded: data.dateAdded.present ? data.dateAdded.value : this.dateAdded,
      remarks: data.remarks.present ? data.remarks.value : this.remarks,
      syncId: data.syncId.present ? data.syncId.value : this.syncId,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      deviceId: data.deviceId.present ? data.deviceId.value : this.deviceId,
      isDeleted: data.isDeleted.present ? data.isDeleted.value : this.isDeleted,
    );
  }

  @override
  String toString() {
    return (StringBuffer('StockIncrementTable(')
          ..write('id: $id, ')
          ..write('itemId: $itemId, ')
          ..write('quantityAdded: $quantityAdded, ')
          ..write('quantityBefore: $quantityBefore, ')
          ..write('quantityAfter: $quantityAfter, ')
          ..write('dateAdded: $dateAdded, ')
          ..write('remarks: $remarks, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      itemId,
      quantityAdded,
      quantityBefore,
      quantityAfter,
      dateAdded,
      remarks,
      syncId,
      updatedAt,
      createdAt,
      deviceId,
      isDeleted);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is StockIncrementTable &&
          other.id == this.id &&
          other.itemId == this.itemId &&
          other.quantityAdded == this.quantityAdded &&
          other.quantityBefore == this.quantityBefore &&
          other.quantityAfter == this.quantityAfter &&
          other.dateAdded == this.dateAdded &&
          other.remarks == this.remarks &&
          other.syncId == this.syncId &&
          other.updatedAt == this.updatedAt &&
          other.createdAt == this.createdAt &&
          other.deviceId == this.deviceId &&
          other.isDeleted == this.isDeleted);
}

class StockIncrementsCompanion extends UpdateCompanion<StockIncrementTable> {
  final Value<int> id;
  final Value<int> itemId;
  final Value<int> quantityAdded;
  final Value<int> quantityBefore;
  final Value<int> quantityAfter;
  final Value<DateTime> dateAdded;
  final Value<String?> remarks;
  final Value<String?> syncId;
  final Value<DateTime?> updatedAt;
  final Value<DateTime?> createdAt;
  final Value<String?> deviceId;
  final Value<bool> isDeleted;
  const StockIncrementsCompanion({
    this.id = const Value.absent(),
    this.itemId = const Value.absent(),
    this.quantityAdded = const Value.absent(),
    this.quantityBefore = const Value.absent(),
    this.quantityAfter = const Value.absent(),
    this.dateAdded = const Value.absent(),
    this.remarks = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  });
  StockIncrementsCompanion.insert({
    this.id = const Value.absent(),
    required int itemId,
    required int quantityAdded,
    this.quantityBefore = const Value.absent(),
    this.quantityAfter = const Value.absent(),
    this.dateAdded = const Value.absent(),
    this.remarks = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  })  : itemId = Value(itemId),
        quantityAdded = Value(quantityAdded);
  static Insertable<StockIncrementTable> custom({
    Expression<int>? id,
    Expression<int>? itemId,
    Expression<int>? quantityAdded,
    Expression<int>? quantityBefore,
    Expression<int>? quantityAfter,
    Expression<DateTime>? dateAdded,
    Expression<String>? remarks,
    Expression<String>? syncId,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? createdAt,
    Expression<String>? deviceId,
    Expression<bool>? isDeleted,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (itemId != null) 'item_id': itemId,
      if (quantityAdded != null) 'quantity_added': quantityAdded,
      if (quantityBefore != null) 'quantity_before': quantityBefore,
      if (quantityAfter != null) 'quantity_after': quantityAfter,
      if (dateAdded != null) 'date_added': dateAdded,
      if (remarks != null) 'remarks': remarks,
      if (syncId != null) 'sync_id': syncId,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (createdAt != null) 'created_at': createdAt,
      if (deviceId != null) 'device_id': deviceId,
      if (isDeleted != null) 'is_deleted': isDeleted,
    });
  }

  StockIncrementsCompanion copyWith(
      {Value<int>? id,
      Value<int>? itemId,
      Value<int>? quantityAdded,
      Value<int>? quantityBefore,
      Value<int>? quantityAfter,
      Value<DateTime>? dateAdded,
      Value<String?>? remarks,
      Value<String?>? syncId,
      Value<DateTime?>? updatedAt,
      Value<DateTime?>? createdAt,
      Value<String?>? deviceId,
      Value<bool>? isDeleted}) {
    return StockIncrementsCompanion(
      id: id ?? this.id,
      itemId: itemId ?? this.itemId,
      quantityAdded: quantityAdded ?? this.quantityAdded,
      quantityBefore: quantityBefore ?? this.quantityBefore,
      quantityAfter: quantityAfter ?? this.quantityAfter,
      dateAdded: dateAdded ?? this.dateAdded,
      remarks: remarks ?? this.remarks,
      syncId: syncId ?? this.syncId,
      updatedAt: updatedAt ?? this.updatedAt,
      createdAt: createdAt ?? this.createdAt,
      deviceId: deviceId ?? this.deviceId,
      isDeleted: isDeleted ?? this.isDeleted,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (itemId.present) {
      map['item_id'] = Variable<int>(itemId.value);
    }
    if (quantityAdded.present) {
      map['quantity_added'] = Variable<int>(quantityAdded.value);
    }
    if (quantityBefore.present) {
      map['quantity_before'] = Variable<int>(quantityBefore.value);
    }
    if (quantityAfter.present) {
      map['quantity_after'] = Variable<int>(quantityAfter.value);
    }
    if (dateAdded.present) {
      map['date_added'] = Variable<DateTime>(dateAdded.value);
    }
    if (remarks.present) {
      map['remarks'] = Variable<String>(remarks.value);
    }
    if (syncId.present) {
      map['sync_id'] = Variable<String>(syncId.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (deviceId.present) {
      map['device_id'] = Variable<String>(deviceId.value);
    }
    if (isDeleted.present) {
      map['is_deleted'] = Variable<bool>(isDeleted.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('StockIncrementsCompanion(')
          ..write('id: $id, ')
          ..write('itemId: $itemId, ')
          ..write('quantityAdded: $quantityAdded, ')
          ..write('quantityBefore: $quantityBefore, ')
          ..write('quantityAfter: $quantityAfter, ')
          ..write('dateAdded: $dateAdded, ')
          ..write('remarks: $remarks, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $CategoriesTable categories = $CategoriesTable(this);
  late final $ItemsTable items = $ItemsTable(this);
  late final $InvoicesTable invoices = $InvoicesTable(this);
  late final $InvoiceItemsTable invoiceItems = $InvoiceItemsTable(this);
  late final $SettingsTable settings = $SettingsTable(this);
  late final $LicenseHistoryTable licenseHistory = $LicenseHistoryTable(this);
  late final $StaffTable staff = $StaffTable(this);
  late final $SyncMetaTable syncMeta = $SyncMetaTable(this);
  late final $StockIncrementsTable stockIncrements =
      $StockIncrementsTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
        categories,
        items,
        invoices,
        invoiceItems,
        settings,
        licenseHistory,
        staff,
        syncMeta,
        stockIncrements
      ];
}

typedef $$CategoriesTableCreateCompanionBuilder = CategoriesCompanion Function({
  Value<int> id,
  required String name,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});
typedef $$CategoriesTableUpdateCompanionBuilder = CategoriesCompanion Function({
  Value<int> id,
  Value<String> name,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});

final class $$CategoriesTableReferences
    extends BaseReferences<_$AppDatabase, $CategoriesTable, CategoryTable> {
  $$CategoriesTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static MultiTypedResultKey<$ItemsTable, List<ItemTable>> _itemsRefsTable(
          _$AppDatabase db) =>
      MultiTypedResultKey.fromTable(db.items,
          aliasName:
              $_aliasNameGenerator(db.categories.id, db.items.categoryId));

  $$ItemsTableProcessedTableManager get itemsRefs {
    final manager = $$ItemsTableTableManager($_db, $_db.items)
        .filter((f) => f.categoryId.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(_itemsRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }
}

class $$CategoriesTableFilterComposer
    extends Composer<_$AppDatabase, $CategoriesTable> {
  $$CategoriesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get syncId => $composableBuilder(
      column: $table.syncId, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get deviceId => $composableBuilder(
      column: $table.deviceId, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isDeleted => $composableBuilder(
      column: $table.isDeleted, builder: (column) => ColumnFilters(column));

  Expression<bool> itemsRefs(
      Expression<bool> Function($$ItemsTableFilterComposer f) f) {
    final $$ItemsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.items,
        getReferencedColumn: (t) => t.categoryId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ItemsTableFilterComposer(
              $db: $db,
              $table: $db.items,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$CategoriesTableOrderingComposer
    extends Composer<_$AppDatabase, $CategoriesTable> {
  $$CategoriesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get syncId => $composableBuilder(
      column: $table.syncId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get deviceId => $composableBuilder(
      column: $table.deviceId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isDeleted => $composableBuilder(
      column: $table.isDeleted, builder: (column) => ColumnOrderings(column));
}

class $$CategoriesTableAnnotationComposer
    extends Composer<_$AppDatabase, $CategoriesTable> {
  $$CategoriesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get syncId =>
      $composableBuilder(column: $table.syncId, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<String> get deviceId =>
      $composableBuilder(column: $table.deviceId, builder: (column) => column);

  GeneratedColumn<bool> get isDeleted =>
      $composableBuilder(column: $table.isDeleted, builder: (column) => column);

  Expression<T> itemsRefs<T extends Object>(
      Expression<T> Function($$ItemsTableAnnotationComposer a) f) {
    final $$ItemsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.items,
        getReferencedColumn: (t) => t.categoryId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ItemsTableAnnotationComposer(
              $db: $db,
              $table: $db.items,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$CategoriesTableTableManager extends RootTableManager<
    _$AppDatabase,
    $CategoriesTable,
    CategoryTable,
    $$CategoriesTableFilterComposer,
    $$CategoriesTableOrderingComposer,
    $$CategoriesTableAnnotationComposer,
    $$CategoriesTableCreateCompanionBuilder,
    $$CategoriesTableUpdateCompanionBuilder,
    (CategoryTable, $$CategoriesTableReferences),
    CategoryTable,
    PrefetchHooks Function({bool itemsRefs})> {
  $$CategoriesTableTableManager(_$AppDatabase db, $CategoriesTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CategoriesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CategoriesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CategoriesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> name = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              CategoriesCompanion(
            id: id,
            name: name,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String name,
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              CategoriesCompanion.insert(
            id: id,
            name: name,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable(table),
                    $$CategoriesTableReferences(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: ({itemsRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [if (itemsRefs) db.items],
              addJoins: null,
              getPrefetchedDataCallback: (items) async {
                return [
                  if (itemsRefs)
                    await $_getPrefetchedData<CategoryTable, $CategoriesTable,
                            ItemTable>(
                        currentTable: table,
                        referencedTable:
                            $$CategoriesTableReferences._itemsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$CategoriesTableReferences(db, table, p0)
                                .itemsRefs,
                        referencedItemsForCurrentItem:
                            (item, referencedItems) => referencedItems
                                .where((e) => e.categoryId == item.id),
                        typedResults: items)
                ];
              },
            );
          },
        ));
}

typedef $$CategoriesTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $CategoriesTable,
    CategoryTable,
    $$CategoriesTableFilterComposer,
    $$CategoriesTableOrderingComposer,
    $$CategoriesTableAnnotationComposer,
    $$CategoriesTableCreateCompanionBuilder,
    $$CategoriesTableUpdateCompanionBuilder,
    (CategoryTable, $$CategoriesTableReferences),
    CategoryTable,
    PrefetchHooks Function({bool itemsRefs})>;
typedef $$ItemsTableCreateCompanionBuilder = ItemsCompanion Function({
  Value<int> id,
  required String name,
  required String category,
  required double price,
  Value<int> stockQty,
  Value<double> minStockQty,
  Value<Uint8List?> image,
  Value<int?> categoryId,
  Value<String> type,
  Value<String?> billingType,
  Value<String?> serviceCategory,
  Value<bool> requiresTimeTracking,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});
typedef $$ItemsTableUpdateCompanionBuilder = ItemsCompanion Function({
  Value<int> id,
  Value<String> name,
  Value<String> category,
  Value<double> price,
  Value<int> stockQty,
  Value<double> minStockQty,
  Value<Uint8List?> image,
  Value<int?> categoryId,
  Value<String> type,
  Value<String?> billingType,
  Value<String?> serviceCategory,
  Value<bool> requiresTimeTracking,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});

final class $$ItemsTableReferences
    extends BaseReferences<_$AppDatabase, $ItemsTable, ItemTable> {
  $$ItemsTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static $CategoriesTable _categoryIdTable(_$AppDatabase db) => db.categories
      .createAlias($_aliasNameGenerator(db.items.categoryId, db.categories.id));

  $$CategoriesTableProcessedTableManager? get categoryId {
    final $_column = $_itemColumn<int>('category_id');
    if ($_column == null) return null;
    final manager = $$CategoriesTableTableManager($_db, $_db.categories)
        .filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_categoryIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static MultiTypedResultKey<$InvoiceItemsTable, List<InvoiceItemTable>>
      _invoiceItemsRefsTable(_$AppDatabase db) => MultiTypedResultKey.fromTable(
          db.invoiceItems,
          aliasName: $_aliasNameGenerator(db.items.id, db.invoiceItems.itemId));

  $$InvoiceItemsTableProcessedTableManager get invoiceItemsRefs {
    final manager = $$InvoiceItemsTableTableManager($_db, $_db.invoiceItems)
        .filter((f) => f.itemId.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(_invoiceItemsRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }

  static MultiTypedResultKey<$StockIncrementsTable, List<StockIncrementTable>>
      _stockIncrementsRefsTable(_$AppDatabase db) =>
          MultiTypedResultKey.fromTable(db.stockIncrements,
              aliasName:
                  $_aliasNameGenerator(db.items.id, db.stockIncrements.itemId));

  $$StockIncrementsTableProcessedTableManager get stockIncrementsRefs {
    final manager =
        $$StockIncrementsTableTableManager($_db, $_db.stockIncrements)
            .filter((f) => f.itemId.id.sqlEquals($_itemColumn<int>('id')!));

    final cache =
        $_typedResult.readTableOrNull(_stockIncrementsRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }
}

class $$ItemsTableFilterComposer extends Composer<_$AppDatabase, $ItemsTable> {
  $$ItemsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get category => $composableBuilder(
      column: $table.category, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get price => $composableBuilder(
      column: $table.price, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get stockQty => $composableBuilder(
      column: $table.stockQty, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get minStockQty => $composableBuilder(
      column: $table.minStockQty, builder: (column) => ColumnFilters(column));

  ColumnFilters<Uint8List> get image => $composableBuilder(
      column: $table.image, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get type => $composableBuilder(
      column: $table.type, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get billingType => $composableBuilder(
      column: $table.billingType, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get serviceCategory => $composableBuilder(
      column: $table.serviceCategory,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get requiresTimeTracking => $composableBuilder(
      column: $table.requiresTimeTracking,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get syncId => $composableBuilder(
      column: $table.syncId, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get deviceId => $composableBuilder(
      column: $table.deviceId, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isDeleted => $composableBuilder(
      column: $table.isDeleted, builder: (column) => ColumnFilters(column));

  $$CategoriesTableFilterComposer get categoryId {
    final $$CategoriesTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.categoryId,
        referencedTable: $db.categories,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$CategoriesTableFilterComposer(
              $db: $db,
              $table: $db.categories,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  Expression<bool> invoiceItemsRefs(
      Expression<bool> Function($$InvoiceItemsTableFilterComposer f) f) {
    final $$InvoiceItemsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.invoiceItems,
        getReferencedColumn: (t) => t.itemId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$InvoiceItemsTableFilterComposer(
              $db: $db,
              $table: $db.invoiceItems,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<bool> stockIncrementsRefs(
      Expression<bool> Function($$StockIncrementsTableFilterComposer f) f) {
    final $$StockIncrementsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.stockIncrements,
        getReferencedColumn: (t) => t.itemId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$StockIncrementsTableFilterComposer(
              $db: $db,
              $table: $db.stockIncrements,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$ItemsTableOrderingComposer
    extends Composer<_$AppDatabase, $ItemsTable> {
  $$ItemsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get category => $composableBuilder(
      column: $table.category, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get price => $composableBuilder(
      column: $table.price, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get stockQty => $composableBuilder(
      column: $table.stockQty, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get minStockQty => $composableBuilder(
      column: $table.minStockQty, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<Uint8List> get image => $composableBuilder(
      column: $table.image, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get type => $composableBuilder(
      column: $table.type, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get billingType => $composableBuilder(
      column: $table.billingType, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get serviceCategory => $composableBuilder(
      column: $table.serviceCategory,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get requiresTimeTracking => $composableBuilder(
      column: $table.requiresTimeTracking,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get syncId => $composableBuilder(
      column: $table.syncId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get deviceId => $composableBuilder(
      column: $table.deviceId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isDeleted => $composableBuilder(
      column: $table.isDeleted, builder: (column) => ColumnOrderings(column));

  $$CategoriesTableOrderingComposer get categoryId {
    final $$CategoriesTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.categoryId,
        referencedTable: $db.categories,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$CategoriesTableOrderingComposer(
              $db: $db,
              $table: $db.categories,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$ItemsTableAnnotationComposer
    extends Composer<_$AppDatabase, $ItemsTable> {
  $$ItemsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get category =>
      $composableBuilder(column: $table.category, builder: (column) => column);

  GeneratedColumn<double> get price =>
      $composableBuilder(column: $table.price, builder: (column) => column);

  GeneratedColumn<int> get stockQty =>
      $composableBuilder(column: $table.stockQty, builder: (column) => column);

  GeneratedColumn<double> get minStockQty => $composableBuilder(
      column: $table.minStockQty, builder: (column) => column);

  GeneratedColumn<Uint8List> get image =>
      $composableBuilder(column: $table.image, builder: (column) => column);

  GeneratedColumn<String> get type =>
      $composableBuilder(column: $table.type, builder: (column) => column);

  GeneratedColumn<String> get billingType => $composableBuilder(
      column: $table.billingType, builder: (column) => column);

  GeneratedColumn<String> get serviceCategory => $composableBuilder(
      column: $table.serviceCategory, builder: (column) => column);

  GeneratedColumn<bool> get requiresTimeTracking => $composableBuilder(
      column: $table.requiresTimeTracking, builder: (column) => column);

  GeneratedColumn<String> get syncId =>
      $composableBuilder(column: $table.syncId, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<String> get deviceId =>
      $composableBuilder(column: $table.deviceId, builder: (column) => column);

  GeneratedColumn<bool> get isDeleted =>
      $composableBuilder(column: $table.isDeleted, builder: (column) => column);

  $$CategoriesTableAnnotationComposer get categoryId {
    final $$CategoriesTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.categoryId,
        referencedTable: $db.categories,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$CategoriesTableAnnotationComposer(
              $db: $db,
              $table: $db.categories,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  Expression<T> invoiceItemsRefs<T extends Object>(
      Expression<T> Function($$InvoiceItemsTableAnnotationComposer a) f) {
    final $$InvoiceItemsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.invoiceItems,
        getReferencedColumn: (t) => t.itemId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$InvoiceItemsTableAnnotationComposer(
              $db: $db,
              $table: $db.invoiceItems,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<T> stockIncrementsRefs<T extends Object>(
      Expression<T> Function($$StockIncrementsTableAnnotationComposer a) f) {
    final $$StockIncrementsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.stockIncrements,
        getReferencedColumn: (t) => t.itemId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$StockIncrementsTableAnnotationComposer(
              $db: $db,
              $table: $db.stockIncrements,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$ItemsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $ItemsTable,
    ItemTable,
    $$ItemsTableFilterComposer,
    $$ItemsTableOrderingComposer,
    $$ItemsTableAnnotationComposer,
    $$ItemsTableCreateCompanionBuilder,
    $$ItemsTableUpdateCompanionBuilder,
    (ItemTable, $$ItemsTableReferences),
    ItemTable,
    PrefetchHooks Function(
        {bool categoryId, bool invoiceItemsRefs, bool stockIncrementsRefs})> {
  $$ItemsTableTableManager(_$AppDatabase db, $ItemsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ItemsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ItemsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$ItemsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> name = const Value.absent(),
            Value<String> category = const Value.absent(),
            Value<double> price = const Value.absent(),
            Value<int> stockQty = const Value.absent(),
            Value<double> minStockQty = const Value.absent(),
            Value<Uint8List?> image = const Value.absent(),
            Value<int?> categoryId = const Value.absent(),
            Value<String> type = const Value.absent(),
            Value<String?> billingType = const Value.absent(),
            Value<String?> serviceCategory = const Value.absent(),
            Value<bool> requiresTimeTracking = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              ItemsCompanion(
            id: id,
            name: name,
            category: category,
            price: price,
            stockQty: stockQty,
            minStockQty: minStockQty,
            image: image,
            categoryId: categoryId,
            type: type,
            billingType: billingType,
            serviceCategory: serviceCategory,
            requiresTimeTracking: requiresTimeTracking,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String name,
            required String category,
            required double price,
            Value<int> stockQty = const Value.absent(),
            Value<double> minStockQty = const Value.absent(),
            Value<Uint8List?> image = const Value.absent(),
            Value<int?> categoryId = const Value.absent(),
            Value<String> type = const Value.absent(),
            Value<String?> billingType = const Value.absent(),
            Value<String?> serviceCategory = const Value.absent(),
            Value<bool> requiresTimeTracking = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              ItemsCompanion.insert(
            id: id,
            name: name,
            category: category,
            price: price,
            stockQty: stockQty,
            minStockQty: minStockQty,
            image: image,
            categoryId: categoryId,
            type: type,
            billingType: billingType,
            serviceCategory: serviceCategory,
            requiresTimeTracking: requiresTimeTracking,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) =>
                  (e.readTable(table), $$ItemsTableReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: (
              {categoryId = false,
              invoiceItemsRefs = false,
              stockIncrementsRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [
                if (invoiceItemsRefs) db.invoiceItems,
                if (stockIncrementsRefs) db.stockIncrements
              ],
              addJoins: <
                  T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic>>(state) {
                if (categoryId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.categoryId,
                    referencedTable:
                        $$ItemsTableReferences._categoryIdTable(db),
                    referencedColumn:
                        $$ItemsTableReferences._categoryIdTable(db).id,
                  ) as T;
                }

                return state;
              },
              getPrefetchedDataCallback: (items) async {
                return [
                  if (invoiceItemsRefs)
                    await $_getPrefetchedData<ItemTable, $ItemsTable,
                            InvoiceItemTable>(
                        currentTable: table,
                        referencedTable:
                            $$ItemsTableReferences._invoiceItemsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$ItemsTableReferences(db, table, p0)
                                .invoiceItemsRefs,
                        referencedItemsForCurrentItem: (item,
                                referencedItems) =>
                            referencedItems.where((e) => e.itemId == item.id),
                        typedResults: items),
                  if (stockIncrementsRefs)
                    await $_getPrefetchedData<ItemTable, $ItemsTable,
                            StockIncrementTable>(
                        currentTable: table,
                        referencedTable: $$ItemsTableReferences
                            ._stockIncrementsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$ItemsTableReferences(db, table, p0)
                                .stockIncrementsRefs,
                        referencedItemsForCurrentItem: (item,
                                referencedItems) =>
                            referencedItems.where((e) => e.itemId == item.id),
                        typedResults: items)
                ];
              },
            );
          },
        ));
}

typedef $$ItemsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $ItemsTable,
    ItemTable,
    $$ItemsTableFilterComposer,
    $$ItemsTableOrderingComposer,
    $$ItemsTableAnnotationComposer,
    $$ItemsTableCreateCompanionBuilder,
    $$ItemsTableUpdateCompanionBuilder,
    (ItemTable, $$ItemsTableReferences),
    ItemTable,
    PrefetchHooks Function(
        {bool categoryId, bool invoiceItemsRefs, bool stockIncrementsRefs})>;
typedef $$InvoicesTableCreateCompanionBuilder = InvoicesCompanion Function({
  Value<int> id,
  required String invoiceNumber,
  Value<DateTime> dateCreated,
  required double subtotal,
  required double taxAmount,
  required double discountAmount,
  required double totalAmount,
  required String paymentStatus,
  Value<double> amountPaid,
  Value<double> balanceAmount,
  Value<String?> customerName,
  Value<String?> customerAddress,
  Value<String?> paymentMethod,
  Value<int?> staffId,
  Value<String?> staffName,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
  Value<double?> totalPrintAmount,
});
typedef $$InvoicesTableUpdateCompanionBuilder = InvoicesCompanion Function({
  Value<int> id,
  Value<String> invoiceNumber,
  Value<DateTime> dateCreated,
  Value<double> subtotal,
  Value<double> taxAmount,
  Value<double> discountAmount,
  Value<double> totalAmount,
  Value<String> paymentStatus,
  Value<double> amountPaid,
  Value<double> balanceAmount,
  Value<String?> customerName,
  Value<String?> customerAddress,
  Value<String?> paymentMethod,
  Value<int?> staffId,
  Value<String?> staffName,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
  Value<double?> totalPrintAmount,
});

final class $$InvoicesTableReferences
    extends BaseReferences<_$AppDatabase, $InvoicesTable, InvoiceTable> {
  $$InvoicesTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static MultiTypedResultKey<$InvoiceItemsTable, List<InvoiceItemTable>>
      _invoiceItemsRefsTable(_$AppDatabase db) => MultiTypedResultKey.fromTable(
          db.invoiceItems,
          aliasName:
              $_aliasNameGenerator(db.invoices.id, db.invoiceItems.invoiceId));

  $$InvoiceItemsTableProcessedTableManager get invoiceItemsRefs {
    final manager = $$InvoiceItemsTableTableManager($_db, $_db.invoiceItems)
        .filter((f) => f.invoiceId.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(_invoiceItemsRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }
}

class $$InvoicesTableFilterComposer
    extends Composer<_$AppDatabase, $InvoicesTable> {
  $$InvoicesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get invoiceNumber => $composableBuilder(
      column: $table.invoiceNumber, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get dateCreated => $composableBuilder(
      column: $table.dateCreated, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get subtotal => $composableBuilder(
      column: $table.subtotal, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get taxAmount => $composableBuilder(
      column: $table.taxAmount, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get discountAmount => $composableBuilder(
      column: $table.discountAmount,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get totalAmount => $composableBuilder(
      column: $table.totalAmount, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get paymentStatus => $composableBuilder(
      column: $table.paymentStatus, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get amountPaid => $composableBuilder(
      column: $table.amountPaid, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get balanceAmount => $composableBuilder(
      column: $table.balanceAmount, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get customerName => $composableBuilder(
      column: $table.customerName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get customerAddress => $composableBuilder(
      column: $table.customerAddress,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get paymentMethod => $composableBuilder(
      column: $table.paymentMethod, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get staffId => $composableBuilder(
      column: $table.staffId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get staffName => $composableBuilder(
      column: $table.staffName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get syncId => $composableBuilder(
      column: $table.syncId, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get deviceId => $composableBuilder(
      column: $table.deviceId, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isDeleted => $composableBuilder(
      column: $table.isDeleted, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get totalPrintAmount => $composableBuilder(
      column: $table.totalPrintAmount,
      builder: (column) => ColumnFilters(column));

  Expression<bool> invoiceItemsRefs(
      Expression<bool> Function($$InvoiceItemsTableFilterComposer f) f) {
    final $$InvoiceItemsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.invoiceItems,
        getReferencedColumn: (t) => t.invoiceId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$InvoiceItemsTableFilterComposer(
              $db: $db,
              $table: $db.invoiceItems,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$InvoicesTableOrderingComposer
    extends Composer<_$AppDatabase, $InvoicesTable> {
  $$InvoicesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get invoiceNumber => $composableBuilder(
      column: $table.invoiceNumber,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get dateCreated => $composableBuilder(
      column: $table.dateCreated, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get subtotal => $composableBuilder(
      column: $table.subtotal, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get taxAmount => $composableBuilder(
      column: $table.taxAmount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get discountAmount => $composableBuilder(
      column: $table.discountAmount,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get totalAmount => $composableBuilder(
      column: $table.totalAmount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get paymentStatus => $composableBuilder(
      column: $table.paymentStatus,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get amountPaid => $composableBuilder(
      column: $table.amountPaid, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get balanceAmount => $composableBuilder(
      column: $table.balanceAmount,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get customerName => $composableBuilder(
      column: $table.customerName,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get customerAddress => $composableBuilder(
      column: $table.customerAddress,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get paymentMethod => $composableBuilder(
      column: $table.paymentMethod,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get staffId => $composableBuilder(
      column: $table.staffId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get staffName => $composableBuilder(
      column: $table.staffName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get syncId => $composableBuilder(
      column: $table.syncId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get deviceId => $composableBuilder(
      column: $table.deviceId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isDeleted => $composableBuilder(
      column: $table.isDeleted, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get totalPrintAmount => $composableBuilder(
      column: $table.totalPrintAmount,
      builder: (column) => ColumnOrderings(column));
}

class $$InvoicesTableAnnotationComposer
    extends Composer<_$AppDatabase, $InvoicesTable> {
  $$InvoicesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get invoiceNumber => $composableBuilder(
      column: $table.invoiceNumber, builder: (column) => column);

  GeneratedColumn<DateTime> get dateCreated => $composableBuilder(
      column: $table.dateCreated, builder: (column) => column);

  GeneratedColumn<double> get subtotal =>
      $composableBuilder(column: $table.subtotal, builder: (column) => column);

  GeneratedColumn<double> get taxAmount =>
      $composableBuilder(column: $table.taxAmount, builder: (column) => column);

  GeneratedColumn<double> get discountAmount => $composableBuilder(
      column: $table.discountAmount, builder: (column) => column);

  GeneratedColumn<double> get totalAmount => $composableBuilder(
      column: $table.totalAmount, builder: (column) => column);

  GeneratedColumn<String> get paymentStatus => $composableBuilder(
      column: $table.paymentStatus, builder: (column) => column);

  GeneratedColumn<double> get amountPaid => $composableBuilder(
      column: $table.amountPaid, builder: (column) => column);

  GeneratedColumn<double> get balanceAmount => $composableBuilder(
      column: $table.balanceAmount, builder: (column) => column);

  GeneratedColumn<String> get customerName => $composableBuilder(
      column: $table.customerName, builder: (column) => column);

  GeneratedColumn<String> get customerAddress => $composableBuilder(
      column: $table.customerAddress, builder: (column) => column);

  GeneratedColumn<String> get paymentMethod => $composableBuilder(
      column: $table.paymentMethod, builder: (column) => column);

  GeneratedColumn<int> get staffId =>
      $composableBuilder(column: $table.staffId, builder: (column) => column);

  GeneratedColumn<String> get staffName =>
      $composableBuilder(column: $table.staffName, builder: (column) => column);

  GeneratedColumn<String> get syncId =>
      $composableBuilder(column: $table.syncId, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<String> get deviceId =>
      $composableBuilder(column: $table.deviceId, builder: (column) => column);

  GeneratedColumn<bool> get isDeleted =>
      $composableBuilder(column: $table.isDeleted, builder: (column) => column);

  GeneratedColumn<double> get totalPrintAmount => $composableBuilder(
      column: $table.totalPrintAmount, builder: (column) => column);

  Expression<T> invoiceItemsRefs<T extends Object>(
      Expression<T> Function($$InvoiceItemsTableAnnotationComposer a) f) {
    final $$InvoiceItemsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.invoiceItems,
        getReferencedColumn: (t) => t.invoiceId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$InvoiceItemsTableAnnotationComposer(
              $db: $db,
              $table: $db.invoiceItems,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$InvoicesTableTableManager extends RootTableManager<
    _$AppDatabase,
    $InvoicesTable,
    InvoiceTable,
    $$InvoicesTableFilterComposer,
    $$InvoicesTableOrderingComposer,
    $$InvoicesTableAnnotationComposer,
    $$InvoicesTableCreateCompanionBuilder,
    $$InvoicesTableUpdateCompanionBuilder,
    (InvoiceTable, $$InvoicesTableReferences),
    InvoiceTable,
    PrefetchHooks Function({bool invoiceItemsRefs})> {
  $$InvoicesTableTableManager(_$AppDatabase db, $InvoicesTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$InvoicesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$InvoicesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$InvoicesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> invoiceNumber = const Value.absent(),
            Value<DateTime> dateCreated = const Value.absent(),
            Value<double> subtotal = const Value.absent(),
            Value<double> taxAmount = const Value.absent(),
            Value<double> discountAmount = const Value.absent(),
            Value<double> totalAmount = const Value.absent(),
            Value<String> paymentStatus = const Value.absent(),
            Value<double> amountPaid = const Value.absent(),
            Value<double> balanceAmount = const Value.absent(),
            Value<String?> customerName = const Value.absent(),
            Value<String?> customerAddress = const Value.absent(),
            Value<String?> paymentMethod = const Value.absent(),
            Value<int?> staffId = const Value.absent(),
            Value<String?> staffName = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
            Value<double?> totalPrintAmount = const Value.absent(),
          }) =>
              InvoicesCompanion(
            id: id,
            invoiceNumber: invoiceNumber,
            dateCreated: dateCreated,
            subtotal: subtotal,
            taxAmount: taxAmount,
            discountAmount: discountAmount,
            totalAmount: totalAmount,
            paymentStatus: paymentStatus,
            amountPaid: amountPaid,
            balanceAmount: balanceAmount,
            customerName: customerName,
            customerAddress: customerAddress,
            paymentMethod: paymentMethod,
            staffId: staffId,
            staffName: staffName,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
            totalPrintAmount: totalPrintAmount,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String invoiceNumber,
            Value<DateTime> dateCreated = const Value.absent(),
            required double subtotal,
            required double taxAmount,
            required double discountAmount,
            required double totalAmount,
            required String paymentStatus,
            Value<double> amountPaid = const Value.absent(),
            Value<double> balanceAmount = const Value.absent(),
            Value<String?> customerName = const Value.absent(),
            Value<String?> customerAddress = const Value.absent(),
            Value<String?> paymentMethod = const Value.absent(),
            Value<int?> staffId = const Value.absent(),
            Value<String?> staffName = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
            Value<double?> totalPrintAmount = const Value.absent(),
          }) =>
              InvoicesCompanion.insert(
            id: id,
            invoiceNumber: invoiceNumber,
            dateCreated: dateCreated,
            subtotal: subtotal,
            taxAmount: taxAmount,
            discountAmount: discountAmount,
            totalAmount: totalAmount,
            paymentStatus: paymentStatus,
            amountPaid: amountPaid,
            balanceAmount: balanceAmount,
            customerName: customerName,
            customerAddress: customerAddress,
            paymentMethod: paymentMethod,
            staffId: staffId,
            staffName: staffName,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
            totalPrintAmount: totalPrintAmount,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) =>
                  (e.readTable(table), $$InvoicesTableReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: ({invoiceItemsRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [if (invoiceItemsRefs) db.invoiceItems],
              addJoins: null,
              getPrefetchedDataCallback: (items) async {
                return [
                  if (invoiceItemsRefs)
                    await $_getPrefetchedData<InvoiceTable, $InvoicesTable, InvoiceItemTable>(
                        currentTable: table,
                        referencedTable: $$InvoicesTableReferences
                            ._invoiceItemsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$InvoicesTableReferences(db, table, p0)
                                .invoiceItemsRefs,
                        referencedItemsForCurrentItem:
                            (item, referencedItems) => referencedItems
                                .where((e) => e.invoiceId == item.id),
                        typedResults: items)
                ];
              },
            );
          },
        ));
}

typedef $$InvoicesTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $InvoicesTable,
    InvoiceTable,
    $$InvoicesTableFilterComposer,
    $$InvoicesTableOrderingComposer,
    $$InvoicesTableAnnotationComposer,
    $$InvoicesTableCreateCompanionBuilder,
    $$InvoicesTableUpdateCompanionBuilder,
    (InvoiceTable, $$InvoicesTableReferences),
    InvoiceTable,
    PrefetchHooks Function({bool invoiceItemsRefs})>;
typedef $$InvoiceItemsTableCreateCompanionBuilder = InvoiceItemsCompanion
    Function({
  Value<int> id,
  required int invoiceId,
  required int itemId,
  required int quantity,
  required double unitPrice,
  Value<String> type,
  Value<String?> serviceMeta,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
  Value<double?> printPrice,
});
typedef $$InvoiceItemsTableUpdateCompanionBuilder = InvoiceItemsCompanion
    Function({
  Value<int> id,
  Value<int> invoiceId,
  Value<int> itemId,
  Value<int> quantity,
  Value<double> unitPrice,
  Value<String> type,
  Value<String?> serviceMeta,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
  Value<double?> printPrice,
});

final class $$InvoiceItemsTableReferences extends BaseReferences<_$AppDatabase,
    $InvoiceItemsTable, InvoiceItemTable> {
  $$InvoiceItemsTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static $InvoicesTable _invoiceIdTable(_$AppDatabase db) =>
      db.invoices.createAlias(
          $_aliasNameGenerator(db.invoiceItems.invoiceId, db.invoices.id));

  $$InvoicesTableProcessedTableManager get invoiceId {
    final $_column = $_itemColumn<int>('invoice_id')!;

    final manager = $$InvoicesTableTableManager($_db, $_db.invoices)
        .filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_invoiceIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static $ItemsTable _itemIdTable(_$AppDatabase db) => db.items
      .createAlias($_aliasNameGenerator(db.invoiceItems.itemId, db.items.id));

  $$ItemsTableProcessedTableManager get itemId {
    final $_column = $_itemColumn<int>('item_id')!;

    final manager = $$ItemsTableTableManager($_db, $_db.items)
        .filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_itemIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }
}

class $$InvoiceItemsTableFilterComposer
    extends Composer<_$AppDatabase, $InvoiceItemsTable> {
  $$InvoiceItemsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get quantity => $composableBuilder(
      column: $table.quantity, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get unitPrice => $composableBuilder(
      column: $table.unitPrice, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get type => $composableBuilder(
      column: $table.type, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get serviceMeta => $composableBuilder(
      column: $table.serviceMeta, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get syncId => $composableBuilder(
      column: $table.syncId, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get deviceId => $composableBuilder(
      column: $table.deviceId, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isDeleted => $composableBuilder(
      column: $table.isDeleted, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get printPrice => $composableBuilder(
      column: $table.printPrice, builder: (column) => ColumnFilters(column));

  $$InvoicesTableFilterComposer get invoiceId {
    final $$InvoicesTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.invoiceId,
        referencedTable: $db.invoices,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$InvoicesTableFilterComposer(
              $db: $db,
              $table: $db.invoices,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$ItemsTableFilterComposer get itemId {
    final $$ItemsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.itemId,
        referencedTable: $db.items,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ItemsTableFilterComposer(
              $db: $db,
              $table: $db.items,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$InvoiceItemsTableOrderingComposer
    extends Composer<_$AppDatabase, $InvoiceItemsTable> {
  $$InvoiceItemsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get quantity => $composableBuilder(
      column: $table.quantity, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get unitPrice => $composableBuilder(
      column: $table.unitPrice, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get type => $composableBuilder(
      column: $table.type, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get serviceMeta => $composableBuilder(
      column: $table.serviceMeta, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get syncId => $composableBuilder(
      column: $table.syncId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get deviceId => $composableBuilder(
      column: $table.deviceId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isDeleted => $composableBuilder(
      column: $table.isDeleted, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get printPrice => $composableBuilder(
      column: $table.printPrice, builder: (column) => ColumnOrderings(column));

  $$InvoicesTableOrderingComposer get invoiceId {
    final $$InvoicesTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.invoiceId,
        referencedTable: $db.invoices,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$InvoicesTableOrderingComposer(
              $db: $db,
              $table: $db.invoices,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$ItemsTableOrderingComposer get itemId {
    final $$ItemsTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.itemId,
        referencedTable: $db.items,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ItemsTableOrderingComposer(
              $db: $db,
              $table: $db.items,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$InvoiceItemsTableAnnotationComposer
    extends Composer<_$AppDatabase, $InvoiceItemsTable> {
  $$InvoiceItemsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<int> get quantity =>
      $composableBuilder(column: $table.quantity, builder: (column) => column);

  GeneratedColumn<double> get unitPrice =>
      $composableBuilder(column: $table.unitPrice, builder: (column) => column);

  GeneratedColumn<String> get type =>
      $composableBuilder(column: $table.type, builder: (column) => column);

  GeneratedColumn<String> get serviceMeta => $composableBuilder(
      column: $table.serviceMeta, builder: (column) => column);

  GeneratedColumn<String> get syncId =>
      $composableBuilder(column: $table.syncId, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<String> get deviceId =>
      $composableBuilder(column: $table.deviceId, builder: (column) => column);

  GeneratedColumn<bool> get isDeleted =>
      $composableBuilder(column: $table.isDeleted, builder: (column) => column);

  GeneratedColumn<double> get printPrice => $composableBuilder(
      column: $table.printPrice, builder: (column) => column);

  $$InvoicesTableAnnotationComposer get invoiceId {
    final $$InvoicesTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.invoiceId,
        referencedTable: $db.invoices,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$InvoicesTableAnnotationComposer(
              $db: $db,
              $table: $db.invoices,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$ItemsTableAnnotationComposer get itemId {
    final $$ItemsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.itemId,
        referencedTable: $db.items,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ItemsTableAnnotationComposer(
              $db: $db,
              $table: $db.items,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$InvoiceItemsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $InvoiceItemsTable,
    InvoiceItemTable,
    $$InvoiceItemsTableFilterComposer,
    $$InvoiceItemsTableOrderingComposer,
    $$InvoiceItemsTableAnnotationComposer,
    $$InvoiceItemsTableCreateCompanionBuilder,
    $$InvoiceItemsTableUpdateCompanionBuilder,
    (InvoiceItemTable, $$InvoiceItemsTableReferences),
    InvoiceItemTable,
    PrefetchHooks Function({bool invoiceId, bool itemId})> {
  $$InvoiceItemsTableTableManager(_$AppDatabase db, $InvoiceItemsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$InvoiceItemsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$InvoiceItemsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$InvoiceItemsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<int> invoiceId = const Value.absent(),
            Value<int> itemId = const Value.absent(),
            Value<int> quantity = const Value.absent(),
            Value<double> unitPrice = const Value.absent(),
            Value<String> type = const Value.absent(),
            Value<String?> serviceMeta = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
            Value<double?> printPrice = const Value.absent(),
          }) =>
              InvoiceItemsCompanion(
            id: id,
            invoiceId: invoiceId,
            itemId: itemId,
            quantity: quantity,
            unitPrice: unitPrice,
            type: type,
            serviceMeta: serviceMeta,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
            printPrice: printPrice,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required int invoiceId,
            required int itemId,
            required int quantity,
            required double unitPrice,
            Value<String> type = const Value.absent(),
            Value<String?> serviceMeta = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
            Value<double?> printPrice = const Value.absent(),
          }) =>
              InvoiceItemsCompanion.insert(
            id: id,
            invoiceId: invoiceId,
            itemId: itemId,
            quantity: quantity,
            unitPrice: unitPrice,
            type: type,
            serviceMeta: serviceMeta,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
            printPrice: printPrice,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable(table),
                    $$InvoiceItemsTableReferences(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: ({invoiceId = false, itemId = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins: <
                  T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic>>(state) {
                if (invoiceId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.invoiceId,
                    referencedTable:
                        $$InvoiceItemsTableReferences._invoiceIdTable(db),
                    referencedColumn:
                        $$InvoiceItemsTableReferences._invoiceIdTable(db).id,
                  ) as T;
                }
                if (itemId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.itemId,
                    referencedTable:
                        $$InvoiceItemsTableReferences._itemIdTable(db),
                    referencedColumn:
                        $$InvoiceItemsTableReferences._itemIdTable(db).id,
                  ) as T;
                }

                return state;
              },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ));
}

typedef $$InvoiceItemsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $InvoiceItemsTable,
    InvoiceItemTable,
    $$InvoiceItemsTableFilterComposer,
    $$InvoiceItemsTableOrderingComposer,
    $$InvoiceItemsTableAnnotationComposer,
    $$InvoiceItemsTableCreateCompanionBuilder,
    $$InvoiceItemsTableUpdateCompanionBuilder,
    (InvoiceItemTable, $$InvoiceItemsTableReferences),
    InvoiceItemTable,
    PrefetchHooks Function({bool invoiceId, bool itemId})>;
typedef $$SettingsTableCreateCompanionBuilder = SettingsCompanion Function({
  Value<int> id,
  required String organizationName,
  required String address,
  required String phone,
  Value<String?> businessDescription,
  Value<String?> taxId,
  Value<String?> logoPath,
  Value<Uint8List?> logo,
  Value<String> themeMode,
  Value<String> currency,
  Value<bool> taxEnabled,
  Value<bool> discountEnabled,
  Value<String> defaultInvoiceTemplate,
  Value<bool> confirmPriceOnSelection,
  Value<double> taxRate,
  Value<String?> bankName,
  Value<String?> accountNumber,
  Value<String?> accountName,
  Value<bool> showAccountDetails,
  Value<String> receiptFooter,
  Value<bool> showSignatureSpace,
  Value<bool> paymentMethodsEnabled,
  Value<int> primaryColor,
  Value<int> failedAttempts,
  Value<bool> isLocked,
  Value<DateTime?> lockedAt,
  Value<bool> showDateTime,
  Value<bool> serviceBillingEnabled,
  Value<String?> serviceTypes,
  Value<bool> staffManagementEnabled,
  Value<int> paperWidth,
  Value<int> halfDayStartHour,
  Value<int> halfDayEndHour,
  Value<bool> showSyncStatus,
  Value<bool> customReceiptPricingEnabled,
  Value<bool> showLogo,
  Value<String?> cacNumber,
  Value<bool> showCacNumber,
  Value<bool> showTotalSalesCard,
});
typedef $$SettingsTableUpdateCompanionBuilder = SettingsCompanion Function({
  Value<int> id,
  Value<String> organizationName,
  Value<String> address,
  Value<String> phone,
  Value<String?> businessDescription,
  Value<String?> taxId,
  Value<String?> logoPath,
  Value<Uint8List?> logo,
  Value<String> themeMode,
  Value<String> currency,
  Value<bool> taxEnabled,
  Value<bool> discountEnabled,
  Value<String> defaultInvoiceTemplate,
  Value<bool> confirmPriceOnSelection,
  Value<double> taxRate,
  Value<String?> bankName,
  Value<String?> accountNumber,
  Value<String?> accountName,
  Value<bool> showAccountDetails,
  Value<String> receiptFooter,
  Value<bool> showSignatureSpace,
  Value<bool> paymentMethodsEnabled,
  Value<int> primaryColor,
  Value<int> failedAttempts,
  Value<bool> isLocked,
  Value<DateTime?> lockedAt,
  Value<bool> showDateTime,
  Value<bool> serviceBillingEnabled,
  Value<String?> serviceTypes,
  Value<bool> staffManagementEnabled,
  Value<int> paperWidth,
  Value<int> halfDayStartHour,
  Value<int> halfDayEndHour,
  Value<bool> showSyncStatus,
  Value<bool> customReceiptPricingEnabled,
  Value<bool> showLogo,
  Value<String?> cacNumber,
  Value<bool> showCacNumber,
  Value<bool> showTotalSalesCard,
});

class $$SettingsTableFilterComposer
    extends Composer<_$AppDatabase, $SettingsTable> {
  $$SettingsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get organizationName => $composableBuilder(
      column: $table.organizationName,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get address => $composableBuilder(
      column: $table.address, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get phone => $composableBuilder(
      column: $table.phone, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get businessDescription => $composableBuilder(
      column: $table.businessDescription,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get taxId => $composableBuilder(
      column: $table.taxId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get logoPath => $composableBuilder(
      column: $table.logoPath, builder: (column) => ColumnFilters(column));

  ColumnFilters<Uint8List> get logo => $composableBuilder(
      column: $table.logo, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get themeMode => $composableBuilder(
      column: $table.themeMode, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get currency => $composableBuilder(
      column: $table.currency, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get taxEnabled => $composableBuilder(
      column: $table.taxEnabled, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get discountEnabled => $composableBuilder(
      column: $table.discountEnabled,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get defaultInvoiceTemplate => $composableBuilder(
      column: $table.defaultInvoiceTemplate,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get confirmPriceOnSelection => $composableBuilder(
      column: $table.confirmPriceOnSelection,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get taxRate => $composableBuilder(
      column: $table.taxRate, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get bankName => $composableBuilder(
      column: $table.bankName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get accountNumber => $composableBuilder(
      column: $table.accountNumber, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get accountName => $composableBuilder(
      column: $table.accountName, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get showAccountDetails => $composableBuilder(
      column: $table.showAccountDetails,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get receiptFooter => $composableBuilder(
      column: $table.receiptFooter, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get showSignatureSpace => $composableBuilder(
      column: $table.showSignatureSpace,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get paymentMethodsEnabled => $composableBuilder(
      column: $table.paymentMethodsEnabled,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get primaryColor => $composableBuilder(
      column: $table.primaryColor, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get failedAttempts => $composableBuilder(
      column: $table.failedAttempts,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isLocked => $composableBuilder(
      column: $table.isLocked, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get lockedAt => $composableBuilder(
      column: $table.lockedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get showDateTime => $composableBuilder(
      column: $table.showDateTime, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get serviceBillingEnabled => $composableBuilder(
      column: $table.serviceBillingEnabled,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get serviceTypes => $composableBuilder(
      column: $table.serviceTypes, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get staffManagementEnabled => $composableBuilder(
      column: $table.staffManagementEnabled,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get paperWidth => $composableBuilder(
      column: $table.paperWidth, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get halfDayStartHour => $composableBuilder(
      column: $table.halfDayStartHour,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get halfDayEndHour => $composableBuilder(
      column: $table.halfDayEndHour,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get showSyncStatus => $composableBuilder(
      column: $table.showSyncStatus,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get customReceiptPricingEnabled => $composableBuilder(
      column: $table.customReceiptPricingEnabled,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get showLogo => $composableBuilder(
      column: $table.showLogo, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get cacNumber => $composableBuilder(
      column: $table.cacNumber, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get showCacNumber => $composableBuilder(
      column: $table.showCacNumber, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get showTotalSalesCard => $composableBuilder(
      column: $table.showTotalSalesCard,
      builder: (column) => ColumnFilters(column));
}

class $$SettingsTableOrderingComposer
    extends Composer<_$AppDatabase, $SettingsTable> {
  $$SettingsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get organizationName => $composableBuilder(
      column: $table.organizationName,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get address => $composableBuilder(
      column: $table.address, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get phone => $composableBuilder(
      column: $table.phone, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get businessDescription => $composableBuilder(
      column: $table.businessDescription,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get taxId => $composableBuilder(
      column: $table.taxId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get logoPath => $composableBuilder(
      column: $table.logoPath, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<Uint8List> get logo => $composableBuilder(
      column: $table.logo, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get themeMode => $composableBuilder(
      column: $table.themeMode, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get currency => $composableBuilder(
      column: $table.currency, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get taxEnabled => $composableBuilder(
      column: $table.taxEnabled, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get discountEnabled => $composableBuilder(
      column: $table.discountEnabled,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get defaultInvoiceTemplate => $composableBuilder(
      column: $table.defaultInvoiceTemplate,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get confirmPriceOnSelection => $composableBuilder(
      column: $table.confirmPriceOnSelection,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get taxRate => $composableBuilder(
      column: $table.taxRate, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get bankName => $composableBuilder(
      column: $table.bankName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get accountNumber => $composableBuilder(
      column: $table.accountNumber,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get accountName => $composableBuilder(
      column: $table.accountName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get showAccountDetails => $composableBuilder(
      column: $table.showAccountDetails,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get receiptFooter => $composableBuilder(
      column: $table.receiptFooter,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get showSignatureSpace => $composableBuilder(
      column: $table.showSignatureSpace,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get paymentMethodsEnabled => $composableBuilder(
      column: $table.paymentMethodsEnabled,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get primaryColor => $composableBuilder(
      column: $table.primaryColor,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get failedAttempts => $composableBuilder(
      column: $table.failedAttempts,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isLocked => $composableBuilder(
      column: $table.isLocked, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get lockedAt => $composableBuilder(
      column: $table.lockedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get showDateTime => $composableBuilder(
      column: $table.showDateTime,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get serviceBillingEnabled => $composableBuilder(
      column: $table.serviceBillingEnabled,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get serviceTypes => $composableBuilder(
      column: $table.serviceTypes,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get staffManagementEnabled => $composableBuilder(
      column: $table.staffManagementEnabled,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get paperWidth => $composableBuilder(
      column: $table.paperWidth, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get halfDayStartHour => $composableBuilder(
      column: $table.halfDayStartHour,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get halfDayEndHour => $composableBuilder(
      column: $table.halfDayEndHour,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get showSyncStatus => $composableBuilder(
      column: $table.showSyncStatus,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get customReceiptPricingEnabled => $composableBuilder(
      column: $table.customReceiptPricingEnabled,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get showLogo => $composableBuilder(
      column: $table.showLogo, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get cacNumber => $composableBuilder(
      column: $table.cacNumber, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get showCacNumber => $composableBuilder(
      column: $table.showCacNumber,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get showTotalSalesCard => $composableBuilder(
      column: $table.showTotalSalesCard,
      builder: (column) => ColumnOrderings(column));
}

class $$SettingsTableAnnotationComposer
    extends Composer<_$AppDatabase, $SettingsTable> {
  $$SettingsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get organizationName => $composableBuilder(
      column: $table.organizationName, builder: (column) => column);

  GeneratedColumn<String> get address =>
      $composableBuilder(column: $table.address, builder: (column) => column);

  GeneratedColumn<String> get phone =>
      $composableBuilder(column: $table.phone, builder: (column) => column);

  GeneratedColumn<String> get businessDescription => $composableBuilder(
      column: $table.businessDescription, builder: (column) => column);

  GeneratedColumn<String> get taxId =>
      $composableBuilder(column: $table.taxId, builder: (column) => column);

  GeneratedColumn<String> get logoPath =>
      $composableBuilder(column: $table.logoPath, builder: (column) => column);

  GeneratedColumn<Uint8List> get logo =>
      $composableBuilder(column: $table.logo, builder: (column) => column);

  GeneratedColumn<String> get themeMode =>
      $composableBuilder(column: $table.themeMode, builder: (column) => column);

  GeneratedColumn<String> get currency =>
      $composableBuilder(column: $table.currency, builder: (column) => column);

  GeneratedColumn<bool> get taxEnabled => $composableBuilder(
      column: $table.taxEnabled, builder: (column) => column);

  GeneratedColumn<bool> get discountEnabled => $composableBuilder(
      column: $table.discountEnabled, builder: (column) => column);

  GeneratedColumn<String> get defaultInvoiceTemplate => $composableBuilder(
      column: $table.defaultInvoiceTemplate, builder: (column) => column);

  GeneratedColumn<bool> get confirmPriceOnSelection => $composableBuilder(
      column: $table.confirmPriceOnSelection, builder: (column) => column);

  GeneratedColumn<double> get taxRate =>
      $composableBuilder(column: $table.taxRate, builder: (column) => column);

  GeneratedColumn<String> get bankName =>
      $composableBuilder(column: $table.bankName, builder: (column) => column);

  GeneratedColumn<String> get accountNumber => $composableBuilder(
      column: $table.accountNumber, builder: (column) => column);

  GeneratedColumn<String> get accountName => $composableBuilder(
      column: $table.accountName, builder: (column) => column);

  GeneratedColumn<bool> get showAccountDetails => $composableBuilder(
      column: $table.showAccountDetails, builder: (column) => column);

  GeneratedColumn<String> get receiptFooter => $composableBuilder(
      column: $table.receiptFooter, builder: (column) => column);

  GeneratedColumn<bool> get showSignatureSpace => $composableBuilder(
      column: $table.showSignatureSpace, builder: (column) => column);

  GeneratedColumn<bool> get paymentMethodsEnabled => $composableBuilder(
      column: $table.paymentMethodsEnabled, builder: (column) => column);

  GeneratedColumn<int> get primaryColor => $composableBuilder(
      column: $table.primaryColor, builder: (column) => column);

  GeneratedColumn<int> get failedAttempts => $composableBuilder(
      column: $table.failedAttempts, builder: (column) => column);

  GeneratedColumn<bool> get isLocked =>
      $composableBuilder(column: $table.isLocked, builder: (column) => column);

  GeneratedColumn<DateTime> get lockedAt =>
      $composableBuilder(column: $table.lockedAt, builder: (column) => column);

  GeneratedColumn<bool> get showDateTime => $composableBuilder(
      column: $table.showDateTime, builder: (column) => column);

  GeneratedColumn<bool> get serviceBillingEnabled => $composableBuilder(
      column: $table.serviceBillingEnabled, builder: (column) => column);

  GeneratedColumn<String> get serviceTypes => $composableBuilder(
      column: $table.serviceTypes, builder: (column) => column);

  GeneratedColumn<bool> get staffManagementEnabled => $composableBuilder(
      column: $table.staffManagementEnabled, builder: (column) => column);

  GeneratedColumn<int> get paperWidth => $composableBuilder(
      column: $table.paperWidth, builder: (column) => column);

  GeneratedColumn<int> get halfDayStartHour => $composableBuilder(
      column: $table.halfDayStartHour, builder: (column) => column);

  GeneratedColumn<int> get halfDayEndHour => $composableBuilder(
      column: $table.halfDayEndHour, builder: (column) => column);

  GeneratedColumn<bool> get showSyncStatus => $composableBuilder(
      column: $table.showSyncStatus, builder: (column) => column);

  GeneratedColumn<bool> get customReceiptPricingEnabled => $composableBuilder(
      column: $table.customReceiptPricingEnabled, builder: (column) => column);

  GeneratedColumn<bool> get showLogo =>
      $composableBuilder(column: $table.showLogo, builder: (column) => column);

  GeneratedColumn<String> get cacNumber =>
      $composableBuilder(column: $table.cacNumber, builder: (column) => column);

  GeneratedColumn<bool> get showCacNumber => $composableBuilder(
      column: $table.showCacNumber, builder: (column) => column);

  GeneratedColumn<bool> get showTotalSalesCard => $composableBuilder(
      column: $table.showTotalSalesCard, builder: (column) => column);
}

class $$SettingsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $SettingsTable,
    SettingsTable,
    $$SettingsTableFilterComposer,
    $$SettingsTableOrderingComposer,
    $$SettingsTableAnnotationComposer,
    $$SettingsTableCreateCompanionBuilder,
    $$SettingsTableUpdateCompanionBuilder,
    (
      SettingsTable,
      BaseReferences<_$AppDatabase, $SettingsTable, SettingsTable>
    ),
    SettingsTable,
    PrefetchHooks Function()> {
  $$SettingsTableTableManager(_$AppDatabase db, $SettingsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SettingsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SettingsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SettingsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> organizationName = const Value.absent(),
            Value<String> address = const Value.absent(),
            Value<String> phone = const Value.absent(),
            Value<String?> businessDescription = const Value.absent(),
            Value<String?> taxId = const Value.absent(),
            Value<String?> logoPath = const Value.absent(),
            Value<Uint8List?> logo = const Value.absent(),
            Value<String> themeMode = const Value.absent(),
            Value<String> currency = const Value.absent(),
            Value<bool> taxEnabled = const Value.absent(),
            Value<bool> discountEnabled = const Value.absent(),
            Value<String> defaultInvoiceTemplate = const Value.absent(),
            Value<bool> confirmPriceOnSelection = const Value.absent(),
            Value<double> taxRate = const Value.absent(),
            Value<String?> bankName = const Value.absent(),
            Value<String?> accountNumber = const Value.absent(),
            Value<String?> accountName = const Value.absent(),
            Value<bool> showAccountDetails = const Value.absent(),
            Value<String> receiptFooter = const Value.absent(),
            Value<bool> showSignatureSpace = const Value.absent(),
            Value<bool> paymentMethodsEnabled = const Value.absent(),
            Value<int> primaryColor = const Value.absent(),
            Value<int> failedAttempts = const Value.absent(),
            Value<bool> isLocked = const Value.absent(),
            Value<DateTime?> lockedAt = const Value.absent(),
            Value<bool> showDateTime = const Value.absent(),
            Value<bool> serviceBillingEnabled = const Value.absent(),
            Value<String?> serviceTypes = const Value.absent(),
            Value<bool> staffManagementEnabled = const Value.absent(),
            Value<int> paperWidth = const Value.absent(),
            Value<int> halfDayStartHour = const Value.absent(),
            Value<int> halfDayEndHour = const Value.absent(),
            Value<bool> showSyncStatus = const Value.absent(),
            Value<bool> customReceiptPricingEnabled = const Value.absent(),
            Value<bool> showLogo = const Value.absent(),
            Value<String?> cacNumber = const Value.absent(),
            Value<bool> showCacNumber = const Value.absent(),
            Value<bool> showTotalSalesCard = const Value.absent(),
          }) =>
              SettingsCompanion(
            id: id,
            organizationName: organizationName,
            address: address,
            phone: phone,
            businessDescription: businessDescription,
            taxId: taxId,
            logoPath: logoPath,
            logo: logo,
            themeMode: themeMode,
            currency: currency,
            taxEnabled: taxEnabled,
            discountEnabled: discountEnabled,
            defaultInvoiceTemplate: defaultInvoiceTemplate,
            confirmPriceOnSelection: confirmPriceOnSelection,
            taxRate: taxRate,
            bankName: bankName,
            accountNumber: accountNumber,
            accountName: accountName,
            showAccountDetails: showAccountDetails,
            receiptFooter: receiptFooter,
            showSignatureSpace: showSignatureSpace,
            paymentMethodsEnabled: paymentMethodsEnabled,
            primaryColor: primaryColor,
            failedAttempts: failedAttempts,
            isLocked: isLocked,
            lockedAt: lockedAt,
            showDateTime: showDateTime,
            serviceBillingEnabled: serviceBillingEnabled,
            serviceTypes: serviceTypes,
            staffManagementEnabled: staffManagementEnabled,
            paperWidth: paperWidth,
            halfDayStartHour: halfDayStartHour,
            halfDayEndHour: halfDayEndHour,
            showSyncStatus: showSyncStatus,
            customReceiptPricingEnabled: customReceiptPricingEnabled,
            showLogo: showLogo,
            cacNumber: cacNumber,
            showCacNumber: showCacNumber,
            showTotalSalesCard: showTotalSalesCard,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String organizationName,
            required String address,
            required String phone,
            Value<String?> businessDescription = const Value.absent(),
            Value<String?> taxId = const Value.absent(),
            Value<String?> logoPath = const Value.absent(),
            Value<Uint8List?> logo = const Value.absent(),
            Value<String> themeMode = const Value.absent(),
            Value<String> currency = const Value.absent(),
            Value<bool> taxEnabled = const Value.absent(),
            Value<bool> discountEnabled = const Value.absent(),
            Value<String> defaultInvoiceTemplate = const Value.absent(),
            Value<bool> confirmPriceOnSelection = const Value.absent(),
            Value<double> taxRate = const Value.absent(),
            Value<String?> bankName = const Value.absent(),
            Value<String?> accountNumber = const Value.absent(),
            Value<String?> accountName = const Value.absent(),
            Value<bool> showAccountDetails = const Value.absent(),
            Value<String> receiptFooter = const Value.absent(),
            Value<bool> showSignatureSpace = const Value.absent(),
            Value<bool> paymentMethodsEnabled = const Value.absent(),
            Value<int> primaryColor = const Value.absent(),
            Value<int> failedAttempts = const Value.absent(),
            Value<bool> isLocked = const Value.absent(),
            Value<DateTime?> lockedAt = const Value.absent(),
            Value<bool> showDateTime = const Value.absent(),
            Value<bool> serviceBillingEnabled = const Value.absent(),
            Value<String?> serviceTypes = const Value.absent(),
            Value<bool> staffManagementEnabled = const Value.absent(),
            Value<int> paperWidth = const Value.absent(),
            Value<int> halfDayStartHour = const Value.absent(),
            Value<int> halfDayEndHour = const Value.absent(),
            Value<bool> showSyncStatus = const Value.absent(),
            Value<bool> customReceiptPricingEnabled = const Value.absent(),
            Value<bool> showLogo = const Value.absent(),
            Value<String?> cacNumber = const Value.absent(),
            Value<bool> showCacNumber = const Value.absent(),
            Value<bool> showTotalSalesCard = const Value.absent(),
          }) =>
              SettingsCompanion.insert(
            id: id,
            organizationName: organizationName,
            address: address,
            phone: phone,
            businessDescription: businessDescription,
            taxId: taxId,
            logoPath: logoPath,
            logo: logo,
            themeMode: themeMode,
            currency: currency,
            taxEnabled: taxEnabled,
            discountEnabled: discountEnabled,
            defaultInvoiceTemplate: defaultInvoiceTemplate,
            confirmPriceOnSelection: confirmPriceOnSelection,
            taxRate: taxRate,
            bankName: bankName,
            accountNumber: accountNumber,
            accountName: accountName,
            showAccountDetails: showAccountDetails,
            receiptFooter: receiptFooter,
            showSignatureSpace: showSignatureSpace,
            paymentMethodsEnabled: paymentMethodsEnabled,
            primaryColor: primaryColor,
            failedAttempts: failedAttempts,
            isLocked: isLocked,
            lockedAt: lockedAt,
            showDateTime: showDateTime,
            serviceBillingEnabled: serviceBillingEnabled,
            serviceTypes: serviceTypes,
            staffManagementEnabled: staffManagementEnabled,
            paperWidth: paperWidth,
            halfDayStartHour: halfDayStartHour,
            halfDayEndHour: halfDayEndHour,
            showSyncStatus: showSyncStatus,
            customReceiptPricingEnabled: customReceiptPricingEnabled,
            showLogo: showLogo,
            cacNumber: cacNumber,
            showCacNumber: showCacNumber,
            showTotalSalesCard: showTotalSalesCard,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$SettingsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $SettingsTable,
    SettingsTable,
    $$SettingsTableFilterComposer,
    $$SettingsTableOrderingComposer,
    $$SettingsTableAnnotationComposer,
    $$SettingsTableCreateCompanionBuilder,
    $$SettingsTableUpdateCompanionBuilder,
    (
      SettingsTable,
      BaseReferences<_$AppDatabase, $SettingsTable, SettingsTable>
    ),
    SettingsTable,
    PrefetchHooks Function()>;
typedef $$LicenseHistoryTableCreateCompanionBuilder = LicenseHistoryCompanion
    Function({
  Value<int> id,
  required String licenseId,
  required String businessName,
  required String code,
  required String plan,
  required DateTime expiryDate,
  required DateTime createdAt,
  Value<bool> isActivated,
});
typedef $$LicenseHistoryTableUpdateCompanionBuilder = LicenseHistoryCompanion
    Function({
  Value<int> id,
  Value<String> licenseId,
  Value<String> businessName,
  Value<String> code,
  Value<String> plan,
  Value<DateTime> expiryDate,
  Value<DateTime> createdAt,
  Value<bool> isActivated,
});

class $$LicenseHistoryTableFilterComposer
    extends Composer<_$AppDatabase, $LicenseHistoryTable> {
  $$LicenseHistoryTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get licenseId => $composableBuilder(
      column: $table.licenseId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get businessName => $composableBuilder(
      column: $table.businessName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get code => $composableBuilder(
      column: $table.code, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get plan => $composableBuilder(
      column: $table.plan, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get expiryDate => $composableBuilder(
      column: $table.expiryDate, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isActivated => $composableBuilder(
      column: $table.isActivated, builder: (column) => ColumnFilters(column));
}

class $$LicenseHistoryTableOrderingComposer
    extends Composer<_$AppDatabase, $LicenseHistoryTable> {
  $$LicenseHistoryTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get licenseId => $composableBuilder(
      column: $table.licenseId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get businessName => $composableBuilder(
      column: $table.businessName,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get code => $composableBuilder(
      column: $table.code, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get plan => $composableBuilder(
      column: $table.plan, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get expiryDate => $composableBuilder(
      column: $table.expiryDate, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isActivated => $composableBuilder(
      column: $table.isActivated, builder: (column) => ColumnOrderings(column));
}

class $$LicenseHistoryTableAnnotationComposer
    extends Composer<_$AppDatabase, $LicenseHistoryTable> {
  $$LicenseHistoryTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get licenseId =>
      $composableBuilder(column: $table.licenseId, builder: (column) => column);

  GeneratedColumn<String> get businessName => $composableBuilder(
      column: $table.businessName, builder: (column) => column);

  GeneratedColumn<String> get code =>
      $composableBuilder(column: $table.code, builder: (column) => column);

  GeneratedColumn<String> get plan =>
      $composableBuilder(column: $table.plan, builder: (column) => column);

  GeneratedColumn<DateTime> get expiryDate => $composableBuilder(
      column: $table.expiryDate, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<bool> get isActivated => $composableBuilder(
      column: $table.isActivated, builder: (column) => column);
}

class $$LicenseHistoryTableTableManager extends RootTableManager<
    _$AppDatabase,
    $LicenseHistoryTable,
    LicenseHistoryData,
    $$LicenseHistoryTableFilterComposer,
    $$LicenseHistoryTableOrderingComposer,
    $$LicenseHistoryTableAnnotationComposer,
    $$LicenseHistoryTableCreateCompanionBuilder,
    $$LicenseHistoryTableUpdateCompanionBuilder,
    (
      LicenseHistoryData,
      BaseReferences<_$AppDatabase, $LicenseHistoryTable, LicenseHistoryData>
    ),
    LicenseHistoryData,
    PrefetchHooks Function()> {
  $$LicenseHistoryTableTableManager(
      _$AppDatabase db, $LicenseHistoryTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$LicenseHistoryTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$LicenseHistoryTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$LicenseHistoryTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> licenseId = const Value.absent(),
            Value<String> businessName = const Value.absent(),
            Value<String> code = const Value.absent(),
            Value<String> plan = const Value.absent(),
            Value<DateTime> expiryDate = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<bool> isActivated = const Value.absent(),
          }) =>
              LicenseHistoryCompanion(
            id: id,
            licenseId: licenseId,
            businessName: businessName,
            code: code,
            plan: plan,
            expiryDate: expiryDate,
            createdAt: createdAt,
            isActivated: isActivated,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String licenseId,
            required String businessName,
            required String code,
            required String plan,
            required DateTime expiryDate,
            required DateTime createdAt,
            Value<bool> isActivated = const Value.absent(),
          }) =>
              LicenseHistoryCompanion.insert(
            id: id,
            licenseId: licenseId,
            businessName: businessName,
            code: code,
            plan: plan,
            expiryDate: expiryDate,
            createdAt: createdAt,
            isActivated: isActivated,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$LicenseHistoryTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $LicenseHistoryTable,
    LicenseHistoryData,
    $$LicenseHistoryTableFilterComposer,
    $$LicenseHistoryTableOrderingComposer,
    $$LicenseHistoryTableAnnotationComposer,
    $$LicenseHistoryTableCreateCompanionBuilder,
    $$LicenseHistoryTableUpdateCompanionBuilder,
    (
      LicenseHistoryData,
      BaseReferences<_$AppDatabase, $LicenseHistoryTable, LicenseHistoryData>
    ),
    LicenseHistoryData,
    PrefetchHooks Function()>;
typedef $$StaffTableCreateCompanionBuilder = StaffCompanion Function({
  Value<int> id,
  required String name,
  required String staffCode,
  Value<bool> isActive,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});
typedef $$StaffTableUpdateCompanionBuilder = StaffCompanion Function({
  Value<int> id,
  Value<String> name,
  Value<String> staffCode,
  Value<bool> isActive,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});

class $$StaffTableFilterComposer extends Composer<_$AppDatabase, $StaffTable> {
  $$StaffTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get staffCode => $composableBuilder(
      column: $table.staffCode, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isActive => $composableBuilder(
      column: $table.isActive, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get syncId => $composableBuilder(
      column: $table.syncId, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get deviceId => $composableBuilder(
      column: $table.deviceId, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isDeleted => $composableBuilder(
      column: $table.isDeleted, builder: (column) => ColumnFilters(column));
}

class $$StaffTableOrderingComposer
    extends Composer<_$AppDatabase, $StaffTable> {
  $$StaffTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get staffCode => $composableBuilder(
      column: $table.staffCode, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isActive => $composableBuilder(
      column: $table.isActive, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get syncId => $composableBuilder(
      column: $table.syncId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get deviceId => $composableBuilder(
      column: $table.deviceId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isDeleted => $composableBuilder(
      column: $table.isDeleted, builder: (column) => ColumnOrderings(column));
}

class $$StaffTableAnnotationComposer
    extends Composer<_$AppDatabase, $StaffTable> {
  $$StaffTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get staffCode =>
      $composableBuilder(column: $table.staffCode, builder: (column) => column);

  GeneratedColumn<bool> get isActive =>
      $composableBuilder(column: $table.isActive, builder: (column) => column);

  GeneratedColumn<String> get syncId =>
      $composableBuilder(column: $table.syncId, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<String> get deviceId =>
      $composableBuilder(column: $table.deviceId, builder: (column) => column);

  GeneratedColumn<bool> get isDeleted =>
      $composableBuilder(column: $table.isDeleted, builder: (column) => column);
}

class $$StaffTableTableManager extends RootTableManager<
    _$AppDatabase,
    $StaffTable,
    StaffTable,
    $$StaffTableFilterComposer,
    $$StaffTableOrderingComposer,
    $$StaffTableAnnotationComposer,
    $$StaffTableCreateCompanionBuilder,
    $$StaffTableUpdateCompanionBuilder,
    (StaffTable, BaseReferences<_$AppDatabase, $StaffTable, StaffTable>),
    StaffTable,
    PrefetchHooks Function()> {
  $$StaffTableTableManager(_$AppDatabase db, $StaffTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$StaffTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$StaffTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$StaffTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> name = const Value.absent(),
            Value<String> staffCode = const Value.absent(),
            Value<bool> isActive = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              StaffCompanion(
            id: id,
            name: name,
            staffCode: staffCode,
            isActive: isActive,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String name,
            required String staffCode,
            Value<bool> isActive = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              StaffCompanion.insert(
            id: id,
            name: name,
            staffCode: staffCode,
            isActive: isActive,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$StaffTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $StaffTable,
    StaffTable,
    $$StaffTableFilterComposer,
    $$StaffTableOrderingComposer,
    $$StaffTableAnnotationComposer,
    $$StaffTableCreateCompanionBuilder,
    $$StaffTableUpdateCompanionBuilder,
    (StaffTable, BaseReferences<_$AppDatabase, $StaffTable, StaffTable>),
    StaffTable,
    PrefetchHooks Function()>;
typedef $$SyncMetaTableCreateCompanionBuilder = SyncMetaCompanion Function({
  Value<int> id,
  required String deviceId,
  required String deviceName,
  Value<bool> isMaster,
  Value<String?> secretToken,
  Value<DateTime?> lastSyncTime,
});
typedef $$SyncMetaTableUpdateCompanionBuilder = SyncMetaCompanion Function({
  Value<int> id,
  Value<String> deviceId,
  Value<String> deviceName,
  Value<bool> isMaster,
  Value<String?> secretToken,
  Value<DateTime?> lastSyncTime,
});

class $$SyncMetaTableFilterComposer
    extends Composer<_$AppDatabase, $SyncMetaTable> {
  $$SyncMetaTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get deviceId => $composableBuilder(
      column: $table.deviceId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get deviceName => $composableBuilder(
      column: $table.deviceName, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isMaster => $composableBuilder(
      column: $table.isMaster, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get secretToken => $composableBuilder(
      column: $table.secretToken, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get lastSyncTime => $composableBuilder(
      column: $table.lastSyncTime, builder: (column) => ColumnFilters(column));
}

class $$SyncMetaTableOrderingComposer
    extends Composer<_$AppDatabase, $SyncMetaTable> {
  $$SyncMetaTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get deviceId => $composableBuilder(
      column: $table.deviceId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get deviceName => $composableBuilder(
      column: $table.deviceName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isMaster => $composableBuilder(
      column: $table.isMaster, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get secretToken => $composableBuilder(
      column: $table.secretToken, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get lastSyncTime => $composableBuilder(
      column: $table.lastSyncTime,
      builder: (column) => ColumnOrderings(column));
}

class $$SyncMetaTableAnnotationComposer
    extends Composer<_$AppDatabase, $SyncMetaTable> {
  $$SyncMetaTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get deviceId =>
      $composableBuilder(column: $table.deviceId, builder: (column) => column);

  GeneratedColumn<String> get deviceName => $composableBuilder(
      column: $table.deviceName, builder: (column) => column);

  GeneratedColumn<bool> get isMaster =>
      $composableBuilder(column: $table.isMaster, builder: (column) => column);

  GeneratedColumn<String> get secretToken => $composableBuilder(
      column: $table.secretToken, builder: (column) => column);

  GeneratedColumn<DateTime> get lastSyncTime => $composableBuilder(
      column: $table.lastSyncTime, builder: (column) => column);
}

class $$SyncMetaTableTableManager extends RootTableManager<
    _$AppDatabase,
    $SyncMetaTable,
    SyncMetaTable,
    $$SyncMetaTableFilterComposer,
    $$SyncMetaTableOrderingComposer,
    $$SyncMetaTableAnnotationComposer,
    $$SyncMetaTableCreateCompanionBuilder,
    $$SyncMetaTableUpdateCompanionBuilder,
    (
      SyncMetaTable,
      BaseReferences<_$AppDatabase, $SyncMetaTable, SyncMetaTable>
    ),
    SyncMetaTable,
    PrefetchHooks Function()> {
  $$SyncMetaTableTableManager(_$AppDatabase db, $SyncMetaTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SyncMetaTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SyncMetaTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SyncMetaTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> deviceId = const Value.absent(),
            Value<String> deviceName = const Value.absent(),
            Value<bool> isMaster = const Value.absent(),
            Value<String?> secretToken = const Value.absent(),
            Value<DateTime?> lastSyncTime = const Value.absent(),
          }) =>
              SyncMetaCompanion(
            id: id,
            deviceId: deviceId,
            deviceName: deviceName,
            isMaster: isMaster,
            secretToken: secretToken,
            lastSyncTime: lastSyncTime,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String deviceId,
            required String deviceName,
            Value<bool> isMaster = const Value.absent(),
            Value<String?> secretToken = const Value.absent(),
            Value<DateTime?> lastSyncTime = const Value.absent(),
          }) =>
              SyncMetaCompanion.insert(
            id: id,
            deviceId: deviceId,
            deviceName: deviceName,
            isMaster: isMaster,
            secretToken: secretToken,
            lastSyncTime: lastSyncTime,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$SyncMetaTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $SyncMetaTable,
    SyncMetaTable,
    $$SyncMetaTableFilterComposer,
    $$SyncMetaTableOrderingComposer,
    $$SyncMetaTableAnnotationComposer,
    $$SyncMetaTableCreateCompanionBuilder,
    $$SyncMetaTableUpdateCompanionBuilder,
    (
      SyncMetaTable,
      BaseReferences<_$AppDatabase, $SyncMetaTable, SyncMetaTable>
    ),
    SyncMetaTable,
    PrefetchHooks Function()>;
typedef $$StockIncrementsTableCreateCompanionBuilder = StockIncrementsCompanion
    Function({
  Value<int> id,
  required int itemId,
  required int quantityAdded,
  Value<int> quantityBefore,
  Value<int> quantityAfter,
  Value<DateTime> dateAdded,
  Value<String?> remarks,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});
typedef $$StockIncrementsTableUpdateCompanionBuilder = StockIncrementsCompanion
    Function({
  Value<int> id,
  Value<int> itemId,
  Value<int> quantityAdded,
  Value<int> quantityBefore,
  Value<int> quantityAfter,
  Value<DateTime> dateAdded,
  Value<String?> remarks,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});

final class $$StockIncrementsTableReferences extends BaseReferences<
    _$AppDatabase, $StockIncrementsTable, StockIncrementTable> {
  $$StockIncrementsTableReferences(
      super.$_db, super.$_table, super.$_typedResult);

  static $ItemsTable _itemIdTable(_$AppDatabase db) => db.items.createAlias(
      $_aliasNameGenerator(db.stockIncrements.itemId, db.items.id));

  $$ItemsTableProcessedTableManager get itemId {
    final $_column = $_itemColumn<int>('item_id')!;

    final manager = $$ItemsTableTableManager($_db, $_db.items)
        .filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_itemIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }
}

class $$StockIncrementsTableFilterComposer
    extends Composer<_$AppDatabase, $StockIncrementsTable> {
  $$StockIncrementsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get quantityAdded => $composableBuilder(
      column: $table.quantityAdded, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get quantityBefore => $composableBuilder(
      column: $table.quantityBefore,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get quantityAfter => $composableBuilder(
      column: $table.quantityAfter, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get dateAdded => $composableBuilder(
      column: $table.dateAdded, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get remarks => $composableBuilder(
      column: $table.remarks, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get syncId => $composableBuilder(
      column: $table.syncId, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get deviceId => $composableBuilder(
      column: $table.deviceId, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isDeleted => $composableBuilder(
      column: $table.isDeleted, builder: (column) => ColumnFilters(column));

  $$ItemsTableFilterComposer get itemId {
    final $$ItemsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.itemId,
        referencedTable: $db.items,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ItemsTableFilterComposer(
              $db: $db,
              $table: $db.items,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$StockIncrementsTableOrderingComposer
    extends Composer<_$AppDatabase, $StockIncrementsTable> {
  $$StockIncrementsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get quantityAdded => $composableBuilder(
      column: $table.quantityAdded,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get quantityBefore => $composableBuilder(
      column: $table.quantityBefore,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get quantityAfter => $composableBuilder(
      column: $table.quantityAfter,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get dateAdded => $composableBuilder(
      column: $table.dateAdded, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get remarks => $composableBuilder(
      column: $table.remarks, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get syncId => $composableBuilder(
      column: $table.syncId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get deviceId => $composableBuilder(
      column: $table.deviceId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isDeleted => $composableBuilder(
      column: $table.isDeleted, builder: (column) => ColumnOrderings(column));

  $$ItemsTableOrderingComposer get itemId {
    final $$ItemsTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.itemId,
        referencedTable: $db.items,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ItemsTableOrderingComposer(
              $db: $db,
              $table: $db.items,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$StockIncrementsTableAnnotationComposer
    extends Composer<_$AppDatabase, $StockIncrementsTable> {
  $$StockIncrementsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<int> get quantityAdded => $composableBuilder(
      column: $table.quantityAdded, builder: (column) => column);

  GeneratedColumn<int> get quantityBefore => $composableBuilder(
      column: $table.quantityBefore, builder: (column) => column);

  GeneratedColumn<int> get quantityAfter => $composableBuilder(
      column: $table.quantityAfter, builder: (column) => column);

  GeneratedColumn<DateTime> get dateAdded =>
      $composableBuilder(column: $table.dateAdded, builder: (column) => column);

  GeneratedColumn<String> get remarks =>
      $composableBuilder(column: $table.remarks, builder: (column) => column);

  GeneratedColumn<String> get syncId =>
      $composableBuilder(column: $table.syncId, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<String> get deviceId =>
      $composableBuilder(column: $table.deviceId, builder: (column) => column);

  GeneratedColumn<bool> get isDeleted =>
      $composableBuilder(column: $table.isDeleted, builder: (column) => column);

  $$ItemsTableAnnotationComposer get itemId {
    final $$ItemsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.itemId,
        referencedTable: $db.items,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ItemsTableAnnotationComposer(
              $db: $db,
              $table: $db.items,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$StockIncrementsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $StockIncrementsTable,
    StockIncrementTable,
    $$StockIncrementsTableFilterComposer,
    $$StockIncrementsTableOrderingComposer,
    $$StockIncrementsTableAnnotationComposer,
    $$StockIncrementsTableCreateCompanionBuilder,
    $$StockIncrementsTableUpdateCompanionBuilder,
    (StockIncrementTable, $$StockIncrementsTableReferences),
    StockIncrementTable,
    PrefetchHooks Function({bool itemId})> {
  $$StockIncrementsTableTableManager(
      _$AppDatabase db, $StockIncrementsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$StockIncrementsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$StockIncrementsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$StockIncrementsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<int> itemId = const Value.absent(),
            Value<int> quantityAdded = const Value.absent(),
            Value<int> quantityBefore = const Value.absent(),
            Value<int> quantityAfter = const Value.absent(),
            Value<DateTime> dateAdded = const Value.absent(),
            Value<String?> remarks = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              StockIncrementsCompanion(
            id: id,
            itemId: itemId,
            quantityAdded: quantityAdded,
            quantityBefore: quantityBefore,
            quantityAfter: quantityAfter,
            dateAdded: dateAdded,
            remarks: remarks,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required int itemId,
            required int quantityAdded,
            Value<int> quantityBefore = const Value.absent(),
            Value<int> quantityAfter = const Value.absent(),
            Value<DateTime> dateAdded = const Value.absent(),
            Value<String?> remarks = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              StockIncrementsCompanion.insert(
            id: id,
            itemId: itemId,
            quantityAdded: quantityAdded,
            quantityBefore: quantityBefore,
            quantityAfter: quantityAfter,
            dateAdded: dateAdded,
            remarks: remarks,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable(table),
                    $$StockIncrementsTableReferences(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: ({itemId = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins: <
                  T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic>>(state) {
                if (itemId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.itemId,
                    referencedTable:
                        $$StockIncrementsTableReferences._itemIdTable(db),
                    referencedColumn:
                        $$StockIncrementsTableReferences._itemIdTable(db).id,
                  ) as T;
                }

                return state;
              },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ));
}

typedef $$StockIncrementsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $StockIncrementsTable,
    StockIncrementTable,
    $$StockIncrementsTableFilterComposer,
    $$StockIncrementsTableOrderingComposer,
    $$StockIncrementsTableAnnotationComposer,
    $$StockIncrementsTableCreateCompanionBuilder,
    $$StockIncrementsTableUpdateCompanionBuilder,
    (StockIncrementTable, $$StockIncrementsTableReferences),
    StockIncrementTable,
    PrefetchHooks Function({bool itemId})>;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$CategoriesTableTableManager get categories =>
      $$CategoriesTableTableManager(_db, _db.categories);
  $$ItemsTableTableManager get items =>
      $$ItemsTableTableManager(_db, _db.items);
  $$InvoicesTableTableManager get invoices =>
      $$InvoicesTableTableManager(_db, _db.invoices);
  $$InvoiceItemsTableTableManager get invoiceItems =>
      $$InvoiceItemsTableTableManager(_db, _db.invoiceItems);
  $$SettingsTableTableManager get settings =>
      $$SettingsTableTableManager(_db, _db.settings);
  $$LicenseHistoryTableTableManager get licenseHistory =>
      $$LicenseHistoryTableTableManager(_db, _db.licenseHistory);
  $$StaffTableTableManager get staff =>
      $$StaffTableTableManager(_db, _db.staff);
  $$SyncMetaTableTableManager get syncMeta =>
      $$SyncMetaTableTableManager(_db, _db.syncMeta);
  $$StockIncrementsTableTableManager get stockIncrements =>
      $$StockIncrementsTableTableManager(_db, _db.stockIncrements);
}
