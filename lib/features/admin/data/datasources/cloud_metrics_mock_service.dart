import 'dart:async';

class CloudMetricsMockService {
  Future<Map<String, dynamic>> getOverview() async {
    await Future.delayed(const Duration(milliseconds: 500));
    return {
      "systemHealthScore": 98,
      "healthDetails": {
        "sync": 100,
        "terminal": 100,
        "backup": 100,
        "connectivity": 90
      },
      "syncStatus": "healthy",
      "activeTerminals": 2,
      "devicesOnline": 3,
      "totalDevices": 3,
      "pendingUploads": 0,
      "lastSyncTime": DateTime.now().subtract(const Duration(seconds: 30)).toIso8601String(),
      "offlineModeActive": false,
      "connectionQuality": "Excellent",
      "latencyMs": 85
    };
  }

  Future<Map<String, dynamic>> getSyncHealth() async {
    await Future.delayed(const Duration(milliseconds: 500));
    return {
      "lastSyncTime": DateTime.now().subtract(const Duration(seconds: 30)).toIso8601String(),
      "syncStatus": "healthy",
      "pendingSyncQueue": 0,
      "offlineOps": {
        "sales": 0,
        "invoices": 0,
        "inventory": 0
      },
      "failedSyncRecords": 0,
      "syncSuccessRate": 99.8,
      "lastFullUpload": DateTime.now().subtract(const Duration(hours: 1)).toIso8601String(),
      "lastFullDownload": DateTime.now().subtract(const Duration(hours: 10)).toIso8601String()
    };
  }

  Future<Map<String, dynamic>> getTerminals() async {
    await Future.delayed(const Duration(milliseconds: 500));
    return {
      "activeCount": 2,
      "offlineCount": 0,
      "unassignedCount": 1,
      "terminals": []
    };
  }

  Future<Map<String, dynamic>> getDevices() async {
    await Future.delayed(const Duration(milliseconds: 500));
    return {
      "registeredDevices": [],
      "mpos": {
        "status": "connected",
        "lastTransactionTime": DateTime.now().subtract(const Duration(minutes: 5)).toIso8601String(),
        "transactionSuccessRate": 99.5,
        "failedTransactionCount": 1
      },
      "printer": {
        "status": "connected",
        "lastPrintJob": DateTime.now().subtract(const Duration(minutes: 5)).toIso8601String(),
        "failedPrintJobs": 0,
        "printQueueSize": 0
      }
    };
  }

  Future<Map<String, dynamic>> getBackups() async {
    await Future.delayed(const Duration(milliseconds: 500));
    return {
      "lastBackupTime": DateTime.now().subtract(const Duration(hours: 12)).toIso8601String(),
      "backupStatus": "healthy",
      "backupSizeBytes": 15482000,
      "recoveryStatus": "healthy"
    };
  }

  Future<Map<String, dynamic>> getActivityFeed() async {
    await Future.delayed(const Duration(milliseconds: 500));
    return {
      "activities": [
        {
          "id": "evt-001",
          "timestamp": DateTime.now().subtract(const Duration(seconds: 5)).toIso8601String(),
          "type": "sync.success",
          "category": "sync",
          "message": "Inventory synchronized."
        },
        {
          "id": "evt-002",
          "timestamp": DateTime.now().subtract(const Duration(minutes: 2)).toIso8601String(),
          "type": "terminal.connect",
          "category": "terminal",
          "message": "Terminal INV-001 connected."
        },
        {
          "id": "evt-003",
          "timestamp": DateTime.now().subtract(const Duration(minutes: 5)).toIso8601String(),
          "type": "invoice.created",
          "category": "invoice",
          "message": "Invoice #105 created."
        }
      ]
    };
  }

  Future<Map<String, dynamic>> getAlerts() async {
    await Future.delayed(const Duration(milliseconds: 500));
    return {
      // Toggle these to test warning states
      "alerts": [
        // {
        //   "id": "alt-002",
        //   "severity": "warning",
        //   "message": "5 records awaiting sync",
        //   "recommendation": "Internet connection restored, ready to upload.",
        //   "actionCode": "SYNC_NOW",
        //   "actionLabel": "Sync Now"
        // },
        // {
        //   "id": "alt-003",
        //   "severity": "error",
        //   "message": "Printer disconnected",
        //   "recommendation": "Receipt printing is currently unavailable.",
        //   "actionCode": "RECONNECT_PRINTER",
        //   "actionLabel": "Reconnect"
        // }
      ]
    };
  }
}
