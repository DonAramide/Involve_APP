import 'package:flutter/material.dart';
import '../../../stock/presentation/pages/stock_management_page.dart';
import '../../../invoicing/presentation/pages/create_invoice_page.dart';
import '../../../invoicing/presentation/history/pages/invoice_history_page.dart';
import '../../../settings/presentation/pages/settings_page.dart';

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bar & Hotel POS'),
        centerTitle: true,
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
            () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsPage())),
          ),
        ],
      ),
    );
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
