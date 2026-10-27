import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/features/activation/presentation/pages/activation_page.dart';
import 'package:involve_app/features/settings/domain/entities/user_plan.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'manage_job_titles_page.dart';
import 'manage_materials_page.dart';
import 'manage_categories_page.dart';
import 'manage_labor_page.dart';
import 'manage_service_expense_categories_page.dart';
import 'manage_description_formats_page.dart';

class ServicesSetupPage extends StatelessWidget {
  const ServicesSetupPage({super.key});

  void _showPlanLock(BuildContext context, String featureName) {
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
          '$featureName requires a Standard or Premium plan.\n\n'
          '• ${UserPlan.basicSummary}\n'
          '• ${UserPlan.standardSummary}\n'
          '• ${UserPlan.premiumSummary}\n\n'
          'Upgrade to unlock this module.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('NOT NOW'),
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
            child: const Text('UPGRADE'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final plan = context.watch<SettingsBloc>().state.userPlan;
    final descriptionLocked = plan == null || plan.isBasicTier;

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
            title: 'Service Offerings & Presets',
            subtitle: 'Manage common services, tasks, and offerings (e.g. Repairs, Consultation, Maintenance, Styling, Installation).',
            icon: Icons.design_services_outlined,
            color: Colors.blue,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ManageJobTitlesPage())),
          ),
          const SizedBox(height: 16),
          _buildSetupCard(
            context,
            title: 'Material Categories',
            subtitle: 'Organize parts, products, and materials into categories.',
            icon: Icons.category_outlined,
            color: Colors.purple,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ManageCategoriesPage())),
          ),
          const SizedBox(height: 16),
          _buildSetupCard(
            context,
            title: 'Materials & Parts',
            subtitle: 'Define products, parts, and materials with default prices.',
            icon: Icons.inventory_2_outlined,
            color: Colors.orange,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ManageMaterialsPage())),
          ),
          const SizedBox(height: 16),
          _buildSetupCard(
            context,
            title: 'Labor Settings',
            subtitle: 'Configure default labor rates & workmanship fees.',
            icon: Icons.work_history_outlined,
            color: Colors.green,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ManageLaborPage())),
          ),
          const SizedBox(height: 16),
          _buildSetupCard(
            context,
            title: 'Description Format',
            subtitle: descriptionLocked
                ? 'Standard or Premium required — create description tables for Create Job.'
                : 'Create description categories with text inputs and checkboxes for Create Job.',
            icon: Icons.table_chart_outlined,
            color: Colors.teal,
            isLocked: descriptionLocked,
            onTap: descriptionLocked
                ? () => _showPlanLock(context, 'Description Format')
                : () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ManageDescriptionFormatsPage()),
                    ),
          ),
          const SizedBox(height: 16),
          _buildSetupCard(
            context,
            title: 'Expense Categories',
            subtitle: 'Define sub-categories for service operational costs.',
            icon: Icons.account_tree_outlined,
            color: Colors.deepOrange,
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
    bool isLocked = false,
  }) {
    final tileColor = isLocked ? Colors.grey : color;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isLocked ? Colors.orange.shade200 : Theme.of(context).dividerColor,
          ),
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
                color: tileColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: tileColor, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: isLocked ? Colors.grey.shade600 : null,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                  ),
                ],
              ),
            ),
            if (isLocked)
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.orange.shade200),
                ),
                child: Icon(Icons.lock, size: 16, color: Colors.orange.shade800),
              )
            else
              Icon(Icons.chevron_right, color: Colors.grey.shade400),
          ],
        ),
      ),
    );
  }
}
