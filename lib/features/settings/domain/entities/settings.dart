import 'package:equatable/equatable.dart';
import 'dart:typed_data';

class AppSettings extends Equatable {
  final int? id;
  final String organizationName;
  final String address;
  final String phone;
  final String? taxId;
  final String? logoPath;
  final Uint8List? logo; // New field
  final String themeMode; // 'system', 'light', 'dark'
  final String currency;
  final bool taxEnabled;
  final bool discountEnabled;
  final String defaultInvoiceTemplate;
  final bool allowPriceUpdates;
  
  // Security lockout fields
  final int failedAttempts;
  final bool isLocked;
  final DateTime? lockedAt;

  const AppSettings({
    this.id,
    required this.organizationName,
    required this.address,
    required this.phone,
    this.taxId,
    this.logoPath,
    this.logo,
    this.themeMode = 'system',
    this.currency = 'USD',
    this.taxEnabled = true,
    this.discountEnabled = true,
    this.defaultInvoiceTemplate = 'compact',
    this.allowPriceUpdates = true,
    this.failedAttempts = 0,
    this.isLocked = false,
    this.lockedAt,
  });

  AppSettings copyWith({
    int? id,
    String? organizationName,
    String? address,
    String? phone,
    String? taxId,
    String? logoPath,
    Uint8List? logo,
    String? themeMode,
    String? currency,
    bool? taxEnabled,
    bool? discountEnabled,
    String? defaultInvoiceTemplate,
    bool? allowPriceUpdates,
    int? failedAttempts,
    bool? isLocked,
    DateTime? lockedAt,
  }) {
    return AppSettings(
      id: id ?? this.id,
      organizationName: organizationName ?? this.organizationName,
      address: address ?? this.address,
      phone: phone ?? this.phone,
      taxId: taxId ?? this.taxId,
      logoPath: logoPath ?? this.logoPath,
      logo: logo ?? this.logo,
      themeMode: themeMode ?? this.themeMode,
      currency: currency ?? this.currency,
      taxEnabled: taxEnabled ?? this.taxEnabled,
      discountEnabled: discountEnabled ?? this.discountEnabled,
      defaultInvoiceTemplate: defaultInvoiceTemplate ?? this.defaultInvoiceTemplate,
      allowPriceUpdates: allowPriceUpdates ?? this.allowPriceUpdates,
      failedAttempts: failedAttempts ?? this.failedAttempts,
      isLocked: isLocked ?? this.isLocked,
      lockedAt: lockedAt ?? this.lockedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        organizationName,
        address,
        phone,
        taxId,
        logoPath,
        logo,
        themeMode,
        currency,
        taxEnabled,
        discountEnabled,
        defaultInvoiceTemplate,
        allowPriceUpdates,
        failedAttempts,
        isLocked,
        lockedAt,
      ];
}
