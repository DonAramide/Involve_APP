import 'package:flutter/material.dart';
import 'package:involve_app/core/license/license_service.dart';
import 'package:involve_app/features/activation/presentation/pages/activation_page.dart';
import 'package:involve_app/features/dashboard/presentation/pages/dashboard_page.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:involve_app/features/settings/domain/entities/settings.dart';
import '../widgets/invify_loading_indicator.dart';

class LandingPage extends StatefulWidget {
  const LandingPage({super.key});

  @override
  State<LandingPage> createState() => _LandingPageState();
}

class _LandingPageState extends State<LandingPage> {
  @override
  void initState() {
    super.initState();
    // Do not check license here, wait for BlocListener in build
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
    final settings = settingsState.settings;
    final businessName = settings?.organizationName;

    final hasAccess = await LicenseService.canAccess(businessName);
    if (hasAccess) {
      if (mounted) {
        final destination = _getDestination(settings);
        final routeName = (destination is DashboardPage) ? DashboardPage.routeName : (destination is ActivationPage ? ActivationPage.routeName : null);

        if (settings?.skipSplash == true) {
          Navigator.of(context).pushReplacement(
            PageRouteBuilder(
              settings: RouteSettings(name: routeName),
              pageBuilder: (context, animation1, animation2) => destination,
              transitionDuration: Duration.zero,
              reverseTransitionDuration: Duration.zero,
            ),
          );
        } else {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              settings: RouteSettings(name: routeName),
              builder: (_) => destination,
            ),
          );
        }
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

  Widget _getDestination(AppSettings? settings) {
    if (settings?.restoreLastState == true && settings?.lastRoute != null) {
      final route = settings!.lastRoute;
      if (route == DashboardPage.routeName) return const DashboardPage();
      if (route == ActivationPage.routeName) return const ActivationPage();
      // Add more routes as needed
    }
    return const DashboardPage();
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
    return BlocListener<SettingsBloc, SettingsState>(
      listenWhen: (previous, current) => previous.settings == null && current.settings != null,
      listener: (context, state) {
        _checkLicense();
      },
      child: Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        body: Center(
          child: TweenAnimationBuilder<double>(
            tween: Tween<double>(begin: 0.0, end: 1.0),
            duration: const Duration(milliseconds: 1200),
            curve: Curves.easeOutCubic,
            builder: (context, value, child) {
              return Opacity(
                opacity: value,
                child: Transform.scale(
                  scale: 0.8 + (0.2 * value),
                  child: child,
                ),
              );
            },
            child: const InvifyLoadingIndicator(message: 'INITIALIZING INVIFY SYSTEM...'),
          ),
        ),
      ),
    );
  }
}
