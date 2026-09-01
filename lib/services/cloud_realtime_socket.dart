import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:socket_io_client/socket_io_client.dart' as IO;

/// Shared surface for Socket.IO (HTTPS) and Engine.IO HTTP polling (LAN).
abstract class CloudRealtimeSocket {
  bool get connected;
  set auth(Map<String, dynamic> value);
  void connect();
  void disconnect();
  void dispose();
  void emit(String event, [dynamic data]);
  void on(String event, void Function(dynamic data) handler);
  void off(String event, [void Function(dynamic data)? handler]);
  void onConnect(void Function(dynamic data) handler);
  void onConnectError(void Function(dynamic err) handler);
  void onError(void Function(dynamic err) handler);
  void onDisconnect(void Function(dynamic reason) handler);
}

class SocketIoRealtimeSocket implements CloudRealtimeSocket {
  SocketIoRealtimeSocket(this._socket);
  final IO.Socket _socket;

  @override
  bool get connected => _socket.connected;

  @override
  set auth(Map<String, dynamic> value) => _socket.auth = value;

  @override
  void connect() => _socket.connect();

  @override
  void disconnect() => _socket.disconnect();

  @override
  void dispose() {
    _socket.dispose();
  }

  @override
  void emit(String event, [dynamic data]) {
    if (data == null) {
      _socket.emit(event);
    } else {
      _socket.emit(event, data);
    }
  }

  @override
  void on(String event, void Function(dynamic data) handler) =>
      _socket.on(event, handler);

  @override
  void off(String event, [void Function(dynamic data)? handler]) =>
      _socket.off(event, handler);

  @override
  void onConnect(void Function(dynamic data) handler) =>
      _socket.onConnect(handler);

  @override
  void onConnectError(void Function(dynamic err) handler) =>
      _socket.onConnectError(handler);

  @override
  void onError(void Function(dynamic err) handler) => _socket.onError(handler);

  @override
  void onDisconnect(void Function(dynamic reason) handler) =>
      _socket.onDisconnect(handler);
}

/// Engine.IO v4 + Socket.IO v4 over HTTP long-polling.
///
/// Flutter's socket_io_client on Android only implements WebSocket. LAN tablets
/// can GET /livez but ws:// to :3004 times out. This uses the same `http`
/// stack as TerminalSync.
class EngineIoPollingClient implements CloudRealtimeSocket {
  EngineIoPollingClient(this.serverUrl, {this.path = '/socket.io/'});

  final String serverUrl;
  final String path;

  final http.Client _http = http.Client();
  final Map<String, List<void Function(dynamic)>> _events = {};
  void Function(dynamic)? _onConnect;
  void Function(dynamic)? _onConnectError;
  void Function(dynamic)? _onError;
  void Function(dynamic)? _onDisconnect;

  Map<String, dynamic> _auth = {};
  String? _sid;
  bool _connected = false;
  bool _stopped = true;
  bool _connecting = false;

  @override
  bool get connected => _connected;

  @override
  set auth(Map<String, dynamic> value) {
    _auth = Map<String, dynamic>.from(value);
  }

  @override
  void onConnect(void Function(dynamic data) handler) => _onConnect = handler;

  @override
  void onConnectError(void Function(dynamic err) handler) =>
      _onConnectError = handler;

  @override
  void onError(void Function(dynamic err) handler) => _onError = handler;

  @override
  void onDisconnect(void Function(dynamic reason) handler) =>
      _onDisconnect = handler;

  @override
  void on(String event, void Function(dynamic data) handler) {
    _events.putIfAbsent(event, () => []).add(handler);
  }

  @override
  void off(String event, [void Function(dynamic data)? handler]) {
    if (handler == null) {
      _events.remove(event);
      return;
    }
    _events[event]?.remove(handler);
  }

  @override
  void emit(String event, [dynamic data]) {
    if (_sid == null || _stopped) return;
    final payload = data == null ? jsonEncode([event]) : jsonEncode([event, data]);
    unawaited(_post('42$payload'));
  }

  @override
  void connect() {
    if (_connecting || (_connected && !_stopped)) return;
    unawaited(_connect());
  }

  @override
  void disconnect() {
    _stopped = true;
    _connecting = false;
    if (_sid != null) {
      unawaited(_post('1').catchError((_) => false));
    }
    _sid = null;
    final was = _connected;
    _connected = false;
    if (was) _onDisconnect?.call('client disconnect');
  }

  @override
  void dispose() {
    disconnect();
    _http.close();
  }

