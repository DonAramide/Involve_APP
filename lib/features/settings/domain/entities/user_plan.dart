import 'package:equatable/equatable.dart';

class UserPlan extends Equatable {
  final String planType; // "basic", "pro", "lifetime", "free_trial"
  final DateTime? expiryDate; // null for lifetime

  const UserPlan({
    required this.planType,
    this.expiryDate,
  });
  
  bool get isLifetime => planType.toLowerCase().trim() == 'lifetime';
  bool get isBasic => planType.toLowerCase().trim() == 'basic';
  bool get isFreeTrial =>
      planType.toLowerCase().trim() == 'free_trial' ||
      planType.toLowerCase().trim() == 'trial' ||
      planType.toLowerCase().trim() == 'free';

  bool get isValid {
    if (isLifetime) return true;
    if (expiryDate == null) return !isFreeTrial;
    return DateTime.now().isBefore(expiryDate!);
  }

  /// True for all plans except free tier and basic plan (Standard, Pro, Premium, Enterprise, Lifetime, etc.)
  bool get isPaidOrUpgradedPlan => isValid && !isBasic && !isFreeTrial;

  /// Basic plan, trial, or free tier restricted to 2 staff members and locked bank/virtual account features
  bool get isBasicOrFreeTier => isBasic || isFreeTrial || !isValid;

  /// Backward compatible: treats all plans except free tier and basic plan as upgraded/pro
  bool get isPro => isPaidOrUpgradedPlan;
  bool get allowsUnlimitedStaff => isPaidOrUpgradedPlan;

  @override
  List<Object?> get props => [planType, expiryDate];
}
