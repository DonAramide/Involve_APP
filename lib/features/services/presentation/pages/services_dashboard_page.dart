import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import '../bloc/services_bloc.dart';
import '../bloc/services_event.dart';
import '../bloc/services_state.dart';
import 'jobs_list_page.dart';
import 'create_job_page.dart';
import 'job_details_page.dart';
import 'customers_list_page.dart';
import 'services_analytics_page.dart';
import 'services_setup_page.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

class ServicesDashboardPage extends StatelessWidget {
  static const routeName = '/services-dashboard';

  const ServicesDashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    final currencySymbol = context.read<SettingsBloc>().state.settings?.currency ?? '₦';
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!context.mounted) return;
      final bloc = context.read<ServicesBloc>();
      if (bloc.state.status == ServicesStatus.initial) {
        bloc.add(const LoadServicesJobs());
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('Services Overview'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            }
          },
        ),
      ),
      body: BlocListener<ServicesBloc, ServicesState>(
        listener: (context, state) {
          if (state.successMessage != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.successMessage!)),
            );
          }
          if (state.errorMessage != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.errorMessage!), backgroundColor: Colors.red),
            );
          }
        },
        child: RefreshIndicator(
          onRefresh: () async {
            context.read<ServicesBloc>().add(const LoadServicesJobs());
          },
          child: BlocBuilder<ServicesBloc, ServicesState>(
            builder: (context, state) {
              if (state.status == ServicesStatus.loading && state.jobs.isEmpty) {
                return const InvifyLoadingIndicator(message: 'LOADING SERVICE PIPELINE...');
              }

              if (state.jobs.isNotEmpty || state.status == ServicesStatus.success) {
                final jobs = state.jobs;
                
                final totalRevenue = jobs.fold(0.0, (sum, j) => sum + j.totalAmount);
                final amountPaid = jobs.fold(0.0, (sum, j) => sum + j.amountPaid);
                final activeJobs = jobs.where((j) => j.status == 'in_progress').length;
                final readyJobs = jobs.where((j) => j.status == 'ready').length;

                return CustomScrollView(
                  slivers: [
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildProfitSummary(context, totalRevenue, amountPaid, currencySymbol),
                            const SizedBox(height: 16),
                            _buildStatsRow(totalRevenue, amountPaid, activeJobs, readyJobs, currencySymbol),
                            const SizedBox(height: 24),
                            _buildQuickActions(context),
                            const SizedBox(height: 24),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Recent Jobs',
                                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                                ),
                                TextButton(
                                  onPressed: () {
                                    Navigator.push(context, MaterialPageRoute(builder: (_) => const JobsListPage()));
                                  },
                                  child: const Text('View All'),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final job = jobs[index];
                          return _buildJobItem(context, job, currencySymbol);
                        },
                        childCount: jobs.length > 5 ? 5 : jobs.length,
                      ),
                    ),
                    if (jobs.isEmpty)
                      const SliverToBoxAdapter(
                        child: Center(
                          child: Padding(
                            padding: EdgeInsets.all(32.0),
                            child: Text('No jobs found. Create your first job!'),
                          ),
                        ),
                      ),
                  ],
                );
              }

              if (state.status == ServicesStatus.error) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Text('Error: ${state.errorMessage}', textAlign: TextAlign.center),
                      ),
                      ElevatedButton(
                        onPressed: () => context.read<ServicesBloc>().add(const LoadServicesJobs()),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                );
              }

              return const Center(child: Text('Initialize Services Mode...'));
            },
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const CreateJobPage()));
        },
        icon: const Icon(Icons.add),
        label: const Text('New Job'),
      ),
    );
  }

  Widget _buildProfitSummary(BuildContext context, double total, double paid, String symbol) {
    return InkWell(
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ServicesAnalyticsPage())),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [Colors.blue.shade800, Colors.blue.shade600],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [BoxShadow(color: Colors.blue.withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 5))],
        ),
        child: Row(
          children: [
            const CircleAvatar(
              backgroundColor: Colors.white24,
              child: Icon(Icons.analytics, color: Colors.white),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Profitability Summary', style: TextStyle(color: Colors.white70, fontSize: 13)),
                  Text(
                    '${CurrencyFormatter.formatWithSymbol(paid, symbol: symbol)} / ${CurrencyFormatter.formatWithSymbol(total, symbol: symbol)} Collected',
                    style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Colors.white70),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsRow(double total, double paid, int active, int ready, String symbol) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _buildStatCard('Revenue', CurrencyFormatter.formatWithSymbol(total, symbol: symbol), Colors.blue),
          _buildStatCard('Received', CurrencyFormatter.formatWithSymbol(paid, symbol: symbol), Colors.green),
          _buildStatCard('Active', '$active', Colors.orange),
          _buildStatCard('Ready', '$ready', Colors.teal),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, Color color) {
    return Container(
      width: 140,
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _buildActionButton(
            context,
            'Customers',
            Icons.people,
            Colors.purple,
            () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const CustomersListPage()));
            },
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildActionButton(
            context,
            'Analytics',
            Icons.bar_chart,
            Colors.blueAccent,
            () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const ServicesAnalyticsPage()));
            },
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildActionButton(
            context,
            'Setup',
            Icons.settings_suggest,
            Colors.orange,
            () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const ServicesSetupPage()));
            },
          ),
        ),
      ],
    );
  }

  Widget _buildActionButton(BuildContext context, String label, IconData icon, Color color, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Theme.of(context).dividerColor),
        ),
        child: Column(
          children: [
            Icon(icon, color: color),
            const SizedBox(height: 8),
            Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }

  Widget _buildJobItem(BuildContext context, dynamic job, String currencySymbol) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListTile(
        title: Text(job.title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text('ID: ${job.jobId} • Balance: ${CurrencyFormatter.formatWithSymbol(job.remainingBalance, symbol: currencySymbol)}'),
        trailing: _buildStatusChip(job.status),
        onTap: () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => JobDetailsPage(job: job)));
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
      case 'cancelled': color = Colors.red; break;
      default: color = Colors.grey;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }
}