  Uri _uri({String? sid}) {
    final base = serverUrl.endsWith('/')
        ? serverUrl.substring(0, serverUrl.length - 1)
        : serverUrl;
    final p = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$base$p').replace(queryParameters: {
      'EIO': '4',
      'transport': 'polling',
      if (sid != null) 'sid': sid,
      't': DateTime.now().millisecondsSinceEpoch.toRadixString(36),
    });
  }

  Future<void> _connect() async {
    _stopped = false;
    _connecting = true;
    _connected = false;
    _sid = null;
    try {
      final openBody = await _get(sid: null, timeout: const Duration(seconds: 8));
      _handlePayload(openBody, duringHandshake: true);
      if (_sid == null) {
        throw StateError('Engine.IO handshake missing sid');
      }
      debugPrint('[EngineIo] handshake sid=$_sid');
      await _post('40${jsonEncode(_auth)}');
      final ack = await _get(sid: _sid, timeout: const Duration(seconds: 8));
      _handlePayload(ack, duringHandshake: true);
      if (!_connected) {
        throw StateError('Socket.IO connect was not acknowledged');
      }
      debugPrint('[EngineIo] Socket.IO connected over HTTP polling');
      _connecting = false;
      unawaited(_pollLoop());
    } catch (e) {
      _connecting = false;
      _connected = false;
      debugPrint('[EngineIo] connect failed: $e');
      _onConnectError?.call(e);
    }
  }

  Future<void> _pollLoop() async {
    while (!_stopped && _sid != null) {
      try {
        final body = await _get(sid: _sid, timeout: const Duration(seconds: 70));
        if (_stopped) break;
        _handlePayload(body);
      } catch (e) {
        if (_stopped) break;
        debugPrint('[EngineIo] poll error: $e');
        _onError?.call(e);
        _connected = false;
        _sid = null;
        _onDisconnect?.call(e.toString());
        break;
      }
    }
  }

  Future<String> _get({String? sid, required Duration timeout}) async {
    final res = await _http
        .get(
          _uri(sid: sid),
          headers: const {
            'Accept': '*/*',
            'ngrok-skip-browser-warning': 'true',
          },
        )
        .timeout(timeout);
    if (res.statusCode != 200) {
      throw StateError('GET ${res.statusCode}: ${res.body}');
    }
    return res.body;
  }

  Future<bool> _post(String body) async {
    if (_sid == null) return false;
    final res = await _http
        .post(
          _uri(sid: _sid),
          headers: const {
            'Content-Type': 'text/plain;charset=UTF-8',
            'Accept': '*/*',
            'ngrok-skip-browser-warning': 'true',
          },
          body: body,
        )
        .timeout(const Duration(seconds: 8));
    return res.statusCode == 200;
  }

  void _handlePayload(String payload, {bool duringHandshake = false}) {
    for (final packet in payload.split('\x1e')) {
      if (packet.isEmpty) continue;
      _handlePacket(packet, duringHandshake: duringHandshake);
    }
  }

  void _handlePacket(String packet, {required bool duringHandshake}) {
    final type = packet.codeUnitAt(0) - 48;
    final data = packet.length > 1 ? packet.substring(1) : '';
    switch (type) {
      case 0: // open
        final json = jsonDecode(data) as Map<String, dynamic>;
        _sid = json['sid'] as String?;
        break;
      case 1: // close
        _connected = false;
        _sid = null;
        _stopped = true;
        _onDisconnect?.call('server close');
        break;
      case 2: // ping
        unawaited(_post('3'));
        break;
      case 3: // pong
        break;
      case 4: // message → Socket.IO
        _handleSocketIo(data, duringHandshake: duringHandshake);
        break;
      case 6: // noop
        break;
    }
  }

  void _handleSocketIo(String data, {required bool duringHandshake}) {
    if (data.isEmpty) return;
    final sioType = data.codeUnitAt(0) - 48;
    final rest = data.length > 1 ? data.substring(1) : '';
    switch (sioType) {
      case 0: // CONNECT
        _connected = true;
        _onConnect?.call(rest.isEmpty ? null : _tryJson(rest));
        break;
      case 1: // DISCONNECT
        _connected = false;
        _onDisconnect?.call('io disconnect');
        break;
      case 2: // EVENT
        _dispatchEvent(rest);
        break;
      case 4: // CONNECT_ERROR
        final err = _tryJson(rest) ?? rest;
        if (duringHandshake || !_connected) {
          throw StateError(err.toString());
        }
        _onError?.call(err);
        break;
    }
  }

  void _dispatchEvent(String rest) {
    final decoded = _tryJson(rest);
    if (decoded is! List || decoded.isEmpty) return;
    final name = decoded.first.toString();
    final arg = decoded.length > 2
        ? decoded.sublist(1)
        : (decoded.length == 2 ? decoded[1] : null);
    final handlers = _events[name];
    if (handlers == null) return;
    for (final h in List<void Function(dynamic)>.from(handlers)) {
      h(arg);
    }
  }

  dynamic _tryJson(String raw) {
    if (raw.isEmpty) return null;
    try {
      return jsonDecode(raw);
    } catch (_) {
      return raw;
    }
  }
}
