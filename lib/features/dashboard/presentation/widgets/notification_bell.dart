import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'dart:async';

class NotificationBell extends StatefulWidget {
  const NotificationBell({super.key});

  @override
  State<NotificationBell> createState() => _NotificationBellState();
}

class _NotificationBellState extends State<NotificationBell> {
  int _unreadCount = 0;
  List<dynamic> _notifications = [];
  Timer? _pollingTimer;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
    // Poll every 5 seconds to update bell if a new broadcast arrived
    _pollingTimer = Timer.periodic(const Duration(seconds: 5), (_) => _loadNotifications());
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadNotifications() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final historyStr = prefs.getString('broadcast_history') ?? '[]';
      final List<dynamic> history = jsonDecode(historyStr);
      
      int unread = 0;
      for (var item in history) {
        if (item['read'] == false) {
          unread++;
        }
      }
      
      if (mounted) {
        setState(() {
          _notifications = history;
          _unreadCount = unread;
        });
      }
    } catch (e) {
      debugPrint('Error loading notifications: $e');
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
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Notifications', style: TextStyle(fontWeight: FontWeight.bold)),
                  if (_unreadCount > 0)
                    TextButton(
                      onPressed: () async {
                        final prefs = await SharedPreferences.getInstance();
                        final historyStr = prefs.getString('broadcast_history') ?? '[]';
                        final List<dynamic> history = jsonDecode(historyStr);
                        for (var item in history) {
                          item['read'] = true;
                        }
                        await prefs.setString('broadcast_history', jsonEncode(history));
                        _loadNotifications();
                        setStateDialog(() {
                          for (var item in _notifications) {
                            item['read'] = true;
                          }
                        });
                      },
                      child: const Text('Mark all as read'),
                    ),
                ],
              ),
              content: SizedBox(
                width: 400,
                height: 500,
                child: _notifications.isEmpty
                    ? const Center(child: Text('No notifications'))
                    : ListView.builder(
                        itemCount: _notifications.length,
                        itemBuilder: (context, index) {
                          final item = _notifications[index];
                          final isRead = item['read'] == true;
                          return Card(
                            color: isRead ? null : Colors.blue.withOpacity(0.1),
                            child: ListTile(
                              leading: Icon(
                                isRead ? Icons.notifications_none : Icons.notifications_active,
                                color: isRead ? Colors.grey : Colors.blue,
                              ),
                              title: Text(item['message'] ?? ''),
                              subtitle: Text(
                                item['time'] != null 
                                    ? DateTime.parse(item['time']).toLocal().toString().split('.')[0]
                                    : '',
                                style: const TextStyle(fontSize: 12),
                              ),
                              onTap: () async {
                                if (!isRead) {
                                  item['read'] = true;
                                  final prefs = await SharedPreferences.getInstance();
                                  await prefs.setString('broadcast_history', jsonEncode(_notifications));
                                  _loadNotifications();
                                  setStateDialog(() {});
                                }
                              },
                            ),
                          );
                        },
                      ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('CLOSE'),
                ),
              ],
            );
          }
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        IconButton(
          icon: const Icon(Icons.notifications_none),
          onPressed: _showNotificationsDialog,
          tooltip: 'Notifications',
        ),
        if (_unreadCount > 0)
          Positioned(
            right: 8,
            top: 8,
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: Colors.red,
                borderRadius: BorderRadius.circular(10),
              ),
              constraints: const BoxConstraints(
                minWidth: 16,
                minHeight: 16,
              ),
              child: Text(
                '$_unreadCount',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
      ],
    );
  }
}
