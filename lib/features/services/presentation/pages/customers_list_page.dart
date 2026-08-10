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
    );
  }
}
