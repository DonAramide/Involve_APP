import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/features/stock/presentation/pages/stock_management_page.dart';
import 'package:involve_app/features/invoicing/presentation/pages/create_invoice_page.dart';
import 'package:involve_app/features/invoicing/presentation/history/pages/invoice_history_page.dart';
import 'package:involve_app/features/invoicing/presentation/bloc/invoice_bloc.dart';
import 'package:involve_app/features/invoicing/presentation/bloc/invoice_state.dart';
import 'package:involve_app/features/settings/presentation/pages/settings_page.dart';
import 'package:involve_app/features/settings/presentation/pages/super_admin_settings_page.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:involve_app/features/settings/presentation/widgets/password_dialog.dart';
import 'package:involve_app/features/settings/presentation/widgets/super_admin_password_dialog.dart';
import 'package:involve_app/core/widgets/live_datetime_widget.dart';
import 'package:involve_app/features/settings/domain/entities/user_plan.dart';
import 'package:involve_app/features/help/presentation/pages/help_page.dart';
import 'package:involve_app/features/services/presentation/pages/services_dashboard_page.dart';
import 'package:involve_app/features/services/presentation/pages/create_job_page.dart';
import 'package:involve_app/features/services/presentation/pages/jobs_list_page.dart';
import 'package:involve_app/features/services/presentation/pages/customers_list_page.dart';
import 'about_page.dart';
import 'contact_page.dart';
import 'calculator_page.dart';
import 'package:involve_app/features/dashboard/presentation/pages/transaction_audit_page.dart';
import '../widgets/recent_transactions_widget.dart';
import 'package:involve_app/features/invoicing/presentation/history/bloc/history_bloc.dart';
import 'package:involve_app/features/invoicing/presentation/history/bloc/history_state.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/features/printer/presentation/pages/printer_settings_page.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_bloc.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_state.dart';
import 'package:involve_app/core/license/license_service.dart';
import 'package:involve_app/features/activation/presentation/pages/activation_page.dart';
import 'package:involve_app/features/activation/presentation/pages/go_pro_page.dart';
import 'dart:async';
import 'package:involve_app/services/socket_service.dart';
import 'package:involve_app/core/sync/presentation/bloc/sync_bloc.dart';
import '../../../../core/sync/presentation/widgets/sync_indicator.dart';
import '../../../../core/sync/presentation/pages/device_sync_page.dart';
import '../../../../core/utils/terminology.dart';
import 'package:involve_app/features/stock/presentation/pages/manage_categories_page.dart';
import 'package:involve_app/features/school/presentation/pages/student_list_page.dart';
import 'package:involve_app/features/school/presentation/pages/teacher_list_page.dart';
import 'package:involve_app/features/school/presentation/pages/lesson_notes_list_page.dart';
import 'package:involve_app/features/stock/presentation/pages/stock_management_page.dart';
import 'package:involve_app/features/school/presentation/pages/student_analytics_page.dart';
import 'package:involve_app/features/school/presentation/pages/school_setup_page.dart';
import 'package:involve_app/features/school/presentation/pages/fee_management_page.dart';
import 'package:involve_app/features/school/presentation/pages/manage_subjects_page.dart';
import 'package:involve_app/features/school/presentation/pages/result_entry_page.dart';
import 'package:reorderable_grid_view/reorderable_grid_view.dart';
import 'package:collection/collection.dart';
import 'package:involve_app/features/settings/domain/entities/settings.dart';
import 'package:involve_app/features/school/presentation/pages/app_user_guide_page.dart';
import 'package:involve_app/features/stock/presentation/pages/inventory_report_page.dart';
import 'package:involve_app/features/invoicing/presentation/pages/customer_lookup_page.dart';
import 'package:involve_app/features/admin/presentation/pages/system_setup_page.dart';
import 'package:involve_app/features/settings/domain/entities/staff.dart';
import 'package:involve_app/features/invoicing/presentation/widgets/staff_auth_dialog.dart';

