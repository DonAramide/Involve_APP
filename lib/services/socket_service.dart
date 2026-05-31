import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:flutter/material.dart';
import 'dart:developer';
import 'package:url_launcher/url_launcher.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  IO.Socket? _socket;
  GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();
  GlobalKey<NavigatorState>? navigatorKey;

  void initializeSocket(String serverUrl, {String? tenantId, String? plan, String? type, String? deviceId, String? businessName}) {
    if (_socket != null) {
      _socket!.disconnect();
    }

    _socket = IO.io(serverUrl, IO.OptionBuilder()
      .setTransports(['websocket'])
      .disableAutoConnect()
      .setExtraHeaders({'ngrok-skip-browser-warning': 'true'})
      .build()
    );

    _socket!.connect();

    _socket!.onConnect((_) {
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
    });

    _socket!.on('app_broadcast', (data) {
      debugPrint('[SocketService] Broadcast received from server: $data');
      if (data != null && data['message'] != null) {
        _showBroadcastBanner(data['message']);
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

    _socket!.onDisconnect((_) => log('Socket disconnected'));
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

  void dispose() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }
}
