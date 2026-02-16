import 'package:flutter/material.dart';
import 'package:invify/core/license/license_service.dart';
import 'package:invify/features/activation/presentation/pages/activation_page.dart';
import 'package:invify/features/dashboard/presentation/pages/dashboard_page.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:invify/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:invify/features/settings/presentation/bloc/settings_state.dart';

class LandingPage extends StatefulWidget {
  const LandingPage({super.key});

  @override
  State<LandingPage> createState() => _LandingPageState();
}

class _LandingPageState extends State<LandingPage> {
  @override
  void initState() {
    super.initState();
    _checkLicense();
  }

  Future<void> _checkLicense() async {
    // Check date tamper first
    final isTampered = await LicenseService.isDateTampered();
    if (isTampered) {
      if (mounted) {
        _showTamperDialog();
      }
      return;
    }

    final settingsState = context.read<SettingsBloc>().state;
    final businessName = settingsState.settings?.organizationName;

    final hasAccess = await LicenseService.canAccess(businessName);
    if (hasAccess) {
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const DashboardPage()),
        );
      }
    } else {
      final isExpired = await LicenseService.isExpired(businessName);
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => ActivationPage(isExpired: isExpired)),
        );
      }
    }
  }

  void _showTamperDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('System date manipulation detected'),
        content: const Text('The application has detected that your system date has been changed to a date before the last time the app was opened. Please correct your system date to continue.'),
        actions: [
          TextButton(
            onPressed: () => _checkLicense(),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}
