import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:involve_app/core/utils/device_info_service.dart';
import '../../domain/entities/staff.dart';
import '../../domain/repositories/staff_repository.dart';
import '../models/staff_table.dart' hide Staff; 
import 'package:crypto/crypto.dart';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:get_it/get_it.dart';
import 'package:involve_app/core/services/finance_api_client.dart';

class StaffRepositoryImpl implements StaffRepository {
  final AppDatabase db;

  StaffRepositoryImpl(this.db);

  String _hash(String input) {
    if (input.isEmpty) return "";
    const salt = "STAFF-PIN-INVIFY-2024-PROTECT";
    final bytes = utf8.encode(input + salt);
    return sha256.convert(bytes).toString();
  }

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
            staffCode: _hash(staff.staffCode),
            staffId: Value(staff.staffId),
            phone: Value(staff.phone),
            role: Value(staff.role),
            isActive: Value(staff.isActive),
            syncId: Value(staff.syncId ?? const Uuid().v4()),
            updatedAt: Value(now),
            createdAt: Value(now),
            deviceId: Value(deviceId),
            isDeleted: const Value(false),
            virtualBankName: Value(staff.virtualBankName),
            virtualAccountNumber: Value(staff.virtualAccountNumber),
            virtualAccountName: Value(staff.virtualAccountName),
            bankCode: Value(staff.bankCode),
          ),
        );
  }

  @override
  Future<void> updateStaff(Staff staff) async {
    if (staff.id == null) return;

    // Only hash if it's a short pin (not already hashed)
    String finalizedCode = staff.staffCode;
    if (finalizedCode.length <= 4 && finalizedCode.isNotEmpty) {
      finalizedCode = _hash(finalizedCode);
    }

    await (db.update(db.staff)..where((s) => s.id.equals(staff.id!))).write(
          StaffCompanion(
            name: Value(staff.name),
            staffCode: Value(finalizedCode),
            staffId: Value(staff.staffId),
            phone: Value(staff.phone),
            role: Value(staff.role),
            isActive: Value(staff.isActive),
            updatedAt: Value(DateTime.now()),
            isDeleted: const Value(false),
            virtualBankName: Value(staff.virtualBankName),
            virtualAccountNumber: Value(staff.virtualAccountNumber),
            virtualAccountName: Value(staff.virtualAccountName),
            bankCode: Value(staff.bankCode),
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
          ..where((s) => s.staffCode.equals(_hash(code)))
          ..where((s) => s.isActive.equals(true)))
        .getSingleOrNull();
    return result != null ? _toEntity(result) : null;
  }

  @override
  Future<int> pullCloudGovernance() async {
    try {
      final sl = GetIt.instance;
      if (!sl.isRegistered<FinanceApiClient>()) return 0;
      final res = await sl<FinanceApiClient>().get('/api/staff', queryParameters: {
        'forDevice': '1',
      });
      final raw = res.data;
      List list = const [];
      if (raw is Map && raw['data'] is List) {
        list = raw['data'] as List;
      } else if (raw is List) {
        list = raw;
      }
      final records = list
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      return applyCloudStaffRecords(records);
    } catch (e) {
      debugPrint('[StaffRepo] pullCloudGovernance failed: $e');
      return 0;
    }
  }

  @override
  Future<int> applyCloudStaffRecords(List<Map<String, dynamic>> records) async {
    if (records.isEmpty) return 0;
    final local = await db.select(db.staff).get();
    var applied = 0;
    for (final cloud in records) {
      try {
        final match = _matchLocal(local, cloud);
        final role = (cloud['role'] ?? 'STAFF').toString().toUpperCase();
        final isActive = cloud['isActive'] != false &&
            cloud['is_active'] != false &&
            cloud['status']?.toString().toUpperCase() != 'SUSPENDED';
        final pinHash = (cloud['pinHash'] ?? cloud['pin_hash'])?.toString();
        final name = (cloud['name'] ?? '').toString().trim();
        final phone = cloud['phone']?.toString();
        final staffId = (cloud['staffId'] ?? cloud['staff_id'])?.toString();
        final cloudId = (cloud['syncId'] ?? cloud['id'])?.toString();

        if (match != null) {
          await (db.update(db.staff)..where((s) => s.id.equals(match.id))).write(
            StaffCompanion(
              name: name.isNotEmpty ? Value(name) : const Value.absent(),
              phone: phone != null ? Value(phone) : const Value.absent(),
              staffId: staffId != null ? Value(staffId) : const Value.absent(),
              role: Value(role),
              isActive: Value(isActive),
              staffCode: (pinHash != null && pinHash.length > 8)
                  ? Value(pinHash)
                  : const Value.absent(),
              syncId: (cloudId != null && cloudId.isNotEmpty)
                  ? Value(cloudId)
                  : const Value.absent(),
              updatedAt: Value(DateTime.now()),
              isDeleted: const Value(false),
            ),
          );
          applied += 1;
        } else if (name.isNotEmpty && pinHash != null && pinHash.length > 8) {
          final deviceId = await DeviceInfoService.getDeviceSuffix();
          await db.into(db.staff).insert(
            StaffCompanion.insert(
              name: name,
              staffCode: pinHash,
              staffId: Value(staffId),
              phone: Value(phone),
              role: Value(role),
              isActive: Value(isActive),
              syncId: Value(cloudId ?? const Uuid().v4()),
              updatedAt: Value(DateTime.now()),
              createdAt: Value(DateTime.now()),
              deviceId: Value(deviceId),
              isDeleted: const Value(false),
            ),
          );
          applied += 1;
        }
      } catch (e) {
        debugPrint('[StaffRepo] applyCloudStaffRecords row failed: $e');
      }
    }
    return applied;
  }

  StaffTable? _matchLocal(List<StaffTable> local, Map<String, dynamic> cloud) {
    final id = cloud['id']?.toString();
    final syncId = cloud['syncId']?.toString();
    final phone = cloud['phone']?.toString();
    final staffId = (cloud['staffId'] ?? cloud['staff_id'])?.toString();
    final name = cloud['name']?.toString();
    for (final s in local) {
      if (s.syncId != null &&
          s.syncId!.isNotEmpty &&
          (s.syncId == id || s.syncId == syncId)) {
        return s;
      }
    }
    if (phone != null && phone.isNotEmpty && phone != '—') {
      final hits = local.where((s) => (s.phone ?? '') == phone).toList();
      if (hits.length == 1) return hits.first;
    }
    if (staffId != null && staffId.isNotEmpty && staffId != '—') {
      final hits = local.where((s) => (s.staffId ?? '') == staffId).toList();
      if (hits.length == 1) return hits.first;
    }
    if (name != null && name.isNotEmpty) {
      final hits = local
          .where((s) => s.name.toLowerCase() == name.toLowerCase())
          .toList();
      if (hits.length == 1) return hits.first;
    }
    return null;
  }

  Staff _toEntity(StaffTable row) {
    // Safely fallback in case role is absent or null in SQLite result
    String roleVal = 'STAFF';
    try {
      roleVal = (row as dynamic).role ?? 'STAFF';
    } catch (_) {}

    return Staff(
      id: row.id,
      name: row.name,
      staffCode: row.staffCode,
      staffId: row.staffId,
      phone: row.phone,
      role: roleVal,
      isActive: row.isActive,
      syncId: row.syncId,
      virtualBankName: row.virtualBankName,
      virtualAccountNumber: row.virtualAccountNumber,
      virtualAccountName: row.virtualAccountName,
      bankCode: row.bankCode,
    );
  }
}
