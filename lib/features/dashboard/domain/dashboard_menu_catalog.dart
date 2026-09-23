/// Shared dashboard tile ids + labels for Admin Control and the home grid.
class DashboardMenuOption {
  const DashboardMenuOption({
    required this.id,
    required this.label,
    this.modes = const ['retail', 'school', 'services'],
    this.pinned = false,
  });

  final String id;
  final String label;
  final List<String> modes;
  final bool pinned;
}

class DashboardMenuCatalog {
  DashboardMenuCatalog._();

  static const String adminHubId = 'admin_hub';

  static const List<DashboardMenuOption> all = [
    DashboardMenuOption(id: adminHubId, label: 'Admin Hub', pinned: true),
    DashboardMenuOption(id: 'settings', label: 'Settings'),
    DashboardMenuOption(
      id: 'new_sale',
      label: 'New Sale / New Bill',
      modes: ['retail', 'school'],
    ),
    DashboardMenuOption(id: 'printer', label: 'Printer & mPOS'),
    DashboardMenuOption(id: 'sales_records', label: 'Sales / Billing Records'),
    DashboardMenuOption(id: 'transaction_history', label: 'Transaction History'),
    DashboardMenuOption(id: 'calculator', label: 'Calculator'),
    DashboardMenuOption(id: 'cloud_metrics', label: 'Cloud Metrics'),
    DashboardMenuOption(id: 'finance_analytics', label: 'Finance Analytics'),
    DashboardMenuOption(id: 'reconciliation', label: 'Reconciliation'),
    DashboardMenuOption(id: 'multi_device', label: 'Multi Device'),
    DashboardMenuOption(id: 'student_analytics', label: 'Student Analytics', modes: ['school']),
    DashboardMenuOption(id: 'students', label: 'Students', modes: ['school']),
    DashboardMenuOption(id: 'parents', label: 'Parents', modes: ['school']),
    DashboardMenuOption(id: 'teachers', label: 'Teachers', modes: ['school']),
    DashboardMenuOption(id: 'finance_dashboard', label: 'Finance Dashboard', modes: ['school']),
    DashboardMenuOption(id: 'academic_setup', label: 'Academic Setup', modes: ['school']),
    DashboardMenuOption(id: 'fee_management', label: 'Fee Management', modes: ['school']),
    DashboardMenuOption(id: 'fees', label: 'Fees', modes: ['school']),
    DashboardMenuOption(id: 'subjects', label: 'Subjects', modes: ['school']),
    DashboardMenuOption(id: 'result_entry', label: 'Result Entry', modes: ['school']),
    DashboardMenuOption(id: 'lesson_notes', label: 'Lesson Notes', modes: ['school']),
    DashboardMenuOption(id: 'stock', label: 'Stock / Items', modes: ['retail']),
    DashboardMenuOption(id: 'inventory_report', label: 'Inventory Report', modes: ['retail']),
    DashboardMenuOption(id: 'customer_lookup', label: 'Customer Lookup', modes: ['retail']),
    DashboardMenuOption(id: 'services_dashboard', label: 'Services Dashboard', modes: ['services']),
    DashboardMenuOption(id: 'new_job', label: 'New Job', modes: ['services']),
    DashboardMenuOption(id: 'all_jobs', label: 'All Jobs', modes: ['services']),
    DashboardMenuOption(id: 'customers', label: 'Customers', modes: ['services']),
  ];

  static List<DashboardMenuOption> forMode(String mode) {
    final normalized = mode.toLowerCase().trim();
    return all.where((o) => o.modes.contains(normalized)).toList();
  }

  static bool isPinned(String id) => id == adminHubId;

  static bool isVisibleOnDashboard(String id, Iterable<String> hidden) {
    if (isPinned(id)) return true;
    return !hidden.contains(id);
  }
}
