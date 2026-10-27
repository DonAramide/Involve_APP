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
  void initState() {
    super.initState();
    // Fresh load so a prior Create Job SQLite error does not stick on this screen.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<ServicesBloc>().add(const LoadServicesJobs());
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currencySymbol = context.read<SettingsBloc>().state.settings?.currency ?? '₦';
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
                  style: TextStyle(color: scheme.onSurface),
                  decoration: InputDecoration(
                    hintText: 'Search by customer or job ID...',
                    hintStyle: TextStyle(color: scheme.onSurface.withValues(alpha: 0.55)),
                    prefixIcon: Icon(Icons.search, color: scheme.onSurfaceVariant),
                    filled: true,
                    fillColor: isDark ? scheme.surfaceContainerHighest : scheme.surfaceContainerHighest,
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
                    Icon(Icons.search_off, size: 64, color: Theme.of(context).colorScheme.onSurfaceVariant),
                    const SizedBox(height: 16),
                    Text(
                      _selectedStatus == null 
                          ? 'No jobs found.' 
                          : 'No jobs found for this status.',
                      style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
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
      {'label': 'Cancelled', 'value': 'cancelled'},
    ];
    final scheme = Theme.of(context).colorScheme;

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
              backgroundColor: scheme.surfaceContainerHighest,
              selectedColor: scheme.primaryContainer,
              side: BorderSide(color: isSelected ? scheme.primary : scheme.outline),
              checkmarkColor: scheme.onPrimaryContainer,
              labelStyle: TextStyle(
                color: isSelected ? scheme.onPrimaryContainer : scheme.onSurface,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildJobCard(BuildContext context, dynamic job, String symbol) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      elevation: 0,
      color: scheme.surfaceContainerLow,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: scheme.outlineVariant),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: scheme.primary.withValues(alpha: isDark ? 0.22 : 0.12),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(Icons.work_outline, color: scheme.primary),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              job.customerName ?? 'Walk-in Customer',
              style: TextStyle(color: scheme.primary, fontSize: 13, fontWeight: FontWeight.bold),
            ),
            Text(
              job.title,
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: scheme.onSurface),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                job.jobId,
                style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 12),
              ),
              if (job.staffName != null && (job.staffName as String).isNotEmpty) ...[
                const SizedBox(height: 2),
                Row(
                  children: [
                    Icon(Icons.badge_outlined, size: 12, color: isDark ? Colors.lightBlueAccent : Colors.blue.shade700),
                    const SizedBox(width: 4),
                    Text(
                      'Staff: ${job.staffName}',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.lightBlueAccent : Colors.blue.shade700,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              CurrencyFormatter.formatWithSymbol(job.totalAmount, symbol: symbol),
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: scheme.onSurface),
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    Color color;
    switch (status) {
      case 'pending': color = isDark ? Colors.grey.shade300 : Colors.grey.shade700; break;
      case 'in_progress': color = isDark ? Colors.orangeAccent : Colors.orange; break;
      case 'ready': color = isDark ? Colors.greenAccent : Colors.green; break;
      case 'delivered': color = isDark ? Colors.lightBlueAccent : Colors.blue; break;
      case 'cancelled': color = isDark ? Colors.redAccent : Colors.red; break;
      default: color = isDark ? Colors.grey.shade300 : Colors.grey;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: isDark ? 0.22 : 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.bold),
      ),
    );
  }
}
