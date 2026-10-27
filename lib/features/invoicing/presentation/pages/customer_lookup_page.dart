import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
import 'package:involve_app/features/invoicing/domain/repositories/invoice_repository.dart';
import 'package:involve_app/core/utils/phone_number_input.dart';
import 'package:involve_app/features/invoicing/presentation/pages/customer_history_page.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';
import 'package:involve_app/features/services/domain/repositories/services_repository.dart';
import 'package:involve_app/features/services/domain/entities/service_customer.dart';

class CustomerLookupPage extends StatefulWidget {
  const CustomerLookupPage({super.key});

  @override
  State<CustomerLookupPage> createState() => _CustomerLookupPageState();
}

class _CustomerLookupPageState extends State<CustomerLookupPage> {
  List<ServiceCustomer> _allCustomers = [];
  List<ServiceCustomer> _filteredCustomers = [];
  bool _isLoading = true;
  String _searchQuery = '';
  DateTimeRange? _selectedRange;

  @override
  void initState() {
    super.initState();
    _loadCustomers();
  }

  Future<void> _loadCustomers() async {
    setState(() => _isLoading = true);
    try {
      final repo = context.read<IServicesRepository>();
      final customers = await repo.getCustomers();
      
      // Also fetch legacy names from invoices and merge? 
      // For now, let's just use the Customers table as the source of truth.
      
      setState(() {
        _allCustomers = customers;
        _filteredCustomers = customers;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(friendlyApiError(e, fallback: 'Could not load customers.'))),
        );
      }
    }
  }

  bool _showDebtorsOnly = false;

  void _filterCustomers([String? query]) {
    if (query != null) _searchQuery = query;
    setState(() {
      _filteredCustomers = _allCustomers.where((c) {
        final matchesSearch = c.name.toLowerCase().contains(_searchQuery.toLowerCase()) || 
                             (c.phone != null && c.phone!.contains(_searchQuery));
        final matchesDebtor = !_showDebtorsOnly || c.balance > 0;
        return matchesSearch && matchesDebtor;
      }).toList();
    });
  }

  Future<void> _selectDateRange() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 1)),
      initialDateRange: _selectedRange,
    );
    if (picked != null) {
      setState(() => _selectedRange = picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Customer Lookup'),
        actions: [
          IconButton(
            icon: const Icon(Icons.date_range),
            onPressed: _selectDateRange,
            tooltip: 'Filter by Purchase Date',
            color: _selectedRange != null ? Colors.orange : null,
          ),
          if (_selectedRange != null)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () => setState(() => _selectedRange = null),
            ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search customer name...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: Colors.grey[100],
              ),
              onChanged: _filterCustomers,
            ),
          ),
          SwitchListTile(
            title: const Text('Show Debtors Only', style: TextStyle(fontWeight: FontWeight.bold)),
            subtitle: const Text('Only show customers owing balance'),
            value: _showDebtorsOnly,
            onChanged: (val) {
              setState(() => _showDebtorsOnly = val);
              _filterCustomers();
            },
            secondary: const Icon(Icons.money_off, color: Colors.red),
            dense: true,
            activeColor: Colors.red,
          ),
          if (_selectedRange != null)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
              color: Colors.orange.withOpacity(0.1),
              width: double.infinity,
              child: Text(
                'Showing purchase history for: ${DateFormat('MMM dd, yyyy').format(_selectedRange!.start)} - ${DateFormat('MMM dd, yyyy').format(_selectedRange!.end)}',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.orange),
                textAlign: TextAlign.center,
              ),
            ),
          Expanded(
            child: _isLoading
                ? const InvifyLoadingIndicator(message: 'FETCHING CUSTOMER PROFILES...')
                : _filteredCustomers.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.person_off, size: 64, color: Colors.grey),
                            const SizedBox(height: 16),
                            Text(
                              _searchQuery.isEmpty ? 'No customers found.' : 'No matching customers found.',
                              style: const TextStyle(color: Colors.grey),
                            ),
                          ],
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _filteredCustomers.length,
                        separatorBuilder: (context, index) => const Divider(),
                        itemBuilder: (context, index) {
                          final customer = _filteredCustomers[index];
                          final name = customer.name;
                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
                              backgroundImage: customer.image != null ? MemoryImage(customer.image!) : null,
                              child: customer.image == null ? Text(name[0].toUpperCase()) : null,
                            ),
                            title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (customer.phone != null && customer.phone!.isNotEmpty)
                                  Text(customer.phone!, style: const TextStyle(fontSize: 13, color: Colors.grey)),
                                const SizedBox(height: 4),
                                Text(
                                  customer.balance > 0 
                                      ? 'Owing: ₦${customer.balance.toStringAsFixed(2)}' 
                                      : customer.balance < 0 
                                          ? 'Credit: ₦${(-customer.balance).toStringAsFixed(2)}'
                                          : 'Status: No Debt',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: customer.balance > 0 ? Colors.red : (customer.balance < 0 ? Colors.green : Colors.grey),
                                  ),
                                ),
                              ],
                            ),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => CustomerHistoryPage(
                                    customer: customer,
                                    initialDateRange: _selectedRange,
                                  ),
                                ),
                              );
                            },
                          );
                        },
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddCustomerDialog,
        child: const Icon(Icons.person_add),
      ),
    );
  }

  Future<void> _showAddCustomerDialog() async {
    final nameController = TextEditingController();
    final phoneController = TextEditingController();
    final emailController = TextEditingController();
    final addressController = TextEditingController();

    await showDialog(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (context, setDialogState) {
          String? phoneError;

          return AlertDialog(
            title: const Text('Register New Customer'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: nameController,
                    decoration: const InputDecoration(
                      labelText: 'Customer Name (Required)',
                      prefixIcon: Icon(Icons.person),
                    ),
                    textCapitalization: TextCapitalization.words,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: phoneController,
                    decoration: InputDecoration(
                      labelText: 'Phone Number',
                      prefixIcon: const Icon(Icons.phone),
                      errorText: phoneError,
                    ),
                    keyboardType: TextInputType.phone,
                    inputFormatters: PhoneNumberInput.formatters,
                    maxLength: PhoneNumberInput.maxDigits,
                    onChanged: (_) {
                      if (phoneError != null) {
                        setDialogState(() => phoneError = null);
                      }
                    },
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: emailController,
                    decoration: const InputDecoration(
                      labelText: 'Email Address',
                      prefixIcon: Icon(Icons.email),
                    ),
                    keyboardType: TextInputType.emailAddress,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: addressController,
                    decoration: const InputDecoration(
                      labelText: 'Address',
                      prefixIcon: Icon(Icons.location_on),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogCtx),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: () async {
                  final name = nameController.text.trim();
                  final phone = phoneController.text.trim();
                  if (name.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Customer name is required')),
                    );
                    return;
                  }

                  final repo = context.read<IServicesRepository>();

                  if (phone.isNotEmpty) {
                    final existing = await repo.getCustomerByPhone(phone);
                    if (existing != null) {
                      setDialogState(() {
                        phoneError = 'Phone already used by ${existing.name}';
                      });
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('A customer with phone number "$phone" already exists (${existing.name}).'),
                          backgroundColor: Colors.red,
                        ),
                      );
                      return;
                    }
                  }

                  try {
                    await repo.createCustomer(
                      name: name,
                      phone: phone.isEmpty ? null : phone,
                      email: emailController.text.trim().isEmpty ? null : emailController.text.trim(),
                      address: addressController.text.trim().isEmpty ? null : addressController.text.trim(),
                    );
                    if (dialogCtx.mounted) Navigator.pop(dialogCtx);
                    _loadCustomers();
                  } catch (e) {
                    final msg = e.toString().replaceAll('Exception: ', '').trim();
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(msg.isNotEmpty ? msg : 'Could not save customer.'),
                        backgroundColor: Colors.red,
                      ),
                    );
                  }
                },
                child: const Text('Save'),
              ),
            ],
          );
        },
      ),
    );
  }
}
