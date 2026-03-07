import 'package:drift/drift.dart';
import '../../domain/repositories/printer_service.dart';
import '../../../stock/data/datasources/app_database.dart';

abstract class PrinterRepository {
  Future<void> saveConfig(PrinterDevice device);
  Future<PrinterDevice?> getConfig(String address);
  Future<List<PrinterDevice>> getAllConfigs();
  Future<PrinterDevice?> getLastUsedPrinter();
}

class PrinterRepositoryImpl implements PrinterRepository {
  final AppDatabase db;

  PrinterRepositoryImpl(this.db);

  @override
  Future<void> saveConfig(PrinterDevice device) async {
    await db.into(db.printerConfigs).insertOnConflictUpdate(
      PrinterConfigsCompanion(
        address: Value(device.address),
        customName: Value(device.customName),
        type: Value(device.type ?? 'unknown'),
        lastConnectedAt: Value(DateTime.now()),
      ),
    );
  }

  @override
  Future<PrinterDevice?> getConfig(String address) async {
    final query = db.select(db.printerConfigs)..where((t) => t.address.equals(address));
    final result = await query.getSingleOrNull();
    if (result == null) return null;
    return _toEntity(result);
  }

  @override
  Future<List<PrinterDevice>> getAllConfigs() async {
    final results = await db.select(db.printerConfigs).get();
    return results.map(_toEntity).toList();
  }

  @override
  Future<PrinterDevice?> getLastUsedPrinter() async {
    final query = db.select(db.printerConfigs)
      ..orderBy([(t) => OrderingTerm(expression: t.lastConnectedAt, mode: OrderingMode.desc)])
      ..limit(1);
    final result = await query.getSingleOrNull();
    if (result == null) return null;
    return _toEntity(result);
  }

  PrinterDevice _toEntity(PrinterConfig data) {
    return PrinterDevice(
      name: data.customName ?? 'Unknown Printer', // Usually we combine with scan data later
      address: data.address,
      customName: data.customName,
      type: data.type,
    );
  }
}
