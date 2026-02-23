import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../stock/presentation/pages/stock_management_page.dart';
import '../../../invoicing/presentation/pages/create_invoice_page.dart';
import '../../../invoicing/presentation/history/pages/invoice_history_page.dart';
import 'package:involve_app/features/invoicing/presentation/bloc/invoice_bloc.dart';
import 'package:involve_app/features/invoicing/presentation/bloc/invoice_state.dart';
import '../../../settings/presentation/pages/settings_page.dart';
import '../../../settings/presentation/pages/super_admin_settings_page.dart';
import '../../../settings/presentation/bloc/settings_bloc.dart';
import '../../../settings/presentation/bloc/settings_state.dart';
import '../../../settings/presentation/widgets/password_dialog.dart';
import '../../../settings/presentation/widgets/super_admin_password_dialog.dart';
import '../../../../core/widgets/live_datetime_widget.dart';
import '../../../help/presentation/pages/help_page.dart';
import 'about_page.dart';
import 'contact_page.dart';
import 'calculator_page.dart';
import 'package:involve_app/features/printer/presentation/pages/printer_settings_page.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_bloc.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_state.dart';
import 'package:involve_app/core/license/license_service.dart';
import 'package:involve_app/features/activation/presentation/pages/activation_page.dart';
import 'dart:async';
import 'package:involve_app/core/sync/presentation/bloc/sync_bloc.dart';
import '../../../../core/sync/presentation/widgets/sync_indicator.dart';
import '../../../../core/sync/presentation/pages/device_sync_page.dart';

class DashboardPage extends StatefulWidget {
  final bool autoOpenSettings;
  const DashboardPage({super.key, this.autoOpenSettings = false});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  @override
  void initState() {
    super.initState();
    if (widget.autoOpenSettings) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _verifyAndNavigateToSettings(context);
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
              children: [
                // Logo on the left
                if (settings?.logo != null)
                  Container(
                    margin: const EdgeInsets.only(right: 12),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.memory(
                        settings!.logo!,
                        width: 40,
                        height: 40,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return const Icon(Icons.store, size: 40);
                        },
                      ),
                    ),
                  ),
                // Organization name
                Expanded(
                  child: Text(
                    settings?.organizationName ?? 'Invify',
                    style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5),
                    overflow: TextOverflow.ellipsis,
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
                      onPressed: () => Navigator.push(
                        context, 
                        MaterialPageRoute(builder: (_) => const DeviceSyncPage()),
                      ),
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
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert),
                onSelected: (value) {
                  switch (value) {
                    case 'about':
                      Navigator.push(context, MaterialPageRoute(builder: (_) => AboutPage()));
                      break;
                    case 'contact':
                      Navigator.push(context, MaterialPageRoute(builder: (_) => ContactPage()));
                      break;
                    case 'help':
                      Navigator.push(context, MaterialPageRoute(builder: (_) => HelpPage()));
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
                    value: 'contact',
                    child: ListTile(
                      leading: Icon(Icons.contact_support),
                      title: Text('Contact Us'),
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
                ],
              ),
              const SizedBox(width: 8),
            ],
          ),
          backgroundColor: Theme.of(context).scaffoldBackgroundColor,
          body: GridView.count(
        padding: const EdgeInsets.all(24),
        crossAxisCount: 2,
        mainAxisSpacing: 16,
        crossAxisSpacing: 16,
        children: [
          _buildMenuCard(
            context,
            'NEW INVOICE',
            Icons.add_shopping_cart,
            Theme.of(context).colorScheme.primary,
            () {
              context.read<InvoiceBloc>().add(ResetInvoice());
              Navigator.push(context, MaterialPageRoute(builder: (_) => const CreateInvoicePage()));
            },
          ),
          BlocBuilder<PrinterBloc, PrinterState>(
            builder: (context, printerState) {
              final isConnected = printerState.connectedDevice != null;
              return _buildMenuCard(
                context,
                'PRINTER',
                Icons.print,
                Colors.purple,
                () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PrinterSettingsPage())),
                indicatorColor: isConnected ? Colors.green : Colors.red,
                indicatorTooltip: isConnected ? 'Connected' : 'Disconnected',
              );
            },
          ),
          _buildMenuCard(
            context,
            'STOCK / ITEMS',
            Icons.inventory,
            Colors.orange,
            () => Navigator.push(context, MaterialPageRoute(builder: (_) => const StockManagementPage())),
          ),
          _buildMenuCard(
            context,
            'SALES RECORDS',
            Icons.assessment,
            Colors.green,
            () => Navigator.push(context, MaterialPageRoute(builder: (_) => const InvoiceHistoryPage())),
          ),
          _buildMenuCard(
            context,
            'CALCULATOR',
            Icons.calculate,
            Colors.teal,
            () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CalculatorPage())),
          ),
          _buildMenuCard(
            context,
            'SETTINGS',
            Icons.settings,
            Colors.blueGrey,
            () => _verifyAndNavigateToSettings(context),
          ),
        ],
      ),
      bottomNavigationBar: FutureBuilder<bool>(
            future: LicenseService.isActivated(settings?.organizationName),
            builder: (context, snapshot) {
              if (snapshot.data == true) return const SizedBox.shrink();
              
              return FutureBuilder<int>(
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
                          onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ActivationPage())),
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
              );
            },
          ),
        );
      },
    );
  }

  void _verifyAndNavigateToSettings(BuildContext context) {
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
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const SettingsPage()),
        );
      }
    });
  }


  Widget _buildMenuCard(
    BuildContext context, 
    String title, 
    IconData icon, 
    Color color, 
    VoidCallback onTap, {
    Color? indicatorColor,
    String? indicatorTooltip,
  }) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Card(
      elevation: 4,
      shadowColor: color.withOpacity(0.3),
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
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(icon, size: 40, color: color),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    title,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontWeight: FontWeight.w900, 
                      fontSize: 14, 
                      color: isDark ? Colors.white.withOpacity(0.9) : Colors.grey[800],
                      letterSpacing: 1.0,
                    ),
                  ),
                ],
              ),
            ),
            if (indicatorColor != null)
              Positioned(
                top: 16,
                right: 16,
                child: Tooltip(
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
              ),
          ],
        ),
      ),
    );
  }
}
