import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:shelf/shelf.dart';
import 'package:shelf/shelf_io.dart' as io;
import 'package:shelf_router/shelf_router.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:involve_app/core/sync/domain/models/sync_models.dart';
import 'package:involve_app/core/sync/data/repositories/sync_repository_impl.dart';

class SyncServer {
  final AppDatabase database;
  final SyncRepository syncRepository;
  HttpServer? _server;
  final String secretToken;

  SyncServer({
    required this.database,
    required this.syncRepository,
    required this.secretToken,
  });

  Future<void> start(int port) async {
    if (kIsWeb) return;
    if (_server != null) return; // Added this line based on the instruction's intent to prevent starting if already running.
    final router = Router();

    // Health Check
    router.get('/health', (Request request) {
      return Response.ok(jsonEncode({'status': 'ok', 'device': 'Invify Master'}));
    });

    // Sync Pull (Client requests data from Master)
    router.post('/sync/pull', (Request request) async {
      try {
        final payload = await request.readAsString();
        final body = jsonDecode(payload);
        final lastSync = DateTime.parse(body['lastSyncTime']);
        
        final batch = await syncRepository.getDeltaBatch(lastSync, 'MASTER');
        return Response.ok(jsonEncode(batch.toJson()));
      } catch (e) {
        return Response.internalServerError(body: jsonEncode({'error': e.toString()}));
      }
    });

    // Sync Push (Client sends data to Master)
    router.post('/sync/push', (Request request) async {
      try {
        final payload = await request.readAsString();
        final batch = SyncBatch.fromJson(jsonDecode(payload));
        
        await syncRepository.applyBatch(batch);
        return Response.ok(jsonEncode({'status': 'success'}));
      } catch (e) {
        return Response.internalServerError(body: jsonEncode({'error': e.toString()}));
      }
    });

    final handler = const Pipeline()
        .addMiddleware(_authMiddleware(secretToken))
        .addMiddleware(logRequests())
        .addHandler(router.call);

    // Using '0.0.0.0' instead of InternetAddress.anyIPv4 for safer web compilation
    _server = await io.serve(handler, '0.0.0.0', port);
    debugPrint('Sync Server running on ${_server?.address.address}:${_server?.port}');
  }

  Middleware _authMiddleware(String validToken) => (innerHandler) {
        return (request) {
          final token = request.headers['X-Auth-Token'];
          if (token != validToken) {
            return Response.forbidden(jsonEncode({'error': 'Unauthorized'}));
          }
          return innerHandler(request);
        };
      };

  void stop() {
    _server?.close();
    _server = null;
  }
}
