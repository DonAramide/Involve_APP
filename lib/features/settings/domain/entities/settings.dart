import 'package:equatable/equatable.dart';
import 'dart:typed_data';

class AppSettings extends Equatable {
  final int? id;
  final String organizationName;
  final String address;
  final String phone;
  final String? businessDescription;
  final String? taxId;
  final String? logoPath;
  final Uint8List? logo; // New field
  final String themeMode; // 'system', 'light', 'dark'
  final String currency;
  final bool taxEnabled;
  final bool discountEnabled;
  final String defaultInvoiceTemplate;
  final bool allowPriceUpdates;
  final bool confirmPriceOnSelection;
  final double taxRate;
  
  final String? bankName;
  final String? accountNumber;
  final String? accountName;
  final bool showAccountDetails;
  
  // Security lockout fields
  final int failedAttempts;
  final bool isLocked;
  final DateTime? lockedAt;
  final String receiptFooter;
  final bool showSignatureSpace;
  final bool paymentMethodsEnabled;
  final int primaryColor;
  final bool showDateTime;
  
  // Service Billing
  final bool serviceBillingEnabled;
  final List<String> serviceTypes;

  // Phase 4: Staff & Refinements
  final bool staffManagementEnabled;
  final int paperWidth;
  final int halfDayStartHour;
  final int halfDayEndHour;
  final bool showSyncStatus;

  const AppSettings({
    this.id,
    required this.organizationName,
    required this.address,
    required this.phone,
    this.businessDescription,
    this.taxId,
    this.logoPath,
    this.logo,
    this.themeMode = 'system',
    this.currency = '₦',
    this.taxEnabled = true,
    this.discountEnabled = true,
    this.defaultInvoiceTemplate = 'compact',
    this.allowPriceUpdates = true,
    this.confirmPriceOnSelection = false,
    this.taxRate = 0.15,
    this.bankName,
    this.accountNumber,
    this.accountName,
    this.showAccountDetails = false,
    this.failedAttempts = 0,
    this.isLocked = false,
    this.lockedAt,
    this.receiptFooter = 'Thank you!',
    this.showSignatureSpace = false,
    this.paymentMethodsEnabled = false,
    this.primaryColor = 0xFF2196F3, // Colors.blue.value
    this.showDateTime = true,
    this.serviceBillingEnabled = false,
    this.serviceTypes = const [],
    this.staffManagementEnabled = false,
    this.paperWidth = 80,
    this.halfDayStartHour = 6,
    this.halfDayEndHour = 18,
    this.showSyncStatus = true,
  });

  AppSettings copyWith({
    int? id,
    String? organizationName,
    String? address,
    String? phone,
    String? businessDescription,
    String? taxId,
    String? logoPath,
    Uint8List? logo,
    String? themeMode,
    String? currency,
    bool? taxEnabled,
    bool? discountEnabled,
    String? defaultInvoiceTemplate,
    bool? allowPriceUpdates,
    bool? confirmPriceOnSelection,
    double? taxRate,
    String? bankName,
    String? accountNumber,
    String? accountName,
    bool? showAccountDetails,
    int? failedAttempts,
    bool? isLocked,
    DateTime? lockedAt,
    String? receiptFooter,
    bool? showSignatureSpace,
    bool? paymentMethodsEnabled,
    int? primaryColor,
    bool? showDateTime,
    bool? serviceBillingEnabled,
    List<String>? serviceTypes,
    bool? staffManagementEnabled,
    int? paperWidth,
    int? halfDayStartHour,
    int? halfDayEndHour,
    bool? showSyncStatus,
  }) {
    return AppSettings(
      id: id ?? this.id,
      organizationName: organizationName ?? this.organizationName,
      address: address ?? this.address,
      phone: phone ?? this.phone,
      businessDescription: businessDescription ?? this.businessDescription,
      taxId: taxId ?? this.taxId,
      logoPath: logoPath ?? this.logoPath,
      logo: logo ?? this.logo,
      themeMode: themeMode ?? this.themeMode,
      currency: currency ?? this.currency,
      taxEnabled: taxEnabled ?? this.taxEnabled,
      discountEnabled: discountEnabled ?? this.discountEnabled,
      defaultInvoiceTemplate: defaultInvoiceTemplate ?? this.defaultInvoiceTemplate,
      allowPriceUpdates: allowPriceUpdates ?? this.allowPriceUpdates,
      confirmPriceOnSelection: confirmPriceOnSelection ?? this.confirmPriceOnSelection,
      taxRate: taxRate ?? this.taxRate,
      bankName: bankName ?? this.bankName,
      accountNumber: accountNumber ?? this.accountNumber,
      accountName: accountName ?? this.accountName,
      showAccountDetails: showAccountDetails ?? this.showAccountDetails,
      failedAttempts: failedAttempts ?? this.failedAttempts,
      isLocked: isLocked ?? this.isLocked,
      lockedAt: lockedAt ?? this.lockedAt,
      receiptFooter: receiptFooter ?? this.receiptFooter,
      showSignatureSpace: showSignatureSpace ?? this.showSignatureSpace,
      paymentMethodsEnabled: paymentMethodsEnabled ?? this.paymentMethodsEnabled,
      primaryColor: primaryColor ?? this.primaryColor,
      showDateTime: showDateTime ?? this.showDateTime,
      serviceBillingEnabled: serviceBillingEnabled ?? this.serviceBillingEnabled,
      serviceTypes: serviceTypes ?? this.serviceTypes,
      staffManagementEnabled: staffManagementEnabled ?? this.staffManagementEnabled,
      paperWidth: paperWidth ?? this.paperWidth,
      halfDayStartHour: halfDayStartHour ?? this.halfDayStartHour,
      halfDayEndHour: halfDayEndHour ?? this.halfDayEndHour,
      showSyncStatus: showSyncStatus ?? this.showSyncStatus,
    );
  }

  @override
  List<Object?> get props => [
        id,
        organizationName,
        address,
        phone,
        businessDescription,
        taxId,
        logoPath,
        logo,
        themeMode,
        currency,
        taxEnabled,
        discountEnabled,
        defaultInvoiceTemplate,
        allowPriceUpdates,
        confirmPriceOnSelection,
        taxRate,
        bankName,
        accountNumber,
        accountName,
        showAccountDetails,
        failedAttempts,
        isLocked,
        lockedAt,
        receiptFooter,
        showSignatureSpace,
        paymentMethodsEnabled,
        primaryColor,
        showDateTime,
        serviceBillingEnabled,
        serviceTypes,
        staffManagementEnabled,
        paperWidth,
        halfDayStartHour,
        halfDayEndHour,
        showSyncStatus,
      ];
}
