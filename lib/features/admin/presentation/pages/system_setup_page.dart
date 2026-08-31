import 'dart:async';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';
import 'package:image_cropper/image_cropper.dart';
import '../../../../core/utils/logo_processor.dart';
import '../../../settings/presentation/bloc/settings_bloc.dart';
import '../../../settings/presentation/bloc/settings_state.dart';
import '../../../settings/presentation/bloc/staff_bloc.dart';
import '../../../settings/presentation/bloc/staff_state.dart';
import '../../../settings/domain/entities/settings.dart';
import '../../../settings/domain/entities/staff.dart';
import '../../../settings/presentation/widgets/upgrade_dialog.dart';
import 'package:flutter_colorpicker/flutter_colorpicker.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';
import 'package:signature/signature.dart';
import 'two_factor_auth_page.dart';
import 'package:involve_app/features/school_finance/domain/repositories/finance_repository_new.dart';
import 'package:involve_app/core/widgets/va_credentials_required_dialog.dart';
import 'package:involve_app/core/utils/nigerian_banks.dart';

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
                _buildSwitchTile('Merge POS Receipt into Invoice', settings.mergePosReceipt, (val) => _update(context, settings.copyWith(mergePosReceipt: val))),
                _buildSwitchTile('Enable Tenant Receipt Copy', settings.enableTenantReceiptCopy, (val) => _update(context, settings.copyWith(enableTenantReceiptCopy: val))),
                _buildSwitchTile('Allow Give Change', settings.allowGiveChange, (val) => _update(context, settings.copyWith(allowGiveChange: val))),
                const Divider(),

                // 4. Account Details
                _buildSectionHeader(context, 'Account Details'),
                _buildSwitchTile('Always Show Account Details on Receipt', settings.showAccountDetails, (val) => _update(context, settings.copyWith(showAccountDetails: val))),
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
                ListTile(
                  title: const Text('2FA Settings (Google Authenticator)'),
                  trailing: const Icon(Icons.security),
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TwoFactorAuthPage())),
                ),
                const Divider(),

                // 9. Data Management
                _buildSectionHeader(context, 'Data Management'),
                ListTile(
                  title: const Text('Restore Backup'),
                  subtitle: const Text('Import database from a file'),
                  trailing: state.isImporting ? const Text('Restoring...', style: TextStyle(fontSize: 12, color: Colors.orange, fontWeight: FontWeight.bold)) : const Icon(Icons.restore),
                  onTap: () => _handleRestore(context),
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
    final passwordController = TextEditingController();
    final confirmController = TextEditingController();
    bool obscurePassword = true;
    bool obscureConfirm = true;
    String? errorMessage;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.lock_outline, color: Colors.blueAccent),
              SizedBox(width: 8),
              Text('Set New Password'),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Enter a new unlock password for this device and confirm it below.',
                  style: TextStyle(fontSize: 13, color: Colors.grey),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: passwordController,
                  obscureText: obscurePassword,
                  decoration: InputDecoration(
                    labelText: 'New Password',
                    prefixIcon: const Icon(Icons.lock),
                    suffixIcon: IconButton(
                      icon: Icon(obscurePassword ? Icons.visibility_off : Icons.visibility),
                      onPressed: () => setDialogState(() => obscurePassword = !obscurePassword),
                    ),
                    border: const OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: confirmController,
                  obscureText: obscureConfirm,
                  decoration: InputDecoration(
                    labelText: 'Confirm New Password',
                    prefixIcon: const Icon(Icons.lock_clock_outlined),
                    suffixIcon: IconButton(
                      icon: Icon(obscureConfirm ? Icons.visibility_off : Icons.visibility),
                      onPressed: () => setDialogState(() => obscureConfirm = !obscureConfirm),
                    ),
                    border: const OutlineInputBorder(),
                  ),
                ),
                if (errorMessage != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    errorMessage!,
                    style: const TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('CANCEL'),
            ),
            ElevatedButton(
              onPressed: () {
                final pwd = passwordController.text.trim();
                final confirm = confirmController.text.trim();
                if (pwd.isEmpty) {
                  setDialogState(() => errorMessage = 'Password cannot be empty');
                  return;
                }
                if (pwd.length < 4) {
                  setDialogState(() => errorMessage = 'Password must be at least 4 characters');
                  return;
                }
                if (pwd != confirm) {
                  setDialogState(() => errorMessage = 'Passwords do not match');
                  return;
                }
                context.read<SettingsBloc>().add(SetSystemPassword(pwd));
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('System password updated successfully'),
                    backgroundColor: Colors.green,
                  ),
                );
              },
              child: const Text('SET PASSWORD'),
            ),
          ],
        ),
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
    final SignatureController signatureController = SignatureController(
      penStrokeWidth: 3,
      penColor: Colors.black,
      exportBackgroundColor: Colors.white,
    );

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          title: const Text('Draw Signature'),
          content: Container(
            width: 400,
            height: 250,
            decoration: BoxDecoration(border: Border.all(color: Colors.grey)),
            child: Signature(
              controller: signatureController,
              backgroundColor: Colors.white,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                signatureController.clear();
              },
              child: const Text('Clear', style: TextStyle(color: Colors.red)),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(dialogContext);
              },
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (signatureController.isNotEmpty) {
                  final Uint8List? bytes = await signatureController.toPngBytes();
                  if (bytes != null && context.mounted) {
                    _update(context, settings.copyWith(adminSignature: bytes));
                  }
                }
                if (dialogContext.mounted) {
                  Navigator.pop(dialogContext);
                }
              },
              child: const Text('Save'),
            ),
          ],
        );
      },
    );

    // Delay disposal slightly to ensure the dialog is fully unmounted
    Future.delayed(const Duration(milliseconds: 300), () {
      signatureController.dispose();
    });
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
              final isBasicPlan = userPlan == null || userPlan.isBasic;
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
    final virtualBankNameController = TextEditingController(text: staff?.virtualBankName);
    final virtualAccountNumberController = TextEditingController(text: staff?.virtualAccountNumber);
    final virtualAccountNameController = TextEditingController(text: staff?.virtualAccountName);
    final bankCodeController = TextEditingController(text: staff?.bankCode);
    final formKey = GlobalKey<FormState>();

    String selectedRole = staff?.role ?? 'STAFF';

    List<Map<String, String>> banks = [];
    String? selectedBankCode = staff?.bankCode?.trim().isNotEmpty == true
        ? staff!.bankCode!.trim()
        : null;
    bool loadingBanks = true;
    bool banksLoadStarted = false;
    bool resolvingAccount = false;
    String? resolveError;
    Timer? resolveDebounce;

    Future<void> loadBanks(StateSetter dialogSetState) async {
      try {
        final repo = context.read<FinanceRepository>();
        final raw = await repo.getPayoutBanks(country: 'nigeria');
        final mapped = raw
            .map((b) {
              final name = (b['name'] ?? b['bank_name'] ?? b['bankName'] ?? '')
                  .toString()
                  .trim();
              final code = (b['code'] ?? b['bank_code'] ?? b['bankCode'] ?? '')
                  .toString()
                  .trim();
              return {'name': name, 'code': code};
            })
            .where((b) => b['name']!.isNotEmpty && b['code']!.isNotEmpty)
            .toList()
          ..sort((a, b) => a['name']!.toLowerCase().compareTo(b['name']!.toLowerCase()));

        final effectiveBanks = mapped.isNotEmpty
            ? mapped
            : kDefaultNigerianBanks.map((e) => Map<String, String>.from(e)).toList();

        // If editing with a bank name but missing code, try match by name
        if ((selectedBankCode == null || selectedBankCode!.isEmpty) &&
            (staff?.virtualBankName?.trim().isNotEmpty ?? false)) {
          final needle = staff!.virtualBankName!.trim().toLowerCase();
          Map<String, String>? match;
          for (final b in effectiveBanks) {
            final n = b['name']!.toLowerCase();
            if (n == needle || n.contains(needle)) {
              match = b;
              break;
            }
          }
          if (match != null) {
            selectedBankCode = match['code'];
            bankCodeController.text = match['code']!;
            virtualBankNameController.text = match['name']!;
          }
        }

        dialogSetState(() {
          banks = effectiveBanks;
          loadingBanks = false;
          resolveError = null;
          if (selectedBankCode != null) {
            final stillThere = banks.any((b) => b['code'] == selectedBankCode);
            if (!stillThere) selectedBankCode = null;
          }
        });
      } catch (e) {
        dialogSetState(() {
          loadingBanks = false;
          banks = kDefaultNigerianBanks.map((e) => Map<String, String>.from(e)).toList();
          resolveError = null;
        });
      }
    }

    Future<void> resolveAccountName(StateSetter dialogSetState) async {
      final acct = virtualAccountNumberController.text.trim();
      final code = (selectedBankCode ?? bankCodeController.text).trim();
      if (acct.length < 10 || code.isEmpty) {
        dialogSetState(() {
          resolvingAccount = false;
          resolveError = null;
        });
        return;
      }

      dialogSetState(() {
        resolvingAccount = true;
        resolveError = null;
      });

      try {
        final repo = context.read<FinanceRepository>();
        final result = await repo.resolvePayoutAccount(
          accountNumber: acct,
          bankCode: code,
        );
        final resolvedName = (result['account_name'] ??
                result['accountName'] ??
                result['AccountName'] ??
                '')
            .toString()
            .trim();
        dialogSetState(() {
          if (resolvedName.isNotEmpty) {
            virtualAccountNameController.text = resolvedName;
            resolveError = null;
          } else {
            resolveError = 'Account name not found. You can enter the account name manually.';
          }
          resolvingAccount = false;
        });
      } catch (e) {
        dialogSetState(() {
          resolvingAccount = false;
          resolveError = 'Auto-lookup unavailable (profile pending on web). You can enter account name manually.';
        });
      }
    }

    void scheduleResolve(StateSetter dialogSetState) {
      resolveDebounce?.cancel();
      resolveDebounce = Timer(const Duration(milliseconds: 550), () {
        resolveAccountName(dialogSetState);
      });
    }

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, dialogSetState) {
          if (!banksLoadStarted) {
            banksLoadStarted = true;
            Future.microtask(() => loadBanks(dialogSetState));
          }

          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
            backgroundColor: Colors.white,
            title: Text(
              staff == null ? 'Add Staff' : 'Edit Staff',
              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black),
            ),
            content: Form(
              key: formKey,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextFormField(
                      controller: nameController,
                      style: const TextStyle(color: Colors.black),
                      decoration: const InputDecoration(
                        labelText: 'Staff Name',
                        labelStyle: TextStyle(color: Colors.grey),
                        focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.blue)),
                      ),
                      validator: (val) => val == null || val.isEmpty ? 'Required' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: staffIdController,
                      style: const TextStyle(color: Colors.black),
                      decoration: const InputDecoration(
                        labelText: 'Staff ID (Optional)',
                        hintText: 'e.g., MGT-01',
                        labelStyle: TextStyle(color: Colors.grey),
                        focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.blue)),
                      ),
                      maxLength: 20,
                      textCapitalization: TextCapitalization.characters,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: codeController,
                      style: const TextStyle(color: Colors.black),
                      decoration: InputDecoration(
                        labelText: 'Auth Code (4 digits)',
                        hintText: isCodeHashed ? 'Leave blank to keep current' : 'Enter 4-digit code',
                        labelStyle: const TextStyle(color: Colors.grey),
                        focusedBorder: const UnderlineInputBorder(borderSide: BorderSide(color: Colors.blue)),
                      ),
                      keyboardType: TextInputType.number,
                      maxLength: 4,
                      validator: (val) {
                        if (staff != null && (val == null || val.isEmpty)) return null;
                        return (val?.length != 4) ? 'Must be 4 digits' : null;
                      },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: phoneController,
                      style: const TextStyle(color: Colors.black),
                      decoration: const InputDecoration(
                        labelText: 'Phone Number',
                        labelStyle: TextStyle(color: Colors.grey),
                        focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.blue)),
                      ),
                      keyboardType: TextInputType.phone,
                    ),
                    const SizedBox(height: 20),

                    // Staff personal bank (salary / payout destination) — Quasar banks + name enquiry
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'STAFF PERSONAL BANK ACCOUNT',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.grey[700],
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Banks & account name from Quasar (optional)',
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: Colors.grey[500],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (staff != null)
                            TextButton.icon(
                              icon: const Icon(Icons.autorenew, size: 14),
                              label: const Text('GENERATE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                              onPressed: () => _generateStaffVirtualAccount(
                                ctx,
                                staff,
                                virtualBankNameController,
                                virtualAccountNumberController,
                                virtualAccountNameController,
                                dialogSetState,
                              ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (loadingBanks)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: LinearProgressIndicator(minHeight: 2),
                      )
                    else
                      DropdownButtonFormField<String>(
                        value: selectedBankCode != null &&
                                banks.any((b) => b['code'] == selectedBankCode)
                            ? selectedBankCode
                            : null,
                        isExpanded: true,
                        decoration: const InputDecoration(
                          labelText: 'Bank',
                          hintText: 'Select bank',
                          labelStyle: TextStyle(color: Colors.grey),
                          focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.blue)),
                        ),
                        items: banks
                            .map(
                              (b) => DropdownMenuItem<String>(
                                value: b['code'],
                                child: Text(
                                  b['name']!,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(color: Colors.black, fontSize: 14),
                                ),
                              ),
                            )
                            .toList(),
                        onChanged: (code) {
                          dialogSetState(() {
                            selectedBankCode = code;
                            Map<String, String>? match;
                            for (final b in banks) {
                              if (b['code'] == code) {
                                match = b;
                                break;
                              }
                            }
                            bankCodeController.text = code ?? '';
                            virtualBankNameController.text = match?['name'] ?? '';
                            resolveError = null;
                          });
                          scheduleResolve(dialogSetState);
                        },
                      ),
                    if (!loadingBanks && banks.isEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(
                          resolveError ?? 'No banks loaded. Pull to retry by reopening this dialog.',
                          style: TextStyle(color: Colors.orange[800], fontSize: 11),
                        ),
                      ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: virtualAccountNumberController,
                      style: const TextStyle(color: Colors.black),
                      decoration: InputDecoration(
                        labelText: 'Personal Account Number',
                        hintText: '10-digit NUBAN',
                        labelStyle: const TextStyle(color: Colors.grey),
                        focusedBorder: const UnderlineInputBorder(borderSide: BorderSide(color: Colors.blue)),
                        suffixIcon: resolvingAccount
                            ? const Padding(
                                padding: EdgeInsets.all(12),
                                child: SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                ),
                              )
                            : null,
                      ),
                      keyboardType: TextInputType.number,
                      maxLength: 10,
                      onChanged: (_) => scheduleResolve(dialogSetState),
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: virtualAccountNameController,
                      style: const TextStyle(color: Colors.black),
                      readOnly: resolvingAccount,
                      decoration: InputDecoration(
                        labelText: 'Personal Account Name',
                        hintText: resolvingAccount
                            ? 'Looking up account name…'
                            : 'Enter account name (or auto-fills)',
                        labelStyle: const TextStyle(color: Colors.grey),
                        focusedBorder: const UnderlineInputBorder(borderSide: BorderSide(color: Colors.blue)),
                        helperText: resolveError,
                        helperMaxLines: 2,
                        helperStyle: TextStyle(
                          color: resolveError != null ? Colors.orange[800] : Colors.grey,
                          fontSize: 11,
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        selectedBankCode == null || selectedBankCode!.isEmpty
                            ? 'Bank code: — (select a bank)'
                            : 'Bank code: $selectedBankCode',
                        style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                      ),
                    ),
                    const SizedBox(height: 20),

                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'SECURITY ROLE IDENTITY',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey[700],
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        _buildRoleCard(dialogSetState, 'Staff', 'STAFF', 'Operational', selectedRole, (val) => selectedRole = val),
                        const SizedBox(width: 6),
                        _buildRoleCard(dialogSetState, 'Admin', 'ADMIN', 'Full Access', selectedRole, (val) => selectedRole = val),
                        const SizedBox(width: 6),
                        _buildRoleCard(dialogSetState, 'Finance', 'FINANCE', 'Read-Only', selectedRole, (val) => selectedRole = val),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () {
                  resolveDebounce?.cancel();
                  Navigator.pop(ctx);
                },
                child: const Text('CANCEL', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEEF2F6),
                  foregroundColor: Colors.blue,
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                ),
                onPressed: () {
                  if (formKey.currentState!.validate()) {
                    resolveDebounce?.cancel();
                    final pin = codeController.text.trim();
                    final code = (selectedBankCode ?? bankCodeController.text).trim();
                    final newStaff = Staff(
                      id: staff?.id,
                      name: nameController.text.trim(),
                      staffId: staffIdController.text.trim().isEmpty ? null : staffIdController.text.trim(),
                      staffCode: pin.isEmpty && staff != null ? staff.staffCode : pin,
                      phone: phoneController.text.trim(),
                      role: selectedRole,
                      syncId: staff?.syncId,
                      virtualBankName: virtualBankNameController.text.trim().isEmpty
                          ? null
                          : virtualBankNameController.text.trim(),
                      virtualAccountNumber: virtualAccountNumberController.text.trim().isEmpty
                          ? null
                          : virtualAccountNumberController.text.trim(),
                      virtualAccountName: virtualAccountNameController.text.trim().isEmpty
                          ? null
                          : virtualAccountNameController.text.trim(),
                      bankCode: code.isEmpty ? null : code,
                    );
                    if (staff == null) {
                      context.read<StaffBloc>().add(AddStaff(newStaff));
                    } else {
                      context.read<StaffBloc>().add(UpdateStaff(newStaff));
                    }
                    Navigator.pop(ctx);
                    // ignore: discarded_futures
                    _pushStaffToCloud(context, extra: newStaff);
                  }
                },
                child: const Text('SAVE', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          );
        },
      ),
    ).whenComplete(() => resolveDebounce?.cancel());
  }

  Future<void> _pushStaffToCloud(BuildContext context, {Staff? extra}) async {
    try {
      await Future.delayed(const Duration(milliseconds: 700));
      final staffList = await context.read<StaffBloc>().repository.getAllStaff();
      if (staffList.isEmpty && extra == null) return;

      final merged = [
        ...staffList,
        if (extra != null &&
            !staffList.any((s) =>
                (extra.syncId != null && s.syncId == extra.syncId) ||
                (s.name == extra.name && s.phone == extra.phone)))
          extra,
      ];

      final repo = context.read<FinanceRepository>();
      final payloads = merged
          .map((s) => {
                'syncId': s.syncId,
                'name': s.name,
                'staffId': s.staffId,
                'phone': s.phone,
                'role': s.role,
                'isActive': s.isActive,
                'bankName': s.virtualBankName,
                'bankCode': s.bankCode,
                'accountNumber': s.virtualAccountNumber,
                'accountName': s.virtualAccountName,
              })
          .toList();

      await repo.apiClient.post('/api/staff/bulk-sync', data: {'staff': payloads});
    } catch (e) {
      debugPrint('Staff cloud sync skipped/failed: $e');
    }
  }

  Widget _buildRoleCard(
    StateSetter dialogSetState,
    String title,
    String value,
    String subtitle,
    String currentSelected,
    Function(String) onSelect,
  ) {
    final isSelected = currentSelected == value;
    return Expanded(
      child: InkWell(
        onTap: () {
          dialogSetState(() {
            onSelect(value);
          });
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFFE0F2FE) : const Color(0xFFF3F4F6),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? const Color(0xFF0288D1) : const Color(0xFFE5E7EB),
              width: isSelected ? 1.5 : 1.0,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Radio<String>(
                value: value,
                groupValue: currentSelected,
                activeColor: const Color(0xFF0288D1),
                visualDensity: VisualDensity.compact,
                onChanged: (val) {
                  dialogSetState(() {
                    onSelect(val!);
                  });
                },
              ),
              Text(
                title,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? const Color(0xFF01579B) : Colors.black87,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 8,
                  color: isSelected ? const Color(0xFF0288D1) : Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
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

  Future<void> _handleRestore(BuildContext context) async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.any, // .sqlite might not be in the default list
      allowMultiple: false,
    );

    if (result != null && result.files.isNotEmpty) {
      final filePath = result.files.first.path;
      if (filePath == null) return;

      // Show Choice Dialog
      final restoreType = await showDialog<String>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Restore Backup'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('How would you like to restore "${result.files.first.name}"?'),
              const SizedBox(height: 20),
              
              // Merge Option
              _buildRestoreOption(
                context,
                title: 'Merge Data (Recommended)',
                subtitle: 'Add new records and update existing ones. Current data will NOT be deleted.',
                icon: Icons.merge_type,
                color: Colors.blue,
                onTap: () => Navigator.pop(ctx, 'merge'),
              ),
              
              const Divider(height: 24),
              
              // Overwrite Option
              _buildRestoreOption(
                context,
                title: 'Full Restore (Overwrite)',
                subtitle: 'REPLACE everything. All current records will be lost forever!',
                icon: Icons.warning_amber_rounded,
                color: Colors.red,
                onTap: () => Navigator.pop(ctx, 'overwrite'),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('CANCEL'),
            ),
          ],
        ),
      );
      
      if (!mounted) return;

      if (restoreType == 'merge') {
        _showLoadingDialog(context, 'Merging Data...');
        context.read<SettingsBloc>().add(RestoreFromPath(filePath));
      } else if (restoreType == 'overwrite') {
        _showLoadingDialog(context, 'Restoring & Overwriting...');
        context.read<SettingsBloc>().add(ImportDatabaseFromFile(filePath));
      }
    }
  }

  Widget _buildRestoreOption(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: color,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _generateStaffVirtualAccount(
    BuildContext dialogContext,
    Staff staff,
    TextEditingController bankController,
    TextEditingController numberController,
    TextEditingController nameController,
    StateSetter dialogSetState,
  ) async {
    final orgName = dialogContext.read<SettingsBloc>().state.settings?.organizationName;
    if (await showFreeTrialVaLockedIfNeeded(dialogContext, businessName: orgName)) {
      return;
    }

    final customNameController = TextEditingController(text: staff.name);
    final phoneController = TextEditingController(text: staff.phone);
    final emailController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    await showDialog(
      context: dialogContext,
      builder: (context) => AlertDialog(
        title: const Text('Generate Staff Virtual Account'),
        content: Form(
          key: formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'The first name on the account will be the business name. Please specify the custom second name below.',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: customNameController,
                  decoration: const InputDecoration(
                    labelText: 'Custom Second Name (Required)',
                    border: OutlineInputBorder(),
                  ),
                  validator: (val) => (val == null || val.trim().isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: phoneController,
                  decoration: const InputDecoration(
                    labelText: 'Phone Number (Optional)',
                    border: OutlineInputBorder(),
                    hintText: 'e.g. 08012345678',
                  ),
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: emailController,
                  decoration: const InputDecoration(
                    labelText: 'Email Address (Optional)',
                    border: OutlineInputBorder(),
                    hintText: 'e.g. staff@example.com',
                  ),
                  keyboardType: TextInputType.emailAddress,
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('CANCEL'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (formKey.currentState?.validate() ?? false) {
                final secondName = customNameController.text.trim();
                final phone = phoneController.text.trim().isEmpty ? null : phoneController.text.trim();
                final email = emailController.text.trim().isEmpty ? null : emailController.text.trim();

                Navigator.pop(context); // Close inputs dialog

                // Show loading dialog
                showDialog(
                  context: dialogContext,
                  barrierDismissible: false,
                  builder: (context) => const Center(
                    child: InvifyLoadingIndicator(message: 'Provisioning Staff Virtual Account...'),
                  ),
                );

                try {
                  final financeRepo = dialogContext.read<FinanceRepository>();
                  
                  // Use syncId (which is UUID string) as staff userId
                  final result = await financeRepo.initiateStaffVirtualAccount(
                    userId: staff.syncId ?? staff.id.toString(),
                    customLastName: secondName,
                    phone: phone,
                    email: email,
                  );

                  if (dialogContext.mounted) {
                    Navigator.pop(dialogContext); // Close loading dialog

                    if (result['accountNumber'] != null) {
                      dialogSetState(() {
                        bankController.text = result['bankName'] ?? '';
                        numberController.text = result['accountNumber'] ?? '';
                        nameController.text = result['accountName'] ?? '';
                      });

                      ScaffoldMessenger.of(dialogContext).showSnackBar(
                        const SnackBar(content: Text('Staff Virtual Account generated! Click SAVE to apply.')),
                      );
                    } else {
                      await showVirtualAccountFailureDialog(
                        dialogContext,
                        'Failed to provision staff virtual account',
                        subject: 'staff virtual account',
                      );
                    }
                  }
                } catch (e) {
                  if (dialogContext.mounted) {
                    Navigator.pop(dialogContext); // Close loading dialog
                    await showVirtualAccountFailureDialog(
                      dialogContext,
                      e,
                      subject: 'staff virtual account',
                    );
                  }
                }
              }
            },
            child: const Text('GENERATE'),
          ),
        ],
      ),
    );
  }

}
