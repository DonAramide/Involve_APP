import 'package:equatable/equatable.dart';

class AppSettings extends Equatable {
  final int? id;
  final String organizationName;
  final String address;
  final String phone;
  final String? taxId;
  final String? logoPath;
  final String currency;
  final bool taxEnabled;
  final bool discountEnabled;
  final String defaultInvoiceTemplate;
  final bool allowPriceUpdates;

  const AppSettings({
    this.id,
    required this.organizationName,
    required this.address,
    required this.phone,
    this.taxId,
    this.logoPath,
    this.currency = 'USD',
    this.taxEnabled = true,
    this.discountEnabled = true,
    this.defaultInvoiceTemplate = 'compact',
    this.allowPriceUpdates = true,
  });

  AppSettings copyWith({
    int? id,
    String? organizationName,
    String? address,
    String? phone,
    String? taxId,
    String? logoPath,
    String? currency,
    bool? taxEnabled,
    bool? discountEnabled,
    String? defaultInvoiceTemplate,
    bool? allowPriceUpdates,
  }) {
    return AppSettings(
      id: id ?? this.id,
      organizationName: organizationName ?? this.organizationName,
      address: address ?? this.address,
      phone: phone ?? this.phone,
      taxId: taxId ?? this.taxId,
      logoPath: logoPath ?? this.logoPath,
      currency: currency ?? this.currency,
      taxEnabled: taxEnabled ?? this.taxEnabled,
      discountEnabled: discountEnabled ?? this.discountEnabled,
      defaultInvoiceTemplate: defaultInvoiceTemplate ?? this.defaultInvoiceTemplate,
      allowPriceUpdates: allowPriceUpdates ?? this.allowPriceUpdates,
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
        currency,
        taxEnabled,
        discountEnabled,
        defaultInvoiceTemplate,
        allowPriceUpdates,
      ];
}
