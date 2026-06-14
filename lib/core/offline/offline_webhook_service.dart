import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';

class OfflineWebhookPayload {
  final String id;
  final String url;
  final Map<String, dynamic> data;
  final DateTime createdAt;

  OfflineWebhookPayload({
    required this.id,
    required this.url,
    required this.data,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'url': url,
        'data': data,
        'createdAt': createdAt.toIso8601String(),
      };

  factory OfflineWebhookPayload.fromJson(Map<String, dynamic> json) =>
      OfflineWebhookPayload(
        id: json['id'],
        url: json['url'],
        data: json['data'] is String ? jsonDecode(json['data']) : json['data'],
        createdAt: DateTime.parse(json['createdAt']),
      );
}

class OfflineWebhookService {
  static const String _fileName = 'webhook_queue.json';
  final Dio _dio;

  OfflineWebhookService(this._dio);

  Future<File> _getFile() async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File('${dir.path}/$_fileName');
    if (!await file.exists()) {
      await file.create();
      await file.writeAsString('[]');
    }
    return file;
  }

  Future<List<OfflineWebhookPayload>> _getQueue() async {
    try {
      final file = await _getFile();
      final content = await file.readAsString();
      if (content.isEmpty) return [];
      final List<dynamic> jsonList = jsonDecode(content);
      return jsonList.map((e) => OfflineWebhookPayload.fromJson(e)).toList();
    } catch (e) {
      print('[OfflineWebhookService] Failed to read queue: $e');
      return [];
    }
  }

  Future<void> _saveQueue(List<OfflineWebhookPayload> queue) async {
    try {
      final file = await _getFile();
      final jsonString = jsonEncode(queue.map((e) => e.toJson()).toList());
      await file.writeAsString(jsonString);
    } catch (e) {
      print('[OfflineWebhookService] Failed to save queue: $e');
    }
  }

  Future<void> enqueuePayload(String url, Map<String, dynamic> data) async {
    final queue = await _getQueue();
    final payload = OfflineWebhookPayload(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      url: url,
      data: data,
      createdAt: DateTime.now(),
    );
    queue.add(payload);
    await _saveQueue(queue);
    print('[OfflineWebhookService] Enqueued payload for $url. Total items: ${queue.length}');
  }

  Future<void> syncQueue() async {
    final queue = await _getQueue();
    if (queue.isEmpty) return;

    final now = DateTime.now();
    final validQueue = queue.where((p) {
      final diff = now.difference(p.createdAt);
      return diff.inHours < 48; // Discard payloads older than 48 hours
    }).toList();

    if (validQueue.length < queue.length) {
      print('[OfflineWebhookService] Discarded ${queue.length - validQueue.length} old payloads.');
      await _saveQueue(validQueue);
    }

    final pendingQueue = List<OfflineWebhookPayload>.from(validQueue);

    for (final payload in validQueue) {
      try {
        final cleanUrl = payload.url.trim();
        print('[OfflineWebhookService] Attempting to sync payload to $cleanUrl...');
        final response = await _dio.post(cleanUrl, data: payload.data);
        if (response.statusCode == 200 || response.statusCode == 201) {
          print('[OfflineWebhookService] Successfully synced payload ${payload.id}');
          pendingQueue.removeWhere((p) => p.id == payload.id);
        }
      } catch (e) {
        print('[OfflineWebhookService] Failed to sync payload ${payload.id}: $e');
      }
    }

    await _saveQueue(pendingQueue);
  }
}
