import 'package:flutter/material.dart';
import 'manage_job_titles_page.dart';
import 'manage_materials_page.dart';
import 'manage_categories_page.dart';
import 'manage_labor_page.dart';
import 'manage_service_expense_categories_page.dart';

class ServicesSetupPage extends StatelessWidget {
  const ServicesSetupPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Services Setup'),
        elevation: 0,
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.black,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildSetupCard(
            context,
            title: 'Job Titles & Presets',
            subtitle: 'Manage common job names like "Oil Change", "Sewing", etc.',
            icon: Icons.title,
            color: Colors.blue,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ManageJobTitlesPage())),
          ),
          const SizedBox(height: 16),
          _buildSetupCard(
            context,
            title: 'Material Categories',
            subtitle: 'Pre-setup categories like "Automotive", "Building", etc.',
            icon: Icons.category,
            color: Colors.purple,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ManageCategoriesPage())),
          ),
          const SizedBox(height: 16),
          _buildSetupCard(
            context,
            title: 'Materials & Parts',
            subtitle: 'Define products, parts, and materials with default prices.',
            icon: Icons.inventory_2,
            color: Colors.orange,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ManageMaterialsPage())),
          ),
          const SizedBox(height: 16),
          _buildSetupCard(
            context,
            title: 'Labor Settings',
            subtitle: 'Configure default labor rates & workmanship fees.',
            icon: Icons.work_history,
            color: Colors.green,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ManageLaborPage())),
          ),
          _buildSetupCard(
            context,
            title: 'Expense Categories',
            subtitle: 'Define sub-categories for service costs (e.g. Fuel).',
            icon: Icons.account_tree_outlined,
            color: Colors.orange,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ManageServiceExpenseCategoriesPage())),
          ),
        ],
      ),
    );
  }

  Widget _buildSetupCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Theme.of(context).dividerColor),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: Colors.grey.shade400),
          ],
        ),
      ),
    );
  }
}
