// lib/core/utils/progress_dialog_utils.dart
import 'package:flutter/material.dart';
import 'dart:math' as math;
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

class ProgressDialogUtils {
  /// Executes any asynchronous Future task while rendering an immersive, barrier-locked
  /// progress dialog complete with a continuous "dancing" Invify logo micro-animation.
  static Future<T> showDancingProgress<T>(
    BuildContext context, 
    Future<T> Function() asyncTask, {
    String message = 'Processing network handshake...',
  }) async {
    // Trigger immersive barrier-locked loading matrix
    showDialog(
      context: context,
      barrierDismissible: false,
      useRootNavigator: true,
      builder: (BuildContext dialogContext) {
        return PopScope(
          canPop: false, // Enforce zero abort interruptions during transaction relay
          child: Dialog(
            backgroundColor: Colors.transparent,
            elevation: 0,
            child: DancingLogoWidget(message: message),
          ),
        );
      },
    );

    try {
      // Execute continuous target task awaiting fulfillment
      return await asyncTask();
    } finally {
      // Guarantee dialog closure routing matrix executes reliably
      if (context.mounted) {
        Navigator.of(context, rootNavigator: true).pop();
      }
    }
  }
}

class DancingLogoWidget extends StatelessWidget {
  final String message;
  const DancingLogoWidget({super.key, this.message = 'Loading platform matrices...'});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Center(
      child: Container(
        width: 260,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF0F172A) : Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.25),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
            BoxShadow(
              color: theme.colorScheme.primary.withOpacity(0.15),
              blurRadius: 30,
              spreadRadius: 2,
            ),
          ],
          border: Border.all(
            color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.05),
          ),
        ),
        child: InvifyLoadingIndicator(message: message),
      ),
    );
  }
}
