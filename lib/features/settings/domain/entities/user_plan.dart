import 'package:equatable/equatable.dart';

/// Subscription plan for feature gating.
///
/// Canonical product tiers:
/// - **Basic** — offline / limited features (includes free trial for gating)
/// - **Standard** — online access with full features + up to 3 devices
/// - **Premium** — unlimited devices + first-class support
///
/// Legacy aliases still accepted: `pro` → standard, `lifetime`/`enterprise` → premium,
/// `free_trial`/`trial`/`free` → basic (trial display name kept).
class UserPlan extends Equatable {
  final String planType;
  final DateTime? expiryDate; // null for lifetime-style premium

  const UserPlan({
    required this.planType,
    this.expiryDate,
  });

  String get _raw => planType.toLowerCase().trim();

  /// One of: `basic`, `standard`, `premium`.
  String get normalizedTier {
    final p = _raw;
    if (p == 'premium' || p == 'lifetime' || p == 'enterprise') return 'premium';
    if (p == 'standard' || p == 'pro') return 'standard';
    return 'basic';
  }

  bool get isLifetime => _raw == 'lifetime';
  bool get isBasic => normalizedTier == 'basic' && !isFreeTrial;
  bool get isFreeTrial =>
      _raw == 'free_trial' || _raw == 'trial' || _raw == 'free';

  bool get isValid {
    if (isLifetime) return true;
    if (expiryDate == null) return !isFreeTrial;
    return DateTime.now().isBefore(expiryDate!);
  }

  /// Basic or trial (or expired) — limited / offline feature set.
  bool get isBasicTier => !isValid || normalizedTier == 'basic' || isFreeTrial;

  bool get isStandard => isValid && normalizedTier == 'standard';
  bool get isPremium => isValid && normalizedTier == 'premium';

  /// Standard or Premium: online access with full product features.
  bool get hasOnlineAccess => isValid && (isStandard || isPremium);

  /// Standard or Premium can use multi-device sync (see [maxDevices]).
  bool get allowsMultiDevice => hasOnlineAccess;

  /// Max linked devices: Basic `0`, Standard `3`, Premium `null` (unlimited).
  int? get maxDevices {
    if (isPremium) return null;
    if (isStandard) return 3;
    return 0;
  }

  bool get hasUnlimitedDevices => maxDevices == null;

  bool canAddDevice(int currentDeviceCount) {
    final max = maxDevices;
    if (max == null) return true;
    return currentDeviceCount < max;
  }

  /// True for Standard / Premium (legacy “pro” naming).
  bool get isPaidOrUpgradedPlan => hasOnlineAccess;

  /// Basic, trial, or expired — staff / bank / VA limits apply.
  bool get isBasicOrFreeTier => isBasicTier;

  /// Backward compatible alias for paid plans.
  bool get isPro => hasOnlineAccess;
  bool get allowsUnlimitedStaff => hasOnlineAccess;

  /// Badge / settings label.
  String get displayName {
    if (isFreeTrial) return 'FREE_TRIAL';
    switch (normalizedTier) {
      case 'premium':
        return 'PREMIUM';
      case 'standard':
        return 'STANDARD';
      default:
        return 'BASIC';
    }
  }

  static const String basicSummary = 'Basic — offline with limited features';
  static const String standardSummary =
      'Standard — online full features + up to 3 devices';
  static const String premiumSummary =
      'Premium — unlimited devices + first-class support';

  String get upgradeHint {
    if (isPremium) return 'You are on Premium with unlimited devices.';
    if (isStandard) {
      return 'Upgrade to Premium for unlimited devices and first-class support.';
    }
    return 'Upgrade to Standard or Premium to unlock online features.';
  }

  @override
  List<Object?> get props => [planType, expiryDate];
}
