import 'package:involve_app/core/utils/app_config.dart';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../features/settings/domain/services/security_service.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Terminal configuration synced from the Invify backend.
class TerminalConfig {
  final bool assigned;
  final String? terminalId;
  final String? mposTerminalId;
  final String? posSerialNumber;
  final String? businessName;
  final String? merchantName;
  final String? terminalType;
  final int configVersion;
  final String? syncedAt;
  final String? message;
  final String? printerMac;
  final String? printerModel;
  final String? supportPhone;
  final String? supportEmail;
  final String? supportWhatsapp;
  final String? broadcastMessage;
  final String? tenantId;
  final String? plan;
  final String? type;
  final String? activeHost;
  final String? expressPayHost;
  final int? expressPayPort;
  final String? nibssIp;
  final int? nibssPort;
  final bool nibssSsl;

  // New Phase X parameters
  final Map<String, dynamic>? primaryHost;
  final Map<String, dynamic>? secondaryHost;
  final Map<String, dynamic>? routingRules;
  final List<dynamic>? thresholdRules;
  final Map<String, dynamic>? tenantPolicy;
  final String? expressPayBaseUrl;
  final String? expressPayAuthToken;
  final String? merchantCode;
  final String? terminalGroup;
  final String? sslProfile;
  final String? kimonoIp;
  final int? kimonoPort;
  final bool kimonoSSL;
  final Map<String, dynamic>? kimonoKeys;
  final Map<String, dynamic>? kimonoFallbackParameters;

  // P0-1 Fields
  final String? deviceCategory;
  final String? deviceRole;
  final Map<String, dynamic>? features;

  /// Server-side emergency lock (catch-up if socket event was missed).
  final bool isEmergencyLocked;
  final String? emergencyLockCode;
  final String? tenantStatus;

  const TerminalConfig({
    required this.assigned,
    this.terminalId,
    this.mposTerminalId,
    this.posSerialNumber,
    this.businessName,
    this.merchantName,
    this.terminalType,
    this.configVersion = 1,
    this.syncedAt,
    this.message,
    this.printerMac,
    this.printerModel,
    this.supportPhone,
    this.supportEmail,
    this.supportWhatsapp,
    this.broadcastMessage,
    this.tenantId,
    this.plan,
    this.type,
    this.activeHost,
    this.expressPayHost,
    this.expressPayPort,
    this.nibssIp,
    this.nibssPort,
    this.nibssSsl = false,
    this.primaryHost,
    this.secondaryHost,
    this.routingRules,
    this.thresholdRules,
    this.tenantPolicy,
    this.expressPayBaseUrl,
    this.expressPayAuthToken,
    this.merchantCode,
    this.terminalGroup,
    this.sslProfile,
    this.kimonoIp,
    this.kimonoPort,
    this.kimonoSSL = false,
    this.kimonoKeys,
    this.kimonoFallbackParameters,
    this.deviceCategory,
    this.deviceRole,
    this.features,
    this.isEmergencyLocked = false,
    this.emergencyLockCode,
    this.tenantStatus,
  });

