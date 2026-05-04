// lib/features/school_finance/domain/repositories/notification_repository.dart

import 'package:dio/dio.dart';

class NotificationRepository {
  final Dio _client;

  NotificationRepository(this._client);

  Future<List<dynamic>> getNotifications() async {
    final response = await _client.get('/api/notifications');
    return response.data as List<dynamic>;
  }

  Future<void> markAsRead(String id) async {
    await _client.post('/api/notifications/$id/read');
  }

  Future<void> markAllAsRead() async {
    await _client.post('/api/notifications/read-all');
  }
}
