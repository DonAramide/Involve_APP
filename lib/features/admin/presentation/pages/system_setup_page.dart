// lib/features/admin/presentation/pages/system_setup_page.dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'dart:typed_data';
import 'package:image_picker/image_picker.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:intl/intl.dart';
import '../../../../core/utils/logo_processor.dart';
import '../../../settings/presentation/bloc/settings_bloc.dart';
import '../../../settings/presentation/bloc/settings_state.dart';
import '../../../settings/presentation/bloc/staff_bloc.dart';
import '../../../settings/presentation/bloc/staff_state.dart';
import '../../../settings/domain/entities/settings.dart';
import '../../../settings/domain/entities/staff.dart';
import '../../../settings/presentation/widgets/upgrade_dialog.dart';
import '../../../settings/presentation/widgets/super_admin_password_dialog.dart';
import 'package:flutter_colorpicker/flutter_colorpicker.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

class SystemSetupPage extends StatefulWidget {
  const SystemSetupPage({super.key});

  @override
  State<SystemSetupPage> createState() => _SystemSetupPageState();
}

class _SystemSetupPageState extends State<SystemSetupPage> {
  bool _isLoadingDialogShowing = false;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<SettingsBloc, SettingsState>(
      builder: (context, state) {
        if (state.isLoading || state.settings == null) {
          return const Scaffold(body: InvifyLoadingIndicator(message: 'FETCHING SYSTEM SETUP PARAMETERS...'));
        }

        final settings = state.settings!;
        
        return Scaffold(
          appBar: AppBar(
            title: const Text('System Setup'),
          ),
          body: BlocListener<SettingsBloc, SettingsState>(
            listener: (context, state) {
              if (state.error != null) {
                _hideLoadingDialog(context);
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.error!), backgroundColor: Colors.red));
              }
              if (state.successMessage != null) {
                _hideLoadingDialog(context);
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.successMessage!), backgroundColor: Colors.green));
              }
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // 1. Branding
                _buildSectionHeader(context, 'Branding'),
                _buildReadOnlyLogoTile(context, settings),
                _buildSwitchTile('Print Company Logo on Receipt', settings.showLogo, (val) => _update(context, settings.copyWith(showLogo: val))),
                const Divider(),

                // 2. Organization Detail
                _buildSectionHeader(context, 'Organization Detail'),
                state.isBusinessLocked 
                  ? _buildReadOnlyTile('Name', settings.organizationName, Icons.business)
                  : _buildTextTile(context, 'Name', settings.organizationName, (val) => _update(context, settings.copyWith(organizationName: val))),
                _buildTextTile(context, 'Address', settings.address, (val) => _update(context, settings.copyWith(address: val))),
                _buildTextTile(context, 'Phone', settings.phone, (val) => _update(context, settings.copyWith(phone: val))),
                _buildTextTile(context, 'CAC Number', settings.cacNumber ?? '', (val) => _update(context, settings.copyWith(cacNumber: val))),
                _buildSwitchTile('Print CAC Number on Receipt', settings.showCacNumber, (val) => _update(context, settings.copyWith(showCacNumber: val))),
                _buildTextTile(context, 'Description', settings.businessDescription ?? '', (val) => _update(context, settings.copyWith(businessDescription: val))),
                _buildTextTile(context, 'Tax ID (VAT/GST)', settings.taxId ?? '', (val) => _update(context, settings.copyWith(taxId: val))),
                const Divider(),

                // 3. Preferences
                _buildSectionHeader(context, 'Preferences'),
                _buildSwitchTile('Enable Tax', settings.taxEnabled, (val) => _update(context, settings.copyWith(taxEnabled: val))),
                if (settings.taxEnabled)
                  _buildTextTile(
                    context, 
                    'Tax Rate (%)', 
                    (settings.taxRate * 100).toStringAsFixed(0), 
                    (val) {
                      final rate = double.tryParse(val);
                      if (rate != null) _update(context, settings.copyWith(taxRate: rate / 100));
                    },
                  ),
                _buildSwitchTile('Enable Discounts', settings.discountEnabled, (val) => _update(context, settings.copyWith(discountEnabled: val))),
                _buildSwitchTile(
                  settings.businessMode == 'school' ? 'Confirm Fees on Selection' : 'Confirm Item Price on Selection', 
                  settings.confirmPriceOnSelection, (val) => _update(context, settings.copyWith(confirmPriceOnSelection: val))
                ),
                _buildSwitchTile('Enable Payment Methods (Cash/POS/Transfer)', settings.paymentMethodsEnabled, (val) => _update(context, settings.copyWith(paymentMethodsEnabled: val))),
                if (settings.businessMode != 'school') ...[
                  _buildSwitchTile(
                    'Enable Custom Receipt Pricing', 
                    settings.customReceiptPricingEnabled, 
                    (val) => _update(context, settings.copyWith(customReceiptPricingEnabled: val)),
                    isPro: state.userPlan?.isBasic == true,
                  ),
                  _buildSwitchTile(
                    'Enable Warranty Support on Invoices', 
                    settings.warrantyEnabled, 
                    (val) => _update(context, settings.copyWith(warrantyEnabled: val)),
                  ),
                  _buildSwitchTile(
                    'Enable Stock Return & Replace', 
                    settings.stockReturnEnabled, 
                    (val) => _update(context, settings.copyWith(stockReturnEnabled: val)),
                  ),
                ],
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
                  [
                    'compact', 'detailed', 'minimalist', 'professional', 'modern', 'classic',
                    if (settings.businessMode == 'school') ...['school_teal', 'school_color', 'school_academic', 'school_traditional']
                  ], 
                  (val) => _update(context, settings.copyWith(defaultInvoiceTemplate: val)),
                ),
                _buildDropdownTile(context, 'Theme', settings.themeMode, ['system', 'light', 'dark'], (val) => _update(context, settings.copyWith(themeMode: val))),
                _buildThemeColorSection(context, settings),
                _buildTextTile(context, 'Receipt Footer', settings.receiptFooter, (val) => _update(context, settings.copyWith(receiptFooter: val))),
                _buildDropdownTile(
                  context, 
                  'Thermal Paper Width', 
                  '${settings.paperWidth}mm', 
                  ['58mm', '80mm', '88mm'], 
                  (val) => _update(context, settings.copyWith(paperWidth: int.parse(val.replaceAll('mm', '')))),
                ),
                const Divider(),

                // 4. Account Details
                _buildSectionHeader(context, 'Account Details'),
                _buildSwitchTile('Show Account Details on Invoice', settings.showAccountDetails, (val) => _update(context, settings.copyWith(showAccountDetails: val))),
                _buildSwitchTile('Show Signature Space on Receipt', settings.showSignatureSpace, (val) => _update(context, settings.copyWith(showSignatureSpace: val))),
                if (settings.showAccountDetails) ...[
                  _buildTextTile(context, 'Bank Name', settings.bankName ?? '', (val) => _update(context, settings.copyWith(bankName: val))),
                  _buildTextTile(context, 'Account Number', settings.accountNumber ?? '', (val) => _update(context, settings.copyWith(accountNumber: val))),
                  _buildTextTile(context, 'Account Name', settings.accountName ?? '', (val) => _update(context, settings.copyWith(accountName: val))),
                ],
                const Divider(),

                // 5. Admin Signature
                _buildSectionHeader(context, 'Admin Signature'),
                _buildSignatureSection(context, settings),
                _buildSwitchTile(
                  'Show Admin Signature on Invoices', 
                  settings.showAdminSignature, 
                  (val) => _update(context, settings.copyWith(showAdminSignature: val)),
                  isPro: state.userPlan?.isBasic == true,
                ),
                const Divider(),

                // 6. Staff Management
                _buildSectionHeader(context, 'Staff Management'),
                _buildStaffManagementSection(context, settings),
                const Divider(),

                // 7. Graph Visibility
                _buildSectionHeader(context, 'Graph Visibility (Admin)'),
                _buildSwitchTile(
                  settings.businessMode == 'school' ? 'Show Total Revenue Card' : 'Show Total Sales Card', 
                  settings.showTotalSalesCard, (val) => _update(context, settings.copyWith(showTotalSalesCard: val))
                ),
                _buildSwitchTile(
                  settings.businessMode == 'school' ? 'Show Revenue Trend' : 'Show Sales Trend', 
                  settings.showSalesTrendChart, (val) => _update(context, settings.copyWith(showSalesTrendChart: val))
                ),
                _buildSwitchTile('Show Expense Pie Chart', settings.showExpensePieChart, (val) => _update(context, settings.copyWith(showExpensePieChart: val))),
                _buildSwitchTile('Show Top Selling Bar Chart', settings.showTopSellingChart, (val) => _update(context, settings.copyWith(showTopSellingChart: val))),
                _buildSwitchTile('Show Stock Value Pie Chart', settings.showStockValueChart, (val) => _update(context, settings.copyWith(showStockValueChart: val))),
                const Divider(),

                // 8. Security
                _buildSectionHeader(context, 'Security'),
                ListTile(
                  title: const Text('Change System Password'),
                  trailing: const Icon(Icons.lock_outline),
                  onTap: () => _showChangePassword(context),
                ),
                const SizedBox(height: 100),
              ],
            ),
          ),
        );
      },
    );
  }

  // ── Helper Methods (Copied from SettingsPage) ──────────────────────────────

  void _update(BuildContext context, AppSettings settings) {
    context.read<SettingsBloc>().add(UpdateAppSettings(settings));
  }

  Widget _buildSectionHeader(BuildContext context, String title, {bool isPro = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Text(title, style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.bold)),
          if (isPro) ...[
            const SizedBox(width: 8),
            _buildProBadge(),
          ],
        ],
      ),
    );
  }

  Widget _buildProBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.amber[100],
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: Colors.amber[700]!, width: 0.5),
      ),
      child: Text(
        'PRO',
        style: TextStyle(color: Colors.amber[900], fontSize: 8, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildTextTile(BuildContext context, String label, String value, Function(String)? onSave) {
    return ListTile(
      title: Text(label),
      subtitle: Text(value),
      trailing: onSave == null ? const Icon(Icons.lock, color: Colors.grey, size: 16) : const Icon(Icons.edit),
      onTap: onSave == null ? null : () async {
        final newVal = await _showEditDialog(context, label, value);
        if (newVal != null) onSave(newVal);
      },
    );
  }

  Widget _buildReadOnlyTile(String label, String value, IconData icon) {
    return ListTile(
      leading: Icon(icon, color: Colors.grey),
      title: Text(label, style: const TextStyle(fontSize: 14, color: Colors.grey)),
      subtitle: Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
    );
  }

  Widget _buildSwitchTile(String label, bool value, Function(bool) onChanged, {bool isPro = false}) {
    return SwitchListTile(
      title: Row(
        children: [
          Flexible(child: Text(label)),
          if (isPro) ...[const SizedBox(width: 8), _buildProBadge()],
        ],
      ),
      value: value,
      onChanged: (val) {
        if (isPro && val) {
           ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pro feature')));
           return;
        }
        onChanged(val);
      },
    );
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

  Future<String?> _showEditDialog(BuildContext context, String label, String value) {
    final controller = TextEditingController(text: value);
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Edit $label'),
        content: TextField(controller: controller, decoration: InputDecoration(labelText: label)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          TextButton(onPressed: () => Navigator.pop(ctx, controller.text), child: const Text('SAVE')),
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
                ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.memory(settings.logo!, width: 60, height: 60, fit: BoxFit.cover))
              else
                Container(width: 60, height: 60, decoration: BoxDecoration(color: Colors.grey[200], borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.add_a_photo, size: 30, color: Colors.grey)),
              const SizedBox(width: 16),
              const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Company Logo', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500)), Text('Tap to change logo', style: TextStyle(fontSize: 12, color: Colors.grey))])),
              const Icon(Icons.edit, size: 20, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickLogo(BuildContext context, AppSettings settings) async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery, maxWidth: 1024, maxHeight: 1024);
    if (image != null) {
      final croppedFile = await ImageCropper().cropImage(
        sourcePath: image.path,
        aspectRatio: const CropAspectRatio(ratioX: 1, ratioY: 1),
      );
      if (croppedFile != null) {
        _showLoadingDialog(context, 'Removing background...');
        final bytes = await croppedFile.readAsBytes();
        final processedPng = await compute(LogoProcessor.processLogoWithTransparency, bytes);
        _hideLoadingDialog(context);
        _update(context, settings.copyWith(logo: processedPng ?? bytes));
      }
    }
  }

  void _showLoadingDialog(BuildContext context, String message) {
    _isLoadingDialogShowing = true;
    showDialog(context: context, barrierDismissible: false, builder: (ctx) => AlertDialog(content: Row(children: [const Icon(Icons.sync, color: Colors.blue), const SizedBox(width: 20), Text(message)]))).then((_) => _isLoadingDialogShowing = false);
  }

  void _hideLoadingDialog(BuildContext context) {
    if (_isLoadingDialogShowing) Navigator.of(context).pop();
  }

  Widget _buildSignatureSection(BuildContext context, AppSettings settings) {
    return Column(
      children: [
        Center(
          child: InkWell(
            onTap: () => _pickSignature(context, settings),
            child: Container(
              width: 200, height: 100,
              decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey[300]!)),
              child: settings.adminSignature != null ? Image.memory(settings.adminSignature!, fit: BoxFit.contain) : const Icon(Icons.edit_note, size: 40, color: Colors.grey),
            ),
          ),
        ),
        if (settings.adminSignature != null)
          TextButton(onPressed: () => _update(context, settings.copyWith(adminSignature: null)), child: const Text('Remove Signature', style: TextStyle(color: Colors.red))),
      ],
    );
  }

  Future<void> _pickSignature(BuildContext context, AppSettings settings) async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery, maxWidth: 1024, maxHeight: 1024);
    if (image != null) {
      final croppedFile = await ImageCropper().cropImage(sourcePath: image.path, aspectRatio: const CropAspectRatio(ratioX: 2, ratioY: 1));
      if (croppedFile != null) {
        final bytes = await croppedFile.readAsBytes();
        _update(context, settings.copyWith(adminSignature: bytes));
      }
    }
  }

  Widget _buildStaffManagementSection(BuildContext context, AppSettings settings) {
    return Column(
      children: [
        _buildSwitchTile(
          'Enable Staff Tracking (Sold By)', 
          settings.staffManagementEnabled, 
          (val) => _update(context, settings.copyWith(staffManagementEnabled: val)),
        ),
        if (settings.staffManagementEnabled)
          BlocBuilder<StaffBloc, StaffState>(
            builder: (context, state) {
              if (state.isLoading) return const InvifyLoadingIndicator(message: 'FETCHING STAFF CONFIGURATION...');
              
              final userPlan = context.read<SettingsBloc>().state.userPlan;
              // Force Basic Plan tier evaluation for testing/demonstration purposes
              final isBasicPlan = true;
              final canAddStaff = !isBasicPlan || state.staffList.length < 2;

              return Column(
                children: [
                  ...state.staffList.map((staff) => ListTile(
                    leading: const CircleAvatar(child: Icon(Icons.person)),
                    title: Text(staff.name),
                    subtitle: Text('ID: ${staff.staffId ?? "None"} | Code: ****'),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit),
                          onPressed: () => _showStaffDialog(context, staff: staff),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete, color: Colors.red),
                          onPressed: () => context.read<StaffBloc>().add(DeleteStaff(staff.id!)),
                        ),
                      ],
                    ),
                  )),
                  ListTile(
                    leading: Icon(canAddStaff ? Icons.add : Icons.lock, color: canAddStaff ? Colors.blue : Colors.orange),
                    title: Text(
                      canAddStaff ? 'Add Staff' : 'Add Staff (Max 2 reached on Basic Plan)', 
                      style: TextStyle(color: canAddStaff ? Colors.blue : Colors.orange, fontWeight: FontWeight.bold),
                    ),
                    trailing: canAddStaff ? null : _buildProBadge(),
                    onTap: () {
                      if (canAddStaff) {
                        _showStaffDialog(context);
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Basic Plan supports a maximum of 2 staff accounts. Please upgrade to add more.'),
                            backgroundColor: Colors.orange,
                          ),
                        );
                        showDialog(context: context, builder: (_) => const UpgradeDialog());
                      }
                    },
                  ),
                ],
              );
            },
          ),
      ],
    );
  }

  void _showStaffDialog(BuildContext context, {Staff? staff}) {
    final nameController = TextEditingController(text: staff?.name);
    final existingCode = staff?.staffCode;
    final isCodeHashed = existingCode != null && existingCode.length > 4;
    final pin = isCodeHashed ? '' : existingCode;
    final codeController = TextEditingController(text: pin);
    final staffIdController = TextEditingController(text: staff?.staffId);
    final phoneController = TextEditingController(text: staff?.phone);
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(staff == null ? 'Add Staff' : 'Edit Staff'),
        content: Form(
          key: formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: nameController,
                  decoration: const InputDecoration(labelText: 'Staff Name'),
                  validator: (val) => val == null || val.isEmpty ? 'Required' : null,
                ),
                TextFormField(
                  controller: staffIdController,
                  decoration: const InputDecoration(
                    labelText: 'Staff ID (Optional)',
                    hintText: 'e.g., MGT-01',
                  ),
                  maxLength: 20,
                  textCapitalization: TextCapitalization.characters,
                ),
                TextFormField(
                  controller: codeController,
                  decoration: InputDecoration(
                    labelText: 'Auth Code (4 digits)',
                    hintText: isCodeHashed ? 'Leave blank to keep current' : 'Enter 4-digit code',
                  ),
                  keyboardType: TextInputType.number,
                  maxLength: 4,
                  validator: (val) {
                    if (staff != null && (val == null || val.isEmpty)) return null;
                    return (val?.length != 4) ? 'Must be 4 digits' : null;
                  },
                ),
                TextFormField(
                  controller: phoneController,
                  decoration: const InputDecoration(labelText: 'Phone Number'),
                  keyboardType: TextInputType.phone,
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          ElevatedButton(
            onPressed: () {
              if (formKey.currentState!.validate()) {
                final pin = codeController.text.trim();
                final newStaff = Staff(
                  id: staff?.id,
                  name: nameController.text.trim(),
                  staffId: staffIdController.text.trim().isEmpty ? null : staffIdController.text.trim(),
                  staffCode: pin.isEmpty && staff != null ? staff.staffCode : pin,
                  phone: phoneController.text.trim(),
                );
                if (staff == null) {
                  context.read<StaffBloc>().add(AddStaff(newStaff));
                } else {
                  context.read<StaffBloc>().add(UpdateStaff(newStaff));
                }
                Navigator.pop(ctx);
              }
            },
            child: const Text('SAVE'),
          ),
        ],
      ),
    );
  }

  Widget _buildThemeColorSection(BuildContext context, AppSettings settings) {
    return ListTile(
      title: const Text('Theme Color'),
      trailing: CircleAvatar(backgroundColor: Color(settings.primaryColor)),
      onTap: () => _showColorPickerDialog(context, settings),
    );
  }

  void _showColorPickerDialog(BuildContext context, AppSettings settings) {
    Color pickerColor = Color(settings.primaryColor);
    showDialog(context: context, builder: (ctx) => AlertDialog(title: const Text('Pick a color'), content: SingleChildScrollView(child: ColorPicker(pickerColor: pickerColor, onColorChanged: (color) => pickerColor = color)), actions: [ElevatedButton(child: const Text('SELECT'), onPressed: () { _update(context, settings.copyWith(primaryColor: pickerColor.value)); Navigator.of(ctx).pop(); })]));
  }
}
