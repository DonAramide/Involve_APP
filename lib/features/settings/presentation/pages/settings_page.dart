import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'dart:typed_data';
import 'package:image_picker/image_picker.dart'; // For logo picking
import '../../../../core/utils/validators.dart';
import '../bloc/settings_bloc.dart';
import '../bloc/settings_state.dart';
import '../widgets/password_dialog.dart';
import '../widgets/super_admin_dialog.dart';
import '../widgets/super_admin_password_dialog.dart';
import '../../../../core/license/license_service.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:intl/intl.dart';
import '../../domain/entities/settings.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('System Settings')),
      body: BlocListener<SettingsBloc, SettingsState>(
        listener: (context, state) {
          if (state.error != null) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.error!), backgroundColor: Colors.red));
          }
          if (state.successMessage != null) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.successMessage!), backgroundColor: Colors.green));
          }
        },
        child: BlocBuilder<SettingsBloc, SettingsState>(
          builder: (context, state) {
            if (state.isLoading) return const Center(child: CircularProgressIndicator());
            if (!state.isAuthorized) return _buildAuthRequired(context);

            final settings = state.settings!;
            final isSuperAdmin = state.isDeviceAuthorized;

            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildActivationBanner(context, state),
                const SizedBox(height: 10),
                _buildActivationHistoryTile(context),
                const SizedBox(height: 10),
                _buildSectionHeader('Branding'),
                _buildReadOnlyLogoTile(context, settings),
                const SizedBox(height: 10),
                _buildSectionHeader('Organization Detail'),
                state.isBusinessLocked 
                  ? _buildReadOnlyTile('Name', settings.organizationName, Icons.business)
                  : _buildTextTile(context, 'Name', settings.organizationName, (val) => _update(context, settings.copyWith(organizationName: val))),
                _buildTextTile(context, 'Address', settings.address, (val) => _update(context, settings.copyWith(address: val))),
                _buildTextTile(context, 'Phone', settings.phone, (val) => _update(context, settings.copyWith(phone: val))),
                _buildTextTile(context, 'Description', settings.businessDescription ?? '', (val) => _update(context, settings.copyWith(businessDescription: val))),
                _buildTextTile(context, 'Tax ID (VAT/GST)', settings.taxId ?? '', (val) => _update(context, settings.copyWith(taxId: val))),
                const Divider(),
                _buildSectionHeader('Preferences'),
                _buildSwitchTile('Enable Tax', settings.taxEnabled, (val) => _update(context, settings.copyWith(taxEnabled: val))),
                if (settings.taxEnabled)
                  _buildTextTile(
                    context, 
                    'Tax Rate (%)', 
                    (settings.taxRate * 100).toStringAsFixed(0), 
                    (val) {
                      final rate = double.tryParse(val);
                      if (rate != null) {
                        _update(context, settings.copyWith(taxRate: rate / 100));
                      }
                    },
                    validator: (val) {
                      final n = double.tryParse(val ?? '');
                      if (n == null || n < 0 || n > 100) return 'Enter 0-100';
                      return null;
                    },
                  ),
                _buildSwitchTile('Enable Discounts', settings.discountEnabled, (val) => _update(context, settings.copyWith(discountEnabled: val))),
                _buildSwitchTile('Allow Price Updates', settings.allowPriceUpdates, (val) => _update(context, settings.copyWith(allowPriceUpdates: val))),
                _buildSwitchTile('Confirm Item Price on Selection', settings.confirmPriceOnSelection, (val) => _update(context, settings.copyWith(confirmPriceOnSelection: val))),
                _buildSwitchTile('Enable Payment Methods (Cash/POS/Transfer)', settings.paymentMethodsEnabled, (val) => _update(context, settings.copyWith(paymentMethodsEnabled: val))),
                _buildDropdownTile(
                  context, 
                  'Currency', 
                  ['₦', '\$', '€', '£', 'KSh'].contains(settings.currency) ? settings.currency : '₦', 
                  ['₦', '\$', '€', '£', 'KSh'], 
                  (val) => _update(context, settings.copyWith(currency: val)),
                ),
                _buildDropdownTile(
                  context, 
                  'Invoice Template', 
                  settings.defaultInvoiceTemplate, 
                  ['compact', 'detailed', 'minimalist', 'professional', 'modern', 'classic'], 
                  (val) => _update(context, settings.copyWith(defaultInvoiceTemplate: val)),
                ),
                _buildDropdownTile(context, 'Theme', settings.themeMode, ['system', 'light', 'dark'], (val) => _update(context, settings.copyWith(themeMode: val))),
                _buildThemeColorSection(context, settings),
                _buildTextTile(context, 'Receipt Footer', settings.receiptFooter, (val) => _update(context, settings.copyWith(receiptFooter: val))),
                const Divider(),
                _buildSectionHeader('Account Details'),
                _buildSwitchTile('Show Account Details on Invoice', settings.showAccountDetails, (val) => _update(context, settings.copyWith(showAccountDetails: val))),
                _buildSwitchTile('Show Signature Space on Receipt', settings.showSignatureSpace, (val) => _update(context, settings.copyWith(showSignatureSpace: val))),
                if (settings.showAccountDetails) ...[
                  _buildTextTile(context, 'Bank Name', settings.bankName ?? '', (val) => _update(context, settings.copyWith(bankName: val))),
                  _buildTextTile(context, 'Account Number', settings.accountNumber ?? '', (val) => _update(context, settings.copyWith(accountNumber: val))),
                  _buildTextTile(context, 'Account Name', settings.accountName ?? '', (val) => _update(context, settings.copyWith(accountName: val))),
                ],
                const Divider(),
                _buildSectionHeader('Maintenance'),
                ListTile(
                  title: const Text('Local Backup'),
                  subtitle: const Text('Export database to storage'),
                  trailing: state.isExporting ? const CircularProgressIndicator() : const Icon(Icons.backup),
                  onTap: () => context.read<SettingsBloc>().add(CreateBackup()),
                ),
                ListTile(
                  title: const Text('Restore Backup'),
                  subtitle: const Text('Import database file (Requires path)'),
                  trailing: state.isImporting ? const CircularProgressIndicator() : const Icon(Icons.restore),
                  onTap: () => _showRestoreDialog(context),
                ),
                const Divider(),
                _buildSectionHeader('Security'),
              ListTile(
                title: const Text('Change System Password'),
                trailing: const Icon(Icons.lock_outline),
                onTap: () => _showChangePassword(context),
              ),
            ],
          );
        },
      ),
    ),
  );
}

  Widget _buildAuthRequired(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.lock_person, size: 80, color: Colors.blueGrey),
          const SizedBox(height: 20),
          const Text('Settings are Protected', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          ElevatedButton(
            onPressed: () => showDialog(context: context, builder: (_) => PasswordDialog(bloc: context.read<SettingsBloc>())),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blueGrey,
              foregroundColor: Colors.white,
            ),
            child: const Text('ENTER PASSWORD'),
          ),
        ],
      ),
    );
  }

  Widget _buildActivationBanner(BuildContext context, SettingsState state) {
    final isLocked = state.isBusinessLocked;
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isLocked ? Colors.blue[50] : Colors.orange[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isLocked ? Colors.blue[200]! : Colors.orange[200]!),
      ),
      child: Row(
        children: [
          Icon(
            isLocked ? Icons.verified_user : Icons.info_outline,
            color: isLocked ? Colors.blue : Colors.orange,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isLocked ? 'Identity Verified' : 'Initial Setup',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: isLocked ? Colors.blue[900] : Colors.orange[900],
                  ),
                ),
                Text(
                  isLocked 
                      ? 'Business name is permanently locked for security.' 
                      : 'You can edit your business name once. It will be locked after saving.',
                  style: const TextStyle(fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Text(title, style: const TextStyle(fontSize: 14, color: Colors.blue, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildTextTile(BuildContext context, String label, String value, Function(String)? onSave, {String? Function(String?)? validator}) {
    return ListTile(
      title: Text(label),
      subtitle: Text(value),
      trailing: onSave == null ? const Icon(Icons.lock, color: Colors.grey, size: 16) : const Icon(Icons.edit),
      onTap: onSave == null ? null : () async {
        final newVal = await _showEditDialog(context, label, value, validator);
        if (newVal != null) onSave(newVal);
      },
    );
  }

  Widget _buildSwitchTile(String label, bool value, Function(bool) onChanged) {
    return SwitchListTile(title: Text(label), value: value, onChanged: onChanged);
  }

  Widget _buildDropdownTile(BuildContext context, String label, String value, List<String> options, Function(String) onChanged) {
    return ListTile(
      title: Text(label),
      trailing: DropdownButton<String>(
        value: value,
        items: options.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
        onChanged: (val) => onChanged(val!),
      ),
    );
  }

  void _showRestoreDialog(BuildContext context) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Restore Database'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('WARNING: This will overwrite your current data with the selected backup file.', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            TextField(controller: controller, decoration: const InputDecoration(labelText: 'Full Path to Backup File')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          TextButton(
            onPressed: () {
              if (controller.text.isNotEmpty) {
                context.read<SettingsBloc>().add(RestoreFromPath(controller.text));
              }
              Navigator.pop(ctx);
            },
            child: const Text('RESTORE', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _update(BuildContext context, dynamic settings) {
    context.read<SettingsBloc>().add(UpdateAppSettings(settings));
  }

  Future<String?> _showEditDialog(BuildContext context, String label, String value, String? Function(String?)? validator) {
    final controller = TextEditingController(text: value);
    final formKey = GlobalKey<FormState>();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Edit $label'),
        content: Form(
          key: formKey,
          child: TextFormField(
            controller: controller,
            decoration: InputDecoration(labelText: label),
            validator: validator,
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          TextButton(
            onPressed: () {
              if (formKey.currentState!.validate()) {
                Navigator.pop(ctx, controller.text);
              }
            },
            child: const Text('SAVE'),
          ),
        ],
      ),
    );
  }

  void _showChangePassword(BuildContext context) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Set New Password'),
        content: TextField(controller: controller, obscureText: true, decoration: const InputDecoration(labelText: 'New Password')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          TextButton(onPressed: () {
            context.read<SettingsBloc>().add(SetSystemPassword(controller.text));
            Navigator.pop(ctx);
          }, child: const Text('SET')),
        ],
      ),
    );
  }

  Widget _buildProtectedTextTile(
    BuildContext context,
    String label,
    String value,
    Function(String) onSave, {
    String? Function(String?)? validator,
  }) {
    return ListTile(
      title: Text(label),
      subtitle: Text(value),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: const [
          Icon(Icons.admin_panel_settings, color: Colors.deepPurple, size: 16),
          SizedBox(width: 4),
          Icon(Icons.edit),
        ],
      ),
      onTap: () async {
        // Show super admin password dialog first
        final settingsBloc = context.read<SettingsBloc>();
        
        // Reset authorization state to ensure dialog works correctly
        settingsBloc.add(ResetSuperAdminAuth());
        
        final authorized = await showDialog<bool>(
          context: context,
          barrierDismissible: false,
          builder: (dialogContext) => SuperAdminPasswordDialog(bloc: settingsBloc),
        );

        if (authorized == true) {
          // Reset super admin authorization after use
          // settingsBloc.add(UpdateAppSettings(settingsBloc.state.settings!)); // Not needed for auth reset
          
          // Show edit dialog
          final newVal = await _showEditDialog(context, label, value, validator);
          if (newVal != null) {
            onSave(newVal);
          }
        }
      },
    );
  }

  Widget _buildReadOnlyTile(String label, String value, IconData icon) {
    return ListTile(
      leading: Icon(icon, color: Colors.grey),
      title: Text(label, style: const TextStyle(fontSize: 14, color: Colors.grey)),
      subtitle: Text(
        value,
        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: Colors.black87),
      ),
    );
  }

  Widget _buildReadOnlyLogoTile(BuildContext context, AppSettings settings) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: InkWell(
        onTap: () => _pickLogo(context, settings),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              if (settings.logo != null)
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.memory(settings.logo!, width: 60, height: 60, fit: BoxFit.cover),
                )
              else
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.add_a_photo, size: 30, color: Colors.grey),
                ),
              const SizedBox(width: 16),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Company Logo',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                    ),
                    Text(
                      'Tap to change logo',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.edit, size: 20, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickLogo(BuildContext context, AppSettings settings) async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery);
    if (image != null) {
      final bytes = await image.readAsBytes();
      _update(context, settings.copyWith(logo: bytes));
    }
  }

  Widget _buildActivationHistoryTile(BuildContext context) {
    return ListTile(
      title: const Text('Activation History'),
      subtitle: const Text('View previously activated licenses on this device'),
      leading: const Icon(Icons.history_edu, color: Colors.blue),
      trailing: const Icon(Icons.chevron_right),
      onTap: () => _showActivationHistoryDialog(context),
    );
  }

  void _showActivationHistoryDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: const [
            Icon(Icons.history, color: Colors.blue),
            SizedBox(width: 8),
            Text('Subscription History'),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: FutureBuilder<List<LicenseHistoryData>>(
            future: LicenseService.getActivationHistory(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const SizedBox(height: 100, child: Center(child: CircularProgressIndicator()));
              }
              if (!snapshot.hasData || snapshot.data!.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Text('No activation history found.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
                );
              }

              return ListView.separated(
                shrinkWrap: true,
                itemCount: snapshot.data!.length,
                separatorBuilder: (_, __) => const Divider(),
                itemBuilder: (context, index) {
                  final item = snapshot.data![index];
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(item.businessName, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Plan: ${item.plan.toUpperCase()}'),
                        Text('Expires: ${DateFormat('MMM dd, yyyy').format(item.expiryDate)}'),
                        Text('Activated: ${DateFormat('MMM dd, HH:mm').format(item.createdAt)}', style: const TextStyle(fontSize: 11)),
                      ],
                    ),
                    isThreeLine: true,
                  );
                },
              );
            },
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CLOSE')),
        ],
      ),
    );
  Widget _buildThemeColorSection(BuildContext context, AppSettings settings) {
    final themeColors = [
      Colors.blue,
      Colors.indigo,
      Colors.teal,
      Colors.green,
      Colors.orange,
      Colors.deepPurple,
      Colors.pink,
      Colors.red,
      Colors.blueGrey,
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Theme Color', style: TextStyle(fontSize: 16)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: themeColors.map((color) {
              final isSelected = settings.primaryColor == color.value;
              return InkWell(
                onTap: () => _update(context, settings.copyWith(primaryColor: color.value)),
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isSelected ? Colors.white : Colors.transparent,
                      width: 2,
                    ),
                    boxShadow: [
                      if (isSelected)
                        BoxShadow(
                          color: color.withOpacity(0.4),
                          blurRadius: 8,
                          spreadRadius: 2,
                        ),
                    ],
                  ),
                  child: isSelected 
                      ? const Icon(Icons.check, color: Colors.white, size: 20) 
                      : null,
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
