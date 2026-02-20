import 'package:drift/drift.dart';

@DataClassName('SyncMetaTable')
class SyncMeta extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get deviceId => text()();
  TextColumn get deviceName => text()();
  BoolColumn get isMaster => boolean().withDefault(const Constant(false))();
  TextColumn get secretToken => text().nullable()();
  DateTimeColumn get lastSyncTime => dateTime().nullable()();
}
