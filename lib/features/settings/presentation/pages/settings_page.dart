import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'dart:typed_data';
import 'package:image_picker/image_picker.dart'; // For logo picking
import 'package:image_cropper/image_cropper.dart'; 
import 'dart:ui' as ui;
import '../../../../core/utils/validators.dart';
import '../../../../core/utils/logo_processor.dart';
import '../bloc/settings_bloc.dart';
import '../bloc/settings_state.dart';
import '../widgets/password_dialog.dart';
import '../widgets/super_admin_dialog.dart';
import '../widgets/super_admin_password_dialog.dart';
import '../../../../core/license/license_service.dart';
import '../../../../core/license/license_model.dart';
import '../../../../core/license/license_history_table.dart';
import 'package:involve_app/features/activation/presentation/pages/activation_page.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';
import '../../domain/entities/settings.dart';
import '../widgets/upgrade_dialog.dart';
import 'package:involve_app/core/widgets/restart_widget.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_colorpicker/flutter_colorpicker.dart';
import '../bloc/staff_bloc.dart';
import '../bloc/staff_state.dart';
import '../../domain/entities/staff.dart';
import '../../../../core/sync/presentation/pages/device_sync_page.dart';
import 'package:file_picker/file_picker.dart';
import '../widgets/business_mode_selector.dart';
import 'package:involve_app/core/services/service_locator.dart';
import 'package:involve_app/core/services/finance_api_client.dart';
import 'package:involve_app/core/utils/app_config.dart';
import 'package:involve_app/features/settings/domain/services/security_service.dart';
import 'package:involve_app/core/utils/progress_dialog_utils.dart';
import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  String _searchQuery = '';
  bool _isSearching = false;
  bool _isLoadingDialogShowing = false;
  final TextEditingController _searchController = TextEditingController();

  bool _matches(String title, [List<String>? keywords]) {
    if (_searchQuery.isEmpty) return true;
    final q = _searchQuery.toLowerCase();
    if (title.toLowerCase().contains(q)) return true;
    if (keywords != null) {
      for (final k in keywords) {
        if (k.toLowerCase().contains(q)) return true;
      }
    }
    return false;
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<SettingsBloc, SettingsState>(
      builder: (context, state) {
        final bool isAuthorized = state.isAuthorized;
        return Scaffold(
          appBar: AppBar(
            title: _isSearching 
              ? TextField(
                  controller: _searchController,
                  autofocus: true,
                  decoration: InputDecoration(
                    hintText: 'Search settings...',
                    border: InputBorder.none,
                    hintStyle: TextStyle(color: Theme.of(context).textTheme.bodyLarge?.color?.withOpacity(0.6) ?? Colors.black54),
                  ),
                  style: TextStyle(color: Theme.of(context).textTheme.bodyLarge?.color ?? Colors.black),
                  onChanged: (val) => setState(() => _searchQuery = val),
                )
              : const Text('System Settings'),
            actions: [
              if (isAuthorized)
                IconButton(
                  icon: Icon(_isSearching ? Icons.close : Icons.search),
                  onPressed: () {
                    setState(() {
                      if (_isSearching) {
                        _searchQuery = '';
                        _searchController.clear();
                      }
                      _isSearching = !_isSearching;
                    });
                  },
                ),
            ],
          ),
          body: BlocListener<SettingsBloc, SettingsState>(
            listener: (context, state) {
              if (state.needsRestart) {
                 // Restart handles its own cleanup by destroying the UI
                RestartWidget.restartApp(context);
              }
              
              if (state.error != null) {
                _hideLoadingDialog(context);
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.error!), backgroundColor: Colors.red));
              }
              
              if (state.successMessage != null && !state.needsRestart) {
                _hideLoadingDialog(context);
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.successMessage!), backgroundColor: Colors.green));
              }
            },
            child: _buildBody(context, state),
          ),
        );
      },
    );
  }

  Widget _buildBody(BuildContext context, SettingsState state) {
    if (state.isLoading) return const InvifyLoadingIndicator(message: 'LOADING SYSTEM SETTINGS...');
    // Authorization check removed per user request for normal settings view

    final settings = state.settings!;
    final isSuperAdmin = state.isDeviceAuthorized;

    final List<Widget> listItems = [
      if (_searchQuery.isEmpty) ...[
        _buildActivationBanner(context, state),
        const SizedBox(height: 10),
      ],
      if (_matches('Activation History', ['license', 'subscription'])) ...[
        _buildActivationHistoryTile(context),
        const SizedBox(height: 10),
      ],
      
      // Business Mode
      if (_matches('Business Mode', ['school', 'retail', 'operation'])) ...[
        BusinessModeSelector(
          settings: settings,
          isLocked: state.isModeLocked,
          onModeChanged: (val) => _handleModeChange(context, settings, val),
        ),
        const SizedBox(height: 10),
      ],

      // Preferences Section (Moved to Admin Hub)

      // Account Details (Moved to Admin Hub)

      // Service Billing

      if (_matches('Service Billing', ['config', 'types', 'half day'])) ...[
        _buildServiceBillingTile(context, settings, state),
        if (settings.serviceBillingEnabled) ...[
          _buildServiceTypesSection(context, settings),
          _buildHalfDayConfigSection(context, settings),
        ],
        const Divider(),
      ],


      // Startup & State Persistence
      // Startup & State Persistence
      if (_matches('Startup & State Persistence', ['splash', 'last state', 'restore'])) ...[
        _buildSectionHeader(context, 'Startup & State Persistence'),
        _buildSwitchTile(
          'Skip Splash Screen', 
          settings.skipSplash, 
          (val) => _update(context, settings.copyWith(skipSplash: val)),
        ),
        if (settings.businessMode == 'school')
          _buildSwitchTile(
            'Show Logo as Menu Background', 
            settings.showLogoAsMenuBackground, 
            (val) => _update(context, settings.copyWith(showLogoAsMenuBackground: val)),
          ),
        _buildSwitchTile(
          'Always Restore Last State', 
          settings.restoreLastState, 
          (val) => _update(context, settings.copyWith(restoreLastState: val)),
        ),
        const Divider(),
      ],

      // Maintenance
      if (_matches('Maintenance', ['backup', 'export', 'sync', 'restore', 'date', 'time', 'total sales', 'update', 'download', 'ota'])) ...[
        _buildSectionHeader(context, 'Maintenance'),
        if (_matches('Re-download System Update', ['update', 'download', 'ota']))
          FutureBuilder<SharedPreferences>(
            future: SharedPreferences.getInstance(),
            builder: (context, snapshot) {
              final urlString = snapshot.hasData ? snapshot.data!.getString('last_ota_url') : null;
              final version = snapshot.hasData ? (snapshot.data!.getString('last_ota_version') ?? 'Unknown') : 'Unknown';
              return ListTile(
                title: const Text('Re-download System Update'),
                subtitle: Text(urlString != null ? 'Download the latest pushed version (v$version)' : 'No recent updates available to download'),
                trailing: Icon(Icons.system_update, color: urlString != null ? Colors.cyan : Colors.grey),
                enabled: urlString != null,
                onTap: urlString == null ? null : () async {
                  final Uri url = Uri.parse(urlString);
                  if (await canLaunchUrl(url)) {
                    await launchUrl(url, mode: LaunchMode.externalApplication);
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not launch update URL.')));
                  }
                },
              );
            },
          ),
        if (_matches('Export/Local Backup'))
          ListTile(
            title: const Text('Export/Local Backup'),
            subtitle: const Text('Save or share database backup'),
            trailing: state.isExporting ? const Text('Exporting...', style: TextStyle(fontSize: 12, color: Colors.blue, fontWeight: FontWeight.bold)) : const Icon(Icons.backup),
            onTap: () => _showBackupOptions(context, state),
          ),
        if (_matches('Sync'))
          ListTile(
            title: Row(
              children: [
                const Text('Sync'),
                if (state.userPlan?.isBasic == true) ...[
                  const SizedBox(width: 8),
                  _buildProBadge(),
                ],
              ],
            ),
            subtitle: const Text('Synchronize with local devices or the Web Portal'),
            trailing: const Icon(Icons.sync_rounded),
            onTap: () {
              _showSyncSelector(context, state);
            },
          ),
        if (_matches('Show Date & Time'))
          _buildSwitchTile('Show Date & Time', settings.showDateTime, (val) => _update(context, settings.copyWith(showDateTime: val))),
        if (_matches('Show Sync Status'))
          _buildSwitchTile('Show Sync Status', settings.showSyncStatus, (val) => _update(context, settings.copyWith(showSyncStatus: val))),
        if (_matches('Show Network Indicator'))
          _buildSwitchTile('Show Network Indicator', settings.showNetworkIndicator, (val) => _update(context, settings.copyWith(showNetworkIndicator: val))),

        if (_matches('Reset System Password', ['password', 'admin', 'security', 'unlock']))
          ListTile(
            title: const Text('Reset System Password'),
            subtitle: const Text('Requires Super Admin. Restores default AdminPass123!'),
            trailing: const Icon(Icons.lock_reset, color: Colors.deepPurple),
            onTap: () => _resetSystemPasswordWithSuperAdmin(context),
          ),

        const Divider(),
      ],



      const SizedBox(height: 60),
    ];

    if (_searchQuery.isNotEmpty && listItems.length <= 1) {
       return Center(
         child: Column(
           mainAxisAlignment: MainAxisAlignment.center,
           children: [
             const Icon(Icons.search_off, size: 64, color: Colors.grey),
             const SizedBox(height: 16),
             Text('No settings found matching "$_searchQuery"', style: const TextStyle(color: Colors.grey)),
           ],
         ),
       );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: listItems,
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
    final plan = state.userPlan;
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isLocked ? Colors.blue[50] : Colors.orange[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isLocked ? Colors.blue[200]! : Colors.orange[200]!),
      ),
      child: Column(
        children: [
          Row(
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
                          ? 'Business identity and operation mode are permanently locked.' 
                          : 'You can edit your business name and mode once. They will be locked after saving.',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (plan != null) ...[
            const Divider(height: 24),
            Row(
              children: [
                const Icon(Icons.stars, color: Colors.blueGrey, size: 20),
                const SizedBox(width: 12),
                Text(
                  'Current Plan: ',
                  style: TextStyle(fontWeight: FontWeight.w600, color: Colors.blueGrey[800]),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: plan.isBasic ? Colors.grey[200] : Colors.blueGrey[800],
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    plan.planType.toUpperCase(),
                    style: TextStyle(
                      color: plan.isBasic ? Colors.grey[800] : Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                if (plan.expiryDate != null) ...[
                  const SizedBox(width: 8),
                  Text(
                    'Expires: ${DateFormat('yyyy-MM-dd').format(plan.expiryDate!)}',
                    style: const TextStyle(fontSize: 11, color: Colors.grey),
                  ),
                ],
              ],
            ),
          ],
        ],
      ),
    );
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

  Widget _buildSwitchTile(String label, bool value, Function(bool) onChanged, {bool isPro = false}) {
    return SwitchListTile(
      title: Row(
        children: [
          Flexible(child: Text(label)),
          if (isPro) ...[
            const SizedBox(width: 8),
            _buildProBadge(),
          ],
        ],
      ),
      value: value,
      onChanged: (val) {
        if (isPro && val) {
           ScaffoldMessenger.of(context).showSnackBar(
             const SnackBar(content: Text('This is a Pro Version feature.')),
           );
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

  void _showBackupOptions(BuildContext context, SettingsState state) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const ListTile(
            title: Text('Backup Options', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          ListTile(
            leading: const Icon(Icons.save, color: Colors.blue),
            title: const Text('Save to Device'),
            subtitle: const Text('Choose a folder to save your backup file'),
            onTap: () async {
              Navigator.pop(ctx);
              _handleSaveToDevice(context);
            },
          ),
          ListTile(
            leading: const Icon(Icons.share, color: Colors.green),
            title: const Text('Share Backup'),
            subtitle: const Text('Send backup via WhatsApp, Email, etc.'),
            onTap: () {
              Navigator.pop(ctx);
              context.read<SettingsBloc>().add(CreateBackup());
            },
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  void _showSyncSelector(BuildContext context, SettingsState state) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const ListTile(
            title: Text('Select Sync Protocol', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          ListTile(
            leading: const Icon(Icons.devices_other_rounded, color: Colors.blueAccent),
            title: const Text('Device Sync (Local P2P)'),
            subtitle: const Text('Connect and sync ledger data peer-to-peer with other local devices'),
            onTap: () {
              Navigator.pop(ctx);
              if (state.userPlan?.isBasic == true) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Device Synchronization is a Pro Version feature.')),
                );
                return;
              }
              Navigator.push(context, MaterialPageRoute(builder: (_) => const DeviceSyncPage()));
            },
          ),
          ListTile(
            leading: const Icon(Icons.cloud_sync_rounded, color: Colors.teal),
            title: const Text('Web Sync (Full Cloud Sync)'),
            subtitle: const Text('Instantly replicate all local data and products to the web dashboard'),
            onTap: () async {
              Navigator.pop(ctx);
              _triggerWebCloudSync();
            },
          ),
          const SizedBox(height: 20),
        ],
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

  Future<void> _triggerWebCloudSync() async {
    if (!mounted) return;
    try {
      await ProgressDialogUtils.showDancingProgress(context, () async {
        final dbPath = await context.read<SettingsBloc>().backupService.getDatabasePath();
        final file = File(dbPath);
        
        if (!await file.exists()) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Local database file not found.')),
            );
          }
          return;
        }

        final client = _safeClient();

        // 1. Send database backup file (full SQLite copy to backend)
        final formData = FormData.fromMap({
          'backup_file': await MultipartFile.fromFile(dbPath, filename: 'app_database_backup_${DateTime.now().millisecondsSinceEpoch}.db'),
        });
        await client.post('/api/admin/claude-backup', data: formData);

        // 2. Bulk-sync local items/products to Supabase via backend
        final db = context.read<SettingsBloc>().backupService.database;
        if (db != null) {
          final localItems = await db.select(db.items).get();
          
          if (localItems.isNotEmpty) {
            final itemPayloads = localItems.map((item) => {
              'id': item.syncId,
              'name': item.name,
              'sku': item.name.toUpperCase().replaceAll(' ', '_') + '_${item.id}',
              'barcode': item.barcode,
              'stock_qty': item.stockQty,
              'min_stock_qty': item.minStockQty,
              'price': item.price,
              'cost_price': item.costPrice,
              'type': item.type,
              'status': item.isDeleted ? 'archived' : 'active',
              'is_deleted': item.isDeleted,
              'device_id': item.deviceId,
            }).toList();

            // Single bulk POST — much faster than one-by-one
            try {
              final result = await client.post(
                '/api/inventory/products/bulk-sync',
                data: {'items': itemPayloads},
              );
              debugPrint('Bulk sync result: synced=${result.data?['synced']}, errors=${result.data?['errors']}');
            } catch (bulkErr) {
              debugPrint('Bulk sync error: $bulkErr');
            }
          }

          // 3. Bulk-sync local customers to Supabase via backend
          final localCustomers = await db.select(db.customers).get();
          if (localCustomers.isNotEmpty) {
            final customerPayloads = localCustomers.map((c) => {
              'id': c.id,
              'name': c.name,
              'phone': c.phone,
              'email': c.email,
              'address': c.address,
              'balance': c.balance,
              'status': 'ACTIVE',
              'createdAt': c.createdAt.toIso8601String(),
            }).toList();

            try {
              final custResult = await client.post(
                '/api/v1/crm/customers/bulk-sync',
                data: {'customers': customerPayloads},
              );
              debugPrint('Bulk customer sync result: synced=${custResult.data?['synced']}, errors=${custResult.data?['errors']}');
            } catch (custErr) {
              debugPrint('Bulk customer sync error: $custErr');
            }
          }

          // 4. Bulk-sync local invoices (transactions) to Supabase via backend
          final localInvoices = await db.select(db.invoices).get();
          if (localInvoices.isNotEmpty) {
            final List<Map<String, dynamic>> invoicePayloads = [];

            for (final inv in localInvoices) {
              final itemsForInv = await (db.select(db.invoiceItems)..where((ii) => ii.invoiceId.equals(inv.id))).get();

              final itemsPayload = itemsForInv.map((ii) => {
                'invoiceItemSyncId': ii.syncId,
                'productSyncId': null,
                'itemId': ii.itemId.toString(),
                'quantity': ii.quantity,
                'unitPrice': ii.unitPrice,
                'type': ii.type,
              }).toList();

              for (final itemPayload in itemsPayload) {
                final localItem = await (db.select(db.items)..where((it) => it.id.equals(int.parse(itemPayload['itemId'] as String)))).getSingleOrNull();
                if (localItem != null) {
                  itemPayload['productSyncId'] = localItem.syncId;
                }
              }

              invoicePayloads.add({
                'syncId': inv.syncId ?? 'INV-${inv.id}-${DateTime.now().millisecondsSinceEpoch}',
                'invoiceNumber': inv.invoiceNumber,
                'customerId': inv.customerId,
                'customerName': inv.customerName,
                'customerPhone': null,
                'customerAddress': inv.customerAddress,
                'dateCreated': inv.dateCreated.toIso8601String(),
                'subtotal': inv.subtotal,
                'taxAmount': inv.taxAmount,
                'discountAmount': inv.discountAmount,
                'totalAmount': inv.totalAmount,
                'amountPaid': inv.amountPaid,
                'balanceAmount': inv.balanceAmount,
                'paymentStatus': inv.paymentStatus,
                'paymentMethod': inv.paymentMethod,
                'studentId': inv.studentId,
                'classId': inv.classId,
                'termId': inv.termId,
                'academicYearId': inv.academicYearId,
                'admissionNumber': inv.admissionNumber,
                'className': inv.className,
                'termName': inv.termName,
                'academicYearName': inv.academicYearName,
                'businessMode': inv.businessMode,
                'items': itemsPayload,
              });
            }

            try {
              final invResult = await client.post(
                '/api/v1/finance/invoices/bulk-sync',
                data: {'invoices': invoicePayloads},
              );
              debugPrint('Bulk invoice sync result: synced=${invResult.data?['synced']}, errors=${invResult.data?['errors']}');
            } catch (invErr) {
              debugPrint('Bulk invoice sync error: $invErr');
            }
          }

          // 5. School-mode roster + academics → web portal
          try {
            final years = await db.select(db.academicYears).get();
            final terms = await db.select(db.terms).get();
            final classes = await db.select(db.classes).get();
            final teachers = await db.select(db.teachers).get();
            final subjects = await db.select(db.subjects).get();
            final students = await db.select(db.students).get();
            List<dynamic> results = [];
            try {
              results = await db.select(db.results).get();
            } catch (_) {
              results = [];
            }

            String syncKey(String entity, dynamic row) {
              final existing = (row as dynamic).syncId?.toString();
              if (existing != null &&
                  existing.isNotEmpty &&
                  !existing.startsWith('local-') &&
                  RegExp(
                    r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
                  ).hasMatch(existing)) {
                return existing;
              }
              // Students: prefer admission number so web upserts stay 1:1 with mobile.
              if (entity == 'student') {
                final admission =
                    (row as dynamic).admissionNumber?.toString().trim() ?? '';
                if (admission.isNotEmpty) {
                  return const Uuid().v5(
                    '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
                    'invify-school-student-admission-$admission',
                  );
                }
              }
              // Stable UUID from local row id so re-syncs upsert cleanly.
              // Namespace.URL = 6ba7b811-9dad-11d1-80b4-00c04fd430c8
              return const Uuid().v5(
                '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
                'invify-school-$entity-${row.id}',
              );
            }

            final classNameById = {
              for (final c in classes) c.id: c.name,
            };

            final schoolPayload = {
              'years': years
                  .map((y) => {
                        'id': y.id,
                        'syncId': syncKey('year', y),
                        'name': y.name,
                        'startDate': y.startDate.toIso8601String(),
                        'endDate': y.endDate.toIso8601String(),
                        'isCurrent': y.isCurrent,
                        'isDeleted': y.isDeleted,
                      })
                  .toList(),
              'terms': terms
                  .map((t) => {
                        'id': t.id,
                        'syncId': syncKey('term', t),
                        'name': t.name,
                        'academicYearId': t.academicYearId,
                        'startDate': t.startDate.toIso8601String(),
                        'endDate': t.endDate.toIso8601String(),
                        'isCurrent': t.isCurrent,
                        'isDeleted': t.isDeleted,
                      })
                  .toList(),
              'classes': classes
                  .map((c) => {
                        'id': c.id,
                        'syncId': syncKey('class', c),
                        'name': c.name,
                        'description': c.description,
                        'isDeleted': c.isDeleted,
                      })
                  .toList(),
              'teachers': teachers
                  .map((t) => {
                        'id': t.id,
                        'syncId': syncKey('teacher', t),
                        'fullName': t.fullName,
                        'phone': t.phone,
                        'profession': t.profession,
                        'classId': t.classId,
                        'salary': t.salary,
                        'yearsInSchool': t.yearsInSchool,
                        'employmentDate': t.employmentDate.toIso8601String(),
                        'isDeleted': t.isDeleted,
                      })
                  .toList(),
              'subjects': subjects
                  .map((s) => {
                        'id': s.id,
                        'syncId': syncKey('subject', s),
                        'name': s.name,
                        'code': s.code,
                        'teacherId': s.teacherId,
                        'isDeleted': s.isDeleted,
                      })
                  .toList(),
              'students': students
                  .map((s) => {
                        'id': s.id,
                        'syncId': syncKey('student', s),
                        'admissionNumber': s.admissionNumber,
                        'firstName': s.firstName,
                        'lastName': s.lastName,
                        'classId': s.classId,
                        'className': classNameById[s.classId],
                        'academicYearId': s.academicYearId,
                        'parentName': s.parentName,
                        'parentPhone': s.parentPhone,
                        'balance': s.balance,
                        'creditBalance': s.creditBalance,
                        'gender': s.gender,
                        'department': s.department,
                        'virtualAccountNumber': s.virtualAccountNumber,
                        'virtualAccountBank': s.virtualAccountBank,
                        'virtualAccountStatus': s.virtualAccountStatus,
                        'isDeleted': s.isDeleted,
                      })
                  .toList(),
              'results': results
                  .map((r) => {
                        'id': r.id,
                        'syncId': syncKey('result', r),
                        'studentId': r.studentId,
                        'subjectId': r.subjectId,
                        'termId': r.termId,
                        'academicYearId': r.academicYearId,
                        'assessmentScore': r.assessmentScore,
                        'examScore': r.examScore,
                        'totalScore': r.totalScore,
                        'grade': r.grade,
                        'remarks': r.remarks,
                        'isDeleted': r.isDeleted,
                      })
                  .toList(),
            };

            final hasSchoolData = (schoolPayload['students'] as List).isNotEmpty ||
                (schoolPayload['classes'] as List).isNotEmpty ||
                (schoolPayload['teachers'] as List).isNotEmpty ||
                (schoolPayload['years'] as List).isNotEmpty;

            if (hasSchoolData) {
              final schoolResult = await client.post(
                '/api/school/bulk-sync',
                data: schoolPayload,
              );
              debugPrint(
                'School sync result: synced=${schoolResult.data?['synced']}, errors=${schoolResult.data?['errors']}',
              );
            } else {
              debugPrint('School sync skipped: no local academic/student rows');
            }
          } catch (schoolErr) {
            debugPrint('School bulk sync error: $schoolErr');
          }
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('✅ All data successfully synchronized to Web Portal!'),
              backgroundColor: Colors.teal,
            ),
          );
        }
      }, message: 'Synchronizing all data to Web Portal...');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Web Sync failed: $e'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  Future<void> _handleSaveToDevice(BuildContext context) async {
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    final settingsBloc = context.read<SettingsBloc>();
    
    try {
      // 1. Generate the backup bytes first (Required for Android/iOS save dialog)
      final bytes = await settingsBloc.backupService.createBackup();
      
      if (bytes == null) {
        scaffoldMessenger.showSnackBar(const SnackBar(content: Text('Failed to generate backup: Database file not found'), backgroundColor: Colors.red));
        return;
      }

      final timestamp = DateFormat('yyyyMMdd_HHmm').format(DateTime.now());
      final fileName = 'invify_backup_$timestamp.sqlite';
      
      // 2. Open save dialog with bytes
      final result = await FilePicker.platform.saveFile(
        dialogTitle: 'Select where to save your backup',
        fileName: fileName,
        bytes: bytes, // MANDATORY for Android & iOS
      );

      if (result != null) {
        // On Android/iOS, the file is already saved by the picker because we provided bytes.
        // On Desktop, depending on the implementation, we might need to write it manually or it's already done.
        if (defaultTargetPlatform == TargetPlatform.windows || defaultTargetPlatform == TargetPlatform.macOS || defaultTargetPlatform == TargetPlatform.linux) {
           final file = File(result);
           await file.writeAsBytes(bytes);
        }
        
        scaffoldMessenger.showSnackBar(const SnackBar(content: Text('Database exported successfully!'), backgroundColor: Colors.green));
      }
    } catch (e) {
      scaffoldMessenger.showSnackBar(SnackBar(content: Text('Failed to export: $e'), backgroundColor: Colors.red));
    }
  }



  void _showRestoreDialog(BuildContext context) {
    // Kept for backward compatibility if needed, but replaced by _handleRestore in the UI
  }

  void _update(BuildContext context, dynamic settings) {
    context.read<SettingsBloc>().add(UpdateAppSettings(settings));
  }

  Future<void> _handleModeChange(BuildContext context, AppSettings settings, String newMode) async {
    final proceed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirm Operational Mode'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Switching to ${newMode.toUpperCase()} mode will change UI labels and certain functionalities.'),
            const SizedBox(height: 12),
            const Text(
              '⚠️ WARNING: This setting is PERMANENT and cannot be changed once confirmed.',
              style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('CANCEL')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.blue, foregroundColor: Colors.white),
            child: const Text('CONFIRM & LOCK'),
          ),
        ],
      ),
    );

    if (proceed == true) {
      // 1. Update the mode
      _update(context, settings.copyWith(businessMode: newMode));
      // 2. Lock it
      context.read<SettingsBloc>().add(LockBusinessMode());
    }
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

  Future<void> _resetSystemPasswordWithSuperAdmin(BuildContext context) async {
    final settingsBloc = context.read<SettingsBloc>();
    settingsBloc.add(ResetSuperAdminAuth());

    final authorized = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => SuperAdminPasswordDialog(bloc: settingsBloc),
    );

    if (authorized != true || !context.mounted) return;

    final ok = await SecurityService().resetPasswordToDefault();
    if (!context.mounted) return;

    // Also clear failed-attempt lockout so Admin Hub is usable immediately.
    settingsBloc.add(ResetFailedAttempts());

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          ok
              ? 'System password reset to AdminPass123!'
              : 'Failed to reset system password',
        ),
        backgroundColor: ok ? Colors.green : Colors.red,
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
    final image = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      maxHeight: 1024,
    );
    
    if (image != null) {
      try {
        final croppedFile = await ImageCropper().cropImage(
          sourcePath: image.path,
          aspectRatio: const CropAspectRatio(ratioX: 1, ratioY: 1),
          uiSettings: [
            AndroidUiSettings(
              toolbarTitle: 'Crop Logo',
              toolbarColor: Theme.of(context).primaryColor,
              toolbarWidgetColor: Colors.white,
              initAspectRatio: CropAspectRatioPreset.original,
              lockAspectRatio: false,
            ),
            IOSUiSettings(
              title: 'Crop Logo',
              aspectRatioLockEnabled: false,
            ),
            WebUiSettings(
              context: context,
            ),
          ],
        );

        if (croppedFile != null) {
          if (!mounted) return;
          _showLoadingDialog(context, 'Removing background...');
          
          final bytes = await croppedFile.readAsBytes();
          
          // Process logo to remove background in a separate isolate
          final processedPng = await compute(LogoProcessor.processLogoWithTransparency, bytes);
          
          if (!mounted) return;
          _hideLoadingDialog(context);

          if (processedPng != null) {
            _update(context, settings.copyWith(
              logo: processedPng,
              logoSvg: null,
            ));
            
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Logo processed successfully'),
                backgroundColor: Colors.green,
              ),
            );
          } else {
            _update(context, settings.copyWith(logo: bytes));
          }
        }
      } catch (e) {
        if (mounted) _hideLoadingDialog(context);
        debugPrint('Logo processing error: $e');
        if (mounted) {
           ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error processing logo: $e')),
          );
        }
      }
    }
  }

  void _showLoadingDialog(BuildContext context, String message) {
    _isLoadingDialogShowing = true;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        elevation: 0,
        child: InvifyLoadingIndicator(message: message.toUpperCase()),
      ),
    ).then((_) => _isLoadingDialogShowing = false);
  }

  void _hideLoadingDialog(BuildContext context) {
    if (_isLoadingDialogShowing) {
      Navigator.of(context).pop();
      _isLoadingDialogShowing = false;
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

  Widget _buildSignatureSection(BuildContext context, AppSettings settings) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Admin Signature',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          const Text(
            'This signature will appear at the bottom of all invoices when enabled.',
            style: TextStyle(fontSize: 12, color: Colors.grey),
          ),
          const SizedBox(height: 16),
          Center(
            child: InkWell(
              onTap: () => _showSignaturePicker(context, settings),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                width: 200,
                height: 100,
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: settings.adminSignature != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.memory(
                          settings.adminSignature!,
                          fit: BoxFit.contain,
                        ),
                      )
                    : Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.edit_note, size: 40, color: Colors.grey[400]),
                          const SizedBox(height: 8),
                          Text(
                            'Tap to upload signature',
                            style: TextStyle(color: Colors.grey[600], fontSize: 12),
                          ),
                        ],
                      ),
              ),
            ),
          ),
          if (settings.adminSignature != null)
            Center(
              child: TextButton.icon(
                onPressed: () => _update(context, settings.copyWith(adminSignature: null)),
                icon: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
                label: const Text('Remove Signature', style: TextStyle(color: Colors.red, fontSize: 12)),
              ),
            ),
        ],
      ),
    );
  }

  void _showSignaturePicker(BuildContext context, AppSettings settings) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Gallery'),
              onTap: () {
                Navigator.pop(ctx);
                _pickSignature(context, settings, ImageSource.gallery);
              },
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Camera'),
              onTap: () {
                Navigator.pop(ctx);
                _pickSignature(context, settings, ImageSource.camera);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickSignature(BuildContext context, AppSettings settings, ImageSource source) async {
    final picker = ImagePicker();
    final image = await picker.pickImage(
      source: source,
      maxWidth: 1024, // High enough for signature but prevents memory issues
      maxHeight: 1024,
    );
    
    if (image == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No image captured')),
        );
      }
      return;
    }

    if (image != null) {
      try {
        final croppedFile = await ImageCropper().cropImage(
          sourcePath: image.path,
          aspectRatio: const CropAspectRatio(ratioX: 2, ratioY: 1),
          uiSettings: [
            AndroidUiSettings(
              toolbarTitle: 'Crop Signature',
              toolbarColor: Theme.of(context).primaryColor,
              toolbarWidgetColor: Colors.white,
              initAspectRatio: CropAspectRatioPreset.original,
              lockAspectRatio: true,
            ),
            IOSUiSettings(
              title: 'Crop Signature',
              aspectRatioLockEnabled: true,
            ),
            WebUiSettings(
              context: context,
            ),
          ],
        );
        
        if (croppedFile != null) {
          if (!mounted) return;
          _showLoadingDialog(context, 'Removing background...');
          
          final originalBytes = await croppedFile.readAsBytes();
          
          // Process signature to remove background
          final processedBytes = await compute(LogoProcessor.processLogoWithTransparency, originalBytes);
          
          if (!mounted) return;
          _hideLoadingDialog(context);
          
          _update(context, settings.copyWith(adminSignature: processedBytes ?? originalBytes));
          
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Signature processed successfully'),
              backgroundColor: Colors.green,
            ),
          );
        }
      } catch (e) {
        debugPrint('Crop error: $e');
        if (mounted) {
           ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error processing signature: $e')),
          );
        }
      }
    }
  }

  void _showExtendSubscriptionDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Extend Subscription'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Enter a new activation code to extend your subscription.'),
            const SizedBox(height: 16),
            const Text(
              'Your business name must match the one used during initial activation.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              // Navigate to ActivationPage to use its robust activation logic
              // We pass the settings business name to pre-fill it
              final settingsState = context.read<SettingsBloc>().state;
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const ActivationPage(isExpired: false),
                ),
              );
            },
            child: const Text('ENTER CODE'),
          ),
        ],
      ),
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
                return const SizedBox(height: 120, child: InvifyLoadingIndicator(message: 'FETCHING SUBSCRIPTIONS...'));
              }
              if (!snapshot.hasData || snapshot.data!.isEmpty) {
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Free Plan (Default)', style: TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: const Text('No active subscription found. Basic features enabled.'),
                  leading: const Icon(Icons.stars_outlined, color: Colors.grey),
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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              TextButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  _showExtendSubscriptionDialog(context);
                },
                child: const Text('EXTEND'),
              ),
              TextButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  showDialog(context: context, builder: (_) => const UpgradeDialog());
                },
                child: const Text('UPGRADE'),
              ),
              const Spacer(),
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CLOSE')),
            ],
          ),
        ],
      ),
    );
  }

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
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Color(settings.primaryColor),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.grey[300]!, width: 2),
              ),
            ),
            title: Text(
              '#${Color(settings.primaryColor).value.toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: const Text('Tap to pick a custom color'),
            trailing: const Icon(Icons.colorize),
            onTap: () => _showColorPickerDialog(context, settings),
          ),
        ],
      ),
    );
  }

  void _showColorPickerDialog(BuildContext context, AppSettings settings) {
    Color pickerColor = Color(settings.primaryColor);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Pick a Theme Color'),
        content: SingleChildScrollView(
          child: ColorPicker(
            pickerColor: pickerColor,
            onColorChanged: (color) => pickerColor = color,
            pickerAreaHeightPercent: 0.8,
            enableAlpha: false,
            displayThumbColor: true,
            showLabel: true,
            paletteType: PaletteType.hsvWithHue,
          ),
        ),
        actions: [
          TextButton(
            child: const Text('CANCEL'),
            onPressed: () => Navigator.of(ctx).pop(),
          ),
          ElevatedButton(
            child: const Text('SELECT'),
            onPressed: () {
              Navigator.of(ctx).pop();
              _update(context, settings.copyWith(primaryColor: pickerColor.value));
            },
          ),
        ],
      ),
    );
  }

  Widget _buildServiceTypesSection(BuildContext context, AppSettings settings) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                settings.businessMode == 'school' 
                    ? 'Service Categories (Hostel/Bus/Hall)' 
                    : 'Service Categories (Rentals/Consultations)', 
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)
              ),
              IconButton(
                icon: const Icon(Icons.add_circle_outline, color: Colors.blue),
                onPressed: () => _addServiceType(context, settings),
                tooltip: 'Add Category',
              ),
            ],
          ),
        ),
        if (settings.serviceTypes.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text('No service categories defined. Add one (e.g., Hotel, Lounge).', style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic)),
          )
        else
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Wrap(
              spacing: 8,
              children: settings.serviceTypes.map((type) {
                return Chip(
                  label: Text(type),
                  deleteIcon: const Icon(Icons.close, size: 18),
                  onDeleted: () => _removeServiceType(context, settings, type),
                );
              }).toList(),
            ),
          ),
        const SizedBox(height: 8),
      ],
    );
  }

  Future<void> _addServiceType(BuildContext context, AppSettings settings) async {
    final controller = TextEditingController();
    final newType = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Service Category'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(labelText: 'Category Name', hintText: 'e.g., Hotel, Event Hall'),
          textCapitalization: TextCapitalization.words,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          TextButton(
            onPressed: () {
              if (controller.text.isNotEmpty) {
                Navigator.pop(ctx, controller.text.trim());
              }
            },
            child: const Text('ADD'),
          ),
        ],
      ),
    );

    if (newType != null && newType.isNotEmpty) {
      if (settings.serviceTypes.contains(newType)) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Category already exists!')));
        return;
      }
      final updatedList = List<String>.from(settings.serviceTypes)..add(newType);
      _update(context, settings.copyWith(serviceTypes: updatedList));
    }
  }

  Widget _buildServiceBillingTile(BuildContext context, AppSettings settings, SettingsState state) {
    final plan = state.userPlan;
    final isProOrLifetime = plan != null && plan.isValid && (plan.isPro || plan.isLifetime);
    final isLocked = !isProOrLifetime; 

    return ListTile(
      title: Row(
        children: [
          Expanded(
            child: Text(
              settings.businessMode == 'school' 
                  ? 'Enable Service Billing (Hostel and Hall)' 
                  : 'Enable Service Billing (Rentals and Services)'
            )
          ),
          if (isLocked) ...[
            const SizedBox(width: 8),
            const Icon(Icons.lock, size: 16, color: Colors.orange),
          ],
        ],
      ),
      subtitle: isProOrLifetime
          ? const Text('Standard feature on your plan', style: TextStyle(color: Colors.green, fontSize: 12))
          : const Text('Available on Pro & Lifetime plans', style: TextStyle(color: Colors.orange, fontSize: 12)),
      trailing: Switch(
        value: settings.serviceBillingEnabled,
        onChanged: isLocked 
            ? (val) => showDialog(context: context, builder: (_) => const UpgradeDialog())
            : (val) => _update(context, settings.copyWith(serviceBillingEnabled: val)),
      ),
      onTap: isLocked 
          ? () => showDialog(context: context, builder: (_) => const UpgradeDialog())
          : null,
    );
  }

  void _removeServiceType(BuildContext context, AppSettings settings, String type) {
    final updatedList = List<String>.from(settings.serviceTypes)..remove(type);
    _update(context, settings.copyWith(serviceTypes: updatedList));
  }

  Widget _buildHalfDayConfigSection(BuildContext context, AppSettings settings) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: Text('Half-Day Billing Window', style: TextStyle(fontWeight: FontWeight.bold)),
        ),
        Row(
          children: [
            Expanded(
              child: _buildDropdownTile(
                context, 
                'Start (AM)', 
                '${settings.halfDayStartHour}:00', 
                List.generate(12, (i) => '${i}:00'), 
                (val) => _update(context, settings.copyWith(halfDayStartHour: int.parse(val.split(':')[0]))),
              ),
            ),
            Expanded(
              child: _buildDropdownTile(
                context, 
                'End (PM)', 
                '${settings.halfDayEndHour}:00', 
                List.generate(12, (i) => '${i + 12}:00'), 
                (val) => _update(context, settings.copyWith(halfDayEndHour: int.parse(val.split(':')[0]))),
              ),
            ),
          ],
        ),
      ],
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
        style: TextStyle(
          color: Colors.amber[900],
          fontSize: 8,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
