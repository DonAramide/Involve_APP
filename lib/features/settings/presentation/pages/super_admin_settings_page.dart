import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:typed_data';
import 'package:flutter/services.dart';
import '../../../../core/license/hmac_service.dart';
import '../../../../core/license/license_model.dart';
import 'package:uuid/uuid.dart';
import '../bloc/settings_bloc.dart';
import '../bloc/settings_state.dart';
import '../../../../core/license/license_service.dart';
import '../../../../core/license/license_generator.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:intl/intl.dart';
import 'dart:math';

class SuperAdminSettingsPage extends StatefulWidget {
  const SuperAdminSettingsPage({super.key});

  @override
  State<SuperAdminSettingsPage> createState() => _SuperAdminSettingsPageState();
}

class _SuperAdminSettingsPageState extends State<SuperAdminSettingsPage> {
  final _formKey = GlobalKey<FormState>();
  final _orgNameController = TextEditingController();
  final _addressController = TextEditingController();
  final _phoneController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _taxIdController = TextEditingController();
  
  // License Generator State
  final _licenseBusinessNameController = TextEditingController();
  final _uuid = const Uuid();
  String _selectedDuration = '1 month';
  PlanType _selectedPlan = PlanType.basic;
  String _generatedCode = '';
  
  // History & Validation State
  List<LicenseHistoryData> _licenseHistory = [];
  final _validatorController = TextEditingController();
  LicenseModel? _validatedLicense;
  String? _validationError;

  final List<String> _durations = [
    '1 month', '2 months', '3 months', '6 months', '9 months', '1 year', '2 years', '3 years', 'lifetime'
  ];

  Uint8List? _selectedLogo;
  bool _confirmPriceOnSelection = false;
  bool _hasChanges = false;

  @override
  void initState() {
    super.initState();
    final settings = context.read<SettingsBloc>().state.settings;
    if (settings != null) {
      _orgNameController.text = settings.organizationName;
      _addressController.text = settings.address;
      _phoneController.text = settings.phone;
      _descriptionController.text = settings.businessDescription ?? '';
      _taxIdController.text = settings.taxId ?? '';
      _selectedLogo = settings.logo;
      _confirmPriceOnSelection = settings.confirmPriceOnSelection;
      _licenseBusinessNameController.text = settings.organizationName;
    }
    
    // Track changes
    _orgNameController.addListener(() => setState(() => _hasChanges = true));
    _addressController.addListener(() => setState(() => _hasChanges = true));
    _phoneController.addListener(() => setState(() => _hasChanges = true));
    _descriptionController.addListener(() => setState(() => _hasChanges = true));
    _taxIdController.addListener(() => setState(() => _hasChanges = true));

    _loadHistory();
  }

  Future<void> _loadHistory() async {
    final history = await LicenseService.getGeneratedLicenses();
    setState(() => _licenseHistory = history);
  }

