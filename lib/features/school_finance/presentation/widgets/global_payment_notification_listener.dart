import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/services/service_locator.dart';
import '../../../../main.dart';
import '../../domain/repositories/finance_repository_new.dart';
import '../../data/datasources/finance_realtime_data_source.dart';

class GlobalPaymentNotificationListener extends StatefulWidget {
  final Widget child;
  final GlobalKey<NavigatorState> navigatorKey;
  final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey;

  const GlobalPaymentNotificationListener({
    Key? key, 
    required this.child, 
    required this.navigatorKey,
    required this.scaffoldMessengerKey,
  }) : super(key: key);

  @override
  State<GlobalPaymentNotificationListener> createState() => _GlobalPaymentNotificationListenerState();
}

class _GlobalPaymentNotificationListenerState extends State<GlobalPaymentNotificationListener> {
  StreamSubscription? _subscription;

  @override
  void initState() {
    super.initState();
    _initListener();
  }

  void _initListener() {
    final repo = sl<FinanceRepository>();
    _subscription = repo.watchGlobalEvents().listen((event) {
      if (event.type == FinanceEventType.paymentSuccess) {
        final amount = event.data['amount'] ?? 0;
        final metadata = event.data['metadata'] ?? {};
        final studentName = metadata['studentName'] ?? 'a student';
        final reference = event.data['reference'] ?? '';

        if (mounted) {
          _showNotification(amount, studentName, reference);
        }
      }
    });
  }

  void _showNotification(dynamic amount, String studentName, String reference) {
    widget.scaffoldMessengerKey.currentState?.showSnackBar(
      SnackBar(
        content: Text('₦$amount received from $studentName!'),
        action: SnackBarAction(
          label: 'View',
          textColor: Colors.yellow,
          onPressed: () {
            widget.navigatorKey.currentState?.pushNamed('/school_finance');
          },
        ),
        duration: const Duration(seconds: 10),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}
