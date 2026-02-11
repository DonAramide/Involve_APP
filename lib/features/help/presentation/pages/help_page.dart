import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'dart:async';
import '../../../settings/presentation/bloc/settings_bloc.dart';
import '../../../settings/presentation/bloc/settings_state.dart';
import '../../../settings/presentation/widgets/super_admin_password_dialog.dart';
import '../../../settings/presentation/pages/super_admin_settings_page.dart';

class HelpPage extends StatefulWidget {
  const HelpPage({super.key});

  @override
  State<HelpPage> createState() => _HelpPageState();
}

class _HelpPageState extends State<HelpPage> {
  int _titleClickCount = 0;
  Timer? _clickTimer;

  @override
  void dispose() {
    _clickTimer?.cancel();
    super.dispose();
  }

  void _onTitleTap() {
    setState(() {
      _titleClickCount++;
      
      // Reset timer on each click
      _clickTimer?.cancel();
      _clickTimer = Timer(const Duration(seconds: 3), () {
        setState(() => _titleClickCount = 0);
      });
      
      // Show super admin dialog on 6th click
      if (_titleClickCount >= 6) {
        _titleClickCount = 0;
        _clickTimer?.cancel();
        _showSuperAdminAccess();
      }
    });
  }

  void _showSuperAdminAccess() {
    final settingsBloc = context.read<SettingsBloc>();
    
    // Reset super admin auth state
    settingsBloc.add(ResetSuperAdminAuth());
    
    // Show super admin password dialog
    showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => SuperAdminPasswordDialog(bloc: settingsBloc),
    ).then((authorized) {
      if (authorized == true && mounted) {
        // Navigate to Super Admin Settings
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const SuperAdminSettingsPage()),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: GestureDetector(
          onTap: _onTitleTap,
          child: Text(
            'Help & Support',
            style: TextStyle(
              color: _titleClickCount > 0 && _titleClickCount < 6
                  ? Colors.deepPurple.withOpacity(0.5 + (_titleClickCount * 0.08))
                  : null,
            ),
          ),
        ),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // App Info Header
          Center(
            child: Column(
              children: [
                const Icon(Icons.point_of_sale, size: 64, color: Colors.blue),
                const SizedBox(height: 16),
                const Text(
                  'Bar & Hotel POS',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
                Text(
                  'Version 1.0.0',
                  style: TextStyle(color: Colors.grey[600]),
                ),
                const SizedBox(height: 8),
                const Text('© 2026 Involve App'),
              ],
            ),
          ),
          const SizedBox(height: 32),

          const Text(
            'User Guide',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),

          _buildExpansionTile(
            icon: Icons.inventory,
            title: 'Stock Management',
            content: '• Go to "Stock / Items" to manage your inventory.\n'
                '• Tap "+" to add new items with images and categories.\n'
                '• Long press an item to delete or edit it.\n'
                '• Use "Manage Categories" to organize your menu.',
          ),
          _buildExpansionTile(
            icon: Icons.shopping_cart,
            title: 'Making Sales',
            content: '• Go to "New Invoice" to start a sale.\n'
                '• Tap items to add them to the cart.\n'
                '• Use the category chips to filter items.\n'
                '• Swipe left on a cart item to remove it.\n'
                '• Tap "Charge" to finalize and print.',
          ),
          _buildExpansionTile(
            icon: Icons.print,
            title: 'Printing',
            content: '• Configure printers in Settings > Printer Settings.\n'
                '• Supports Bluetooth and USB thermal printers (58mm/80mm).\n'
                '• Ensure Bluetooth is on and device is paired.\n'
                '• If connection fails, try restarting the printer.',
          ),
          _buildExpansionTile(
            icon: Icons.settings,
            title: 'Settings & Security',
            content: '• Default System Password: "admin123"\n'
                '• Set a Super Admin password for critical changes.\n'
                '• Customize your Company Logo and Currency.\n'
                '• Toggle Dark/Light mode from the Dashboard.',
          ),
          
          const SizedBox(height: 32),
          const Text(
            'Contact Support',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const Card(
            child: ListTile(
              leading: Icon(Icons.email),
              title: Text('Email Support'),
              subtitle: Text('support@involveapp.com'),
            ),
          ),
          const Card(
            child: ListTile(
              leading: Icon(Icons.phone),
              title: Text('Phone Support'),
              subtitle: Text('+123 456 7890'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExpansionTile({
    required IconData icon,
    required String title,
    required String content,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ExpansionTile(
        leading: Icon(icon, color: Colors.deepPurple),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              content,
              style: const TextStyle(height: 1.5),
            ),
          ),
        ],
      ),
    );
  }
}
