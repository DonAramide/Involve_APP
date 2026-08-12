import 'package:involve_app/features/settings/domain/entities/settings.dart';

extension BusinessTerminology on AppSettings {
  String get productLabel {
    if (businessMode == 'school') return 'Fee';
    if (businessMode == 'services') return 'Service';
    return 'Product';
  }

  String get categoryLabel {
    if (businessMode == 'school') return 'Fee Type';
    if (businessMode == 'services') return 'Service Category';
    return 'Category';
  }

  String get customerLabel {
    if (businessMode == 'school') return 'Student';
    if (businessMode == 'services') return 'Client';
    return 'Customer';
  }

  String get invoiceLabel {
    if (businessMode == 'school') return 'Term Bill';
    if (businessMode == 'services') return 'Job / Invoice';
    return 'Invoice';
  }

  String get salesLabel {
    if (businessMode == 'school') return 'Billing Records';
    if (businessMode == 'services') return 'Service Records';
    return 'Sales Records';
  }

  /// Cash / POS / Transfer / Wallet payment ledger (not document history).
  String get transactionHistoryLabel {
    if (businessMode == 'school') return 'Payment History';
    if (businessMode == 'services') return 'Payment History';
    return 'Transaction History';
  }
  
  // Plural forms and UI hints
  String get productsLabel {
    if (businessMode == 'school') return 'Fees';
    if (businessMode == 'services') return 'Services';
    return 'Products';
  }

  String get categoriesLabel {
    if (businessMode == 'school') return 'Fee Types';
    if (businessMode == 'services') return 'Service Categories';
    return 'Categories';
  }

  String get customersLabel {
    if (businessMode == 'school') return 'Students';
    if (businessMode == 'services') return 'Clients';
    return 'Customers';
  }

  String get searchItemsHint {
    if (businessMode == 'school') return 'Search fees/items...';
    if (businessMode == 'services') return 'Search services...';
    return 'Search products...';
  }

  String get noItemsFound {
    if (businessMode == 'school') return 'None found';
    if (businessMode == 'services') return 'No services found';
    return 'No products found';
  }

  String get newSaleLabel {
    if (businessMode == 'school') return 'NEW TERM BILL';
    if (businessMode == 'services') return 'NEW JOB / INVOICE';
    return 'NEW INVOICE';
  }

  String get stockLabel {
    if (businessMode == 'school') return 'Fee Structure';
    if (businessMode == 'services') return 'Service Catalog';
    return 'Stock';
  }
  
  String get stockHistoryLabel {
    if (businessMode == 'school') return 'Price History';
    return 'Stock History';
  }

  String get stockAdditionsLabel {
    if (businessMode == 'school') return 'No history recorded yet.';
    if (businessMode == 'services') return 'No updates recorded yet.';
    return 'No stock additions recorded yet.';
  }
  
  String get assignToCustomerLabel {
    if (businessMode == 'school') return 'Assign to Student';
    if (businessMode == 'services') return 'Assign to Client';
    return 'Add Customer Name & Phone';
  }

  String get assignExternalCustomerLabel {
    if (businessMode == 'school') return 'Add External Customer/Student';
    if (businessMode == 'services') return 'Add Walk-in Client';
    return 'Add Walk-in Customer';
  }
  
  String get customerInfoLabel {
    if (businessMode == 'school') return 'Student Information';
    if (businessMode == 'services') return 'Client Information';
    return 'Customer Information';
  }

  String get customerNameLabel {
    if (businessMode == 'school') return 'Student Full Name';
    if (businessMode == 'services') return 'Client Full Name';
    return 'Customer Name';
  }

  String get customerPhoneLabel {
    if (businessMode == 'school') return 'Parent Phone Number';
    if (businessMode == 'services') return 'Client Phone Number';
    return 'Customer Phone';
  }

  String get customerAddressLabel {
    if (businessMode == 'school') return 'Home Address';
    if (businessMode == 'services') return 'Client Address';
    return 'Customer Address';
  }
  
  String get sellingPriceLabel {
    if (businessMode == 'school') return 'Fee Amount';
    if (businessMode == 'services') return 'Rate / Fee';
    return 'Selling Price';
  }

  String get saleLabel {
    if (businessMode == 'school') return 'Fee Payment';
    if (businessMode == 'services') return 'Service Fee';
    return 'Sale';
  }

  String get collectedLabel {
    if (businessMode == 'school') return 'Total Fees Collected';
    if (businessMode == 'services') return 'Total Revenue';
    return 'Total Revenue';
  }

  String get costPriceLabel {
    if (businessMode == 'school') return 'Base Cost';
    return 'Cost Price';
  }
}
