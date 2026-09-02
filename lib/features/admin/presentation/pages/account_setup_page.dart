import 'package:involve_app/core/utils/app_config.dart';
import 'package:involve_app/core/utils/terminology.dart';
// lib/features/admin/presentation/pages/account_setup_page.dart
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/core/utils/phone_number_input.dart';
import '../../../settings/presentation/bloc/settings_bloc.dart';
import '../../../settings/presentation/bloc/settings_state.dart';
import '../../../settings/domain/entities/settings.dart';
import '../../../../core/utils/device_info_service.dart';
import 'package:involve_app/features/settings/domain/services/security_service.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../../../../core/services/service_locator.dart';
import '../../../school_finance/domain/repositories/finance_repository_new.dart';
import '../../../../core/utils/progress_dialog_utils.dart';
import '../../../activation/presentation/pages/activation_page.dart';
import '../../../activation/presentation/pages/tenant_kyc_upload_page.dart';
import '../../../../core/license/storage_service.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:involve_app/core/services/finance_api_client.dart';

class AccountSetupPage extends StatefulWidget {
  const AccountSetupPage({super.key});

  @override
  State<AccountSetupPage> createState() => _AccountSetupPageState();
}

class _AccountSetupPageState extends State<AccountSetupPage> {
  bool _claudeBackupEnabled = false;
  bool _virtualAccountsEnabled = false;
  bool _multiDeviceLinkage = false;
  bool _autoSyncLedger = false;

  String _deviceSuffix = 'LOADING...';
  String _persistentId = 'INITIALIZING...';
  
  late TextEditingController _userNameController;
  late TextEditingController _businessNameController;
  late TextEditingController _phoneController;
  late TextEditingController _emailController;
  late TextEditingController _addressController;
  late TextEditingController _cacController;
  late TextEditingController _taxIdController;
  late TextEditingController _businessDescriptionController;

  bool _initializedControllers = false;
  bool _draftLoaded = false;
  Map<String, String> _formDraft = {};
  static const _storage = FlutterSecureStorage();
  static const _formDraftKey = 'account_setup_form_draft';

  @override
  void initState() {
    super.initState();
    _userNameController = TextEditingController();
    _businessNameController = TextEditingController();
    _phoneController = TextEditingController();
    _emailController = TextEditingController();
    _addressController = TextEditingController();
    _cacController = TextEditingController();
    _taxIdController = TextEditingController();
    _businessDescriptionController = TextEditingController();
    _loadHardwareTelemetry();
    _loadPersistedToggles();
    _loadUserProfile();
    _loadFormDraft();
  }

  Future<void> _loadFormDraft() async {
    try {
      final raw = await _storage.read(key: _formDraftKey);
      if (raw != null && raw.trim().isNotEmpty) {
        final decoded = jsonDecode(raw);
        if (decoded is Map) {
          _formDraft = decoded.map((k, v) => MapEntry(k.toString(), v?.toString() ?? ''));
        }
      }
    } catch (_) {}
    if (mounted) setState(() => _draftLoaded = true);
  }

  Future<void> _persistFormDraft() async {
    final data = {
      'ownerName': _userNameController.text,
      'businessName': _businessNameController.text,
      'phone': _phoneController.text,
      'email': _emailController.text,
      'address': _addressController.text,
      'cac': _cacController.text,
      'taxId': _taxIdController.text,
      'description': _businessDescriptionController.text,
    };
    await _storage.write(key: _formDraftKey, value: jsonEncode(data));
  }

  String _draftOr(String key, String fallback) {
    final v = _formDraft[key];
    if (v != null && v.trim().isNotEmpty) return v;
    return fallback;
  }

  Future<void> _loadUserProfile() async {
    final storedOwner = await _storage.read(key: 'account_profile_owner_name');
    final storedWebUser = await _storage.read(key: 'online_web_username');
    if (mounted) {
      if (storedOwner != null && storedOwner.trim().isNotEmpty) {
        setState(() {
          _userNameController.text = storedOwner.trim();
        });
      } else if (storedWebUser != null && storedWebUser.trim().isNotEmpty && _userNameController.text.isEmpty) {
        setState(() {
          _userNameController.text = storedWebUser.trim();
        });
      }
    }
  }

  Future<void> _loadPersistedToggles() async {
    final cbe = await _storage.read(key: 'toggle_claude_backup');
    final vae = await _storage.read(key: 'toggle_virtual_account');
    final mdl = await _storage.read(key: 'toggle_multi_device');
    final asl = await _storage.read(key: 'toggle_auto_sync');
    if (mounted) {
      setState(() {
        _claudeBackupEnabled = cbe == 'true';
        _virtualAccountsEnabled = vae == 'true';
        _multiDeviceLinkage = mdl == 'true';
        _autoSyncLedger = asl == 'true';
      });
    }
  }

