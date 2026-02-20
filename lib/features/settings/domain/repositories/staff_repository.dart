import '../../domain/entities/staff.dart';

abstract class StaffRepository {
  Future<List<Staff>> getAllStaff();
  Future<Staff?> getStaffById(int id);
  Future<int> addStaff(Staff staff);
  Future<void> updateStaff(Staff staff);
  Future<void> deleteStaff(int id);
  Future<Staff?> authenticateStaff(int id, String code);
}
