import 'dart:convert';

enum PlanType { basic, pro, lifetime }

class LicenseModel {
  final String businessName;
  final DateTime expiryDate;
  final PlanType planType;
  final String licenseId;

  LicenseModel({
    required this.businessName,
    required this.expiryDate,
    required this.planType,
    required this.licenseId,
  });

  Map<String, dynamic> toJson() {
    return {
      'businessName': businessName,
      'expiryDate': expiryDate.toIso8601String(),
      'planType': planType.name,
      'licenseId': licenseId,
    };
  }

  factory LicenseModel.fromJson(Map<String, dynamic> json) {
    return LicenseModel(
      businessName: json['businessName'] as String,
      expiryDate: DateTime.parse(json['expiryDate'] as String),
      planType: PlanType.values.firstWhere(
        (e) => e.name == json['planType'],
        orElse: () => PlanType.basic,
      ),
      licenseId: json['licenseId'] as String,
    );
  }

  String toBase64Json() {
    final jsonString = jsonEncode(toJson());
    return base64Url.encode(utf8.encode(jsonString));
  }

  factory LicenseModel.fromBase64Json(String base64String) {
    final jsonString = utf8.decode(base64Url.decode(base64String));
    final jsonMap = jsonDecode(jsonString) as Map<String, dynamic>;
    return LicenseModel.fromJson(jsonMap);
  }

  @override
  String toString() {
    return 'LicenseModel(businessName: $businessName, expiryDate: $expiryDate, planType: $planType, licenseId: $licenseId)';
  }
}
