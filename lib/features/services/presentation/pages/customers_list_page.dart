import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/features/invoicing/presentation/pages/customer_history_page.dart';
import '../bloc/services_bloc.dart';
import '../bloc/services_event.dart';
import '../bloc/services_state.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

class CustomersListPage extends StatefulWidget {
  const CustomersListPage({super.key});

  @override
  State<CustomersListPage> createState() => _CustomersListPageState();
}

class _CustomersListPageState extends State<CustomersListPage> {
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
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Customers')),
      body: BlocBuilder<ServicesBloc, ServicesState>(
        builder: (context, state) {
          final customers = state.customers;

          if (state.status == ServicesStatus.loading && customers.isEmpty) {
            return const InvifyLoadingIndicator(message: 'FETCHING CUSTOMER DIRECTORY...');
          }

          if (customers.isEmpty) {
            return const Center(child: Text('No customers found. Add them during job creation!'));
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: customers.length,
            itemBuilder: (context, index) {
              final customer = customers[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.person)),
                  title: Text(customer.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text(customer.phone ?? 'No phone'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () async {
                    await Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => CustomerHistoryPage(customer: customer),
                      ),
                    );
                    // Refresh so newly generated VA details appear in list state.
                    if (mounted) {
                      context.read<ServicesBloc>().add(const SearchServiceCustomers());
                    }
                  },
                ),
              );
            },
          );
        },
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
