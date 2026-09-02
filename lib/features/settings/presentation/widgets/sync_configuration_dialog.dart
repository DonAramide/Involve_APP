import 'package:flutter/material.dart';
import 'package:involve_app/core/license/storage_service.dart';

/// Online Sync / Online Invoice Update toggles.
/// The dashboard cloud icon is live connection status; this dialog is the
/// data-upload configuration that used to open from that icon.
Future<void> showSyncConfigurationDialog(BuildContext context) async {
  var currentSync = await StorageService.isOnlineSyncEnabled();
  var currentInvoice = await StorageService.isOnlineInvoiceUpdateEnabled();
  if (!context.mounted) return;

  await showDialog<void>(
    context: context,
    builder: (dialogCtx) {
      return StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            title: const Row(
              children: [
                Icon(Icons.cloud_sync_rounded, color: Colors.blue),
                SizedBox(width: 10),
                Text('Sync Configuration'),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'The cloud icon in the top bar shows live connection. These switches control data upload.',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(height: 8),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Online Sync'),
                  subtitle: const Text('Synchronize data with the backend server in real-time'),
                  value: currentSync,
                  activeThumbColor: Colors.blue,
                  onChanged: (val) async {
                    await StorageService.setOnlineSyncEnabled(val);
                    setDialogState(() => currentSync = val);
                  },
                ),
                const Divider(),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Online Invoice Update'),
                  subtitle: const Text('Automatically upload created invoices to the cloud'),
                  value: currentInvoice,
                  activeThumbColor: Colors.blue,
                  onChanged: (val) async {
                    await StorageService.setOnlineInvoiceUpdateEnabled(val);
                    setDialogState(() => currentInvoice = val);
                  },
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogCtx),
                child: const Text('CLOSE'),
              ),
            ],
          );
        },
      );
    },
  );
}
