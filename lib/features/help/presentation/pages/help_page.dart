import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'dart:async';
import 'package:involve_app/features/settings/presentation/pages/super_admin_settings_page.dart';
import 'package:involve_app/features/admin/presentation/widgets/admin_login_dialog.dart';
import 'package:involve_app/core/license/storage_service.dart';
import 'package:involve_app/features/admin/presentation/widgets/device_access_dialog.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:url_launcher/url_launcher.dart';

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

  Future<void> _showSuperAdminAccess() async {
    final bool alreadyGranted = await StorageService.isDeviceAccessGranted();
    
    if (!alreadyGranted && mounted) {
      final bool? deviceAccess = await showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (context) => DeviceAccessDialog(),
      );
      
      if (deviceAccess != true) return;
      
      await StorageService.setDeviceAccessGranted(true);
    }

    if (!mounted) return;

    showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AdminLoginDialog(),
    ).then((authorized) {
      if (authorized == true && mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const SuperAdminSettingsPage()),
        );
      }
    });
  }

  Future<void> _launch(String scheme, String number) async {
    final cleanNumber = number.replaceAll(RegExp(r'[^0-9+]'), '');
    Uri uri;
    if (scheme == 'whatsapp') {
      uri = Uri.parse('https://wa.me/$cleanNumber');
    } else {
      uri = Uri(scheme: scheme, path: cleanNumber);
    }
    
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _launchEmail(String email) async {
    final Uri uri = Uri(
      scheme: 'mailto',
      path: email,
      query: 'subject=Invify Support Request',
    );
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<SettingsBloc, SettingsState>(
      builder: (context, state) {
        final isSchool = state.settings?.businessMode == 'school';

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
                Image.asset(
                  'assets/images/logo_transparent.png',
                  height: 80,
                ),
                const SizedBox(height: 16),
                const Text(
                  'Invify',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
                Text(
                  'Version 1.5.0',
                  style: TextStyle(color: Colors.grey[600]),
                ),
                const SizedBox(height: 8),
                const Text('© 2026 Invify'),
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
            title: isSchool ? 'Fee & Items Management' : 'Stock Management',
            content: isSchool 
                ? '• Go to "Fee Management" to manage school fees.\n'
                  '• Go to "Stock Management" for canteen or other items.\n'
                  '• Tap "+" to add new fee types with categories.\n'
                  '• **Safeguard**: You cannot delete a fee type if there are active records linked to it.'
                : '• Go to "Stock Management" to manage your inventory.\n'
                  '• Tap "+" to add new items with images and categories.\n'
                  '• **Safeguard**: You cannot delete a product or category if it still contains items in stock (> 0). This prevents accidental data loss.',
          ),
          _buildExpansionTile(
            icon: Icons.shopping_cart,
            title: isSchool ? 'Collecting Fees' : 'Making Sales',
            content: isSchool
                ? '• Go to "New Sale" to start a fee collection session.\n'
                  '• Tap fees to add them to the student\'s registry.\n'
                  '• Use searching filtered by Class or Student ID.\n'
                  '• **Custom Pricing**: Adjust specific amounts if scholarships or discounts apply.\n'
                  '• Tap "Charge" to finalize payment and generate a School Receipt.\n'
                  '• Partial Payments: Record deposits; balance stays on student profile.'
                : '• Go to "New Invoice" to start a sale.\n'
                  '• Tap items to add them to the cart.\n'
                  '• Use the category chips to filter items.\n'
                  '• Swipe left on a cart item to remove it.\n'
                  '• **Custom Pricing**: If enabled in Settings, you can tap "Set Receipt Price" on items to inflate the price shown on the customer\'s receipt while keeping your actual accounts accurate.\n'
                  '• Tap "Charge" to finalize.\n'
                  '• Partial Payments: Enter "Amount Received" during checkout. The system will track the balance for later.',
          ),
          _buildExpansionTile(
            icon: Icons.print,
            title: 'Printing',
            content: '• Configure printers in Settings > Printer Settings.\n'
                '• Supports Bluetooth, USB, and Network thermal printers.\n'
                '• **Inventory Reports**: You can print your complete stock status to your thermal printer via the "Print" icon in the Inventory Report page.\n'
                '• If connection fails, check if the printer is on and within range.',
          ),
          _buildExpansionTile(
            icon: Icons.people,
            title: 'Staff & Accountability',
            content: '• Setup staff members in Settings > Manage Staff.\n'
                '• Protect your identity with a 4-digit Staff PIN.\n'
                '• Accountability: Every sale is linked to the active staff.\n'
                '• Filters: Use the "Status" filter in History to isolate Paid, Partial, or Unpaid invoices.',
          ),
          _buildExpansionTile(
            icon: Icons.settings,
            title: 'Settings & Security',
            content: '• Device Sync: The App Bar icon spins green during active data exchange.\n'
                '• Data Backup: Export all school records to device storage (Android/Desktop).\n'
                '• Operations: Switch modes to align terminology with Educational standards.\n'
                '• Security: One-time "Device Access" PIN required for new machines.',
          ),
          
          const SizedBox(height: 32),
          const Text(
            'Contact Support',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          GestureDetector(
            onTap: () async {
              final Uri emailUri = Uri.parse('mailto:info.iips.ng@gmail.com?subject=Support Request');
              if (await canLaunchUrl(emailUri)) {
                await launchUrl(emailUri);
              }
            },
            child: const Card(
              child: ListTile(
                leading: Icon(Icons.email, color: Colors.deepPurple),
                title: Text('Email Support'),
                subtitle: Text('info.iips.ng@gmail.com'),
              ),
            ),
          ),
          Card(
            child: ListTile(
              leading: const Icon(Icons.phone, color: Colors.deepPurple),
              title: const Text('Support (WhatsApp/Tel)'),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Wrap(
                  children: [
                    InkWell(
                      onTap: () async {
                        final Uri telUri = Uri.parse('tel:08023552282');
                        if (await canLaunchUrl(telUri)) {
                          await launchUrl(telUri);
                        }
                      },
                      child: const Text(
                        '08023552282',
                        style: TextStyle(color: Colors.blue, decoration: TextDecoration.underline),
                      ),
                    ),
                    const Text(' | '),
                    InkWell(
                      onTap: () async {
                        final Uri telUri = Uri.parse('tel:09027033748');
                        if (await canLaunchUrl(telUri)) {
                          await launchUrl(telUri);
                        }
                      },
                      child: const Text(
                        '09027033748',
                        style: TextStyle(color: Colors.blue, decoration: TextDecoration.underline),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: () async {
              final Uri uri = Uri.parse('https://iips.app');
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri);
              }
            },
            child: const Card(
              child: ListTile(
                leading: Icon(Icons.language, color: Colors.deepPurple),
                title: Text('Official Website'),
                subtitle: Text('https://iips.app'),
              ),
            ),
          ),
          const SizedBox(height: 32),
          
          // Powered by
          Center(
            child: Column(
              children: [
                Text(
                  'Powered by',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 16),
                Image.asset(
                  'assets/images/iips_logo.png',
                  height: 100,
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  },
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
