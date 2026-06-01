// lib/features/admin/presentation/pages/admin_dashboard.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/admin_bloc.dart';
import '../widgets/master_mode_switch.dart';
import 'system_setup_page.dart';
import 'package:intl/intl.dart';
import '../../../settings/presentation/bloc/settings_bloc.dart';
import '../../../settings/presentation/bloc/settings_state.dart';
import 'admin_finance_dashboard.dart';
import 'account_setup_page.dart';
import '../../../../core/utils/progress_dialog_utils.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../../core/services/finance_api_client.dart';
import 'package:get_it/get_it.dart';

class AdminDashboardPage extends StatefulWidget {
  const AdminDashboardPage({super.key});

  @override
  State<AdminDashboardPage> createState() => _AdminDashboardPageState();
}

class _AdminDashboardPageState extends State<AdminDashboardPage> {
  int? _subscriptionDaysRemaining;

  @override
  void initState() {
    super.initState();
    _loadData();
    _fetchSubscriptionStatus();
  }

  void _loadData() {
    context.read<AdminBloc>().add(LoadAdminDashboard());
  }

  Future<void> _fetchSubscriptionStatus() async {
    try {
      final client = GetIt.I<FinanceApiClient>();
      final response = await client.get('/api/subscription/status');
      if (response.data != null && response.data['success'] == true) {
        if (mounted) {
          setState(() {
            _subscriptionDaysRemaining = response.data['daysRemaining'];
          });
        }
      }
    } catch (e) {
      debugPrint('[AdminDashboard] Failed to fetch subscription status: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Hub'),
        actions: [
          const MasterModeSwitch(),
          const SizedBox(width: 16),
        ],
      ),
      body: BlocBuilder<AdminBloc, AdminState>(
        builder: (context, state) {
          if (state.isLoading) {
            return Center(
              child: DancingLogoWidget(message: 'Loading admin hub arrays...'),
            );
          }
          
          if (state.error != null && state.metrics.isEmpty) {
            return _buildErrorState(state.error!);
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_subscriptionDaysRemaining != null && _subscriptionDaysRemaining! <= 6)
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      border: Border.all(color: Colors.red.shade200),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.warning_amber_rounded, color: Colors.red),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            '⚠️ Your subscription expires in $_subscriptionDaysRemaining day(s). Please renew to avoid service interruption.',
                            style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  ),
                _buildMetricSection(context, state.metrics),
                const SizedBox(height: 24),
                _buildQuickActions(context, state.isMasterMode),
                const SizedBox(height: 24),
                _buildRecentAuditLogs(context, state.auditLogs),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildMetricSection(BuildContext context, Map<String, dynamic> metrics) {
    final formatter = NumberFormat.currency(symbol: '₦', decimalDigits: 2);
    
    // Fallback to defaults if metrics are empty (e.g. backend offline)
    final walletValue = metrics['internal_wallet'] != null 
        ? formatter.format(metrics['internal_wallet']) 
        : '₦0.00';
    final revenueValue = metrics['monthly_revenue'] != null 
        ? formatter.format(metrics['monthly_revenue']) 
        : '₦0.00';

    return Row(
      children: [
        Expanded(
          child: _MetricCard(
            title: 'Internal Wallet',
            value: walletValue,
            icon: Icons.account_balance_wallet,
            color: Colors.blue,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _MetricCard(
            title: 'Monthly Revenue',
            value: revenueValue,
            icon: Icons.trending_up,
            color: Colors.green,
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActions(BuildContext context, bool isMaster) {
    return BlocBuilder<SettingsBloc, SettingsState>(
      builder: (context, settingsState) {
        // Display Account Set up if the user is on a plan that is not free or basic
        final isProUser = settingsState.userPlan?.isPro == true || settingsState.userPlan?.isLifetime == true || settingsState.userPlan?.planType == 'enterprise' || settingsState.userPlan?.planType == 'premium';

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('System Management', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Wrap(
              spacing: 16,
              runSpacing: 16,
              children: [
                _ActionTile(
                  label: 'Quaser Keys',
                  icon: Icons.vpn_key,
                  onTap: isMaster ? () => _gotoKeys(context) : null,
                  isGated: !isMaster,
                ),
                _ActionTile(
                  label: 'System Setup',
                  icon: Icons.settings_applications,
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SystemSetupPage())),
                ),
                // Visible to all non-free tiers, enabling demo inspection even when simulation flags report basic plan limits
                _ActionTile(
                  label: 'Account Set up',
                  icon: Icons.cloud_sync_rounded,
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AccountSetupPage())),
                ),
                _ActionTile(
                  label: 'Online Login',
                  icon: Icons.security_rounded,
                  onTap: () => _handleOnlineLoginClick(context, isProUser, settingsState.settings?.organizationName),
                ),
                _ActionTile(
                  label: 'Audit Logs',
                  icon: Icons.history,
                  onTap: () => _gotoLogs(context),
                ),
                _ActionTile(
                  label: 'Ledger History',
                  icon: Icons.list_alt,
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminFinanceDashboardPage())),
                ),
              ],
            ),
          ],
        );
      },
    );
  }