  Future<void> _loadHardwareTelemetry() async {
    final suffix = await DeviceInfoService.getDeviceSuffix();
    final security = SecurityService();
    final uuid = await security.getPersistentDeviceId();
    if (mounted) {
      setState(() {
        _deviceSuffix = suffix;
        _persistentId = uuid;
      });
    }
  }

  @override
  void dispose() {
    _persistFormDraft();
    _userNameController.dispose();
    _businessNameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _addressController.dispose();
    _cacController.dispose();
    _taxIdController.dispose();
    _businessDescriptionController.dispose();
    super.dispose();
  }

  void _showUpgradePrompt(String derivedTenantId) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: theme.cardColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: Colors.amber.shade50, shape: BoxShape.circle),
              child: Icon(Icons.star_rounded, color: Colors.amber.shade700),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Pro Plan Required', 
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: colorScheme.onSurface),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'To bind your preloaded hardware serial number to a live enterprise cloud routing model, an active Pro subscription relay is required.',
              style: TextStyle(fontSize: 13, height: 1.4, color: colorScheme.onSurface.withOpacity(0.8)),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: theme.brightness == Brightness.dark ? Colors.white12 : Colors.grey.shade50, 
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Target Production Node:', style: TextStyle(fontSize: 11, color: colorScheme.onSurface.withOpacity(0.6))),
                  const SizedBox(height: 4),
                  Text(derivedTenantId, style: TextStyle(fontWeight: FontWeight.bold, fontFamily: 'monospace', fontSize: 12, color: colorScheme.primary)),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel Profile Upgrade', style: TextStyle(color: colorScheme.onSurface.withOpacity(0.5))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: colorScheme.primary,
              foregroundColor: colorScheme.onPrimary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ActivationPage()),
              );
            },
            child: const Text('Upgrade to Pro Plan', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('Account Setup', style: TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: theme.appBarTheme.backgroundColor ?? (isDark ? theme.cardColor : Colors.white),
        foregroundColor: theme.appBarTheme.foregroundColor ?? colorScheme.onSurface,
        elevation: 0,
      ),
      body: BlocBuilder<SettingsBloc, SettingsState>(
        builder: (context, state) {
          final planName = state.userPlan?.planType.toUpperCase() ?? 'PRO / LIFETIME';
          final isProTier = state.userPlan?.isPro == true || state.userPlan?.isLifetime == true || state.userPlan?.planType == 'enterprise' || state.userPlan?.planType == 'premium';
          
          if (!_initializedControllers && _draftLoaded && state.settings != null) {
            _businessNameController.text = _draftOr(
              'businessName',
              state.settings!.organizationName,
            );
            _phoneController.text = PhoneNumberInput.clamp(
              _draftOr('phone', state.settings!.phone),
            );
            _emailController.text = _draftOr('email', state.settings!.email ?? '');
            final savedAddress = AppSettings.isPlaceholderAddress(state.settings!.address)
                ? ''
                : state.settings!.address;
            _addressController.text = _draftOr('address', savedAddress);
            _cacController.text = _draftOr('cac', state.settings!.cacNumber ?? '');
            _taxIdController.text = _draftOr('taxId', state.settings!.taxId ?? '');
            _businessDescriptionController.text = _draftOr(
              'description',
              state.settings!.businessDescription ?? '',
            );
            if (_userNameController.text.trim().isEmpty) {
              _userNameController.text = _draftOr('ownerName', 'Administrator');
            } else {
              final draftedOwner = _formDraft['ownerName'];
              if (draftedOwner != null && draftedOwner.trim().isNotEmpty) {
                _userNameController.text = draftedOwner.trim();
              }
            }
            _initializedControllers = true;
          }

          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              // Premium Plan Status Badge
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: isProTier 
                        ? [colorScheme.primary, colorScheme.secondary]
                        : [Colors.blueGrey.shade800, Colors.blueGrey.shade900],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: (isProTier ? colorScheme.primary : Colors.blueGrey).withOpacity(0.2), 
                      blurRadius: 12, 
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'ACTIVE TIER PROFILE', 
                          style: const TextStyle(color: Colors.white70, fontSize: 11, letterSpacing: 1.2, fontWeight: FontWeight.w600),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: isProTier ? Colors.amberAccent : Colors.grey.shade300, 
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            isProTier ? 'PREMIUM ENABLED' : 'BASIC TIER', 
                            style: TextStyle(
                              color: isProTier ? Colors.black : Colors.blueGrey.shade900, 
                              fontSize: 9, 
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      planName,
                      style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      isProTier 
                          ? 'All advanced telemetry clusters, enterprise encryption relays, and cross-device sync channels are unlocked.'
                          : 'Standard operational metrics active. Upgrade to unlock multi-device live sync and enterprise node encryption.',
                      style: const TextStyle(color: Colors.white70, fontSize: 12, height: 1.4),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // ── 1. USER & BUSINESS PROFILE CARD ──
              Text(
                'User Profile & Business Details',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: colorScheme.primary),
              ),
              const SizedBox(height: 8),
              Text(
                'View and update your administrator contact profile, registered business name, phone number, email, and physical address.',
                style: TextStyle(fontSize: 11, color: colorScheme.onSurface.withOpacity(0.6)),
              ),
              const SizedBox(height: 16),

              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: theme.cardColor,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: colorScheme.primary.withOpacity(0.15)),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Profile Header Preview (Avatar + Name + Mode)
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 28,
                          backgroundColor: colorScheme.primary.withOpacity(0.12),
                          backgroundImage: (state.settings?.logo != null && state.settings!.logo!.isNotEmpty)
                              ? MemoryImage(state.settings!.logo!)
                              : null,
                          child: (state.settings?.logo == null || state.settings!.logo!.isEmpty)
                              ? Text(
                                  (_businessNameController.text.isNotEmpty ? _businessNameController.text[0] : 'I').toUpperCase(),
                                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: colorScheme.primary),
                                )
                              : null,
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _businessNameController.text.isNotEmpty ? _businessNameController.text : 'Invify Enterprise',
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: colorScheme.onSurface),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 3),
                              Text(
                                _userNameController.text.isNotEmpty ? _userNameController.text : 'Account Administrator',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: colorScheme.primary),
                              ),
                              const SizedBox(height: 3),
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: colorScheme.primary.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      (state.settings?.businessMode ?? 'Retail').toUpperCase(),
                                      style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: colorScheme.primary),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      _emailController.text.isNotEmpty ? _emailController.text : 'No email configured',
                                      style: TextStyle(fontSize: 10, color: colorScheme.onSurface.withOpacity(0.5)),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    const Divider(height: 1),
                    const SizedBox(height: 20),

                    // 1. Full Name / Contact Person
                    _buildProfileInputField(
                      controller: _userNameController,
                      label: 'Full Name / Contact Person',
                      hint: 'e.g. John Doe',
                      icon: Icons.person_outline_rounded,
                      theme: theme,
                    ),
                    const SizedBox(height: 14),

                    // 2. Email Address
                    _buildProfileInputField(
                      controller: _emailController,
                      label: 'Email Address',
                      hint: 'e.g. admin@business.com',
                      icon: Icons.email_outlined,
                      keyboardType: TextInputType.emailAddress,
                      theme: theme,
                    ),
                    const SizedBox(height: 14),

                    // 3. Authorized Phone Number
                    _buildProfileInputField(
                      controller: _phoneController,
                      label: 'Authorized Phone Contact',
                      hint: 'e.g. +234 800 000 0000',
                      icon: Icons.phone_outlined,
                      keyboardType: TextInputType.phone,
                      inputFormatters: PhoneNumberInput.formatters,
                      maxLength: PhoneNumberInput.maxDigits,
                      theme: theme,
                    ),
                    const SizedBox(height: 14),

                    // 4. Organization / Business Name
                    _buildProfileInputField(
                      controller: _businessNameController,
                      label: 'Organization / Business Name',
                      hint: 'e.g. Invify Enterprise',
                      icon: Icons.business_outlined,
                      readOnly: isProTier,
                      theme: theme,
                      suffixIcon: isProTier
                          ? Tooltip(
                              message: 'Organization bound permanently under Pro Cloud Linkage relay.',
                              child: Icon(Icons.lock_rounded, size: 16, color: Colors.amber.shade700),
                            )
                          : null,
                    ),
                    const SizedBox(height: 14),

                    // 5. Business Physical Address
                    _buildProfileInputField(
                      controller: _addressController,
                      label: 'Business Physical Address',
                      hint: 'e.g. 123 Commercial Way, Victoria Island, Lagos',
                      icon: Icons.location_on_outlined,
                      maxLines: 2,
                      theme: theme,
                    ),
                    const SizedBox(height: 14),

                    // 6. CAC Registration Number
                    _buildProfileInputField(
                      controller: _cacController,
                      label: 'CAC Registration Number',
                      hint: 'e.g. RC-123456 or BN-987654',
                      icon: Icons.corporate_fare_rounded,
                      theme: theme,
                    ),
                    const SizedBox(height: 14),

                    // 7. Tax Identification Number (TIN)
                    _buildProfileInputField(
                      controller: _taxIdController,
                      label: 'Tax Identification Number (TIN / VAT)',
                      hint: 'e.g. 12345678-0001 (Optional)',
                      icon: Icons.receipt_long_outlined,
                      theme: theme,
                    ),
                    const SizedBox(height: 14),

                    // 8. Nature of Business / Description
                    _buildProfileInputField(
                      controller: _businessDescriptionController,
                      label: 'Nature of Business / Description',
                      hint: 'e.g. Retail fashion store, food distributor, or academy',
                      icon: Icons.description_outlined,
                      maxLines: 2,
                      theme: theme,
                    ),
                    const SizedBox(height: 18),

                    // CAC Document Upload UI
                    Text(
                      'CAC Certificate / Registration Document',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: colorScheme.onSurface),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _uploadCacDocument(ImageSource.gallery),
                            icon: const Icon(Icons.photo_library, size: 16),
                            label: const Text('Upload Gallery'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _uploadCacDocument(ImageSource.camera),
                            icon: const Icon(Icons.camera_alt, size: 16),
                            label: const Text('Capture Camera'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Save Profile Details Button
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: colorScheme.primary,
                          foregroundColor: colorScheme.onPrimary,
                          elevation: 2,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.save_rounded, size: 18),
                        label: const Text(
                          'Save Profile Changes',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 0.3),
                        ),
                        onPressed: () => _saveProfileDetails(context, state),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // ── 2. HARDWARE DEVICE ENROLLMENT & RELAY SETUP ──
              Text(
                'Device Hardware Enrollment & Node Relay',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: colorScheme.primary),
              ),
              const SizedBox(height: 8),
              Text(
                'Preloaded device hardware serial matching cloud tenant node. Verify link status or manage your Pro subscription.',
                style: TextStyle(fontSize: 11, color: colorScheme.onSurface.withOpacity(0.6)),
              ),
              const SizedBox(height: 16),

              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: theme.cardColor,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: colorScheme.primary.withOpacity(0.15)),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Pre-loaded Device Serial Output (Read-only)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white12 : colorScheme.primary.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.memory_rounded, color: colorScheme.primary, size: 20),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Preloaded Hardware Serial Number', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: colorScheme.primary)),
                                const SizedBox(height: 2),
                                Text(_deviceSuffix, style: TextStyle(fontWeight: FontWeight.bold, fontFamily: 'monospace', fontSize: 14, color: colorScheme.onSurface)),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: isDark ? Colors.white24 : colorScheme.primary.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text('READ-ONLY', style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: colorScheme.primary)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Target Production Node & UUID
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white10 : Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: colorScheme.onSurface.withOpacity(0.08)),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.fingerprint_rounded, color: colorScheme.secondary, size: 20),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Persistent Device UUID', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: colorScheme.onSurface.withOpacity(0.7))),
                                const SizedBox(height: 2),
                                Text(_persistentId, style: TextStyle(fontFamily: 'monospace', fontSize: 11, color: colorScheme.onSurface.withOpacity(0.8))),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    if (isProTier) ...[
                      // Next Activation Date View
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: colorScheme.primary.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: colorScheme.primary.withOpacity(0.2)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: colorScheme.primary.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(Icons.event_available_rounded, color: colorScheme.primary, size: 20),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Next Plan Expected Renewal',
                                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: colorScheme.primary),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    state.userPlan?.expiryDate != null
                                        ? '${state.userPlan!.expiryDate!.toLocal().toString().split(' ')[0]} (Active Relay)'
                                        : 'Lifetime / Unrestricted Node Relay',
                                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: colorScheme.onSurface),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Downgrade Plan Button
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: colorScheme.error,
                            side: BorderSide(color: colorScheme.error.withOpacity(0.3)),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          icon: const Icon(Icons.arrow_downward_rounded, size: 16),
                          label: const Text('Downgrade Subscription to Basic', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                          onPressed: () {
                            FocusScope.of(context).unfocus();
                            showDialog(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                backgroundColor: Theme.of(context).cardColor,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                                title: Row(
                                  children: [
                                    Icon(Icons.warning_amber_rounded, color: colorScheme.error),
                                    const SizedBox(width: 8),
                                    const Text('Confirm Downgrade', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                                content: const Text(
                                  'Are you sure you want to downgrade your active subscription profile to Basic Tier? Enterprise telemetry channels and encryption keys will transition to local sandbox boundaries.',
                                  style: TextStyle(fontSize: 13, height: 1.4),
                                ),
                                actions: [
                                  TextButton(
                                    onPressed: () => Navigator.pop(ctx),
                                    child: const Text('Cancel'),
                                  ),
                                  ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: colorScheme.error,
                                      foregroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    ),
                                    onPressed: () async {
                                      Navigator.pop(ctx);
                                      await StorageService.clearProExpiryDate();
                                      if (mounted) {
                                        context.read<SettingsBloc>().add(LoadSettings());
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            content: const Text('Plan profile transitioned to Basic Tier.'),
                                            backgroundColor: colorScheme.secondary,
                                          ),
                                        );
                                      }
                                    },
                                    child: const Text('Confirm Downgrade', style: TextStyle(fontWeight: FontWeight.bold)),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
                    ] else ...[
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: colorScheme.primary,
                            foregroundColor: colorScheme.onPrimary,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          icon: const Icon(Icons.cloud_done_rounded, size: 18),
                          label: const Text('Confirm Enrollment & Upgrade to Pro Plan', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          onPressed: () async {
                            FocusScope.of(context).unfocus();

                            await _persistFormDraft();

                            // 1. Mandatory KYC Upload for Pro users
                            final kycCompleted = await Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const TenantKycUploadPage()),
                            );

                            if (kycCompleted != true) {
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: const Text('KYC is mandatory for the Pro version. Please upload the required documents.'),
                                    backgroundColor: Colors.orange.shade800,
                                  ),
                                );
                              }
                              return;
                            }

                            // Save data locally first
                            if (state.settings != null) {
                              final updatedSettings = state.settings!.copyWith(
                                organizationName: _businessNameController.text.trim().isNotEmpty
                                    ? _businessNameController.text.trim()
                                    : state.settings!.organizationName,
                                phone: _phoneController.text.trim().isNotEmpty
                                    ? _phoneController.text.trim()
                                    : state.settings!.phone,
                                email: _emailController.text.trim(),
                                address: () {
                                  final typed = _addressController.text.trim();
                                  if (typed.isEmpty ||
                                      AppSettings.isPlaceholderAddress(typed)) {
                                    return '';
                                  }
                                  return typed;
                                }(),
                                cacNumber: _cacController.text.trim(),
                                taxId: _taxIdController.text.trim(),
                                businessDescription: _businessDescriptionController.text.trim(),
                              );
                              context.read<SettingsBloc>().add(UpdateAppSettings(updatedSettings));
                              final adminName = _userNameController.text.trim();
                              if (adminName.isNotEmpty) {
                                await _storage.write(key: 'account_profile_owner_name', value: adminName);
                              }
                            }

                            // Derive real live production tenant namespace
                            final cleanOrg = _businessNameController.text.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '-');
                            final derivedTenant = '$cleanOrg-$_deviceSuffix';

                            await SecurityService().setTenantId(derivedTenant);

                            bool networkSuccess = false;
                            String errorMessage = 'Server connection timeout.';

                            // Execute live authenticated HTTP post request broadcast to remote server container
                            try {
                              final client = sl<FinanceRepository>().apiClient;
                              final payload = {
                                'organization_name': _businessNameController.text.trim(),
                                'owner_name': _userNameController.text.trim(),
                                'email': _emailController.text.trim(),
                                'phone_contact': _phoneController.text.trim(),
                                'address': _addressController.text.trim(),
                                'cac_number': _cacController.text.trim(),
                                'tax_id': _taxIdController.text.trim(),
                                'business_description': _businessDescriptionController.text.trim(),
                                'device_serial_hash': _deviceSuffix,
                                'persistent_uuid': _persistentId,
                                'derived_tenant_id': derivedTenant,
                                'platform': kIsWeb ? 'web' : Platform.operatingSystem,
                                'plan': state.userPlan?.planType ?? 'pro',
                                'business_mode': state.settings?.businessMode ?? 'retail',
                              };

                              debugPrint('*** Executing Live Network Handshake Dispatch ***');
                              debugPrint('POST /api/admin/register-device');
                              debugPrint('Payload: $payload');

                              await ProgressDialogUtils.showDancingProgress(
                                context,
                                () async => await client.post('/api/admin/register-device', data: payload),
                                message: 'Registering edge node identity matrix...',
                              );
                              networkSuccess = true;
                            } catch (e) {
                              debugPrint('Network Relay caught fallback trace: $e');
                              errorMessage = e.toString().replaceAll('FinanceApiException', 'Server API Exception');
                              networkSuccess = false;
                            }

                            if (mounted) {
                              if (networkSuccess) {
                                _showUpgradePrompt(derivedTenant);
                              } else {
                                showDialog(
                                  context: context,
                                  builder: (ctx) => AlertDialog(
                                    backgroundColor: Theme.of(context).cardColor,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                                    title: Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(8),
                                          decoration: BoxDecoration(color: Colors.red.shade50, shape: BoxShape.circle),
                                          child: Icon(Icons.cloud_off_rounded, color: Colors.red.shade700),
                                        ),
                                        const SizedBox(width: 12),
                                        const Expanded(
                                          child: Text(
                                            'Server Connection Error',
                                            style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                      ],
                                    ),
                                    content: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'Unable to establish a real-time secure link with the cloud node cluster. The remote endpoint returned an error or timed out.',
                                          style: TextStyle(fontSize: 13, height: 1.4),
                                        ),
                                        const SizedBox(height: 12),
                                        Container(
                                          padding: const EdgeInsets.all(10),
                                          decoration: BoxDecoration(
                                            color: Theme.of(context).brightness == Brightness.dark ? Colors.white10 : Colors.grey.shade50,
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Text(
                                            errorMessage,
                                            style: TextStyle(fontFamily: 'monospace', fontSize: 11, color: Theme.of(context).colorScheme.error),
                                          ),
                                        ),
                                        const SizedBox(height: 12),
                                        Row(
                                          children: [
                                            Icon(Icons.save_alt_rounded, size: 14, color: Colors.green.shade600),
                                            const SizedBox(width: 6),
                                            Expanded(
                                              child: Text(
                                                'Data Protected: Entered credentials have been preserved locally.',
                                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.green.shade600),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                    actions: [
                                      ElevatedButton(
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: Theme.of(context).colorScheme.primary,
                                          foregroundColor: Theme.of(context).colorScheme.onPrimary,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                        ),
                                        onPressed: () => Navigator.pop(ctx),
                                        child: const Text('Acknowledge & Close', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                      ),
                                    ],
                                  ),
                                );
                              }
                            }
                          },
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 32),
              Text(
                'Cloud Engine Integration',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: colorScheme.primary),
              ),
              const SizedBox(height: 16),

              // 1. Claude Backup Toggle
              _buildSetupCard(
                theme: theme,
                title: 'Claude Backup Engine',
                subtitle: 'Enable continuous client encryption and background sync to private Claude storage models.',
                icon: Icons.cloud_upload_rounded,
                iconColor: colorScheme.secondary,
                value: _claudeBackupEnabled,
                onChanged: (val) => _handleEnterpriseToggle(
                  requestedValue: val,
                  isProTier: isProTier,
                  featureName: 'Claude Backup Engine',
                  storageKey: 'toggle_claude_backup',
                  onUpdateState: (updated) {
                    setState(() => _claudeBackupEnabled = updated);
                    _showToast(updated ? 'Claude backup engine armed.' : 'Claude backup paused.');
                    if (updated) _triggerClaudeBackup();
                  },
                ),
              ),

              const SizedBox(height: 16),

              // 2. Virtual Account Generation
              _buildSetupCard(
                theme: theme,
                title: 'Virtual Account Engine',
                subtitle: 'Dynamically generate dedicated local checking references for transparent ${state.settings?.customerLabel.toLowerCase() ?? 'customer'} invoicing.',
                icon: Icons.account_balance_rounded,
                iconColor: Colors.teal,
                value: _virtualAccountsEnabled,
                onChanged: (val) => _handleEnterpriseToggle(
                  requestedValue: val,
                  isProTier: isProTier,
                  featureName: 'Virtual Account Engine',
                  storageKey: 'toggle_virtual_account',
                  onUpdateState: (updated) {
                    setState(() => _virtualAccountsEnabled = updated);
                    _showToast(updated ? 'Virtual Account dispatch initialized.' : 'Virtual accounts deactivated.');
                    if (updated) _initVirtualAccountEngine();
                  },
                ),
              ),

              const SizedBox(height: 32),
              Text(
                'Hardware Linkage & Security',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: colorScheme.primary),
              ),
              const SizedBox(height: 16),

              // 3. Multi Device Linkage
              _buildSetupCard(
                theme: theme,
                title: 'Multi-Device Linkage Relay',
                subtitle: 'Allow auxiliary network terminals and mobile PoS screens to interface with your master ledger.',
                icon: Icons.devices_other_rounded,
                iconColor: Colors.blueAccent,
                value: _multiDeviceLinkage,
                onChanged: (val) => _handleEnterpriseToggle(
                  requestedValue: val,
                  isProTier: isProTier,
                  featureName: 'Multi-Device Linkage Relay',
                  storageKey: 'toggle_multi_device',
                  onUpdateState: (updated) {
                    setState(() => _multiDeviceLinkage = updated);
                    _showToast(updated ? 'Multi-device handshakes accepting.' : 'Terminal routing locked to primary display.');
                  },
                ),
              ),

              const SizedBox(height: 16),

              // 4. Auto sync local ledger
              _buildSetupCard(
                theme: theme,
                title: 'Continuous Background Stream',
                subtitle: 'Automatically flush cached transactions and offline metrics to your dashboard upon connection restoration.',
                icon: Icons.sync_rounded,
                iconColor: Colors.green,
                value: _autoSyncLedger,
                onChanged: (val) => _handleEnterpriseToggle(
                  requestedValue: val,
                  isProTier: isProTier,
                  featureName: 'Continuous Background Stream',
                  storageKey: 'toggle_auto_sync',
                  onUpdateState: (updated) {
                    setState(() => _autoSyncLedger = updated);
                    _showToast(updated ? 'Background polling continuous.' : 'Manual telemetry index selected.');
                  },
                ),
              ),
              const SizedBox(height: 24),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSetupCard({
    required ThemeData theme,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8, offset: const Offset(0, 2)),
        ],
        border: Border.all(color: colorScheme.onSurface.withOpacity(0.05)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark ? iconColor.withOpacity(0.15) : iconColor.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: iconColor, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: colorScheme.onSurface)),
                const SizedBox(height: 4),
                Text(subtitle, style: TextStyle(color: colorScheme.onSurface.withOpacity(0.6), fontSize: 11, height: 1.3)),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Switch.adaptive(
            value: value,
            activeColor: colorScheme.primary,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }

  void _showToast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(milliseconds: 1500),
      ),
    );
  }

  FinanceApiClient _safeClient() {
    if (!sl.isRegistered<FinanceApiClient>()) {
      sl.registerSingleton<FinanceApiClient>(FinanceApiClient(
        baseUrl: AppConfig.baseUrl,
        getToken: () async => await SecurityService().getOfflineToken() ?? 'mock-super-admin',
        getTenantId: () async => await SecurityService().getTenantId(),
      ));
    }
    return sl<FinanceApiClient>();
  }

  void _handleEnterpriseToggle({
    required bool requestedValue,
    required bool isProTier,
    required String featureName,
    required String storageKey,
    required ValueChanged<bool> onUpdateState,
  }) async {
    if (requestedValue && !isProTier) {
      // Trigger Pro Plan Upgrade Gate Dialog
      _showFeatureUpgradePrompt(featureName);
      return; // Leave the toggle in the OFF state!
    }
    await _storage.write(key: storageKey, value: requestedValue ? 'true' : 'false');
    onUpdateState(requestedValue);
  }

  Future<void> _uploadCacDocument(ImageSource source) async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: source);
    if (pickedFile == null) return;

    if (!mounted) return;

    try {
      await ProgressDialogUtils.showDancingProgress(context, () async {
        final client = _safeClient();
        final formData = FormData.fromMap({
          'cac_document': await MultipartFile.fromFile(pickedFile.path, filename: 'cac_document.jpg'),
        });

        final response = await client.post('/api/admin/upload-cac', data: formData);
        if (mounted) {
          if (response.statusCode == 200) {
            _showToast('CAC Document uploaded successfully!');
          } else {
            _showToast('Upload failed: ${response.data}');
          }
        }
      }, message: 'Uploading CAC Document...');
    } catch (e) {
      if (mounted) {
        _showToast('Error uploading document: $e');
      }
    }
  }

  Future<void> _triggerClaudeBackup() async {
    if (!mounted) return;
    try {
      await ProgressDialogUtils.showDancingProgress(context, () async {
        final dbFolder = await getApplicationDocumentsDirectory();
        final dbPath = '${dbFolder.path}/app_database.db';
        final file = File(dbPath);
        
        if (!await file.exists()) {
          if (mounted) _showToast('Local database not found.');
          return;
        }

        final client = _safeClient();
        final formData = FormData.fromMap({
          'backup_file': await MultipartFile.fromFile(dbPath, filename: 'app_database_backup_${DateTime.now().millisecondsSinceEpoch}.db'),
        });

        await client.post('/api/admin/claude-backup', data: formData);
        if (mounted) {
          _showToast('Backup successfully synchronized to Claude Engine');
        }
      }, message: 'Syncing database to Claude Engine...');
    } catch (e) {
      if (mounted) {
        _showToast('Claude Backup failed: $e');
        setState(() => _claudeBackupEnabled = false);
        _storage.write(key: 'toggle_claude_backup', value: 'false');
      }
    }
  }

  Future<void> _initVirtualAccountEngine() async {
    if (!mounted) return;
    bool success = false;
    try {
      await ProgressDialogUtils.showDancingProgress(context, () async {
        final client = _safeClient();
        await client.post('/api/admin/virtual-account/init');
        success = true;
      }, message: 'Configuring Quasar Virtual Accounts...');
    } catch (e) {
      if (mounted) {
        _showToast('Failed to initialize Virtual Accounts: $e');
        setState(() => _virtualAccountsEnabled = false);
        _storage.write(key: 'toggle_virtual_account', value: 'false');
      }
    }

    if (success && mounted) {
      _showVirtualAccountWelcomeDialog();
    }
  }

  void _showVirtualAccountWelcomeDialog() {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          backgroundColor: theme.cardColor,
          elevation: 12,
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: Colors.teal.shade50,
                          shape: BoxShape.circle,
                        ),
                      ),
                      Positioned(
                        right: 4,
                        top: 4,
                        child: Icon(Icons.auto_awesome, color: Colors.amber.shade600, size: 16),
                      ),
                      Positioned(
                        left: 8,
                        bottom: 8,
                        child: Icon(Icons.auto_awesome, color: Colors.amber.shade500, size: 12),
                      ),
                      Icon(
                        Icons.workspace_premium_rounded,
                        color: Colors.teal.shade700,
                        size: 44,
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Congratulations!',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: colorScheme.primary,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Virtual Account Engine Active',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: colorScheme.onSurface.withOpacity(0.8),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.teal.shade50.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.teal.shade100.withOpacity(0.5)),
                    ),
                    child: Column(
                      children: [
                        Text(
                          'Your dedicated virtual payment routing infrastructure is now fully initialized.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 13,
                            height: 1.5,
                            color: colorScheme.onSurface.withOpacity(0.9),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(Icons.check_circle_rounded, color: Colors.teal.shade600, size: 18),
                            const SizedBox(width: 8),
                            const Expanded(
                              child: Text(
                                'Unique bank accounts for each customer',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(Icons.check_circle_rounded, color: Colors.teal.shade600, size: 18),
                            const SizedBox(width: 8),
                            const Expanded(
                              child: Text(
                                'Direct real-time ledger balance updates',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(Icons.check_circle_rounded, color: Colors.teal.shade600, size: 18),
                            const SizedBox(width: 8),
                            const Expanded(
                              child: Text(
                                'Instant webhook push notifications',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.teal.shade700,
                        foregroundColor: Colors.white,
                        elevation: 2,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text(
                        'Get Started',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Future<void> _saveProfileDetails(BuildContext context, SettingsState state) async {
    FocusScope.of(context).unfocus();
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final settingsBloc = context.read<SettingsBloc>();
    final messenger = ScaffoldMessenger.of(context);

    if (state.settings != null) {
      final updatedSettings = state.settings!.copyWith(
        organizationName: _businessNameController.text.trim().isNotEmpty
            ? _businessNameController.text.trim()
            : state.settings!.organizationName,
        phone: _phoneController.text.trim().isNotEmpty
            ? _phoneController.text.trim()
            : state.settings!.phone,
        email: _emailController.text.trim(),
        address: () {
          final typed = _addressController.text.trim();
          if (typed.isEmpty || AppSettings.isPlaceholderAddress(typed)) {
            return '';
          }
          return typed;
        }(),
        cacNumber: _cacController.text.trim(),
        taxId: _taxIdController.text.trim(),
        businessDescription: _businessDescriptionController.text.trim(),
      );

      final adminName = _userNameController.text.trim();
      if (adminName.isNotEmpty) {
        await _storage.write(key: 'account_profile_owner_name', value: adminName);
      }

      if (mounted) {
        settingsBloc.add(UpdateAppSettings(updatedSettings));
        messenger.showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
                SizedBox(width: 10),
                Expanded(
                  child: Text('User profile & business details saved successfully!'),
                ),
              ],
            ),
            backgroundColor: colorScheme.primary,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    }
  }

  Widget _buildProfileInputField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    required ThemeData theme,
    String? hint,
    int maxLines = 1,
    TextInputType keyboardType = TextInputType.text,
    List<TextInputFormatter>? inputFormatters,
    int? maxLength,
    bool readOnly = false,
    Widget? suffixIcon,
  }) {
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 15, color: colorScheme.primary),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: colorScheme.onSurface.withOpacity(0.85),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          readOnly: readOnly,
          maxLines: maxLines,
          maxLength: maxLength,
          inputFormatters: inputFormatters,
          keyboardType: keyboardType,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: readOnly ? colorScheme.onSurface.withOpacity(0.5) : colorScheme.onSurface,
          ),
          decoration: InputDecoration(
            filled: true,
            fillColor: readOnly
                ? (isDark ? Colors.white12 : Colors.grey.shade200)
                : (isDark ? Colors.white10 : Colors.grey.shade50),
            hintText: hint,
            hintStyle: TextStyle(
              fontSize: 12,
              color: colorScheme.onSurface.withOpacity(0.35),
            ),
            contentPadding: EdgeInsets.symmetric(
              horizontal: 14,
              vertical: maxLines > 1 ? 12 : 10,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: colorScheme.onSurface.withOpacity(0.12)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: colorScheme.onSurface.withOpacity(0.08)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: colorScheme.primary, width: 1.5),
            ),
            suffixIcon: suffixIcon,
          ),
        ),
      ],
    );
  }

  void _showFeatureUpgradePrompt(String featureName) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: theme.cardColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: Colors.amber.shade50, shape: BoxShape.circle),
              child: Icon(Icons.workspace_premium_rounded, color: Colors.amber.shade700),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Pro Tier Locked', 
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: colorScheme.onSurface),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'The advanced feature cluster "$featureName" requires an active Enterprise or Pro Plan subscription to relay continuous telemetry updates.',
              style: TextStyle(fontSize: 13, height: 1.4, color: colorScheme.onSurface.withOpacity(0.8)),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: colorScheme.primary.withOpacity(0.05),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.security_rounded, size: 16, color: colorScheme.primary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Unlock instantly to activate continuous off-site streaming protocols.',
                      style: TextStyle(fontSize: 10, color: colorScheme.primary, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Keep Basic Mode', style: TextStyle(color: colorScheme.onSurface.withOpacity(0.5))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: colorScheme.primary,
              foregroundColor: colorScheme.onPrimary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ActivationPage()),
              );
            },
            child: const Text('Upgrade Subscription', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
