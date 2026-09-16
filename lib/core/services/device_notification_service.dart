import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Posts payment alerts to the Android status/notification bar.
class DeviceNotificationService {
  DeviceNotificationService._();

  static final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();
  static bool _ready = false;

  static const _channelId = 'invify_payments';
  static const _channelName = 'Payments';
  static const _channelDesc = 'Incoming payment alerts';

  static Future<void> init() async {
    if (kIsWeb || _ready) return;
    try {
      const android = AndroidInitializationSettings('@mipmap/launcher_icon');
      await _plugin.initialize(
        const InitializationSettings(android: android),
      );
      final androidPlugin = _plugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      await androidPlugin?.createNotificationChannel(
        const AndroidNotificationChannel(
          _channelId,
          _channelName,
          description: _channelDesc,
          importance: Importance.high,
          playSound: true,
        ),
      );
      await androidPlugin?.requestNotificationsPermission();
      _ready = true;
    } catch (e) {
      debugPrint('[DeviceNotification] init failed: $e');
    }
  }

  static Future<void> showPayment({
    required String message,
    String title = 'Payment received',
  }) async {
    if (kIsWeb) return;
    if (!_ready) await init();
    if (!_ready) return;
    try {
      final id = DateTime.now().millisecondsSinceEpoch.remainder(1 << 31);
      await _plugin.show(
        id,
        title,
        message,
        const NotificationDetails(
          android: AndroidNotificationDetails(
            _channelId,
            _channelName,
            channelDescription: _channelDesc,
            importance: Importance.high,
            priority: Priority.high,
            icon: '@mipmap/launcher_icon',
          ),
        ),
      );
    } catch (e) {
      debugPrint('[DeviceNotification] show failed: $e');
    }
  }
}
