import 'package:drift/drift.dart';

@DataClassName('PrinterConfig')
class PrinterConfigs extends Table {
  TextColumn get address => text()(); // Primary Key equivalent for lookup
  TextColumn get customName => text().nullable()();
  TextColumn get type => text()(); // 'bluetooth', 'wifi', 'usb'
  DateTimeColumn get lastConnectedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {address};
}
