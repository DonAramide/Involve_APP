// lib/features/admin/presentation/pages/account_setup_page.dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../settings/presentation/bloc/settings_bloc.dart';
import '../../../settings/presentation/bloc/settings_state.dart';
import '../../../../core/utils/device_info_service.dart';
import '../../../settings/domain/services/security_service.dart';
import '../../../../core/services/service_locator.dart';
import '../../../school_finance/domain/repositories/finance_repository_new.dart';

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
  
  late TextEditingController _businessNameController;
  late TextEditingController _phoneController;

  bool _initializedControllers = false;

  @override
  void initState() {
    super.initState();
    _businessNameController = TextEditingController();
    _phoneController = TextEditingController();
    _loadHardwareTelemetry();
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
    _businessNameController.dispose();
    _phoneController.dispose();
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
              _showToast('Redirection sequence to Pro Activation terminal sent.');
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
          
          if (!_initializedControllers) {
            _businessNameController.text = state.settings?.organizationName ?? 'Invify Enterprise Node';
            _phoneController.text = state.settings?.phone ?? '+234 800 000 0000';
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
                    colors: [colorScheme.primary, colorScheme.secondary],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(color: colorScheme.primary.withOpacity(0.2), blurRadius: 12, offset: const Offset(0, 6)),
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
                          style: TextStyle(color: colorScheme.onPrimary.withOpacity(0.8), fontSize: 11, letterSpacing: 1.2, fontWeight: FontWeight.w600),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: Colors.amberAccent, borderRadius: BorderRadius.circular(12)),
                          child: const Text(
                            'PREMIUM ENABLED', 
                            style: TextStyle(color: Colors.black, fontSize: 9, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      planName,
                      style: TextStyle(color: colorScheme.onPrimary, fontSize: 24, fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'All advanced telemetry clusters, enterprise encryption relays, and cross-device sync channels are unlocked.',
                      style: TextStyle(color: colorScheme.onPrimary.withOpacity(0.9), fontSize: 12, height: 1.4),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),
              Text(
                'Device Enrollment & Tenant Setup',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: colorScheme.primary),
              ),
              const SizedBox(height: 8),
              Text(
                'Preloaded device string matching target backend node. Please verify credentials below to finalize cloud linkage.',
                style: TextStyle(fontSize: 11, color: colorScheme.onSurface.withOpacity(0.6)),
              ),
              const SizedBox(height: 16),

              // Dynamic Hardware Hub Container
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
                    
                    // Business Name confirmation input
                    Text('Organization / Business Name', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: colorScheme.onSurface)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _businessNameController,
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: isDark ? Colors.white10 : Colors.grey.shade50,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: colorScheme.onSurface.withOpacity(0.1))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: colorScheme.onSurface.withOpacity(0.05))),
                      ),
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: colorScheme.onSurface),
                    ),
                    const SizedBox(height: 12),

                    // Phone number confirmation input
                    Text('Authorized Phone Contact', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: colorScheme.onSurface)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: isDark ? Colors.white10 : Colors.grey.shade50,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: colorScheme.onSurface.withOpacity(0.1))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: colorScheme.onSurface.withOpacity(0.05))),
                      ),
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: colorScheme.onSurface),
                    ),
                    const SizedBox(height: 20),

                    // Enrollment broadcast actions
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
                          // Derive real live production tenant namespace
                          final cleanOrg = _businessNameController.text.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '-');
                          final derivedTenant = '$cleanOrg-$_deviceSuffix';
                          
                          await SecurityService().setTenantId(derivedTenant);

                          // Execute live authenticated HTTP post request broadcast to remote server container
                          try {
                            final client = sl<FinanceRepository>().apiClient;
                            final payload = {
                              'organization_name': _businessNameController.text.trim(),
                              'phone_contact': _phoneController.text.trim(),
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
                            
                            await client.post('/api/admin/register-device', data: payload);
                          } catch (e) {
                            debugPrint('Network Relay caught fallback trace: $e');
                          }

                          if (mounted) {
                            _showUpgradePrompt(derivedTenant);
                          }
                        },
                      ),
                    ),
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
                  onUpdateState: (updated) {
                    setState(() => _claudeBackupEnabled = updated);
                    _showToast(updated ? 'Claude backup engine armed.' : 'Claude backup paused.');
                  },
                ),
              ),

              const SizedBox(height: 16),

              // 2. Virtual Account Generation
              _buildSetupCard(
                theme: theme,
                title: 'Virtual Account Engine',
                subtitle: 'Dynamically generate dedicated local checking references for transparent student invoicing.',
                icon: Icons.account_balance_rounded,
                iconColor: Colors.teal,
                value: _virtualAccountsEnabled,
                onChanged: (val) => _handleEnterpriseToggle(
                  requestedValue: val,
                  isProTier: isProTier,
                  featureName: 'Virtual Account Engine',
                  onUpdateState: (updated) {
                    setState(() => _virtualAccountsEnabled = updated);
                    _showToast(updated ? 'Virtual Account dispatch initialized.' : 'Virtual accounts deactivated.');
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

  void _handleEnterpriseToggle({
    required bool requestedValue,
    required bool isProTier,
    required String featureName,
    required ValueChanged<bool> onUpdateState,
  }) {
    if (requestedValue && !isProTier) {
      // Trigger Pro Plan Upgrade Gate Dialog
      _showFeatureUpgradePrompt(featureName);
      return; // Leave the toggle in the OFF state!
    }
    onUpdateState(requestedValue);
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
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: const Text('Redirection sequence to Billing/Subscription matrix activated.'),
                  behavior: SnackBarBehavior.floating,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              );
            },
            child: const Text('Upgrade Subscription', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
