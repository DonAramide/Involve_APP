// lib/features/school_finance/presentation/pages/notifications_page.dart

import 'package:flutter/material.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
import 'package:involve_app/features/school_finance/domain/repositories/notification_repository.dart';
import '../../../../core/services/service_locator.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key});

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  final _repository = sl<NotificationRepository>();
  List<dynamic> _notifications = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _isLoading = true);
    try {
      final data = await _repository.getNotifications();
      setState(() {
        _notifications = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyApiError(e, fallback: 'Something went wrong.'))));
    }
  }

  Future<void> _markRead(String id) async {
    try {
      await _repository.markAsRead(id);
      _loadNotifications();
    } catch (e) {}
  }

  Future<void> _markAllRead() async {
    try {
      await _repository.markAllAsRead();
      _loadNotifications();
    } catch (e) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Notifications', style: TextStyle(fontWeight: FontWeight.w900)),
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        actions: [
          TextButton(
            onPressed: _markAllRead,
            child: const Text('Mark all as read', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      body: _isLoading
          ? const InvifyLoadingIndicator(message: 'FETCHING SECURE NOTIFICATIONS...')
          : RefreshIndicator(
              onRefresh: _loadNotifications,
              child: _notifications.isEmpty
                  ? _buildEmptyState()
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _notifications.length,
                      itemBuilder: (context, index) => _buildNotificationCard(_notifications[index]),
                    ),
            ),
    );
  }

  Widget _buildNotificationCard(Map<String, dynamic> item) {
    final date = DateTime.parse(item['created_at']);
    final isRead = item['is_read'] as bool;
    final type = item['type'] as String;

    IconData icon = Icons.notifications_none_rounded;
    Color color = Colors.blue;

    if (type.contains('payment')) {
      icon = Icons.payments_outlined;
      color = Colors.green;
    } else if (type.contains('payout')) {
      icon = Icons.account_balance_rounded;
      color = Colors.indigo;
    } else if (type.contains('failed')) {
      icon = Icons.error_outline_rounded;
      color = Colors.red;
    }

    return GestureDetector(
      onTap: () => isRead ? null : _markRead(item['id']),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isRead ? Colors.white.withOpacity(0.6) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))],
          border: isRead ? null : Border.all(color: color.withOpacity(0.2), width: 1.5),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _formatType(type),
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: color.withOpacity(0.8)),
                      ),
                      Text(
                        DateFormat('hh:mm a').format(date),
                        style: const TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item['message'],
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: isRead ? FontWeight.normal : FontWeight.bold,
                      color: isRead ? Colors.grey.shade600 : Colors.black87,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatType(String type) {
    return type.replaceAll('.', ' ').toUpperCase();
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.notifications_off_outlined, size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          const Text('All caught up!', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
