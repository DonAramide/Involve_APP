import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:involve_app/core/utils/device_info_service.dart';
import '../../domain/entities/staff.dart';
import '../../domain/repositories/staff_repository.dart';
import '../models/staff_table.dart' hide Staff; 

class StaffRepositoryImpl implements StaffRepository {
  final AppDatabase db;

  StaffRepositoryImpl(this.db);

  @override
  Future<List<Staff>> getAllStaff() async {
    final results = await db.select(db.staff).get();
    return results.map(_toEntity).toList();
  }

  @override
  Future<Staff?> getStaffById(int id) async {
    final result = await (db.select(db.staff)..where((s) => s.id.equals(id))).getSingleOrNull();
    return result != null ? _toEntity(result) : null;
  }

  @override
  Future<int> addStaff(Staff staff) async {
    final now = DateTime.now();
    final deviceId = await DeviceInfoService.getDeviceSuffix();
    return await db.into(db.staff).insert(
          StaffCompanion.insert(
            name: staff.name,
            staffCode: staff.staffCode,
            isActive: Value(staff.isActive),
            syncId: Value(staff.syncId ?? const Uuid().v4()),
            updatedAt: Value(now),
            createdAt: Value(now),
            deviceId: Value(deviceId),
            isDeleted: const Value(false),
          ),
        );
  }

  @override
  Future<void> updateStaff(Staff staff) async {
    if (staff.id == null) return;
    await (db.update(db.staff)..where((s) => s.id.equals(staff.id!))).write(
          StaffCompanion(
            name: Value(staff.name),
            staffCode: Value(staff.staffCode),
            isActive: Value(staff.isActive),
            updatedAt: Value(DateTime.now()),
            isDeleted: const Value(false),
          ),
        );
  }

  @override
  Future<void> deleteStaff(int id) async {
    // Soft delete for sync
    await (db.update(db.staff)..where((s) => s.id.equals(id))).write(
      StaffCompanion(
        isDeleted: const Value(true),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  @override
  Future<Staff?> authenticateStaff(int id, String code) async {
    final result = await (db.select(db.staff)
          ..where((s) => s.id.equals(id))
          ..where((s) => s.staffCode.equals(code))
          ..where((s) => s.isActive.equals(true)))
        .getSingleOrNull();
    return result != null ? _toEntity(result) : null;
  }

  Staff _toEntity(StaffTable row) {
    return Staff(
      id: row.id,
      name: row.name,
      staffCode: row.staffCode,
      isActive: row.isActive,
    );
  }
}
