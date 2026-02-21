import 'package:flutter/material.dart';

class SyncIndicator extends StatefulWidget {
  final IconData icon;
  final Color color;
  final bool isSyncing;
  final String tooltip;
  final VoidCallback? onPressed;

  const SyncIndicator({
    super.key,
    required this.icon,
    required this.color,
    required this.isSyncing,
    required this.tooltip,
    this.onPressed,
  });

  @override
  State<SyncIndicator> createState() => _SyncIndicatorState();
}

class _SyncIndicatorState extends State<SyncIndicator> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );
    if (widget.isSyncing) {
      _controller.repeat();
    }
  }

  @override
  void didUpdateWidget(SyncIndicator oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isSyncing != oldWidget.isSyncing) {
      if (widget.isSyncing) {
        _controller.repeat();
      } else {
        _controller.stop();
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: widget.tooltip,
      onPressed: widget.onPressed,
      icon: RotationTransition(
        turns: _controller,
        child: Icon(widget.icon, size: 20, color: widget.color),
      ),
    );
  }
}
