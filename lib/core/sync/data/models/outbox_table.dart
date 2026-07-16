import 'package:drift/drift.dart';

@DataClassName('OutboxEvent')
class OutboxTable extends Table {
  TextColumn get id => text()();
  TextColumn get tenantId => text()();
  TextColumn get deviceId => text()();
  TextColumn get correlationId => text()();
  TextColumn get idempotencyKey => text()();
  TextColumn get aggregateType => text()();
  TextColumn get aggregateId => text()();
  TextColumn get eventName => text()();
  IntColumn get eventVersion => integer()();
  
  /// Stored as a serialized JSON string.
  TextColumn get payload => text()();
  
  /// PENDING, PROCESSING, FAILED, DEAD_LETTER, COMPLETED
  TextColumn get status => text().withDefault(const Constant('PENDING'))();
  
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  DateTimeColumn get nextRetryAt => dateTime().nullable()();
  DateTimeColumn get lastAttemptAt => dateTime().nullable()();
  DateTimeColumn get processedAt => dateTime().nullable()();
  
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  
  // DLQ Diagnostics
  TextColumn get lastError => text().nullable()();
  TextColumn get failureReason => text().nullable()();
  IntColumn get httpStatus => integer().nullable()();
  TextColumn get responseBody => text().nullable()();
  TextColumn get stackTrace => text().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}
