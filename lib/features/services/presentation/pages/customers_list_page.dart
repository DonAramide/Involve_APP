import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/services_bloc.dart';
import '../bloc/services_event.dart';
import '../bloc/services_state.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

class CustomersListPage extends StatelessWidget {
  const CustomersListPage({super.key});

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

          if (customers.isNotEmpty || state.status == ServicesStatus.success) {
            if (customers.isEmpty) {
              return const Center(child: Text('No customers found. Add them during job creation!'));
            }

            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: customers.length,
              itemBuilder: (context, index) {
                final customer = customers[index];
                return ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.person)),
                  title: Text(customer.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text(customer.phone ?? 'No phone'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    // Navigate to customer details / jobs history if needed
                  },
                );
              },
            );
          }
          return const Center(child: Text('Loading customers...'));
        },
      ),
    );
  }
}
