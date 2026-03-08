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
  static const VerificationMeta _businessModeMeta =
      const VerificationMeta('businessMode');
  @override
  late final GeneratedColumn<String> businessMode = GeneratedColumn<String>(
      'business_mode', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('retail'));
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
        businessMode,
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
    if (data.containsKey('business_mode')) {
      context.handle(
          _businessModeMeta,
          businessMode.isAcceptableOrUnknown(
              data['business_mode']!, _businessModeMeta));
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
      businessMode: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}business_mode'])!,
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
  final String businessMode;
  final String? syncId;
  final DateTime? updatedAt;
  final DateTime? createdAt;
  final String? deviceId;
  final bool isDeleted;
  const CategoryTable(
      {required this.id,
      required this.name,
      required this.businessMode,
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
    map['business_mode'] = Variable<String>(businessMode);
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
      businessMode: Value(businessMode),
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
      businessMode: serializer.fromJson<String>(json['businessMode']),
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
      'businessMode': serializer.toJson<String>(businessMode),
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
          String? businessMode,
          Value<String?> syncId = const Value.absent(),
          Value<DateTime?> updatedAt = const Value.absent(),
          Value<DateTime?> createdAt = const Value.absent(),
          Value<String?> deviceId = const Value.absent(),
          bool? isDeleted}) =>
      CategoryTable(
        id: id ?? this.id,
        name: name ?? this.name,
        businessMode: businessMode ?? this.businessMode,
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
      businessMode: data.businessMode.present
          ? data.businessMode.value
          : this.businessMode,
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
          ..write('businessMode: $businessMode, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, name, businessMode, syncId, updatedAt,
      createdAt, deviceId, isDeleted);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CategoryTable &&
          other.id == this.id &&
          other.name == this.name &&
          other.businessMode == this.businessMode &&
          other.syncId == this.syncId &&
          other.updatedAt == this.updatedAt &&
          other.createdAt == this.createdAt &&
          other.deviceId == this.deviceId &&
          other.isDeleted == this.isDeleted);
}

