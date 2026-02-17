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
  @override
  List<GeneratedColumn> get $columns => [id, name];
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
  const CategoryTable({required this.id, required this.name});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['name'] = Variable<String>(name);
    return map;
  }

  CategoriesCompanion toCompanion(bool nullToAbsent) {
    return CategoriesCompanion(
      id: Value(id),
      name: Value(name),
    );
  }

  factory CategoryTable.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CategoryTable(
      id: serializer.fromJson<int>(json['id']),
      name: serializer.fromJson<String>(json['name']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'name': serializer.toJson<String>(name),
    };
  }

  CategoryTable copyWith({int? id, String? name}) => CategoryTable(
        id: id ?? this.id,
        name: name ?? this.name,
      );
  CategoryTable copyWithCompanion(CategoriesCompanion data) {
    return CategoryTable(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CategoryTable(')
          ..write('id: $id, ')
          ..write('name: $name')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, name);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CategoryTable &&
          other.id == this.id &&
          other.name == this.name);
}

class CategoriesCompanion extends UpdateCompanion<CategoryTable> {
  final Value<int> id;
  final Value<String> name;
  const CategoriesCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
  });
  CategoriesCompanion.insert({
    this.id = const Value.absent(),
    required String name,
  }) : name = Value(name);
  static Insertable<CategoryTable> custom({
    Expression<int>? id,
    Expression<String>? name,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
    });
  }

  CategoriesCompanion copyWith({Value<int>? id, Value<String>? name}) {
    return CategoriesCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
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
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CategoriesCompanion(')
          ..write('id: $id, ')
          ..write('name: $name')
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
  @override
  List<GeneratedColumn> get $columns =>
      [id, name, category, price, stockQty, image, categoryId];
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
      image: attachedDatabase.typeMapping
          .read(DriftSqlType.blob, data['${effectivePrefix}image']),
      categoryId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}category_id']),
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
  final Uint8List? image;
  final int? categoryId;
  const ItemTable(
      {required this.id,
      required this.name,
      required this.category,
      required this.price,
      required this.stockQty,
      this.image,
      this.categoryId});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['name'] = Variable<String>(name);
    map['category'] = Variable<String>(category);
    map['price'] = Variable<double>(price);
    map['stock_qty'] = Variable<int>(stockQty);
    if (!nullToAbsent || image != null) {
      map['image'] = Variable<Uint8List>(image);
    }
    if (!nullToAbsent || categoryId != null) {
      map['category_id'] = Variable<int>(categoryId);
    }
    return map;
  }

  ItemsCompanion toCompanion(bool nullToAbsent) {
    return ItemsCompanion(
      id: Value(id),
      name: Value(name),
      category: Value(category),
      price: Value(price),
      stockQty: Value(stockQty),
      image:
          image == null && nullToAbsent ? const Value.absent() : Value(image),
      categoryId: categoryId == null && nullToAbsent
          ? const Value.absent()
          : Value(categoryId),
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
      image: serializer.fromJson<Uint8List?>(json['image']),
      categoryId: serializer.fromJson<int?>(json['categoryId']),
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
      'image': serializer.toJson<Uint8List?>(image),
      'categoryId': serializer.toJson<int?>(categoryId),
    };
  }

  ItemTable copyWith(
          {int? id,
          String? name,
          String? category,
          double? price,
          int? stockQty,
          Value<Uint8List?> image = const Value.absent(),
          Value<int?> categoryId = const Value.absent()}) =>
      ItemTable(
        id: id ?? this.id,
        name: name ?? this.name,
        category: category ?? this.category,
        price: price ?? this.price,
        stockQty: stockQty ?? this.stockQty,
        image: image.present ? image.value : this.image,
        categoryId: categoryId.present ? categoryId.value : this.categoryId,
      );
  ItemTable copyWithCompanion(ItemsCompanion data) {
    return ItemTable(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      category: data.category.present ? data.category.value : this.category,
      price: data.price.present ? data.price.value : this.price,
      stockQty: data.stockQty.present ? data.stockQty.value : this.stockQty,
      image: data.image.present ? data.image.value : this.image,
      categoryId:
          data.categoryId.present ? data.categoryId.value : this.categoryId,
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
          ..write('image: $image, ')
          ..write('categoryId: $categoryId')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, name, category, price, stockQty,
      $driftBlobEquality.hash(image), categoryId);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ItemTable &&
          other.id == this.id &&
          other.name == this.name &&
          other.category == this.category &&
          other.price == this.price &&
          other.stockQty == this.stockQty &&
          $driftBlobEquality.equals(other.image, this.image) &&
          other.categoryId == this.categoryId);
}