  @override
  void dispose() {
    _orgNameController.dispose();
    _addressController.dispose();
    _phoneController.dispose();
    _descriptionController.dispose();
    _taxIdController.dispose();
    _licenseBusinessNameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_hasChanges,
      onPopInvokedWithResult: (didPop, result) async {
        if (!didPop && _hasChanges) {
          final shouldPop = await _showDiscardDialog();
          if (shouldPop == true && context.mounted) {
            Navigator.of(context).pop();
          }
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Row(
            children: const [
              Icon(Icons.admin_panel_settings, color: Colors.deepPurple),
              SizedBox(width: 8),
              Flexible(
                child: Text(
                  'Super Admin Settings',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          backgroundColor: Colors.deepPurple,
        ),
        body: BlocListener<SettingsBloc, SettingsState>(
          listener: (context, state) {
            if (state.error != null) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(state.error!), backgroundColor: Colors.red),
              );
            }
            if (state.successMessage != null) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(state.successMessage!), backgroundColor: Colors.green),
              );
              setState(() => _hasChanges = false);
            }
          },
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Warning Banner
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.deepPurple.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.deepPurple),
                    ),
                    child: Row(
                      children: const [
                        Icon(Icons.warning_amber, color: Colors.deepPurple),
                        SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Super Admin Mode: You have full access to modify all settings.',
                            style: TextStyle(
                              color: Colors.deepPurple,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  
                  // Branding Section
                  _buildSectionHeader('Branding'),
                  const SizedBox(height: 16),
                  _buildLogoSection(),
                  const SizedBox(height: 32),
                  
                  // Organization Details Section
                  _buildSectionHeader('Organization Details'),
                  const SizedBox(height: 16),
                  _buildTextField(
                    controller: _orgNameController,
                    label: 'Organization Name',
                    icon: Icons.business,
                    validator: (val) {
                      if (val == null || val.isEmpty) {
                        return 'Organization name is required';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  _buildTextField(
                    controller: _addressController,
                    label: 'Address',
                    icon: Icons.location_on,
                    maxLines: 2,
                  ),
                  const SizedBox(height: 16),
                  _buildTextField(
                    controller: _phoneController,
                    label: 'Phone',
                    icon: Icons.phone,
                    validator: (val) {
                      if (val != null && val.isNotEmpty && val.length < 10) {
                        return 'Phone must be at least 10 digits';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  _buildTextField(
                    controller: _taxIdController,
                    label: 'Tax ID',
                    icon: Icons.receipt_long,
                  ),
                  const SizedBox(height: 16),
                  _buildTextField(
                    controller: _descriptionController,
                    label: 'Business Description',
                    icon: Icons.description,
                    maxLines: 3,
                  ),
                  const SizedBox(height: 32),
                  
                  // Action Buttons
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _hasChanges ? _resetForm : null,
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                          child: const Text('RESET'),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        flex: 2,
                        child: ElevatedButton(
                          onPressed: _hasChanges
                              ? _saveChanges
                              : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.deepPurple,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                          child: const Text('SAVE CHANGES'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),
                  
                  // Invoicing Controls Section
                  _buildSectionHeader('Invoicing Controls'),
                  const SizedBox(height: 16),
                  Card(
                    elevation: 1,
                    child: SwitchListTile(
                      title: const Text('Confirm Item Price on Selection'),
                      subtitle: const Text('Ask user to confirm or edit price when adding items to invoice'),
                      secondary: const Icon(Icons.price_check, color: Colors.deepPurple),
                      value: _confirmPriceOnSelection,
                      activeColor: Colors.deepPurple,
                      onChanged: (val) {
                        setState(() {
                          _confirmPriceOnSelection = val;
                          _hasChanges = true;
                        });
                      },
                    ),
                  ),
                  const SizedBox(height: 48),

                   // License Generator Section
                  _buildSectionHeader('License Management'),
                  const SizedBox(height: 16),
                  _buildLicenseGenerator(),
                  const SizedBox(height: 32),

                  // License Validator Section
                  _buildSectionHeader('License Validator'),
                  const SizedBox(height: 16),
                  _buildLicenseValidator(),
                  const SizedBox(height: 32),

                  // License History Section
                  _buildSectionHeader('Generation History'),
                  const SizedBox(height: 16),
                  _buildLicenseHistory(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.bold,
        color: Colors.deepPurple,
      ),
    );
  }

  Widget _buildLogoSection() {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            if (_selectedLogo != null)
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.memory(_selectedLogo!, fit: BoxFit.cover),
                ),
              )
            else
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: Colors.grey[200],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: const Icon(Icons.business, size: 60, color: Colors.grey),
              ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton.icon(
                  onPressed: _pickLogo,
                  icon: const Icon(Icons.upload),
                  label: Text(_selectedLogo != null ? 'Change Logo' : 'Upload Logo'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.deepPurple,
                    foregroundColor: Colors.white,
                  ),
                ),
                if (_selectedLogo != null) ...[
                  const SizedBox(width: 12),
                  OutlinedButton.icon(
                    onPressed: () {
                      setState(() {
                        _selectedLogo = null;
                        _hasChanges = true;
                      });
                    },
                    icon: const Icon(Icons.delete, color: Colors.red),
                    label: const Text('Remove', style: TextStyle(color: Colors.red)),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    String? Function(String?)? validator,
    bool obscureText = false,
    int maxLines = 1,
  }) {
    return TextFormField(
      controller: controller,
      obscureText: obscureText,
      maxLines: maxLines,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon),
        border: const OutlineInputBorder(),
      ),
    );
  }

  Future<void> _pickLogo() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery);
    if (image != null) {
      final bytes = await image.readAsBytes();
      setState(() {
        _selectedLogo = bytes;
        _hasChanges = true;
      });
    }
  }

  void _resetForm() {
    final settings = context.read<SettingsBloc>().state.settings;
    if (settings != null) {
      setState(() {
        _orgNameController.text = settings.organizationName;
        _addressController.text = settings.address;
        _phoneController.text = settings.phone;
        _descriptionController.text = settings.businessDescription ?? '';
        _taxIdController.text = settings.taxId ?? '';
        _selectedLogo = settings.logo;
        _hasChanges = false;
      });
    }
  }

  Future<void> _saveChanges() async {
    if (!_formKey.currentState!.validate()) return;

    final settingsBloc = context.read<SettingsBloc>();
    final currentSettings = settingsBloc.state.settings!;

    // Save organization settings
    final updatedSettings = currentSettings.copyWith(
      organizationName: _orgNameController.text,
      address: _addressController.text,
      phone: _phoneController.text,
      businessDescription: _descriptionController.text,
      taxId: _taxIdController.text,
      logo: _selectedLogo,
      confirmPriceOnSelection: _confirmPriceOnSelection,
    );
    
    settingsBloc.add(UpdateAppSettings(updatedSettings));

    settingsBloc.add(UpdateAppSettings(updatedSettings));
  }

  // --- License Generator Methods ---

  Widget _buildLicenseGenerator() {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Issue Subscription License',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 20),
            _buildTextField(
              controller: _licenseBusinessNameController,
              label: 'Licensed Business Name',
              icon: Icons.badge,
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _selectedDuration,
              decoration: const InputDecoration(
                labelText: 'Duration',
                prefixIcon: Icon(Icons.timer),
                border: OutlineInputBorder(),
              ),
              items: _durations.map((d) => DropdownMenuItem(value: d, child: Text(d))).toList(),
              onChanged: (val) => setState(() => _selectedDuration = val!),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<PlanType>(
              value: _selectedPlan,
              decoration: const InputDecoration(
                labelText: 'Plan Type',
                prefixIcon: Icon(Icons.card_membership),
                border: OutlineInputBorder(),
              ),
              items: PlanType.values.map((p) => DropdownMenuItem(value: p, child: Text(p.name.toUpperCase()))).toList(),
              onChanged: (val) => setState(() => _selectedPlan = val!),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _generateLicense,
              icon: const Icon(Icons.auto_awesome),
              label: const Text('GENERATE LICENSE KEY'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blueGrey[800],
                foregroundColor: Colors.white,
                padding: const EdgeInsets.all(16),
              ),
            ),
            if (_generatedCode.isNotEmpty) ...[
              const SizedBox(height: 24),
              const Divider(),
              const SizedBox(height: 16),
              const Text(
                'Activation Code:',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        _generatedCode,
                        style: const TextStyle(fontFamily: 'monospace', fontSize: 11),
                      ),
                    ),
                    IconButton(
                      onPressed: _copyToClipboard,
                      icon: const Icon(Icons.copy, size: 18),
                      tooltip: 'Copy',
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _generateLicense() async {
    if (_licenseBusinessNameController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter licensed business name')),
      );
      return;
    }

    final now = DateTime.now();
    DateTime expiryDate;

    switch (_selectedDuration) {
      case '1 month': expiryDate = DateTime(now.year, now.month + 1, now.day); break;
      case '2 months': expiryDate = DateTime(now.year, now.month + 2, now.day); break;
      case '3 months': expiryDate = DateTime(now.year, now.month + 3, now.day); break;
      case '6 months': expiryDate = DateTime(now.year, now.month + 6, now.day); break;
      case '9 months': expiryDate = DateTime(now.year, now.month + 9, now.day); break;
      case '1 year': expiryDate = DateTime(now.year + 1, now.month, now.day); break;
      case '2 years': expiryDate = DateTime(now.year + 2, now.month, now.day); break;
      case '3 years': expiryDate = DateTime(now.year + 3, now.month, now.day); break;
      case 'lifetime': expiryDate = DateTime(now.year + 100, now.month, now.day); break;
      default: expiryDate = DateTime(now.year, now.month + 1, now.day);
    }

    final license = LicenseModel(
      businessName: _licenseBusinessNameController.text.trim(),
      expiryDate: expiryDate,
      planType: _selectedPlan,
      licenseId: Random().nextInt(65535), // 16-bit random ID
    );

    setState(() {
      _generatedCode = LicenseGenerator.generate(license);
    });

    // Save to database
    await LicenseService.saveLicenseRecord(license, _generatedCode);
    await _loadHistory();
  }

  void _copyToClipboard() {
    Clipboard.setData(ClipboardData(text: _generatedCode));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Activation code copied to clipboard')),
    );
  }

  Future<bool?> _showDiscardDialog() {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Discard Changes?'),
        content: const Text('You have unsaved changes. Do you want to discard them?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('CANCEL'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('DISCARD'),
          ),
        ],
      ),
    );
  }

  Widget _buildLicenseValidator() {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Decode & Validate Code',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _validatorController,
                    decoration: InputDecoration(
                      hintText: 'Paste activation code here...',
                      border: const OutlineInputBorder(),
                      errorText: _validationError,
                    ),
                    maxLines: 2,
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  onPressed: _validateCode,
                  icon: const Icon(Icons.search),
                  style: IconButton.styleFrom(backgroundColor: Colors.deepPurple),
                ),
              ],
            ),
            if (_validatedLicense != null) ...[
              const SizedBox(height: 20),
              const Divider(),
              const SizedBox(height: 16),
              _buildValidationInfo('Business Name', _validatedLicense!.businessName, Icons.business),
              _buildValidationInfo('Plan Type', _validatedLicense!.planType.name.toUpperCase(), Icons.card_membership),
              _buildValidationInfo('Expiry Date', DateFormat('MMM dd, yyyy').format(_validatedLicense!.expiryDate), Icons.event),
              _buildValidationInfo('License ID', _validatedLicense!.licenseId.toString(), Icons.fingerprint),
              const SizedBox(height: 8),
              if (_validatedLicense!.expiryDate.isBefore(DateTime.now()))
                const Text('STATUS: EXPIRED', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold))
              else
                const Text('STATUS: VALID', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildValidationInfo(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.grey[600]),
          const SizedBox(width: 8),
          Text('$label: ', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 13))),
        ],
      ),
    );
  }

  Widget _buildLicenseHistory() {
    if (_licenseHistory.isEmpty) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Center(child: Text('No codes generated yet', style: TextStyle(color: Colors.grey))),
        ),
      );
    }

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: _licenseHistory.length,
        separatorBuilder: (context, index) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final item = _licenseHistory[index];
          return ListTile(
            title: Text(item.businessName, style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Plan: ${item.plan.toUpperCase()} • Expires: ${DateFormat('MMM dd, yyyy').format(item.expiryDate)}'),
                Text('Generated: ${DateFormat('MMM dd, HH:mm').format(item.createdAt)}', style: const TextStyle(fontSize: 11)),
              ],
            ),
            trailing: IconButton(
              icon: const Icon(Icons.copy, size: 18),
              onPressed: () {
                Clipboard.setData(ClipboardData(text: item.code));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Code copied to clipboard')),
                );
              },
            ),
            isThreeLine: true,
          );
        },
      ),
    );
  }

  void _validateCode() {
    final code = _validatorController.text.trim();
    if (code.isEmpty) return;

    final peeked = LicenseService.peekCode(code);
    setState(() {
      if (peeked != null) {
        _validatedLicense = LicenseModel(
          businessName: '[ENCODED HASH]', // We don't know the plain name from peek
          expiryDate: peeked['expiryDate'],
          planType: peeked['planType'],
          licenseId: peeked['licenseId'],
        );
        _validationError = null;
      } else {
        _validatedLicense = null;
        _validationError = 'Invalid or corrupted activation code';
      }
    });
  }
}
