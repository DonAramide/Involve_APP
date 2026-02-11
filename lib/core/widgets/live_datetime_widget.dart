import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

/// Live date/time widget that updates every second
/// Displays in format: "2026-02-10 19:20"
class LiveDateTimeWidget extends StatefulWidget {
  const LiveDateTimeWidget({super.key});

  @override
  State<LiveDateTimeWidget> createState() => _LiveDateTimeWidgetState();
}

class _LiveDateTimeWidgetState extends State<LiveDateTimeWidget> {
  late Timer _timer;
  String _currentDateTime = '';

  @override
  void initState() {
    super.initState();
    _updateDateTime();
    // Update every second
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _updateDateTime();
    });
  }

  void _updateDateTime() {
    final now = DateTime.now();
    final formatter = DateFormat('yyyy-MM-dd HH:mm');
    setState(() {
      _currentDateTime = formatter.format(now);
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.access_time, size: 16),
          const SizedBox(width: 6),
          Text(
            _currentDateTime,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              fontFamily: 'monospace',
            ),
          ),
        ],
      ),
    );
  }
}
