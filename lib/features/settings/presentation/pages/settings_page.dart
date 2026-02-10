import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/utils/validators.dart';
import '../bloc/settings_bloc.dart';
import '../bloc/settings_state.dart';
import '../widgets/password_dialog.dart';
import '../widgets/super_admin_dialog.dart';

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
                _buildActivationBanner(context, isSuperAdmin),
                const SizedBox(height: 10),
                _buildSectionHeader('Organization Detail'),
                _buildTextTile(
                  context,
                  'Name',
                  settings.organizationName,
                  isSuperAdmin ? (val) => _update(context, settings.copyWith(organizationName: val)) : null,
                  validator: (val) => InputValidator.validateNotEmpty(val, 'Org Name'),
                ),
                _buildTextTile(
                  context,
                  'Address',
                  settings.address,
                  isSuperAdmin ? (val) => _update(context, settings.copyWith(address: val)) : null,
                  validator: (val) => InputValidator.validateNotEmpty(val, 'Address'),
                ),
                _buildTextTile(
                  context,
                  'Phone',
                  settings.phone,
                  isSuperAdmin ? (val) => _update(context, settings.copyWith(phone: val)) : null,
                  validator: (val) => InputValidator.validatePhone(val),
                ),
                _buildTextTile(
                  context,
                  'Tax ID (VAT/GST)',
                  settings.taxId ?? 'Not Set',
                  isSuperAdmin ? (val) => _update(context, settings.copyWith(taxId: val)) : null,
                ),
                const Divider(),
                _buildSectionHeader('Preferences'),
                _buildSwitchTile('Enable Tax (15%)', settings.taxEnabled, (val) => _update(context, settings.copyWith(taxEnabled: val))),
                _buildSwitchTile('Enable Discounts', settings.discountEnabled, (val) => _update(context, settings.copyWith(discountEnabled: val))),
                _buildSwitchTile('Allow Price Updates', settings.allowPriceUpdates, (val) => _update(context, settings.copyWith(allowPriceUpdates: val))),
                _buildDropdownTile(context, 'Currency', settings.currency, ['USD', 'EUR', 'GBP', 'KES'], (val) => _update(context, settings.copyWith(currency: val))),
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
            child: const Text('ENTER PASSWORD'),
          ),
        ],
      ),
    );
  }

  Widget _buildActivationBanner(BuildContext context, bool isAuthorized) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isAuthorized ? Colors.green[100] : Colors.orange[100],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(
            isAuthorized ? Icons.verified : Icons.warning_amber_rounded,
            color: isAuthorized ? Colors.green : Colors.orange,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isAuthorized ? 'Device Fully Authorized' : 'Trial / Limited Mode',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: isAuthorized ? Colors.green[900] : Colors.orange[900],
                  ),
                ),
                Text(
                  isAuthorized 
                      ? 'Lifetime service active on this device.' 
                      : 'Please authorize device for lifetime service.',
                  style: const TextStyle(fontSize: 12),
                ),
              ],
            ),
          ),
          if (!isAuthorized)
            ElevatedButton(
              onPressed: () => showDialog(
                context: context,
                builder: (_) => SuperAdminDialog(bloc: context.read<SettingsBloc>()),
              ),
              child: const Text('ACTIVATE'),
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
}