class CategoriesCompanion extends UpdateCompanion<CategoryTable> {
  final Value<int> id;
  final Value<String> name;
  final Value<String> businessMode;
  final Value<String?> syncId;
  final Value<DateTime?> updatedAt;
  final Value<DateTime?> createdAt;
  final Value<String?> deviceId;
  final Value<bool> isDeleted;
  const CategoriesCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.businessMode = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  });
  CategoriesCompanion.insert({
    this.id = const Value.absent(),
    required String name,
    this.businessMode = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  }) : name = Value(name);
  static Insertable<CategoryTable> custom({
    Expression<int>? id,
    Expression<String>? name,
    Expression<String>? businessMode,
    Expression<String>? syncId,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? createdAt,
    Expression<String>? deviceId,
    Expression<bool>? isDeleted,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (businessMode != null) 'business_mode': businessMode,
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
      Value<String>? businessMode,
      Value<String?>? syncId,
      Value<DateTime?>? updatedAt,
      Value<DateTime?>? createdAt,
      Value<String?>? deviceId,
      Value<bool>? isDeleted}) {
    return CategoriesCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      businessMode: businessMode ?? this.businessMode,
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
    if (businessMode.present) {
      map['business_mode'] = Variable<String>(businessMode.value);
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
          ..write('businessMode: $businessMode, ')
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
  static const VerificationMeta _costPriceMeta =
      const VerificationMeta('costPrice');
  @override
  late final GeneratedColumn<double> costPrice = GeneratedColumn<double>(
      'cost_price', aliasedName, false,
      type: DriftSqlType.double,
      requiredDuringInsert: false,
      defaultValue: const Constant(0.0));
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
  static const VerificationMeta _businessModeMeta =
      const VerificationMeta('businessMode');
  @override
  late final GeneratedColumn<String> businessMode = GeneratedColumn<String>(
      'business_mode', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('retail'));
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
  static const VerificationMeta _isDefaultMeta =
      const VerificationMeta('isDefault');
  @override
  late final GeneratedColumn<bool> isDefault = GeneratedColumn<bool>(
      'is_default', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_default" IN (0, 1))'),
      defaultValue: const Constant(false));
  @override
  List<GeneratedColumn> get $columns => [
        id,
        name,
        category,
        price,
        costPrice,
        stockQty,
        minStockQty,
        image,
        categoryId,
        type,
        billingType,
        serviceCategory,
        requiresTimeTracking,
        businessMode,
        syncId,
        updatedAt,
        createdAt,
        deviceId,
        isDeleted,
        isDefault
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
    if (data.containsKey('cost_price')) {
      context.handle(_costPriceMeta,
          costPrice.isAcceptableOrUnknown(data['cost_price']!, _costPriceMeta));
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
    if (data.containsKey('business_mode')) {
      context.handle(
          _businessModeMeta,
          businessMode.isAcceptableOrUnknown(
              data['business_mode']!, _businessModeMeta));
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
    if (data.containsKey('is_default')) {
      context.handle(_isDefaultMeta,
          isDefault.isAcceptableOrUnknown(data['is_default']!, _isDefaultMeta));
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
      costPrice: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}cost_price'])!,
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
      businessMode: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}business_mode'])!,
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
      isDefault: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_default'])!,
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
  final double costPrice;
  final int stockQty;
  final double minStockQty;
  final Uint8List? image;
  final int? categoryId;
  final String type;
  final String? billingType;
  final String? serviceCategory;
  final bool requiresTimeTracking;
  final String businessMode;
  final String? syncId;
  final DateTime? updatedAt;
  final DateTime? createdAt;
  final String? deviceId;
  final bool isDeleted;
  final bool isDefault;
  const ItemTable(
      {required this.id,
      required this.name,
      required this.category,
      required this.price,
      required this.costPrice,
      required this.stockQty,
      required this.minStockQty,
      this.image,
      this.categoryId,
      required this.type,
      this.billingType,
      this.serviceCategory,
      required this.requiresTimeTracking,
      required this.businessMode,
      this.syncId,
      this.updatedAt,
      this.createdAt,
      this.deviceId,
      required this.isDeleted,
      required this.isDefault});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['name'] = Variable<String>(name);
    map['category'] = Variable<String>(category);
    map['price'] = Variable<double>(price);
    map['cost_price'] = Variable<double>(costPrice);
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
    map['business_mode'] = Variable<String>(businessMode);
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
    map['is_default'] = Variable<bool>(isDefault);
    return map;
  }

  ItemsCompanion toCompanion(bool nullToAbsent) {
    return ItemsCompanion(
      id: Value(id),
      name: Value(name),
      category: Value(category),
      price: Value(price),
      costPrice: Value(costPrice),
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
      businessMode: Value(businessMode),
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
      isDefault: Value(isDefault),
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
      costPrice: serializer.fromJson<double>(json['costPrice']),
      stockQty: serializer.fromJson<int>(json['stockQty']),
      minStockQty: serializer.fromJson<double>(json['minStockQty']),
      image: serializer.fromJson<Uint8List?>(json['image']),
      categoryId: serializer.fromJson<int?>(json['categoryId']),
      type: serializer.fromJson<String>(json['type']),
      billingType: serializer.fromJson<String?>(json['billingType']),
      serviceCategory: serializer.fromJson<String?>(json['serviceCategory']),
      requiresTimeTracking:
          serializer.fromJson<bool>(json['requiresTimeTracking']),
      businessMode: serializer.fromJson<String>(json['businessMode']),
      syncId: serializer.fromJson<String?>(json['syncId']),
      updatedAt: serializer.fromJson<DateTime?>(json['updatedAt']),
      createdAt: serializer.fromJson<DateTime?>(json['createdAt']),
      deviceId: serializer.fromJson<String?>(json['deviceId']),
      isDeleted: serializer.fromJson<bool>(json['isDeleted']),
      isDefault: serializer.fromJson<bool>(json['isDefault']),
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
      'costPrice': serializer.toJson<double>(costPrice),
      'stockQty': serializer.toJson<int>(stockQty),
      'minStockQty': serializer.toJson<double>(minStockQty),
      'image': serializer.toJson<Uint8List?>(image),
      'categoryId': serializer.toJson<int?>(categoryId),
      'type': serializer.toJson<String>(type),
      'billingType': serializer.toJson<String?>(billingType),
      'serviceCategory': serializer.toJson<String?>(serviceCategory),
      'requiresTimeTracking': serializer.toJson<bool>(requiresTimeTracking),
      'businessMode': serializer.toJson<String>(businessMode),
      'syncId': serializer.toJson<String?>(syncId),
      'updatedAt': serializer.toJson<DateTime?>(updatedAt),
      'createdAt': serializer.toJson<DateTime?>(createdAt),
      'deviceId': serializer.toJson<String?>(deviceId),
      'isDeleted': serializer.toJson<bool>(isDeleted),
      'isDefault': serializer.toJson<bool>(isDefault),
    };
  }

  ItemTable copyWith(
          {int? id,
          String? name,
          String? category,
          double? price,
          double? costPrice,
          int? stockQty,
          double? minStockQty,
          Value<Uint8List?> image = const Value.absent(),
          Value<int?> categoryId = const Value.absent(),
          String? type,
          Value<String?> billingType = const Value.absent(),
          Value<String?> serviceCategory = const Value.absent(),
          bool? requiresTimeTracking,
          String? businessMode,
          Value<String?> syncId = const Value.absent(),
          Value<DateTime?> updatedAt = const Value.absent(),
          Value<DateTime?> createdAt = const Value.absent(),
          Value<String?> deviceId = const Value.absent(),
          bool? isDeleted,
          bool? isDefault}) =>
      ItemTable(
        id: id ?? this.id,
        name: name ?? this.name,
        category: category ?? this.category,
        price: price ?? this.price,
        costPrice: costPrice ?? this.costPrice,
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
        businessMode: businessMode ?? this.businessMode,
        syncId: syncId.present ? syncId.value : this.syncId,
        updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
        createdAt: createdAt.present ? createdAt.value : this.createdAt,
        deviceId: deviceId.present ? deviceId.value : this.deviceId,
        isDeleted: isDeleted ?? this.isDeleted,
        isDefault: isDefault ?? this.isDefault,
      );
  ItemTable copyWithCompanion(ItemsCompanion data) {
    return ItemTable(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      category: data.category.present ? data.category.value : this.category,
      price: data.price.present ? data.price.value : this.price,
      costPrice: data.costPrice.present ? data.costPrice.value : this.costPrice,
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
      businessMode: data.businessMode.present
          ? data.businessMode.value
          : this.businessMode,
      syncId: data.syncId.present ? data.syncId.value : this.syncId,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      deviceId: data.deviceId.present ? data.deviceId.value : this.deviceId,
      isDeleted: data.isDeleted.present ? data.isDeleted.value : this.isDeleted,
      isDefault: data.isDefault.present ? data.isDefault.value : this.isDefault,
    );
  }

  @override
  String toString() {
    return (StringBuffer('ItemTable(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('category: $category, ')
          ..write('price: $price, ')
          ..write('costPrice: $costPrice, ')
          ..write('stockQty: $stockQty, ')
          ..write('minStockQty: $minStockQty, ')
          ..write('image: $image, ')
          ..write('categoryId: $categoryId, ')
          ..write('type: $type, ')
          ..write('billingType: $billingType, ')
          ..write('serviceCategory: $serviceCategory, ')
          ..write('requiresTimeTracking: $requiresTimeTracking, ')
          ..write('businessMode: $businessMode, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted, ')
          ..write('isDefault: $isDefault')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      name,
      category,
      price,
      costPrice,
      stockQty,
      minStockQty,
      $driftBlobEquality.hash(image),
      categoryId,
      type,
      billingType,
      serviceCategory,
      requiresTimeTracking,
      businessMode,
      syncId,
      updatedAt,
      createdAt,
      deviceId,
      isDeleted,
      isDefault);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ItemTable &&
          other.id == this.id &&
          other.name == this.name &&
          other.category == this.category &&
          other.price == this.price &&
          other.costPrice == this.costPrice &&
          other.stockQty == this.stockQty &&
          other.minStockQty == this.minStockQty &&
          $driftBlobEquality.equals(other.image, this.image) &&
          other.categoryId == this.categoryId &&
          other.type == this.type &&
          other.billingType == this.billingType &&
          other.serviceCategory == this.serviceCategory &&
          other.requiresTimeTracking == this.requiresTimeTracking &&
          other.businessMode == this.businessMode &&
          other.syncId == this.syncId &&
          other.updatedAt == this.updatedAt &&
          other.createdAt == this.createdAt &&
          other.deviceId == this.deviceId &&
          other.isDeleted == this.isDeleted &&
          other.isDefault == this.isDefault);
}

class ItemsCompanion extends UpdateCompanion<ItemTable> {
  final Value<int> id;
  final Value<String> name;
  final Value<String> category;
  final Value<double> price;
  final Value<double> costPrice;
  final Value<int> stockQty;
  final Value<double> minStockQty;
  final Value<Uint8List?> image;
  final Value<int?> categoryId;
  final Value<String> type;
  final Value<String?> billingType;
  final Value<String?> serviceCategory;
  final Value<bool> requiresTimeTracking;
  final Value<String> businessMode;
  final Value<String?> syncId;
  final Value<DateTime?> updatedAt;
  final Value<DateTime?> createdAt;
  final Value<String?> deviceId;
  final Value<bool> isDeleted;
  final Value<bool> isDefault;
  const ItemsCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.category = const Value.absent(),
    this.price = const Value.absent(),
    this.costPrice = const Value.absent(),
    this.stockQty = const Value.absent(),
    this.minStockQty = const Value.absent(),
    this.image = const Value.absent(),
    this.categoryId = const Value.absent(),
    this.type = const Value.absent(),
    this.billingType = const Value.absent(),
    this.serviceCategory = const Value.absent(),
    this.requiresTimeTracking = const Value.absent(),
    this.businessMode = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
    this.isDefault = const Value.absent(),
  });
  ItemsCompanion.insert({
    this.id = const Value.absent(),
    required String name,
    required String category,
    required double price,
    this.costPrice = const Value.absent(),
    this.stockQty = const Value.absent(),
    this.minStockQty = const Value.absent(),
    this.image = const Value.absent(),
    this.categoryId = const Value.absent(),
    this.type = const Value.absent(),
    this.billingType = const Value.absent(),
    this.serviceCategory = const Value.absent(),
    this.requiresTimeTracking = const Value.absent(),
    this.businessMode = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
    this.isDefault = const Value.absent(),
  })  : name = Value(name),
        category = Value(category),
        price = Value(price);
  static Insertable<ItemTable> custom({
    Expression<int>? id,
    Expression<String>? name,
    Expression<String>? category,
    Expression<double>? price,
    Expression<double>? costPrice,
    Expression<int>? stockQty,
    Expression<double>? minStockQty,
    Expression<Uint8List>? image,
    Expression<int>? categoryId,
    Expression<String>? type,
    Expression<String>? billingType,
    Expression<String>? serviceCategory,
    Expression<bool>? requiresTimeTracking,
    Expression<String>? businessMode,
    Expression<String>? syncId,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? createdAt,
    Expression<String>? deviceId,
    Expression<bool>? isDeleted,
    Expression<bool>? isDefault,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (category != null) 'category': category,
      if (price != null) 'price': price,
      if (costPrice != null) 'cost_price': costPrice,
      if (stockQty != null) 'stock_qty': stockQty,
      if (minStockQty != null) 'min_stock_qty': minStockQty,
      if (image != null) 'image': image,
      if (categoryId != null) 'category_id': categoryId,
      if (type != null) 'type': type,
      if (billingType != null) 'billing_type': billingType,
      if (serviceCategory != null) 'service_category': serviceCategory,
      if (requiresTimeTracking != null)
        'requires_time_tracking': requiresTimeTracking,
      if (businessMode != null) 'business_mode': businessMode,
      if (syncId != null) 'sync_id': syncId,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (createdAt != null) 'created_at': createdAt,
      if (deviceId != null) 'device_id': deviceId,
      if (isDeleted != null) 'is_deleted': isDeleted,
      if (isDefault != null) 'is_default': isDefault,
    });
  }

  ItemsCompanion copyWith(
      {Value<int>? id,
      Value<String>? name,
      Value<String>? category,
      Value<double>? price,
      Value<double>? costPrice,
      Value<int>? stockQty,
      Value<double>? minStockQty,
      Value<Uint8List?>? image,
      Value<int?>? categoryId,
      Value<String>? type,
      Value<String?>? billingType,
      Value<String?>? serviceCategory,
      Value<bool>? requiresTimeTracking,
      Value<String>? businessMode,
      Value<String?>? syncId,
      Value<DateTime?>? updatedAt,
      Value<DateTime?>? createdAt,
      Value<String?>? deviceId,
      Value<bool>? isDeleted,
      Value<bool>? isDefault}) {
    return ItemsCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      category: category ?? this.category,
      price: price ?? this.price,
      costPrice: costPrice ?? this.costPrice,
      stockQty: stockQty ?? this.stockQty,
      minStockQty: minStockQty ?? this.minStockQty,
      image: image ?? this.image,
      categoryId: categoryId ?? this.categoryId,
      type: type ?? this.type,
      billingType: billingType ?? this.billingType,
      serviceCategory: serviceCategory ?? this.serviceCategory,
      requiresTimeTracking: requiresTimeTracking ?? this.requiresTimeTracking,
      businessMode: businessMode ?? this.businessMode,
      syncId: syncId ?? this.syncId,
      updatedAt: updatedAt ?? this.updatedAt,
      createdAt: createdAt ?? this.createdAt,
      deviceId: deviceId ?? this.deviceId,
      isDeleted: isDeleted ?? this.isDeleted,
      isDefault: isDefault ?? this.isDefault,
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
    if (costPrice.present) {
      map['cost_price'] = Variable<double>(costPrice.value);
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
    if (businessMode.present) {
      map['business_mode'] = Variable<String>(businessMode.value);
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
    if (isDefault.present) {
      map['is_default'] = Variable<bool>(isDefault.value);
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
          ..write('costPrice: $costPrice, ')
          ..write('stockQty: $stockQty, ')
          ..write('minStockQty: $minStockQty, ')
          ..write('image: $image, ')
          ..write('categoryId: $categoryId, ')
          ..write('type: $type, ')
          ..write('billingType: $billingType, ')
          ..write('serviceCategory: $serviceCategory, ')
          ..write('requiresTimeTracking: $requiresTimeTracking, ')
          ..write('businessMode: $businessMode, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted, ')
          ..write('isDefault: $isDefault')
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
  static const VerificationMeta _discountTypeMeta =
      const VerificationMeta('discountType');
  @override
  late final GeneratedColumn<String> discountType = GeneratedColumn<String>(
      'discount_type', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('amount'));
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
  static const VerificationMeta _businessModeMeta =
      const VerificationMeta('businessMode');
  @override
  late final GeneratedColumn<String> businessMode = GeneratedColumn<String>(
      'business_mode', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('retail'));
  static const VerificationMeta _studentIdMeta =
      const VerificationMeta('studentId');
  @override
  late final GeneratedColumn<int> studentId = GeneratedColumn<int>(
      'student_id', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _classIdMeta =
      const VerificationMeta('classId');
  @override
  late final GeneratedColumn<int> classId = GeneratedColumn<int>(
      'class_id', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _termIdMeta = const VerificationMeta('termId');
  @override
  late final GeneratedColumn<int> termId = GeneratedColumn<int>(
      'term_id', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _academicYearIdMeta =
      const VerificationMeta('academicYearId');
  @override
  late final GeneratedColumn<int> academicYearId = GeneratedColumn<int>(
      'academic_year_id', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _admissionNumberMeta =
      const VerificationMeta('admissionNumber');
  @override
  late final GeneratedColumn<String> admissionNumber = GeneratedColumn<String>(
      'admission_number', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _classNameMeta =
      const VerificationMeta('className');
  @override
  late final GeneratedColumn<String> className = GeneratedColumn<String>(
      'class_name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _termNameMeta =
      const VerificationMeta('termName');
  @override
  late final GeneratedColumn<String> termName = GeneratedColumn<String>(
      'term_name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _academicYearNameMeta =
      const VerificationMeta('academicYearName');
  @override
  late final GeneratedColumn<String> academicYearName = GeneratedColumn<String>(
      'academic_year_name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _studentImageMeta =
      const VerificationMeta('studentImage');
  @override
  late final GeneratedColumn<Uint8List> studentImage =
      GeneratedColumn<Uint8List>('student_image', aliasedName, true,
          type: DriftSqlType.blob, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        invoiceNumber,
        dateCreated,
        subtotal,
        taxAmount,
        discountAmount,
        discountType,
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
        totalPrintAmount,
        businessMode,
        studentId,
        classId,
        termId,
        academicYearId,
        admissionNumber,
        className,
        termName,
        academicYearName,
        studentImage
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
    if (data.containsKey('discount_type')) {
      context.handle(
          _discountTypeMeta,
          discountType.isAcceptableOrUnknown(
              data['discount_type']!, _discountTypeMeta));
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
    if (data.containsKey('business_mode')) {
      context.handle(
          _businessModeMeta,
          businessMode.isAcceptableOrUnknown(
              data['business_mode']!, _businessModeMeta));
    }
    if (data.containsKey('student_id')) {
      context.handle(_studentIdMeta,
          studentId.isAcceptableOrUnknown(data['student_id']!, _studentIdMeta));
    }
    if (data.containsKey('class_id')) {
      context.handle(_classIdMeta,
          classId.isAcceptableOrUnknown(data['class_id']!, _classIdMeta));
    }
    if (data.containsKey('term_id')) {
      context.handle(_termIdMeta,
          termId.isAcceptableOrUnknown(data['term_id']!, _termIdMeta));
    }
    if (data.containsKey('academic_year_id')) {
      context.handle(
          _academicYearIdMeta,
          academicYearId.isAcceptableOrUnknown(
              data['academic_year_id']!, _academicYearIdMeta));
    }
    if (data.containsKey('admission_number')) {
      context.handle(
          _admissionNumberMeta,
          admissionNumber.isAcceptableOrUnknown(
              data['admission_number']!, _admissionNumberMeta));
    }
    if (data.containsKey('class_name')) {
      context.handle(_classNameMeta,
          className.isAcceptableOrUnknown(data['class_name']!, _classNameMeta));
    }
    if (data.containsKey('term_name')) {
      context.handle(_termNameMeta,
          termName.isAcceptableOrUnknown(data['term_name']!, _termNameMeta));
    }
    if (data.containsKey('academic_year_name')) {
      context.handle(
          _academicYearNameMeta,
          academicYearName.isAcceptableOrUnknown(
              data['academic_year_name']!, _academicYearNameMeta));
    }
    if (data.containsKey('student_image')) {
      context.handle(
          _studentImageMeta,
          studentImage.isAcceptableOrUnknown(
              data['student_image']!, _studentImageMeta));
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
      discountType: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}discount_type'])!,
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
      businessMode: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}business_mode'])!,
      studentId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}student_id']),
      classId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}class_id']),
      termId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}term_id']),
      academicYearId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}academic_year_id']),
      admissionNumber: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}admission_number']),
      className: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}class_name']),
      termName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}term_name']),
      academicYearName: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}academic_year_name']),
      studentImage: attachedDatabase.typeMapping
          .read(DriftSqlType.blob, data['${effectivePrefix}student_image']),
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
  final String discountType;
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
  final String businessMode;
  final int? studentId;
  final int? classId;
  final int? termId;
  final int? academicYearId;
  final String? admissionNumber;
  final String? className;
  final String? termName;
  final String? academicYearName;
  final Uint8List? studentImage;
  const InvoiceTable(
      {required this.id,
      required this.invoiceNumber,
      required this.dateCreated,
      required this.subtotal,
      required this.taxAmount,
      required this.discountAmount,
      required this.discountType,
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
      this.totalPrintAmount,
      required this.businessMode,
      this.studentId,
      this.classId,
      this.termId,
      this.academicYearId,
      this.admissionNumber,
      this.className,
      this.termName,
      this.academicYearName,
      this.studentImage});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['invoice_number'] = Variable<String>(invoiceNumber);
    map['date_created'] = Variable<DateTime>(dateCreated);
    map['subtotal'] = Variable<double>(subtotal);
    map['tax_amount'] = Variable<double>(taxAmount);
    map['discount_amount'] = Variable<double>(discountAmount);
    map['discount_type'] = Variable<String>(discountType);
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
    map['business_mode'] = Variable<String>(businessMode);
    if (!nullToAbsent || studentId != null) {
      map['student_id'] = Variable<int>(studentId);
    }
    if (!nullToAbsent || classId != null) {
      map['class_id'] = Variable<int>(classId);
    }
    if (!nullToAbsent || termId != null) {
      map['term_id'] = Variable<int>(termId);
    }
    if (!nullToAbsent || academicYearId != null) {
      map['academic_year_id'] = Variable<int>(academicYearId);
    }
    if (!nullToAbsent || admissionNumber != null) {
      map['admission_number'] = Variable<String>(admissionNumber);
    }
    if (!nullToAbsent || className != null) {
      map['class_name'] = Variable<String>(className);
    }
    if (!nullToAbsent || termName != null) {
      map['term_name'] = Variable<String>(termName);
    }
    if (!nullToAbsent || academicYearName != null) {
      map['academic_year_name'] = Variable<String>(academicYearName);
    }
    if (!nullToAbsent || studentImage != null) {
      map['student_image'] = Variable<Uint8List>(studentImage);
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
      discountType: Value(discountType),
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
      businessMode: Value(businessMode),
      studentId: studentId == null && nullToAbsent
          ? const Value.absent()
          : Value(studentId),
      classId: classId == null && nullToAbsent
          ? const Value.absent()
          : Value(classId),
      termId:
          termId == null && nullToAbsent ? const Value.absent() : Value(termId),
      academicYearId: academicYearId == null && nullToAbsent
          ? const Value.absent()
          : Value(academicYearId),
      admissionNumber: admissionNumber == null && nullToAbsent
          ? const Value.absent()
          : Value(admissionNumber),
      className: className == null && nullToAbsent
          ? const Value.absent()
          : Value(className),
      termName: termName == null && nullToAbsent
          ? const Value.absent()
          : Value(termName),
      academicYearName: academicYearName == null && nullToAbsent
          ? const Value.absent()
          : Value(academicYearName),
      studentImage: studentImage == null && nullToAbsent
          ? const Value.absent()
          : Value(studentImage),
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
      discountType: serializer.fromJson<String>(json['discountType']),
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
      businessMode: serializer.fromJson<String>(json['businessMode']),
      studentId: serializer.fromJson<int?>(json['studentId']),
      classId: serializer.fromJson<int?>(json['classId']),
      termId: serializer.fromJson<int?>(json['termId']),
      academicYearId: serializer.fromJson<int?>(json['academicYearId']),
      admissionNumber: serializer.fromJson<String?>(json['admissionNumber']),
      className: serializer.fromJson<String?>(json['className']),
      termName: serializer.fromJson<String?>(json['termName']),
      academicYearName: serializer.fromJson<String?>(json['academicYearName']),
      studentImage: serializer.fromJson<Uint8List?>(json['studentImage']),
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
      'discountType': serializer.toJson<String>(discountType),
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
      'businessMode': serializer.toJson<String>(businessMode),
      'studentId': serializer.toJson<int?>(studentId),
      'classId': serializer.toJson<int?>(classId),
      'termId': serializer.toJson<int?>(termId),
      'academicYearId': serializer.toJson<int?>(academicYearId),
      'admissionNumber': serializer.toJson<String?>(admissionNumber),
      'className': serializer.toJson<String?>(className),
      'termName': serializer.toJson<String?>(termName),
      'academicYearName': serializer.toJson<String?>(academicYearName),
      'studentImage': serializer.toJson<Uint8List?>(studentImage),
    };
  }

  InvoiceTable copyWith(
          {int? id,
          String? invoiceNumber,
          DateTime? dateCreated,
          double? subtotal,
          double? taxAmount,
          double? discountAmount,
          String? discountType,
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
          Value<double?> totalPrintAmount = const Value.absent(),
          String? businessMode,
          Value<int?> studentId = const Value.absent(),
          Value<int?> classId = const Value.absent(),
          Value<int?> termId = const Value.absent(),
          Value<int?> academicYearId = const Value.absent(),
          Value<String?> admissionNumber = const Value.absent(),
          Value<String?> className = const Value.absent(),
          Value<String?> termName = const Value.absent(),
          Value<String?> academicYearName = const Value.absent(),
          Value<Uint8List?> studentImage = const Value.absent()}) =>
      InvoiceTable(
        id: id ?? this.id,
        invoiceNumber: invoiceNumber ?? this.invoiceNumber,
        dateCreated: dateCreated ?? this.dateCreated,
        subtotal: subtotal ?? this.subtotal,
        taxAmount: taxAmount ?? this.taxAmount,
        discountAmount: discountAmount ?? this.discountAmount,
        discountType: discountType ?? this.discountType,
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
        businessMode: businessMode ?? this.businessMode,
        studentId: studentId.present ? studentId.value : this.studentId,
        classId: classId.present ? classId.value : this.classId,
        termId: termId.present ? termId.value : this.termId,
        academicYearId:
            academicYearId.present ? academicYearId.value : this.academicYearId,
        admissionNumber: admissionNumber.present
            ? admissionNumber.value
            : this.admissionNumber,
        className: className.present ? className.value : this.className,
        termName: termName.present ? termName.value : this.termName,
        academicYearName: academicYearName.present
            ? academicYearName.value
            : this.academicYearName,
        studentImage:
            studentImage.present ? studentImage.value : this.studentImage,
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
      discountType: data.discountType.present
          ? data.discountType.value
          : this.discountType,
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
      businessMode: data.businessMode.present
          ? data.businessMode.value
          : this.businessMode,
      studentId: data.studentId.present ? data.studentId.value : this.studentId,
      classId: data.classId.present ? data.classId.value : this.classId,
      termId: data.termId.present ? data.termId.value : this.termId,
      academicYearId: data.academicYearId.present
          ? data.academicYearId.value
          : this.academicYearId,
      admissionNumber: data.admissionNumber.present
          ? data.admissionNumber.value
          : this.admissionNumber,
      className: data.className.present ? data.className.value : this.className,
      termName: data.termName.present ? data.termName.value : this.termName,
      academicYearName: data.academicYearName.present
          ? data.academicYearName.value
          : this.academicYearName,
      studentImage: data.studentImage.present
          ? data.studentImage.value
          : this.studentImage,
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
          ..write('discountType: $discountType, ')
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
          ..write('totalPrintAmount: $totalPrintAmount, ')
          ..write('businessMode: $businessMode, ')
          ..write('studentId: $studentId, ')
          ..write('classId: $classId, ')
          ..write('termId: $termId, ')
          ..write('academicYearId: $academicYearId, ')
          ..write('admissionNumber: $admissionNumber, ')
          ..write('className: $className, ')
          ..write('termName: $termName, ')
          ..write('academicYearName: $academicYearName, ')
          ..write('studentImage: $studentImage')
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
        discountType,
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
        totalPrintAmount,
        businessMode,
        studentId,
        classId,
        termId,
        academicYearId,
        admissionNumber,
        className,
        termName,
        academicYearName,
        $driftBlobEquality.hash(studentImage)
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
          other.discountType == this.discountType &&
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
          other.totalPrintAmount == this.totalPrintAmount &&
          other.businessMode == this.businessMode &&
          other.studentId == this.studentId &&
          other.classId == this.classId &&
          other.termId == this.termId &&
          other.academicYearId == this.academicYearId &&
          other.admissionNumber == this.admissionNumber &&
          other.className == this.className &&
          other.termName == this.termName &&
          other.academicYearName == this.academicYearName &&
          $driftBlobEquality.equals(other.studentImage, this.studentImage));
}

class InvoicesCompanion extends UpdateCompanion<InvoiceTable> {
  final Value<int> id;
  final Value<String> invoiceNumber;
  final Value<DateTime> dateCreated;
  final Value<double> subtotal;
  final Value<double> taxAmount;
  final Value<double> discountAmount;
  final Value<String> discountType;
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
  final Value<String> businessMode;
  final Value<int?> studentId;
  final Value<int?> classId;
  final Value<int?> termId;
  final Value<int?> academicYearId;
  final Value<String?> admissionNumber;
  final Value<String?> className;
  final Value<String?> termName;
  final Value<String?> academicYearName;
  final Value<Uint8List?> studentImage;
  const InvoicesCompanion({
    this.id = const Value.absent(),
    this.invoiceNumber = const Value.absent(),
    this.dateCreated = const Value.absent(),
    this.subtotal = const Value.absent(),
    this.taxAmount = const Value.absent(),
    this.discountAmount = const Value.absent(),
    this.discountType = const Value.absent(),
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
    this.businessMode = const Value.absent(),
    this.studentId = const Value.absent(),
    this.classId = const Value.absent(),
    this.termId = const Value.absent(),
    this.academicYearId = const Value.absent(),
    this.admissionNumber = const Value.absent(),
    this.className = const Value.absent(),
    this.termName = const Value.absent(),
    this.academicYearName = const Value.absent(),
    this.studentImage = const Value.absent(),
  });
  InvoicesCompanion.insert({
    this.id = const Value.absent(),
    required String invoiceNumber,
    this.dateCreated = const Value.absent(),
    required double subtotal,
    required double taxAmount,
    required double discountAmount,
    this.discountType = const Value.absent(),
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
    this.businessMode = const Value.absent(),
    this.studentId = const Value.absent(),
    this.classId = const Value.absent(),
    this.termId = const Value.absent(),
    this.academicYearId = const Value.absent(),
    this.admissionNumber = const Value.absent(),
    this.className = const Value.absent(),
    this.termName = const Value.absent(),
    this.academicYearName = const Value.absent(),
    this.studentImage = const Value.absent(),
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
    Expression<String>? discountType,
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
    Expression<String>? businessMode,
    Expression<int>? studentId,
    Expression<int>? classId,
    Expression<int>? termId,
    Expression<int>? academicYearId,
    Expression<String>? admissionNumber,
    Expression<String>? className,
    Expression<String>? termName,
    Expression<String>? academicYearName,
    Expression<Uint8List>? studentImage,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (invoiceNumber != null) 'invoice_number': invoiceNumber,
      if (dateCreated != null) 'date_created': dateCreated,
      if (subtotal != null) 'subtotal': subtotal,
      if (taxAmount != null) 'tax_amount': taxAmount,
      if (discountAmount != null) 'discount_amount': discountAmount,
      if (discountType != null) 'discount_type': discountType,
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
      if (businessMode != null) 'business_mode': businessMode,
      if (studentId != null) 'student_id': studentId,
      if (classId != null) 'class_id': classId,
      if (termId != null) 'term_id': termId,
      if (academicYearId != null) 'academic_year_id': academicYearId,
      if (admissionNumber != null) 'admission_number': admissionNumber,
      if (className != null) 'class_name': className,
      if (termName != null) 'term_name': termName,
      if (academicYearName != null) 'academic_year_name': academicYearName,
      if (studentImage != null) 'student_image': studentImage,
    });
  }

  InvoicesCompanion copyWith(
      {Value<int>? id,
      Value<String>? invoiceNumber,
      Value<DateTime>? dateCreated,
      Value<double>? subtotal,
      Value<double>? taxAmount,
      Value<double>? discountAmount,
      Value<String>? discountType,
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
      Value<double?>? totalPrintAmount,
      Value<String>? businessMode,
      Value<int?>? studentId,
      Value<int?>? classId,
      Value<int?>? termId,
      Value<int?>? academicYearId,
      Value<String?>? admissionNumber,
      Value<String?>? className,
      Value<String?>? termName,
      Value<String?>? academicYearName,
      Value<Uint8List?>? studentImage}) {
    return InvoicesCompanion(
      id: id ?? this.id,
      invoiceNumber: invoiceNumber ?? this.invoiceNumber,
      dateCreated: dateCreated ?? this.dateCreated,
      subtotal: subtotal ?? this.subtotal,
      taxAmount: taxAmount ?? this.taxAmount,
      discountAmount: discountAmount ?? this.discountAmount,
      discountType: discountType ?? this.discountType,
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
      businessMode: businessMode ?? this.businessMode,
      studentId: studentId ?? this.studentId,
      classId: classId ?? this.classId,
      termId: termId ?? this.termId,
      academicYearId: academicYearId ?? this.academicYearId,
      admissionNumber: admissionNumber ?? this.admissionNumber,
      className: className ?? this.className,
      termName: termName ?? this.termName,
      academicYearName: academicYearName ?? this.academicYearName,
      studentImage: studentImage ?? this.studentImage,
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
    if (discountType.present) {
      map['discount_type'] = Variable<String>(discountType.value);
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
    if (businessMode.present) {
      map['business_mode'] = Variable<String>(businessMode.value);
    }
    if (studentId.present) {
      map['student_id'] = Variable<int>(studentId.value);
    }
    if (classId.present) {
      map['class_id'] = Variable<int>(classId.value);
    }
    if (termId.present) {
      map['term_id'] = Variable<int>(termId.value);
    }
    if (academicYearId.present) {
      map['academic_year_id'] = Variable<int>(academicYearId.value);
    }
    if (admissionNumber.present) {
      map['admission_number'] = Variable<String>(admissionNumber.value);
    }
    if (className.present) {
      map['class_name'] = Variable<String>(className.value);
    }
    if (termName.present) {
      map['term_name'] = Variable<String>(termName.value);
    }
    if (academicYearName.present) {
      map['academic_year_name'] = Variable<String>(academicYearName.value);
    }
    if (studentImage.present) {
      map['student_image'] = Variable<Uint8List>(studentImage.value);
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
          ..write('discountType: $discountType, ')
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
          ..write('totalPrintAmount: $totalPrintAmount, ')
          ..write('businessMode: $businessMode, ')
          ..write('studentId: $studentId, ')
          ..write('classId: $classId, ')
          ..write('termId: $termId, ')
          ..write('academicYearId: $academicYearId, ')
          ..write('admissionNumber: $admissionNumber, ')
          ..write('className: $className, ')
          ..write('termName: $termName, ')
          ..write('academicYearName: $academicYearName, ')
          ..write('studentImage: $studentImage')
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
  static const VerificationMeta _returnedQuantityMeta =
      const VerificationMeta('returnedQuantity');
  @override
  late final GeneratedColumn<int> returnedQuantity = GeneratedColumn<int>(
      'returned_quantity', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _isReplacementMeta =
      const VerificationMeta('isReplacement');
  @override
  late final GeneratedColumn<bool> isReplacement = GeneratedColumn<bool>(
      'is_replacement', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("is_replacement" IN (0, 1))'),
      defaultValue: const Constant(false));
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
        printPrice,
        returnedQuantity,
        isReplacement
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
    if (data.containsKey('returned_quantity')) {
      context.handle(
          _returnedQuantityMeta,
          returnedQuantity.isAcceptableOrUnknown(
              data['returned_quantity']!, _returnedQuantityMeta));
    }
    if (data.containsKey('is_replacement')) {
      context.handle(
          _isReplacementMeta,
          isReplacement.isAcceptableOrUnknown(
              data['is_replacement']!, _isReplacementMeta));
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
      returnedQuantity: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}returned_quantity'])!,
      isReplacement: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_replacement'])!,
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
  final int returnedQuantity;
  final bool isReplacement;
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
      this.printPrice,
      required this.returnedQuantity,
      required this.isReplacement});
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
    map['returned_quantity'] = Variable<int>(returnedQuantity);
    map['is_replacement'] = Variable<bool>(isReplacement);
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
      returnedQuantity: Value(returnedQuantity),
      isReplacement: Value(isReplacement),
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
      returnedQuantity: serializer.fromJson<int>(json['returnedQuantity']),
      isReplacement: serializer.fromJson<bool>(json['isReplacement']),
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
      'returnedQuantity': serializer.toJson<int>(returnedQuantity),
      'isReplacement': serializer.toJson<bool>(isReplacement),
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
          Value<double?> printPrice = const Value.absent(),
          int? returnedQuantity,
          bool? isReplacement}) =>
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
        returnedQuantity: returnedQuantity ?? this.returnedQuantity,
        isReplacement: isReplacement ?? this.isReplacement,
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
      returnedQuantity: data.returnedQuantity.present
          ? data.returnedQuantity.value
          : this.returnedQuantity,
      isReplacement: data.isReplacement.present
          ? data.isReplacement.value
          : this.isReplacement,
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
          ..write('printPrice: $printPrice, ')
          ..write('returnedQuantity: $returnedQuantity, ')
          ..write('isReplacement: $isReplacement')
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
      printPrice,
      returnedQuantity,
      isReplacement);
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
          other.printPrice == this.printPrice &&
          other.returnedQuantity == this.returnedQuantity &&
          other.isReplacement == this.isReplacement);
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
  final Value<int> returnedQuantity;
  final Value<bool> isReplacement;
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
    this.returnedQuantity = const Value.absent(),
    this.isReplacement = const Value.absent(),
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
    this.returnedQuantity = const Value.absent(),
    this.isReplacement = const Value.absent(),
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
    Expression<int>? returnedQuantity,
    Expression<bool>? isReplacement,
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
      if (returnedQuantity != null) 'returned_quantity': returnedQuantity,
      if (isReplacement != null) 'is_replacement': isReplacement,
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
      Value<double?>? printPrice,
      Value<int>? returnedQuantity,
      Value<bool>? isReplacement}) {
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
      returnedQuantity: returnedQuantity ?? this.returnedQuantity,
      isReplacement: isReplacement ?? this.isReplacement,
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
    if (returnedQuantity.present) {
      map['returned_quantity'] = Variable<int>(returnedQuantity.value);
    }
    if (isReplacement.present) {
      map['is_replacement'] = Variable<bool>(isReplacement.value);
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
          ..write('printPrice: $printPrice, ')
          ..write('returnedQuantity: $returnedQuantity, ')
          ..write('isReplacement: $isReplacement')
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
  static const VerificationMeta _logoSvgMeta =
      const VerificationMeta('logoSvg');
  @override
  late final GeneratedColumn<String> logoSvg = GeneratedColumn<String>(
      'logo_svg', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
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
  static const VerificationMeta _stockReturnEnabledMeta =
      const VerificationMeta('stockReturnEnabled');
  @override
  late final GeneratedColumn<bool> stockReturnEnabled = GeneratedColumn<bool>(
      'stock_return_enabled', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("stock_return_enabled" IN (0, 1))'),
      defaultValue: const Constant(true));
  static const VerificationMeta _showSalesTrendChartMeta =
      const VerificationMeta('showSalesTrendChart');
  @override
  late final GeneratedColumn<bool> showSalesTrendChart = GeneratedColumn<bool>(
      'show_sales_trend_chart', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("show_sales_trend_chart" IN (0, 1))'),
      defaultValue: const Constant(true));
  static const VerificationMeta _showExpensePieChartMeta =
      const VerificationMeta('showExpensePieChart');
  @override
  late final GeneratedColumn<bool> showExpensePieChart = GeneratedColumn<bool>(
      'show_expense_pie_chart', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("show_expense_pie_chart" IN (0, 1))'),
      defaultValue: const Constant(true));
  static const VerificationMeta _showTopSellingChartMeta =
      const VerificationMeta('showTopSellingChart');
  @override
  late final GeneratedColumn<bool> showTopSellingChart = GeneratedColumn<bool>(
      'show_top_selling_chart', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("show_top_selling_chart" IN (0, 1))'),
      defaultValue: const Constant(true));
  static const VerificationMeta _showStockValueChartMeta =
      const VerificationMeta('showStockValueChart');
  @override
  late final GeneratedColumn<bool> showStockValueChart = GeneratedColumn<bool>(
      'show_stock_value_chart', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("show_stock_value_chart" IN (0, 1))'),
      defaultValue: const Constant(true));
  static const VerificationMeta _businessModeMeta =
      const VerificationMeta('businessMode');
  @override
  late final GeneratedColumn<String> businessMode = GeneratedColumn<String>(
      'business_mode', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('retail'));
  static const VerificationMeta _menuOrderMeta =
      const VerificationMeta('menuOrder');
  @override
  late final GeneratedColumn<String> menuOrder = GeneratedColumn<String>(
      'menu_order', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _skipSplashMeta =
      const VerificationMeta('skipSplash');
  @override
  late final GeneratedColumn<bool> skipSplash = GeneratedColumn<bool>(
      'skip_splash', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("skip_splash" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _restoreLastStateMeta =
      const VerificationMeta('restoreLastState');
  @override
  late final GeneratedColumn<bool> restoreLastState = GeneratedColumn<bool>(
      'restore_last_state', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("restore_last_state" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _lastRouteMeta =
      const VerificationMeta('lastRoute');
  @override
  late final GeneratedColumn<String> lastRoute = GeneratedColumn<String>(
      'last_route', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _showLogoAsMenuBackgroundMeta =
      const VerificationMeta('showLogoAsMenuBackground');
  @override
  late final GeneratedColumn<bool> showLogoAsMenuBackground =
      GeneratedColumn<bool>(
          'show_logo_as_menu_background', aliasedName, false,
          type: DriftSqlType.bool,
          requiredDuringInsert: false,
          defaultConstraints: GeneratedColumn.constraintIsAlways(
              'CHECK ("show_logo_as_menu_background" IN (0, 1))'),
          defaultValue: const Constant(false));
  static const VerificationMeta _currencyNameMeta =
      const VerificationMeta('currencyName');
  @override
  late final GeneratedColumn<String> currencyName = GeneratedColumn<String>(
      'currency_name', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('Naira'));
  static const VerificationMeta _currencySubunitMeta =
      const VerificationMeta('currencySubunit');
  @override
  late final GeneratedColumn<String> currencySubunit = GeneratedColumn<String>(
      'currency_subunit', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('Kobo'));
  static const VerificationMeta _adminSignatureMeta =
      const VerificationMeta('adminSignature');
  @override
  late final GeneratedColumn<Uint8List> adminSignature =
      GeneratedColumn<Uint8List>('admin_signature', aliasedName, true,
          type: DriftSqlType.blob, requiredDuringInsert: false);
  static const VerificationMeta _showAdminSignatureMeta =
      const VerificationMeta('showAdminSignature');
  @override
  late final GeneratedColumn<bool> showAdminSignature = GeneratedColumn<bool>(
      'show_admin_signature', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("show_admin_signature" IN (0, 1))'),
      defaultValue: const Constant(false));
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
        logoSvg,
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
        showTotalSalesCard,
        stockReturnEnabled,
        showSalesTrendChart,
        showExpensePieChart,
        showTopSellingChart,
        showStockValueChart,
        businessMode,
        menuOrder,
        skipSplash,
        restoreLastState,
        lastRoute,
        showLogoAsMenuBackground,
        currencyName,
        currencySubunit,
        adminSignature,
        showAdminSignature
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
    if (data.containsKey('logo_svg')) {
      context.handle(_logoSvgMeta,
          logoSvg.isAcceptableOrUnknown(data['logo_svg']!, _logoSvgMeta));
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
    if (data.containsKey('stock_return_enabled')) {
      context.handle(
          _stockReturnEnabledMeta,
          stockReturnEnabled.isAcceptableOrUnknown(
              data['stock_return_enabled']!, _stockReturnEnabledMeta));
    }
    if (data.containsKey('show_sales_trend_chart')) {
      context.handle(
          _showSalesTrendChartMeta,
          showSalesTrendChart.isAcceptableOrUnknown(
              data['show_sales_trend_chart']!, _showSalesTrendChartMeta));
    }
    if (data.containsKey('show_expense_pie_chart')) {
      context.handle(
          _showExpensePieChartMeta,
          showExpensePieChart.isAcceptableOrUnknown(
              data['show_expense_pie_chart']!, _showExpensePieChartMeta));
    }
    if (data.containsKey('show_top_selling_chart')) {
      context.handle(
          _showTopSellingChartMeta,
          showTopSellingChart.isAcceptableOrUnknown(
              data['show_top_selling_chart']!, _showTopSellingChartMeta));
    }
    if (data.containsKey('show_stock_value_chart')) {
      context.handle(
          _showStockValueChartMeta,
          showStockValueChart.isAcceptableOrUnknown(
              data['show_stock_value_chart']!, _showStockValueChartMeta));
    }
    if (data.containsKey('business_mode')) {
      context.handle(
          _businessModeMeta,
          businessMode.isAcceptableOrUnknown(
              data['business_mode']!, _businessModeMeta));
    }
    if (data.containsKey('menu_order')) {
      context.handle(_menuOrderMeta,
          menuOrder.isAcceptableOrUnknown(data['menu_order']!, _menuOrderMeta));
    }
    if (data.containsKey('skip_splash')) {
      context.handle(
          _skipSplashMeta,
          skipSplash.isAcceptableOrUnknown(
              data['skip_splash']!, _skipSplashMeta));
    }
    if (data.containsKey('restore_last_state')) {
      context.handle(
          _restoreLastStateMeta,
          restoreLastState.isAcceptableOrUnknown(
              data['restore_last_state']!, _restoreLastStateMeta));
    }
    if (data.containsKey('last_route')) {
      context.handle(_lastRouteMeta,
          lastRoute.isAcceptableOrUnknown(data['last_route']!, _lastRouteMeta));
    }
    if (data.containsKey('show_logo_as_menu_background')) {
      context.handle(
          _showLogoAsMenuBackgroundMeta,
          showLogoAsMenuBackground.isAcceptableOrUnknown(
              data['show_logo_as_menu_background']!,
              _showLogoAsMenuBackgroundMeta));
    }
    if (data.containsKey('currency_name')) {
      context.handle(
          _currencyNameMeta,
          currencyName.isAcceptableOrUnknown(
              data['currency_name']!, _currencyNameMeta));
    }
    if (data.containsKey('currency_subunit')) {
      context.handle(
          _currencySubunitMeta,
          currencySubunit.isAcceptableOrUnknown(
              data['currency_subunit']!, _currencySubunitMeta));
    }
    if (data.containsKey('admin_signature')) {
      context.handle(
          _adminSignatureMeta,
          adminSignature.isAcceptableOrUnknown(
              data['admin_signature']!, _adminSignatureMeta));
    }
    if (data.containsKey('show_admin_signature')) {
      context.handle(
          _showAdminSignatureMeta,
          showAdminSignature.isAcceptableOrUnknown(
              data['show_admin_signature']!, _showAdminSignatureMeta));
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
      logoSvg: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}logo_svg']),
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
      stockReturnEnabled: attachedDatabase.typeMapping.read(
          DriftSqlType.bool, data['${effectivePrefix}stock_return_enabled'])!,
      showSalesTrendChart: attachedDatabase.typeMapping.read(
          DriftSqlType.bool, data['${effectivePrefix}show_sales_trend_chart'])!,
      showExpensePieChart: attachedDatabase.typeMapping.read(
          DriftSqlType.bool, data['${effectivePrefix}show_expense_pie_chart'])!,
      showTopSellingChart: attachedDatabase.typeMapping.read(
          DriftSqlType.bool, data['${effectivePrefix}show_top_selling_chart'])!,
      showStockValueChart: attachedDatabase.typeMapping.read(
          DriftSqlType.bool, data['${effectivePrefix}show_stock_value_chart'])!,
      businessMode: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}business_mode'])!,
      menuOrder: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}menu_order']),
      skipSplash: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}skip_splash'])!,
      restoreLastState: attachedDatabase.typeMapping.read(
          DriftSqlType.bool, data['${effectivePrefix}restore_last_state'])!,
      lastRoute: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}last_route']),
      showLogoAsMenuBackground: attachedDatabase.typeMapping.read(
          DriftSqlType.bool,
          data['${effectivePrefix}show_logo_as_menu_background'])!,
      currencyName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}currency_name'])!,
      currencySubunit: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}currency_subunit'])!,
      adminSignature: attachedDatabase.typeMapping
          .read(DriftSqlType.blob, data['${effectivePrefix}admin_signature']),
      showAdminSignature: attachedDatabase.typeMapping.read(
          DriftSqlType.bool, data['${effectivePrefix}show_admin_signature'])!,
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
  final String? logoSvg;
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
  final bool stockReturnEnabled;
  final bool showSalesTrendChart;
  final bool showExpensePieChart;
  final bool showTopSellingChart;
  final bool showStockValueChart;
  final String businessMode;
  final String? menuOrder;
  final bool skipSplash;
  final bool restoreLastState;
  final String? lastRoute;
  final bool showLogoAsMenuBackground;
  final String currencyName;
  final String currencySubunit;
  final Uint8List? adminSignature;
  final bool showAdminSignature;
  const SettingsTable(
      {required this.id,
      required this.organizationName,
      required this.address,
      required this.phone,
      this.businessDescription,
      this.taxId,
      this.logoPath,
      this.logo,
      this.logoSvg,
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
      required this.showTotalSalesCard,
      required this.stockReturnEnabled,
      required this.showSalesTrendChart,
      required this.showExpensePieChart,
      required this.showTopSellingChart,
      required this.showStockValueChart,
      required this.businessMode,
      this.menuOrder,
      required this.skipSplash,
      required this.restoreLastState,
      this.lastRoute,
      required this.showLogoAsMenuBackground,
      required this.currencyName,
      required this.currencySubunit,
      this.adminSignature,
      required this.showAdminSignature});
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
    if (!nullToAbsent || logoSvg != null) {
      map['logo_svg'] = Variable<String>(logoSvg);
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
    map['stock_return_enabled'] = Variable<bool>(stockReturnEnabled);
    map['show_sales_trend_chart'] = Variable<bool>(showSalesTrendChart);
    map['show_expense_pie_chart'] = Variable<bool>(showExpensePieChart);
    map['show_top_selling_chart'] = Variable<bool>(showTopSellingChart);
    map['show_stock_value_chart'] = Variable<bool>(showStockValueChart);
    map['business_mode'] = Variable<String>(businessMode);
    if (!nullToAbsent || menuOrder != null) {
      map['menu_order'] = Variable<String>(menuOrder);
    }
    map['skip_splash'] = Variable<bool>(skipSplash);
    map['restore_last_state'] = Variable<bool>(restoreLastState);
    if (!nullToAbsent || lastRoute != null) {
      map['last_route'] = Variable<String>(lastRoute);
    }
    map['show_logo_as_menu_background'] =
        Variable<bool>(showLogoAsMenuBackground);
    map['currency_name'] = Variable<String>(currencyName);
    map['currency_subunit'] = Variable<String>(currencySubunit);
    if (!nullToAbsent || adminSignature != null) {
      map['admin_signature'] = Variable<Uint8List>(adminSignature);
    }
    map['show_admin_signature'] = Variable<bool>(showAdminSignature);
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
      logoSvg: logoSvg == null && nullToAbsent
          ? const Value.absent()
          : Value(logoSvg),
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
      stockReturnEnabled: Value(stockReturnEnabled),
      showSalesTrendChart: Value(showSalesTrendChart),
      showExpensePieChart: Value(showExpensePieChart),
      showTopSellingChart: Value(showTopSellingChart),
      showStockValueChart: Value(showStockValueChart),
      businessMode: Value(businessMode),
      menuOrder: menuOrder == null && nullToAbsent
          ? const Value.absent()
          : Value(menuOrder),
      skipSplash: Value(skipSplash),
      restoreLastState: Value(restoreLastState),
      lastRoute: lastRoute == null && nullToAbsent
          ? const Value.absent()
          : Value(lastRoute),
      showLogoAsMenuBackground: Value(showLogoAsMenuBackground),
      currencyName: Value(currencyName),
      currencySubunit: Value(currencySubunit),
      adminSignature: adminSignature == null && nullToAbsent
          ? const Value.absent()
          : Value(adminSignature),
      showAdminSignature: Value(showAdminSignature),
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
      logoSvg: serializer.fromJson<String?>(json['logoSvg']),
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
      stockReturnEnabled: serializer.fromJson<bool>(json['stockReturnEnabled']),
      showSalesTrendChart:
          serializer.fromJson<bool>(json['showSalesTrendChart']),
      showExpensePieChart:
          serializer.fromJson<bool>(json['showExpensePieChart']),
      showTopSellingChart:
          serializer.fromJson<bool>(json['showTopSellingChart']),
      showStockValueChart:
          serializer.fromJson<bool>(json['showStockValueChart']),
      businessMode: serializer.fromJson<String>(json['businessMode']),
      menuOrder: serializer.fromJson<String?>(json['menuOrder']),
      skipSplash: serializer.fromJson<bool>(json['skipSplash']),
      restoreLastState: serializer.fromJson<bool>(json['restoreLastState']),
      lastRoute: serializer.fromJson<String?>(json['lastRoute']),
      showLogoAsMenuBackground:
          serializer.fromJson<bool>(json['showLogoAsMenuBackground']),
      currencyName: serializer.fromJson<String>(json['currencyName']),
      currencySubunit: serializer.fromJson<String>(json['currencySubunit']),
      adminSignature: serializer.fromJson<Uint8List?>(json['adminSignature']),
      showAdminSignature: serializer.fromJson<bool>(json['showAdminSignature']),
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
      'logoSvg': serializer.toJson<String?>(logoSvg),
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
      'stockReturnEnabled': serializer.toJson<bool>(stockReturnEnabled),
      'showSalesTrendChart': serializer.toJson<bool>(showSalesTrendChart),
      'showExpensePieChart': serializer.toJson<bool>(showExpensePieChart),
      'showTopSellingChart': serializer.toJson<bool>(showTopSellingChart),
      'showStockValueChart': serializer.toJson<bool>(showStockValueChart),
      'businessMode': serializer.toJson<String>(businessMode),
      'menuOrder': serializer.toJson<String?>(menuOrder),
      'skipSplash': serializer.toJson<bool>(skipSplash),
      'restoreLastState': serializer.toJson<bool>(restoreLastState),
      'lastRoute': serializer.toJson<String?>(lastRoute),
      'showLogoAsMenuBackground':
          serializer.toJson<bool>(showLogoAsMenuBackground),
      'currencyName': serializer.toJson<String>(currencyName),
      'currencySubunit': serializer.toJson<String>(currencySubunit),
      'adminSignature': serializer.toJson<Uint8List?>(adminSignature),
      'showAdminSignature': serializer.toJson<bool>(showAdminSignature),
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
          Value<String?> logoSvg = const Value.absent(),
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
          bool? showTotalSalesCard,
          bool? stockReturnEnabled,
          bool? showSalesTrendChart,
          bool? showExpensePieChart,
          bool? showTopSellingChart,
          bool? showStockValueChart,
          String? businessMode,
          Value<String?> menuOrder = const Value.absent(),
          bool? skipSplash,
          bool? restoreLastState,
          Value<String?> lastRoute = const Value.absent(),
          bool? showLogoAsMenuBackground,
          String? currencyName,
          String? currencySubunit,
          Value<Uint8List?> adminSignature = const Value.absent(),
          bool? showAdminSignature}) =>
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
        logoSvg: logoSvg.present ? logoSvg.value : this.logoSvg,
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
        stockReturnEnabled: stockReturnEnabled ?? this.stockReturnEnabled,
        showSalesTrendChart: showSalesTrendChart ?? this.showSalesTrendChart,
        showExpensePieChart: showExpensePieChart ?? this.showExpensePieChart,
        showTopSellingChart: showTopSellingChart ?? this.showTopSellingChart,
        showStockValueChart: showStockValueChart ?? this.showStockValueChart,
        businessMode: businessMode ?? this.businessMode,
        menuOrder: menuOrder.present ? menuOrder.value : this.menuOrder,
        skipSplash: skipSplash ?? this.skipSplash,
        restoreLastState: restoreLastState ?? this.restoreLastState,
        lastRoute: lastRoute.present ? lastRoute.value : this.lastRoute,
        showLogoAsMenuBackground:
            showLogoAsMenuBackground ?? this.showLogoAsMenuBackground,
        currencyName: currencyName ?? this.currencyName,
        currencySubunit: currencySubunit ?? this.currencySubunit,
        adminSignature:
            adminSignature.present ? adminSignature.value : this.adminSignature,
        showAdminSignature: showAdminSignature ?? this.showAdminSignature,
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
      logoSvg: data.logoSvg.present ? data.logoSvg.value : this.logoSvg,
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
      stockReturnEnabled: data.stockReturnEnabled.present
          ? data.stockReturnEnabled.value
          : this.stockReturnEnabled,
      showSalesTrendChart: data.showSalesTrendChart.present
          ? data.showSalesTrendChart.value
          : this.showSalesTrendChart,
      showExpensePieChart: data.showExpensePieChart.present
          ? data.showExpensePieChart.value
          : this.showExpensePieChart,
      showTopSellingChart: data.showTopSellingChart.present
          ? data.showTopSellingChart.value
          : this.showTopSellingChart,
      showStockValueChart: data.showStockValueChart.present
          ? data.showStockValueChart.value
          : this.showStockValueChart,
      businessMode: data.businessMode.present
          ? data.businessMode.value
          : this.businessMode,
      menuOrder: data.menuOrder.present ? data.menuOrder.value : this.menuOrder,
      skipSplash:
          data.skipSplash.present ? data.skipSplash.value : this.skipSplash,
      restoreLastState: data.restoreLastState.present
          ? data.restoreLastState.value
          : this.restoreLastState,
      lastRoute: data.lastRoute.present ? data.lastRoute.value : this.lastRoute,
      showLogoAsMenuBackground: data.showLogoAsMenuBackground.present
          ? data.showLogoAsMenuBackground.value
          : this.showLogoAsMenuBackground,
      currencyName: data.currencyName.present
          ? data.currencyName.value
          : this.currencyName,
      currencySubunit: data.currencySubunit.present
          ? data.currencySubunit.value
          : this.currencySubunit,
      adminSignature: data.adminSignature.present
          ? data.adminSignature.value
          : this.adminSignature,
      showAdminSignature: data.showAdminSignature.present
          ? data.showAdminSignature.value
          : this.showAdminSignature,
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
          ..write('logoSvg: $logoSvg, ')
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
          ..write('showTotalSalesCard: $showTotalSalesCard, ')
          ..write('stockReturnEnabled: $stockReturnEnabled, ')
          ..write('showSalesTrendChart: $showSalesTrendChart, ')
          ..write('showExpensePieChart: $showExpensePieChart, ')
          ..write('showTopSellingChart: $showTopSellingChart, ')
          ..write('showStockValueChart: $showStockValueChart, ')
          ..write('businessMode: $businessMode, ')
          ..write('menuOrder: $menuOrder, ')
          ..write('skipSplash: $skipSplash, ')
          ..write('restoreLastState: $restoreLastState, ')
          ..write('lastRoute: $lastRoute, ')
          ..write('showLogoAsMenuBackground: $showLogoAsMenuBackground, ')
          ..write('currencyName: $currencyName, ')
          ..write('currencySubunit: $currencySubunit, ')
          ..write('adminSignature: $adminSignature, ')
          ..write('showAdminSignature: $showAdminSignature')
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
        logoSvg,
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
        showTotalSalesCard,
        stockReturnEnabled,
        showSalesTrendChart,
        showExpensePieChart,
        showTopSellingChart,
        showStockValueChart,
        businessMode,
        menuOrder,
        skipSplash,
        restoreLastState,
        lastRoute,
        showLogoAsMenuBackground,
        currencyName,
        currencySubunit,
        $driftBlobEquality.hash(adminSignature),
        showAdminSignature
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
          other.logoSvg == this.logoSvg &&
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
          other.showTotalSalesCard == this.showTotalSalesCard &&
          other.stockReturnEnabled == this.stockReturnEnabled &&
          other.showSalesTrendChart == this.showSalesTrendChart &&
          other.showExpensePieChart == this.showExpensePieChart &&
          other.showTopSellingChart == this.showTopSellingChart &&
          other.showStockValueChart == this.showStockValueChart &&
          other.businessMode == this.businessMode &&
          other.menuOrder == this.menuOrder &&
          other.skipSplash == this.skipSplash &&
          other.restoreLastState == this.restoreLastState &&
          other.lastRoute == this.lastRoute &&
          other.showLogoAsMenuBackground == this.showLogoAsMenuBackground &&
          other.currencyName == this.currencyName &&
          other.currencySubunit == this.currencySubunit &&
          $driftBlobEquality.equals(
              other.adminSignature, this.adminSignature) &&
          other.showAdminSignature == this.showAdminSignature);
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
  final Value<String?> logoSvg;
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
  final Value<bool> stockReturnEnabled;
  final Value<bool> showSalesTrendChart;
  final Value<bool> showExpensePieChart;
  final Value<bool> showTopSellingChart;
  final Value<bool> showStockValueChart;
  final Value<String> businessMode;
  final Value<String?> menuOrder;
  final Value<bool> skipSplash;
  final Value<bool> restoreLastState;
  final Value<String?> lastRoute;
  final Value<bool> showLogoAsMenuBackground;
  final Value<String> currencyName;
  final Value<String> currencySubunit;
  final Value<Uint8List?> adminSignature;
  final Value<bool> showAdminSignature;
  const SettingsCompanion({
    this.id = const Value.absent(),
    this.organizationName = const Value.absent(),
    this.address = const Value.absent(),
    this.phone = const Value.absent(),
    this.businessDescription = const Value.absent(),
    this.taxId = const Value.absent(),
    this.logoPath = const Value.absent(),
    this.logo = const Value.absent(),
    this.logoSvg = const Value.absent(),
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
    this.stockReturnEnabled = const Value.absent(),
    this.showSalesTrendChart = const Value.absent(),
    this.showExpensePieChart = const Value.absent(),
    this.showTopSellingChart = const Value.absent(),
    this.showStockValueChart = const Value.absent(),
    this.businessMode = const Value.absent(),
    this.menuOrder = const Value.absent(),
    this.skipSplash = const Value.absent(),
    this.restoreLastState = const Value.absent(),
    this.lastRoute = const Value.absent(),
    this.showLogoAsMenuBackground = const Value.absent(),
    this.currencyName = const Value.absent(),
    this.currencySubunit = const Value.absent(),
    this.adminSignature = const Value.absent(),
    this.showAdminSignature = const Value.absent(),
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
    this.logoSvg = const Value.absent(),
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
    this.stockReturnEnabled = const Value.absent(),
    this.showSalesTrendChart = const Value.absent(),
    this.showExpensePieChart = const Value.absent(),
    this.showTopSellingChart = const Value.absent(),
    this.showStockValueChart = const Value.absent(),
    this.businessMode = const Value.absent(),
    this.menuOrder = const Value.absent(),
    this.skipSplash = const Value.absent(),
    this.restoreLastState = const Value.absent(),
    this.lastRoute = const Value.absent(),
    this.showLogoAsMenuBackground = const Value.absent(),
    this.currencyName = const Value.absent(),
    this.currencySubunit = const Value.absent(),
    this.adminSignature = const Value.absent(),
    this.showAdminSignature = const Value.absent(),
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
    Expression<String>? logoSvg,
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
    Expression<bool>? stockReturnEnabled,
    Expression<bool>? showSalesTrendChart,
    Expression<bool>? showExpensePieChart,
    Expression<bool>? showTopSellingChart,
    Expression<bool>? showStockValueChart,
    Expression<String>? businessMode,
    Expression<String>? menuOrder,
    Expression<bool>? skipSplash,
    Expression<bool>? restoreLastState,
    Expression<String>? lastRoute,
    Expression<bool>? showLogoAsMenuBackground,
    Expression<String>? currencyName,
    Expression<String>? currencySubunit,
    Expression<Uint8List>? adminSignature,
    Expression<bool>? showAdminSignature,
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
      if (logoSvg != null) 'logo_svg': logoSvg,
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
      if (stockReturnEnabled != null)
        'stock_return_enabled': stockReturnEnabled,
      if (showSalesTrendChart != null)
        'show_sales_trend_chart': showSalesTrendChart,
      if (showExpensePieChart != null)
        'show_expense_pie_chart': showExpensePieChart,
      if (showTopSellingChart != null)
        'show_top_selling_chart': showTopSellingChart,
      if (showStockValueChart != null)
        'show_stock_value_chart': showStockValueChart,
      if (businessMode != null) 'business_mode': businessMode,
      if (menuOrder != null) 'menu_order': menuOrder,
      if (skipSplash != null) 'skip_splash': skipSplash,
      if (restoreLastState != null) 'restore_last_state': restoreLastState,
      if (lastRoute != null) 'last_route': lastRoute,
      if (showLogoAsMenuBackground != null)
        'show_logo_as_menu_background': showLogoAsMenuBackground,
      if (currencyName != null) 'currency_name': currencyName,
      if (currencySubunit != null) 'currency_subunit': currencySubunit,
      if (adminSignature != null) 'admin_signature': adminSignature,
      if (showAdminSignature != null)
        'show_admin_signature': showAdminSignature,
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
      Value<String?>? logoSvg,
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
      Value<bool>? showTotalSalesCard,
      Value<bool>? stockReturnEnabled,
      Value<bool>? showSalesTrendChart,
      Value<bool>? showExpensePieChart,
      Value<bool>? showTopSellingChart,
      Value<bool>? showStockValueChart,
      Value<String>? businessMode,
      Value<String?>? menuOrder,
      Value<bool>? skipSplash,
      Value<bool>? restoreLastState,
      Value<String?>? lastRoute,
      Value<bool>? showLogoAsMenuBackground,
      Value<String>? currencyName,
      Value<String>? currencySubunit,
      Value<Uint8List?>? adminSignature,
      Value<bool>? showAdminSignature}) {
    return SettingsCompanion(
      id: id ?? this.id,
      organizationName: organizationName ?? this.organizationName,
      address: address ?? this.address,
      phone: phone ?? this.phone,
      businessDescription: businessDescription ?? this.businessDescription,
      taxId: taxId ?? this.taxId,
      logoPath: logoPath ?? this.logoPath,
      logo: logo ?? this.logo,
      logoSvg: logoSvg ?? this.logoSvg,
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
      stockReturnEnabled: stockReturnEnabled ?? this.stockReturnEnabled,
      showSalesTrendChart: showSalesTrendChart ?? this.showSalesTrendChart,
      showExpensePieChart: showExpensePieChart ?? this.showExpensePieChart,
      showTopSellingChart: showTopSellingChart ?? this.showTopSellingChart,
      showStockValueChart: showStockValueChart ?? this.showStockValueChart,
      businessMode: businessMode ?? this.businessMode,
      menuOrder: menuOrder ?? this.menuOrder,
      skipSplash: skipSplash ?? this.skipSplash,
      restoreLastState: restoreLastState ?? this.restoreLastState,
      lastRoute: lastRoute ?? this.lastRoute,
      showLogoAsMenuBackground:
          showLogoAsMenuBackground ?? this.showLogoAsMenuBackground,
      currencyName: currencyName ?? this.currencyName,
      currencySubunit: currencySubunit ?? this.currencySubunit,
      adminSignature: adminSignature ?? this.adminSignature,
      showAdminSignature: showAdminSignature ?? this.showAdminSignature,
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
    if (logoSvg.present) {
      map['logo_svg'] = Variable<String>(logoSvg.value);
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
    if (stockReturnEnabled.present) {
      map['stock_return_enabled'] = Variable<bool>(stockReturnEnabled.value);
    }
    if (showSalesTrendChart.present) {
      map['show_sales_trend_chart'] = Variable<bool>(showSalesTrendChart.value);
    }
    if (showExpensePieChart.present) {
      map['show_expense_pie_chart'] = Variable<bool>(showExpensePieChart.value);
    }
    if (showTopSellingChart.present) {
      map['show_top_selling_chart'] = Variable<bool>(showTopSellingChart.value);
    }
    if (showStockValueChart.present) {
      map['show_stock_value_chart'] = Variable<bool>(showStockValueChart.value);
    }
    if (businessMode.present) {
      map['business_mode'] = Variable<String>(businessMode.value);
    }
    if (menuOrder.present) {
      map['menu_order'] = Variable<String>(menuOrder.value);
    }
    if (skipSplash.present) {
      map['skip_splash'] = Variable<bool>(skipSplash.value);
    }
    if (restoreLastState.present) {
      map['restore_last_state'] = Variable<bool>(restoreLastState.value);
    }
    if (lastRoute.present) {
      map['last_route'] = Variable<String>(lastRoute.value);
    }
    if (showLogoAsMenuBackground.present) {
      map['show_logo_as_menu_background'] =
          Variable<bool>(showLogoAsMenuBackground.value);
    }
    if (currencyName.present) {
      map['currency_name'] = Variable<String>(currencyName.value);
    }
    if (currencySubunit.present) {
      map['currency_subunit'] = Variable<String>(currencySubunit.value);
    }
    if (adminSignature.present) {
      map['admin_signature'] = Variable<Uint8List>(adminSignature.value);
    }
    if (showAdminSignature.present) {
      map['show_admin_signature'] = Variable<bool>(showAdminSignature.value);
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
          ..write('logoSvg: $logoSvg, ')
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
          ..write('showTotalSalesCard: $showTotalSalesCard, ')
          ..write('stockReturnEnabled: $stockReturnEnabled, ')
          ..write('showSalesTrendChart: $showSalesTrendChart, ')
          ..write('showExpensePieChart: $showExpensePieChart, ')
          ..write('showTopSellingChart: $showTopSellingChart, ')
          ..write('showStockValueChart: $showStockValueChart, ')
          ..write('businessMode: $businessMode, ')
          ..write('menuOrder: $menuOrder, ')
          ..write('skipSplash: $skipSplash, ')
          ..write('restoreLastState: $restoreLastState, ')
          ..write('lastRoute: $lastRoute, ')
          ..write('showLogoAsMenuBackground: $showLogoAsMenuBackground, ')
          ..write('currencyName: $currencyName, ')
          ..write('currencySubunit: $currencySubunit, ')
          ..write('adminSignature: $adminSignature, ')
          ..write('showAdminSignature: $showAdminSignature')
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
          GeneratedColumn.checkTextLength(minTextLength: 4, maxTextLength: 100),
      type: DriftSqlType.string,
      requiredDuringInsert: true);
  static const VerificationMeta _staffIdMeta =
      const VerificationMeta('staffId');
  @override
  late final GeneratedColumn<String> staffId = GeneratedColumn<String>(
      'staff_id', aliasedName, true,
      additionalChecks:
          GeneratedColumn.checkTextLength(minTextLength: 1, maxTextLength: 20),
      type: DriftSqlType.string,
      requiredDuringInsert: false);
  static const VerificationMeta _phoneMeta = const VerificationMeta('phone');
  @override
  late final GeneratedColumn<String> phone = GeneratedColumn<String>(
      'phone', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
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
        staffId,
        phone,
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
    if (data.containsKey('staff_id')) {
      context.handle(_staffIdMeta,
          staffId.isAcceptableOrUnknown(data['staff_id']!, _staffIdMeta));
    }
    if (data.containsKey('phone')) {
      context.handle(
          _phoneMeta, phone.isAcceptableOrUnknown(data['phone']!, _phoneMeta));
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
      staffId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}staff_id']),
      phone: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}phone']),
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
  final String? staffId;
  final String? phone;
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
      this.staffId,
      this.phone,
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
    if (!nullToAbsent || staffId != null) {
      map['staff_id'] = Variable<String>(staffId);
    }
    if (!nullToAbsent || phone != null) {
      map['phone'] = Variable<String>(phone);
    }
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
      staffId: staffId == null && nullToAbsent
          ? const Value.absent()
          : Value(staffId),
      phone:
          phone == null && nullToAbsent ? const Value.absent() : Value(phone),
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
      staffId: serializer.fromJson<String?>(json['staffId']),
      phone: serializer.fromJson<String?>(json['phone']),
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
      'staffId': serializer.toJson<String?>(staffId),
      'phone': serializer.toJson<String?>(phone),
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
          Value<String?> staffId = const Value.absent(),
          Value<String?> phone = const Value.absent(),
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
        staffId: staffId.present ? staffId.value : this.staffId,
        phone: phone.present ? phone.value : this.phone,
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
      staffId: data.staffId.present ? data.staffId.value : this.staffId,
      phone: data.phone.present ? data.phone.value : this.phone,
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
          ..write('staffId: $staffId, ')
          ..write('phone: $phone, ')
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
  int get hashCode => Object.hash(id, name, staffCode, staffId, phone, isActive,
      syncId, updatedAt, createdAt, deviceId, isDeleted);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is StaffTable &&
          other.id == this.id &&
          other.name == this.name &&
          other.staffCode == this.staffCode &&
          other.staffId == this.staffId &&
          other.phone == this.phone &&
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
  final Value<String?> staffId;
  final Value<String?> phone;
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
    this.staffId = const Value.absent(),
    this.phone = const Value.absent(),
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
    this.staffId = const Value.absent(),
    this.phone = const Value.absent(),
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
    Expression<String>? staffId,
    Expression<String>? phone,
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
      if (staffId != null) 'staff_id': staffId,
      if (phone != null) 'phone': phone,
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
      Value<String?>? staffId,
      Value<String?>? phone,
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
      staffId: staffId ?? this.staffId,
      phone: phone ?? this.phone,
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
    if (staffId.present) {
      map['staff_id'] = Variable<String>(staffId.value);
    }
    if (phone.present) {
      map['phone'] = Variable<String>(phone.value);
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
          ..write('staffId: $staffId, ')
          ..write('phone: $phone, ')
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

class $StockReturnsTable extends StockReturns
    with TableInfo<$StockReturnsTable, StockReturnTable> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $StockReturnsTable(this.attachedDatabase, [this._alias]);
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
  static const VerificationMeta _amountReturnedMeta =
      const VerificationMeta('amountReturned');
  @override
  late final GeneratedColumn<double> amountReturned = GeneratedColumn<double>(
      'amount_returned', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _staffIdMeta =
      const VerificationMeta('staffId');
  @override
  late final GeneratedColumn<int> staffId = GeneratedColumn<int>(
      'staff_id', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: true,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('REFERENCES staff (id)'));
  static const VerificationMeta _dateReturnedMeta =
      const VerificationMeta('dateReturned');
  @override
  late final GeneratedColumn<DateTime> dateReturned = GeneratedColumn<DateTime>(
      'date_returned', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
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
        invoiceId,
        itemId,
        quantity,
        amountReturned,
        staffId,
        dateReturned,
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
  static const String $name = 'stock_returns';
  @override
  VerificationContext validateIntegrity(Insertable<StockReturnTable> instance,
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
    if (data.containsKey('amount_returned')) {
      context.handle(
          _amountReturnedMeta,
          amountReturned.isAcceptableOrUnknown(
              data['amount_returned']!, _amountReturnedMeta));
    } else if (isInserting) {
      context.missing(_amountReturnedMeta);
    }
    if (data.containsKey('staff_id')) {
      context.handle(_staffIdMeta,
          staffId.isAcceptableOrUnknown(data['staff_id']!, _staffIdMeta));
    } else if (isInserting) {
      context.missing(_staffIdMeta);
    }
    if (data.containsKey('date_returned')) {
      context.handle(
          _dateReturnedMeta,
          dateReturned.isAcceptableOrUnknown(
              data['date_returned']!, _dateReturnedMeta));
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
  StockReturnTable map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return StockReturnTable(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      invoiceId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}invoice_id'])!,
      itemId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}item_id'])!,
      quantity: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}quantity'])!,
      amountReturned: attachedDatabase.typeMapping.read(
          DriftSqlType.double, data['${effectivePrefix}amount_returned'])!,
      staffId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}staff_id'])!,
      dateReturned: attachedDatabase.typeMapping.read(
          DriftSqlType.dateTime, data['${effectivePrefix}date_returned'])!,
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
  $StockReturnsTable createAlias(String alias) {
    return $StockReturnsTable(attachedDatabase, alias);
  }
}

class StockReturnTable extends DataClass
    implements Insertable<StockReturnTable> {
  final int id;
  final int invoiceId;
  final int itemId;
  final int quantity;
  final double amountReturned;
  final int staffId;
  final DateTime dateReturned;
  final String? syncId;
  final DateTime? updatedAt;
  final DateTime? createdAt;
  final String? deviceId;
  final bool isDeleted;
  const StockReturnTable(
      {required this.id,
      required this.invoiceId,
      required this.itemId,
      required this.quantity,
      required this.amountReturned,
      required this.staffId,
      required this.dateReturned,
      this.syncId,
      this.updatedAt,
      this.createdAt,
      this.deviceId,
      required this.isDeleted});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['invoice_id'] = Variable<int>(invoiceId);
    map['item_id'] = Variable<int>(itemId);
    map['quantity'] = Variable<int>(quantity);
    map['amount_returned'] = Variable<double>(amountReturned);
    map['staff_id'] = Variable<int>(staffId);
    map['date_returned'] = Variable<DateTime>(dateReturned);
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

  StockReturnsCompanion toCompanion(bool nullToAbsent) {
    return StockReturnsCompanion(
      id: Value(id),
      invoiceId: Value(invoiceId),
      itemId: Value(itemId),
      quantity: Value(quantity),
      amountReturned: Value(amountReturned),
      staffId: Value(staffId),
      dateReturned: Value(dateReturned),
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

  factory StockReturnTable.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return StockReturnTable(
      id: serializer.fromJson<int>(json['id']),
      invoiceId: serializer.fromJson<int>(json['invoiceId']),
      itemId: serializer.fromJson<int>(json['itemId']),
      quantity: serializer.fromJson<int>(json['quantity']),
      amountReturned: serializer.fromJson<double>(json['amountReturned']),
      staffId: serializer.fromJson<int>(json['staffId']),
      dateReturned: serializer.fromJson<DateTime>(json['dateReturned']),
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
      'invoiceId': serializer.toJson<int>(invoiceId),
      'itemId': serializer.toJson<int>(itemId),
      'quantity': serializer.toJson<int>(quantity),
      'amountReturned': serializer.toJson<double>(amountReturned),
      'staffId': serializer.toJson<int>(staffId),
      'dateReturned': serializer.toJson<DateTime>(dateReturned),
      'syncId': serializer.toJson<String?>(syncId),
      'updatedAt': serializer.toJson<DateTime?>(updatedAt),
      'createdAt': serializer.toJson<DateTime?>(createdAt),
      'deviceId': serializer.toJson<String?>(deviceId),
      'isDeleted': serializer.toJson<bool>(isDeleted),
    };
  }

  StockReturnTable copyWith(
          {int? id,
          int? invoiceId,
          int? itemId,
          int? quantity,
          double? amountReturned,
          int? staffId,
          DateTime? dateReturned,
          Value<String?> syncId = const Value.absent(),
          Value<DateTime?> updatedAt = const Value.absent(),
          Value<DateTime?> createdAt = const Value.absent(),
          Value<String?> deviceId = const Value.absent(),
          bool? isDeleted}) =>
      StockReturnTable(
        id: id ?? this.id,
        invoiceId: invoiceId ?? this.invoiceId,
        itemId: itemId ?? this.itemId,
        quantity: quantity ?? this.quantity,
        amountReturned: amountReturned ?? this.amountReturned,
        staffId: staffId ?? this.staffId,
        dateReturned: dateReturned ?? this.dateReturned,
        syncId: syncId.present ? syncId.value : this.syncId,
        updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
        createdAt: createdAt.present ? createdAt.value : this.createdAt,
        deviceId: deviceId.present ? deviceId.value : this.deviceId,
        isDeleted: isDeleted ?? this.isDeleted,
      );
  StockReturnTable copyWithCompanion(StockReturnsCompanion data) {
    return StockReturnTable(
      id: data.id.present ? data.id.value : this.id,
      invoiceId: data.invoiceId.present ? data.invoiceId.value : this.invoiceId,
      itemId: data.itemId.present ? data.itemId.value : this.itemId,
      quantity: data.quantity.present ? data.quantity.value : this.quantity,
      amountReturned: data.amountReturned.present
          ? data.amountReturned.value
          : this.amountReturned,
      staffId: data.staffId.present ? data.staffId.value : this.staffId,
      dateReturned: data.dateReturned.present
          ? data.dateReturned.value
          : this.dateReturned,
      syncId: data.syncId.present ? data.syncId.value : this.syncId,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      deviceId: data.deviceId.present ? data.deviceId.value : this.deviceId,
      isDeleted: data.isDeleted.present ? data.isDeleted.value : this.isDeleted,
    );
  }

  @override
  String toString() {
    return (StringBuffer('StockReturnTable(')
          ..write('id: $id, ')
          ..write('invoiceId: $invoiceId, ')
          ..write('itemId: $itemId, ')
          ..write('quantity: $quantity, ')
          ..write('amountReturned: $amountReturned, ')
          ..write('staffId: $staffId, ')
          ..write('dateReturned: $dateReturned, ')
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
      invoiceId,
      itemId,
      quantity,
      amountReturned,
      staffId,
      dateReturned,
      syncId,
      updatedAt,
      createdAt,
      deviceId,
      isDeleted);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is StockReturnTable &&
          other.id == this.id &&
          other.invoiceId == this.invoiceId &&
          other.itemId == this.itemId &&
          other.quantity == this.quantity &&
          other.amountReturned == this.amountReturned &&
          other.staffId == this.staffId &&
          other.dateReturned == this.dateReturned &&
          other.syncId == this.syncId &&
          other.updatedAt == this.updatedAt &&
          other.createdAt == this.createdAt &&
          other.deviceId == this.deviceId &&
          other.isDeleted == this.isDeleted);
}

class StockReturnsCompanion extends UpdateCompanion<StockReturnTable> {
  final Value<int> id;
  final Value<int> invoiceId;
  final Value<int> itemId;
  final Value<int> quantity;
  final Value<double> amountReturned;
  final Value<int> staffId;
  final Value<DateTime> dateReturned;
  final Value<String?> syncId;
  final Value<DateTime?> updatedAt;
  final Value<DateTime?> createdAt;
  final Value<String?> deviceId;
  final Value<bool> isDeleted;
  const StockReturnsCompanion({
    this.id = const Value.absent(),
    this.invoiceId = const Value.absent(),
    this.itemId = const Value.absent(),
    this.quantity = const Value.absent(),
    this.amountReturned = const Value.absent(),
    this.staffId = const Value.absent(),
    this.dateReturned = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  });
  StockReturnsCompanion.insert({
    this.id = const Value.absent(),
    required int invoiceId,
    required int itemId,
    required int quantity,
    required double amountReturned,
    required int staffId,
    this.dateReturned = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  })  : invoiceId = Value(invoiceId),
        itemId = Value(itemId),
        quantity = Value(quantity),
        amountReturned = Value(amountReturned),
        staffId = Value(staffId);
  static Insertable<StockReturnTable> custom({
    Expression<int>? id,
    Expression<int>? invoiceId,
    Expression<int>? itemId,
    Expression<int>? quantity,
    Expression<double>? amountReturned,
    Expression<int>? staffId,
    Expression<DateTime>? dateReturned,
    Expression<String>? syncId,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? createdAt,
    Expression<String>? deviceId,
    Expression<bool>? isDeleted,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (invoiceId != null) 'invoice_id': invoiceId,
      if (itemId != null) 'item_id': itemId,
      if (quantity != null) 'quantity': quantity,
      if (amountReturned != null) 'amount_returned': amountReturned,
      if (staffId != null) 'staff_id': staffId,
      if (dateReturned != null) 'date_returned': dateReturned,
      if (syncId != null) 'sync_id': syncId,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (createdAt != null) 'created_at': createdAt,
      if (deviceId != null) 'device_id': deviceId,
      if (isDeleted != null) 'is_deleted': isDeleted,
    });
  }

  StockReturnsCompanion copyWith(
      {Value<int>? id,
      Value<int>? invoiceId,
      Value<int>? itemId,
      Value<int>? quantity,
      Value<double>? amountReturned,
      Value<int>? staffId,
      Value<DateTime>? dateReturned,
      Value<String?>? syncId,
      Value<DateTime?>? updatedAt,
      Value<DateTime?>? createdAt,
      Value<String?>? deviceId,
      Value<bool>? isDeleted}) {
    return StockReturnsCompanion(
      id: id ?? this.id,
      invoiceId: invoiceId ?? this.invoiceId,
      itemId: itemId ?? this.itemId,
      quantity: quantity ?? this.quantity,
      amountReturned: amountReturned ?? this.amountReturned,
      staffId: staffId ?? this.staffId,
      dateReturned: dateReturned ?? this.dateReturned,
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
    if (invoiceId.present) {
      map['invoice_id'] = Variable<int>(invoiceId.value);
    }
    if (itemId.present) {
      map['item_id'] = Variable<int>(itemId.value);
    }
    if (quantity.present) {
      map['quantity'] = Variable<int>(quantity.value);
    }
    if (amountReturned.present) {
      map['amount_returned'] = Variable<double>(amountReturned.value);
    }
    if (staffId.present) {
      map['staff_id'] = Variable<int>(staffId.value);
    }
    if (dateReturned.present) {
      map['date_returned'] = Variable<DateTime>(dateReturned.value);
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
    return (StringBuffer('StockReturnsCompanion(')
          ..write('id: $id, ')
          ..write('invoiceId: $invoiceId, ')
          ..write('itemId: $itemId, ')
          ..write('quantity: $quantity, ')
          ..write('amountReturned: $amountReturned, ')
          ..write('staffId: $staffId, ')
          ..write('dateReturned: $dateReturned, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted')
          ..write(')'))
        .toString();
  }
}

class $ExpensesTable extends Expenses
    with TableInfo<$ExpensesTable, ExpenseTable> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ExpensesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _amountMeta = const VerificationMeta('amount');
  @override
  late final GeneratedColumn<double> amount = GeneratedColumn<double>(
      'amount', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _descriptionMeta =
      const VerificationMeta('description');
  @override
  late final GeneratedColumn<String> description = GeneratedColumn<String>(
      'description', aliasedName, false,
      additionalChecks:
          GeneratedColumn.checkTextLength(minTextLength: 1, maxTextLength: 255),
      type: DriftSqlType.string,
      requiredDuringInsert: true);
  static const VerificationMeta _categoryMeta =
      const VerificationMeta('category');
  @override
  late final GeneratedColumn<String> category = GeneratedColumn<String>(
      'category', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _dateMeta = const VerificationMeta('date');
  @override
  late final GeneratedColumn<DateTime> date = GeneratedColumn<DateTime>(
      'date', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
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
        amount,
        description,
        category,
        date,
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
  static const String $name = 'expenses';
  @override
  VerificationContext validateIntegrity(Insertable<ExpenseTable> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('amount')) {
      context.handle(_amountMeta,
          amount.isAcceptableOrUnknown(data['amount']!, _amountMeta));
    } else if (isInserting) {
      context.missing(_amountMeta);
    }
    if (data.containsKey('description')) {
      context.handle(
          _descriptionMeta,
          description.isAcceptableOrUnknown(
              data['description']!, _descriptionMeta));
    } else if (isInserting) {
      context.missing(_descriptionMeta);
    }
    if (data.containsKey('category')) {
      context.handle(_categoryMeta,
          category.isAcceptableOrUnknown(data['category']!, _categoryMeta));
    }
    if (data.containsKey('date')) {
      context.handle(
          _dateMeta, date.isAcceptableOrUnknown(data['date']!, _dateMeta));
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
  ExpenseTable map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return ExpenseTable(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      amount: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}amount'])!,
      description: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}description'])!,
      category: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}category']),
      date: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}date'])!,
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
  $ExpensesTable createAlias(String alias) {
    return $ExpensesTable(attachedDatabase, alias);
  }
}

class ExpenseTable extends DataClass implements Insertable<ExpenseTable> {
  final int id;
  final double amount;
  final String description;
  final String? category;
  final DateTime date;
  final String? syncId;
  final DateTime? updatedAt;
  final DateTime? createdAt;
  final String? deviceId;
  final bool isDeleted;
  const ExpenseTable(
      {required this.id,
      required this.amount,
      required this.description,
      this.category,
      required this.date,
      this.syncId,
      this.updatedAt,
      this.createdAt,
      this.deviceId,
      required this.isDeleted});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['amount'] = Variable<double>(amount);
    map['description'] = Variable<String>(description);
    if (!nullToAbsent || category != null) {
      map['category'] = Variable<String>(category);
    }
    map['date'] = Variable<DateTime>(date);
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

  ExpensesCompanion toCompanion(bool nullToAbsent) {
    return ExpensesCompanion(
      id: Value(id),
      amount: Value(amount),
      description: Value(description),
      category: category == null && nullToAbsent
          ? const Value.absent()
          : Value(category),
      date: Value(date),
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

  factory ExpenseTable.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return ExpenseTable(
      id: serializer.fromJson<int>(json['id']),
      amount: serializer.fromJson<double>(json['amount']),
      description: serializer.fromJson<String>(json['description']),
      category: serializer.fromJson<String?>(json['category']),
      date: serializer.fromJson<DateTime>(json['date']),
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
      'amount': serializer.toJson<double>(amount),
      'description': serializer.toJson<String>(description),
      'category': serializer.toJson<String?>(category),
      'date': serializer.toJson<DateTime>(date),
      'syncId': serializer.toJson<String?>(syncId),
      'updatedAt': serializer.toJson<DateTime?>(updatedAt),
      'createdAt': serializer.toJson<DateTime?>(createdAt),
      'deviceId': serializer.toJson<String?>(deviceId),
      'isDeleted': serializer.toJson<bool>(isDeleted),
    };
  }

  ExpenseTable copyWith(
          {int? id,
          double? amount,
          String? description,
          Value<String?> category = const Value.absent(),
          DateTime? date,
          Value<String?> syncId = const Value.absent(),
          Value<DateTime?> updatedAt = const Value.absent(),
          Value<DateTime?> createdAt = const Value.absent(),
          Value<String?> deviceId = const Value.absent(),
          bool? isDeleted}) =>
      ExpenseTable(
        id: id ?? this.id,
        amount: amount ?? this.amount,
        description: description ?? this.description,
        category: category.present ? category.value : this.category,
        date: date ?? this.date,
        syncId: syncId.present ? syncId.value : this.syncId,
        updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
        createdAt: createdAt.present ? createdAt.value : this.createdAt,
        deviceId: deviceId.present ? deviceId.value : this.deviceId,
        isDeleted: isDeleted ?? this.isDeleted,
      );
  ExpenseTable copyWithCompanion(ExpensesCompanion data) {
    return ExpenseTable(
      id: data.id.present ? data.id.value : this.id,
      amount: data.amount.present ? data.amount.value : this.amount,
      description:
          data.description.present ? data.description.value : this.description,
      category: data.category.present ? data.category.value : this.category,
      date: data.date.present ? data.date.value : this.date,
      syncId: data.syncId.present ? data.syncId.value : this.syncId,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      deviceId: data.deviceId.present ? data.deviceId.value : this.deviceId,
      isDeleted: data.isDeleted.present ? data.isDeleted.value : this.isDeleted,
    );
  }

  @override
  String toString() {
    return (StringBuffer('ExpenseTable(')
          ..write('id: $id, ')
          ..write('amount: $amount, ')
          ..write('description: $description, ')
          ..write('category: $category, ')
          ..write('date: $date, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, amount, description, category, date,
      syncId, updatedAt, createdAt, deviceId, isDeleted);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ExpenseTable &&
          other.id == this.id &&
          other.amount == this.amount &&
          other.description == this.description &&
          other.category == this.category &&
          other.date == this.date &&
          other.syncId == this.syncId &&
          other.updatedAt == this.updatedAt &&
          other.createdAt == this.createdAt &&
          other.deviceId == this.deviceId &&
          other.isDeleted == this.isDeleted);
}

class ExpensesCompanion extends UpdateCompanion<ExpenseTable> {
  final Value<int> id;
  final Value<double> amount;
  final Value<String> description;
  final Value<String?> category;
  final Value<DateTime> date;
  final Value<String?> syncId;
  final Value<DateTime?> updatedAt;
  final Value<DateTime?> createdAt;
  final Value<String?> deviceId;
  final Value<bool> isDeleted;
  const ExpensesCompanion({
    this.id = const Value.absent(),
    this.amount = const Value.absent(),
    this.description = const Value.absent(),
    this.category = const Value.absent(),
    this.date = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  });
  ExpensesCompanion.insert({
    this.id = const Value.absent(),
    required double amount,
    required String description,
    this.category = const Value.absent(),
    this.date = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  })  : amount = Value(amount),
        description = Value(description);
  static Insertable<ExpenseTable> custom({
    Expression<int>? id,
    Expression<double>? amount,
    Expression<String>? description,
    Expression<String>? category,
    Expression<DateTime>? date,
    Expression<String>? syncId,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? createdAt,
    Expression<String>? deviceId,
    Expression<bool>? isDeleted,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (amount != null) 'amount': amount,
      if (description != null) 'description': description,
      if (category != null) 'category': category,
      if (date != null) 'date': date,
      if (syncId != null) 'sync_id': syncId,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (createdAt != null) 'created_at': createdAt,
      if (deviceId != null) 'device_id': deviceId,
      if (isDeleted != null) 'is_deleted': isDeleted,
    });
  }

  ExpensesCompanion copyWith(
      {Value<int>? id,
      Value<double>? amount,
      Value<String>? description,
      Value<String?>? category,
      Value<DateTime>? date,
      Value<String?>? syncId,
      Value<DateTime?>? updatedAt,
      Value<DateTime?>? createdAt,
      Value<String?>? deviceId,
      Value<bool>? isDeleted}) {
    return ExpensesCompanion(
      id: id ?? this.id,
      amount: amount ?? this.amount,
      description: description ?? this.description,
      category: category ?? this.category,
      date: date ?? this.date,
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
    if (amount.present) {
      map['amount'] = Variable<double>(amount.value);
    }
    if (description.present) {
      map['description'] = Variable<String>(description.value);
    }
    if (category.present) {
      map['category'] = Variable<String>(category.value);
    }
    if (date.present) {
      map['date'] = Variable<DateTime>(date.value);
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
    return (StringBuffer('ExpensesCompanion(')
          ..write('id: $id, ')
          ..write('amount: $amount, ')
          ..write('description: $description, ')
          ..write('category: $category, ')
          ..write('date: $date, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted')
          ..write(')'))
        .toString();
  }
}

class $AcademicYearsTable extends AcademicYears
    with TableInfo<$AcademicYearsTable, AcademicYearTable> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $AcademicYearsTable(this.attachedDatabase, [this._alias]);
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
      type: DriftSqlType.string,
      requiredDuringInsert: true,
      defaultConstraints: GeneratedColumn.constraintIsAlways('UNIQUE'));
  static const VerificationMeta _startDateMeta =
      const VerificationMeta('startDate');
  @override
  late final GeneratedColumn<DateTime> startDate = GeneratedColumn<DateTime>(
      'start_date', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _endDateMeta =
      const VerificationMeta('endDate');
  @override
  late final GeneratedColumn<DateTime> endDate = GeneratedColumn<DateTime>(
      'end_date', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _isCurrentMeta =
      const VerificationMeta('isCurrent');
  @override
  late final GeneratedColumn<bool> isCurrent = GeneratedColumn<bool>(
      'is_current', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_current" IN (0, 1))'),
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
        startDate,
        endDate,
        isCurrent,
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
  static const String $name = 'academic_years';
  @override
  VerificationContext validateIntegrity(Insertable<AcademicYearTable> instance,
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
    if (data.containsKey('start_date')) {
      context.handle(_startDateMeta,
          startDate.isAcceptableOrUnknown(data['start_date']!, _startDateMeta));
    } else if (isInserting) {
      context.missing(_startDateMeta);
    }
    if (data.containsKey('end_date')) {
      context.handle(_endDateMeta,
          endDate.isAcceptableOrUnknown(data['end_date']!, _endDateMeta));
    } else if (isInserting) {
      context.missing(_endDateMeta);
    }
    if (data.containsKey('is_current')) {
      context.handle(_isCurrentMeta,
          isCurrent.isAcceptableOrUnknown(data['is_current']!, _isCurrentMeta));
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
  AcademicYearTable map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return AcademicYearTable(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      name: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}name'])!,
      startDate: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}start_date'])!,
      endDate: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}end_date'])!,
      isCurrent: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_current'])!,
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
  $AcademicYearsTable createAlias(String alias) {
    return $AcademicYearsTable(attachedDatabase, alias);
  }
}

class AcademicYearTable extends DataClass
    implements Insertable<AcademicYearTable> {
  final int id;
  final String name;
  final DateTime startDate;
  final DateTime endDate;
  final bool isCurrent;
  final String? syncId;
  final DateTime? updatedAt;
  final DateTime? createdAt;
  final String? deviceId;
  final bool isDeleted;
  const AcademicYearTable(
      {required this.id,
      required this.name,
      required this.startDate,
      required this.endDate,
      required this.isCurrent,
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
    map['start_date'] = Variable<DateTime>(startDate);
    map['end_date'] = Variable<DateTime>(endDate);
    map['is_current'] = Variable<bool>(isCurrent);
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

  AcademicYearsCompanion toCompanion(bool nullToAbsent) {
    return AcademicYearsCompanion(
      id: Value(id),
      name: Value(name),
      startDate: Value(startDate),
      endDate: Value(endDate),
      isCurrent: Value(isCurrent),
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

  factory AcademicYearTable.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return AcademicYearTable(
      id: serializer.fromJson<int>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      startDate: serializer.fromJson<DateTime>(json['startDate']),
      endDate: serializer.fromJson<DateTime>(json['endDate']),
      isCurrent: serializer.fromJson<bool>(json['isCurrent']),
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
      'startDate': serializer.toJson<DateTime>(startDate),
      'endDate': serializer.toJson<DateTime>(endDate),
      'isCurrent': serializer.toJson<bool>(isCurrent),
      'syncId': serializer.toJson<String?>(syncId),
      'updatedAt': serializer.toJson<DateTime?>(updatedAt),
      'createdAt': serializer.toJson<DateTime?>(createdAt),
      'deviceId': serializer.toJson<String?>(deviceId),
      'isDeleted': serializer.toJson<bool>(isDeleted),
    };
  }

  AcademicYearTable copyWith(
          {int? id,
          String? name,
          DateTime? startDate,
          DateTime? endDate,
          bool? isCurrent,
          Value<String?> syncId = const Value.absent(),
          Value<DateTime?> updatedAt = const Value.absent(),
          Value<DateTime?> createdAt = const Value.absent(),
          Value<String?> deviceId = const Value.absent(),
          bool? isDeleted}) =>
      AcademicYearTable(
        id: id ?? this.id,
        name: name ?? this.name,
        startDate: startDate ?? this.startDate,
        endDate: endDate ?? this.endDate,
        isCurrent: isCurrent ?? this.isCurrent,
        syncId: syncId.present ? syncId.value : this.syncId,
        updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
        createdAt: createdAt.present ? createdAt.value : this.createdAt,
        deviceId: deviceId.present ? deviceId.value : this.deviceId,
        isDeleted: isDeleted ?? this.isDeleted,
      );
  AcademicYearTable copyWithCompanion(AcademicYearsCompanion data) {
    return AcademicYearTable(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      startDate: data.startDate.present ? data.startDate.value : this.startDate,
      endDate: data.endDate.present ? data.endDate.value : this.endDate,
      isCurrent: data.isCurrent.present ? data.isCurrent.value : this.isCurrent,
      syncId: data.syncId.present ? data.syncId.value : this.syncId,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      deviceId: data.deviceId.present ? data.deviceId.value : this.deviceId,
      isDeleted: data.isDeleted.present ? data.isDeleted.value : this.isDeleted,
    );
  }

  @override
  String toString() {
    return (StringBuffer('AcademicYearTable(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('startDate: $startDate, ')
          ..write('endDate: $endDate, ')
          ..write('isCurrent: $isCurrent, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, name, startDate, endDate, isCurrent,
      syncId, updatedAt, createdAt, deviceId, isDeleted);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is AcademicYearTable &&
          other.id == this.id &&
          other.name == this.name &&
          other.startDate == this.startDate &&
          other.endDate == this.endDate &&
          other.isCurrent == this.isCurrent &&
          other.syncId == this.syncId &&
          other.updatedAt == this.updatedAt &&
          other.createdAt == this.createdAt &&
          other.deviceId == this.deviceId &&
          other.isDeleted == this.isDeleted);
}

class AcademicYearsCompanion extends UpdateCompanion<AcademicYearTable> {
  final Value<int> id;
  final Value<String> name;
  final Value<DateTime> startDate;
  final Value<DateTime> endDate;
  final Value<bool> isCurrent;
  final Value<String?> syncId;
  final Value<DateTime?> updatedAt;
  final Value<DateTime?> createdAt;
  final Value<String?> deviceId;
  final Value<bool> isDeleted;
  const AcademicYearsCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.startDate = const Value.absent(),
    this.endDate = const Value.absent(),
    this.isCurrent = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  });
  AcademicYearsCompanion.insert({
    this.id = const Value.absent(),
    required String name,
    required DateTime startDate,
    required DateTime endDate,
    this.isCurrent = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  })  : name = Value(name),
        startDate = Value(startDate),
        endDate = Value(endDate);
  static Insertable<AcademicYearTable> custom({
    Expression<int>? id,
    Expression<String>? name,
    Expression<DateTime>? startDate,
    Expression<DateTime>? endDate,
    Expression<bool>? isCurrent,
    Expression<String>? syncId,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? createdAt,
    Expression<String>? deviceId,
    Expression<bool>? isDeleted,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (startDate != null) 'start_date': startDate,
      if (endDate != null) 'end_date': endDate,
      if (isCurrent != null) 'is_current': isCurrent,
      if (syncId != null) 'sync_id': syncId,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (createdAt != null) 'created_at': createdAt,
      if (deviceId != null) 'device_id': deviceId,
      if (isDeleted != null) 'is_deleted': isDeleted,
    });
  }

  AcademicYearsCompanion copyWith(
      {Value<int>? id,
      Value<String>? name,
      Value<DateTime>? startDate,
      Value<DateTime>? endDate,
      Value<bool>? isCurrent,
      Value<String?>? syncId,
      Value<DateTime?>? updatedAt,
      Value<DateTime?>? createdAt,
      Value<String?>? deviceId,
      Value<bool>? isDeleted}) {
    return AcademicYearsCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      isCurrent: isCurrent ?? this.isCurrent,
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
    if (startDate.present) {
      map['start_date'] = Variable<DateTime>(startDate.value);
    }
    if (endDate.present) {
      map['end_date'] = Variable<DateTime>(endDate.value);
    }
    if (isCurrent.present) {
      map['is_current'] = Variable<bool>(isCurrent.value);
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
    return (StringBuffer('AcademicYearsCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('startDate: $startDate, ')
          ..write('endDate: $endDate, ')
          ..write('isCurrent: $isCurrent, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted')
          ..write(')'))
        .toString();
  }
}

class $TermsTable extends Terms with TableInfo<$TermsTable, TermTable> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $TermsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _academicYearIdMeta =
      const VerificationMeta('academicYearId');
  @override
  late final GeneratedColumn<int> academicYearId = GeneratedColumn<int>(
      'academic_year_id', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: true,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('REFERENCES academic_years (id)'));
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
      'name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _startDateMeta =
      const VerificationMeta('startDate');
  @override
  late final GeneratedColumn<DateTime> startDate = GeneratedColumn<DateTime>(
      'start_date', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _endDateMeta =
      const VerificationMeta('endDate');
  @override
  late final GeneratedColumn<DateTime> endDate = GeneratedColumn<DateTime>(
      'end_date', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _isCurrentMeta =
      const VerificationMeta('isCurrent');
  @override
  late final GeneratedColumn<bool> isCurrent = GeneratedColumn<bool>(
      'is_current', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_current" IN (0, 1))'),
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
        academicYearId,
        name,
        startDate,
        endDate,
        isCurrent,
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
  static const String $name = 'terms';
  @override
  VerificationContext validateIntegrity(Insertable<TermTable> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('academic_year_id')) {
      context.handle(
          _academicYearIdMeta,
          academicYearId.isAcceptableOrUnknown(
              data['academic_year_id']!, _academicYearIdMeta));
    } else if (isInserting) {
      context.missing(_academicYearIdMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
          _nameMeta, name.isAcceptableOrUnknown(data['name']!, _nameMeta));
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('start_date')) {
      context.handle(_startDateMeta,
          startDate.isAcceptableOrUnknown(data['start_date']!, _startDateMeta));
    } else if (isInserting) {
      context.missing(_startDateMeta);
    }
    if (data.containsKey('end_date')) {
      context.handle(_endDateMeta,
          endDate.isAcceptableOrUnknown(data['end_date']!, _endDateMeta));
    } else if (isInserting) {
      context.missing(_endDateMeta);
    }
    if (data.containsKey('is_current')) {
      context.handle(_isCurrentMeta,
          isCurrent.isAcceptableOrUnknown(data['is_current']!, _isCurrentMeta));
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
  List<Set<GeneratedColumn>> get uniqueKeys => [
        {academicYearId, name},
      ];
  @override
  TermTable map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return TermTable(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      academicYearId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}academic_year_id'])!,
      name: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}name'])!,
      startDate: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}start_date'])!,
      endDate: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}end_date'])!,
      isCurrent: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_current'])!,
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
  $TermsTable createAlias(String alias) {
    return $TermsTable(attachedDatabase, alias);
  }
}

class TermTable extends DataClass implements Insertable<TermTable> {
  final int id;
  final int academicYearId;
  final String name;
  final DateTime startDate;
  final DateTime endDate;
  final bool isCurrent;
  final String? syncId;
  final DateTime? updatedAt;
  final DateTime? createdAt;
  final String? deviceId;
  final bool isDeleted;
  const TermTable(
      {required this.id,
      required this.academicYearId,
      required this.name,
      required this.startDate,
      required this.endDate,
      required this.isCurrent,
      this.syncId,
      this.updatedAt,
      this.createdAt,
      this.deviceId,
      required this.isDeleted});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['academic_year_id'] = Variable<int>(academicYearId);
    map['name'] = Variable<String>(name);
    map['start_date'] = Variable<DateTime>(startDate);
    map['end_date'] = Variable<DateTime>(endDate);
    map['is_current'] = Variable<bool>(isCurrent);
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

  TermsCompanion toCompanion(bool nullToAbsent) {
    return TermsCompanion(
      id: Value(id),
      academicYearId: Value(academicYearId),
      name: Value(name),
      startDate: Value(startDate),
      endDate: Value(endDate),
      isCurrent: Value(isCurrent),
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

  factory TermTable.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return TermTable(
      id: serializer.fromJson<int>(json['id']),
      academicYearId: serializer.fromJson<int>(json['academicYearId']),
      name: serializer.fromJson<String>(json['name']),
      startDate: serializer.fromJson<DateTime>(json['startDate']),
      endDate: serializer.fromJson<DateTime>(json['endDate']),
      isCurrent: serializer.fromJson<bool>(json['isCurrent']),
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
      'academicYearId': serializer.toJson<int>(academicYearId),
      'name': serializer.toJson<String>(name),
      'startDate': serializer.toJson<DateTime>(startDate),
      'endDate': serializer.toJson<DateTime>(endDate),
      'isCurrent': serializer.toJson<bool>(isCurrent),
      'syncId': serializer.toJson<String?>(syncId),
      'updatedAt': serializer.toJson<DateTime?>(updatedAt),
      'createdAt': serializer.toJson<DateTime?>(createdAt),
      'deviceId': serializer.toJson<String?>(deviceId),
      'isDeleted': serializer.toJson<bool>(isDeleted),
    };
  }

  TermTable copyWith(
          {int? id,
          int? academicYearId,
          String? name,
          DateTime? startDate,
          DateTime? endDate,
          bool? isCurrent,
          Value<String?> syncId = const Value.absent(),
          Value<DateTime?> updatedAt = const Value.absent(),
          Value<DateTime?> createdAt = const Value.absent(),
          Value<String?> deviceId = const Value.absent(),
          bool? isDeleted}) =>
      TermTable(
        id: id ?? this.id,
        academicYearId: academicYearId ?? this.academicYearId,
        name: name ?? this.name,
        startDate: startDate ?? this.startDate,
        endDate: endDate ?? this.endDate,
        isCurrent: isCurrent ?? this.isCurrent,
        syncId: syncId.present ? syncId.value : this.syncId,
        updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
        createdAt: createdAt.present ? createdAt.value : this.createdAt,
        deviceId: deviceId.present ? deviceId.value : this.deviceId,
        isDeleted: isDeleted ?? this.isDeleted,
      );
  TermTable copyWithCompanion(TermsCompanion data) {
    return TermTable(
      id: data.id.present ? data.id.value : this.id,
      academicYearId: data.academicYearId.present
          ? data.academicYearId.value
          : this.academicYearId,
      name: data.name.present ? data.name.value : this.name,
      startDate: data.startDate.present ? data.startDate.value : this.startDate,
      endDate: data.endDate.present ? data.endDate.value : this.endDate,
      isCurrent: data.isCurrent.present ? data.isCurrent.value : this.isCurrent,
      syncId: data.syncId.present ? data.syncId.value : this.syncId,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      deviceId: data.deviceId.present ? data.deviceId.value : this.deviceId,
      isDeleted: data.isDeleted.present ? data.isDeleted.value : this.isDeleted,
    );
  }

  @override
  String toString() {
    return (StringBuffer('TermTable(')
          ..write('id: $id, ')
          ..write('academicYearId: $academicYearId, ')
          ..write('name: $name, ')
          ..write('startDate: $startDate, ')
          ..write('endDate: $endDate, ')
          ..write('isCurrent: $isCurrent, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, academicYearId, name, startDate, endDate,
      isCurrent, syncId, updatedAt, createdAt, deviceId, isDeleted);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is TermTable &&
          other.id == this.id &&
          other.academicYearId == this.academicYearId &&
          other.name == this.name &&
          other.startDate == this.startDate &&
          other.endDate == this.endDate &&
          other.isCurrent == this.isCurrent &&
          other.syncId == this.syncId &&
          other.updatedAt == this.updatedAt &&
          other.createdAt == this.createdAt &&
          other.deviceId == this.deviceId &&
          other.isDeleted == this.isDeleted);
}

class TermsCompanion extends UpdateCompanion<TermTable> {
  final Value<int> id;
  final Value<int> academicYearId;
  final Value<String> name;
  final Value<DateTime> startDate;
  final Value<DateTime> endDate;
  final Value<bool> isCurrent;
  final Value<String?> syncId;
  final Value<DateTime?> updatedAt;
  final Value<DateTime?> createdAt;
  final Value<String?> deviceId;
  final Value<bool> isDeleted;
  const TermsCompanion({
    this.id = const Value.absent(),
    this.academicYearId = const Value.absent(),
    this.name = const Value.absent(),
    this.startDate = const Value.absent(),
    this.endDate = const Value.absent(),
    this.isCurrent = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  });
  TermsCompanion.insert({
    this.id = const Value.absent(),
    required int academicYearId,
    required String name,
    required DateTime startDate,
    required DateTime endDate,
    this.isCurrent = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  })  : academicYearId = Value(academicYearId),
        name = Value(name),
        startDate = Value(startDate),
        endDate = Value(endDate);
  static Insertable<TermTable> custom({
    Expression<int>? id,
    Expression<int>? academicYearId,
    Expression<String>? name,
    Expression<DateTime>? startDate,
    Expression<DateTime>? endDate,
    Expression<bool>? isCurrent,
    Expression<String>? syncId,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? createdAt,
    Expression<String>? deviceId,
    Expression<bool>? isDeleted,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (academicYearId != null) 'academic_year_id': academicYearId,
      if (name != null) 'name': name,
      if (startDate != null) 'start_date': startDate,
      if (endDate != null) 'end_date': endDate,
      if (isCurrent != null) 'is_current': isCurrent,
      if (syncId != null) 'sync_id': syncId,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (createdAt != null) 'created_at': createdAt,
      if (deviceId != null) 'device_id': deviceId,
      if (isDeleted != null) 'is_deleted': isDeleted,
    });
  }

  TermsCompanion copyWith(
      {Value<int>? id,
      Value<int>? academicYearId,
      Value<String>? name,
      Value<DateTime>? startDate,
      Value<DateTime>? endDate,
      Value<bool>? isCurrent,
      Value<String?>? syncId,
      Value<DateTime?>? updatedAt,
      Value<DateTime?>? createdAt,
      Value<String?>? deviceId,
      Value<bool>? isDeleted}) {
    return TermsCompanion(
      id: id ?? this.id,
      academicYearId: academicYearId ?? this.academicYearId,
      name: name ?? this.name,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      isCurrent: isCurrent ?? this.isCurrent,
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
    if (academicYearId.present) {
      map['academic_year_id'] = Variable<int>(academicYearId.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (startDate.present) {
      map['start_date'] = Variable<DateTime>(startDate.value);
    }
    if (endDate.present) {
      map['end_date'] = Variable<DateTime>(endDate.value);
    }
    if (isCurrent.present) {
      map['is_current'] = Variable<bool>(isCurrent.value);
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
    return (StringBuffer('TermsCompanion(')
          ..write('id: $id, ')
          ..write('academicYearId: $academicYearId, ')
          ..write('name: $name, ')
          ..write('startDate: $startDate, ')
          ..write('endDate: $endDate, ')
          ..write('isCurrent: $isCurrent, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted')
          ..write(')'))
        .toString();
  }
}

class $ClassesTable extends Classes with TableInfo<$ClassesTable, ClassTable> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ClassesTable(this.attachedDatabase, [this._alias]);
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
      type: DriftSqlType.string,
      requiredDuringInsert: true,
      defaultConstraints: GeneratedColumn.constraintIsAlways('UNIQUE'));
  static const VerificationMeta _descriptionMeta =
      const VerificationMeta('description');
  @override
  late final GeneratedColumn<String> description = GeneratedColumn<String>(
      'description', aliasedName, true,
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
        name,
        description,
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
  static const String $name = 'classes';
  @override
  VerificationContext validateIntegrity(Insertable<ClassTable> instance,
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
    if (data.containsKey('description')) {
      context.handle(
          _descriptionMeta,
          description.isAcceptableOrUnknown(
              data['description']!, _descriptionMeta));
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
  ClassTable map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return ClassTable(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      name: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}name'])!,
      description: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}description']),
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
  $ClassesTable createAlias(String alias) {
    return $ClassesTable(attachedDatabase, alias);
  }
}

class ClassTable extends DataClass implements Insertable<ClassTable> {
  final int id;
  final String name;
  final String? description;
  final String? syncId;
  final DateTime? updatedAt;
  final DateTime? createdAt;
  final String? deviceId;
  final bool isDeleted;
  const ClassTable(
      {required this.id,
      required this.name,
      this.description,
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
    if (!nullToAbsent || description != null) {
      map['description'] = Variable<String>(description);
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

  ClassesCompanion toCompanion(bool nullToAbsent) {
    return ClassesCompanion(
      id: Value(id),
      name: Value(name),
      description: description == null && nullToAbsent
          ? const Value.absent()
          : Value(description),
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

  factory ClassTable.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return ClassTable(
      id: serializer.fromJson<int>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      description: serializer.fromJson<String?>(json['description']),
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
      'description': serializer.toJson<String?>(description),
      'syncId': serializer.toJson<String?>(syncId),
      'updatedAt': serializer.toJson<DateTime?>(updatedAt),
      'createdAt': serializer.toJson<DateTime?>(createdAt),
      'deviceId': serializer.toJson<String?>(deviceId),
      'isDeleted': serializer.toJson<bool>(isDeleted),
    };
  }

  ClassTable copyWith(
          {int? id,
          String? name,
          Value<String?> description = const Value.absent(),
          Value<String?> syncId = const Value.absent(),
          Value<DateTime?> updatedAt = const Value.absent(),
          Value<DateTime?> createdAt = const Value.absent(),
          Value<String?> deviceId = const Value.absent(),
          bool? isDeleted}) =>
      ClassTable(
        id: id ?? this.id,
        name: name ?? this.name,
        description: description.present ? description.value : this.description,
        syncId: syncId.present ? syncId.value : this.syncId,
        updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
        createdAt: createdAt.present ? createdAt.value : this.createdAt,
        deviceId: deviceId.present ? deviceId.value : this.deviceId,
        isDeleted: isDeleted ?? this.isDeleted,
      );
  ClassTable copyWithCompanion(ClassesCompanion data) {
    return ClassTable(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      description:
          data.description.present ? data.description.value : this.description,
      syncId: data.syncId.present ? data.syncId.value : this.syncId,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      deviceId: data.deviceId.present ? data.deviceId.value : this.deviceId,
      isDeleted: data.isDeleted.present ? data.isDeleted.value : this.isDeleted,
    );
  }

  @override
  String toString() {
    return (StringBuffer('ClassTable(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('description: $description, ')
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
      id, name, description, syncId, updatedAt, createdAt, deviceId, isDeleted);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ClassTable &&
          other.id == this.id &&
          other.name == this.name &&
          other.description == this.description &&
          other.syncId == this.syncId &&
          other.updatedAt == this.updatedAt &&
          other.createdAt == this.createdAt &&
          other.deviceId == this.deviceId &&
          other.isDeleted == this.isDeleted);
}

class ClassesCompanion extends UpdateCompanion<ClassTable> {
  final Value<int> id;
  final Value<String> name;
  final Value<String?> description;
  final Value<String?> syncId;
  final Value<DateTime?> updatedAt;
  final Value<DateTime?> createdAt;
  final Value<String?> deviceId;
  final Value<bool> isDeleted;
  const ClassesCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.description = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  });
  ClassesCompanion.insert({
    this.id = const Value.absent(),
    required String name,
    this.description = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  }) : name = Value(name);
  static Insertable<ClassTable> custom({
    Expression<int>? id,
    Expression<String>? name,
    Expression<String>? description,
    Expression<String>? syncId,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? createdAt,
    Expression<String>? deviceId,
    Expression<bool>? isDeleted,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (description != null) 'description': description,
      if (syncId != null) 'sync_id': syncId,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (createdAt != null) 'created_at': createdAt,
      if (deviceId != null) 'device_id': deviceId,
      if (isDeleted != null) 'is_deleted': isDeleted,
    });
  }

  ClassesCompanion copyWith(
      {Value<int>? id,
      Value<String>? name,
      Value<String?>? description,
      Value<String?>? syncId,
      Value<DateTime?>? updatedAt,
      Value<DateTime?>? createdAt,
      Value<String?>? deviceId,
      Value<bool>? isDeleted}) {
    return ClassesCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
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
    if (description.present) {
      map['description'] = Variable<String>(description.value);
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
    return (StringBuffer('ClassesCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('description: $description, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted')
          ..write(')'))
        .toString();
  }
}

class $StudentsTable extends Students with TableInfo<$StudentsTable, Student> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $StudentsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _admissionNumberMeta =
      const VerificationMeta('admissionNumber');
  @override
  late final GeneratedColumn<String> admissionNumber = GeneratedColumn<String>(
      'admission_number', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: true,
      defaultConstraints: GeneratedColumn.constraintIsAlways('UNIQUE'));
  static const VerificationMeta _firstNameMeta =
      const VerificationMeta('firstName');
  @override
  late final GeneratedColumn<String> firstName = GeneratedColumn<String>(
      'first_name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _lastNameMeta =
      const VerificationMeta('lastName');
  @override
  late final GeneratedColumn<String> lastName = GeneratedColumn<String>(
      'last_name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _classIdMeta =
      const VerificationMeta('classId');
  @override
  late final GeneratedColumn<int> classId = GeneratedColumn<int>(
      'class_id', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: true,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('REFERENCES classes (id)'));
  static const VerificationMeta _parentNameMeta =
      const VerificationMeta('parentName');
  @override
  late final GeneratedColumn<String> parentName = GeneratedColumn<String>(
      'parent_name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _parentPhoneMeta =
      const VerificationMeta('parentPhone');
  @override
  late final GeneratedColumn<String> parentPhone = GeneratedColumn<String>(
      'parent_phone', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _balanceMeta =
      const VerificationMeta('balance');
  @override
  late final GeneratedColumn<double> balance = GeneratedColumn<double>(
      'balance', aliasedName, false,
      type: DriftSqlType.double,
      requiredDuringInsert: false,
      defaultValue: const Constant(0.0));
  static const VerificationMeta _dateOfBirthMeta =
      const VerificationMeta('dateOfBirth');
  @override
  late final GeneratedColumn<DateTime> dateOfBirth = GeneratedColumn<DateTime>(
      'date_of_birth', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _registrationDateMeta =
      const VerificationMeta('registrationDate');
  @override
  late final GeneratedColumn<DateTime> registrationDate =
      GeneratedColumn<DateTime>('registration_date', aliasedName, false,
          type: DriftSqlType.dateTime,
          requiredDuringInsert: false,
          defaultValue: currentDateAndTime);
  static const VerificationMeta _imageMeta = const VerificationMeta('image');
  @override
  late final GeneratedColumn<Uint8List> image = GeneratedColumn<Uint8List>(
      'image', aliasedName, true,
      type: DriftSqlType.blob, requiredDuringInsert: false);
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
        admissionNumber,
        firstName,
        lastName,
        classId,
        parentName,
        parentPhone,
        balance,
        dateOfBirth,
        registrationDate,
        image,
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
  static const String $name = 'students';
  @override
  VerificationContext validateIntegrity(Insertable<Student> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('admission_number')) {
      context.handle(
          _admissionNumberMeta,
          admissionNumber.isAcceptableOrUnknown(
              data['admission_number']!, _admissionNumberMeta));
    } else if (isInserting) {
      context.missing(_admissionNumberMeta);
    }
    if (data.containsKey('first_name')) {
      context.handle(_firstNameMeta,
          firstName.isAcceptableOrUnknown(data['first_name']!, _firstNameMeta));
    } else if (isInserting) {
      context.missing(_firstNameMeta);
    }
    if (data.containsKey('last_name')) {
      context.handle(_lastNameMeta,
          lastName.isAcceptableOrUnknown(data['last_name']!, _lastNameMeta));
    } else if (isInserting) {
      context.missing(_lastNameMeta);
    }
    if (data.containsKey('class_id')) {
      context.handle(_classIdMeta,
          classId.isAcceptableOrUnknown(data['class_id']!, _classIdMeta));
    } else if (isInserting) {
      context.missing(_classIdMeta);
    }
    if (data.containsKey('parent_name')) {
      context.handle(
          _parentNameMeta,
          parentName.isAcceptableOrUnknown(
              data['parent_name']!, _parentNameMeta));
    }
    if (data.containsKey('parent_phone')) {
      context.handle(
          _parentPhoneMeta,
          parentPhone.isAcceptableOrUnknown(
              data['parent_phone']!, _parentPhoneMeta));
    }
    if (data.containsKey('balance')) {
      context.handle(_balanceMeta,
          balance.isAcceptableOrUnknown(data['balance']!, _balanceMeta));
    }
    if (data.containsKey('date_of_birth')) {
      context.handle(
          _dateOfBirthMeta,
          dateOfBirth.isAcceptableOrUnknown(
              data['date_of_birth']!, _dateOfBirthMeta));
    }
    if (data.containsKey('registration_date')) {
      context.handle(
          _registrationDateMeta,
          registrationDate.isAcceptableOrUnknown(
              data['registration_date']!, _registrationDateMeta));
    }
    if (data.containsKey('image')) {
      context.handle(
          _imageMeta, image.isAcceptableOrUnknown(data['image']!, _imageMeta));
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
  Student map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Student(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      admissionNumber: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}admission_number'])!,
      firstName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}first_name'])!,
      lastName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}last_name'])!,
      classId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}class_id'])!,
      parentName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}parent_name']),
      parentPhone: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}parent_phone']),
      balance: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}balance'])!,
      dateOfBirth: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}date_of_birth']),
      registrationDate: attachedDatabase.typeMapping.read(
          DriftSqlType.dateTime, data['${effectivePrefix}registration_date'])!,
      image: attachedDatabase.typeMapping
          .read(DriftSqlType.blob, data['${effectivePrefix}image']),
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
  $StudentsTable createAlias(String alias) {
    return $StudentsTable(attachedDatabase, alias);
  }
}

class Student extends DataClass implements Insertable<Student> {
  final int id;
  final String admissionNumber;
  final String firstName;
  final String lastName;
  final int classId;
  final String? parentName;
  final String? parentPhone;
  final double balance;
  final DateTime? dateOfBirth;
  final DateTime registrationDate;
  final Uint8List? image;
  final String? syncId;
  final DateTime? updatedAt;
  final DateTime? createdAt;
  final String? deviceId;
  final bool isDeleted;
  const Student(
      {required this.id,
      required this.admissionNumber,
      required this.firstName,
      required this.lastName,
      required this.classId,
      this.parentName,
      this.parentPhone,
      required this.balance,
      this.dateOfBirth,
      required this.registrationDate,
      this.image,
      this.syncId,
      this.updatedAt,
      this.createdAt,
      this.deviceId,
      required this.isDeleted});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['admission_number'] = Variable<String>(admissionNumber);
    map['first_name'] = Variable<String>(firstName);
    map['last_name'] = Variable<String>(lastName);
    map['class_id'] = Variable<int>(classId);
    if (!nullToAbsent || parentName != null) {
      map['parent_name'] = Variable<String>(parentName);
    }
    if (!nullToAbsent || parentPhone != null) {
      map['parent_phone'] = Variable<String>(parentPhone);
    }
    map['balance'] = Variable<double>(balance);
    if (!nullToAbsent || dateOfBirth != null) {
      map['date_of_birth'] = Variable<DateTime>(dateOfBirth);
    }
    map['registration_date'] = Variable<DateTime>(registrationDate);
    if (!nullToAbsent || image != null) {
      map['image'] = Variable<Uint8List>(image);
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

  StudentsCompanion toCompanion(bool nullToAbsent) {
    return StudentsCompanion(
      id: Value(id),
      admissionNumber: Value(admissionNumber),
      firstName: Value(firstName),
      lastName: Value(lastName),
      classId: Value(classId),
      parentName: parentName == null && nullToAbsent
          ? const Value.absent()
          : Value(parentName),
      parentPhone: parentPhone == null && nullToAbsent
          ? const Value.absent()
          : Value(parentPhone),
      balance: Value(balance),
      dateOfBirth: dateOfBirth == null && nullToAbsent
          ? const Value.absent()
          : Value(dateOfBirth),
      registrationDate: Value(registrationDate),
      image:
          image == null && nullToAbsent ? const Value.absent() : Value(image),
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

  factory Student.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Student(
      id: serializer.fromJson<int>(json['id']),
      admissionNumber: serializer.fromJson<String>(json['admissionNumber']),
      firstName: serializer.fromJson<String>(json['firstName']),
      lastName: serializer.fromJson<String>(json['lastName']),
      classId: serializer.fromJson<int>(json['classId']),
      parentName: serializer.fromJson<String?>(json['parentName']),
      parentPhone: serializer.fromJson<String?>(json['parentPhone']),
      balance: serializer.fromJson<double>(json['balance']),
      dateOfBirth: serializer.fromJson<DateTime?>(json['dateOfBirth']),
      registrationDate: serializer.fromJson<DateTime>(json['registrationDate']),
      image: serializer.fromJson<Uint8List?>(json['image']),
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
      'admissionNumber': serializer.toJson<String>(admissionNumber),
      'firstName': serializer.toJson<String>(firstName),
      'lastName': serializer.toJson<String>(lastName),
      'classId': serializer.toJson<int>(classId),
      'parentName': serializer.toJson<String?>(parentName),
      'parentPhone': serializer.toJson<String?>(parentPhone),
      'balance': serializer.toJson<double>(balance),
      'dateOfBirth': serializer.toJson<DateTime?>(dateOfBirth),
      'registrationDate': serializer.toJson<DateTime>(registrationDate),
      'image': serializer.toJson<Uint8List?>(image),
      'syncId': serializer.toJson<String?>(syncId),
      'updatedAt': serializer.toJson<DateTime?>(updatedAt),
      'createdAt': serializer.toJson<DateTime?>(createdAt),
      'deviceId': serializer.toJson<String?>(deviceId),
      'isDeleted': serializer.toJson<bool>(isDeleted),
    };
  }

  Student copyWith(
          {int? id,
          String? admissionNumber,
          String? firstName,
          String? lastName,
          int? classId,
          Value<String?> parentName = const Value.absent(),
          Value<String?> parentPhone = const Value.absent(),
          double? balance,
          Value<DateTime?> dateOfBirth = const Value.absent(),
          DateTime? registrationDate,
          Value<Uint8List?> image = const Value.absent(),
          Value<String?> syncId = const Value.absent(),
          Value<DateTime?> updatedAt = const Value.absent(),
          Value<DateTime?> createdAt = const Value.absent(),
          Value<String?> deviceId = const Value.absent(),
          bool? isDeleted}) =>
      Student(
        id: id ?? this.id,
        admissionNumber: admissionNumber ?? this.admissionNumber,
        firstName: firstName ?? this.firstName,
        lastName: lastName ?? this.lastName,
        classId: classId ?? this.classId,
        parentName: parentName.present ? parentName.value : this.parentName,
        parentPhone: parentPhone.present ? parentPhone.value : this.parentPhone,
        balance: balance ?? this.balance,
        dateOfBirth: dateOfBirth.present ? dateOfBirth.value : this.dateOfBirth,
        registrationDate: registrationDate ?? this.registrationDate,
        image: image.present ? image.value : this.image,
        syncId: syncId.present ? syncId.value : this.syncId,
        updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
        createdAt: createdAt.present ? createdAt.value : this.createdAt,
        deviceId: deviceId.present ? deviceId.value : this.deviceId,
        isDeleted: isDeleted ?? this.isDeleted,
      );
  Student copyWithCompanion(StudentsCompanion data) {
    return Student(
      id: data.id.present ? data.id.value : this.id,
      admissionNumber: data.admissionNumber.present
          ? data.admissionNumber.value
          : this.admissionNumber,
      firstName: data.firstName.present ? data.firstName.value : this.firstName,
      lastName: data.lastName.present ? data.lastName.value : this.lastName,
      classId: data.classId.present ? data.classId.value : this.classId,
      parentName:
          data.parentName.present ? data.parentName.value : this.parentName,
      parentPhone:
          data.parentPhone.present ? data.parentPhone.value : this.parentPhone,
      balance: data.balance.present ? data.balance.value : this.balance,
      dateOfBirth:
          data.dateOfBirth.present ? data.dateOfBirth.value : this.dateOfBirth,
      registrationDate: data.registrationDate.present
          ? data.registrationDate.value
          : this.registrationDate,
      image: data.image.present ? data.image.value : this.image,
      syncId: data.syncId.present ? data.syncId.value : this.syncId,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      deviceId: data.deviceId.present ? data.deviceId.value : this.deviceId,
      isDeleted: data.isDeleted.present ? data.isDeleted.value : this.isDeleted,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Student(')
          ..write('id: $id, ')
          ..write('admissionNumber: $admissionNumber, ')
          ..write('firstName: $firstName, ')
          ..write('lastName: $lastName, ')
          ..write('classId: $classId, ')
          ..write('parentName: $parentName, ')
          ..write('parentPhone: $parentPhone, ')
          ..write('balance: $balance, ')
          ..write('dateOfBirth: $dateOfBirth, ')
          ..write('registrationDate: $registrationDate, ')
          ..write('image: $image, ')
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
      admissionNumber,
      firstName,
      lastName,
      classId,
      parentName,
      parentPhone,
      balance,
      dateOfBirth,
      registrationDate,
      $driftBlobEquality.hash(image),
      syncId,
      updatedAt,
      createdAt,
      deviceId,
      isDeleted);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Student &&
          other.id == this.id &&
          other.admissionNumber == this.admissionNumber &&
          other.firstName == this.firstName &&
          other.lastName == this.lastName &&
          other.classId == this.classId &&
          other.parentName == this.parentName &&
          other.parentPhone == this.parentPhone &&
          other.balance == this.balance &&
          other.dateOfBirth == this.dateOfBirth &&
          other.registrationDate == this.registrationDate &&
          $driftBlobEquality.equals(other.image, this.image) &&
          other.syncId == this.syncId &&
          other.updatedAt == this.updatedAt &&
          other.createdAt == this.createdAt &&
          other.deviceId == this.deviceId &&
          other.isDeleted == this.isDeleted);
}

class StudentsCompanion extends UpdateCompanion<Student> {
  final Value<int> id;
  final Value<String> admissionNumber;
  final Value<String> firstName;
  final Value<String> lastName;
  final Value<int> classId;
  final Value<String?> parentName;
  final Value<String?> parentPhone;
  final Value<double> balance;
  final Value<DateTime?> dateOfBirth;
  final Value<DateTime> registrationDate;
  final Value<Uint8List?> image;
  final Value<String?> syncId;
  final Value<DateTime?> updatedAt;
  final Value<DateTime?> createdAt;
  final Value<String?> deviceId;
  final Value<bool> isDeleted;
  const StudentsCompanion({
    this.id = const Value.absent(),
    this.admissionNumber = const Value.absent(),
    this.firstName = const Value.absent(),
    this.lastName = const Value.absent(),
    this.classId = const Value.absent(),
    this.parentName = const Value.absent(),
    this.parentPhone = const Value.absent(),
    this.balance = const Value.absent(),
    this.dateOfBirth = const Value.absent(),
    this.registrationDate = const Value.absent(),
    this.image = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  });
  StudentsCompanion.insert({
    this.id = const Value.absent(),
    required String admissionNumber,
    required String firstName,
    required String lastName,
    required int classId,
    this.parentName = const Value.absent(),
    this.parentPhone = const Value.absent(),
    this.balance = const Value.absent(),
    this.dateOfBirth = const Value.absent(),
    this.registrationDate = const Value.absent(),
    this.image = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  })  : admissionNumber = Value(admissionNumber),
        firstName = Value(firstName),
        lastName = Value(lastName),
        classId = Value(classId);
  static Insertable<Student> custom({
    Expression<int>? id,
    Expression<String>? admissionNumber,
    Expression<String>? firstName,
    Expression<String>? lastName,
    Expression<int>? classId,
    Expression<String>? parentName,
    Expression<String>? parentPhone,
    Expression<double>? balance,
    Expression<DateTime>? dateOfBirth,
    Expression<DateTime>? registrationDate,
    Expression<Uint8List>? image,
    Expression<String>? syncId,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? createdAt,
    Expression<String>? deviceId,
    Expression<bool>? isDeleted,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (admissionNumber != null) 'admission_number': admissionNumber,
      if (firstName != null) 'first_name': firstName,
      if (lastName != null) 'last_name': lastName,
      if (classId != null) 'class_id': classId,
      if (parentName != null) 'parent_name': parentName,
      if (parentPhone != null) 'parent_phone': parentPhone,
      if (balance != null) 'balance': balance,
      if (dateOfBirth != null) 'date_of_birth': dateOfBirth,
      if (registrationDate != null) 'registration_date': registrationDate,
      if (image != null) 'image': image,
      if (syncId != null) 'sync_id': syncId,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (createdAt != null) 'created_at': createdAt,
      if (deviceId != null) 'device_id': deviceId,
      if (isDeleted != null) 'is_deleted': isDeleted,
    });
  }

  StudentsCompanion copyWith(
      {Value<int>? id,
      Value<String>? admissionNumber,
      Value<String>? firstName,
      Value<String>? lastName,
      Value<int>? classId,
      Value<String?>? parentName,
      Value<String?>? parentPhone,
      Value<double>? balance,
      Value<DateTime?>? dateOfBirth,
      Value<DateTime>? registrationDate,
      Value<Uint8List?>? image,
      Value<String?>? syncId,
      Value<DateTime?>? updatedAt,
      Value<DateTime?>? createdAt,
      Value<String?>? deviceId,
      Value<bool>? isDeleted}) {
    return StudentsCompanion(
      id: id ?? this.id,
      admissionNumber: admissionNumber ?? this.admissionNumber,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      classId: classId ?? this.classId,
      parentName: parentName ?? this.parentName,
      parentPhone: parentPhone ?? this.parentPhone,
      balance: balance ?? this.balance,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      registrationDate: registrationDate ?? this.registrationDate,
      image: image ?? this.image,
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
    if (admissionNumber.present) {
      map['admission_number'] = Variable<String>(admissionNumber.value);
    }
    if (firstName.present) {
      map['first_name'] = Variable<String>(firstName.value);
    }
    if (lastName.present) {
      map['last_name'] = Variable<String>(lastName.value);
    }
    if (classId.present) {
      map['class_id'] = Variable<int>(classId.value);
    }
    if (parentName.present) {
      map['parent_name'] = Variable<String>(parentName.value);
    }
    if (parentPhone.present) {
      map['parent_phone'] = Variable<String>(parentPhone.value);
    }
    if (balance.present) {
      map['balance'] = Variable<double>(balance.value);
    }
    if (dateOfBirth.present) {
      map['date_of_birth'] = Variable<DateTime>(dateOfBirth.value);
    }
    if (registrationDate.present) {
      map['registration_date'] = Variable<DateTime>(registrationDate.value);
    }
    if (image.present) {
      map['image'] = Variable<Uint8List>(image.value);
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
    return (StringBuffer('StudentsCompanion(')
          ..write('id: $id, ')
          ..write('admissionNumber: $admissionNumber, ')
          ..write('firstName: $firstName, ')
          ..write('lastName: $lastName, ')
          ..write('classId: $classId, ')
          ..write('parentName: $parentName, ')
          ..write('parentPhone: $parentPhone, ')
          ..write('balance: $balance, ')
          ..write('dateOfBirth: $dateOfBirth, ')
          ..write('registrationDate: $registrationDate, ')
          ..write('image: $image, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted')
          ..write(')'))
        .toString();
  }
}

class $BusinessSettingsTable extends BusinessSettings
    with TableInfo<$BusinessSettingsTable, BusinessSettingTable> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $BusinessSettingsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _businessModeMeta =
      const VerificationMeta('businessMode');
  @override
  late final GeneratedColumn<String> businessMode = GeneratedColumn<String>(
      'business_mode', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('retail'));
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [id, businessMode, updatedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'business_settings';
  @override
  VerificationContext validateIntegrity(
      Insertable<BusinessSettingTable> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('business_mode')) {
      context.handle(
          _businessModeMeta,
          businessMode.isAcceptableOrUnknown(
              data['business_mode']!, _businessModeMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  BusinessSettingTable map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return BusinessSettingTable(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      businessMode: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}business_mode'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at']),
    );
  }

  @override
  $BusinessSettingsTable createAlias(String alias) {
    return $BusinessSettingsTable(attachedDatabase, alias);
  }
}

class BusinessSettingTable extends DataClass
    implements Insertable<BusinessSettingTable> {
  final int id;
  final String businessMode;
  final DateTime? updatedAt;
  const BusinessSettingTable(
      {required this.id, required this.businessMode, this.updatedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['business_mode'] = Variable<String>(businessMode);
    if (!nullToAbsent || updatedAt != null) {
      map['updated_at'] = Variable<DateTime>(updatedAt);
    }
    return map;
  }

  BusinessSettingsCompanion toCompanion(bool nullToAbsent) {
    return BusinessSettingsCompanion(
      id: Value(id),
      businessMode: Value(businessMode),
      updatedAt: updatedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(updatedAt),
    );
  }

  factory BusinessSettingTable.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return BusinessSettingTable(
      id: serializer.fromJson<int>(json['id']),
      businessMode: serializer.fromJson<String>(json['businessMode']),
      updatedAt: serializer.fromJson<DateTime?>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'businessMode': serializer.toJson<String>(businessMode),
      'updatedAt': serializer.toJson<DateTime?>(updatedAt),
    };
  }

  BusinessSettingTable copyWith(
          {int? id,
          String? businessMode,
          Value<DateTime?> updatedAt = const Value.absent()}) =>
      BusinessSettingTable(
        id: id ?? this.id,
        businessMode: businessMode ?? this.businessMode,
        updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
      );
  BusinessSettingTable copyWithCompanion(BusinessSettingsCompanion data) {
    return BusinessSettingTable(
      id: data.id.present ? data.id.value : this.id,
      businessMode: data.businessMode.present
          ? data.businessMode.value
          : this.businessMode,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('BusinessSettingTable(')
          ..write('id: $id, ')
          ..write('businessMode: $businessMode, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, businessMode, updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is BusinessSettingTable &&
          other.id == this.id &&
          other.businessMode == this.businessMode &&
          other.updatedAt == this.updatedAt);
}

class BusinessSettingsCompanion extends UpdateCompanion<BusinessSettingTable> {
  final Value<int> id;
  final Value<String> businessMode;
  final Value<DateTime?> updatedAt;
  const BusinessSettingsCompanion({
    this.id = const Value.absent(),
    this.businessMode = const Value.absent(),
    this.updatedAt = const Value.absent(),
  });
  BusinessSettingsCompanion.insert({
    this.id = const Value.absent(),
    this.businessMode = const Value.absent(),
    this.updatedAt = const Value.absent(),
  });
  static Insertable<BusinessSettingTable> custom({
    Expression<int>? id,
    Expression<String>? businessMode,
    Expression<DateTime>? updatedAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (businessMode != null) 'business_mode': businessMode,
      if (updatedAt != null) 'updated_at': updatedAt,
    });
  }

  BusinessSettingsCompanion copyWith(
      {Value<int>? id,
      Value<String>? businessMode,
      Value<DateTime?>? updatedAt}) {
    return BusinessSettingsCompanion(
      id: id ?? this.id,
      businessMode: businessMode ?? this.businessMode,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (businessMode.present) {
      map['business_mode'] = Variable<String>(businessMode.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('BusinessSettingsCompanion(')
          ..write('id: $id, ')
          ..write('businessMode: $businessMode, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }
}

class $TeachersTable extends Teachers with TableInfo<$TeachersTable, Teacher> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $TeachersTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _fullNameMeta =
      const VerificationMeta('fullName');
  @override
  late final GeneratedColumn<String> fullName = GeneratedColumn<String>(
      'full_name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _phoneMeta = const VerificationMeta('phone');
  @override
  late final GeneratedColumn<String> phone = GeneratedColumn<String>(
      'phone', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _professionMeta =
      const VerificationMeta('profession');
  @override
  late final GeneratedColumn<String> profession = GeneratedColumn<String>(
      'profession', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _classIdMeta =
      const VerificationMeta('classId');
  @override
  late final GeneratedColumn<int> classId = GeneratedColumn<int>(
      'class_id', aliasedName, true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('REFERENCES classes (id)'));
  static const VerificationMeta _salaryMeta = const VerificationMeta('salary');
  @override
  late final GeneratedColumn<double> salary = GeneratedColumn<double>(
      'salary', aliasedName, false,
      type: DriftSqlType.double,
      requiredDuringInsert: false,
      defaultValue: const Constant(0.0));
  static const VerificationMeta _yearsInSchoolMeta =
      const VerificationMeta('yearsInSchool');
  @override
  late final GeneratedColumn<int> yearsInSchool = GeneratedColumn<int>(
      'years_in_school', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _employmentDateMeta =
      const VerificationMeta('employmentDate');
  @override
  late final GeneratedColumn<DateTime> employmentDate =
      GeneratedColumn<DateTime>('employment_date', aliasedName, false,
          type: DriftSqlType.dateTime,
          requiredDuringInsert: false,
          defaultValue: currentDateAndTime);
  static const VerificationMeta _certificatesMeta =
      const VerificationMeta('certificates');
  @override
  late final GeneratedColumn<String> certificates = GeneratedColumn<String>(
      'certificates', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _imageMeta = const VerificationMeta('image');
  @override
  late final GeneratedColumn<Uint8List> image = GeneratedColumn<Uint8List>(
      'image', aliasedName, true,
      type: DriftSqlType.blob, requiredDuringInsert: false);
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
        fullName,
        phone,
        profession,
        classId,
        salary,
        yearsInSchool,
        employmentDate,
        certificates,
        image,
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
  static const String $name = 'teachers';
  @override
  VerificationContext validateIntegrity(Insertable<Teacher> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('full_name')) {
      context.handle(_fullNameMeta,
          fullName.isAcceptableOrUnknown(data['full_name']!, _fullNameMeta));
    } else if (isInserting) {
      context.missing(_fullNameMeta);
    }
    if (data.containsKey('phone')) {
      context.handle(
          _phoneMeta, phone.isAcceptableOrUnknown(data['phone']!, _phoneMeta));
    }
    if (data.containsKey('profession')) {
      context.handle(
          _professionMeta,
          profession.isAcceptableOrUnknown(
              data['profession']!, _professionMeta));
    }
    if (data.containsKey('class_id')) {
      context.handle(_classIdMeta,
          classId.isAcceptableOrUnknown(data['class_id']!, _classIdMeta));
    }
    if (data.containsKey('salary')) {
      context.handle(_salaryMeta,
          salary.isAcceptableOrUnknown(data['salary']!, _salaryMeta));
    }
    if (data.containsKey('years_in_school')) {
      context.handle(
          _yearsInSchoolMeta,
          yearsInSchool.isAcceptableOrUnknown(
              data['years_in_school']!, _yearsInSchoolMeta));
    }
    if (data.containsKey('employment_date')) {
      context.handle(
          _employmentDateMeta,
          employmentDate.isAcceptableOrUnknown(
              data['employment_date']!, _employmentDateMeta));
    }
    if (data.containsKey('certificates')) {
      context.handle(
          _certificatesMeta,
          certificates.isAcceptableOrUnknown(
              data['certificates']!, _certificatesMeta));
    }
    if (data.containsKey('image')) {
      context.handle(
          _imageMeta, image.isAcceptableOrUnknown(data['image']!, _imageMeta));
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
  Teacher map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Teacher(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      fullName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}full_name'])!,
      phone: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}phone']),
      profession: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}profession']),
      classId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}class_id']),
      salary: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}salary'])!,
      yearsInSchool: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}years_in_school'])!,
      employmentDate: attachedDatabase.typeMapping.read(
          DriftSqlType.dateTime, data['${effectivePrefix}employment_date'])!,
      certificates: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}certificates']),
      image: attachedDatabase.typeMapping
          .read(DriftSqlType.blob, data['${effectivePrefix}image']),
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
  $TeachersTable createAlias(String alias) {
    return $TeachersTable(attachedDatabase, alias);
  }
}

class Teacher extends DataClass implements Insertable<Teacher> {
  final int id;
  final String fullName;
  final String? phone;
  final String? profession;
  final int? classId;
  final double salary;
  final int yearsInSchool;
  final DateTime employmentDate;
  final String? certificates;
  final Uint8List? image;
  final String? syncId;
  final DateTime? updatedAt;
  final DateTime? createdAt;
  final String? deviceId;
  final bool isDeleted;
  const Teacher(
      {required this.id,
      required this.fullName,
      this.phone,
      this.profession,
      this.classId,
      required this.salary,
      required this.yearsInSchool,
      required this.employmentDate,
      this.certificates,
      this.image,
      this.syncId,
      this.updatedAt,
      this.createdAt,
      this.deviceId,
      required this.isDeleted});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['full_name'] = Variable<String>(fullName);
    if (!nullToAbsent || phone != null) {
      map['phone'] = Variable<String>(phone);
    }
    if (!nullToAbsent || profession != null) {
      map['profession'] = Variable<String>(profession);
    }
    if (!nullToAbsent || classId != null) {
      map['class_id'] = Variable<int>(classId);
    }
    map['salary'] = Variable<double>(salary);
    map['years_in_school'] = Variable<int>(yearsInSchool);
    map['employment_date'] = Variable<DateTime>(employmentDate);
    if (!nullToAbsent || certificates != null) {
      map['certificates'] = Variable<String>(certificates);
    }
    if (!nullToAbsent || image != null) {
      map['image'] = Variable<Uint8List>(image);
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

  TeachersCompanion toCompanion(bool nullToAbsent) {
    return TeachersCompanion(
      id: Value(id),
      fullName: Value(fullName),
      phone:
          phone == null && nullToAbsent ? const Value.absent() : Value(phone),
      profession: profession == null && nullToAbsent
          ? const Value.absent()
          : Value(profession),
      classId: classId == null && nullToAbsent
          ? const Value.absent()
          : Value(classId),
      salary: Value(salary),
      yearsInSchool: Value(yearsInSchool),
      employmentDate: Value(employmentDate),
      certificates: certificates == null && nullToAbsent
          ? const Value.absent()
          : Value(certificates),
      image:
          image == null && nullToAbsent ? const Value.absent() : Value(image),
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

  factory Teacher.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Teacher(
      id: serializer.fromJson<int>(json['id']),
      fullName: serializer.fromJson<String>(json['fullName']),
      phone: serializer.fromJson<String?>(json['phone']),
      profession: serializer.fromJson<String?>(json['profession']),
      classId: serializer.fromJson<int?>(json['classId']),
      salary: serializer.fromJson<double>(json['salary']),
      yearsInSchool: serializer.fromJson<int>(json['yearsInSchool']),
      employmentDate: serializer.fromJson<DateTime>(json['employmentDate']),
      certificates: serializer.fromJson<String?>(json['certificates']),
      image: serializer.fromJson<Uint8List?>(json['image']),
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
      'fullName': serializer.toJson<String>(fullName),
      'phone': serializer.toJson<String?>(phone),
      'profession': serializer.toJson<String?>(profession),
      'classId': serializer.toJson<int?>(classId),
      'salary': serializer.toJson<double>(salary),
      'yearsInSchool': serializer.toJson<int>(yearsInSchool),
      'employmentDate': serializer.toJson<DateTime>(employmentDate),
      'certificates': serializer.toJson<String?>(certificates),
      'image': serializer.toJson<Uint8List?>(image),
      'syncId': serializer.toJson<String?>(syncId),
      'updatedAt': serializer.toJson<DateTime?>(updatedAt),
      'createdAt': serializer.toJson<DateTime?>(createdAt),
      'deviceId': serializer.toJson<String?>(deviceId),
      'isDeleted': serializer.toJson<bool>(isDeleted),
    };
  }

  Teacher copyWith(
          {int? id,
          String? fullName,
          Value<String?> phone = const Value.absent(),
          Value<String?> profession = const Value.absent(),
          Value<int?> classId = const Value.absent(),
          double? salary,
          int? yearsInSchool,
          DateTime? employmentDate,
          Value<String?> certificates = const Value.absent(),
          Value<Uint8List?> image = const Value.absent(),
          Value<String?> syncId = const Value.absent(),
          Value<DateTime?> updatedAt = const Value.absent(),
          Value<DateTime?> createdAt = const Value.absent(),
          Value<String?> deviceId = const Value.absent(),
          bool? isDeleted}) =>
      Teacher(
        id: id ?? this.id,
        fullName: fullName ?? this.fullName,
        phone: phone.present ? phone.value : this.phone,
        profession: profession.present ? profession.value : this.profession,
        classId: classId.present ? classId.value : this.classId,
        salary: salary ?? this.salary,
        yearsInSchool: yearsInSchool ?? this.yearsInSchool,
        employmentDate: employmentDate ?? this.employmentDate,
        certificates:
            certificates.present ? certificates.value : this.certificates,
        image: image.present ? image.value : this.image,
        syncId: syncId.present ? syncId.value : this.syncId,
        updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
        createdAt: createdAt.present ? createdAt.value : this.createdAt,
        deviceId: deviceId.present ? deviceId.value : this.deviceId,
        isDeleted: isDeleted ?? this.isDeleted,
      );
  Teacher copyWithCompanion(TeachersCompanion data) {
    return Teacher(
      id: data.id.present ? data.id.value : this.id,
      fullName: data.fullName.present ? data.fullName.value : this.fullName,
      phone: data.phone.present ? data.phone.value : this.phone,
      profession:
          data.profession.present ? data.profession.value : this.profession,
      classId: data.classId.present ? data.classId.value : this.classId,
      salary: data.salary.present ? data.salary.value : this.salary,
      yearsInSchool: data.yearsInSchool.present
          ? data.yearsInSchool.value
          : this.yearsInSchool,
      employmentDate: data.employmentDate.present
          ? data.employmentDate.value
          : this.employmentDate,
      certificates: data.certificates.present
          ? data.certificates.value
          : this.certificates,
      image: data.image.present ? data.image.value : this.image,
      syncId: data.syncId.present ? data.syncId.value : this.syncId,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      deviceId: data.deviceId.present ? data.deviceId.value : this.deviceId,
      isDeleted: data.isDeleted.present ? data.isDeleted.value : this.isDeleted,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Teacher(')
          ..write('id: $id, ')
          ..write('fullName: $fullName, ')
          ..write('phone: $phone, ')
          ..write('profession: $profession, ')
          ..write('classId: $classId, ')
          ..write('salary: $salary, ')
          ..write('yearsInSchool: $yearsInSchool, ')
          ..write('employmentDate: $employmentDate, ')
          ..write('certificates: $certificates, ')
          ..write('image: $image, ')
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
      fullName,
      phone,
      profession,
      classId,
      salary,
      yearsInSchool,
      employmentDate,
      certificates,
      $driftBlobEquality.hash(image),
      syncId,
      updatedAt,
      createdAt,
      deviceId,
      isDeleted);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Teacher &&
          other.id == this.id &&
          other.fullName == this.fullName &&
          other.phone == this.phone &&
          other.profession == this.profession &&
          other.classId == this.classId &&
          other.salary == this.salary &&
          other.yearsInSchool == this.yearsInSchool &&
          other.employmentDate == this.employmentDate &&
          other.certificates == this.certificates &&
          $driftBlobEquality.equals(other.image, this.image) &&
          other.syncId == this.syncId &&
          other.updatedAt == this.updatedAt &&
          other.createdAt == this.createdAt &&
          other.deviceId == this.deviceId &&
          other.isDeleted == this.isDeleted);
}

class TeachersCompanion extends UpdateCompanion<Teacher> {
  final Value<int> id;
  final Value<String> fullName;
  final Value<String?> phone;
  final Value<String?> profession;
  final Value<int?> classId;
  final Value<double> salary;
  final Value<int> yearsInSchool;
  final Value<DateTime> employmentDate;
  final Value<String?> certificates;
  final Value<Uint8List?> image;
  final Value<String?> syncId;
  final Value<DateTime?> updatedAt;
  final Value<DateTime?> createdAt;
  final Value<String?> deviceId;
  final Value<bool> isDeleted;
  const TeachersCompanion({
    this.id = const Value.absent(),
    this.fullName = const Value.absent(),
    this.phone = const Value.absent(),
    this.profession = const Value.absent(),
    this.classId = const Value.absent(),
    this.salary = const Value.absent(),
    this.yearsInSchool = const Value.absent(),
    this.employmentDate = const Value.absent(),
    this.certificates = const Value.absent(),
    this.image = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  });
  TeachersCompanion.insert({
    this.id = const Value.absent(),
    required String fullName,
    this.phone = const Value.absent(),
    this.profession = const Value.absent(),
    this.classId = const Value.absent(),
    this.salary = const Value.absent(),
    this.yearsInSchool = const Value.absent(),
    this.employmentDate = const Value.absent(),
    this.certificates = const Value.absent(),
    this.image = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  }) : fullName = Value(fullName);
  static Insertable<Teacher> custom({
    Expression<int>? id,
    Expression<String>? fullName,
    Expression<String>? phone,
    Expression<String>? profession,
    Expression<int>? classId,
    Expression<double>? salary,
    Expression<int>? yearsInSchool,
    Expression<DateTime>? employmentDate,
    Expression<String>? certificates,
    Expression<Uint8List>? image,
    Expression<String>? syncId,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? createdAt,
    Expression<String>? deviceId,
    Expression<bool>? isDeleted,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (fullName != null) 'full_name': fullName,
      if (phone != null) 'phone': phone,
      if (profession != null) 'profession': profession,
      if (classId != null) 'class_id': classId,
      if (salary != null) 'salary': salary,
      if (yearsInSchool != null) 'years_in_school': yearsInSchool,
      if (employmentDate != null) 'employment_date': employmentDate,
      if (certificates != null) 'certificates': certificates,
      if (image != null) 'image': image,
      if (syncId != null) 'sync_id': syncId,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (createdAt != null) 'created_at': createdAt,
      if (deviceId != null) 'device_id': deviceId,
      if (isDeleted != null) 'is_deleted': isDeleted,
    });
  }

  TeachersCompanion copyWith(
      {Value<int>? id,
      Value<String>? fullName,
      Value<String?>? phone,
      Value<String?>? profession,
      Value<int?>? classId,
      Value<double>? salary,
      Value<int>? yearsInSchool,
      Value<DateTime>? employmentDate,
      Value<String?>? certificates,
      Value<Uint8List?>? image,
      Value<String?>? syncId,
      Value<DateTime?>? updatedAt,
      Value<DateTime?>? createdAt,
      Value<String?>? deviceId,
      Value<bool>? isDeleted}) {
    return TeachersCompanion(
      id: id ?? this.id,
      fullName: fullName ?? this.fullName,
      phone: phone ?? this.phone,
      profession: profession ?? this.profession,
      classId: classId ?? this.classId,
      salary: salary ?? this.salary,
      yearsInSchool: yearsInSchool ?? this.yearsInSchool,
      employmentDate: employmentDate ?? this.employmentDate,
      certificates: certificates ?? this.certificates,
      image: image ?? this.image,
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
    if (fullName.present) {
      map['full_name'] = Variable<String>(fullName.value);
    }
    if (phone.present) {
      map['phone'] = Variable<String>(phone.value);
    }
    if (profession.present) {
      map['profession'] = Variable<String>(profession.value);
    }
    if (classId.present) {
      map['class_id'] = Variable<int>(classId.value);
    }
    if (salary.present) {
      map['salary'] = Variable<double>(salary.value);
    }
    if (yearsInSchool.present) {
      map['years_in_school'] = Variable<int>(yearsInSchool.value);
    }
    if (employmentDate.present) {
      map['employment_date'] = Variable<DateTime>(employmentDate.value);
    }
    if (certificates.present) {
      map['certificates'] = Variable<String>(certificates.value);
    }
    if (image.present) {
      map['image'] = Variable<Uint8List>(image.value);
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
    return (StringBuffer('TeachersCompanion(')
          ..write('id: $id, ')
          ..write('fullName: $fullName, ')
          ..write('phone: $phone, ')
          ..write('profession: $profession, ')
          ..write('classId: $classId, ')
          ..write('salary: $salary, ')
          ..write('yearsInSchool: $yearsInSchool, ')
          ..write('employmentDate: $employmentDate, ')
          ..write('certificates: $certificates, ')
          ..write('image: $image, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted')
          ..write(')'))
        .toString();
  }
}

class $SubjectsTable extends Subjects
    with TableInfo<$SubjectsTable, SubjectTable> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SubjectsTable(this.attachedDatabase, [this._alias]);
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
      type: DriftSqlType.string,
      requiredDuringInsert: true,
      defaultConstraints: GeneratedColumn.constraintIsAlways('UNIQUE'));
  static const VerificationMeta _codeMeta = const VerificationMeta('code');
  @override
  late final GeneratedColumn<String> code = GeneratedColumn<String>(
      'code', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _teacherIdMeta =
      const VerificationMeta('teacherId');
  @override
  late final GeneratedColumn<int> teacherId = GeneratedColumn<int>(
      'teacher_id', aliasedName, true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('REFERENCES teachers (id)'));
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
        code,
        teacherId,
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
  static const String $name = 'subjects';
  @override
  VerificationContext validateIntegrity(Insertable<SubjectTable> instance,
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
    if (data.containsKey('code')) {
      context.handle(
          _codeMeta, code.isAcceptableOrUnknown(data['code']!, _codeMeta));
    }
    if (data.containsKey('teacher_id')) {
      context.handle(_teacherIdMeta,
          teacherId.isAcceptableOrUnknown(data['teacher_id']!, _teacherIdMeta));
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
  SubjectTable map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return SubjectTable(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      name: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}name'])!,
      code: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}code']),
      teacherId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}teacher_id']),
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
  $SubjectsTable createAlias(String alias) {
    return $SubjectsTable(attachedDatabase, alias);
  }
}

class SubjectTable extends DataClass implements Insertable<SubjectTable> {
  final int id;
  final String name;
  final String? code;
  final int? teacherId;
  final String? syncId;
  final DateTime? updatedAt;
  final DateTime? createdAt;
  final String? deviceId;
  final bool isDeleted;
  const SubjectTable(
      {required this.id,
      required this.name,
      this.code,
      this.teacherId,
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
    if (!nullToAbsent || code != null) {
      map['code'] = Variable<String>(code);
    }
    if (!nullToAbsent || teacherId != null) {
      map['teacher_id'] = Variable<int>(teacherId);
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

  SubjectsCompanion toCompanion(bool nullToAbsent) {
    return SubjectsCompanion(
      id: Value(id),
      name: Value(name),
      code: code == null && nullToAbsent ? const Value.absent() : Value(code),
      teacherId: teacherId == null && nullToAbsent
          ? const Value.absent()
          : Value(teacherId),
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

  factory SubjectTable.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return SubjectTable(
      id: serializer.fromJson<int>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      code: serializer.fromJson<String?>(json['code']),
      teacherId: serializer.fromJson<int?>(json['teacherId']),
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
      'code': serializer.toJson<String?>(code),
      'teacherId': serializer.toJson<int?>(teacherId),
      'syncId': serializer.toJson<String?>(syncId),
      'updatedAt': serializer.toJson<DateTime?>(updatedAt),
      'createdAt': serializer.toJson<DateTime?>(createdAt),
      'deviceId': serializer.toJson<String?>(deviceId),
      'isDeleted': serializer.toJson<bool>(isDeleted),
    };
  }

  SubjectTable copyWith(
          {int? id,
          String? name,
          Value<String?> code = const Value.absent(),
          Value<int?> teacherId = const Value.absent(),
          Value<String?> syncId = const Value.absent(),
          Value<DateTime?> updatedAt = const Value.absent(),
          Value<DateTime?> createdAt = const Value.absent(),
          Value<String?> deviceId = const Value.absent(),
          bool? isDeleted}) =>
      SubjectTable(
        id: id ?? this.id,
        name: name ?? this.name,
        code: code.present ? code.value : this.code,
        teacherId: teacherId.present ? teacherId.value : this.teacherId,
        syncId: syncId.present ? syncId.value : this.syncId,
        updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
        createdAt: createdAt.present ? createdAt.value : this.createdAt,
        deviceId: deviceId.present ? deviceId.value : this.deviceId,
        isDeleted: isDeleted ?? this.isDeleted,
      );
  SubjectTable copyWithCompanion(SubjectsCompanion data) {
    return SubjectTable(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      code: data.code.present ? data.code.value : this.code,
      teacherId: data.teacherId.present ? data.teacherId.value : this.teacherId,
      syncId: data.syncId.present ? data.syncId.value : this.syncId,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      deviceId: data.deviceId.present ? data.deviceId.value : this.deviceId,
      isDeleted: data.isDeleted.present ? data.isDeleted.value : this.isDeleted,
    );
  }

  @override
  String toString() {
    return (StringBuffer('SubjectTable(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('code: $code, ')
          ..write('teacherId: $teacherId, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, name, code, teacherId, syncId, updatedAt,
      createdAt, deviceId, isDeleted);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is SubjectTable &&
          other.id == this.id &&
          other.name == this.name &&
          other.code == this.code &&
          other.teacherId == this.teacherId &&
          other.syncId == this.syncId &&
          other.updatedAt == this.updatedAt &&
          other.createdAt == this.createdAt &&
          other.deviceId == this.deviceId &&
          other.isDeleted == this.isDeleted);
}

class SubjectsCompanion extends UpdateCompanion<SubjectTable> {
  final Value<int> id;
  final Value<String> name;
  final Value<String?> code;
  final Value<int?> teacherId;
  final Value<String?> syncId;
  final Value<DateTime?> updatedAt;
  final Value<DateTime?> createdAt;
  final Value<String?> deviceId;
  final Value<bool> isDeleted;
  const SubjectsCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.code = const Value.absent(),
    this.teacherId = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  });
  SubjectsCompanion.insert({
    this.id = const Value.absent(),
    required String name,
    this.code = const Value.absent(),
    this.teacherId = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  }) : name = Value(name);
  static Insertable<SubjectTable> custom({
    Expression<int>? id,
    Expression<String>? name,
    Expression<String>? code,
    Expression<int>? teacherId,
    Expression<String>? syncId,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? createdAt,
    Expression<String>? deviceId,
    Expression<bool>? isDeleted,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (code != null) 'code': code,
      if (teacherId != null) 'teacher_id': teacherId,
      if (syncId != null) 'sync_id': syncId,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (createdAt != null) 'created_at': createdAt,
      if (deviceId != null) 'device_id': deviceId,
      if (isDeleted != null) 'is_deleted': isDeleted,
    });
  }

  SubjectsCompanion copyWith(
      {Value<int>? id,
      Value<String>? name,
      Value<String?>? code,
      Value<int?>? teacherId,
      Value<String?>? syncId,
      Value<DateTime?>? updatedAt,
      Value<DateTime?>? createdAt,
      Value<String?>? deviceId,
      Value<bool>? isDeleted}) {
    return SubjectsCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      code: code ?? this.code,
      teacherId: teacherId ?? this.teacherId,
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
    if (code.present) {
      map['code'] = Variable<String>(code.value);
    }
    if (teacherId.present) {
      map['teacher_id'] = Variable<int>(teacherId.value);
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
    return (StringBuffer('SubjectsCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('code: $code, ')
          ..write('teacherId: $teacherId, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted')
          ..write(')'))
        .toString();
  }
}

class $ResultsTable extends Results with TableInfo<$ResultsTable, ResultTable> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ResultsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _studentIdMeta =
      const VerificationMeta('studentId');
  @override
  late final GeneratedColumn<int> studentId = GeneratedColumn<int>(
      'student_id', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: true,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('REFERENCES students (id)'));
  static const VerificationMeta _subjectIdMeta =
      const VerificationMeta('subjectId');
  @override
  late final GeneratedColumn<int> subjectId = GeneratedColumn<int>(
      'subject_id', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: true,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('REFERENCES subjects (id)'));
  static const VerificationMeta _termIdMeta = const VerificationMeta('termId');
  @override
  late final GeneratedColumn<int> termId = GeneratedColumn<int>(
      'term_id', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: true,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('REFERENCES terms (id)'));
  static const VerificationMeta _academicYearIdMeta =
      const VerificationMeta('academicYearId');
  @override
  late final GeneratedColumn<int> academicYearId = GeneratedColumn<int>(
      'academic_year_id', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: true,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('REFERENCES academic_years (id)'));
  static const VerificationMeta _assessmentScoreMeta =
      const VerificationMeta('assessmentScore');
  @override
  late final GeneratedColumn<double> assessmentScore = GeneratedColumn<double>(
      'assessment_score', aliasedName, false,
      type: DriftSqlType.double,
      requiredDuringInsert: false,
      defaultValue: const Constant(0.0));
  static const VerificationMeta _examScoreMeta =
      const VerificationMeta('examScore');
  @override
  late final GeneratedColumn<double> examScore = GeneratedColumn<double>(
      'exam_score', aliasedName, false,
      type: DriftSqlType.double,
      requiredDuringInsert: false,
      defaultValue: const Constant(0.0));
  static const VerificationMeta _totalScoreMeta =
      const VerificationMeta('totalScore');
  @override
  late final GeneratedColumn<double> totalScore = GeneratedColumn<double>(
      'total_score', aliasedName, false,
      type: DriftSqlType.double,
      requiredDuringInsert: false,
      defaultValue: const Constant(0.0));
  static const VerificationMeta _gradeMeta = const VerificationMeta('grade');
  @override
  late final GeneratedColumn<String> grade = GeneratedColumn<String>(
      'grade', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _remarksMeta =
      const VerificationMeta('remarks');
  @override
  late final GeneratedColumn<String> remarks = GeneratedColumn<String>(
      'remarks', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _dateEnteredMeta =
      const VerificationMeta('dateEntered');
  @override
  late final GeneratedColumn<DateTime> dateEntered = GeneratedColumn<DateTime>(
      'date_entered', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
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
        studentId,
        subjectId,
        termId,
        academicYearId,
        assessmentScore,
        examScore,
        totalScore,
        grade,
        remarks,
        dateEntered,
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
  static const String $name = 'results';
  @override
  VerificationContext validateIntegrity(Insertable<ResultTable> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('student_id')) {
      context.handle(_studentIdMeta,
          studentId.isAcceptableOrUnknown(data['student_id']!, _studentIdMeta));
    } else if (isInserting) {
      context.missing(_studentIdMeta);
    }
    if (data.containsKey('subject_id')) {
      context.handle(_subjectIdMeta,
          subjectId.isAcceptableOrUnknown(data['subject_id']!, _subjectIdMeta));
    } else if (isInserting) {
      context.missing(_subjectIdMeta);
    }
    if (data.containsKey('term_id')) {
      context.handle(_termIdMeta,
          termId.isAcceptableOrUnknown(data['term_id']!, _termIdMeta));
    } else if (isInserting) {
      context.missing(_termIdMeta);
    }
    if (data.containsKey('academic_year_id')) {
      context.handle(
          _academicYearIdMeta,
          academicYearId.isAcceptableOrUnknown(
              data['academic_year_id']!, _academicYearIdMeta));
    } else if (isInserting) {
      context.missing(_academicYearIdMeta);
    }
    if (data.containsKey('assessment_score')) {
      context.handle(
          _assessmentScoreMeta,
          assessmentScore.isAcceptableOrUnknown(
              data['assessment_score']!, _assessmentScoreMeta));
    }
    if (data.containsKey('exam_score')) {
      context.handle(_examScoreMeta,
          examScore.isAcceptableOrUnknown(data['exam_score']!, _examScoreMeta));
    }
    if (data.containsKey('total_score')) {
      context.handle(
          _totalScoreMeta,
          totalScore.isAcceptableOrUnknown(
              data['total_score']!, _totalScoreMeta));
    }
    if (data.containsKey('grade')) {
      context.handle(
          _gradeMeta, grade.isAcceptableOrUnknown(data['grade']!, _gradeMeta));
    }
    if (data.containsKey('remarks')) {
      context.handle(_remarksMeta,
          remarks.isAcceptableOrUnknown(data['remarks']!, _remarksMeta));
    }
    if (data.containsKey('date_entered')) {
      context.handle(
          _dateEnteredMeta,
          dateEntered.isAcceptableOrUnknown(
              data['date_entered']!, _dateEnteredMeta));
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
  List<Set<GeneratedColumn>> get uniqueKeys => [
        {studentId, subjectId, termId, academicYearId},
      ];
  @override
  ResultTable map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return ResultTable(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      studentId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}student_id'])!,
      subjectId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}subject_id'])!,
      termId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}term_id'])!,
      academicYearId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}academic_year_id'])!,
      assessmentScore: attachedDatabase.typeMapping.read(
          DriftSqlType.double, data['${effectivePrefix}assessment_score'])!,
      examScore: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}exam_score'])!,
      totalScore: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}total_score'])!,
      grade: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}grade']),
      remarks: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}remarks']),
      dateEntered: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}date_entered'])!,
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
  $ResultsTable createAlias(String alias) {
    return $ResultsTable(attachedDatabase, alias);
  }
}

class ResultTable extends DataClass implements Insertable<ResultTable> {
  final int id;
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
  final String? syncId;
  final DateTime? updatedAt;
  final DateTime? createdAt;
  final String? deviceId;
  final bool isDeleted;
  const ResultTable(
      {required this.id,
      required this.studentId,
      required this.subjectId,
      required this.termId,
      required this.academicYearId,
      required this.assessmentScore,
      required this.examScore,
      required this.totalScore,
      this.grade,
      this.remarks,
      required this.dateEntered,
      this.syncId,
      this.updatedAt,
      this.createdAt,
      this.deviceId,
      required this.isDeleted});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['student_id'] = Variable<int>(studentId);
    map['subject_id'] = Variable<int>(subjectId);
    map['term_id'] = Variable<int>(termId);
    map['academic_year_id'] = Variable<int>(academicYearId);
    map['assessment_score'] = Variable<double>(assessmentScore);
    map['exam_score'] = Variable<double>(examScore);
    map['total_score'] = Variable<double>(totalScore);
    if (!nullToAbsent || grade != null) {
      map['grade'] = Variable<String>(grade);
    }
    if (!nullToAbsent || remarks != null) {
      map['remarks'] = Variable<String>(remarks);
    }
    map['date_entered'] = Variable<DateTime>(dateEntered);
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

  ResultsCompanion toCompanion(bool nullToAbsent) {
    return ResultsCompanion(
      id: Value(id),
      studentId: Value(studentId),
      subjectId: Value(subjectId),
      termId: Value(termId),
      academicYearId: Value(academicYearId),
      assessmentScore: Value(assessmentScore),
      examScore: Value(examScore),
      totalScore: Value(totalScore),
      grade:
          grade == null && nullToAbsent ? const Value.absent() : Value(grade),
      remarks: remarks == null && nullToAbsent
          ? const Value.absent()
          : Value(remarks),
      dateEntered: Value(dateEntered),
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

  factory ResultTable.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return ResultTable(
      id: serializer.fromJson<int>(json['id']),
      studentId: serializer.fromJson<int>(json['studentId']),
      subjectId: serializer.fromJson<int>(json['subjectId']),
      termId: serializer.fromJson<int>(json['termId']),
      academicYearId: serializer.fromJson<int>(json['academicYearId']),
      assessmentScore: serializer.fromJson<double>(json['assessmentScore']),
      examScore: serializer.fromJson<double>(json['examScore']),
      totalScore: serializer.fromJson<double>(json['totalScore']),
      grade: serializer.fromJson<String?>(json['grade']),
      remarks: serializer.fromJson<String?>(json['remarks']),
      dateEntered: serializer.fromJson<DateTime>(json['dateEntered']),
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
      'studentId': serializer.toJson<int>(studentId),
      'subjectId': serializer.toJson<int>(subjectId),
      'termId': serializer.toJson<int>(termId),
      'academicYearId': serializer.toJson<int>(academicYearId),
      'assessmentScore': serializer.toJson<double>(assessmentScore),
      'examScore': serializer.toJson<double>(examScore),
      'totalScore': serializer.toJson<double>(totalScore),
      'grade': serializer.toJson<String?>(grade),
      'remarks': serializer.toJson<String?>(remarks),
      'dateEntered': serializer.toJson<DateTime>(dateEntered),
      'syncId': serializer.toJson<String?>(syncId),
      'updatedAt': serializer.toJson<DateTime?>(updatedAt),
      'createdAt': serializer.toJson<DateTime?>(createdAt),
      'deviceId': serializer.toJson<String?>(deviceId),
      'isDeleted': serializer.toJson<bool>(isDeleted),
    };
  }

  ResultTable copyWith(
          {int? id,
          int? studentId,
          int? subjectId,
          int? termId,
          int? academicYearId,
          double? assessmentScore,
          double? examScore,
          double? totalScore,
          Value<String?> grade = const Value.absent(),
          Value<String?> remarks = const Value.absent(),
          DateTime? dateEntered,
          Value<String?> syncId = const Value.absent(),
          Value<DateTime?> updatedAt = const Value.absent(),
          Value<DateTime?> createdAt = const Value.absent(),
          Value<String?> deviceId = const Value.absent(),
          bool? isDeleted}) =>
      ResultTable(
        id: id ?? this.id,
        studentId: studentId ?? this.studentId,
        subjectId: subjectId ?? this.subjectId,
        termId: termId ?? this.termId,
        academicYearId: academicYearId ?? this.academicYearId,
        assessmentScore: assessmentScore ?? this.assessmentScore,
        examScore: examScore ?? this.examScore,
        totalScore: totalScore ?? this.totalScore,
        grade: grade.present ? grade.value : this.grade,
        remarks: remarks.present ? remarks.value : this.remarks,
        dateEntered: dateEntered ?? this.dateEntered,
        syncId: syncId.present ? syncId.value : this.syncId,
        updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
        createdAt: createdAt.present ? createdAt.value : this.createdAt,
        deviceId: deviceId.present ? deviceId.value : this.deviceId,
        isDeleted: isDeleted ?? this.isDeleted,
      );
  ResultTable copyWithCompanion(ResultsCompanion data) {
    return ResultTable(
      id: data.id.present ? data.id.value : this.id,
      studentId: data.studentId.present ? data.studentId.value : this.studentId,
      subjectId: data.subjectId.present ? data.subjectId.value : this.subjectId,
      termId: data.termId.present ? data.termId.value : this.termId,
      academicYearId: data.academicYearId.present
          ? data.academicYearId.value
          : this.academicYearId,
      assessmentScore: data.assessmentScore.present
          ? data.assessmentScore.value
          : this.assessmentScore,
      examScore: data.examScore.present ? data.examScore.value : this.examScore,
      totalScore:
          data.totalScore.present ? data.totalScore.value : this.totalScore,
      grade: data.grade.present ? data.grade.value : this.grade,
      remarks: data.remarks.present ? data.remarks.value : this.remarks,
      dateEntered:
          data.dateEntered.present ? data.dateEntered.value : this.dateEntered,
      syncId: data.syncId.present ? data.syncId.value : this.syncId,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      deviceId: data.deviceId.present ? data.deviceId.value : this.deviceId,
      isDeleted: data.isDeleted.present ? data.isDeleted.value : this.isDeleted,
    );
  }

  @override
  String toString() {
    return (StringBuffer('ResultTable(')
          ..write('id: $id, ')
          ..write('studentId: $studentId, ')
          ..write('subjectId: $subjectId, ')
          ..write('termId: $termId, ')
          ..write('academicYearId: $academicYearId, ')
          ..write('assessmentScore: $assessmentScore, ')
          ..write('examScore: $examScore, ')
          ..write('totalScore: $totalScore, ')
          ..write('grade: $grade, ')
          ..write('remarks: $remarks, ')
          ..write('dateEntered: $dateEntered, ')
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
      studentId,
      subjectId,
      termId,
      academicYearId,
      assessmentScore,
      examScore,
      totalScore,
      grade,
      remarks,
      dateEntered,
      syncId,
      updatedAt,
      createdAt,
      deviceId,
      isDeleted);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ResultTable &&
          other.id == this.id &&
          other.studentId == this.studentId &&
          other.subjectId == this.subjectId &&
          other.termId == this.termId &&
          other.academicYearId == this.academicYearId &&
          other.assessmentScore == this.assessmentScore &&
          other.examScore == this.examScore &&
          other.totalScore == this.totalScore &&
          other.grade == this.grade &&
          other.remarks == this.remarks &&
          other.dateEntered == this.dateEntered &&
          other.syncId == this.syncId &&
          other.updatedAt == this.updatedAt &&
          other.createdAt == this.createdAt &&
          other.deviceId == this.deviceId &&
          other.isDeleted == this.isDeleted);
}

class ResultsCompanion extends UpdateCompanion<ResultTable> {
  final Value<int> id;
  final Value<int> studentId;
  final Value<int> subjectId;
  final Value<int> termId;
  final Value<int> academicYearId;
  final Value<double> assessmentScore;
  final Value<double> examScore;
  final Value<double> totalScore;
  final Value<String?> grade;
  final Value<String?> remarks;
  final Value<DateTime> dateEntered;
  final Value<String?> syncId;
  final Value<DateTime?> updatedAt;
  final Value<DateTime?> createdAt;
  final Value<String?> deviceId;
  final Value<bool> isDeleted;
  const ResultsCompanion({
    this.id = const Value.absent(),
    this.studentId = const Value.absent(),
    this.subjectId = const Value.absent(),
    this.termId = const Value.absent(),
    this.academicYearId = const Value.absent(),
    this.assessmentScore = const Value.absent(),
    this.examScore = const Value.absent(),
    this.totalScore = const Value.absent(),
    this.grade = const Value.absent(),
    this.remarks = const Value.absent(),
    this.dateEntered = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  });
  ResultsCompanion.insert({
    this.id = const Value.absent(),
    required int studentId,
    required int subjectId,
    required int termId,
    required int academicYearId,
    this.assessmentScore = const Value.absent(),
    this.examScore = const Value.absent(),
    this.totalScore = const Value.absent(),
    this.grade = const Value.absent(),
    this.remarks = const Value.absent(),
    this.dateEntered = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  })  : studentId = Value(studentId),
        subjectId = Value(subjectId),
        termId = Value(termId),
        academicYearId = Value(academicYearId);
  static Insertable<ResultTable> custom({
    Expression<int>? id,
    Expression<int>? studentId,
    Expression<int>? subjectId,
    Expression<int>? termId,
    Expression<int>? academicYearId,
    Expression<double>? assessmentScore,
    Expression<double>? examScore,
    Expression<double>? totalScore,
    Expression<String>? grade,
    Expression<String>? remarks,
    Expression<DateTime>? dateEntered,
    Expression<String>? syncId,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? createdAt,
    Expression<String>? deviceId,
    Expression<bool>? isDeleted,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (studentId != null) 'student_id': studentId,
      if (subjectId != null) 'subject_id': subjectId,
      if (termId != null) 'term_id': termId,
      if (academicYearId != null) 'academic_year_id': academicYearId,
      if (assessmentScore != null) 'assessment_score': assessmentScore,
      if (examScore != null) 'exam_score': examScore,
      if (totalScore != null) 'total_score': totalScore,
      if (grade != null) 'grade': grade,
      if (remarks != null) 'remarks': remarks,
      if (dateEntered != null) 'date_entered': dateEntered,
      if (syncId != null) 'sync_id': syncId,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (createdAt != null) 'created_at': createdAt,
      if (deviceId != null) 'device_id': deviceId,
      if (isDeleted != null) 'is_deleted': isDeleted,
    });
  }

  ResultsCompanion copyWith(
      {Value<int>? id,
      Value<int>? studentId,
      Value<int>? subjectId,
      Value<int>? termId,
      Value<int>? academicYearId,
      Value<double>? assessmentScore,
      Value<double>? examScore,
      Value<double>? totalScore,
      Value<String?>? grade,
      Value<String?>? remarks,
      Value<DateTime>? dateEntered,
      Value<String?>? syncId,
      Value<DateTime?>? updatedAt,
      Value<DateTime?>? createdAt,
      Value<String?>? deviceId,
      Value<bool>? isDeleted}) {
    return ResultsCompanion(
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
    if (studentId.present) {
      map['student_id'] = Variable<int>(studentId.value);
    }
    if (subjectId.present) {
      map['subject_id'] = Variable<int>(subjectId.value);
    }
    if (termId.present) {
      map['term_id'] = Variable<int>(termId.value);
    }
    if (academicYearId.present) {
      map['academic_year_id'] = Variable<int>(academicYearId.value);
    }
    if (assessmentScore.present) {
      map['assessment_score'] = Variable<double>(assessmentScore.value);
    }
    if (examScore.present) {
      map['exam_score'] = Variable<double>(examScore.value);
    }
    if (totalScore.present) {
      map['total_score'] = Variable<double>(totalScore.value);
    }
    if (grade.present) {
      map['grade'] = Variable<String>(grade.value);
    }
    if (remarks.present) {
      map['remarks'] = Variable<String>(remarks.value);
    }
    if (dateEntered.present) {
      map['date_entered'] = Variable<DateTime>(dateEntered.value);
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
    return (StringBuffer('ResultsCompanion(')
          ..write('id: $id, ')
          ..write('studentId: $studentId, ')
          ..write('subjectId: $subjectId, ')
          ..write('termId: $termId, ')
          ..write('academicYearId: $academicYearId, ')
          ..write('assessmentScore: $assessmentScore, ')
          ..write('examScore: $examScore, ')
          ..write('totalScore: $totalScore, ')
          ..write('grade: $grade, ')
          ..write('remarks: $remarks, ')
          ..write('dateEntered: $dateEntered, ')
          ..write('syncId: $syncId, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('deviceId: $deviceId, ')
          ..write('isDeleted: $isDeleted')
          ..write(')'))
        .toString();
  }
}

class $GradingRulesTable extends GradingRules
    with TableInfo<$GradingRulesTable, GradingRuleTable> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $GradingRulesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _minScoreMeta =
      const VerificationMeta('minScore');
  @override
  late final GeneratedColumn<double> minScore = GeneratedColumn<double>(
      'min_score', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _maxScoreMeta =
      const VerificationMeta('maxScore');
  @override
  late final GeneratedColumn<double> maxScore = GeneratedColumn<double>(
      'max_score', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _gradeMeta = const VerificationMeta('grade');
  @override
  late final GeneratedColumn<String> grade = GeneratedColumn<String>(
      'grade', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
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
        minScore,
        maxScore,
        grade,
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
  static const String $name = 'grading_rules';
  @override
  VerificationContext validateIntegrity(Insertable<GradingRuleTable> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('min_score')) {
      context.handle(_minScoreMeta,
          minScore.isAcceptableOrUnknown(data['min_score']!, _minScoreMeta));
    } else if (isInserting) {
      context.missing(_minScoreMeta);
    }
    if (data.containsKey('max_score')) {
      context.handle(_maxScoreMeta,
          maxScore.isAcceptableOrUnknown(data['max_score']!, _maxScoreMeta));
    } else if (isInserting) {
      context.missing(_maxScoreMeta);
    }
    if (data.containsKey('grade')) {
      context.handle(
          _gradeMeta, grade.isAcceptableOrUnknown(data['grade']!, _gradeMeta));
    } else if (isInserting) {
      context.missing(_gradeMeta);
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
  GradingRuleTable map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return GradingRuleTable(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      minScore: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}min_score'])!,
      maxScore: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}max_score'])!,
      grade: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}grade'])!,
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
  $GradingRulesTable createAlias(String alias) {
    return $GradingRulesTable(attachedDatabase, alias);
  }
}

class GradingRuleTable extends DataClass
    implements Insertable<GradingRuleTable> {
  final int id;
  final double minScore;
  final double maxScore;
  final String grade;
  final String? remarks;
  final String? syncId;
  final DateTime? updatedAt;
  final DateTime? createdAt;
  final String? deviceId;
  final bool isDeleted;
  const GradingRuleTable(
      {required this.id,
      required this.minScore,
      required this.maxScore,
      required this.grade,
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
    map['min_score'] = Variable<double>(minScore);
    map['max_score'] = Variable<double>(maxScore);
    map['grade'] = Variable<String>(grade);
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

  GradingRulesCompanion toCompanion(bool nullToAbsent) {
    return GradingRulesCompanion(
      id: Value(id),
      minScore: Value(minScore),
      maxScore: Value(maxScore),
      grade: Value(grade),
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

  factory GradingRuleTable.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return GradingRuleTable(
      id: serializer.fromJson<int>(json['id']),
      minScore: serializer.fromJson<double>(json['minScore']),
      maxScore: serializer.fromJson<double>(json['maxScore']),
      grade: serializer.fromJson<String>(json['grade']),
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
      'minScore': serializer.toJson<double>(minScore),
      'maxScore': serializer.toJson<double>(maxScore),
      'grade': serializer.toJson<String>(grade),
      'remarks': serializer.toJson<String?>(remarks),
      'syncId': serializer.toJson<String?>(syncId),
      'updatedAt': serializer.toJson<DateTime?>(updatedAt),
      'createdAt': serializer.toJson<DateTime?>(createdAt),
      'deviceId': serializer.toJson<String?>(deviceId),
      'isDeleted': serializer.toJson<bool>(isDeleted),
    };
  }

  GradingRuleTable copyWith(
          {int? id,
          double? minScore,
          double? maxScore,
          String? grade,
          Value<String?> remarks = const Value.absent(),
          Value<String?> syncId = const Value.absent(),
          Value<DateTime?> updatedAt = const Value.absent(),
          Value<DateTime?> createdAt = const Value.absent(),
          Value<String?> deviceId = const Value.absent(),
          bool? isDeleted}) =>
      GradingRuleTable(
        id: id ?? this.id,
        minScore: minScore ?? this.minScore,
        maxScore: maxScore ?? this.maxScore,
        grade: grade ?? this.grade,
        remarks: remarks.present ? remarks.value : this.remarks,
        syncId: syncId.present ? syncId.value : this.syncId,
        updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
        createdAt: createdAt.present ? createdAt.value : this.createdAt,
        deviceId: deviceId.present ? deviceId.value : this.deviceId,
        isDeleted: isDeleted ?? this.isDeleted,
      );
  GradingRuleTable copyWithCompanion(GradingRulesCompanion data) {
    return GradingRuleTable(
      id: data.id.present ? data.id.value : this.id,
      minScore: data.minScore.present ? data.minScore.value : this.minScore,
      maxScore: data.maxScore.present ? data.maxScore.value : this.maxScore,
      grade: data.grade.present ? data.grade.value : this.grade,
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
    return (StringBuffer('GradingRuleTable(')
          ..write('id: $id, ')
          ..write('minScore: $minScore, ')
          ..write('maxScore: $maxScore, ')
          ..write('grade: $grade, ')
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
  int get hashCode => Object.hash(id, minScore, maxScore, grade, remarks,
      syncId, updatedAt, createdAt, deviceId, isDeleted);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GradingRuleTable &&
          other.id == this.id &&
          other.minScore == this.minScore &&
          other.maxScore == this.maxScore &&
          other.grade == this.grade &&
          other.remarks == this.remarks &&
          other.syncId == this.syncId &&
          other.updatedAt == this.updatedAt &&
          other.createdAt == this.createdAt &&
          other.deviceId == this.deviceId &&
          other.isDeleted == this.isDeleted);
}

class GradingRulesCompanion extends UpdateCompanion<GradingRuleTable> {
  final Value<int> id;
  final Value<double> minScore;
  final Value<double> maxScore;
  final Value<String> grade;
  final Value<String?> remarks;
  final Value<String?> syncId;
  final Value<DateTime?> updatedAt;
  final Value<DateTime?> createdAt;
  final Value<String?> deviceId;
  final Value<bool> isDeleted;
  const GradingRulesCompanion({
    this.id = const Value.absent(),
    this.minScore = const Value.absent(),
    this.maxScore = const Value.absent(),
    this.grade = const Value.absent(),
    this.remarks = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  });
  GradingRulesCompanion.insert({
    this.id = const Value.absent(),
    required double minScore,
    required double maxScore,
    required String grade,
    this.remarks = const Value.absent(),
    this.syncId = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.isDeleted = const Value.absent(),
  })  : minScore = Value(minScore),
        maxScore = Value(maxScore),
        grade = Value(grade);
  static Insertable<GradingRuleTable> custom({
    Expression<int>? id,
    Expression<double>? minScore,
    Expression<double>? maxScore,
    Expression<String>? grade,
    Expression<String>? remarks,
    Expression<String>? syncId,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? createdAt,
    Expression<String>? deviceId,
    Expression<bool>? isDeleted,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (minScore != null) 'min_score': minScore,
      if (maxScore != null) 'max_score': maxScore,
      if (grade != null) 'grade': grade,
      if (remarks != null) 'remarks': remarks,
      if (syncId != null) 'sync_id': syncId,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (createdAt != null) 'created_at': createdAt,
      if (deviceId != null) 'device_id': deviceId,
      if (isDeleted != null) 'is_deleted': isDeleted,
    });
  }

  GradingRulesCompanion copyWith(
      {Value<int>? id,
      Value<double>? minScore,
      Value<double>? maxScore,
      Value<String>? grade,
      Value<String?>? remarks,
      Value<String?>? syncId,
      Value<DateTime?>? updatedAt,
      Value<DateTime?>? createdAt,
      Value<String?>? deviceId,
      Value<bool>? isDeleted}) {
    return GradingRulesCompanion(
      id: id ?? this.id,
      minScore: minScore ?? this.minScore,
      maxScore: maxScore ?? this.maxScore,
      grade: grade ?? this.grade,
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
    if (minScore.present) {
      map['min_score'] = Variable<double>(minScore.value);
    }
    if (maxScore.present) {
      map['max_score'] = Variable<double>(maxScore.value);
    }
    if (grade.present) {
      map['grade'] = Variable<String>(grade.value);
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
    return (StringBuffer('GradingRulesCompanion(')
          ..write('id: $id, ')
          ..write('minScore: $minScore, ')
          ..write('maxScore: $maxScore, ')
          ..write('grade: $grade, ')
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

class $PrinterConfigsTable extends PrinterConfigs
    with TableInfo<$PrinterConfigsTable, PrinterConfig> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $PrinterConfigsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _addressMeta =
      const VerificationMeta('address');
  @override
  late final GeneratedColumn<String> address = GeneratedColumn<String>(
      'address', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _customNameMeta =
      const VerificationMeta('customName');
  @override
  late final GeneratedColumn<String> customName = GeneratedColumn<String>(
      'custom_name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _typeMeta = const VerificationMeta('type');
  @override
  late final GeneratedColumn<String> type = GeneratedColumn<String>(
      'type', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _lastConnectedAtMeta =
      const VerificationMeta('lastConnectedAt');
  @override
  late final GeneratedColumn<DateTime> lastConnectedAt =
      GeneratedColumn<DateTime>('last_connected_at', aliasedName, true,
          type: DriftSqlType.dateTime, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns =>
      [address, customName, type, lastConnectedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'printer_configs';
  @override
  VerificationContext validateIntegrity(Insertable<PrinterConfig> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('address')) {
      context.handle(_addressMeta,
          address.isAcceptableOrUnknown(data['address']!, _addressMeta));
    } else if (isInserting) {
      context.missing(_addressMeta);
    }
    if (data.containsKey('custom_name')) {
      context.handle(
          _customNameMeta,
          customName.isAcceptableOrUnknown(
              data['custom_name']!, _customNameMeta));
    }
    if (data.containsKey('type')) {
      context.handle(
          _typeMeta, type.isAcceptableOrUnknown(data['type']!, _typeMeta));
    } else if (isInserting) {
      context.missing(_typeMeta);
    }
    if (data.containsKey('last_connected_at')) {
      context.handle(
          _lastConnectedAtMeta,
          lastConnectedAt.isAcceptableOrUnknown(
              data['last_connected_at']!, _lastConnectedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {address};
  @override
  PrinterConfig map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return PrinterConfig(
      address: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}address'])!,
      customName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}custom_name']),
      type: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}type'])!,
      lastConnectedAt: attachedDatabase.typeMapping.read(
          DriftSqlType.dateTime, data['${effectivePrefix}last_connected_at']),
    );
  }

  @override
  $PrinterConfigsTable createAlias(String alias) {
    return $PrinterConfigsTable(attachedDatabase, alias);
  }
}

class PrinterConfig extends DataClass implements Insertable<PrinterConfig> {
  final String address;
  final String? customName;
  final String type;
  final DateTime? lastConnectedAt;
  const PrinterConfig(
      {required this.address,
      this.customName,
      required this.type,
      this.lastConnectedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['address'] = Variable<String>(address);
    if (!nullToAbsent || customName != null) {
      map['custom_name'] = Variable<String>(customName);
    }
    map['type'] = Variable<String>(type);
    if (!nullToAbsent || lastConnectedAt != null) {
      map['last_connected_at'] = Variable<DateTime>(lastConnectedAt);
    }
    return map;
  }

  PrinterConfigsCompanion toCompanion(bool nullToAbsent) {
    return PrinterConfigsCompanion(
      address: Value(address),
      customName: customName == null && nullToAbsent
          ? const Value.absent()
          : Value(customName),
      type: Value(type),
      lastConnectedAt: lastConnectedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastConnectedAt),
    );
  }

  factory PrinterConfig.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return PrinterConfig(
      address: serializer.fromJson<String>(json['address']),
      customName: serializer.fromJson<String?>(json['customName']),
      type: serializer.fromJson<String>(json['type']),
      lastConnectedAt: serializer.fromJson<DateTime?>(json['lastConnectedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'address': serializer.toJson<String>(address),
      'customName': serializer.toJson<String?>(customName),
      'type': serializer.toJson<String>(type),
      'lastConnectedAt': serializer.toJson<DateTime?>(lastConnectedAt),
    };
  }

  PrinterConfig copyWith(
          {String? address,
          Value<String?> customName = const Value.absent(),
          String? type,
          Value<DateTime?> lastConnectedAt = const Value.absent()}) =>
      PrinterConfig(
        address: address ?? this.address,
        customName: customName.present ? customName.value : this.customName,
        type: type ?? this.type,
        lastConnectedAt: lastConnectedAt.present
            ? lastConnectedAt.value
            : this.lastConnectedAt,
      );
  PrinterConfig copyWithCompanion(PrinterConfigsCompanion data) {
    return PrinterConfig(
      address: data.address.present ? data.address.value : this.address,
      customName:
          data.customName.present ? data.customName.value : this.customName,
      type: data.type.present ? data.type.value : this.type,
      lastConnectedAt: data.lastConnectedAt.present
          ? data.lastConnectedAt.value
          : this.lastConnectedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('PrinterConfig(')
          ..write('address: $address, ')
          ..write('customName: $customName, ')
          ..write('type: $type, ')
          ..write('lastConnectedAt: $lastConnectedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(address, customName, type, lastConnectedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PrinterConfig &&
          other.address == this.address &&
          other.customName == this.customName &&
          other.type == this.type &&
          other.lastConnectedAt == this.lastConnectedAt);
}

class PrinterConfigsCompanion extends UpdateCompanion<PrinterConfig> {
  final Value<String> address;
  final Value<String?> customName;
  final Value<String> type;
  final Value<DateTime?> lastConnectedAt;
  final Value<int> rowid;
  const PrinterConfigsCompanion({
    this.address = const Value.absent(),
    this.customName = const Value.absent(),
    this.type = const Value.absent(),
    this.lastConnectedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  PrinterConfigsCompanion.insert({
    required String address,
    this.customName = const Value.absent(),
    required String type,
    this.lastConnectedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : address = Value(address),
        type = Value(type);
  static Insertable<PrinterConfig> custom({
    Expression<String>? address,
    Expression<String>? customName,
    Expression<String>? type,
    Expression<DateTime>? lastConnectedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (address != null) 'address': address,
      if (customName != null) 'custom_name': customName,
      if (type != null) 'type': type,
      if (lastConnectedAt != null) 'last_connected_at': lastConnectedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  PrinterConfigsCompanion copyWith(
      {Value<String>? address,
      Value<String?>? customName,
      Value<String>? type,
      Value<DateTime?>? lastConnectedAt,
      Value<int>? rowid}) {
    return PrinterConfigsCompanion(
      address: address ?? this.address,
      customName: customName ?? this.customName,
      type: type ?? this.type,
      lastConnectedAt: lastConnectedAt ?? this.lastConnectedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (address.present) {
      map['address'] = Variable<String>(address.value);
    }
    if (customName.present) {
      map['custom_name'] = Variable<String>(customName.value);
    }
    if (type.present) {
      map['type'] = Variable<String>(type.value);
    }
    if (lastConnectedAt.present) {
      map['last_connected_at'] = Variable<DateTime>(lastConnectedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('PrinterConfigsCompanion(')
          ..write('address: $address, ')
          ..write('customName: $customName, ')
          ..write('type: $type, ')
          ..write('lastConnectedAt: $lastConnectedAt, ')
          ..write('rowid: $rowid')
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
  late final $StockReturnsTable stockReturns = $StockReturnsTable(this);
  late final $ExpensesTable expenses = $ExpensesTable(this);
  late final $AcademicYearsTable academicYears = $AcademicYearsTable(this);
  late final $TermsTable terms = $TermsTable(this);
  late final $ClassesTable classes = $ClassesTable(this);
  late final $StudentsTable students = $StudentsTable(this);
  late final $BusinessSettingsTable businessSettings =
      $BusinessSettingsTable(this);
  late final $TeachersTable teachers = $TeachersTable(this);
  late final $SubjectsTable subjects = $SubjectsTable(this);
  late final $ResultsTable results = $ResultsTable(this);
  late final $GradingRulesTable gradingRules = $GradingRulesTable(this);
  late final $PrinterConfigsTable printerConfigs = $PrinterConfigsTable(this);
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
        stockIncrements,
        stockReturns,
        expenses,
        academicYears,
        terms,
        classes,
        students,
        businessSettings,
        teachers,
        subjects,
        results,
        gradingRules,
        printerConfigs
      ];
}

typedef $$CategoriesTableCreateCompanionBuilder = CategoriesCompanion Function({
  Value<int> id,
  required String name,
  Value<String> businessMode,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});
typedef $$CategoriesTableUpdateCompanionBuilder = CategoriesCompanion Function({
  Value<int> id,
  Value<String> name,
  Value<String> businessMode,
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

  ColumnFilters<String> get businessMode => $composableBuilder(
      column: $table.businessMode, builder: (column) => ColumnFilters(column));

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

  ColumnOrderings<String> get businessMode => $composableBuilder(
      column: $table.businessMode,
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

  GeneratedColumn<String> get businessMode => $composableBuilder(
      column: $table.businessMode, builder: (column) => column);

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
            Value<String> businessMode = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              CategoriesCompanion(
            id: id,
            name: name,
            businessMode: businessMode,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String name,
            Value<String> businessMode = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              CategoriesCompanion.insert(
            id: id,
            name: name,
            businessMode: businessMode,
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
  Value<double> costPrice,
  Value<int> stockQty,
  Value<double> minStockQty,
  Value<Uint8List?> image,
  Value<int?> categoryId,
  Value<String> type,
  Value<String?> billingType,
  Value<String?> serviceCategory,
  Value<bool> requiresTimeTracking,
  Value<String> businessMode,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
  Value<bool> isDefault,
});
typedef $$ItemsTableUpdateCompanionBuilder = ItemsCompanion Function({
  Value<int> id,
  Value<String> name,
  Value<String> category,
  Value<double> price,
  Value<double> costPrice,
  Value<int> stockQty,
  Value<double> minStockQty,
  Value<Uint8List?> image,
  Value<int?> categoryId,
  Value<String> type,
  Value<String?> billingType,
  Value<String?> serviceCategory,
  Value<bool> requiresTimeTracking,
  Value<String> businessMode,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
  Value<bool> isDefault,
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

  static MultiTypedResultKey<$StockReturnsTable, List<StockReturnTable>>
      _stockReturnsRefsTable(_$AppDatabase db) => MultiTypedResultKey.fromTable(
          db.stockReturns,
          aliasName: $_aliasNameGenerator(db.items.id, db.stockReturns.itemId));

  $$StockReturnsTableProcessedTableManager get stockReturnsRefs {
    final manager = $$StockReturnsTableTableManager($_db, $_db.stockReturns)
        .filter((f) => f.itemId.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(_stockReturnsRefsTable($_db));
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

  ColumnFilters<double> get costPrice => $composableBuilder(
      column: $table.costPrice, builder: (column) => ColumnFilters(column));

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

  ColumnFilters<String> get businessMode => $composableBuilder(
      column: $table.businessMode, builder: (column) => ColumnFilters(column));

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

  ColumnFilters<bool> get isDefault => $composableBuilder(
      column: $table.isDefault, builder: (column) => ColumnFilters(column));

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

  Expression<bool> stockReturnsRefs(
      Expression<bool> Function($$StockReturnsTableFilterComposer f) f) {
    final $$StockReturnsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.stockReturns,
        getReferencedColumn: (t) => t.itemId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$StockReturnsTableFilterComposer(
              $db: $db,
              $table: $db.stockReturns,
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

  ColumnOrderings<double> get costPrice => $composableBuilder(
      column: $table.costPrice, builder: (column) => ColumnOrderings(column));

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

  ColumnOrderings<String> get businessMode => $composableBuilder(
      column: $table.businessMode,
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

  ColumnOrderings<bool> get isDefault => $composableBuilder(
      column: $table.isDefault, builder: (column) => ColumnOrderings(column));

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

  GeneratedColumn<double> get costPrice =>
      $composableBuilder(column: $table.costPrice, builder: (column) => column);

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

  GeneratedColumn<String> get businessMode => $composableBuilder(
      column: $table.businessMode, builder: (column) => column);

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

  GeneratedColumn<bool> get isDefault =>
      $composableBuilder(column: $table.isDefault, builder: (column) => column);

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

  Expression<T> stockReturnsRefs<T extends Object>(
      Expression<T> Function($$StockReturnsTableAnnotationComposer a) f) {
    final $$StockReturnsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.stockReturns,
        getReferencedColumn: (t) => t.itemId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$StockReturnsTableAnnotationComposer(
              $db: $db,
              $table: $db.stockReturns,
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
        {bool categoryId,
        bool invoiceItemsRefs,
        bool stockIncrementsRefs,
        bool stockReturnsRefs})> {
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
            Value<double> costPrice = const Value.absent(),
            Value<int> stockQty = const Value.absent(),
            Value<double> minStockQty = const Value.absent(),
            Value<Uint8List?> image = const Value.absent(),
            Value<int?> categoryId = const Value.absent(),
            Value<String> type = const Value.absent(),
            Value<String?> billingType = const Value.absent(),
            Value<String?> serviceCategory = const Value.absent(),
            Value<bool> requiresTimeTracking = const Value.absent(),
            Value<String> businessMode = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
            Value<bool> isDefault = const Value.absent(),
          }) =>
              ItemsCompanion(
            id: id,
            name: name,
            category: category,
            price: price,
            costPrice: costPrice,
            stockQty: stockQty,
            minStockQty: minStockQty,
            image: image,
            categoryId: categoryId,
            type: type,
            billingType: billingType,
            serviceCategory: serviceCategory,
            requiresTimeTracking: requiresTimeTracking,
            businessMode: businessMode,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
            isDefault: isDefault,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String name,
            required String category,
            required double price,
            Value<double> costPrice = const Value.absent(),
            Value<int> stockQty = const Value.absent(),
            Value<double> minStockQty = const Value.absent(),
            Value<Uint8List?> image = const Value.absent(),
            Value<int?> categoryId = const Value.absent(),
            Value<String> type = const Value.absent(),
            Value<String?> billingType = const Value.absent(),
            Value<String?> serviceCategory = const Value.absent(),
            Value<bool> requiresTimeTracking = const Value.absent(),
            Value<String> businessMode = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
            Value<bool> isDefault = const Value.absent(),
          }) =>
              ItemsCompanion.insert(
            id: id,
            name: name,
            category: category,
            price: price,
            costPrice: costPrice,
            stockQty: stockQty,
            minStockQty: minStockQty,
            image: image,
            categoryId: categoryId,
            type: type,
            billingType: billingType,
            serviceCategory: serviceCategory,
            requiresTimeTracking: requiresTimeTracking,
            businessMode: businessMode,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
            isDefault: isDefault,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) =>
                  (e.readTable(table), $$ItemsTableReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: (
              {categoryId = false,
              invoiceItemsRefs = false,
              stockIncrementsRefs = false,
              stockReturnsRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [
                if (invoiceItemsRefs) db.invoiceItems,
                if (stockIncrementsRefs) db.stockIncrements,
                if (stockReturnsRefs) db.stockReturns
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
                        typedResults: items),
                  if (stockReturnsRefs)
                    await $_getPrefetchedData<ItemTable, $ItemsTable,
                            StockReturnTable>(
                        currentTable: table,
                        referencedTable:
                            $$ItemsTableReferences._stockReturnsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$ItemsTableReferences(db, table, p0)
                                .stockReturnsRefs,
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
        {bool categoryId,
        bool invoiceItemsRefs,
        bool stockIncrementsRefs,
        bool stockReturnsRefs})>;
typedef $$InvoicesTableCreateCompanionBuilder = InvoicesCompanion Function({
  Value<int> id,
  required String invoiceNumber,
  Value<DateTime> dateCreated,
  required double subtotal,
  required double taxAmount,
  required double discountAmount,
  Value<String> discountType,
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
  Value<String> businessMode,
  Value<int?> studentId,
  Value<int?> classId,
  Value<int?> termId,
  Value<int?> academicYearId,
  Value<String?> admissionNumber,
  Value<String?> className,
  Value<String?> termName,
  Value<String?> academicYearName,
  Value<Uint8List?> studentImage,
});
typedef $$InvoicesTableUpdateCompanionBuilder = InvoicesCompanion Function({
  Value<int> id,
  Value<String> invoiceNumber,
  Value<DateTime> dateCreated,
  Value<double> subtotal,
  Value<double> taxAmount,
  Value<double> discountAmount,
  Value<String> discountType,
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
  Value<String> businessMode,
  Value<int?> studentId,
  Value<int?> classId,
  Value<int?> termId,
  Value<int?> academicYearId,
  Value<String?> admissionNumber,
  Value<String?> className,
  Value<String?> termName,
  Value<String?> academicYearName,
  Value<Uint8List?> studentImage,
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

  static MultiTypedResultKey<$StockReturnsTable, List<StockReturnTable>>
      _stockReturnsRefsTable(_$AppDatabase db) => MultiTypedResultKey.fromTable(
          db.stockReturns,
          aliasName:
              $_aliasNameGenerator(db.invoices.id, db.stockReturns.invoiceId));

  $$StockReturnsTableProcessedTableManager get stockReturnsRefs {
    final manager = $$StockReturnsTableTableManager($_db, $_db.stockReturns)
        .filter((f) => f.invoiceId.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(_stockReturnsRefsTable($_db));
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

  ColumnFilters<String> get discountType => $composableBuilder(
      column: $table.discountType, builder: (column) => ColumnFilters(column));

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

  ColumnFilters<String> get businessMode => $composableBuilder(
      column: $table.businessMode, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get studentId => $composableBuilder(
      column: $table.studentId, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get classId => $composableBuilder(
      column: $table.classId, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get termId => $composableBuilder(
      column: $table.termId, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get academicYearId => $composableBuilder(
      column: $table.academicYearId,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get admissionNumber => $composableBuilder(
      column: $table.admissionNumber,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get className => $composableBuilder(
      column: $table.className, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get termName => $composableBuilder(
      column: $table.termName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get academicYearName => $composableBuilder(
      column: $table.academicYearName,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<Uint8List> get studentImage => $composableBuilder(
      column: $table.studentImage, builder: (column) => ColumnFilters(column));

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

  Expression<bool> stockReturnsRefs(
      Expression<bool> Function($$StockReturnsTableFilterComposer f) f) {
    final $$StockReturnsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.stockReturns,
        getReferencedColumn: (t) => t.invoiceId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$StockReturnsTableFilterComposer(
              $db: $db,
              $table: $db.stockReturns,
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

  ColumnOrderings<String> get discountType => $composableBuilder(
      column: $table.discountType,
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

  ColumnOrderings<String> get businessMode => $composableBuilder(
      column: $table.businessMode,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get studentId => $composableBuilder(
      column: $table.studentId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get classId => $composableBuilder(
      column: $table.classId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get termId => $composableBuilder(
      column: $table.termId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get academicYearId => $composableBuilder(
      column: $table.academicYearId,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get admissionNumber => $composableBuilder(
      column: $table.admissionNumber,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get className => $composableBuilder(
      column: $table.className, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get termName => $composableBuilder(
      column: $table.termName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get academicYearName => $composableBuilder(
      column: $table.academicYearName,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<Uint8List> get studentImage => $composableBuilder(
      column: $table.studentImage,
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

  GeneratedColumn<String> get discountType => $composableBuilder(
      column: $table.discountType, builder: (column) => column);

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

  GeneratedColumn<String> get businessMode => $composableBuilder(
      column: $table.businessMode, builder: (column) => column);

  GeneratedColumn<int> get studentId =>
      $composableBuilder(column: $table.studentId, builder: (column) => column);

  GeneratedColumn<int> get classId =>
      $composableBuilder(column: $table.classId, builder: (column) => column);

  GeneratedColumn<int> get termId =>
      $composableBuilder(column: $table.termId, builder: (column) => column);

  GeneratedColumn<int> get academicYearId => $composableBuilder(
      column: $table.academicYearId, builder: (column) => column);

  GeneratedColumn<String> get admissionNumber => $composableBuilder(
      column: $table.admissionNumber, builder: (column) => column);

  GeneratedColumn<String> get className =>
      $composableBuilder(column: $table.className, builder: (column) => column);

  GeneratedColumn<String> get termName =>
      $composableBuilder(column: $table.termName, builder: (column) => column);

  GeneratedColumn<String> get academicYearName => $composableBuilder(
      column: $table.academicYearName, builder: (column) => column);

  GeneratedColumn<Uint8List> get studentImage => $composableBuilder(
      column: $table.studentImage, builder: (column) => column);

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

  Expression<T> stockReturnsRefs<T extends Object>(
      Expression<T> Function($$StockReturnsTableAnnotationComposer a) f) {
    final $$StockReturnsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.stockReturns,
        getReferencedColumn: (t) => t.invoiceId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$StockReturnsTableAnnotationComposer(
              $db: $db,
              $table: $db.stockReturns,
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
    PrefetchHooks Function({bool invoiceItemsRefs, bool stockReturnsRefs})> {
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
            Value<String> discountType = const Value.absent(),
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
            Value<String> businessMode = const Value.absent(),
            Value<int?> studentId = const Value.absent(),
            Value<int?> classId = const Value.absent(),
            Value<int?> termId = const Value.absent(),
            Value<int?> academicYearId = const Value.absent(),
            Value<String?> admissionNumber = const Value.absent(),
            Value<String?> className = const Value.absent(),
            Value<String?> termName = const Value.absent(),
            Value<String?> academicYearName = const Value.absent(),
            Value<Uint8List?> studentImage = const Value.absent(),
          }) =>
              InvoicesCompanion(
            id: id,
            invoiceNumber: invoiceNumber,
            dateCreated: dateCreated,
            subtotal: subtotal,
            taxAmount: taxAmount,
            discountAmount: discountAmount,
            discountType: discountType,
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
            businessMode: businessMode,
            studentId: studentId,
            classId: classId,
            termId: termId,
            academicYearId: academicYearId,
            admissionNumber: admissionNumber,
            className: className,
            termName: termName,
            academicYearName: academicYearName,
            studentImage: studentImage,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String invoiceNumber,
            Value<DateTime> dateCreated = const Value.absent(),
            required double subtotal,
            required double taxAmount,
            required double discountAmount,
            Value<String> discountType = const Value.absent(),
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
            Value<String> businessMode = const Value.absent(),
            Value<int?> studentId = const Value.absent(),
            Value<int?> classId = const Value.absent(),
            Value<int?> termId = const Value.absent(),
            Value<int?> academicYearId = const Value.absent(),
            Value<String?> admissionNumber = const Value.absent(),
            Value<String?> className = const Value.absent(),
            Value<String?> termName = const Value.absent(),
            Value<String?> academicYearName = const Value.absent(),
            Value<Uint8List?> studentImage = const Value.absent(),
          }) =>
              InvoicesCompanion.insert(
            id: id,
            invoiceNumber: invoiceNumber,
            dateCreated: dateCreated,
            subtotal: subtotal,
            taxAmount: taxAmount,
            discountAmount: discountAmount,
            discountType: discountType,
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
            businessMode: businessMode,
            studentId: studentId,
            classId: classId,
            termId: termId,
            academicYearId: academicYearId,
            admissionNumber: admissionNumber,
            className: className,
            termName: termName,
            academicYearName: academicYearName,
            studentImage: studentImage,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) =>
                  (e.readTable(table), $$InvoicesTableReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: (
              {invoiceItemsRefs = false, stockReturnsRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [
                if (invoiceItemsRefs) db.invoiceItems,
                if (stockReturnsRefs) db.stockReturns
              ],
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
                        typedResults: items),
                  if (stockReturnsRefs)
                    await $_getPrefetchedData<InvoiceTable, $InvoicesTable, StockReturnTable>(
                        currentTable: table,
                        referencedTable: $$InvoicesTableReferences
                            ._stockReturnsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$InvoicesTableReferences(db, table, p0)
                                .stockReturnsRefs,
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
    PrefetchHooks Function({bool invoiceItemsRefs, bool stockReturnsRefs})>;
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
  Value<int> returnedQuantity,
  Value<bool> isReplacement,
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
  Value<int> returnedQuantity,
  Value<bool> isReplacement,
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

  ColumnFilters<int> get returnedQuantity => $composableBuilder(
      column: $table.returnedQuantity,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isReplacement => $composableBuilder(
      column: $table.isReplacement, builder: (column) => ColumnFilters(column));

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

  ColumnOrderings<int> get returnedQuantity => $composableBuilder(
      column: $table.returnedQuantity,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isReplacement => $composableBuilder(
      column: $table.isReplacement,
      builder: (column) => ColumnOrderings(column));

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

  GeneratedColumn<int> get returnedQuantity => $composableBuilder(
      column: $table.returnedQuantity, builder: (column) => column);

  GeneratedColumn<bool> get isReplacement => $composableBuilder(
      column: $table.isReplacement, builder: (column) => column);

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
            Value<int> returnedQuantity = const Value.absent(),
            Value<bool> isReplacement = const Value.absent(),
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
            returnedQuantity: returnedQuantity,
            isReplacement: isReplacement,
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
            Value<int> returnedQuantity = const Value.absent(),
            Value<bool> isReplacement = const Value.absent(),
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
            returnedQuantity: returnedQuantity,
            isReplacement: isReplacement,
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
  Value<String?> logoSvg,
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
  Value<bool> stockReturnEnabled,
  Value<bool> showSalesTrendChart,
  Value<bool> showExpensePieChart,
  Value<bool> showTopSellingChart,
  Value<bool> showStockValueChart,
  Value<String> businessMode,
  Value<String?> menuOrder,
  Value<bool> skipSplash,
  Value<bool> restoreLastState,
  Value<String?> lastRoute,
  Value<bool> showLogoAsMenuBackground,
  Value<String> currencyName,
  Value<String> currencySubunit,
  Value<Uint8List?> adminSignature,
  Value<bool> showAdminSignature,
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
  Value<String?> logoSvg,
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
  Value<bool> stockReturnEnabled,
  Value<bool> showSalesTrendChart,
  Value<bool> showExpensePieChart,
  Value<bool> showTopSellingChart,
  Value<bool> showStockValueChart,
  Value<String> businessMode,
  Value<String?> menuOrder,
  Value<bool> skipSplash,
  Value<bool> restoreLastState,
  Value<String?> lastRoute,
  Value<bool> showLogoAsMenuBackground,
  Value<String> currencyName,
  Value<String> currencySubunit,
  Value<Uint8List?> adminSignature,
  Value<bool> showAdminSignature,
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

  ColumnFilters<String> get logoSvg => $composableBuilder(
      column: $table.logoSvg, builder: (column) => ColumnFilters(column));

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

  ColumnFilters<bool> get stockReturnEnabled => $composableBuilder(
      column: $table.stockReturnEnabled,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get showSalesTrendChart => $composableBuilder(
      column: $table.showSalesTrendChart,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get showExpensePieChart => $composableBuilder(
      column: $table.showExpensePieChart,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get showTopSellingChart => $composableBuilder(
      column: $table.showTopSellingChart,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get showStockValueChart => $composableBuilder(
      column: $table.showStockValueChart,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get businessMode => $composableBuilder(
      column: $table.businessMode, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get menuOrder => $composableBuilder(
      column: $table.menuOrder, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get skipSplash => $composableBuilder(
      column: $table.skipSplash, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get restoreLastState => $composableBuilder(
      column: $table.restoreLastState,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lastRoute => $composableBuilder(
      column: $table.lastRoute, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get showLogoAsMenuBackground => $composableBuilder(
      column: $table.showLogoAsMenuBackground,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get currencyName => $composableBuilder(
      column: $table.currencyName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get currencySubunit => $composableBuilder(
      column: $table.currencySubunit,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<Uint8List> get adminSignature => $composableBuilder(
      column: $table.adminSignature,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get showAdminSignature => $composableBuilder(
      column: $table.showAdminSignature,
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

  ColumnOrderings<String> get logoSvg => $composableBuilder(
      column: $table.logoSvg, builder: (column) => ColumnOrderings(column));

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

  ColumnOrderings<bool> get stockReturnEnabled => $composableBuilder(
      column: $table.stockReturnEnabled,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get showSalesTrendChart => $composableBuilder(
      column: $table.showSalesTrendChart,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get showExpensePieChart => $composableBuilder(
      column: $table.showExpensePieChart,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get showTopSellingChart => $composableBuilder(
      column: $table.showTopSellingChart,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get showStockValueChart => $composableBuilder(
      column: $table.showStockValueChart,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get businessMode => $composableBuilder(
      column: $table.businessMode,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get menuOrder => $composableBuilder(
      column: $table.menuOrder, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get skipSplash => $composableBuilder(
      column: $table.skipSplash, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get restoreLastState => $composableBuilder(
      column: $table.restoreLastState,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lastRoute => $composableBuilder(
      column: $table.lastRoute, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get showLogoAsMenuBackground => $composableBuilder(
      column: $table.showLogoAsMenuBackground,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get currencyName => $composableBuilder(
      column: $table.currencyName,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get currencySubunit => $composableBuilder(
      column: $table.currencySubunit,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<Uint8List> get adminSignature => $composableBuilder(
      column: $table.adminSignature,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get showAdminSignature => $composableBuilder(
      column: $table.showAdminSignature,
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

  GeneratedColumn<String> get logoSvg =>
      $composableBuilder(column: $table.logoSvg, builder: (column) => column);

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

  GeneratedColumn<bool> get stockReturnEnabled => $composableBuilder(
      column: $table.stockReturnEnabled, builder: (column) => column);

  GeneratedColumn<bool> get showSalesTrendChart => $composableBuilder(
      column: $table.showSalesTrendChart, builder: (column) => column);

  GeneratedColumn<bool> get showExpensePieChart => $composableBuilder(
      column: $table.showExpensePieChart, builder: (column) => column);

  GeneratedColumn<bool> get showTopSellingChart => $composableBuilder(
      column: $table.showTopSellingChart, builder: (column) => column);

  GeneratedColumn<bool> get showStockValueChart => $composableBuilder(
      column: $table.showStockValueChart, builder: (column) => column);

  GeneratedColumn<String> get businessMode => $composableBuilder(
      column: $table.businessMode, builder: (column) => column);

  GeneratedColumn<String> get menuOrder =>
      $composableBuilder(column: $table.menuOrder, builder: (column) => column);

  GeneratedColumn<bool> get skipSplash => $composableBuilder(
      column: $table.skipSplash, builder: (column) => column);

  GeneratedColumn<bool> get restoreLastState => $composableBuilder(
      column: $table.restoreLastState, builder: (column) => column);

  GeneratedColumn<String> get lastRoute =>
      $composableBuilder(column: $table.lastRoute, builder: (column) => column);

  GeneratedColumn<bool> get showLogoAsMenuBackground => $composableBuilder(
      column: $table.showLogoAsMenuBackground, builder: (column) => column);

  GeneratedColumn<String> get currencyName => $composableBuilder(
      column: $table.currencyName, builder: (column) => column);

  GeneratedColumn<String> get currencySubunit => $composableBuilder(
      column: $table.currencySubunit, builder: (column) => column);

  GeneratedColumn<Uint8List> get adminSignature => $composableBuilder(
      column: $table.adminSignature, builder: (column) => column);

  GeneratedColumn<bool> get showAdminSignature => $composableBuilder(
      column: $table.showAdminSignature, builder: (column) => column);
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
            Value<String?> logoSvg = const Value.absent(),
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
            Value<bool> stockReturnEnabled = const Value.absent(),
            Value<bool> showSalesTrendChart = const Value.absent(),
            Value<bool> showExpensePieChart = const Value.absent(),
            Value<bool> showTopSellingChart = const Value.absent(),
            Value<bool> showStockValueChart = const Value.absent(),
            Value<String> businessMode = const Value.absent(),
            Value<String?> menuOrder = const Value.absent(),
            Value<bool> skipSplash = const Value.absent(),
            Value<bool> restoreLastState = const Value.absent(),
            Value<String?> lastRoute = const Value.absent(),
            Value<bool> showLogoAsMenuBackground = const Value.absent(),
            Value<String> currencyName = const Value.absent(),
            Value<String> currencySubunit = const Value.absent(),
            Value<Uint8List?> adminSignature = const Value.absent(),
            Value<bool> showAdminSignature = const Value.absent(),
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
            logoSvg: logoSvg,
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
            stockReturnEnabled: stockReturnEnabled,
            showSalesTrendChart: showSalesTrendChart,
            showExpensePieChart: showExpensePieChart,
            showTopSellingChart: showTopSellingChart,
            showStockValueChart: showStockValueChart,
            businessMode: businessMode,
            menuOrder: menuOrder,
            skipSplash: skipSplash,
            restoreLastState: restoreLastState,
            lastRoute: lastRoute,
            showLogoAsMenuBackground: showLogoAsMenuBackground,
            currencyName: currencyName,
            currencySubunit: currencySubunit,
            adminSignature: adminSignature,
            showAdminSignature: showAdminSignature,
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
            Value<String?> logoSvg = const Value.absent(),
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
            Value<bool> stockReturnEnabled = const Value.absent(),
            Value<bool> showSalesTrendChart = const Value.absent(),
            Value<bool> showExpensePieChart = const Value.absent(),
            Value<bool> showTopSellingChart = const Value.absent(),
            Value<bool> showStockValueChart = const Value.absent(),
            Value<String> businessMode = const Value.absent(),
            Value<String?> menuOrder = const Value.absent(),
            Value<bool> skipSplash = const Value.absent(),
            Value<bool> restoreLastState = const Value.absent(),
            Value<String?> lastRoute = const Value.absent(),
            Value<bool> showLogoAsMenuBackground = const Value.absent(),
            Value<String> currencyName = const Value.absent(),
            Value<String> currencySubunit = const Value.absent(),
            Value<Uint8List?> adminSignature = const Value.absent(),
            Value<bool> showAdminSignature = const Value.absent(),
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
            logoSvg: logoSvg,
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
            stockReturnEnabled: stockReturnEnabled,
            showSalesTrendChart: showSalesTrendChart,
            showExpensePieChart: showExpensePieChart,
            showTopSellingChart: showTopSellingChart,
            showStockValueChart: showStockValueChart,
            businessMode: businessMode,
            menuOrder: menuOrder,
            skipSplash: skipSplash,
            restoreLastState: restoreLastState,
            lastRoute: lastRoute,
            showLogoAsMenuBackground: showLogoAsMenuBackground,
            currencyName: currencyName,
            currencySubunit: currencySubunit,
            adminSignature: adminSignature,
            showAdminSignature: showAdminSignature,
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
  Value<String?> staffId,
  Value<String?> phone,
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
  Value<String?> staffId,
  Value<String?> phone,
  Value<bool> isActive,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});

final class $$StaffTableReferences
    extends BaseReferences<_$AppDatabase, $StaffTable, StaffTable> {
  $$StaffTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static MultiTypedResultKey<$StockReturnsTable, List<StockReturnTable>>
      _stockReturnsRefsTable(_$AppDatabase db) =>
          MultiTypedResultKey.fromTable(db.stockReturns,
              aliasName:
                  $_aliasNameGenerator(db.staff.id, db.stockReturns.staffId));

  $$StockReturnsTableProcessedTableManager get stockReturnsRefs {
    final manager = $$StockReturnsTableTableManager($_db, $_db.stockReturns)
        .filter((f) => f.staffId.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(_stockReturnsRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }
}

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

  ColumnFilters<String> get staffId => $composableBuilder(
      column: $table.staffId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get phone => $composableBuilder(
      column: $table.phone, builder: (column) => ColumnFilters(column));

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

  Expression<bool> stockReturnsRefs(
      Expression<bool> Function($$StockReturnsTableFilterComposer f) f) {
    final $$StockReturnsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.stockReturns,
        getReferencedColumn: (t) => t.staffId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$StockReturnsTableFilterComposer(
              $db: $db,
              $table: $db.stockReturns,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
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

  ColumnOrderings<String> get staffId => $composableBuilder(
      column: $table.staffId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get phone => $composableBuilder(
      column: $table.phone, builder: (column) => ColumnOrderings(column));

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

  GeneratedColumn<String> get staffId =>
      $composableBuilder(column: $table.staffId, builder: (column) => column);

  GeneratedColumn<String> get phone =>
      $composableBuilder(column: $table.phone, builder: (column) => column);

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

  Expression<T> stockReturnsRefs<T extends Object>(
      Expression<T> Function($$StockReturnsTableAnnotationComposer a) f) {
    final $$StockReturnsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.stockReturns,
        getReferencedColumn: (t) => t.staffId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$StockReturnsTableAnnotationComposer(
              $db: $db,
              $table: $db.stockReturns,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
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
    (StaffTable, $$StaffTableReferences),
    StaffTable,
    PrefetchHooks Function({bool stockReturnsRefs})> {
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
            Value<String?> staffId = const Value.absent(),
            Value<String?> phone = const Value.absent(),
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
            staffId: staffId,
            phone: phone,
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
            Value<String?> staffId = const Value.absent(),
            Value<String?> phone = const Value.absent(),
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
            staffId: staffId,
            phone: phone,
            isActive: isActive,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) =>
                  (e.readTable(table), $$StaffTableReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: ({stockReturnsRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [if (stockReturnsRefs) db.stockReturns],
              addJoins: null,
              getPrefetchedDataCallback: (items) async {
                return [
                  if (stockReturnsRefs)
                    await $_getPrefetchedData<StaffTable, $StaffTable,
                            StockReturnTable>(
                        currentTable: table,
                        referencedTable:
                            $$StaffTableReferences._stockReturnsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$StaffTableReferences(db, table, p0)
                                .stockReturnsRefs,
                        referencedItemsForCurrentItem: (item,
                                referencedItems) =>
                            referencedItems.where((e) => e.staffId == item.id),
                        typedResults: items)
                ];
              },
            );
          },
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
    (StaffTable, $$StaffTableReferences),
    StaffTable,
    PrefetchHooks Function({bool stockReturnsRefs})>;
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
typedef $$StockReturnsTableCreateCompanionBuilder = StockReturnsCompanion
    Function({
  Value<int> id,
  required int invoiceId,
  required int itemId,
  required int quantity,
  required double amountReturned,
  required int staffId,
  Value<DateTime> dateReturned,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});
typedef $$StockReturnsTableUpdateCompanionBuilder = StockReturnsCompanion
    Function({
  Value<int> id,
  Value<int> invoiceId,
  Value<int> itemId,
  Value<int> quantity,
  Value<double> amountReturned,
  Value<int> staffId,
  Value<DateTime> dateReturned,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});

final class $$StockReturnsTableReferences extends BaseReferences<_$AppDatabase,
    $StockReturnsTable, StockReturnTable> {
  $$StockReturnsTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static $InvoicesTable _invoiceIdTable(_$AppDatabase db) =>
      db.invoices.createAlias(
          $_aliasNameGenerator(db.stockReturns.invoiceId, db.invoices.id));

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
      .createAlias($_aliasNameGenerator(db.stockReturns.itemId, db.items.id));

  $$ItemsTableProcessedTableManager get itemId {
    final $_column = $_itemColumn<int>('item_id')!;

    final manager = $$ItemsTableTableManager($_db, $_db.items)
        .filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_itemIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static $StaffTable _staffIdTable(_$AppDatabase db) => db.staff
      .createAlias($_aliasNameGenerator(db.stockReturns.staffId, db.staff.id));

  $$StaffTableProcessedTableManager get staffId {
    final $_column = $_itemColumn<int>('staff_id')!;

    final manager = $$StaffTableTableManager($_db, $_db.staff)
        .filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_staffIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }
}

class $$StockReturnsTableFilterComposer
    extends Composer<_$AppDatabase, $StockReturnsTable> {
  $$StockReturnsTableFilterComposer({
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

  ColumnFilters<double> get amountReturned => $composableBuilder(
      column: $table.amountReturned,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get dateReturned => $composableBuilder(
      column: $table.dateReturned, builder: (column) => ColumnFilters(column));

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

  $$StaffTableFilterComposer get staffId {
    final $$StaffTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.staffId,
        referencedTable: $db.staff,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$StaffTableFilterComposer(
              $db: $db,
              $table: $db.staff,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$StockReturnsTableOrderingComposer
    extends Composer<_$AppDatabase, $StockReturnsTable> {
  $$StockReturnsTableOrderingComposer({
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

  ColumnOrderings<double> get amountReturned => $composableBuilder(
      column: $table.amountReturned,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get dateReturned => $composableBuilder(
      column: $table.dateReturned,
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

  $$StaffTableOrderingComposer get staffId {
    final $$StaffTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.staffId,
        referencedTable: $db.staff,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$StaffTableOrderingComposer(
              $db: $db,
              $table: $db.staff,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$StockReturnsTableAnnotationComposer
    extends Composer<_$AppDatabase, $StockReturnsTable> {
  $$StockReturnsTableAnnotationComposer({
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

  GeneratedColumn<double> get amountReturned => $composableBuilder(
      column: $table.amountReturned, builder: (column) => column);

  GeneratedColumn<DateTime> get dateReturned => $composableBuilder(
      column: $table.dateReturned, builder: (column) => column);

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

  $$StaffTableAnnotationComposer get staffId {
    final $$StaffTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.staffId,
        referencedTable: $db.staff,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$StaffTableAnnotationComposer(
              $db: $db,
              $table: $db.staff,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$StockReturnsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $StockReturnsTable,
    StockReturnTable,
    $$StockReturnsTableFilterComposer,
    $$StockReturnsTableOrderingComposer,
    $$StockReturnsTableAnnotationComposer,
    $$StockReturnsTableCreateCompanionBuilder,
    $$StockReturnsTableUpdateCompanionBuilder,
    (StockReturnTable, $$StockReturnsTableReferences),
    StockReturnTable,
    PrefetchHooks Function({bool invoiceId, bool itemId, bool staffId})> {
  $$StockReturnsTableTableManager(_$AppDatabase db, $StockReturnsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$StockReturnsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$StockReturnsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$StockReturnsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<int> invoiceId = const Value.absent(),
            Value<int> itemId = const Value.absent(),
            Value<int> quantity = const Value.absent(),
            Value<double> amountReturned = const Value.absent(),
            Value<int> staffId = const Value.absent(),
            Value<DateTime> dateReturned = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              StockReturnsCompanion(
            id: id,
            invoiceId: invoiceId,
            itemId: itemId,
            quantity: quantity,
            amountReturned: amountReturned,
            staffId: staffId,
            dateReturned: dateReturned,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required int invoiceId,
            required int itemId,
            required int quantity,
            required double amountReturned,
            required int staffId,
            Value<DateTime> dateReturned = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              StockReturnsCompanion.insert(
            id: id,
            invoiceId: invoiceId,
            itemId: itemId,
            quantity: quantity,
            amountReturned: amountReturned,
            staffId: staffId,
            dateReturned: dateReturned,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable(table),
                    $$StockReturnsTableReferences(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: (
              {invoiceId = false, itemId = false, staffId = false}) {
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
                        $$StockReturnsTableReferences._invoiceIdTable(db),
                    referencedColumn:
                        $$StockReturnsTableReferences._invoiceIdTable(db).id,
                  ) as T;
                }
                if (itemId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.itemId,
                    referencedTable:
                        $$StockReturnsTableReferences._itemIdTable(db),
                    referencedColumn:
                        $$StockReturnsTableReferences._itemIdTable(db).id,
                  ) as T;
                }
                if (staffId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.staffId,
                    referencedTable:
                        $$StockReturnsTableReferences._staffIdTable(db),
                    referencedColumn:
                        $$StockReturnsTableReferences._staffIdTable(db).id,
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

typedef $$StockReturnsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $StockReturnsTable,
    StockReturnTable,
    $$StockReturnsTableFilterComposer,
    $$StockReturnsTableOrderingComposer,
    $$StockReturnsTableAnnotationComposer,
    $$StockReturnsTableCreateCompanionBuilder,
    $$StockReturnsTableUpdateCompanionBuilder,
    (StockReturnTable, $$StockReturnsTableReferences),
    StockReturnTable,
    PrefetchHooks Function({bool invoiceId, bool itemId, bool staffId})>;
typedef $$ExpensesTableCreateCompanionBuilder = ExpensesCompanion Function({
  Value<int> id,
  required double amount,
  required String description,
  Value<String?> category,
  Value<DateTime> date,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});
typedef $$ExpensesTableUpdateCompanionBuilder = ExpensesCompanion Function({
  Value<int> id,
  Value<double> amount,
  Value<String> description,
  Value<String?> category,
  Value<DateTime> date,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});

class $$ExpensesTableFilterComposer
    extends Composer<_$AppDatabase, $ExpensesTable> {
  $$ExpensesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get amount => $composableBuilder(
      column: $table.amount, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get category => $composableBuilder(
      column: $table.category, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get date => $composableBuilder(
      column: $table.date, builder: (column) => ColumnFilters(column));

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

class $$ExpensesTableOrderingComposer
    extends Composer<_$AppDatabase, $ExpensesTable> {
  $$ExpensesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get amount => $composableBuilder(
      column: $table.amount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get category => $composableBuilder(
      column: $table.category, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get date => $composableBuilder(
      column: $table.date, builder: (column) => ColumnOrderings(column));

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

class $$ExpensesTableAnnotationComposer
    extends Composer<_$AppDatabase, $ExpensesTable> {
  $$ExpensesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<double> get amount =>
      $composableBuilder(column: $table.amount, builder: (column) => column);

  GeneratedColumn<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => column);

  GeneratedColumn<String> get category =>
      $composableBuilder(column: $table.category, builder: (column) => column);

  GeneratedColumn<DateTime> get date =>
      $composableBuilder(column: $table.date, builder: (column) => column);

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

class $$ExpensesTableTableManager extends RootTableManager<
    _$AppDatabase,
    $ExpensesTable,
    ExpenseTable,
    $$ExpensesTableFilterComposer,
    $$ExpensesTableOrderingComposer,
    $$ExpensesTableAnnotationComposer,
    $$ExpensesTableCreateCompanionBuilder,
    $$ExpensesTableUpdateCompanionBuilder,
    (ExpenseTable, BaseReferences<_$AppDatabase, $ExpensesTable, ExpenseTable>),
    ExpenseTable,
    PrefetchHooks Function()> {
  $$ExpensesTableTableManager(_$AppDatabase db, $ExpensesTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ExpensesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ExpensesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$ExpensesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<double> amount = const Value.absent(),
            Value<String> description = const Value.absent(),
            Value<String?> category = const Value.absent(),
            Value<DateTime> date = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              ExpensesCompanion(
            id: id,
            amount: amount,
            description: description,
            category: category,
            date: date,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required double amount,
            required String description,
            Value<String?> category = const Value.absent(),
            Value<DateTime> date = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              ExpensesCompanion.insert(
            id: id,
            amount: amount,
            description: description,
            category: category,
            date: date,
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

typedef $$ExpensesTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $ExpensesTable,
    ExpenseTable,
    $$ExpensesTableFilterComposer,
    $$ExpensesTableOrderingComposer,
    $$ExpensesTableAnnotationComposer,
    $$ExpensesTableCreateCompanionBuilder,
    $$ExpensesTableUpdateCompanionBuilder,
    (ExpenseTable, BaseReferences<_$AppDatabase, $ExpensesTable, ExpenseTable>),
    ExpenseTable,
    PrefetchHooks Function()>;
typedef $$AcademicYearsTableCreateCompanionBuilder = AcademicYearsCompanion
    Function({
  Value<int> id,
  required String name,
  required DateTime startDate,
  required DateTime endDate,
  Value<bool> isCurrent,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});
typedef $$AcademicYearsTableUpdateCompanionBuilder = AcademicYearsCompanion
    Function({
  Value<int> id,
  Value<String> name,
  Value<DateTime> startDate,
  Value<DateTime> endDate,
  Value<bool> isCurrent,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});

final class $$AcademicYearsTableReferences extends BaseReferences<_$AppDatabase,
    $AcademicYearsTable, AcademicYearTable> {
  $$AcademicYearsTableReferences(
      super.$_db, super.$_table, super.$_typedResult);

  static MultiTypedResultKey<$TermsTable, List<TermTable>> _termsRefsTable(
          _$AppDatabase db) =>
      MultiTypedResultKey.fromTable(db.terms,
          aliasName: $_aliasNameGenerator(
              db.academicYears.id, db.terms.academicYearId));

  $$TermsTableProcessedTableManager get termsRefs {
    final manager = $$TermsTableTableManager($_db, $_db.terms)
        .filter((f) => f.academicYearId.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(_termsRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }

  static MultiTypedResultKey<$ResultsTable, List<ResultTable>>
      _resultsRefsTable(_$AppDatabase db) =>
          MultiTypedResultKey.fromTable(db.results,
              aliasName: $_aliasNameGenerator(
                  db.academicYears.id, db.results.academicYearId));

  $$ResultsTableProcessedTableManager get resultsRefs {
    final manager = $$ResultsTableTableManager($_db, $_db.results)
        .filter((f) => f.academicYearId.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(_resultsRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }
}

class $$AcademicYearsTableFilterComposer
    extends Composer<_$AppDatabase, $AcademicYearsTable> {
  $$AcademicYearsTableFilterComposer({
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

  ColumnFilters<DateTime> get startDate => $composableBuilder(
      column: $table.startDate, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get endDate => $composableBuilder(
      column: $table.endDate, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isCurrent => $composableBuilder(
      column: $table.isCurrent, builder: (column) => ColumnFilters(column));

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

  Expression<bool> termsRefs(
      Expression<bool> Function($$TermsTableFilterComposer f) f) {
    final $$TermsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.terms,
        getReferencedColumn: (t) => t.academicYearId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$TermsTableFilterComposer(
              $db: $db,
              $table: $db.terms,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<bool> resultsRefs(
      Expression<bool> Function($$ResultsTableFilterComposer f) f) {
    final $$ResultsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.results,
        getReferencedColumn: (t) => t.academicYearId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ResultsTableFilterComposer(
              $db: $db,
              $table: $db.results,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$AcademicYearsTableOrderingComposer
    extends Composer<_$AppDatabase, $AcademicYearsTable> {
  $$AcademicYearsTableOrderingComposer({
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

  ColumnOrderings<DateTime> get startDate => $composableBuilder(
      column: $table.startDate, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get endDate => $composableBuilder(
      column: $table.endDate, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isCurrent => $composableBuilder(
      column: $table.isCurrent, builder: (column) => ColumnOrderings(column));

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

class $$AcademicYearsTableAnnotationComposer
    extends Composer<_$AppDatabase, $AcademicYearsTable> {
  $$AcademicYearsTableAnnotationComposer({
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

  GeneratedColumn<DateTime> get startDate =>
      $composableBuilder(column: $table.startDate, builder: (column) => column);

  GeneratedColumn<DateTime> get endDate =>
      $composableBuilder(column: $table.endDate, builder: (column) => column);

  GeneratedColumn<bool> get isCurrent =>
      $composableBuilder(column: $table.isCurrent, builder: (column) => column);

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

  Expression<T> termsRefs<T extends Object>(
      Expression<T> Function($$TermsTableAnnotationComposer a) f) {
    final $$TermsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.terms,
        getReferencedColumn: (t) => t.academicYearId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$TermsTableAnnotationComposer(
              $db: $db,
              $table: $db.terms,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<T> resultsRefs<T extends Object>(
      Expression<T> Function($$ResultsTableAnnotationComposer a) f) {
    final $$ResultsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.results,
        getReferencedColumn: (t) => t.academicYearId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ResultsTableAnnotationComposer(
              $db: $db,
              $table: $db.results,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$AcademicYearsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $AcademicYearsTable,
    AcademicYearTable,
    $$AcademicYearsTableFilterComposer,
    $$AcademicYearsTableOrderingComposer,
    $$AcademicYearsTableAnnotationComposer,
    $$AcademicYearsTableCreateCompanionBuilder,
    $$AcademicYearsTableUpdateCompanionBuilder,
    (AcademicYearTable, $$AcademicYearsTableReferences),
    AcademicYearTable,
    PrefetchHooks Function({bool termsRefs, bool resultsRefs})> {
  $$AcademicYearsTableTableManager(_$AppDatabase db, $AcademicYearsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$AcademicYearsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$AcademicYearsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$AcademicYearsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> name = const Value.absent(),
            Value<DateTime> startDate = const Value.absent(),
            Value<DateTime> endDate = const Value.absent(),
            Value<bool> isCurrent = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              AcademicYearsCompanion(
            id: id,
            name: name,
            startDate: startDate,
            endDate: endDate,
            isCurrent: isCurrent,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String name,
            required DateTime startDate,
            required DateTime endDate,
            Value<bool> isCurrent = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              AcademicYearsCompanion.insert(
            id: id,
            name: name,
            startDate: startDate,
            endDate: endDate,
            isCurrent: isCurrent,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable(table),
                    $$AcademicYearsTableReferences(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: ({termsRefs = false, resultsRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [
                if (termsRefs) db.terms,
                if (resultsRefs) db.results
              ],
              addJoins: null,
              getPrefetchedDataCallback: (items) async {
                return [
                  if (termsRefs)
                    await $_getPrefetchedData<AcademicYearTable,
                            $AcademicYearsTable, TermTable>(
                        currentTable: table,
                        referencedTable:
                            $$AcademicYearsTableReferences._termsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$AcademicYearsTableReferences(db, table, p0)
                                .termsRefs,
                        referencedItemsForCurrentItem:
                            (item, referencedItems) => referencedItems
                                .where((e) => e.academicYearId == item.id),
                        typedResults: items),
                  if (resultsRefs)
                    await $_getPrefetchedData<AcademicYearTable,
                            $AcademicYearsTable, ResultTable>(
                        currentTable: table,
                        referencedTable: $$AcademicYearsTableReferences
                            ._resultsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$AcademicYearsTableReferences(db, table, p0)
                                .resultsRefs,
                        referencedItemsForCurrentItem:
                            (item, referencedItems) => referencedItems
                                .where((e) => e.academicYearId == item.id),
                        typedResults: items)
                ];
              },
            );
          },
        ));
}

typedef $$AcademicYearsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $AcademicYearsTable,
    AcademicYearTable,
    $$AcademicYearsTableFilterComposer,
    $$AcademicYearsTableOrderingComposer,
    $$AcademicYearsTableAnnotationComposer,
    $$AcademicYearsTableCreateCompanionBuilder,
    $$AcademicYearsTableUpdateCompanionBuilder,
    (AcademicYearTable, $$AcademicYearsTableReferences),
    AcademicYearTable,
    PrefetchHooks Function({bool termsRefs, bool resultsRefs})>;
typedef $$TermsTableCreateCompanionBuilder = TermsCompanion Function({
  Value<int> id,
  required int academicYearId,
  required String name,
  required DateTime startDate,
  required DateTime endDate,
  Value<bool> isCurrent,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});
typedef $$TermsTableUpdateCompanionBuilder = TermsCompanion Function({
  Value<int> id,
  Value<int> academicYearId,
  Value<String> name,
  Value<DateTime> startDate,
  Value<DateTime> endDate,
  Value<bool> isCurrent,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});

final class $$TermsTableReferences
    extends BaseReferences<_$AppDatabase, $TermsTable, TermTable> {
  $$TermsTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static $AcademicYearsTable _academicYearIdTable(_$AppDatabase db) =>
      db.academicYears.createAlias(
          $_aliasNameGenerator(db.terms.academicYearId, db.academicYears.id));

  $$AcademicYearsTableProcessedTableManager get academicYearId {
    final $_column = $_itemColumn<int>('academic_year_id')!;

    final manager = $$AcademicYearsTableTableManager($_db, $_db.academicYears)
        .filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_academicYearIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static MultiTypedResultKey<$ResultsTable, List<ResultTable>>
      _resultsRefsTable(_$AppDatabase db) =>
          MultiTypedResultKey.fromTable(db.results,
              aliasName: $_aliasNameGenerator(db.terms.id, db.results.termId));

  $$ResultsTableProcessedTableManager get resultsRefs {
    final manager = $$ResultsTableTableManager($_db, $_db.results)
        .filter((f) => f.termId.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(_resultsRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }
}

class $$TermsTableFilterComposer extends Composer<_$AppDatabase, $TermsTable> {
  $$TermsTableFilterComposer({
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

  ColumnFilters<DateTime> get startDate => $composableBuilder(
      column: $table.startDate, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get endDate => $composableBuilder(
      column: $table.endDate, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isCurrent => $composableBuilder(
      column: $table.isCurrent, builder: (column) => ColumnFilters(column));

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

  $$AcademicYearsTableFilterComposer get academicYearId {
    final $$AcademicYearsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.academicYearId,
        referencedTable: $db.academicYears,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$AcademicYearsTableFilterComposer(
              $db: $db,
              $table: $db.academicYears,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  Expression<bool> resultsRefs(
      Expression<bool> Function($$ResultsTableFilterComposer f) f) {
    final $$ResultsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.results,
        getReferencedColumn: (t) => t.termId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ResultsTableFilterComposer(
              $db: $db,
              $table: $db.results,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$TermsTableOrderingComposer
    extends Composer<_$AppDatabase, $TermsTable> {
  $$TermsTableOrderingComposer({
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

  ColumnOrderings<DateTime> get startDate => $composableBuilder(
      column: $table.startDate, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get endDate => $composableBuilder(
      column: $table.endDate, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isCurrent => $composableBuilder(
      column: $table.isCurrent, builder: (column) => ColumnOrderings(column));

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

  $$AcademicYearsTableOrderingComposer get academicYearId {
    final $$AcademicYearsTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.academicYearId,
        referencedTable: $db.academicYears,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$AcademicYearsTableOrderingComposer(
              $db: $db,
              $table: $db.academicYears,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$TermsTableAnnotationComposer
    extends Composer<_$AppDatabase, $TermsTable> {
  $$TermsTableAnnotationComposer({
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

  GeneratedColumn<DateTime> get startDate =>
      $composableBuilder(column: $table.startDate, builder: (column) => column);

  GeneratedColumn<DateTime> get endDate =>
      $composableBuilder(column: $table.endDate, builder: (column) => column);

  GeneratedColumn<bool> get isCurrent =>
      $composableBuilder(column: $table.isCurrent, builder: (column) => column);

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

  $$AcademicYearsTableAnnotationComposer get academicYearId {
    final $$AcademicYearsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.academicYearId,
        referencedTable: $db.academicYears,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$AcademicYearsTableAnnotationComposer(
              $db: $db,
              $table: $db.academicYears,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  Expression<T> resultsRefs<T extends Object>(
      Expression<T> Function($$ResultsTableAnnotationComposer a) f) {
    final $$ResultsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.results,
        getReferencedColumn: (t) => t.termId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ResultsTableAnnotationComposer(
              $db: $db,
              $table: $db.results,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$TermsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $TermsTable,
    TermTable,
    $$TermsTableFilterComposer,
    $$TermsTableOrderingComposer,
    $$TermsTableAnnotationComposer,
    $$TermsTableCreateCompanionBuilder,
    $$TermsTableUpdateCompanionBuilder,
    (TermTable, $$TermsTableReferences),
    TermTable,
    PrefetchHooks Function({bool academicYearId, bool resultsRefs})> {
  $$TermsTableTableManager(_$AppDatabase db, $TermsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$TermsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$TermsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$TermsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<int> academicYearId = const Value.absent(),
            Value<String> name = const Value.absent(),
            Value<DateTime> startDate = const Value.absent(),
            Value<DateTime> endDate = const Value.absent(),
            Value<bool> isCurrent = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              TermsCompanion(
            id: id,
            academicYearId: academicYearId,
            name: name,
            startDate: startDate,
            endDate: endDate,
            isCurrent: isCurrent,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required int academicYearId,
            required String name,
            required DateTime startDate,
            required DateTime endDate,
            Value<bool> isCurrent = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              TermsCompanion.insert(
            id: id,
            academicYearId: academicYearId,
            name: name,
            startDate: startDate,
            endDate: endDate,
            isCurrent: isCurrent,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) =>
                  (e.readTable(table), $$TermsTableReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: (
              {academicYearId = false, resultsRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [if (resultsRefs) db.results],
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
                if (academicYearId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.academicYearId,
                    referencedTable:
                        $$TermsTableReferences._academicYearIdTable(db),
                    referencedColumn:
                        $$TermsTableReferences._academicYearIdTable(db).id,
                  ) as T;
                }

                return state;
              },
              getPrefetchedDataCallback: (items) async {
                return [
                  if (resultsRefs)
                    await $_getPrefetchedData<TermTable, $TermsTable,
                            ResultTable>(
                        currentTable: table,
                        referencedTable:
                            $$TermsTableReferences._resultsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$TermsTableReferences(db, table, p0).resultsRefs,
                        referencedItemsForCurrentItem: (item,
                                referencedItems) =>
                            referencedItems.where((e) => e.termId == item.id),
                        typedResults: items)
                ];
              },
            );
          },
        ));
}

typedef $$TermsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $TermsTable,
    TermTable,
    $$TermsTableFilterComposer,
    $$TermsTableOrderingComposer,
    $$TermsTableAnnotationComposer,
    $$TermsTableCreateCompanionBuilder,
    $$TermsTableUpdateCompanionBuilder,
    (TermTable, $$TermsTableReferences),
    TermTable,
    PrefetchHooks Function({bool academicYearId, bool resultsRefs})>;
typedef $$ClassesTableCreateCompanionBuilder = ClassesCompanion Function({
  Value<int> id,
  required String name,
  Value<String?> description,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});
typedef $$ClassesTableUpdateCompanionBuilder = ClassesCompanion Function({
  Value<int> id,
  Value<String> name,
  Value<String?> description,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});

final class $$ClassesTableReferences
    extends BaseReferences<_$AppDatabase, $ClassesTable, ClassTable> {
  $$ClassesTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static MultiTypedResultKey<$StudentsTable, List<Student>> _studentsRefsTable(
          _$AppDatabase db) =>
      MultiTypedResultKey.fromTable(db.students,
          aliasName: $_aliasNameGenerator(db.classes.id, db.students.classId));

  $$StudentsTableProcessedTableManager get studentsRefs {
    final manager = $$StudentsTableTableManager($_db, $_db.students)
        .filter((f) => f.classId.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(_studentsRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }

  static MultiTypedResultKey<$TeachersTable, List<Teacher>> _teachersRefsTable(
          _$AppDatabase db) =>
      MultiTypedResultKey.fromTable(db.teachers,
          aliasName: $_aliasNameGenerator(db.classes.id, db.teachers.classId));

  $$TeachersTableProcessedTableManager get teachersRefs {
    final manager = $$TeachersTableTableManager($_db, $_db.teachers)
        .filter((f) => f.classId.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(_teachersRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }
}

class $$ClassesTableFilterComposer
    extends Composer<_$AppDatabase, $ClassesTable> {
  $$ClassesTableFilterComposer({
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

  ColumnFilters<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => ColumnFilters(column));

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

  Expression<bool> studentsRefs(
      Expression<bool> Function($$StudentsTableFilterComposer f) f) {
    final $$StudentsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.students,
        getReferencedColumn: (t) => t.classId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$StudentsTableFilterComposer(
              $db: $db,
              $table: $db.students,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<bool> teachersRefs(
      Expression<bool> Function($$TeachersTableFilterComposer f) f) {
    final $$TeachersTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.teachers,
        getReferencedColumn: (t) => t.classId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$TeachersTableFilterComposer(
              $db: $db,
              $table: $db.teachers,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$ClassesTableOrderingComposer
    extends Composer<_$AppDatabase, $ClassesTable> {
  $$ClassesTableOrderingComposer({
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

  ColumnOrderings<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => ColumnOrderings(column));

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

class $$ClassesTableAnnotationComposer
    extends Composer<_$AppDatabase, $ClassesTable> {
  $$ClassesTableAnnotationComposer({
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

  GeneratedColumn<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => column);

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

  Expression<T> studentsRefs<T extends Object>(
      Expression<T> Function($$StudentsTableAnnotationComposer a) f) {
    final $$StudentsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.students,
        getReferencedColumn: (t) => t.classId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$StudentsTableAnnotationComposer(
              $db: $db,
              $table: $db.students,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<T> teachersRefs<T extends Object>(
      Expression<T> Function($$TeachersTableAnnotationComposer a) f) {
    final $$TeachersTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.teachers,
        getReferencedColumn: (t) => t.classId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$TeachersTableAnnotationComposer(
              $db: $db,
              $table: $db.teachers,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$ClassesTableTableManager extends RootTableManager<
    _$AppDatabase,
    $ClassesTable,
    ClassTable,
    $$ClassesTableFilterComposer,
    $$ClassesTableOrderingComposer,
    $$ClassesTableAnnotationComposer,
    $$ClassesTableCreateCompanionBuilder,
    $$ClassesTableUpdateCompanionBuilder,
    (ClassTable, $$ClassesTableReferences),
    ClassTable,
    PrefetchHooks Function({bool studentsRefs, bool teachersRefs})> {
  $$ClassesTableTableManager(_$AppDatabase db, $ClassesTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ClassesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ClassesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$ClassesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> name = const Value.absent(),
            Value<String?> description = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              ClassesCompanion(
            id: id,
            name: name,
            description: description,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String name,
            Value<String?> description = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              ClassesCompanion.insert(
            id: id,
            name: name,
            description: description,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) =>
                  (e.readTable(table), $$ClassesTableReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: (
              {studentsRefs = false, teachersRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [
                if (studentsRefs) db.students,
                if (teachersRefs) db.teachers
              ],
              addJoins: null,
              getPrefetchedDataCallback: (items) async {
                return [
                  if (studentsRefs)
                    await $_getPrefetchedData<ClassTable, $ClassesTable,
                            Student>(
                        currentTable: table,
                        referencedTable:
                            $$ClassesTableReferences._studentsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$ClassesTableReferences(db, table, p0)
                                .studentsRefs,
                        referencedItemsForCurrentItem: (item,
                                referencedItems) =>
                            referencedItems.where((e) => e.classId == item.id),
                        typedResults: items),
                  if (teachersRefs)
                    await $_getPrefetchedData<ClassTable, $ClassesTable,
                            Teacher>(
                        currentTable: table,
                        referencedTable:
                            $$ClassesTableReferences._teachersRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$ClassesTableReferences(db, table, p0)
                                .teachersRefs,
                        referencedItemsForCurrentItem: (item,
                                referencedItems) =>
                            referencedItems.where((e) => e.classId == item.id),
                        typedResults: items)
                ];
              },
            );
          },
        ));
}

typedef $$ClassesTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $ClassesTable,
    ClassTable,
    $$ClassesTableFilterComposer,
    $$ClassesTableOrderingComposer,
    $$ClassesTableAnnotationComposer,
    $$ClassesTableCreateCompanionBuilder,
    $$ClassesTableUpdateCompanionBuilder,
    (ClassTable, $$ClassesTableReferences),
    ClassTable,
    PrefetchHooks Function({bool studentsRefs, bool teachersRefs})>;
typedef $$StudentsTableCreateCompanionBuilder = StudentsCompanion Function({
  Value<int> id,
  required String admissionNumber,
  required String firstName,
  required String lastName,
  required int classId,
  Value<String?> parentName,
  Value<String?> parentPhone,
  Value<double> balance,
  Value<DateTime?> dateOfBirth,
  Value<DateTime> registrationDate,
  Value<Uint8List?> image,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});
typedef $$StudentsTableUpdateCompanionBuilder = StudentsCompanion Function({
  Value<int> id,
  Value<String> admissionNumber,
  Value<String> firstName,
  Value<String> lastName,
  Value<int> classId,
  Value<String?> parentName,
  Value<String?> parentPhone,
  Value<double> balance,
  Value<DateTime?> dateOfBirth,
  Value<DateTime> registrationDate,
  Value<Uint8List?> image,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});

final class $$StudentsTableReferences
    extends BaseReferences<_$AppDatabase, $StudentsTable, Student> {
  $$StudentsTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static $ClassesTable _classIdTable(_$AppDatabase db) => db.classes
      .createAlias($_aliasNameGenerator(db.students.classId, db.classes.id));

  $$ClassesTableProcessedTableManager get classId {
    final $_column = $_itemColumn<int>('class_id')!;

    final manager = $$ClassesTableTableManager($_db, $_db.classes)
        .filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_classIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static MultiTypedResultKey<$ResultsTable, List<ResultTable>>
      _resultsRefsTable(_$AppDatabase db) =>
          MultiTypedResultKey.fromTable(db.results,
              aliasName:
                  $_aliasNameGenerator(db.students.id, db.results.studentId));

  $$ResultsTableProcessedTableManager get resultsRefs {
    final manager = $$ResultsTableTableManager($_db, $_db.results)
        .filter((f) => f.studentId.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(_resultsRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }
}

class $$StudentsTableFilterComposer
    extends Composer<_$AppDatabase, $StudentsTable> {
  $$StudentsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get admissionNumber => $composableBuilder(
      column: $table.admissionNumber,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get firstName => $composableBuilder(
      column: $table.firstName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lastName => $composableBuilder(
      column: $table.lastName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get parentName => $composableBuilder(
      column: $table.parentName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get parentPhone => $composableBuilder(
      column: $table.parentPhone, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get balance => $composableBuilder(
      column: $table.balance, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get dateOfBirth => $composableBuilder(
      column: $table.dateOfBirth, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get registrationDate => $composableBuilder(
      column: $table.registrationDate,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<Uint8List> get image => $composableBuilder(
      column: $table.image, builder: (column) => ColumnFilters(column));

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

  $$ClassesTableFilterComposer get classId {
    final $$ClassesTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.classId,
        referencedTable: $db.classes,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ClassesTableFilterComposer(
              $db: $db,
              $table: $db.classes,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  Expression<bool> resultsRefs(
      Expression<bool> Function($$ResultsTableFilterComposer f) f) {
    final $$ResultsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.results,
        getReferencedColumn: (t) => t.studentId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ResultsTableFilterComposer(
              $db: $db,
              $table: $db.results,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$StudentsTableOrderingComposer
    extends Composer<_$AppDatabase, $StudentsTable> {
  $$StudentsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get admissionNumber => $composableBuilder(
      column: $table.admissionNumber,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get firstName => $composableBuilder(
      column: $table.firstName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lastName => $composableBuilder(
      column: $table.lastName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get parentName => $composableBuilder(
      column: $table.parentName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get parentPhone => $composableBuilder(
      column: $table.parentPhone, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get balance => $composableBuilder(
      column: $table.balance, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get dateOfBirth => $composableBuilder(
      column: $table.dateOfBirth, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get registrationDate => $composableBuilder(
      column: $table.registrationDate,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<Uint8List> get image => $composableBuilder(
      column: $table.image, builder: (column) => ColumnOrderings(column));

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

  $$ClassesTableOrderingComposer get classId {
    final $$ClassesTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.classId,
        referencedTable: $db.classes,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ClassesTableOrderingComposer(
              $db: $db,
              $table: $db.classes,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$StudentsTableAnnotationComposer
    extends Composer<_$AppDatabase, $StudentsTable> {
  $$StudentsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get admissionNumber => $composableBuilder(
      column: $table.admissionNumber, builder: (column) => column);

  GeneratedColumn<String> get firstName =>
      $composableBuilder(column: $table.firstName, builder: (column) => column);

  GeneratedColumn<String> get lastName =>
      $composableBuilder(column: $table.lastName, builder: (column) => column);

  GeneratedColumn<String> get parentName => $composableBuilder(
      column: $table.parentName, builder: (column) => column);

  GeneratedColumn<String> get parentPhone => $composableBuilder(
      column: $table.parentPhone, builder: (column) => column);

  GeneratedColumn<double> get balance =>
      $composableBuilder(column: $table.balance, builder: (column) => column);

  GeneratedColumn<DateTime> get dateOfBirth => $composableBuilder(
      column: $table.dateOfBirth, builder: (column) => column);

  GeneratedColumn<DateTime> get registrationDate => $composableBuilder(
      column: $table.registrationDate, builder: (column) => column);

  GeneratedColumn<Uint8List> get image =>
      $composableBuilder(column: $table.image, builder: (column) => column);

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

  $$ClassesTableAnnotationComposer get classId {
    final $$ClassesTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.classId,
        referencedTable: $db.classes,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ClassesTableAnnotationComposer(
              $db: $db,
              $table: $db.classes,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  Expression<T> resultsRefs<T extends Object>(
      Expression<T> Function($$ResultsTableAnnotationComposer a) f) {
    final $$ResultsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.results,
        getReferencedColumn: (t) => t.studentId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ResultsTableAnnotationComposer(
              $db: $db,
              $table: $db.results,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$StudentsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $StudentsTable,
    Student,
    $$StudentsTableFilterComposer,
    $$StudentsTableOrderingComposer,
    $$StudentsTableAnnotationComposer,
    $$StudentsTableCreateCompanionBuilder,
    $$StudentsTableUpdateCompanionBuilder,
    (Student, $$StudentsTableReferences),
    Student,
    PrefetchHooks Function({bool classId, bool resultsRefs})> {
  $$StudentsTableTableManager(_$AppDatabase db, $StudentsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$StudentsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$StudentsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$StudentsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> admissionNumber = const Value.absent(),
            Value<String> firstName = const Value.absent(),
            Value<String> lastName = const Value.absent(),
            Value<int> classId = const Value.absent(),
            Value<String?> parentName = const Value.absent(),
            Value<String?> parentPhone = const Value.absent(),
            Value<double> balance = const Value.absent(),
            Value<DateTime?> dateOfBirth = const Value.absent(),
            Value<DateTime> registrationDate = const Value.absent(),
            Value<Uint8List?> image = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              StudentsCompanion(
            id: id,
            admissionNumber: admissionNumber,
            firstName: firstName,
            lastName: lastName,
            classId: classId,
            parentName: parentName,
            parentPhone: parentPhone,
            balance: balance,
            dateOfBirth: dateOfBirth,
            registrationDate: registrationDate,
            image: image,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String admissionNumber,
            required String firstName,
            required String lastName,
            required int classId,
            Value<String?> parentName = const Value.absent(),
            Value<String?> parentPhone = const Value.absent(),
            Value<double> balance = const Value.absent(),
            Value<DateTime?> dateOfBirth = const Value.absent(),
            Value<DateTime> registrationDate = const Value.absent(),
            Value<Uint8List?> image = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              StudentsCompanion.insert(
            id: id,
            admissionNumber: admissionNumber,
            firstName: firstName,
            lastName: lastName,
            classId: classId,
            parentName: parentName,
            parentPhone: parentPhone,
            balance: balance,
            dateOfBirth: dateOfBirth,
            registrationDate: registrationDate,
            image: image,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) =>
                  (e.readTable(table), $$StudentsTableReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: ({classId = false, resultsRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [if (resultsRefs) db.results],
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
                if (classId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.classId,
                    referencedTable:
                        $$StudentsTableReferences._classIdTable(db),
                    referencedColumn:
                        $$StudentsTableReferences._classIdTable(db).id,
                  ) as T;
                }

                return state;
              },
              getPrefetchedDataCallback: (items) async {
                return [
                  if (resultsRefs)
                    await $_getPrefetchedData<Student, $StudentsTable,
                            ResultTable>(
                        currentTable: table,
                        referencedTable:
                            $$StudentsTableReferences._resultsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$StudentsTableReferences(db, table, p0)
                                .resultsRefs,
                        referencedItemsForCurrentItem:
                            (item, referencedItems) => referencedItems
                                .where((e) => e.studentId == item.id),
                        typedResults: items)
                ];
              },
            );
          },
        ));
}

typedef $$StudentsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $StudentsTable,
    Student,
    $$StudentsTableFilterComposer,
    $$StudentsTableOrderingComposer,
    $$StudentsTableAnnotationComposer,
    $$StudentsTableCreateCompanionBuilder,
    $$StudentsTableUpdateCompanionBuilder,
    (Student, $$StudentsTableReferences),
    Student,
    PrefetchHooks Function({bool classId, bool resultsRefs})>;
typedef $$BusinessSettingsTableCreateCompanionBuilder
    = BusinessSettingsCompanion Function({
  Value<int> id,
  Value<String> businessMode,
  Value<DateTime?> updatedAt,
});
typedef $$BusinessSettingsTableUpdateCompanionBuilder
    = BusinessSettingsCompanion Function({
  Value<int> id,
  Value<String> businessMode,
  Value<DateTime?> updatedAt,
});

class $$BusinessSettingsTableFilterComposer
    extends Composer<_$AppDatabase, $BusinessSettingsTable> {
  $$BusinessSettingsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get businessMode => $composableBuilder(
      column: $table.businessMode, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));
}

class $$BusinessSettingsTableOrderingComposer
    extends Composer<_$AppDatabase, $BusinessSettingsTable> {
  $$BusinessSettingsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get businessMode => $composableBuilder(
      column: $table.businessMode,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));
}

class $$BusinessSettingsTableAnnotationComposer
    extends Composer<_$AppDatabase, $BusinessSettingsTable> {
  $$BusinessSettingsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get businessMode => $composableBuilder(
      column: $table.businessMode, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$BusinessSettingsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $BusinessSettingsTable,
    BusinessSettingTable,
    $$BusinessSettingsTableFilterComposer,
    $$BusinessSettingsTableOrderingComposer,
    $$BusinessSettingsTableAnnotationComposer,
    $$BusinessSettingsTableCreateCompanionBuilder,
    $$BusinessSettingsTableUpdateCompanionBuilder,
    (
      BusinessSettingTable,
      BaseReferences<_$AppDatabase, $BusinessSettingsTable,
          BusinessSettingTable>
    ),
    BusinessSettingTable,
    PrefetchHooks Function()> {
  $$BusinessSettingsTableTableManager(
      _$AppDatabase db, $BusinessSettingsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$BusinessSettingsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$BusinessSettingsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$BusinessSettingsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> businessMode = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
          }) =>
              BusinessSettingsCompanion(
            id: id,
            businessMode: businessMode,
            updatedAt: updatedAt,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> businessMode = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
          }) =>
              BusinessSettingsCompanion.insert(
            id: id,
            businessMode: businessMode,
            updatedAt: updatedAt,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$BusinessSettingsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $BusinessSettingsTable,
    BusinessSettingTable,
    $$BusinessSettingsTableFilterComposer,
    $$BusinessSettingsTableOrderingComposer,
    $$BusinessSettingsTableAnnotationComposer,
    $$BusinessSettingsTableCreateCompanionBuilder,
    $$BusinessSettingsTableUpdateCompanionBuilder,
    (
      BusinessSettingTable,
      BaseReferences<_$AppDatabase, $BusinessSettingsTable,
          BusinessSettingTable>
    ),
    BusinessSettingTable,
    PrefetchHooks Function()>;
typedef $$TeachersTableCreateCompanionBuilder = TeachersCompanion Function({
  Value<int> id,
  required String fullName,
  Value<String?> phone,
  Value<String?> profession,
  Value<int?> classId,
  Value<double> salary,
  Value<int> yearsInSchool,
  Value<DateTime> employmentDate,
  Value<String?> certificates,
  Value<Uint8List?> image,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});
typedef $$TeachersTableUpdateCompanionBuilder = TeachersCompanion Function({
  Value<int> id,
  Value<String> fullName,
  Value<String?> phone,
  Value<String?> profession,
  Value<int?> classId,
  Value<double> salary,
  Value<int> yearsInSchool,
  Value<DateTime> employmentDate,
  Value<String?> certificates,
  Value<Uint8List?> image,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});

final class $$TeachersTableReferences
    extends BaseReferences<_$AppDatabase, $TeachersTable, Teacher> {
  $$TeachersTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static $ClassesTable _classIdTable(_$AppDatabase db) => db.classes
      .createAlias($_aliasNameGenerator(db.teachers.classId, db.classes.id));

  $$ClassesTableProcessedTableManager? get classId {
    final $_column = $_itemColumn<int>('class_id');
    if ($_column == null) return null;
    final manager = $$ClassesTableTableManager($_db, $_db.classes)
        .filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_classIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static MultiTypedResultKey<$SubjectsTable, List<SubjectTable>>
      _subjectsRefsTable(_$AppDatabase db) =>
          MultiTypedResultKey.fromTable(db.subjects,
              aliasName:
                  $_aliasNameGenerator(db.teachers.id, db.subjects.teacherId));

  $$SubjectsTableProcessedTableManager get subjectsRefs {
    final manager = $$SubjectsTableTableManager($_db, $_db.subjects)
        .filter((f) => f.teacherId.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(_subjectsRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }
}

class $$TeachersTableFilterComposer
    extends Composer<_$AppDatabase, $TeachersTable> {
  $$TeachersTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get fullName => $composableBuilder(
      column: $table.fullName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get phone => $composableBuilder(
      column: $table.phone, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get profession => $composableBuilder(
      column: $table.profession, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get salary => $composableBuilder(
      column: $table.salary, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get yearsInSchool => $composableBuilder(
      column: $table.yearsInSchool, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get employmentDate => $composableBuilder(
      column: $table.employmentDate,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get certificates => $composableBuilder(
      column: $table.certificates, builder: (column) => ColumnFilters(column));

  ColumnFilters<Uint8List> get image => $composableBuilder(
      column: $table.image, builder: (column) => ColumnFilters(column));

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

  $$ClassesTableFilterComposer get classId {
    final $$ClassesTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.classId,
        referencedTable: $db.classes,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ClassesTableFilterComposer(
              $db: $db,
              $table: $db.classes,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  Expression<bool> subjectsRefs(
      Expression<bool> Function($$SubjectsTableFilterComposer f) f) {
    final $$SubjectsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.subjects,
        getReferencedColumn: (t) => t.teacherId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$SubjectsTableFilterComposer(
              $db: $db,
              $table: $db.subjects,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$TeachersTableOrderingComposer
    extends Composer<_$AppDatabase, $TeachersTable> {
  $$TeachersTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get fullName => $composableBuilder(
      column: $table.fullName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get phone => $composableBuilder(
      column: $table.phone, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get profession => $composableBuilder(
      column: $table.profession, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get salary => $composableBuilder(
      column: $table.salary, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get yearsInSchool => $composableBuilder(
      column: $table.yearsInSchool,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get employmentDate => $composableBuilder(
      column: $table.employmentDate,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get certificates => $composableBuilder(
      column: $table.certificates,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<Uint8List> get image => $composableBuilder(
      column: $table.image, builder: (column) => ColumnOrderings(column));

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

  $$ClassesTableOrderingComposer get classId {
    final $$ClassesTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.classId,
        referencedTable: $db.classes,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ClassesTableOrderingComposer(
              $db: $db,
              $table: $db.classes,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$TeachersTableAnnotationComposer
    extends Composer<_$AppDatabase, $TeachersTable> {
  $$TeachersTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get fullName =>
      $composableBuilder(column: $table.fullName, builder: (column) => column);

  GeneratedColumn<String> get phone =>
      $composableBuilder(column: $table.phone, builder: (column) => column);

  GeneratedColumn<String> get profession => $composableBuilder(
      column: $table.profession, builder: (column) => column);

  GeneratedColumn<double> get salary =>
      $composableBuilder(column: $table.salary, builder: (column) => column);

  GeneratedColumn<int> get yearsInSchool => $composableBuilder(
      column: $table.yearsInSchool, builder: (column) => column);

  GeneratedColumn<DateTime> get employmentDate => $composableBuilder(
      column: $table.employmentDate, builder: (column) => column);

  GeneratedColumn<String> get certificates => $composableBuilder(
      column: $table.certificates, builder: (column) => column);

  GeneratedColumn<Uint8List> get image =>
      $composableBuilder(column: $table.image, builder: (column) => column);

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

  $$ClassesTableAnnotationComposer get classId {
    final $$ClassesTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.classId,
        referencedTable: $db.classes,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ClassesTableAnnotationComposer(
              $db: $db,
              $table: $db.classes,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  Expression<T> subjectsRefs<T extends Object>(
      Expression<T> Function($$SubjectsTableAnnotationComposer a) f) {
    final $$SubjectsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.subjects,
        getReferencedColumn: (t) => t.teacherId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$SubjectsTableAnnotationComposer(
              $db: $db,
              $table: $db.subjects,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$TeachersTableTableManager extends RootTableManager<
    _$AppDatabase,
    $TeachersTable,
    Teacher,
    $$TeachersTableFilterComposer,
    $$TeachersTableOrderingComposer,
    $$TeachersTableAnnotationComposer,
    $$TeachersTableCreateCompanionBuilder,
    $$TeachersTableUpdateCompanionBuilder,
    (Teacher, $$TeachersTableReferences),
    Teacher,
    PrefetchHooks Function({bool classId, bool subjectsRefs})> {
  $$TeachersTableTableManager(_$AppDatabase db, $TeachersTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$TeachersTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$TeachersTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$TeachersTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> fullName = const Value.absent(),
            Value<String?> phone = const Value.absent(),
            Value<String?> profession = const Value.absent(),
            Value<int?> classId = const Value.absent(),
            Value<double> salary = const Value.absent(),
            Value<int> yearsInSchool = const Value.absent(),
            Value<DateTime> employmentDate = const Value.absent(),
            Value<String?> certificates = const Value.absent(),
            Value<Uint8List?> image = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              TeachersCompanion(
            id: id,
            fullName: fullName,
            phone: phone,
            profession: profession,
            classId: classId,
            salary: salary,
            yearsInSchool: yearsInSchool,
            employmentDate: employmentDate,
            certificates: certificates,
            image: image,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String fullName,
            Value<String?> phone = const Value.absent(),
            Value<String?> profession = const Value.absent(),
            Value<int?> classId = const Value.absent(),
            Value<double> salary = const Value.absent(),
            Value<int> yearsInSchool = const Value.absent(),
            Value<DateTime> employmentDate = const Value.absent(),
            Value<String?> certificates = const Value.absent(),
            Value<Uint8List?> image = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              TeachersCompanion.insert(
            id: id,
            fullName: fullName,
            phone: phone,
            profession: profession,
            classId: classId,
            salary: salary,
            yearsInSchool: yearsInSchool,
            employmentDate: employmentDate,
            certificates: certificates,
            image: image,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) =>
                  (e.readTable(table), $$TeachersTableReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: ({classId = false, subjectsRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [if (subjectsRefs) db.subjects],
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
                if (classId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.classId,
                    referencedTable:
                        $$TeachersTableReferences._classIdTable(db),
                    referencedColumn:
                        $$TeachersTableReferences._classIdTable(db).id,
                  ) as T;
                }

                return state;
              },
              getPrefetchedDataCallback: (items) async {
                return [
                  if (subjectsRefs)
                    await $_getPrefetchedData<Teacher, $TeachersTable,
                            SubjectTable>(
                        currentTable: table,
                        referencedTable:
                            $$TeachersTableReferences._subjectsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$TeachersTableReferences(db, table, p0)
                                .subjectsRefs,
                        referencedItemsForCurrentItem:
                            (item, referencedItems) => referencedItems
                                .where((e) => e.teacherId == item.id),
                        typedResults: items)
                ];
              },
            );
          },
        ));
}

typedef $$TeachersTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $TeachersTable,
    Teacher,
    $$TeachersTableFilterComposer,
    $$TeachersTableOrderingComposer,
    $$TeachersTableAnnotationComposer,
    $$TeachersTableCreateCompanionBuilder,
    $$TeachersTableUpdateCompanionBuilder,
    (Teacher, $$TeachersTableReferences),
    Teacher,
    PrefetchHooks Function({bool classId, bool subjectsRefs})>;
typedef $$SubjectsTableCreateCompanionBuilder = SubjectsCompanion Function({
  Value<int> id,
  required String name,
  Value<String?> code,
  Value<int?> teacherId,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});
typedef $$SubjectsTableUpdateCompanionBuilder = SubjectsCompanion Function({
  Value<int> id,
  Value<String> name,
  Value<String?> code,
  Value<int?> teacherId,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});

final class $$SubjectsTableReferences
    extends BaseReferences<_$AppDatabase, $SubjectsTable, SubjectTable> {
  $$SubjectsTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static $TeachersTable _teacherIdTable(_$AppDatabase db) => db.teachers
      .createAlias($_aliasNameGenerator(db.subjects.teacherId, db.teachers.id));

  $$TeachersTableProcessedTableManager? get teacherId {
    final $_column = $_itemColumn<int>('teacher_id');
    if ($_column == null) return null;
    final manager = $$TeachersTableTableManager($_db, $_db.teachers)
        .filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_teacherIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static MultiTypedResultKey<$ResultsTable, List<ResultTable>>
      _resultsRefsTable(_$AppDatabase db) =>
          MultiTypedResultKey.fromTable(db.results,
              aliasName:
                  $_aliasNameGenerator(db.subjects.id, db.results.subjectId));

  $$ResultsTableProcessedTableManager get resultsRefs {
    final manager = $$ResultsTableTableManager($_db, $_db.results)
        .filter((f) => f.subjectId.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(_resultsRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }
}

class $$SubjectsTableFilterComposer
    extends Composer<_$AppDatabase, $SubjectsTable> {
  $$SubjectsTableFilterComposer({
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

  ColumnFilters<String> get code => $composableBuilder(
      column: $table.code, builder: (column) => ColumnFilters(column));

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

  $$TeachersTableFilterComposer get teacherId {
    final $$TeachersTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.teacherId,
        referencedTable: $db.teachers,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$TeachersTableFilterComposer(
              $db: $db,
              $table: $db.teachers,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  Expression<bool> resultsRefs(
      Expression<bool> Function($$ResultsTableFilterComposer f) f) {
    final $$ResultsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.results,
        getReferencedColumn: (t) => t.subjectId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ResultsTableFilterComposer(
              $db: $db,
              $table: $db.results,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$SubjectsTableOrderingComposer
    extends Composer<_$AppDatabase, $SubjectsTable> {
  $$SubjectsTableOrderingComposer({
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

  ColumnOrderings<String> get code => $composableBuilder(
      column: $table.code, builder: (column) => ColumnOrderings(column));

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

  $$TeachersTableOrderingComposer get teacherId {
    final $$TeachersTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.teacherId,
        referencedTable: $db.teachers,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$TeachersTableOrderingComposer(
              $db: $db,
              $table: $db.teachers,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$SubjectsTableAnnotationComposer
    extends Composer<_$AppDatabase, $SubjectsTable> {
  $$SubjectsTableAnnotationComposer({
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

  GeneratedColumn<String> get code =>
      $composableBuilder(column: $table.code, builder: (column) => column);

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

  $$TeachersTableAnnotationComposer get teacherId {
    final $$TeachersTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.teacherId,
        referencedTable: $db.teachers,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$TeachersTableAnnotationComposer(
              $db: $db,
              $table: $db.teachers,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  Expression<T> resultsRefs<T extends Object>(
      Expression<T> Function($$ResultsTableAnnotationComposer a) f) {
    final $$ResultsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.results,
        getReferencedColumn: (t) => t.subjectId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ResultsTableAnnotationComposer(
              $db: $db,
              $table: $db.results,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$SubjectsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $SubjectsTable,
    SubjectTable,
    $$SubjectsTableFilterComposer,
    $$SubjectsTableOrderingComposer,
    $$SubjectsTableAnnotationComposer,
    $$SubjectsTableCreateCompanionBuilder,
    $$SubjectsTableUpdateCompanionBuilder,
    (SubjectTable, $$SubjectsTableReferences),
    SubjectTable,
    PrefetchHooks Function({bool teacherId, bool resultsRefs})> {
  $$SubjectsTableTableManager(_$AppDatabase db, $SubjectsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SubjectsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SubjectsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SubjectsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> name = const Value.absent(),
            Value<String?> code = const Value.absent(),
            Value<int?> teacherId = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              SubjectsCompanion(
            id: id,
            name: name,
            code: code,
            teacherId: teacherId,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String name,
            Value<String?> code = const Value.absent(),
            Value<int?> teacherId = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              SubjectsCompanion.insert(
            id: id,
            name: name,
            code: code,
            teacherId: teacherId,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) =>
                  (e.readTable(table), $$SubjectsTableReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: ({teacherId = false, resultsRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [if (resultsRefs) db.results],
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
                if (teacherId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.teacherId,
                    referencedTable:
                        $$SubjectsTableReferences._teacherIdTable(db),
                    referencedColumn:
                        $$SubjectsTableReferences._teacherIdTable(db).id,
                  ) as T;
                }

                return state;
              },
              getPrefetchedDataCallback: (items) async {
                return [
                  if (resultsRefs)
                    await $_getPrefetchedData<SubjectTable, $SubjectsTable,
                            ResultTable>(
                        currentTable: table,
                        referencedTable:
                            $$SubjectsTableReferences._resultsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$SubjectsTableReferences(db, table, p0)
                                .resultsRefs,
                        referencedItemsForCurrentItem:
                            (item, referencedItems) => referencedItems
                                .where((e) => e.subjectId == item.id),
                        typedResults: items)
                ];
              },
            );
          },
        ));
}

typedef $$SubjectsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $SubjectsTable,
    SubjectTable,
    $$SubjectsTableFilterComposer,
    $$SubjectsTableOrderingComposer,
    $$SubjectsTableAnnotationComposer,
    $$SubjectsTableCreateCompanionBuilder,
    $$SubjectsTableUpdateCompanionBuilder,
    (SubjectTable, $$SubjectsTableReferences),
    SubjectTable,
    PrefetchHooks Function({bool teacherId, bool resultsRefs})>;
typedef $$ResultsTableCreateCompanionBuilder = ResultsCompanion Function({
  Value<int> id,
  required int studentId,
  required int subjectId,
  required int termId,
  required int academicYearId,
  Value<double> assessmentScore,
  Value<double> examScore,
  Value<double> totalScore,
  Value<String?> grade,
  Value<String?> remarks,
  Value<DateTime> dateEntered,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});
typedef $$ResultsTableUpdateCompanionBuilder = ResultsCompanion Function({
  Value<int> id,
  Value<int> studentId,
  Value<int> subjectId,
  Value<int> termId,
  Value<int> academicYearId,
  Value<double> assessmentScore,
  Value<double> examScore,
  Value<double> totalScore,
  Value<String?> grade,
  Value<String?> remarks,
  Value<DateTime> dateEntered,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});

final class $$ResultsTableReferences
    extends BaseReferences<_$AppDatabase, $ResultsTable, ResultTable> {
  $$ResultsTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static $StudentsTable _studentIdTable(_$AppDatabase db) => db.students
      .createAlias($_aliasNameGenerator(db.results.studentId, db.students.id));

  $$StudentsTableProcessedTableManager get studentId {
    final $_column = $_itemColumn<int>('student_id')!;

    final manager = $$StudentsTableTableManager($_db, $_db.students)
        .filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_studentIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static $SubjectsTable _subjectIdTable(_$AppDatabase db) => db.subjects
      .createAlias($_aliasNameGenerator(db.results.subjectId, db.subjects.id));

  $$SubjectsTableProcessedTableManager get subjectId {
    final $_column = $_itemColumn<int>('subject_id')!;

    final manager = $$SubjectsTableTableManager($_db, $_db.subjects)
        .filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_subjectIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static $TermsTable _termIdTable(_$AppDatabase db) => db.terms
      .createAlias($_aliasNameGenerator(db.results.termId, db.terms.id));

  $$TermsTableProcessedTableManager get termId {
    final $_column = $_itemColumn<int>('term_id')!;

    final manager = $$TermsTableTableManager($_db, $_db.terms)
        .filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_termIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static $AcademicYearsTable _academicYearIdTable(_$AppDatabase db) =>
      db.academicYears.createAlias(
          $_aliasNameGenerator(db.results.academicYearId, db.academicYears.id));

  $$AcademicYearsTableProcessedTableManager get academicYearId {
    final $_column = $_itemColumn<int>('academic_year_id')!;

    final manager = $$AcademicYearsTableTableManager($_db, $_db.academicYears)
        .filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_academicYearIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }
}

class $$ResultsTableFilterComposer
    extends Composer<_$AppDatabase, $ResultsTable> {
  $$ResultsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get assessmentScore => $composableBuilder(
      column: $table.assessmentScore,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get examScore => $composableBuilder(
      column: $table.examScore, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get totalScore => $composableBuilder(
      column: $table.totalScore, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get grade => $composableBuilder(
      column: $table.grade, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get remarks => $composableBuilder(
      column: $table.remarks, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get dateEntered => $composableBuilder(
      column: $table.dateEntered, builder: (column) => ColumnFilters(column));

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

  $$StudentsTableFilterComposer get studentId {
    final $$StudentsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.studentId,
        referencedTable: $db.students,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$StudentsTableFilterComposer(
              $db: $db,
              $table: $db.students,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$SubjectsTableFilterComposer get subjectId {
    final $$SubjectsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.subjectId,
        referencedTable: $db.subjects,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$SubjectsTableFilterComposer(
              $db: $db,
              $table: $db.subjects,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$TermsTableFilterComposer get termId {
    final $$TermsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.termId,
        referencedTable: $db.terms,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$TermsTableFilterComposer(
              $db: $db,
              $table: $db.terms,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$AcademicYearsTableFilterComposer get academicYearId {
    final $$AcademicYearsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.academicYearId,
        referencedTable: $db.academicYears,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$AcademicYearsTableFilterComposer(
              $db: $db,
              $table: $db.academicYears,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$ResultsTableOrderingComposer
    extends Composer<_$AppDatabase, $ResultsTable> {
  $$ResultsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get assessmentScore => $composableBuilder(
      column: $table.assessmentScore,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get examScore => $composableBuilder(
      column: $table.examScore, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get totalScore => $composableBuilder(
      column: $table.totalScore, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get grade => $composableBuilder(
      column: $table.grade, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get remarks => $composableBuilder(
      column: $table.remarks, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get dateEntered => $composableBuilder(
      column: $table.dateEntered, builder: (column) => ColumnOrderings(column));

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

  $$StudentsTableOrderingComposer get studentId {
    final $$StudentsTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.studentId,
        referencedTable: $db.students,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$StudentsTableOrderingComposer(
              $db: $db,
              $table: $db.students,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$SubjectsTableOrderingComposer get subjectId {
    final $$SubjectsTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.subjectId,
        referencedTable: $db.subjects,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$SubjectsTableOrderingComposer(
              $db: $db,
              $table: $db.subjects,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$TermsTableOrderingComposer get termId {
    final $$TermsTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.termId,
        referencedTable: $db.terms,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$TermsTableOrderingComposer(
              $db: $db,
              $table: $db.terms,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$AcademicYearsTableOrderingComposer get academicYearId {
    final $$AcademicYearsTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.academicYearId,
        referencedTable: $db.academicYears,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$AcademicYearsTableOrderingComposer(
              $db: $db,
              $table: $db.academicYears,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$ResultsTableAnnotationComposer
    extends Composer<_$AppDatabase, $ResultsTable> {
  $$ResultsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<double> get assessmentScore => $composableBuilder(
      column: $table.assessmentScore, builder: (column) => column);

  GeneratedColumn<double> get examScore =>
      $composableBuilder(column: $table.examScore, builder: (column) => column);

  GeneratedColumn<double> get totalScore => $composableBuilder(
      column: $table.totalScore, builder: (column) => column);

  GeneratedColumn<String> get grade =>
      $composableBuilder(column: $table.grade, builder: (column) => column);

  GeneratedColumn<String> get remarks =>
      $composableBuilder(column: $table.remarks, builder: (column) => column);

  GeneratedColumn<DateTime> get dateEntered => $composableBuilder(
      column: $table.dateEntered, builder: (column) => column);

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

  $$StudentsTableAnnotationComposer get studentId {
    final $$StudentsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.studentId,
        referencedTable: $db.students,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$StudentsTableAnnotationComposer(
              $db: $db,
              $table: $db.students,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$SubjectsTableAnnotationComposer get subjectId {
    final $$SubjectsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.subjectId,
        referencedTable: $db.subjects,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$SubjectsTableAnnotationComposer(
              $db: $db,
              $table: $db.subjects,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$TermsTableAnnotationComposer get termId {
    final $$TermsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.termId,
        referencedTable: $db.terms,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$TermsTableAnnotationComposer(
              $db: $db,
              $table: $db.terms,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$AcademicYearsTableAnnotationComposer get academicYearId {
    final $$AcademicYearsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.academicYearId,
        referencedTable: $db.academicYears,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$AcademicYearsTableAnnotationComposer(
              $db: $db,
              $table: $db.academicYears,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$ResultsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $ResultsTable,
    ResultTable,
    $$ResultsTableFilterComposer,
    $$ResultsTableOrderingComposer,
    $$ResultsTableAnnotationComposer,
    $$ResultsTableCreateCompanionBuilder,
    $$ResultsTableUpdateCompanionBuilder,
    (ResultTable, $$ResultsTableReferences),
    ResultTable,
    PrefetchHooks Function(
        {bool studentId, bool subjectId, bool termId, bool academicYearId})> {
  $$ResultsTableTableManager(_$AppDatabase db, $ResultsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ResultsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ResultsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$ResultsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<int> studentId = const Value.absent(),
            Value<int> subjectId = const Value.absent(),
            Value<int> termId = const Value.absent(),
            Value<int> academicYearId = const Value.absent(),
            Value<double> assessmentScore = const Value.absent(),
            Value<double> examScore = const Value.absent(),
            Value<double> totalScore = const Value.absent(),
            Value<String?> grade = const Value.absent(),
            Value<String?> remarks = const Value.absent(),
            Value<DateTime> dateEntered = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              ResultsCompanion(
            id: id,
            studentId: studentId,
            subjectId: subjectId,
            termId: termId,
            academicYearId: academicYearId,
            assessmentScore: assessmentScore,
            examScore: examScore,
            totalScore: totalScore,
            grade: grade,
            remarks: remarks,
            dateEntered: dateEntered,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required int studentId,
            required int subjectId,
            required int termId,
            required int academicYearId,
            Value<double> assessmentScore = const Value.absent(),
            Value<double> examScore = const Value.absent(),
            Value<double> totalScore = const Value.absent(),
            Value<String?> grade = const Value.absent(),
            Value<String?> remarks = const Value.absent(),
            Value<DateTime> dateEntered = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              ResultsCompanion.insert(
            id: id,
            studentId: studentId,
            subjectId: subjectId,
            termId: termId,
            academicYearId: academicYearId,
            assessmentScore: assessmentScore,
            examScore: examScore,
            totalScore: totalScore,
            grade: grade,
            remarks: remarks,
            dateEntered: dateEntered,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) =>
                  (e.readTable(table), $$ResultsTableReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: (
              {studentId = false,
              subjectId = false,
              termId = false,
              academicYearId = false}) {
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
                if (studentId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.studentId,
                    referencedTable:
                        $$ResultsTableReferences._studentIdTable(db),
                    referencedColumn:
                        $$ResultsTableReferences._studentIdTable(db).id,
                  ) as T;
                }
                if (subjectId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.subjectId,
                    referencedTable:
                        $$ResultsTableReferences._subjectIdTable(db),
                    referencedColumn:
                        $$ResultsTableReferences._subjectIdTable(db).id,
                  ) as T;
                }
                if (termId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.termId,
                    referencedTable: $$ResultsTableReferences._termIdTable(db),
                    referencedColumn:
                        $$ResultsTableReferences._termIdTable(db).id,
                  ) as T;
                }
                if (academicYearId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.academicYearId,
                    referencedTable:
                        $$ResultsTableReferences._academicYearIdTable(db),
                    referencedColumn:
                        $$ResultsTableReferences._academicYearIdTable(db).id,
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

typedef $$ResultsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $ResultsTable,
    ResultTable,
    $$ResultsTableFilterComposer,
    $$ResultsTableOrderingComposer,
    $$ResultsTableAnnotationComposer,
    $$ResultsTableCreateCompanionBuilder,
    $$ResultsTableUpdateCompanionBuilder,
    (ResultTable, $$ResultsTableReferences),
    ResultTable,
    PrefetchHooks Function(
        {bool studentId, bool subjectId, bool termId, bool academicYearId})>;
typedef $$GradingRulesTableCreateCompanionBuilder = GradingRulesCompanion
    Function({
  Value<int> id,
  required double minScore,
  required double maxScore,
  required String grade,
  Value<String?> remarks,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});
typedef $$GradingRulesTableUpdateCompanionBuilder = GradingRulesCompanion
    Function({
  Value<int> id,
  Value<double> minScore,
  Value<double> maxScore,
  Value<String> grade,
  Value<String?> remarks,
  Value<String?> syncId,
  Value<DateTime?> updatedAt,
  Value<DateTime?> createdAt,
  Value<String?> deviceId,
  Value<bool> isDeleted,
});

class $$GradingRulesTableFilterComposer
    extends Composer<_$AppDatabase, $GradingRulesTable> {
  $$GradingRulesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get minScore => $composableBuilder(
      column: $table.minScore, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get maxScore => $composableBuilder(
      column: $table.maxScore, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get grade => $composableBuilder(
      column: $table.grade, builder: (column) => ColumnFilters(column));

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
}

class $$GradingRulesTableOrderingComposer
    extends Composer<_$AppDatabase, $GradingRulesTable> {
  $$GradingRulesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get minScore => $composableBuilder(
      column: $table.minScore, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get maxScore => $composableBuilder(
      column: $table.maxScore, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get grade => $composableBuilder(
      column: $table.grade, builder: (column) => ColumnOrderings(column));

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
}

class $$GradingRulesTableAnnotationComposer
    extends Composer<_$AppDatabase, $GradingRulesTable> {
  $$GradingRulesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<double> get minScore =>
      $composableBuilder(column: $table.minScore, builder: (column) => column);

  GeneratedColumn<double> get maxScore =>
      $composableBuilder(column: $table.maxScore, builder: (column) => column);

  GeneratedColumn<String> get grade =>
      $composableBuilder(column: $table.grade, builder: (column) => column);

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
}

class $$GradingRulesTableTableManager extends RootTableManager<
    _$AppDatabase,
    $GradingRulesTable,
    GradingRuleTable,
    $$GradingRulesTableFilterComposer,
    $$GradingRulesTableOrderingComposer,
    $$GradingRulesTableAnnotationComposer,
    $$GradingRulesTableCreateCompanionBuilder,
    $$GradingRulesTableUpdateCompanionBuilder,
    (
      GradingRuleTable,
      BaseReferences<_$AppDatabase, $GradingRulesTable, GradingRuleTable>
    ),
    GradingRuleTable,
    PrefetchHooks Function()> {
  $$GradingRulesTableTableManager(_$AppDatabase db, $GradingRulesTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$GradingRulesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$GradingRulesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$GradingRulesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<double> minScore = const Value.absent(),
            Value<double> maxScore = const Value.absent(),
            Value<String> grade = const Value.absent(),
            Value<String?> remarks = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              GradingRulesCompanion(
            id: id,
            minScore: minScore,
            maxScore: maxScore,
            grade: grade,
            remarks: remarks,
            syncId: syncId,
            updatedAt: updatedAt,
            createdAt: createdAt,
            deviceId: deviceId,
            isDeleted: isDeleted,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required double minScore,
            required double maxScore,
            required String grade,
            Value<String?> remarks = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<DateTime?> updatedAt = const Value.absent(),
            Value<DateTime?> createdAt = const Value.absent(),
            Value<String?> deviceId = const Value.absent(),
            Value<bool> isDeleted = const Value.absent(),
          }) =>
              GradingRulesCompanion.insert(
            id: id,
            minScore: minScore,
            maxScore: maxScore,
            grade: grade,
            remarks: remarks,
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

typedef $$GradingRulesTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $GradingRulesTable,
    GradingRuleTable,
    $$GradingRulesTableFilterComposer,
    $$GradingRulesTableOrderingComposer,
    $$GradingRulesTableAnnotationComposer,
    $$GradingRulesTableCreateCompanionBuilder,
    $$GradingRulesTableUpdateCompanionBuilder,
    (
      GradingRuleTable,
      BaseReferences<_$AppDatabase, $GradingRulesTable, GradingRuleTable>
    ),
    GradingRuleTable,
    PrefetchHooks Function()>;
typedef $$PrinterConfigsTableCreateCompanionBuilder = PrinterConfigsCompanion
    Function({
  required String address,
  Value<String?> customName,
  required String type,
  Value<DateTime?> lastConnectedAt,
  Value<int> rowid,
});
typedef $$PrinterConfigsTableUpdateCompanionBuilder = PrinterConfigsCompanion
    Function({
  Value<String> address,
  Value<String?> customName,
  Value<String> type,
  Value<DateTime?> lastConnectedAt,
  Value<int> rowid,
});

class $$PrinterConfigsTableFilterComposer
    extends Composer<_$AppDatabase, $PrinterConfigsTable> {
  $$PrinterConfigsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get address => $composableBuilder(
      column: $table.address, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get customName => $composableBuilder(
      column: $table.customName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get type => $composableBuilder(
      column: $table.type, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get lastConnectedAt => $composableBuilder(
      column: $table.lastConnectedAt,
      builder: (column) => ColumnFilters(column));
}

class $$PrinterConfigsTableOrderingComposer
    extends Composer<_$AppDatabase, $PrinterConfigsTable> {
  $$PrinterConfigsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get address => $composableBuilder(
      column: $table.address, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get customName => $composableBuilder(
      column: $table.customName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get type => $composableBuilder(
      column: $table.type, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get lastConnectedAt => $composableBuilder(
      column: $table.lastConnectedAt,
      builder: (column) => ColumnOrderings(column));
}

class $$PrinterConfigsTableAnnotationComposer
    extends Composer<_$AppDatabase, $PrinterConfigsTable> {
  $$PrinterConfigsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get address =>
      $composableBuilder(column: $table.address, builder: (column) => column);

  GeneratedColumn<String> get customName => $composableBuilder(
      column: $table.customName, builder: (column) => column);

  GeneratedColumn<String> get type =>
      $composableBuilder(column: $table.type, builder: (column) => column);

  GeneratedColumn<DateTime> get lastConnectedAt => $composableBuilder(
      column: $table.lastConnectedAt, builder: (column) => column);
}

class $$PrinterConfigsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $PrinterConfigsTable,
    PrinterConfig,
    $$PrinterConfigsTableFilterComposer,
    $$PrinterConfigsTableOrderingComposer,
    $$PrinterConfigsTableAnnotationComposer,
    $$PrinterConfigsTableCreateCompanionBuilder,
    $$PrinterConfigsTableUpdateCompanionBuilder,
    (
      PrinterConfig,
      BaseReferences<_$AppDatabase, $PrinterConfigsTable, PrinterConfig>
    ),
    PrinterConfig,
    PrefetchHooks Function()> {
  $$PrinterConfigsTableTableManager(
      _$AppDatabase db, $PrinterConfigsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$PrinterConfigsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$PrinterConfigsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$PrinterConfigsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> address = const Value.absent(),
            Value<String?> customName = const Value.absent(),
            Value<String> type = const Value.absent(),
            Value<DateTime?> lastConnectedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              PrinterConfigsCompanion(
            address: address,
            customName: customName,
            type: type,
            lastConnectedAt: lastConnectedAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String address,
            Value<String?> customName = const Value.absent(),
            required String type,
            Value<DateTime?> lastConnectedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              PrinterConfigsCompanion.insert(
            address: address,
            customName: customName,
            type: type,
            lastConnectedAt: lastConnectedAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$PrinterConfigsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $PrinterConfigsTable,
    PrinterConfig,
    $$PrinterConfigsTableFilterComposer,
    $$PrinterConfigsTableOrderingComposer,
    $$PrinterConfigsTableAnnotationComposer,
    $$PrinterConfigsTableCreateCompanionBuilder,
    $$PrinterConfigsTableUpdateCompanionBuilder,
    (
      PrinterConfig,
      BaseReferences<_$AppDatabase, $PrinterConfigsTable, PrinterConfig>
    ),
    PrinterConfig,
    PrefetchHooks Function()>;

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
  $$StockReturnsTableTableManager get stockReturns =>
      $$StockReturnsTableTableManager(_db, _db.stockReturns);
  $$ExpensesTableTableManager get expenses =>
      $$ExpensesTableTableManager(_db, _db.expenses);
  $$AcademicYearsTableTableManager get academicYears =>
      $$AcademicYearsTableTableManager(_db, _db.academicYears);
  $$TermsTableTableManager get terms =>
      $$TermsTableTableManager(_db, _db.terms);
  $$ClassesTableTableManager get classes =>
      $$ClassesTableTableManager(_db, _db.classes);
  $$StudentsTableTableManager get students =>
      $$StudentsTableTableManager(_db, _db.students);
  $$BusinessSettingsTableTableManager get businessSettings =>
      $$BusinessSettingsTableTableManager(_db, _db.businessSettings);
  $$TeachersTableTableManager get teachers =>
      $$TeachersTableTableManager(_db, _db.teachers);
  $$SubjectsTableTableManager get subjects =>
      $$SubjectsTableTableManager(_db, _db.subjects);
  $$ResultsTableTableManager get results =>
      $$ResultsTableTableManager(_db, _db.results);
  $$GradingRulesTableTableManager get gradingRules =>
      $$GradingRulesTableTableManager(_db, _db.gradingRules);
  $$PrinterConfigsTableTableManager get printerConfigs =>
      $$PrinterConfigsTableTableManager(_db, _db.printerConfigs);
}
