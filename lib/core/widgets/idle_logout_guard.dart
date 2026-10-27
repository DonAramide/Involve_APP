import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/features/invoicing/presentation/widgets/staff_auth_dialog.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/staff_bloc.dart';
import 'package:involve_app/features/settings/presentation/widgets/password_dialog.dart';

/// Locks the signed-in mobile session after 6 minutes without touch.
class IdleLogoutGuard extends StatefulWidget {
  static const Duration timeout = Duration(minutes: 6);

  final Widget child;

  const IdleLogoutGuard({super.key, required this.child});

  @override
  State<IdleLogoutGuard> createState() => _IdleLogoutGuardState();
}

class _IdleLogoutGuardState extends State<IdleLogoutGuard> with WidgetsBindingObserver {
  Timer? _timer;
  DateTime _lastActivity = DateTime.now();
  bool _locking = false;
  bool _seenActivity = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      if (_seenActivity && DateTime.now().difference(_lastActivity) >= IdleLogoutGuard.timeout) {
        _onIdleFired();
      }
    }
  }

  void _bump() {
    _seenActivity = true;
    _lastActivity = DateTime.now();
    _timer?.cancel();
    if (_locking) return;
    _timer = Timer(IdleLogoutGuard.timeout, _onIdleFired);
  }

  Future<void> _onIdleFired() async {
    if (!mounted || _locking || !_seenActivity) return;
    _locking = true;
    _timer?.cancel();

    final hasStaff = context.read<StaffBloc>().state.staffList.isNotEmpty;
    final settingsBloc = context.read<SettingsBloc>();

    if (!mounted) {
      _locking = false;
      return;
    }

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => PopScope(
        canPop: false,
        child: hasStaff ? const StaffAuthDialog() : PasswordDialog(bloc: settingsBloc),
      ),
    );

    if (mounted) {
      _locking = false;
      _bump();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Listener(
      behavior: HitTestBehavior.translucent,
      onPointerDown: (_) => _bump(),
      child: widget.child,
    );
  }
}
