import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Local notification inbox shared by SocketService + NotificationBell.
class NotificationInbox {
  NotificationInbox._();

  static const String prefsKey = 'broadcast_history';
  static const int maxItems = 100;

  static Future<List<Map<String, dynamic>>> load() async {
    final prefs = await SharedPreferences.getInstance();
    final historyStr = prefs.getString(prefsKey) ?? '[]';
    try {
      final List<dynamic> raw = jsonDecode(historyStr);
      return raw
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    } catch (_) {
      return [];
    }
  }

  static Future<void> save(List<Map<String, dynamic>> items) async {
    final prefs = await SharedPreferences.getInstance();
    final trimmed = items.take(maxItems).toList();
    await prefs.setString(prefsKey, jsonEncode(trimmed));
  }

  static Future<void> add({
    required String message,
    String type = 'broadcast',
    Map<String, dynamic>? extra,
  }) async {
    final items = await load();
    items.insert(0, {
      'id': DateTime.now().microsecondsSinceEpoch.toString(),
      'message': message,
      'time': DateTime.now().toIso8601String(),
      'read': false,
      'type': type,
      if (extra != null) ...extra,
    });
    await save(items);
  }

  static Future<int> unreadCount() async {
    final items = await load();
    return items.where((e) => e['read'] != true).length;
  }
}

class NotificationBell extends StatefulWidget {
  const NotificationBell({super.key});

  @override
  State<NotificationBell> createState() => _NotificationBellState();
}

class _NotificationBellState extends State<NotificationBell> {
  int _unreadCount = 0;
  List<Map<String, dynamic>> _notifications = [];
  Timer? _pollingTimer;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
    _pollingTimer = Timer.periodic(
      const Duration(seconds: 3),
      (_) => _loadNotifications(),
    );
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadNotifications() async {
    try {
      final history = await NotificationInbox.load();
      final unread = history.where((item) => item['read'] != true).length;
      if (!mounted) return;
      setState(() {
        _notifications = history;
        _unreadCount = unread;
      });
    } catch (e) {
      debugPrint('Error loading notifications: $e');
    }
  }

  Future<void> _persist(List<Map<String, dynamic>> items) async {
    await NotificationInbox.save(items);
    await _loadNotifications();
  }

  Future<void> _markAllRead(StateSetter setStateDialog) async {
    final updated = _notifications
        .map((e) => {...e, 'read': true})
        .toList();
    await _persist(updated);
    setStateDialog(() {});
  }

  Future<void> _dismissAll(StateSetter setStateDialog) async {
    await _persist([]);
    setStateDialog(() {});
  }

  Future<void> _dismissAt(int index, StateSetter setStateDialog) async {
    if (index < 0 || index >= _notifications.length) return;
    final updated = List<Map<String, dynamic>>.from(_notifications)..removeAt(index);
    await _persist(updated);
    setStateDialog(() {});
  }

  Future<void> _markReadAt(int index, StateSetter setStateDialog) async {
    if (index < 0 || index >= _notifications.length) return;
    if (_notifications[index]['read'] == true) return;
    final updated = List<Map<String, dynamic>>.from(_notifications);
    updated[index] = {...updated[index], 'read': true};
    await _persist(updated);
    setStateDialog(() {});
  }

  String _formatTime(dynamic raw) {
    if (raw == null) return '';
    try {
      return DateTime.parse(raw.toString()).toLocal().toString().split('.').first;
    } catch (_) {
      return raw.toString();
    }
  }

  void _showNotificationsDialog() {
    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setStateDialog) {
            return AlertDialog(
              title: Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Notifications',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                  if (_notifications.isNotEmpty)
                    TextButton(
                      onPressed: () => _dismissAll(setStateDialog),
                      child: const Text('Clear all'),
                    ),
                ],
              ),
              content: SizedBox(
                width: 400,
                height: 500,
                child: _notifications.isEmpty
                    ? const Center(child: Text('No notifications'))
                    : Column(
                        children: [
                          if (_unreadCount > 0)
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton(
                                onPressed: () => _markAllRead(setStateDialog),
                                child: Text('Mark all as read ($_unreadCount)'),
                              ),
                            ),
                          Expanded(
                            child: ListView.builder(
                              itemCount: _notifications.length,
                              itemBuilder: (context, index) {
                                final item = _notifications[index];
                                final isRead = item['read'] == true;
                                final isPayment = item['type'] == 'payment';
                                return Dismissible(
                                  key: ValueKey(item['id'] ?? '${item['time']}_$index'),
                                  direction: DismissDirection.endToStart,
                                  background: Container(
                                    alignment: Alignment.centerRight,
                                    padding: const EdgeInsets.symmetric(horizontal: 16),
                                    color: Colors.red.shade400,
                                    child: const Icon(Icons.delete_outline, color: Colors.white),
                                  ),
                                  onDismissed: (_) => _dismissAt(index, setStateDialog),
                                  child: Card(
                                    color: isRead
                                        ? null
                                        : (isPayment
                                            ? Colors.teal.withOpacity(0.12)
                                            : Colors.blue.withOpacity(0.1)),
                                    child: ListTile(
                                      leading: Icon(
                                        isPayment
                                            ? Icons.payments_outlined
                                            : (isRead
                                                ? Icons.notifications_none
                                                : Icons.notifications_active),
                                        color: isPayment
                                            ? Colors.teal
                                            : (isRead ? Colors.grey : Colors.blue),
                                      ),
                                      title: Text(item['message']?.toString() ?? ''),
                                      subtitle: Text(
                                        _formatTime(item['time']),
                                        style: const TextStyle(fontSize: 12),
                                      ),
                                      trailing: IconButton(
                                        tooltip: 'Dismiss',
                                        icon: const Icon(Icons.close, size: 18),
                                        onPressed: () => _dismissAt(index, setStateDialog),
                                      ),
                                      onTap: () => _markReadAt(index, setStateDialog),
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                        ],
                      ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('CLOSE'),
                ),
              ],
            );
          },
        );
      },
    ).then((_) => _loadNotifications());
  }

  @override
  Widget build(BuildContext context) {
    final badgeLabel = _unreadCount > 99 ? '99+' : '$_unreadCount';
    return Stack(
      clipBehavior: Clip.none,
      alignment: Alignment.center,
      children: [
        IconButton(
          icon: Icon(
            _unreadCount > 0 ? Icons.notifications_active : Icons.notifications_none,
          ),
          onPressed: _showNotificationsDialog,
          tooltip: _unreadCount > 0
              ? 'Notifications ($_unreadCount unread)'
              : 'Notifications',
        ),
        if (_unreadCount > 0)
          Positioned(
            right: 6,
            top: 6,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.red.shade600,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.white, width: 1.2),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.2),
                    blurRadius: 3,
                    offset: const Offset(0, 1),
                  ),
                ],
              ),
              constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
              child: Text(
                badgeLabel,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  height: 1.1,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
      ],
    );
  }
}