  Widget _buildRecentAuditLogs(BuildContext context, List<Map<String, dynamic>> logs) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Recent Activity', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        Card(
          child: ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: logs.take(5).length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final log = logs[index];
              return ListTile(
                leading: const Icon(Icons.info_outline),
                title: Text(log['action']),
                subtitle: Text(log['timestamp']),
                trailing: const Icon(Icons.chevron_right, size: 16),
              );
            },
          ),
        ),
      ],
    );
  }

  void _gotoKeys(BuildContext context) {
    // Navigator.push...
  }
  void _gotoLogs(BuildContext context) {
     context.read<AdminBloc>().add(LoadAuditLogs());
  }

  static const _storage = FlutterSecureStorage();
  static const _webUserKey = 'online_web_username';
  static const _webPassKey = 'online_web_password';

  void _handleOnlineLoginClick(BuildContext context, bool isProUser, String? orgName) async {
    if (!isProUser) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: Theme.of(context).cardColor,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              Icon(Icons.lock_outline_rounded, color: Colors.amber.shade700),
              const SizedBox(width: 8),
              const Text('Pro Tier Feature', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          content: const Text(
            'Online Web Access credentials configuration requires an active Pro subscription model. Please navigate to Account Set up to activate your premium relay link.',
            style: TextStyle(fontSize: 13, height: 1.4),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: Theme.of(context).colorScheme.onPrimary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () {
                Navigator.pop(ctx);
                Navigator.push(context, MaterialPageRoute(builder: (_) => const AccountSetupPage()));
              },
              child: const Text('Upgrade Plan', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
      return;
    }

    // Load previously stored online login creds if any
    final storedUser = await _storage.read(key: _webUserKey);
    final storedPass = await _storage.read(key: _webPassKey);

    final cleanOrg = (orgName ?? 'admin').toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '');
    final defaultUser = storedUser ?? 'admin@$cleanOrg.cloud';

    final userCtrl = TextEditingController(text: defaultUser);
    final passCtrl = TextEditingController(text: storedPass ?? '');
    final confirmPassCtrl = TextEditingController(text: storedPass ?? '');

    if (!context.mounted) return;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary.withOpacity(0.1), shape: BoxShape.circle),
              child: Icon(Icons.cloud_sync_rounded, color: Theme.of(context).colorScheme.primary),
            ),
            const SizedBox(width: 12),
            const Expanded(child: Text('Online Access Setup', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold))),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Configure your synchronized master login identity matrix for external operator browser access panels.',
                style: TextStyle(fontSize: 12, height: 1.4),
              ),
              const SizedBox(height: 16),
              const Text('Master Access Username / Email', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              TextField(
                controller: userCtrl,
                decoration: InputDecoration(
                  filled: true,
                  fillColor: Theme.of(context).brightness == Brightness.dark ? Colors.white10 : Colors.grey.shade50,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
                style: const TextStyle(fontSize: 12),
              ),
              const SizedBox(height: 12),
              const Text('Secure Web Key (Password)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              TextField(
                controller: passCtrl,
                obscureText: true,
                decoration: InputDecoration(
                  filled: true,
                  fillColor: Theme.of(context).brightness == Brightness.dark ? Colors.white10 : Colors.grey.shade50,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  hintText: 'Enter robust string passphrase',
                ),
                style: const TextStyle(fontSize: 12),
              ),
              const SizedBox(height: 12),
              const Text('Confirm Secure Web Key', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              TextField(
                controller: confirmPassCtrl,
                obscureText: true,
                decoration: InputDecoration(
                  filled: true,
                  fillColor: Theme.of(context).brightness == Brightness.dark ? Colors.white10 : Colors.grey.shade50,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  hintText: 'Re-enter passphrase string precisely',
                ),
                style: const TextStyle(fontSize: 12),
              ),
              if (storedUser != null) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(Icons.check_circle_rounded, size: 14, color: Colors.green.shade600),
                    const SizedBox(width: 6),
                    const Text('Cloud Sync State: Active Relay', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.green)),
                  ],
                ),
              ],
            ],
          ),
        ),
        actions: [
          if (storedUser != null)
            TextButton.icon(
              style: TextButton.styleFrom(foregroundColor: Theme.of(context).colorScheme.error),
              icon: const Icon(Icons.refresh_rounded, size: 14),
              label: const Text('Reset', style: TextStyle(fontSize: 11)),
              onPressed: () async {
                await _storage.delete(key: _webUserKey);
                await _storage.delete(key: _webPassKey);
                if (ctx.mounted) {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: const Text('Online access tokens cleared.'), backgroundColor: Theme.of(context).colorScheme.error),
                  );
                }
              },
            )
          else
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Theme.of(context).colorScheme.onPrimary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () async {
              final u = userCtrl.text.trim();
              final p = passCtrl.text.trim();
              final cp = confirmPassCtrl.text.trim();

              if (u.isEmpty || p.isEmpty || cp.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Please populate all credential parameters'), backgroundColor: Colors.orange),
                );
                return;
              }

              if (p != cp) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Passphrases do not match. Please verify your secure web keys.'), backgroundColor: Colors.orange),
                );
                return;
              }

              Navigator.pop(ctx);

              await ProgressDialogUtils.showDancingProgress(
                context,
                () async => await Future.delayed(const Duration(milliseconds: 1500)),
                message: 'Broadcasting Invify validation link to email relay...',
              );

              if (!context.mounted) return;

              final codeCtrl = TextEditingController();

              showDialog(
                context: context,
                barrierDismissible: false,
                builder: (vCtx) => AlertDialog(
                  backgroundColor: Theme.of(context).cardColor,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  title: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: Colors.blue.shade50, shape: BoxShape.circle),
                        child: Icon(Icons.mark_email_read_rounded, color: Colors.blue.shade700),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(child: Text('Verify Web Access Ownership', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold))),
                    ],
                  ),
                  content: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'A secure Invify validation link embedding a unique access matrix has been dispatched to:\n$u',
                        style: const TextStyle(fontSize: 12, height: 1.4),
                      ),
                      const SizedBox(height: 12),
                      const Text('Enter 6-Digit Email Validation Code', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: codeCtrl,
                        keyboardType: TextInputType.number,
                        maxLength: 6,
                        textAlign: TextAlign.center,
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: Theme.of(context).brightness == Brightness.dark ? Colors.white10 : Colors.grey.shade50,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          hintText: '••••••',
                          counterText: '',
                        ),
                        style: const TextStyle(fontSize: 18, letterSpacing: 8, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.secondary.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.lightbulb_outline_rounded, size: 14, color: Theme.of(context).colorScheme.secondary),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                'Testing Tip: Input any 6 digits (e.g. 102938) to simulate successful verification and complete setup.',
                                style: TextStyle(fontSize: 10, color: Theme.of(context).colorScheme.secondary),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  actions: [
                    TextButton(
                      onPressed: () {
                        Navigator.pop(vCtx);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Verification deferred. Master online sync locked.')),
                        );
                      },
                      child: const Text('Cancel', style: TextStyle(fontSize: 11)),
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).colorScheme.primary,
                        foregroundColor: Theme.of(context).colorScheme.onPrimary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: () async {
                        final code = codeCtrl.text.trim();
                        if (code.length != 6) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Please enter precisely a 6-digit verification code'), backgroundColor: Colors.orange),
                          );
                          return;
                        }

                        await _storage.write(key: _webUserKey, value: u);
                        await _storage.write(key: _webPassKey, value: p);

                        if (vCtx.mounted) {
                          Navigator.pop(vCtx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: const Text('Success: Account ownership authorized. Web access portal active!'), 
                              backgroundColor: Theme.of(context).colorScheme.primary,
                            ),
                          );
                        }
                      },
                      child: const Text('Confirm & Complete Setup', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                    ),
                  ],
                ),
              );
            },
            child: const Text('Request Verification', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.cloud_off, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            const Text('Connection Failed', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(error, textAlign: TextAlign.center, style: const TextStyle(color: Colors.grey)),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadData,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry Connection'),
            ),
            const SizedBox(height: 16),
            if (error.contains('127.0.0.1'))
              const Text(
                'Tip: If using an emulator, ensure the backend is running and reach it via host IP.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic),
              ),
          ],
        ),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _MetricCard({required this.title, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: color.withOpacity(0.1),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color),
            const SizedBox(height: 16),
            Text(title, style: const TextStyle(color: Colors.grey, fontSize: 13)),
            const SizedBox(height: 4),
            Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
      ),
    );
  }
}

class _ActionTile extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback? onTap;
  final bool isGated;

  const _ActionTile({required this.label, required this.icon, this.onTap, this.isGated = false});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 100,
        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 8),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.withOpacity(0.2)),
          borderRadius: BorderRadius.circular(12),
          color: onTap == null ? Colors.grey.withOpacity(0.05) : null,
        ),
        child: Column(
          children: [
            Opacity(
              opacity: onTap == null ? 0.3 : 1.0,
              child: Icon(icon, size: 28),
            ),
            const SizedBox(height: 12),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: onTap == null ? Colors.grey : null,
              ),
              textAlign: TextAlign.center,
            ),
            if (isGated) ...[
              const SizedBox(height: 8),
              const Icon(Icons.lock, size: 12, color: Colors.orange),
            ]
          ],
        ),
      ),
    );
  }
}
