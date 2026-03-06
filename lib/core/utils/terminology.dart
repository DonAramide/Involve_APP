import 'package:involve_app/features/settings/domain/entities/settings.dart';

extension BusinessTerminology on AppSettings {
  String get productLabel => businessMode == 'school' ? 'Fee' : 'Product';
  String get categoryLabel => businessMode == 'school' ? 'Fee Type' : 'Category';
  String get customerLabel => businessMode == 'school' ? 'Student' : 'Customer';
  String get invoiceLabel => businessMode == 'school' ? 'Term Bill' : 'Invoice';
  String get salesLabel => businessMode == 'school' ? 'Billing Records' : 'Sales Records';
  
  // Plural forms and UI hints
  String get productsLabel => businessMode == 'school' ? 'Fees' : 'Products';
  String get categoriesLabel => businessMode == 'school' ? 'Fee Types' : 'Categories';
  String get customersLabel => businessMode == 'school' ? 'Students' : 'Customers';
  String get searchItemsHint => businessMode == 'school' ? 'Search fees/items...' : 'Search products...';
  String get noItemsFound => businessMode == 'school' ? 'None found' : 'No products found';
  String get newSaleLabel => businessMode == 'school' ? 'NEW TERM BILL' : 'NEW INVOICE';
  String get stockLabel => businessMode == 'school' ? 'Fee Structure' : 'Stock';
  
  String get stockHistoryLabel => businessMode == 'school' ? 'Price History' : 'Stock History';
  String get stockAdditionsLabel => businessMode == 'school' ? 'No history recorded yet.' : 'No stock additions recorded yet.';
  
  String get assignToCustomerLabel => businessMode == 'school' ? 'Assign to Student' : 'Add Customer Name & Phone';
  
  String get customerInfoLabel => businessMode == 'school' ? 'Student Information' : 'Customer Information';
  String get customerNameLabel => businessMode == 'school' ? 'Student Full Name' : 'Customer Name';
  String get customerPhoneLabel => businessMode == 'school' ? 'Parent Phone Number' : 'Customer Phone';
  String get customerAddressLabel => businessMode == 'school' ? 'Home Address' : 'Customer Address';
  
  String get sellingPriceLabel => businessMode == 'school' ? 'Fee Amount' : 'Selling Price';
  String get costPriceLabel => businessMode == 'school' ? 'Base Cost' : 'Cost Price';
}
