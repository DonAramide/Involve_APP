import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:flutter/material.dart';
import 'package:involve_app/core/license/storage_service.dart';
import 'package:involve_app/core/services/payment_alert_sound.dart';
import 'package:involve_app/features/dashboard/presentation/widgets/notification_bell.dart';
import 'package:involve_app/features/services/domain/services/customer_wallet_credit_service.dart';
import 'package:involve_app/features/school_finance/domain/services/payment_catch_up_service.dart';
import 'package:involve_app/services/terminal_sync_service.dart';
import 'package:involve_app/features/settings/domain/services/security_service.dart';
import 'dart:developer';
import 'dart:async';
import 'package:url_launcher/url_launcher.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  IO.Socket? _socket;
  GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();
  GlobalKey<NavigatorState>? navigatorKey;
  
  final ValueNotifier<bool> isConnected = ValueNotifier<bool>(false);

  // Cached parameters to allow delayed initialization on toggles
  String? _lastServerUrl;
  String? _lastTenantId;
  String? _lastPlan;
  String? _lastType;
  String? _lastDeviceId;
  String? _lastBusinessName;
  String? _lastToken;

  // ── Auto-reconnect engine ──────────────────────────────────────────────────
  static const int _maxBackoffSeconds = 60;   // cap at 60 s
  static const int _heartbeatIntervalSeconds = 25;

  int _reconnectAttempts = 0;
  bool _intentionalDisconnect = false;         // set true when WE call disconnect()
  Timer? _reconnectTimer;
  Timer? _heartbeatTimer;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;

  Future<void> initializeSocket(String serverUrl, {String? tenantId, String? plan, String? type, String? deviceId, String? businessName, String? token}) async {
    _lastServerUrl = serverUrl;
    _lastTenantId = tenantId;
    _lastPlan = plan;
    _lastType = type;
    _lastDeviceId = deviceId;
    _lastBusinessName = businessName;
    _lastToken = token;

    final isSyncEnabled = await StorageService.isOnlineSyncEnabled();
    if (!isSyncEnabled) {
      debugPrint('[SocketService] Online sync is disabled. Skipping connection.');
      isConnected.value = false;
      if (_socket != null) {
        _socket!.disconnect();
      }
      return;
    }

    if (_socket != null) {
      _socket!.disconnect();
    }

    _socket = IO.io(serverUrl, IO.OptionBuilder()
      .setTransports(['websocket'])
      .disableAutoConnect()
      .setAuth({
        if (token != null) 'token': token,
        if (tenantId != null) 'tenantId': tenantId,
      })
      .setExtraHeaders({'ngrok-skip-browser-warning': 'true'})
      .build()
    );

    _socket!.connect();

    _socket!.onConnect((_) {
      isConnected.value = true;
      _reconnectAttempts = 0;        // reset backoff counter on success
      _intentionalDisconnect = false;
      debugPrint('[SocketService] Socket successfully connected to server!');
      debugPrint('[SocketService] Emitting join_room with: tenantId=$tenantId, plan=$plan, type=$type, deviceId=$deviceId, businessName=$businessName');
      
      // Emit details to join specific rooms, only including non-null values
      final joinData = <String, dynamic>{};
      if (tenantId != null) joinData['tenantId'] = tenantId;
      if (plan != null) joinData['plan'] = plan;
      if (type != null) joinData['type'] = type;
      if (deviceId != null) joinData['deviceId'] = deviceId;
      if (businessName != null) joinData['businessName'] = businessName;
      
      if (joinData.isNotEmpty) {
        _socket!.emit('join_room', joinData);
      }

      // Catch up wallet credits + local notifications missed while offline.
      PaymentCatchUpService.instance.scaffoldMessengerKey = scaffoldMessengerKey;
      unawaited(PaymentCatchUpService.instance.runCatchUp());

      // Catch up emergency lock if the live socket event was missed.
      unawaited(() async {
        final config = await TerminalSyncService.loadCachedConfig();
        if (config != null) {
          await TerminalSyncService.applyEmergencyLockFromConfig(config);
          if (config.isEmergencyLocked &&
              config.emergencyLockCode != null &&
              navigatorKey?.currentContext != null) {
            showEmergencyLockScreen(
              navigatorKey!.currentContext!,
              config.emergencyLockCode!,
            );
          }
        }
      }());
    });

    _socket!.onConnectError((err) {
      debugPrint('[SocketService] Connect Error: $err');
    });

    _socket!.onError((err) {
      debugPrint('[SocketService] Error: $err');
    });

    _socket!.on('app_broadcast', (data) async {
      debugPrint('[SocketService] Broadcast received from server: $data');
      if (data != null && data['message'] != null) {
        _showBroadcastBanner(data['message']);
        
        // Save broadcast to history
        try {
          await NotificationInbox.add(
            message: data['message'].toString(),
            type: 'broadcast',
          );
        } catch (e) {
          debugPrint('Error saving broadcast: $e');
        }
      }
    });

    _socket!.on('pos_routing_updated', (data) async {
      debugPrint('[SocketService] pos_routing_updated received: $data');
      final deviceId = _lastDeviceId;
      if (deviceId == null || deviceId.isEmpty) {
        debugPrint('[SocketService] Skipping routing re-sync (no deviceId)');
        return;
      }
      try {
        await TerminalSyncService.syncTerminalConfig(deviceId: deviceId);
        final version = data is Map ? data['configVersion'] : null;
        debugPrint('[SocketService] Terminal routing re-synced (v$version)');
      } catch (e) {
        debugPrint('[SocketService] Failed to re-sync routing config: $e');
      }
    });

    _socket!.on('payment.success', (data) {
      debugPrint('[SocketService] payment.success received: $data');
      // Defense-in-depth: ignore payments for other tenants if payload includes tenantId.
      try {
        final map = data is Map
            ? Map<String, dynamic>.from(data as Map)
            : <String, dynamic>{};
        final eventTenant = map['tenantId']?.toString();
        if (eventTenant != null &&
            eventTenant.isNotEmpty &&
            _lastTenantId != null &&
            _lastTenantId!.isNotEmpty &&
            eventTenant != _lastTenantId) {
          debugPrint(
            '[SocketService] Ignoring payment.success for other tenant '
            '$eventTenant (this device=$_lastTenantId)',
          );
          return;
        }
      } catch (_) {}
      unawaited(CustomerWalletCreditService.instance.applyPaymentSuccess(data));
      unawaited(PaymentCatchUpService.instance.markSeenFromLivePayment(data));
      _showPaymentSuccessBanner(data);
    });

    _socket!.on('emergency_lock', (data) async {
      debugPrint('[SocketService] Emergency Lock received: $data');
      if (data != null && data['passcode'] != null) {
        final passcode = data['passcode'].toString();
        
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('emergency_lock_passcode', passcode);
        await prefs.setBool('is_emergency_locked', true);
        
        if (navigatorKey?.currentContext != null) {
          showEmergencyLockScreen(navigatorKey!.currentContext!, passcode);
        }
      }
    });

    _socket!.on('system_access_password_reset', (data) async {
      debugPrint('[SocketService] System access password reset received: $data');
      try {
        final password = data is Map ? data['password']?.toString() : null;
        if (password == null || password.isEmpty) return;
        await SecurityService().setRecoveryPassword(password);
        if (navigatorKey?.currentContext != null) {
          ScaffoldMessenger.of(navigatorKey!.currentContext!).showSnackBar(
            const SnackBar(
              content: Text(
                'A new System Access recovery password was issued by your admin. Use it if you forgot the local password.',
              ),
              backgroundColor: Color(0xFF10B981),
              duration: Duration(seconds: 5),
            ),
          );
        }
      } catch (e) {
        debugPrint('[SocketService] system_access_password_reset error: $e');
      }
    });

    _socket!.on('ota_push_event', (data) async {
      debugPrint('[SocketService] OTA Push received: $data');
      if (data != null && data['url'] != null) {
        final List<dynamic>? targets = data['targetDevices'];
        if (targets != null && deviceId != null) {
          bool isTargeted = targets.any((t) => t == deviceId || deviceId.contains(t.toString()) || t.toString().contains(deviceId));
          if (!isTargeted) {
            debugPrint('[SocketService] OTA push ignored (not targeted for this device: $deviceId)');
            return;
          }
        }

        final urlString = data['url'] as String;
        final version = data['version'] ?? 'Unknown';
        
        SharedPreferences.getInstance().then((prefs) {
          prefs.setString('last_ota_url', urlString);
          prefs.setString('last_ota_version', version);
        });
        
        try {
          if (navigatorKey?.currentContext != null) {
            showDialog(
              context: navigatorKey!.currentContext!,
              barrierDismissible: false,
              builder: (context) => AlertDialog(
                title: const Text('System Update Available'),
                content: Text('Version v$version has been pushed to your device. Please download and install to continue.'),
                actions: [
                  TextButton(
                    onPressed: () async {
                      Navigator.of(context).pop();
                      final Uri url = Uri.parse(urlString);
                      if (await canLaunchUrl(url)) {
                        await launchUrl(url, mode: LaunchMode.externalApplication);
                      } else {
                        debugPrint('[SocketService] Could not launch $url');
                      }
                    },
                    child: const Text('Download Now'),
                  ),
                ],
              ),
            );
          } else {
            // Fallback if no navigator context
            final Uri url = Uri.parse(urlString);
            _showBroadcastBanner('System Update available: v$version. Downloading now...');
            
            if (await canLaunchUrl(url)) {
              await launchUrl(url, mode: LaunchMode.externalApplication);
            } else {
              debugPrint('[SocketService] Could not launch $url');
            }
          }
        } catch (e) {
          debugPrint('[SocketService] Error launching OTA url: $e');
        }
      }
    });

    _socket!.onDisconnect((_) {
      isConnected.value = false;
      log('[SocketService] Socket disconnected.');
      if (!_intentionalDisconnect) {
        _scheduleReconnect();
      }
    });

    // Start heartbeat to detect silently dead connections
    _startHeartbeat();

    // Watch network connectivity — reconnect immediately when coming back online
    _connectivitySub?.cancel();
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) async {
      final hasNetwork = results.any((r) => r != ConnectivityResult.none);
      if (hasNetwork && !isConnected.value) {
        debugPrint('[SocketService] Network restored. Triggering reconnect...');
        _cancelReconnectTimer();
        _reconnectAttempts = 0;
        await _doReconnect();
      }
    });
  }

  // ── Reconnect helpers ──────────────────────────────────────────────────────

  void _scheduleReconnect() {
    _cancelReconnectTimer();
    // Exponential backoff: 2^attempt seconds, capped at _maxBackoffSeconds
    final delaySeconds = _reconnectAttempts == 0
        ? 2
        : (_maxBackoffSeconds < (2 << _reconnectAttempts)
            ? _maxBackoffSeconds
            : (2 << _reconnectAttempts));
    debugPrint('[SocketService] Reconnect attempt ${_reconnectAttempts + 1} scheduled in ${delaySeconds}s...');
    _reconnectTimer = Timer(Duration(seconds: delaySeconds), _doReconnect);
  }

  Future<void> _doReconnect() async {
    if (_intentionalDisconnect || _lastServerUrl == null) return;

    final isSyncEnabled = await StorageService.isOnlineSyncEnabled();
    if (!isSyncEnabled) {
      debugPrint('[SocketService] Online sync disabled — skipping reconnect.');
      return;
    }

    // Check network before attempting
    final connectivity = await Connectivity().checkConnectivity();
    final hasNetwork = connectivity.any((r) => r != ConnectivityResult.none);
    if (!hasNetwork) {
      debugPrint('[SocketService] No network — will reconnect when network returns.');
      return;
    }

    debugPrint('[SocketService] Reconnecting (attempt ${_reconnectAttempts + 1})...');
    _reconnectAttempts++;

    if (_socket != null && !_socket!.connected) {
      _socket!.connect();
    } else {
      // Socket was disposed — full re-init
      await initializeSocket(
        _lastServerUrl!,
        tenantId: _lastTenantId,
        plan: _lastPlan,
        type: _lastType,
        deviceId: _lastDeviceId,
        businessName: _lastBusinessName,
        token: _lastToken,
      );
    }
  }

  void _cancelReconnectTimer() {
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(
      const Duration(seconds: _heartbeatIntervalSeconds),
      (_) {
        if (_socket == null || _intentionalDisconnect) return;
        if (_socket!.connected) {
          _socket!.emit('ping_heartbeat', {'timestamp': DateTime.now().toIso8601String()});
        } else if (!isConnected.value) {
          debugPrint('[SocketService] Heartbeat: socket dead, scheduling reconnect.');
          _scheduleReconnect();
        }
      },
    );
  }

  void onEvent(String event, void Function(dynamic) callback) {
    _socket?.on(event, callback);
  }

  void offEvent(String event, [void Function(dynamic)? callback]) {
    _socket?.off(event, callback);
  }

  /// Manually trigger a reconnect (e.g. called from a UI "Retry" button).
  Future<void> reconnect() async {
    _intentionalDisconnect = false;
    _cancelReconnectTimer();
    _reconnectAttempts = 0;
    await _doReconnect();
  }

  void disconnect() {
    _intentionalDisconnect = true;
    _cancelReconnectTimer();
    _heartbeatTimer?.cancel();
    _connectivitySub?.cancel();
    _socket?.disconnect();
    isConnected.value = false;
  }

  void _showBroadcastBanner(String message) {
    // Show real-time notification
    scaffoldMessengerKey.currentState?.showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.campaign, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ),
          ],
        ),
        backgroundColor: Colors.orange.shade900,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 15),
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        action: SnackBarAction(
          label: 'DISMISS',
          textColor: Colors.white,
          onPressed: () {
            scaffoldMessengerKey.currentState?.hideCurrentSnackBar();
          },
        ),
      ),
    );
  }

  void _showPaymentSuccessBanner(dynamic data) {
    try {
      // Loud POS-style beep as soon as payment lands
      unawaited(PaymentAlertSound.play());

      final map = data is Map
          ? Map<String, dynamic>.from(data as Map)
          : <String, dynamic>{};
      final amount = map['amount'] ?? 0;
      final metadataRaw = map['metadata'];
      Map<String, dynamic> metadata = {};
      if (metadataRaw is Map) {
        metadata = Map<String, dynamic>.from(metadataRaw);
      } else if (metadataRaw is String && metadataRaw.isNotEmpty) {
        try {
          final decoded = jsonDecode(metadataRaw);
          if (decoded is Map) metadata = Map<String, dynamic>.from(decoded);
        } catch (_) {}
      }
      final sender = (metadata['studentName'] ??
              metadata['senderName'] ??
              'a payer')
          .toString();
      final amountNum =
          amount is num ? amount.toDouble() : double.tryParse('$amount') ?? 0;
      final formatted = amountNum == amountNum.roundToDouble()
          ? amountNum.toStringAsFixed(0)
          : amountNum.toStringAsFixed(2);

      final message = '₦$formatted received from $sender';
      unawaited(NotificationInbox.add(
        message: message,
        type: 'payment',
        extra: {
          'reference': map['reference']?.toString(),
          'amount': amountNum,
        },
      ));

      scaffoldMessengerKey.currentState?.showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.payments, color: Colors.white),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  message,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
            ],
          ),
          backgroundColor: Colors.teal.shade700,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 10),
          margin: const EdgeInsets.all(16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          action: SnackBarAction(
            label: 'OK',
            textColor: Colors.yellow,
            onPressed: () {
              scaffoldMessengerKey.currentState?.hideCurrentSnackBar();
            },
          ),
        ),
      );
    } catch (e) {
      debugPrint('[SocketService] Failed to show payment banner: $e');
    }
  }

  void showEmergencyLockScreen(BuildContext context, String correctPasscode) {
    // Pop any existing dialogs to force lock screen on top
    while (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return PopScope(
          canPop: false,
          child: Scaffold(
            backgroundColor: Colors.red[900],
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Image.asset('assets/images/logo_transparent.png', height: 80),
                    const SizedBox(height: 16),
                    const Icon(Icons.lock_outline, size: 80, color: Colors.white),
                    const SizedBox(height: 16),
                    const Text(
                      'SYSTEM LOCKED',
                      style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 2),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'This application has been locked by the administrator. Please contact your admin/agent on the phone assigned to the tenant for the unlock passcode.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 16, color: Colors.white70),
                    ),
                    const SizedBox(height: 48),
                    TextField(
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: Colors.white,
                        hintText: 'Enter 6-Character Code',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      keyboardType: TextInputType.text,
                      textCapitalization: TextCapitalization.characters,
                      textAlign: TextAlign.center,
                      maxLength: 6,
                      style: const TextStyle(fontSize: 24, letterSpacing: 8, fontWeight: FontWeight.bold),
                      onChanged: (val) {
                        if (val.trim().toUpperCase() == correctPasscode.toUpperCase()) {
                          SharedPreferences.getInstance().then((prefs) {
                            prefs.setBool('is_emergency_locked', false);
                            prefs.remove('emergency_lock_passcode');
                          });
                          Navigator.of(ctx).pop(); // Dismiss lock screen
                          scaffoldMessengerKey.currentState?.showSnackBar(const SnackBar(content: Text('System Unlocked Successfully', style: TextStyle(color: Colors.white)), backgroundColor: Colors.green));
                        }
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  void dispose() {
    _intentionalDisconnect = true;
    _cancelReconnectTimer();
    _heartbeatTimer?.cancel();
    _connectivitySub?.cancel();
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }
}
