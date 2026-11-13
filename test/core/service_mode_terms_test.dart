import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/core/service_mode/service_mode_terms.dart';

void main() {
  group('resolveServiceMode', () {
    test('maps school aliases', () {
      expect(resolveServiceMode('school'), ServiceMode.school);
      expect(resolveServiceMode('education'), ServiceMode.school);
      expect(resolveServiceMode('invify_school'), ServiceMode.school);
    });

    test('maps service aliases', () {
      expect(resolveServiceMode('service'), ServiceMode.services);
      expect(resolveServiceMode('services'), ServiceMode.services);
      expect(resolveServiceMode('hospitality'), ServiceMode.services);
    });

    test('defaults remaining modes to retail', () {
      expect(resolveServiceMode('retail'), ServiceMode.retail);
      expect(resolveServiceMode('order'), ServiceMode.retail);
      expect(resolveServiceMode(null), ServiceMode.retail);
    });
  });

  group('ServiceModeTerms', () {
    test('school preserves student terminology', () {
      final t = ServiceModeTerms.fromRaw('school');
      expect(t.beneficiary, 'Student');
      expect(t.beneficiaryId, 'Admission Number');
      expect(t.beneficiaryGroup, 'Class');
      expect(t.responsiblePerson, 'Parent / Guardian');
      expect(t.beneficiaryIdCard, 'Student ID Card');
      expect(t.attendanceTitle, 'Student Attendance');
      expect(t.hmoHubTitle, 'School Health & Wellness Hub');
      expect(t.idCardPrintBannerFront, 'SCHOOL ID CARD - FRONT');
      expect(t.subjectTypeLabel('student'), 'Student');
    });

    test('retail uses customer terminology', () {
      final t = ServiceModeTerms.fromRaw('retail');
      expect(t.beneficiary, 'Customer');
      expect(t.beneficiaries, 'Customers');
      expect(t.beneficiaryId, 'Customer ID');
      expect(t.staffIdCard, 'Employee ID Card');
      expect(t.attendanceTitle, 'Staff Attendance / Visit Log');
      expect(t.hmoHubTitle, 'Customer Health & Wellness Hub');
      expect(t.idCardPrintBannerFront, 'CUSTOMER ID CARD - FRONT');
      expect(t.subjectTypeLabel('student'), 'Customer');
      expect(t.subjectTypeLabel('staff'), 'Employee');
    });

    test('services uses client terminology', () {
      final t = ServiceModeTerms.fromRaw('services');
      expect(t.beneficiary, 'Client');
      expect(t.beneficiaryId, 'Client ID');
      expect(t.beneficiaryGroup, 'Client Group');
      expect(t.attendanceTitle, 'Staff Attendance / Service Visit Log');
      expect(t.hmoEnrolment, 'Client Health Enrolment');
      expect(t.studentHistoryTab, 'Client History');
      expect(t.subjectTypeLabel('student'), 'Client');
    });
  });
}