import 'package:involve_app/services/terminal_sync_service.dart';
import '../widgets/notification_bell.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:involve_app/services/socket_service.dart' as import_socket_service;
import 'package:http/http.dart' as http;
import 'package:involve_app/core/utils/app_config.dart';

class DashboardPage extends StatefulWidget {
  static const routeName = '/dashboard';
  final bool autoOpenSettings;
  const DashboardPage({super.key, this.autoOpenSettings = false});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  TerminalConfig? _terminalConfig;

  @override
  void initState() {
    super.initState();
    _loadTerminalConfig();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkEmergencyLock();
      if (widget.autoOpenSettings) {
        _verifyAndNavigateToSettings(context);
      }
    });
    context.read<HistoryBloc>().add(LoadHistory());
  }

  Future<void> _checkEmergencyLock() async {
    final prefs = await SharedPreferences.getInstance();
    final isLocked = prefs.getBool('is_emergency_locked') ?? false;
    final passcode = prefs.getString('emergency_lock_passcode');
    
    if (isLocked && passcode != null) {
      if (mounted) {
        import_socket_service.SocketService().showEmergencyLockScreen(context, passcode);
      }
    }
  }

  Future<void> _loadTerminalConfig() async {
    final config = await TerminalSyncService.loadCachedConfig();
    if (mounted) {
      setState(() {
        _terminalConfig = config;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<SettingsBloc, SettingsState>(
      builder: (context, settingsState) {
        final settings = settingsState.settings;
        
        return Scaffold(
          appBar: AppBar(
            title: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Logo on the left
                if (settings?.logo != null) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.memory(
                      settings!.logo!,
                      width: 32,
                      height: 32,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return const Icon(Icons.store, size: 32);
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                // Organization name & Plan Badge
                Flexible(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Flexible(
                        child: Text(
                          _terminalConfig?.businessName ?? settings?.organizationName ?? 'Invify',
                          style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (settingsState.userPlan?.isValid == true &&
                          !settingsState.userPlan!.isFreeTrial) ...[
                        const SizedBox(width: 6),
                        _buildPlanBadge(settingsState.userPlan!),
                      ],
                    ],
                  ),
                ),
              ],
            ),
            flexibleSpace: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Theme.of(context).colorScheme.primary,
                    Color.lerp(Theme.of(context).colorScheme.primary, Colors.black, 0.2)!,
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
            ),
            foregroundColor: Colors.white,
            centerTitle: false,
            actions: [
              if (settings?.showDateTime == true) const LiveDateTimeWidget(),
              const SizedBox(width: 4),
              if (settings?.showSyncStatus == true)
                BlocBuilder<SyncBloc, SyncState>(
                  builder: (context, syncState) {
                    final isMaster = syncState.isMaster;
                    final hasPeers = syncState.peers.isNotEmpty;
                    final isSyncing = syncState.isSyncing;
                    
                    IconData icon = Icons.sync;
                    Color color = Colors.white54;
                    String tooltip = 'Sync Status';

                    if (isSyncing) {
                      icon = Icons.refresh;
                      color = Colors.greenAccent;
                      tooltip = 'Syncing...';
                    } else if (isMaster) {
                      icon = Icons.dns;
                      color = Colors.white;
                      tooltip = 'Sync Master: Active';
                    } else if (hasPeers) {
                      icon = Icons.check_circle_outline;
                      color = Colors.white.withOpacity(0.9);
                      tooltip = 'Sync Client: Connected';
                    } else {
                      icon = Icons.sync_disabled;
                      color = Colors.white.withOpacity(0.3);
                      tooltip = 'Sync: Offline';
                    }

                    return SyncIndicator(
                      icon: icon,
                      color: color,
                      isSyncing: isSyncing,
                      tooltip: tooltip,
                      onPressed: () => Navigator.pushNamed(context, '/device_sync'),
                    );
                  },
                ),
              const SizedBox(width: 4),
              if (settings?.showNetworkIndicator == true)
                ValueListenableBuilder<bool>(
                  valueListenable: SocketService().isConnected,
                  builder: (context, isConnected, child) {
                    return ValueListenableBuilder<String?>(
                      valueListenable: SocketService().lastError,
                      builder: (context, lastErr, _) {
                        final icon = isConnected ? Icons.cloud_done : Icons.cloud_off;
                        final color = isConnected ? Colors.greenAccent : Colors.redAccent;
                        final tooltip = isConnected
                            ? 'Live socket connected (${AppConfig.baseUrl})'
                            : (lastErr == null || lastErr.isEmpty)
                                ? 'Live socket offline (${AppConfig.baseUrl})\nAuto-reconnect is checking the network'
                                : 'Live socket offline (${AppConfig.baseUrl})\n$lastErr\nAuto-reconnect is checking the network\nTap to retry now';

                        return IconButton(
                          icon: Icon(icon, size: 20, color: color),
                          tooltip: tooltip,
                          onPressed: () async {
                            await SocketService().reconnect();
                            if (!context.mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  SocketService().isConnected.value
                                      ? 'Live socket connected'
                                      : 'Reconnecting live socket…',
                                ),
                                duration: const Duration(seconds: 2),
                              ),
                            );
                          },
                        );
                      },
                    );
                  },
                ),
              const SizedBox(width: 4),
              BlocBuilder<SettingsBloc, SettingsState>(
                builder: (context, state) {
                  final currentTheme = state.settings?.themeMode ?? 'system';
                  IconData icon;
                  String tooltip;
                  
                  switch (currentTheme) {
                    case 'light':
                      icon = Icons.light_mode;
                      tooltip = 'Light Mode';
                      break;
                    case 'dark':
                      icon = Icons.dark_mode;
                      tooltip = 'Dark Mode';
                      break;
                    default:
                      icon = Icons.brightness_auto;
                      tooltip = 'System Mode';
                  }

                  return IconButton(
                    icon: Icon(icon, size: 20),
                    tooltip: tooltip,
                    onPressed: () {
                      String nextTheme;
                      if (currentTheme == 'system') nextTheme = 'light';
                      else if (currentTheme == 'light') nextTheme = 'dark';
                      else nextTheme = 'system';
                      
                      if (state.settings != null) {
                        context.read<SettingsBloc>().add(
                          UpdateAppSettings(state.settings!.copyWith(themeMode: nextTheme)),
                        );
                      }
                    },
                  );
                },
              ),
              const NotificationBell(),
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert),
                onSelected: (value) {
                  switch (value) {
                    case 'about':
                      Navigator.pushNamed(context, '/about');
                      break;
                    case 'help':
                      Navigator.pushNamed(context, '/help');
                      break;
                    case 'user_guide':
                      Navigator.pushNamed(context, '/user_guide');
                      break;
                  }
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(
                    value: 'about',
                    child: ListTile(
                      leading: Icon(Icons.info_outline),
                      title: Text('About'),
                      contentPadding: EdgeInsets.zero,
                      visualDensity: VisualDensity.compact,
                      ),
                  ),
                  const PopupMenuItem(
                    value: 'help',
                    child: ListTile(
                      leading: Icon(Icons.help_outline),
                      title: Text('Help & Support'),
                      contentPadding: EdgeInsets.zero,
                      visualDensity: VisualDensity.compact,
                    ),
                  ),
                  if (settings?.businessMode == 'school')
                    const PopupMenuItem(
                      value: 'user_guide',
                      child: ListTile(
                        leading: Icon(Icons.menu_book),
                        title: Text('User Guide'),
                        contentPadding: EdgeInsets.zero,
                        visualDensity: VisualDensity.compact,
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 8),
            ],
          ),
          backgroundColor: Theme.of(context).scaffoldBackgroundColor,
          body: Stack(
            children: [
              if (settings?.businessMode == 'school' && settings?.showLogoAsMenuBackground == true && settings?.logo != null)
                Positioned.fill(
                  child: Opacity(
                    opacity: 0.05,
                    child: Center(
                      child: Image.memory(
                        settings!.logo!,
                        fit: BoxFit.contain,
                        width: MediaQuery.of(context).size.width * 0.8,
                      ),
                    ),
                  ),
                ),
              BlocBuilder<PrinterBloc, PrinterState>(
                builder: (context, printerState) {
              final items = _getMenuItems(context, settings, printerState, settingsState.userPlan);
              final screenWidth = MediaQuery.of(context).size.width;
              final crossAxisCount = (screenWidth / 180).floor().clamp(2, 6);
              final isTablet = screenWidth >= 900;
              final isRetail = settings?.businessMode != 'school';

              Widget menuGrid = ReorderableGridView.count(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                crossAxisCount: isTablet ? (crossAxisCount * 0.7).floor().clamp(2, 4) : crossAxisCount,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.05,
                onReorder: (oldIndex, newIndex) {
                  final newOrder = items.map((e) => e.id).toList();
                  final item = newOrder.removeAt(oldIndex);
                  newOrder.insert(newIndex, item);
                  
                  if (settings != null) {
                    context.read<SettingsBloc>().add(
                      UpdateAppSettings(settings.copyWith(menuOrder: newOrder)),
                    );
                  }
                },
                children: items.map((item) => _buildMenuCard(
                  context,
                  item.title,
                  item.icon,
                  item.color,
                  item.onTap,
                  key: ValueKey(item.id),
                  indicatorColor: item.indicatorColor,
                  indicatorTooltip: item.indicatorTooltip,
                  secondaryIndicatorColor: item.secondaryIndicatorColor,
                  secondaryIndicatorTooltip: item.secondaryIndicatorTooltip,
                  isLocked: item.isLocked,
                )).toList(),
              );

              if (isTablet && isRetail) {
                return Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: menuGrid,
                    ),
                    const VerticalDivider(width: 1, thickness: 1),
                    const Expanded(
                      flex: 1,
                      child: Padding(
                        padding: EdgeInsets.all(16.0),
                        child: RecentTransactionsWidget(),
                      ),
                    ),
                  ],
                );
              }

              return menuGrid;
            },
          ),
          Positioned(
            bottom: 16,
            left: 0,
            right: 0,
            child: Center(
              child: Text(
                'v1.0.0',
                style: TextStyle(color: Colors.grey, fontSize: 12),
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: (settingsState.userPlan?.isFreeTrial == true ||
              !(settingsState.userPlan?.isValid ?? false))
          ? FutureBuilder<int>(
              future: LicenseService.getTrialDaysRemaining(),
              builder: (context, trialSnapshot) {
                if (!trialSnapshot.hasData || trialSnapshot.data == 0) return const SizedBox.shrink();
                
                return Container(
                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Colors.orange, Colors.deepOrange],
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                    ),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 4, offset: const Offset(0, -2)),
                    ],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.timer_outlined, color: Colors.white, size: 18),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          'TRIAL VERSION: ${trialSnapshot.data} DAYS REMAINING',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                            letterSpacing: 1.1,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 12),
                      TextButton(
                        onPressed: () => Navigator.pushNamed(context, ActivationPage.routeName),
                        style: TextButton.styleFrom(
                          backgroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
                          minimumSize: const Size(0, 24),
                        ),
                        child: const Text(
                          'ACTIVATE',
                          style: TextStyle(color: Colors.deepOrange, fontWeight: FontWeight.bold, fontSize: 10),
                        ),
                      ),
                    ],
                  ),
                );
              },
            )
          : const SizedBox.shrink(),
        );
      },
    );
  }

  void _verifyAndNavigateToSettings(BuildContext context) {
    Navigator.pushNamed(context, '/settings');
  }

  void _verifyAndNavigateToSuperAdmin(BuildContext context) {
    final settingsBloc = context.read<SettingsBloc>();
    
    // Reset auth state to ensure listener catches new success
    settingsBloc.add(ResetSuperAdminAuth());
    
    // Show super admin password dialog
    showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => SuperAdminPasswordDialog(bloc: settingsBloc),
    ).then((authorized) {
      if (authorized == true && context.mounted) {
        Navigator.pushNamed(context, '/super_admin_settings');
      }
    });
  }

  void _verifyAndNavigateToAdminHub(BuildContext context) {
    final settingsBloc = context.read<SettingsBloc>();
    
    // Reset auth state to ensure listener catches new success
    settingsBloc.add(ResetSystemAuth());
    
    // Show password dialog
    showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => PasswordDialog(bloc: settingsBloc),
    ).then((authorized) {
      if (authorized == true && context.mounted) {
        Navigator.pushNamed(context, '/admin_hub');
      }
    });
  }

  void _verifyAndNavigateToCloudMetrics(BuildContext context) {
    final settingsBloc = context.read<SettingsBloc>();
    
    // Reset auth state to ensure listener catches new success
    settingsBloc.add(ResetSystemAuth());
    
    // Show password dialog
    showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => PasswordDialog(bloc: settingsBloc),
    ).then((authorized) {
      if (authorized == true && context.mounted) {
        Navigator.pushNamed(context, '/admin_hub');
      }
    });
  }

  void _verifyAndNavigateToFinance(BuildContext context, String routeName) {
    showDialog<Staff>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => const StaffAuthDialog(),
    ).then((staff) {
      if (staff != null && context.mounted) {
        if (staff.role == 'ADMIN' || staff.role == 'FINANCE' || staff.role == 'EXECUTIVE') {
          Navigator.pushNamed(context, routeName);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Access Denied: Admin or Finance role required to view this section.'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    });
  }

  /// Trial + Basic tiers (anything that is not a paid Pro/Standard/Lifetime plan).
  bool _isTrialOrBasicPlan(UserPlan? plan) =>
      plan == null || plan.isBasic || plan.isFreeTrial;

  void _showFeaturePlanLock(BuildContext context, String featureName) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.lock_outline, color: Colors.orange.shade800),
            const SizedBox(width: 8),
            const Expanded(child: Text('Feature Locked')),
          ],
        ),
        content: Text(
          '$featureName is available on Pro plans.\n\n'
          'Trial and Basic users can activate a license to unlock this module.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('NOT NOW'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pushNamed(context, '/go_pro');
            },
            child: const Text('GO PRO'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pushNamed(context, ActivationPage.routeName);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.deepOrange,
              foregroundColor: Colors.white,
            ),
            child: const Text('ACTIVATE'),
          ),
        ],
      ),
    );
  }

  List<_DashboardMenuItem> _getMenuItems(BuildContext context, AppSettings? settings, PrinterState printerState, UserPlan? userPlan) {
    final isSchool = settings?.businessMode == 'school';
    final isServices = settings?.businessMode == 'services';
    final lockTrialBasic = _isTrialOrBasicPlan(userPlan);
    
    final allItems = <_DashboardMenuItem>[
      if (!isSchool) ...[
        _DashboardMenuItem(
          id: 'inventory_report',
          title: 'INVENTORY REPORT',
          icon: Icons.assessment_outlined,
          color: Colors.indigo,
          onTap: () => Navigator.pushNamed(context, '/inventory_report'),
        ),
        _DashboardMenuItem(
          id: 'customer_lookup',
          title: 'CUSTOMER LOOKUP',
          icon: Icons.person_search,
          color: Colors.blueAccent,
          onTap: () => Navigator.pushNamed(context, '/customer_lookup'),
        ),
      ],
      _DashboardMenuItem(
        id: 'new_sale',
        title: settings?.newSaleLabel.toUpperCase() ?? 'NEW SALE',
        icon: Icons.add_shopping_cart,
        color: Theme.of(context).colorScheme.primary,
        onTap: () {
          context.read<InvoiceBloc>().add(ResetInvoice());
          Navigator.pushNamed(context, '/create_invoice');
        },
      ),
      _DashboardMenuItem(
        id: 'printer',
        title: 'PRINTER & MPOS',
        icon: Icons.print,
        color: Colors.purple,
        onTap: () => Navigator.pushNamed(context, '/printer_settings'),
        indicatorColor: printerState.connectedDevice != null ? Colors.green : Colors.red,
        indicatorTooltip: printerState.connectedDevice != null ? 'Printer: Connected' : 'Printer: Disconnected',
        secondaryIndicatorColor: (_terminalConfig?.posSerialNumber?.isNotEmpty == true) ? Colors.blue : Colors.grey,
        secondaryIndicatorTooltip: (_terminalConfig?.posSerialNumber?.isNotEmpty == true) ? 'POS Device: Configured' : 'POS Device: Not Configured',
      ),
      _DashboardMenuItem(
        id: 'nibss_cert',
        title: 'NIBSS CERT',
        icon: Icons.verified_user_outlined,
        color: Colors.teal,
        onTap: () => Navigator.pushNamed(context, '/nibss_cert'),
      ),
      if (!isSchool) ...[
        _DashboardMenuItem(
          id: 'stock',
          title: settings?.stockLabel.toUpperCase() ?? 'STOCK / ITEMS',
          icon: Icons.inventory,
          color: Colors.orange,
          onTap: () => Navigator.pushNamed(context, '/stock_management'),
        ),
      ],
      _DashboardMenuItem(
        id: 'sales_records',
        title: settings?.salesLabel.toUpperCase() ?? 'SALES RECORDS',
        icon: Icons.assessment,
        color: Colors.green,
        onTap: () => Navigator.pushNamed(context, '/invoice_history'),
      ),
      _DashboardMenuItem(
        id: 'transaction_history',
        title: (settings?.transactionHistoryLabel ?? 'Transaction History').toUpperCase(),
        icon: Icons.receipt_long,
        color: Colors.indigo,
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const TransactionAuditPage()),
        ),
      ),
      _DashboardMenuItem(
        id: 'calculator',
        title: 'CALCULATOR',
        icon: Icons.calculate,
        color: Colors.teal,
        onTap: () => Navigator.pushNamed(context, '/calculator'),
      ),
      _DashboardMenuItem(
        id: 'settings',
        title: 'SETTINGS',
        icon: Icons.settings,
        color: Colors.blueGrey,
        onTap: () => _verifyAndNavigateToSettings(context),
      ),
      _DashboardMenuItem(
        id: 'admin_hub',
        title: 'ADMIN HUB',
        icon: Icons.admin_panel_settings,
        color: Colors.deepOrange,
        onTap: () => _verifyAndNavigateToAdminHub(context),
      ),
      if (!lockTrialBasic) ...[
        _DashboardMenuItem(
          id: 'cloud_metrics',
          title: 'CLOUD METRICS',
          icon: Icons.cloud_done_outlined,
          color: Colors.indigo,
          onTap: () {
            Navigator.pushNamed(context, '/cloud_metrics');
          },
        ),
        _DashboardMenuItem(
          id: 'finance_analytics',
          title: 'FINANCE ANALYTICS',
          icon: Icons.insights,
          color: Colors.blueAccent,
          onTap: () => _verifyAndNavigateToFinance(context, '/admin_finance'),
        ),
        _DashboardMenuItem(
          id: 'reconciliation',
          title: 'RECONCILIATION',
          icon: Icons.account_balance,
          color: Colors.teal,
          onTap: () => _verifyAndNavigateToFinance(context, '/executive_finance'),
        ),
      ] else ...[
        _DashboardMenuItem(
          id: 'go_pro',
          title: 'GO PRO / CLOUD',
          icon: Icons.cloud_upload,
          color: Colors.deepPurple,
          onTap: () => Navigator.pushNamed(context, '/go_pro'),
        ),
      ],
    ];

    if (isServices) {
      return [
        _DashboardMenuItem(
          id: 'services_dashboard',
          title: 'SERVICES DASHBOARD',
          icon: Icons.dashboard,
          color: Colors.blue,
          onTap: () => Navigator.pushNamed(context, '/services_dashboard'),
        ),
        _DashboardMenuItem(
          id: 'new_job',
          title: 'NEW JOB',
          icon: Icons.add_task,
          color: Colors.green,
          onTap: () => Navigator.pushNamed(context, '/create_job'),
        ),
        _DashboardMenuItem(
          id: 'all_jobs',
          title: 'ALL JOBS',
          icon: Icons.list_alt,
          color: Colors.orange,
          onTap: () => Navigator.pushNamed(context, '/jobs_list'),
        ),
        _DashboardMenuItem(
          id: 'customers',
          title: 'CUSTOMERS',
          icon: Icons.people,
          color: Colors.purple,
          onTap: () {
            Navigator.pushNamed(context, '/customers_list');
          },
        ),
        ...allItems.where((i) => [
          'sales_records',
          'transaction_history',
          'printer',
          'settings',
          'calculator',
          'admin_hub',
          'cloud_metrics',
          'finance_analytics',
          'reconciliation',
        ].contains(i.id)),
      ];
    }

    if (isSchool) {
      allItems.addAll([
        _DashboardMenuItem(
          id: 'student_analytics',
          title: 'STUDENT ANALYTICS',
          icon: Icons.analytics_outlined,
          color: Colors.blueAccent,
          onTap: () => Navigator.pushNamed(context, '/student_analytics'),
        ),
        _DashboardMenuItem(
          id: 'students',
          title: 'STUDENTS',
          icon: Icons.people_alt,
          color: Colors.indigo,
          onTap: () => Navigator.pushNamed(context, '/student_list'),
        ),
        _DashboardMenuItem(
          id: 'teachers',
          title: 'TEACHERS',
          icon: Icons.assignment_ind,
          color: Colors.deepPurple,
          onTap: () => Navigator.pushNamed(context, '/teacher_list'),
        ),
        _DashboardMenuItem(
          id: 'finance_dashboard',
          title: 'FINANCE DASHBOARD',
          icon: Icons.dashboard_customize,
          color: Colors.blueGrey,
          isLocked: lockTrialBasic,
          onTap: lockTrialBasic
              ? () => _showFeaturePlanLock(context, 'Finance Dashboard')
              : () => _verifyAndNavigateToFinance(context, '/school_finance'),
        ),
        _DashboardMenuItem(
          id: 'academic_setup',
          title: 'ACADEMIC SETUP',
          icon: Icons.school,
          color: Colors.brown,
          onTap: () => Navigator.pushNamed(context, '/school_setup'),
        ),
        _DashboardMenuItem(
          id: 'fee_management',
          title: 'FEE MANAGEMENT',
          icon: Icons.payments,
          color: Colors.cyan,
          onTap: () => Navigator.pushNamed(context, '/fee_management'),
        ),
        _DashboardMenuItem(
          id: 'fees',
          title: settings?.productsLabel.toUpperCase() ?? 'FEES',
          icon: Icons.grid_view,
          color: Colors.orange,
          onTap: () => Navigator.pushNamed(context, '/stock_management'),
        ),
        _DashboardMenuItem(
          id: 'subjects',
          title: 'SUBJECTS',
          icon: Icons.book,
          color: Colors.blue,
          onTap: () => Navigator.pushNamed(context, '/manage_subjects'),
        ),
        _DashboardMenuItem(
          id: 'result_entry',
          title: 'RESULT ENTRY',
          icon: Icons.edit_note,
          color: Colors.redAccent,
          onTap: () => Navigator.pushNamed(context, '/result_entry'),
        ),
        _DashboardMenuItem(
          id: 'lesson_notes',
          title: 'LESSON NOTES',
          icon: Icons.note_alt,
          color: Colors.teal,
          isLocked: lockTrialBasic,
          onTap: lockTrialBasic
              ? () => _showFeaturePlanLock(context, 'Lesson Notes')
              : () => Navigator.pushNamed(context, '/lesson_notes_list'),
        ),
      ]);
    }

    // Sort items based on menuOrder settings
    final order = settings?.menuOrder ?? [];
    if (order.isEmpty) return allItems;

    final sortedItems = <_DashboardMenuItem>[];
    // Add items that are in the order list first
    for (final id in order) {
      final item = allItems.firstWhereOrNull((e) => e.id == id);
      if (item != null) {
        sortedItems.add(item);
        allItems.remove(item);
      }
    }
    // Add any remaining items (newly added features etc.)
    sortedItems.addAll(allItems);
    
    return sortedItems;
  }


  Widget _buildMenuCard(
    BuildContext context, 
    String title, 
    IconData icon, 
    Color color, 
    VoidCallback onTap, {
    required Key key,
    Color? indicatorColor,
    String? indicatorTooltip,
    Color? secondaryIndicatorColor,
    String? secondaryIndicatorTooltip,
    bool isLocked = false,
  }) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final tileColor = isLocked ? Colors.grey : color;

    return Card(
      key: key,
      elevation: 4,
      shadowColor: tileColor.withOpacity(0.3),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      color: isDark ? theme.colorScheme.surface : Colors.white,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          children: [
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: tileColor.withOpacity(0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(icon, size: 32, color: tileColor),
                  ),
                  const SizedBox(height: 12),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8.0),
                    child: Text(
                      title,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontWeight: FontWeight.bold, 
                        fontSize: 12, 
                        color: isDark
                            ? Colors.white.withOpacity(isLocked ? 0.55 : 0.9)
                            : (isLocked ? Colors.grey[500] : Colors.grey[800]),
                        letterSpacing: 0.5,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
            if (isLocked)
              Positioned(
                top: 10,
                right: 10,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.orange.shade50,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.orange.shade200),
                  ),
                  child: Icon(Icons.lock, size: 14, color: Colors.orange.shade800),
                ),
              )
            else if (indicatorColor != null || secondaryIndicatorColor != null)
              Positioned(
                top: 16,
                right: 16,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (secondaryIndicatorColor != null)
                      Tooltip(
                        message: secondaryIndicatorTooltip ?? '',
                        child: Container(
                          width: 12,
                          height: 12,
                          margin: const EdgeInsets.only(right: 6),
                          decoration: BoxDecoration(
                            color: secondaryIndicatorColor,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: secondaryIndicatorColor.withOpacity(0.4),
                                blurRadius: 6,
                                spreadRadius: 2,
                              ),
                            ],
                          ),
                        ),
                      ),
                    if (indicatorColor != null)
                      Tooltip(
                        message: indicatorTooltip ?? '',
                        child: Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            color: indicatorColor,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: indicatorColor.withOpacity(0.4),
                                blurRadius: 6,
                                spreadRadius: 2,
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlanBadge(UserPlan plan) {
    final isLifetime = plan.isLifetime;
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isLifetime 
              ? [const Color(0xFFFFD700), const Color(0xFFFFA500)] // Gold for Lifetime
              : [const Color(0xFFE0E0E0), const Color(0xFFBDBDBD)], // Silver for Pro
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(10),
        boxShadow: [
          BoxShadow(
            color: (isLifetime ? Colors.orange : Colors.grey).withOpacity(0.3),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isLifetime ? Icons.stars : Icons.verified,
            size: 9,
            color: isLifetime ? Colors.brown[900] : Colors.blueGrey[900],
          ),
          const SizedBox(width: 3),
          Text(
            plan.planType.toUpperCase(),
            style: TextStyle(
              color: isLifetime ? Colors.brown[900] : Colors.blueGrey[900],
              fontSize: 8.5,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }
}

class _DashboardMenuItem {
  final String id;
  final String title;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  final Color? indicatorColor;
  final String? indicatorTooltip;
  final Color? secondaryIndicatorColor;
  final String? secondaryIndicatorTooltip;
  final bool isLocked;

  _DashboardMenuItem({
    required this.id,
    required this.title,
    required this.icon,
    required this.color,
    required this.onTap,
    this.indicatorColor,
    this.indicatorTooltip,
    this.secondaryIndicatorColor,
    this.secondaryIndicatorTooltip,
    this.isLocked = false,
  });
}
