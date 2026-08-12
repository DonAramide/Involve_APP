import 'package:equatable/equatable.dart';

class UserPlan extends Equatable {
  final String planType; // "basic", "pro", "lifetime", "free_trial"
  final DateTime? expiryDate; // null for lifetime

  const UserPlan({
    required this.planType,
    this.expiryDate,
  });
  
  bool get isLifetime => planType == 'lifetime';
  bool get isPro => planType == 'pro' || planType == 'standard' || planType == 'premium' || planType == 'enterprise' || planType == 'lifetime';
  bool get isBasic => planType == 'basic';
  bool get isFreeTrial => planType == 'free_trial' || planType == 'trial';

  bool get isValid {
    if (isLifetime) return true;
    if (expiryDate == null) return false;
    return DateTime.now().isBefore(expiryDate!);
  }

  @override
  List<Object?> get props => [planType, expiryDate];
}
