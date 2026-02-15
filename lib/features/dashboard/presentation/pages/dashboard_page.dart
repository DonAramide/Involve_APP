import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../stock/presentation/pages/stock_management_page.dart';
import '../../../invoicing/presentation/pages/create_invoice_page.dart';
import '../../../invoicing/presentation/history/pages/invoice_history_page.dart';
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
import 'package:involve_app/features/printer/presentation/pages/printer_settings_page.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_bloc.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_state.dart';
import 'dart:async';

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});

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
                    settings?.organizationName ?? 'Bar & Hotel POS',
                    style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            flexibleSpace: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.blue, Colors.indigo],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
            ),
            foregroundColor: Colors.white,
            centerTitle: false,
            actions: [
              const LiveDateTimeWidget(),
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
                      
                      context.read<SettingsBloc>().add(
                        UpdateAppSettings(state.settings!.copyWith(themeMode: nextTheme)),
                      );
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
            Colors.blue,
            () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CreateInvoicePage())),
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
            'SETTINGS',
            Icons.settings,
            Colors.blueGrey,
            () => _verifyAndNavigateToSettings(context),
          ),
        ],
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
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.15),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
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
                        color: color.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(icon, size: 40, color: color),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      title,
                      style: TextStyle(
                        fontWeight: FontWeight.w800, 
                        fontSize: 14, 
                        color: Colors.grey[800],
                        letterSpacing: 0.8,
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
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: indicatorColor,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: indicatorColor.withOpacity(0.5),
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
      ),
    );
  }
}