  factory TerminalConfig.fromJson(Map<String, dynamic> json) {
    final terminalId = json['terminalId']?.toString();
    final hasTerminal = terminalId != null && terminalId.isNotEmpty;
    final assignedFlag = json['assigned'] == true;
    // Do not treat bare success:true as assigned (USER_DEVICE responses can be successful).
    return TerminalConfig(
      assigned: assignedFlag || hasTerminal,
      terminalId: terminalId,
      mposTerminalId: json['mposTerminalId']?.toString(),
      posSerialNumber: json['posSerialNumber']?.toString(),
      businessName: json['businessName']?.toString(),
      merchantName: json['merchantName']?.toString() ?? json['businessName']?.toString(),
      terminalType: json['terminalType']?.toString(),
      configVersion: (json['configVersion'] as num?)?.toInt() ?? 1,
      syncedAt: json['syncedAt']?.toString(),
      message: json['message']?.toString(),
      printerMac: json['printerMac']?.toString(),
      printerModel: json['printerModel']?.toString(),
      supportPhone: json['supportPhone']?.toString(),
      supportEmail: json['supportEmail']?.toString(),
      supportWhatsapp: json['supportWhatsapp']?.toString(),
      broadcastMessage: json['broadcastMessage']?.toString(),
      tenantId: json['tenantId']?.toString(),
      plan: json['plan']?.toString(),
      type: json['type']?.toString(),
      activeHost: json['activeHost']?.toString(),
      expressPayHost: json['expressPayHost']?.toString(),
      expressPayPort: (json['expressPayPort'] as num?)?.toInt(),
      nibssIp: json['nibssIp']?.toString() ??
          (json['primaryHost'] is Map ? (json['primaryHost'] as Map)['ip']?.toString() : null),
      nibssPort: (json['nibssPort'] as num?)?.toInt() ??
          (json['primaryHost'] is Map
              ? ((json['primaryHost'] as Map)['port'] as num?)?.toInt()
              : null),
      nibssSsl: json['nibssSsl'] == true ||
          (json['primaryHost'] is Map && (json['primaryHost'] as Map)['sslEnabled'] == true),
      primaryHost: json['primaryHost'] != null ? Map<String, dynamic>.from(json['primaryHost'] as Map) : null,
      secondaryHost: json['secondaryHost'] != null ? Map<String, dynamic>.from(json['secondaryHost'] as Map) : null,
      routingRules: json['routingRules'] != null ? Map<String, dynamic>.from(json['routingRules'] as Map) : null,
      thresholdRules: json['thresholdRules'] != null ? List<dynamic>.from(json['thresholdRules'] as List) : null,
      tenantPolicy: json['tenantPolicy'] != null ? Map<String, dynamic>.from(json['tenantPolicy'] as Map) : null,
      expressPayBaseUrl: json['expressPayBaseUrl']?.toString(),
      expressPayAuthToken: json['expressPayAuthToken']?.toString(),
      merchantCode: json['merchantCode']?.toString(),
      terminalGroup: json['terminalGroup']?.toString(),
      sslProfile: json['sslProfile']?.toString(),
      kimonoIp: json['kimonoIp']?.toString(),
      kimonoPort: (json['kimonoPort'] as num?)?.toInt(),
      kimonoSSL: json['kimonoSSL'] == true,
      kimonoKeys: json['kimonoKeys'] != null ? Map<String, dynamic>.from(json['kimonoKeys'] as Map) : null,
      kimonoFallbackParameters: json['kimonoFallbackParameters'] != null ? Map<String, dynamic>.from(json['kimonoFallbackParameters'] as Map) : null,
      deviceCategory: json['deviceCategory']?.toString(),
      deviceRole: json['deviceRole']?.toString(),
      features: json['features'] != null ? Map<String, dynamic>.from(json['features'] as Map) : null,
      isEmergencyLocked: json['isEmergencyLocked'] == true,
      emergencyLockCode: json['emergencyLockCode']?.toString(),
      tenantStatus: json['tenantStatus']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'assigned': assigned,
    'terminalId': terminalId,
    'mposTerminalId': mposTerminalId,
    'posSerialNumber': posSerialNumber,
    'businessName': businessName,
    'merchantName': merchantName,
    'terminalType': terminalType,
    'configVersion': configVersion,
    'syncedAt': syncedAt,
    'message': message,
    'printerMac': printerMac,
    'printerModel': printerModel,
    'supportPhone': supportPhone,
    'supportEmail': supportEmail,
    'supportWhatsapp': supportWhatsapp,
    'broadcastMessage': broadcastMessage,
    'tenantId': tenantId,
    'plan': plan,
    'type': type,
    'activeHost': activeHost,
    'expressPayHost': expressPayHost,
    'expressPayPort': expressPayPort,
    'nibssIp': nibssIp,
    'nibssPort': nibssPort,
    'nibssSsl': nibssSsl,
    'primaryHost': primaryHost,
    'secondaryHost': secondaryHost,
    'routingRules': routingRules,
    'thresholdRules': thresholdRules,
    'tenantPolicy': tenantPolicy,
    'expressPayBaseUrl': expressPayBaseUrl,
    'expressPayAuthToken': expressPayAuthToken,
    'merchantCode': merchantCode,
    'terminalGroup': terminalGroup,
    'sslProfile': sslProfile,
    'kimonoIp': kimonoIp,
    'kimonoPort': kimonoPort,
    'kimonoSSL': kimonoSSL,
    'kimonoKeys': kimonoKeys,
    'kimonoFallbackParameters': kimonoFallbackParameters,
    'deviceCategory': deviceCategory,
    'deviceRole': deviceRole,
    'features': features,
    'isEmergencyLocked': isEmergencyLocked,
    'emergencyLockCode': emergencyLockCode,
    'tenantStatus': tenantStatus,
  };

  DeviceCapabilities get capabilities => DeviceCapabilities.fromJson(features);

  @override
  String toString() => 'TerminalConfig(terminalId: $terminalId, assigned: $assigned, deviceCategory: $deviceCategory)';
}


/// Handles syncing terminal configuration from the Invify backend.
///
/// Replaces manual Terminal ID entry — all terminal config is server-controlled.
class TerminalSyncService {
  static const _secureStorage = FlutterSecureStorage();
  static const _cachedConfigKey = 'terminal_sync_cache';
  static const _cachedVersionKey = 'terminal_config_version';
  static const _lastSyncTimeKey = 'terminal_last_sync_time';