class ItemsCompanion extends UpdateCompanion<ItemTable> {
  final Value<int> id;
  final Value<String> name;
  final Value<String> category;
  final Value<double> price;
  final Value<int> stockQty;
  final Value<Uint8List?> image;
  final Value<int?> categoryId;
  const ItemsCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.category = const Value.absent(),
    this.price = const Value.absent(),
    this.stockQty = const Value.absent(),
    this.image = const Value.absent(),
    this.categoryId = const Value.absent(),
  });
  ItemsCompanion.insert({
    this.id = const Value.absent(),
    required String name,
    required String category,
    required double price,
    this.stockQty = const Value.absent(),
    this.image = const Value.absent(),
    this.categoryId = const Value.absent(),
  })  : name = Value(name),
        category = Value(category),
        price = Value(price);
  static Insertable<ItemTable> custom({
    Expression<int>? id,
    Expression<String>? name,
    Expression<String>? category,
    Expression<double>? price,
    Expression<int>? stockQty,
    Expression<Uint8List>? image,
    Expression<int>? categoryId,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (category != null) 'category': category,
      if (price != null) 'price': price,
      if (stockQty != null) 'stock_qty': stockQty,
      if (image != null) 'image': image,
      if (categoryId != null) 'category_id': categoryId,
    });
  }

  ItemsCompanion copyWith(
      {Value<int>? id,
      Value<String>? name,
      Value<String>? category,
      Value<double>? price,
      Value<int>? stockQty,
      Value<Uint8List?>? image,
      Value<int?>? categoryId}) {
    return ItemsCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      category: category ?? this.category,
      price: price ?? this.price,
      stockQty: stockQty ?? this.stockQty,
      image: image ?? this.image,
      categoryId: categoryId ?? this.categoryId,
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
    if (image.present) {
      map['image'] = Variable<Uint8List>(image.value);
    }
    if (categoryId.present) {
      map['category_id'] = Variable<int>(categoryId.value);
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
          ..write('image: $image, ')
          ..write('categoryId: $categoryId')
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
        customerName,
        customerAddress
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
      customerName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}customer_name']),
      customerAddress: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}customer_address']),
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
  final String? customerName;
  final String? customerAddress;
  const InvoiceTable(
      {required this.id,
      required this.invoiceNumber,
      required this.dateCreated,
      required this.subtotal,
      required this.taxAmount,
      required this.discountAmount,
      required this.totalAmount,
      required this.paymentStatus,
      this.customerName,
      this.customerAddress});
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
    if (!nullToAbsent || customerName != null) {
      map['customer_name'] = Variable<String>(customerName);
    }
    if (!nullToAbsent || customerAddress != null) {
      map['customer_address'] = Variable<String>(customerAddress);
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
      customerName: customerName == null && nullToAbsent
          ? const Value.absent()
          : Value(customerName),
      customerAddress: customerAddress == null && nullToAbsent
          ? const Value.absent()
          : Value(customerAddress),
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
      customerName: serializer.fromJson<String?>(json['customerName']),
      customerAddress: serializer.fromJson<String?>(json['customerAddress']),
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
      'customerName': serializer.toJson<String?>(customerName),
      'customerAddress': serializer.toJson<String?>(customerAddress),
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
          Value<String?> customerName = const Value.absent(),
          Value<String?> customerAddress = const Value.absent()}) =>
      InvoiceTable(
        id: id ?? this.id,
        invoiceNumber: invoiceNumber ?? this.invoiceNumber,
        dateCreated: dateCreated ?? this.dateCreated,
        subtotal: subtotal ?? this.subtotal,
        taxAmount: taxAmount ?? this.taxAmount,
        discountAmount: discountAmount ?? this.discountAmount,
        totalAmount: totalAmount ?? this.totalAmount,
        paymentStatus: paymentStatus ?? this.paymentStatus,
        customerName:
            customerName.present ? customerName.value : this.customerName,
        customerAddress: customerAddress.present
            ? customerAddress.value
            : this.customerAddress,
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
      customerName: data.customerName.present
          ? data.customerName.value
          : this.customerName,
      customerAddress: data.customerAddress.present
          ? data.customerAddress.value
          : this.customerAddress,
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
          ..write('customerName: $customerName, ')
          ..write('customerAddress: $customerAddress')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      invoiceNumber,
      dateCreated,
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      paymentStatus,
      customerName,
      customerAddress);
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
          other.customerName == this.customerName &&
          other.customerAddress == this.customerAddress);
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
  final Value<String?> customerName;
  final Value<String?> customerAddress;
  const InvoicesCompanion({
    this.id = const Value.absent(),
    this.invoiceNumber = const Value.absent(),
    this.dateCreated = const Value.absent(),
    this.subtotal = const Value.absent(),
    this.taxAmount = const Value.absent(),
    this.discountAmount = const Value.absent(),
    this.totalAmount = const Value.absent(),
    this.paymentStatus = const Value.absent(),
    this.customerName = const Value.absent(),
    this.customerAddress = const Value.absent(),
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
    this.customerName = const Value.absent(),
    this.customerAddress = const Value.absent(),
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
    Expression<String>? customerName,
    Expression<String>? customerAddress,
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
      if (customerName != null) 'customer_name': customerName,
      if (customerAddress != null) 'customer_address': customerAddress,
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
      Value<String?>? customerName,
      Value<String?>? customerAddress}) {
    return InvoicesCompanion(
      id: id ?? this.id,
      invoiceNumber: invoiceNumber ?? this.invoiceNumber,
      dateCreated: dateCreated ?? this.dateCreated,
      subtotal: subtotal ?? this.subtotal,
      taxAmount: taxAmount ?? this.taxAmount,
      discountAmount: discountAmount ?? this.discountAmount,
      totalAmount: totalAmount ?? this.totalAmount,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      customerName: customerName ?? this.customerName,
      customerAddress: customerAddress ?? this.customerAddress,
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
    if (customerName.present) {
      map['customer_name'] = Variable<String>(customerName.value);
    }
    if (customerAddress.present) {
      map['customer_address'] = Variable<String>(customerAddress.value);
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
          ..write('customerName: $customerName, ')
          ..write('customerAddress: $customerAddress')
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
  @override
  List<GeneratedColumn> get $columns =>
      [id, invoiceId, itemId, quantity, unitPrice];
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
  const InvoiceItemTable(
      {required this.id,
      required this.invoiceId,
      required this.itemId,
      required this.quantity,
      required this.unitPrice});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['invoice_id'] = Variable<int>(invoiceId);
    map['item_id'] = Variable<int>(itemId);
    map['quantity'] = Variable<int>(quantity);
    map['unit_price'] = Variable<double>(unitPrice);
    return map;
  }

  InvoiceItemsCompanion toCompanion(bool nullToAbsent) {
    return InvoiceItemsCompanion(
      id: Value(id),
      invoiceId: Value(invoiceId),
      itemId: Value(itemId),
      quantity: Value(quantity),
      unitPrice: Value(unitPrice),
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
    };
  }

  InvoiceItemTable copyWith(
          {int? id,
          int? invoiceId,
          int? itemId,
          int? quantity,
          double? unitPrice}) =>
      InvoiceItemTable(
        id: id ?? this.id,
        invoiceId: invoiceId ?? this.invoiceId,
        itemId: itemId ?? this.itemId,
        quantity: quantity ?? this.quantity,
        unitPrice: unitPrice ?? this.unitPrice,
      );
  InvoiceItemTable copyWithCompanion(InvoiceItemsCompanion data) {
    return InvoiceItemTable(
      id: data.id.present ? data.id.value : this.id,
      invoiceId: data.invoiceId.present ? data.invoiceId.value : this.invoiceId,
      itemId: data.itemId.present ? data.itemId.value : this.itemId,
      quantity: data.quantity.present ? data.quantity.value : this.quantity,
      unitPrice: data.unitPrice.present ? data.unitPrice.value : this.unitPrice,
    );
  }

  @override
  String toString() {
    return (StringBuffer('InvoiceItemTable(')
          ..write('id: $id, ')
          ..write('invoiceId: $invoiceId, ')
          ..write('itemId: $itemId, ')
          ..write('quantity: $quantity, ')
          ..write('unitPrice: $unitPrice')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, invoiceId, itemId, quantity, unitPrice);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is InvoiceItemTable &&
          other.id == this.id &&
          other.invoiceId == this.invoiceId &&
          other.itemId == this.itemId &&
          other.quantity == this.quantity &&
          other.unitPrice == this.unitPrice);
}

class InvoiceItemsCompanion extends UpdateCompanion<InvoiceItemTable> {
  final Value<int> id;
  final Value<int> invoiceId;
  final Value<int> itemId;
  final Value<int> quantity;
  final Value<double> unitPrice;
  const InvoiceItemsCompanion({
    this.id = const Value.absent(),
    this.invoiceId = const Value.absent(),
    this.itemId = const Value.absent(),
    this.quantity = const Value.absent(),
    this.unitPrice = const Value.absent(),
  });
  InvoiceItemsCompanion.insert({
    this.id = const Value.absent(),
    required int invoiceId,
    required int itemId,
    required int quantity,
    required double unitPrice,
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
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (invoiceId != null) 'invoice_id': invoiceId,
      if (itemId != null) 'item_id': itemId,
      if (quantity != null) 'quantity': quantity,
      if (unitPrice != null) 'unit_price': unitPrice,
    });
  }

  InvoiceItemsCompanion copyWith(
      {Value<int>? id,
      Value<int>? invoiceId,
      Value<int>? itemId,
      Value<int>? quantity,
      Value<double>? unitPrice}) {
    return InvoiceItemsCompanion(
      id: id ?? this.id,
      invoiceId: invoiceId ?? this.invoiceId,
      itemId: itemId ?? this.itemId,
      quantity: quantity ?? this.quantity,
      unitPrice: unitPrice ?? this.unitPrice,
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
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('InvoiceItemsCompanion(')
          ..write('id: $id, ')
          ..write('invoiceId: $invoiceId, ')
          ..write('itemId: $itemId, ')
          ..write('quantity: $quantity, ')
          ..write('unitPrice: $unitPrice')
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
  static const VerificationMeta _allowPriceUpdatesMeta =
      const VerificationMeta('allowPriceUpdates');
  @override
  late final GeneratedColumn<bool> allowPriceUpdates = GeneratedColumn<bool>(
      'allow_price_updates', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("allow_price_updates" IN (0, 1))'),
      defaultValue: const Constant(true));
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
        allowPriceUpdates,
        confirmPriceOnSelection,
        taxRate,
        bankName,
        accountNumber,
        accountName,
        showAccountDetails,
        receiptFooter,
        showSignatureSpace,
        failedAttempts,
        isLocked,
        lockedAt
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
    if (data.containsKey('allow_price_updates')) {
      context.handle(
          _allowPriceUpdatesMeta,
          allowPriceUpdates.isAcceptableOrUnknown(
              data['allow_price_updates']!, _allowPriceUpdatesMeta));
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
      allowPriceUpdates: attachedDatabase.typeMapping.read(
          DriftSqlType.bool, data['${effectivePrefix}allow_price_updates'])!,
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
      failedAttempts: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}failed_attempts'])!,
      isLocked: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_locked'])!,
      lockedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}locked_at']),
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
  final bool allowPriceUpdates;
  final bool confirmPriceOnSelection;
  final double taxRate;
  final String? bankName;
  final String? accountNumber;
  final String? accountName;
  final bool showAccountDetails;
  final String receiptFooter;
  final bool showSignatureSpace;
  final int failedAttempts;
  final bool isLocked;
  final DateTime? lockedAt;
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
      required this.allowPriceUpdates,
      required this.confirmPriceOnSelection,
      required this.taxRate,
      this.bankName,
      this.accountNumber,
      this.accountName,
      required this.showAccountDetails,
      required this.receiptFooter,
      required this.showSignatureSpace,
      required this.failedAttempts,
      required this.isLocked,
      this.lockedAt});
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
    map['allow_price_updates'] = Variable<bool>(allowPriceUpdates);
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
    map['failed_attempts'] = Variable<int>(failedAttempts);
    map['is_locked'] = Variable<bool>(isLocked);
    if (!nullToAbsent || lockedAt != null) {
      map['locked_at'] = Variable<DateTime>(lockedAt);
    }
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
      allowPriceUpdates: Value(allowPriceUpdates),
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
      failedAttempts: Value(failedAttempts),
      isLocked: Value(isLocked),
      lockedAt: lockedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lockedAt),
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
      allowPriceUpdates: serializer.fromJson<bool>(json['allowPriceUpdates']),
      confirmPriceOnSelection:
          serializer.fromJson<bool>(json['confirmPriceOnSelection']),
      taxRate: serializer.fromJson<double>(json['taxRate']),
      bankName: serializer.fromJson<String?>(json['bankName']),
      accountNumber: serializer.fromJson<String?>(json['accountNumber']),
      accountName: serializer.fromJson<String?>(json['accountName']),
      showAccountDetails: serializer.fromJson<bool>(json['showAccountDetails']),
      receiptFooter: serializer.fromJson<String>(json['receiptFooter']),
      showSignatureSpace: serializer.fromJson<bool>(json['showSignatureSpace']),
      failedAttempts: serializer.fromJson<int>(json['failedAttempts']),
      isLocked: serializer.fromJson<bool>(json['isLocked']),
      lockedAt: serializer.fromJson<DateTime?>(json['lockedAt']),
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
      'allowPriceUpdates': serializer.toJson<bool>(allowPriceUpdates),
      'confirmPriceOnSelection':
          serializer.toJson<bool>(confirmPriceOnSelection),
      'taxRate': serializer.toJson<double>(taxRate),
      'bankName': serializer.toJson<String?>(bankName),
      'accountNumber': serializer.toJson<String?>(accountNumber),
      'accountName': serializer.toJson<String?>(accountName),
      'showAccountDetails': serializer.toJson<bool>(showAccountDetails),
      'receiptFooter': serializer.toJson<String>(receiptFooter),
      'showSignatureSpace': serializer.toJson<bool>(showSignatureSpace),
      'failedAttempts': serializer.toJson<int>(failedAttempts),
      'isLocked': serializer.toJson<bool>(isLocked),
      'lockedAt': serializer.toJson<DateTime?>(lockedAt),
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
          bool? allowPriceUpdates,
          bool? confirmPriceOnSelection,
          double? taxRate,
          Value<String?> bankName = const Value.absent(),
          Value<String?> accountNumber = const Value.absent(),
          Value<String?> accountName = const Value.absent(),
          bool? showAccountDetails,
          String? receiptFooter,
          bool? showSignatureSpace,
          int? failedAttempts,
          bool? isLocked,
          Value<DateTime?> lockedAt = const Value.absent()}) =>
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
        allowPriceUpdates: allowPriceUpdates ?? this.allowPriceUpdates,
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
        failedAttempts: failedAttempts ?? this.failedAttempts,
        isLocked: isLocked ?? this.isLocked,
        lockedAt: lockedAt.present ? lockedAt.value : this.lockedAt,
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
      allowPriceUpdates: data.allowPriceUpdates.present
          ? data.allowPriceUpdates.value
          : this.allowPriceUpdates,
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
      failedAttempts: data.failedAttempts.present
          ? data.failedAttempts.value
          : this.failedAttempts,
      isLocked: data.isLocked.present ? data.isLocked.value : this.isLocked,
      lockedAt: data.lockedAt.present ? data.lockedAt.value : this.lockedAt,
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
          ..write('allowPriceUpdates: $allowPriceUpdates, ')
          ..write('confirmPriceOnSelection: $confirmPriceOnSelection, ')
          ..write('taxRate: $taxRate, ')
          ..write('bankName: $bankName, ')
          ..write('accountNumber: $accountNumber, ')
          ..write('accountName: $accountName, ')
          ..write('showAccountDetails: $showAccountDetails, ')
          ..write('receiptFooter: $receiptFooter, ')
          ..write('showSignatureSpace: $showSignatureSpace, ')
          ..write('failedAttempts: $failedAttempts, ')
          ..write('isLocked: $isLocked, ')
          ..write('lockedAt: $lockedAt')
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
        allowPriceUpdates,
        confirmPriceOnSelection,
        taxRate,
        bankName,
        accountNumber,
        accountName,
        showAccountDetails,
        receiptFooter,
        showSignatureSpace,
        failedAttempts,
        isLocked,
        lockedAt
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
          other.allowPriceUpdates == this.allowPriceUpdates &&
          other.confirmPriceOnSelection == this.confirmPriceOnSelection &&
          other.taxRate == this.taxRate &&
          other.bankName == this.bankName &&
          other.accountNumber == this.accountNumber &&
          other.accountName == this.accountName &&
          other.showAccountDetails == this.showAccountDetails &&
          other.receiptFooter == this.receiptFooter &&
          other.showSignatureSpace == this.showSignatureSpace &&
          other.failedAttempts == this.failedAttempts &&
          other.isLocked == this.isLocked &&
          other.lockedAt == this.lockedAt);
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
  final Value<bool> allowPriceUpdates;
  final Value<bool> confirmPriceOnSelection;
  final Value<double> taxRate;
  final Value<String?> bankName;
  final Value<String?> accountNumber;
  final Value<String?> accountName;
  final Value<bool> showAccountDetails;
  final Value<String> receiptFooter;
  final Value<bool> showSignatureSpace;
  final Value<int> failedAttempts;
  final Value<bool> isLocked;
  final Value<DateTime?> lockedAt;
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
    this.allowPriceUpdates = const Value.absent(),
    this.confirmPriceOnSelection = const Value.absent(),
    this.taxRate = const Value.absent(),
    this.bankName = const Value.absent(),
    this.accountNumber = const Value.absent(),
    this.accountName = const Value.absent(),
    this.showAccountDetails = const Value.absent(),
    this.receiptFooter = const Value.absent(),
    this.showSignatureSpace = const Value.absent(),
    this.failedAttempts = const Value.absent(),
    this.isLocked = const Value.absent(),
    this.lockedAt = const Value.absent(),
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
    this.allowPriceUpdates = const Value.absent(),
    this.confirmPriceOnSelection = const Value.absent(),
    this.taxRate = const Value.absent(),
    this.bankName = const Value.absent(),
    this.accountNumber = const Value.absent(),
    this.accountName = const Value.absent(),
    this.showAccountDetails = const Value.absent(),
    this.receiptFooter = const Value.absent(),
    this.showSignatureSpace = const Value.absent(),
    this.failedAttempts = const Value.absent(),
    this.isLocked = const Value.absent(),
    this.lockedAt = const Value.absent(),
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
    Expression<bool>? allowPriceUpdates,
    Expression<bool>? confirmPriceOnSelection,
    Expression<double>? taxRate,
    Expression<String>? bankName,
    Expression<String>? accountNumber,
    Expression<String>? accountName,
    Expression<bool>? showAccountDetails,
    Expression<String>? receiptFooter,
    Expression<bool>? showSignatureSpace,
    Expression<int>? failedAttempts,
    Expression<bool>? isLocked,
    Expression<DateTime>? lockedAt,
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
      if (allowPriceUpdates != null) 'allow_price_updates': allowPriceUpdates,
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
      if (failedAttempts != null) 'failed_attempts': failedAttempts,
      if (isLocked != null) 'is_locked': isLocked,
      if (lockedAt != null) 'locked_at': lockedAt,
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
      Value<bool>? allowPriceUpdates,
      Value<bool>? confirmPriceOnSelection,
      Value<double>? taxRate,
      Value<String?>? bankName,
      Value<String?>? accountNumber,
      Value<String?>? accountName,
      Value<bool>? showAccountDetails,
      Value<String>? receiptFooter,
      Value<bool>? showSignatureSpace,
      Value<int>? failedAttempts,
      Value<bool>? isLocked,
      Value<DateTime?>? lockedAt}) {
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
      allowPriceUpdates: allowPriceUpdates ?? this.allowPriceUpdates,
      confirmPriceOnSelection:
          confirmPriceOnSelection ?? this.confirmPriceOnSelection,
      taxRate: taxRate ?? this.taxRate,
      bankName: bankName ?? this.bankName,
      accountNumber: accountNumber ?? this.accountNumber,
      accountName: accountName ?? this.accountName,
      showAccountDetails: showAccountDetails ?? this.showAccountDetails,
      receiptFooter: receiptFooter ?? this.receiptFooter,
      showSignatureSpace: showSignatureSpace ?? this.showSignatureSpace,
      failedAttempts: failedAttempts ?? this.failedAttempts,
      isLocked: isLocked ?? this.isLocked,
      lockedAt: lockedAt ?? this.lockedAt,
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
    if (allowPriceUpdates.present) {
      map['allow_price_updates'] = Variable<bool>(allowPriceUpdates.value);
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
    if (failedAttempts.present) {
      map['failed_attempts'] = Variable<int>(failedAttempts.value);
    }
    if (isLocked.present) {
      map['is_locked'] = Variable<bool>(isLocked.value);
    }
    if (lockedAt.present) {
      map['locked_at'] = Variable<DateTime>(lockedAt.value);
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
          ..write('allowPriceUpdates: $allowPriceUpdates, ')
          ..write('confirmPriceOnSelection: $confirmPriceOnSelection, ')
          ..write('taxRate: $taxRate, ')
          ..write('bankName: $bankName, ')
          ..write('accountNumber: $accountNumber, ')
          ..write('accountName: $accountName, ')
          ..write('showAccountDetails: $showAccountDetails, ')
          ..write('receiptFooter: $receiptFooter, ')
          ..write('showSignatureSpace: $showSignatureSpace, ')
          ..write('failedAttempts: $failedAttempts, ')
          ..write('isLocked: $isLocked, ')
          ..write('lockedAt: $lockedAt')
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

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $CategoriesTable categories = $CategoriesTable(this);
  late final $ItemsTable items = $ItemsTable(this);
  late final $InvoicesTable invoices = $InvoicesTable(this);
  late final $InvoiceItemsTable invoiceItems = $InvoiceItemsTable(this);
  late final $SettingsTable settings = $SettingsTable(this);
  late final $LicenseHistoryTable licenseHistory = $LicenseHistoryTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities =>
      [categories, items, invoices, invoiceItems, settings, licenseHistory];
}

typedef $$CategoriesTableCreateCompanionBuilder = CategoriesCompanion Function({
  Value<int> id,
  required String name,
});
typedef $$CategoriesTableUpdateCompanionBuilder = CategoriesCompanion Function({
  Value<int> id,
  Value<String> name,
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
          }) =>
              CategoriesCompanion(
            id: id,
            name: name,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String name,
          }) =>
              CategoriesCompanion.insert(
            id: id,
            name: name,
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
  Value<Uint8List?> image,
  Value<int?> categoryId,
});
typedef $$ItemsTableUpdateCompanionBuilder = ItemsCompanion Function({
  Value<int> id,
  Value<String> name,
  Value<String> category,
  Value<double> price,
  Value<int> stockQty,
  Value<Uint8List?> image,
  Value<int?> categoryId,
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

  ColumnFilters<Uint8List> get image => $composableBuilder(
      column: $table.image, builder: (column) => ColumnFilters(column));

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

  ColumnOrderings<Uint8List> get image => $composableBuilder(
      column: $table.image, builder: (column) => ColumnOrderings(column));

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

  GeneratedColumn<Uint8List> get image =>
      $composableBuilder(column: $table.image, builder: (column) => column);

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
    PrefetchHooks Function({bool categoryId, bool invoiceItemsRefs})> {
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
            Value<Uint8List?> image = const Value.absent(),
            Value<int?> categoryId = const Value.absent(),
          }) =>
              ItemsCompanion(
            id: id,
            name: name,
            category: category,
            price: price,
            stockQty: stockQty,
            image: image,
            categoryId: categoryId,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String name,
            required String category,
            required double price,
            Value<int> stockQty = const Value.absent(),
            Value<Uint8List?> image = const Value.absent(),
            Value<int?> categoryId = const Value.absent(),
          }) =>
              ItemsCompanion.insert(
            id: id,
            name: name,
            category: category,
            price: price,
            stockQty: stockQty,
            image: image,
            categoryId: categoryId,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) =>
                  (e.readTable(table), $$ItemsTableReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: (
              {categoryId = false, invoiceItemsRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [if (invoiceItemsRefs) db.invoiceItems],
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
    PrefetchHooks Function({bool categoryId, bool invoiceItemsRefs})>;
typedef $$InvoicesTableCreateCompanionBuilder = InvoicesCompanion Function({
  Value<int> id,
  required String invoiceNumber,
  Value<DateTime> dateCreated,
  required double subtotal,
  required double taxAmount,
  required double discountAmount,
  required double totalAmount,
  required String paymentStatus,
  Value<String?> customerName,
  Value<String?> customerAddress,
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
  Value<String?> customerName,
  Value<String?> customerAddress,
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

  ColumnFilters<String> get customerName => $composableBuilder(
      column: $table.customerName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get customerAddress => $composableBuilder(
      column: $table.customerAddress,
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

  ColumnOrderings<String> get customerName => $composableBuilder(
      column: $table.customerName,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get customerAddress => $composableBuilder(
      column: $table.customerAddress,
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

  GeneratedColumn<String> get customerName => $composableBuilder(
      column: $table.customerName, builder: (column) => column);

  GeneratedColumn<String> get customerAddress => $composableBuilder(
      column: $table.customerAddress, builder: (column) => column);

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
            Value<String?> customerName = const Value.absent(),
            Value<String?> customerAddress = const Value.absent(),
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
            customerName: customerName,
            customerAddress: customerAddress,
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
            Value<String?> customerName = const Value.absent(),
            Value<String?> customerAddress = const Value.absent(),
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
            customerName: customerName,
            customerAddress: customerAddress,
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
});
typedef $$InvoiceItemsTableUpdateCompanionBuilder = InvoiceItemsCompanion
    Function({
  Value<int> id,
  Value<int> invoiceId,
  Value<int> itemId,
  Value<int> quantity,
  Value<double> unitPrice,
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
          }) =>
              InvoiceItemsCompanion(
            id: id,
            invoiceId: invoiceId,
            itemId: itemId,
            quantity: quantity,
            unitPrice: unitPrice,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required int invoiceId,
            required int itemId,
            required int quantity,
            required double unitPrice,
          }) =>
              InvoiceItemsCompanion.insert(
            id: id,
            invoiceId: invoiceId,
            itemId: itemId,
            quantity: quantity,
            unitPrice: unitPrice,
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
  Value<bool> allowPriceUpdates,
  Value<bool> confirmPriceOnSelection,
  Value<double> taxRate,
  Value<String?> bankName,
  Value<String?> accountNumber,
  Value<String?> accountName,
  Value<bool> showAccountDetails,
  Value<String> receiptFooter,
  Value<bool> showSignatureSpace,
  Value<int> failedAttempts,
  Value<bool> isLocked,
  Value<DateTime?> lockedAt,
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
  Value<bool> allowPriceUpdates,
  Value<bool> confirmPriceOnSelection,
  Value<double> taxRate,
  Value<String?> bankName,
  Value<String?> accountNumber,
  Value<String?> accountName,
  Value<bool> showAccountDetails,
  Value<String> receiptFooter,
  Value<bool> showSignatureSpace,
  Value<int> failedAttempts,
  Value<bool> isLocked,
  Value<DateTime?> lockedAt,
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

  ColumnFilters<bool> get allowPriceUpdates => $composableBuilder(
      column: $table.allowPriceUpdates,
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

  ColumnFilters<int> get failedAttempts => $composableBuilder(
      column: $table.failedAttempts,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isLocked => $composableBuilder(
      column: $table.isLocked, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get lockedAt => $composableBuilder(
      column: $table.lockedAt, builder: (column) => ColumnFilters(column));
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

  ColumnOrderings<bool> get allowPriceUpdates => $composableBuilder(
      column: $table.allowPriceUpdates,
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

  ColumnOrderings<int> get failedAttempts => $composableBuilder(
      column: $table.failedAttempts,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isLocked => $composableBuilder(
      column: $table.isLocked, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get lockedAt => $composableBuilder(
      column: $table.lockedAt, builder: (column) => ColumnOrderings(column));
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

  GeneratedColumn<bool> get allowPriceUpdates => $composableBuilder(
      column: $table.allowPriceUpdates, builder: (column) => column);

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

  GeneratedColumn<int> get failedAttempts => $composableBuilder(
      column: $table.failedAttempts, builder: (column) => column);

  GeneratedColumn<bool> get isLocked =>
      $composableBuilder(column: $table.isLocked, builder: (column) => column);

  GeneratedColumn<DateTime> get lockedAt =>
      $composableBuilder(column: $table.lockedAt, builder: (column) => column);
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
            Value<bool> allowPriceUpdates = const Value.absent(),
            Value<bool> confirmPriceOnSelection = const Value.absent(),
            Value<double> taxRate = const Value.absent(),
            Value<String?> bankName = const Value.absent(),
            Value<String?> accountNumber = const Value.absent(),
            Value<String?> accountName = const Value.absent(),
            Value<bool> showAccountDetails = const Value.absent(),
            Value<String> receiptFooter = const Value.absent(),
            Value<bool> showSignatureSpace = const Value.absent(),
            Value<int> failedAttempts = const Value.absent(),
            Value<bool> isLocked = const Value.absent(),
            Value<DateTime?> lockedAt = const Value.absent(),
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
            allowPriceUpdates: allowPriceUpdates,
            confirmPriceOnSelection: confirmPriceOnSelection,
            taxRate: taxRate,
            bankName: bankName,
            accountNumber: accountNumber,
            accountName: accountName,
            showAccountDetails: showAccountDetails,
            receiptFooter: receiptFooter,
            showSignatureSpace: showSignatureSpace,
            failedAttempts: failedAttempts,
            isLocked: isLocked,
            lockedAt: lockedAt,
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
            Value<bool> allowPriceUpdates = const Value.absent(),
            Value<bool> confirmPriceOnSelection = const Value.absent(),
            Value<double> taxRate = const Value.absent(),
            Value<String?> bankName = const Value.absent(),
            Value<String?> accountNumber = const Value.absent(),
            Value<String?> accountName = const Value.absent(),
            Value<bool> showAccountDetails = const Value.absent(),
            Value<String> receiptFooter = const Value.absent(),
            Value<bool> showSignatureSpace = const Value.absent(),
            Value<int> failedAttempts = const Value.absent(),
            Value<bool> isLocked = const Value.absent(),
            Value<DateTime?> lockedAt = const Value.absent(),
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
            allowPriceUpdates: allowPriceUpdates,
            confirmPriceOnSelection: confirmPriceOnSelection,
            taxRate: taxRate,
            bankName: bankName,
            accountNumber: accountNumber,
            accountName: accountName,
            showAccountDetails: showAccountDetails,
            receiptFooter: receiptFooter,
            showSignatureSpace: showSignatureSpace,
            failedAttempts: failedAttempts,
            isLocked: isLocked,
            lockedAt: lockedAt,
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
}
