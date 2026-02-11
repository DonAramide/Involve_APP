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
                Text(settings?.organizationName ?? 'Bar & Hotel POS'),
              ],
            ),
            centerTitle: false,
            actions: [
          LiveDateTimeWidget(),
          SizedBox(width: 8),
          IconButton(
            icon: const Icon(Icons.info_outline),
            tooltip: 'About',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const AboutPage()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.contact_support),
            tooltip: 'Contact Us',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ContactPage()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.help_outline),
            tooltip: 'Help & Support',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const HelpPage()),
            ),
          ),
          SizedBox(width: 8),
          BlocBuilder<SettingsBloc, SettingsState>(
            builder: (context, state) {
              final currentTheme = state.settings?.themeMode ?? 'system';
              IconData icon;
              String tooltip;
              
              switch (currentTheme) {
                case 'light':
                  icon = Icons.light_mode;
                  tooltip = 'Switch to Dark Mode';
                  break;
                case 'dark':
                  icon = Icons.dark_mode;
                  tooltip = 'Switch to System Mode';
                  break;
                default:
                  icon = Icons.brightness_auto;
                  tooltip = 'Switch to Light Mode';
              }

              return IconButton(
                icon: Icon(icon),
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
          SizedBox(width: 16),
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
          _buildMenuCard(
            context,
            'STOCK / ITEMS',
            Icons.inventory,
            Colors.orange,
            () => Navigator.push(context, MaterialPageRoute(builder: (_) => const StockManagementPage())),
          ),
          _buildMenuCard(
            context,
            'HISTORY',
            Icons.history,
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


  Widget _buildMenuCard(BuildContext context, String title, IconData icon, Color color, VoidCallback onTap) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 48, color: color),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ],
        ),
      ),
    );
  }
}