  // Base URL — reads from app config or defaults to localhost
  static String get _baseUrl {
    // Hardcoded URL for local network testing based on user's active session
    return AppConfig.baseUrl;
  }  /// Sync the terminal configuration for this device from the backend.
  ///
  /// [deviceId] — the device's unique identifier (activation/enrollment ID)
  /// [enrollmentKey] — optional enrollment key for verification
  /// [serialNumber] — optional device serial number
  /// [androidId] — optional Android device ID for correlation
  ///
  /// Returns the synced [TerminalConfig]. Falls back to cached config on failure.
  static Future<TerminalConfig> syncTerminalConfig({
    required String deviceId,
    String? enrollmentKey,
    String? serialNumber,
    String? androidId,
  }) async {
    try {
      final payload = {
        'deviceId': deviceId,
        'enrollmentKey': enrollmentKey,
        'serialNumber': serialNumber,
        'androidId': androidId,
      };
      
      debugPrint('[TerminalSync] Requesting sync with payload: ${jsonEncode(payload)}');

      final session = Supabase.instance.client.auth.currentSession;
      String? token = session?.accessToken;
      
      // Fallback to offline token if no active Supabase session
      if (token == null || token.isEmpty) {
        token = await SecurityService().getOfflineToken();
      }

      final headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      };
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }

