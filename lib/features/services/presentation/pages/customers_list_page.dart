import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/features/invoicing/presentation/pages/customer_history_page.dart';
import '../bloc/services_bloc.dart';
import '../bloc/services_event.dart';
import '../bloc/services_state.dart';
import 'package:involve_app/core/utils/phone_number_input.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

class CustomersListPage extends StatefulWidget {
  const CustomersListPage({super.key});

  @override
  State<CustomersListPage> createState() => _CustomersListPageState();
}

class _CustomersListPageState extends State<CustomersListPage> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    // Ensure directory is loaded when opened from Services Overview.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<ServicesBloc>().add(const SearchServiceCustomers());
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Customers')),
      body: Column(
        children: [
          // Search Input Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search by name or phone...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                          context.read<ServicesBloc>().add(const SearchServiceCustomers());
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                filled: true,
                fillColor: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: Theme.of(context).dividerColor.withValues(alpha: 0.2),
                  ),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: Theme.of(context).dividerColor.withValues(alpha: 0.2),
                  ),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: Theme.of(context).colorScheme.primary,
                    width: 1.5,
                  ),
                ),
              ),
              onChanged: (val) {
                setState(() => _searchQuery = val.trim());
                context.read<ServicesBloc>().add(SearchServiceCustomers(query: val.trim()));
              },
            ),
          ),
          Expanded(
            child: BlocBuilder<ServicesBloc, ServicesState>(
              builder: (context, state) {
                final allCustomers = state.customers;

                if (state.status == ServicesStatus.loading && allCustomers.isEmpty) {
                  return const InvifyLoadingIndicator(message: 'FETCHING CUSTOMER DIRECTORY...');
                }

                // Filter locally for instant responsiveness
                final queryLower = _searchQuery.toLowerCase();
                final queryDigits = _searchQuery.replaceAll(RegExp(r'\D'), '');

                final customers = allCustomers.where((c) {
                  if (_searchQuery.isEmpty) return true;
                  final nameMatch = c.name.toLowerCase().contains(queryLower);
                  final phone = (c.phone ?? '').toLowerCase();
                  final phoneMatch = phone.contains(queryLower);
                  final phoneDigits = phone.replaceAll(RegExp(r'\D'), '');
                  final digitMatch = queryDigits.isNotEmpty && phoneDigits.contains(queryDigits);
                  return nameMatch || phoneMatch || digitMatch;
                }).toList();

                if (customers.isEmpty) {
                  if (_searchQuery.isNotEmpty) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.person_search_outlined, size: 56, color: Colors.grey.shade400),
                            const SizedBox(height: 12),
                            Text(
                              'No customers matching "$_searchQuery"',
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 8),
                            TextButton.icon(
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _searchQuery = '');
                                context.read<ServicesBloc>().add(const SearchServiceCustomers());
                              },
                              icon: const Icon(Icons.clear),
                              label: const Text('Clear Search'),
                            ),
                          ],
                        ),
                      ),
                    );
                  }
                  return const Center(child: Text('No customers found. Add them during job creation!'));
                }

                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  itemCount: customers.length,
                  itemBuilder: (context, index) {
                    final customer = customers[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(
                          color: Theme.of(context).dividerColor.withValues(alpha: 0.15),
                        ),
                      ),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                          foregroundColor: Theme.of(context).colorScheme.onPrimaryContainer,
                          child: const Icon(Icons.person),
                        ),
                        title: Text(customer.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text(customer.phone ?? 'No phone'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () async {
                          final servicesBloc = context.read<ServicesBloc>();
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => CustomerHistoryPage(customer: customer),
                            ),
                          );
                          // Refresh so newly generated VA details appear in list state.
                          if (mounted) {
                            servicesBloc.add(SearchServiceCustomers(query: _searchQuery));
                          }
                        },
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddCustomerDialog,
        icon: const Icon(Icons.person_add),
        label: const Text('Add Customer'),
      ),
    );
  }

  void _showAddCustomerDialog() {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final addressCtrl = TextEditingController();
    String? phoneError;

    showDialog(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Register New Customer'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Full Name (Required)',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.person),
                  ),
                  textCapitalization: TextCapitalization.words,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: phoneCtrl,
                  keyboardType: TextInputType.phone,
                  inputFormatters: PhoneNumberInput.formatters,
                  maxLength: PhoneNumberInput.maxDigits,
                  decoration: InputDecoration(
                    labelText: 'Phone Number',
                    border: const OutlineInputBorder(),
                    prefixIcon: const Icon(Icons.phone),
                    errorText: phoneError,
                  ),
                  onChanged: (_) {
                    if (phoneError != null) {
                      setDialogState(() => phoneError = null);
                    }
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: addressCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Address',
                    border: OutlineInputBorder(),
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
              onPressed: () {
                final name = nameCtrl.text.trim();
                final phone = phoneCtrl.text.trim();

                if (name.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Customer name is required')),
                  );
                  return;
                }

                if (phone.isNotEmpty) {
                  final existingList = context.read<ServicesBloc>().state.customers;
                  final digits = phone.replaceAll(RegExp(r'\D'), '');
                  final match = existingList.where((c) {
                    final p = (c.phone ?? '').trim();
                    if (p.isEmpty) return false;
                    if (p == phone) return true;
                    final cd = p.replaceAll(RegExp(r'\D'), '');
                    if (cd.isNotEmpty && digits.isNotEmpty) {
                      if (cd == digits) return true;
                      if (cd.length >= 10 && digits.length >= 10) {
                        return cd.substring(cd.length - 10) == digits.substring(digits.length - 10);
                      }
                    }
                    return false;
                  }).firstOrNull;

                  if (match != null) {
                    setDialogState(() {
                      phoneError = 'Phone already used by ${match.name}';
                    });
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('A customer with phone number "$phone" already exists (${match.name}).'),
                        backgroundColor: Colors.red,
                      ),
                    );
                    return;
                  }
                }

                context.read<ServicesBloc>().add(CreateServiceCustomer(
                  name: name,
                  phone: phone.isEmpty ? null : phone,
                  address: addressCtrl.text.trim().isEmpty ? null : addressCtrl.text.trim(),
                ));
                Navigator.pop(dialogCtx);
              },
              child: const Text('Save Customer'),
            ),
          ],
        ),
      ),
    );
  }
}
