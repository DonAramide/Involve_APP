import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:involve_app/core/utils/app_config.dart';
import 'package:involve_app/services/socket_service.dart';

/// App-bar badge that auto-checks device network and server reachability.
class NetworkStatusIndicator extends StatefulWidget {
  final VoidCallback? onLongPress;

  const NetworkStatusIndicator({super.key, this.onLongPress});

  @override
  State<NetworkStatusIndicator> createState() => _NetworkStatusIndicatorState();
}

class _NetworkStatusIndicatorState extends State<NetworkStatusIndicator> {
  static const _checkInterval = Duration(seconds: 12);

  Timer? _timer;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  bool _hasLink = true;
  bool _serverReachable = true;
  bool _checking = false;

  bool get _isOnline => _hasLink;

  @override
  void initState() {
    super.initState();
    unawaited(_check());
    _timer = Timer.periodic(_checkInterval, (_) => unawaited(_check()));
    _connectivitySub = Connectivity().onConnectivityChanged.listen((_) {
      unawaited(_check());
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _connectivitySub?.cancel();
    super.dispose();
  }

  Future<void> _check() async {
    if (_checking) return;
    _checking = true;
    try {
      final results = await Connectivity().checkConnectivity();
      final hasLink = results.any((r) => r != ConnectivityResult.none);
      var reachable = hasLink;
      if (hasLink) {
        try {
          final response = await http
              .get(Uri.parse('${AppConfig.baseUrl}/health'))
              .timeout(const Duration(seconds: 4));
          reachable = response.statusCode < 500;
        } catch (_) {
          reachable = hasLink;
        }
      }
      if (!mounted) return;
      setState(() {
        _hasLink = hasLink;
        _serverReachable = reachable && hasLink;
      });
    } finally {
      _checking = false;
    }
  }

  Future<void> _onTap() async {
    await _check();
    await SocketService().reconnect();
    if (!mounted) return;
    final socketUp = SocketService().isConnected.value;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          !_hasLink
              ? 'No network connection'
              : socketUp
                  ? 'Network online · live socket connected'
                  : 'Network online · reconnecting live socket…',
        ),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: SocketService().isConnected,
      builder: (context, socketConnected, _) {
        return ValueListenableBuilder<String?>(
          valueListenable: SocketService().lastError,
          builder: (context, lastErr, _) {
            final online = _isOnline;
            final tooltip = online
                ? 'Network online'
                    '${_serverReachable ? '' : ' · server check delayed'}\n'
                    '${socketConnected ? 'Live socket connected' : 'Live socket offline'}'
                    ' (${AppConfig.baseUrl})\n'
                    'Tap to re-check · Long-press for Sync Configuration'
                : 'Network offline (${AppConfig.baseUrl})\n'
                    '${(lastErr == null || lastErr.isEmpty) ? 'Tap to re-check' : lastErr}\n'
                    'Long-press for Sync Configuration';

            return Tooltip(
              message: tooltip,
              child: GestureDetector(
                onTap: _onTap,
                onLongPress: widget.onLongPress,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
                  child: Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: online ? const Color(0xFF2E7D32) : const Color(0xFFC62828),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: (online ? Colors.green : Colors.red).withOpacity(0.45),
                          blurRadius: 8,
                          spreadRadius: 1,
                        ),
                      ],
                    ),
                    child: Icon(
                      online ? Icons.check_rounded : Icons.cloud_off_rounded,
                      size: 16,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }
}
