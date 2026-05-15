import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import '../bloc/services_bloc.dart';
import '../bloc/services_event.dart';
import '../bloc/services_state.dart';
import 'job_details_page.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

class JobsListPage extends StatefulWidget {
  const JobsListPage({super.key});

  @override
  State<JobsListPage> createState() => _JobsListPageState();
}

class _JobsListPageState extends State<JobsListPage> {
  String? _selectedStatus;
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currencySymbol = context.read<SettingsBloc>().state.settings?.currency ?? '₦';

    return Scaffold(
      appBar: AppBar(
        title: const Text('All Jobs'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => context.read<ServicesBloc>().add(LoadServicesJobs(
                  status: _selectedStatus,
                  query: _searchController.text,
                )),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(110),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search by customer or job ID...',
                    prefixIcon: const Icon(Icons.search),
                    filled: true,
                    fillColor: Colors.grey[100],
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(vertical: 0),
                  ),
                  onChanged: (v) {
                    context.read<ServicesBloc>().add(LoadServicesJobs(
                          status: _selectedStatus,
                          query: v,
                        ));
                  },
                ),
              ),
              _buildFilterTabs(),
            ],
          ),
        ),
      ),
      body: BlocBuilder<ServicesBloc, ServicesState>(
        builder: (context, state) {
          if (state.status == ServicesStatus.loading && state.jobs.isEmpty) {
            return const InvifyLoadingIndicator(message: 'FETCHING REGISTERED JOBS...');
          }

          if (state.jobs.isNotEmpty || state.status == ServicesStatus.success) {
            final jobs = state.jobs;

            if (jobs.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.search_off, size: 64, color: Colors.grey[300]),
                    const SizedBox(height: 16),
                    Text(
                      _selectedStatus == null 
                          ? 'No jobs found.' 
                          : 'No jobs found for this status.',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                    TextButton(
                      onPressed: () {
                        setState(() => _selectedStatus = null);
                        context.read<ServicesBloc>().add(const LoadServicesJobs());
                      },
                      child: const Text('Show All'),
                    ),
                  ],
                ),
              );
            }

            return ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: jobs.length,
              itemBuilder: (context, index) {
                final job = jobs[index];
                return _buildJobCard(context, job, currencySymbol);
              },
            );
          }
          
          if (state.status == ServicesStatus.error) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Error: ${state.errorMessage}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => context.read<ServicesBloc>().add(const LoadServicesJobs()),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          return const Center(child: Text('Loading jobs...'));
        },
      ),
    );
  }

  Widget _buildFilterTabs() {
    final statuses = [
      {'label': 'All', 'value': null},
      {'label': 'Pending', 'value': 'pending'},
      {'label': 'In Progress', 'value': 'in_progress'},
      {'label': 'Ready', 'value': 'ready'},
      {'label': 'Delivered', 'value': 'delivered'},
    ];

    return Container(
      height: 50,
      margin: const EdgeInsets.only(bottom: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: statuses.length,
        itemBuilder: (context, index) {
          final s = statuses[index];
          final isSelected = _selectedStatus == s['value'];
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              label: Text(s['label'] as String),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  _selectedStatus = s['value'] as String?;
                });
                // Auto-refresh from DB with new filter
                context.read<ServicesBloc>().add(LoadServicesJobs(status: _selectedStatus));
              },
              selectedColor: Theme.of(context).primaryColor.withOpacity(0.2),
              labelStyle: TextStyle(
                color: isSelected ? Theme.of(context).primaryColor : Colors.black87,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildJobCard(BuildContext context, dynamic job, String symbol) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.withOpacity(0.2)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: Theme.of(context).primaryColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(Icons.work_outline, color: Theme.of(context).primaryColor),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              job.customerName ?? 'Walk-in Customer',
              style: TextStyle(color: Theme.of(context).primaryColor, fontSize: 13, fontWeight: FontWeight.bold),
            ),
            Text(
              job.title,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4.0),
          child: Text(
            job.jobId,
            style: TextStyle(color: Colors.grey[600], fontSize: 12),
          ),
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              CurrencyFormatter.formatWithSymbol(job.totalAmount, symbol: symbol),
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 4),
            _buildStatusChip(job.status),
          ],
        ),
        onTap: () async {
          await Navigator.push(context, MaterialPageRoute(builder: (_) => JobDetailsPage(job: job)));
          // Auto refresh when coming back in case status changed
          if (mounted) {
            context.read<ServicesBloc>().add(LoadServicesJobs(status: _selectedStatus));
          }
        },
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color color;
    switch (status) {
      case 'pending': color = Colors.grey; break;
      case 'in_progress': color = Colors.orange; break;
      case 'ready': color = Colors.green; break;
      case 'delivered': color = Colors.blue; break;
      default: color = Colors.grey;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.bold),
      ),
    );
  }
}