      final response = await http.post(
        Uri.parse('$_baseUrl/api/mobile/terminal/sync'),
        headers: headers,
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final prettyString = const JsonEncoder.withIndent('  ').convert(data);
        debugPrint('[TerminalSync] Received response: \n$prettyString');
        final config = TerminalConfig.fromJson(data);

        // Persist config to secure storage for offline fallback
        await _cacheConfig(config);
        await applyEmergencyLockFromConfig(config);

        debugPrint('[TerminalSync] Synced: terminalId=${config.terminalId}, version=${config.configVersion}');
        return config;
      } else {
        debugPrint('[TerminalSync] Sync failed (${response.statusCode}): ${response.body}');
        
        String errorMessage = 'Server returned ${response.statusCode}.';
        if (response.body.contains('ERR_NGROK_') || response.body.contains('502 Bad Gateway') || response.body.contains('Bad Gateway')) {
          errorMessage = 'The backend server is offline or unreachable (Ngrok Gateway Error).';
        } else if (response.statusCode == 404) {
          errorMessage = 'Terminal sync endpoint not found on the server.';
        } else if (response.statusCode == 500) {
          errorMessage = 'Internal server error on the backend.';
        } else {
           try {
             final errData = jsonDecode(response.body);
             if (errData['message'] != null) {
               errorMessage = errData['message'];
             } else if (errData['error'] != null) {
               errorMessage = errData['error'];
             }
           } catch (_) {}
         }
        throw Exception(errorMessage);
      }
    } catch (e) {
      debugPrint('[TerminalSync] Network error: $e. Falling back to cache.');
      if (e.toString().startsWith('Exception:')) {
        rethrow;
      }
      throw Exception('Network error: Could not connect to the server. Please check your internet connection.');
    }
  }

  /// Get the current terminal assignment status without a full sync.
  static Future<TerminalConfig> getTerminalStatus({
    required String deviceId,
  }) async {
    try {
      final session = Supabase.instance.client.auth.currentSession;
      final token = session?.accessToken;
      final headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      };
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }

      final response = await http.get(
        Uri.parse('$_baseUrl/api/mobile/terminal/status?deviceId=${Uri.encodeComponent(deviceId)}'),
        headers: headers,
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return TerminalConfig.fromJson(data);
      }
    } catch (_) {}
    return await _getCachedConfig() ?? const TerminalConfig(assigned: false);
  }


  static Future<void> recordKeyExchangeSuccess(String deviceId) async {
    try {
      final payload = {'deviceId': deviceId};
      await http.post(
        Uri.parse('$_baseUrl/api/mobile/terminal/keyexchange-success'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      );
    } catch (e) {
      debugPrint('[TerminalSync] Failed to record key exchange success: $e');
    }
  }

  /// Retrieve the locally cached terminal config (for offline use).
  static Future<TerminalConfig?> _getCachedConfig() async {
    try {
      final cached = await _secureStorage.read(key: _cachedConfigKey);
      if (cached != null) {
        final json = jsonDecode(cached) as Map<String, dynamic>;
        return TerminalConfig.fromJson(json);
      }
    } catch (_) {}
    return null;
  }

  /// Load cached config synchronously-ish for initial UI population.
  static Future<TerminalConfig?> loadCachedConfig() => _getCachedConfig();

  /// Save config to secure local storage.
  static Future<void> _cacheConfig(TerminalConfig config) async {
    await _secureStorage.write(
      key: _cachedConfigKey,
      value: jsonEncode(config.toJson()),
    );
    await _secureStorage.write(
      key: _cachedVersionKey,
      value: config.configVersion.toString(),
    );
    await _secureStorage.write(
      key: _lastSyncTimeKey,
      value: DateTime.now().toIso8601String(),
    );
  }

  /// Get the timestamp of the last successful sync.
  static Future<DateTime?> getLastSyncTime() async {
    try {
      final raw = await _secureStorage.read(key: _lastSyncTimeKey);
      if (raw != null) return DateTime.tryParse(raw);
    } catch (_) {}
    return null;
  }

  /// Get the cached config version number.
  static Future<int> getCachedConfigVersion() async {
    try {
      final raw = await _secureStorage.read(key: _cachedVersionKey);
      if (raw != null) return int.tryParse(raw) ?? 1;
    } catch (_) {}
    return 1;
  }

  /// Clear the cached terminal config (e.g., on logout/reset).
  static Future<void> clearCache() async {
    await _secureStorage.delete(key: _cachedConfigKey);
    await _secureStorage.delete(key: _cachedVersionKey);
    await _secureStorage.delete(key: _lastSyncTimeKey);
  }

  /// Apply server emergency-lock state (catch-up if socket event was missed).
  static Future<void> applyEmergencyLockFromConfig(TerminalConfig config) async {
    if (!config.isEmergencyLocked) return;
    final code = config.emergencyLockCode;
    if (code == null || code.isEmpty) return;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('is_emergency_locked', true);
    await prefs.setString('emergency_lock_passcode', code);
    debugPrint('[TerminalSync] Emergency lock active from server (tenantStatus=${config.tenantStatus})');
  }
}

class DeviceCapabilities {
  final bool invoicing;
  final bool inventory;
  final bool customerManagement;
  final bool reporting;
  final bool printing;
  final bool emvPayments;
  final bool cardSettlement;

  const DeviceCapabilities({
    this.invoicing = true,
    this.inventory = true,
    this.customerManagement = true,
    this.reporting = true,
    this.printing = false,
    this.emvPayments = false,
    this.cardSettlement = false,
  });

  factory DeviceCapabilities.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const DeviceCapabilities();
    return DeviceCapabilities(
      invoicing: json['invoicing'] != false,
      inventory: json['inventory'] != false,
      customerManagement: json['customerManagement'] != false,
      reporting: json['reporting'] != false,
      printing: json['printing'] == true,
      emvPayments: json['emvPayments'] == true,
      cardSettlement: json['cardSettlement'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
    'invoicing': invoicing,
    'inventory': inventory,
    'customerManagement': customerManagement,
    'reporting': reporting,
    'printing': printing,
    'emvPayments': emvPayments,
    'cardSettlement': cardSettlement,
  };
}

