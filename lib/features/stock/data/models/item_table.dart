import 'package:drift/drift.dart';

@DataClassName('ItemTable')
class Items extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().withLength(min: 1, max: 100)();
  TextColumn get category => text()(); // String representation of ItemCategory enum
  RealColumn get price => real()();
  IntColumn get stockQty => integer().withDefault(const Constant(0))();
}
