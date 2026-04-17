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

class ServicesDashboardPage extends StatelessWidget {
  static const routeName = '/services-dashboard';

  const ServicesDashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    final currencySymbol = context.read<SettingsBloc>().state.settings?.currency ?? '₦';

    return Scaffold(
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
                return const Center(child: CircularProgressIndicator());
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
                            const Text(
                              'Services Overview',
                              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 16),
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
                      Text('Error: ${state.errorMessage}'),
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
    final progress = total > 0 ? (paid / total).clamp(0.0, 1.0) : 0.0;
    
    return InkWell(
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ServicesAnalyticsPage())),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [Colors.blue.shade900, Colors.blue.shade600],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.blue.withOpacity(0.3),
              blurRadius: 20,
              offset: const Offset(0, 10),
            )
          ],
        ),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(Icons.auto_graph_rounded, color: Colors.white, size: 28),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Profitability Summary',
                        style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 4),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(
                          '${CurrencyFormatter.formatWithSymbol(paid, symbol: symbol)} / ${CurrencyFormatter.formatWithSymbol(total, symbol: symbol)} Collected',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            letterSpacing: -0.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white54, size: 16),
              ],
            ),
            const SizedBox(height: 20),
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: LinearProgressIndicator(
                value: progress,
                backgroundColor: Colors.white12,
                valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                minHeight: 8,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsRow(double total, double paid, int active, int ready, String symbol) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = constraints.maxWidth > 600 ? 4 : 2;
        return GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: crossAxisCount,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: crossAxisCount == 4 ? 1.5 : 1.3,
          children: [
            _buildStatCard('Revenue', total, symbol, Colors.blue, Icons.payments_rounded),
            _buildStatCard('Received', paid, symbol, Colors.green, Icons.check_circle_rounded),
            _buildStatCard('Active', active.toDouble(), '', Colors.orange, Icons.pending_actions_rounded, isCount: true),
            _buildStatCard('Ready', ready.toDouble(), '', Colors.teal, Icons.task_alt_rounded, isCount: true),
          ],
        );
      },
    );
  }

  Widget _buildStatCard(String label, double value, String symbol, Color color, IconData icon, {bool isCount = false}) {
    final formattedValue = isCount ? value.toInt().toString() : CurrencyFormatter.formatWithSymbol(value, symbol: symbol);
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.2), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: TextStyle(color: color.withOpacity(0.8), fontSize: 13, fontWeight: FontWeight.w600),
              ),
              Icon(icon, color: color.withOpacity(0.5), size: 18),
            ],
          ),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.bottomLeft,
            child: Text(
              formattedValue,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, letterSpacing: -0.5),
            ),
          ),
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
        subtitle: Text('ID: ${job.jobId} • Balance: ${CurrencyFormatter.formatWithSymbol(job.balance, symbol: currencySymbol)}'),
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
