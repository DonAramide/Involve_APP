import 'package:flutter/material.dart';
import 'package:involve_app/core/license/license_service.dart';
import 'package:involve_app/features/activation/presentation/pages/activation_page.dart';
import 'package:involve_app/features/dashboard/presentation/pages/dashboard_page.dart';

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

    final isActivated = await LicenseService.isActivated();
    if (isActivated) {
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const DashboardPage()),
        );
      }
    } else {
      final isExpired = await LicenseService.isExpired();
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
