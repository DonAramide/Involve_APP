import 'package:flutter/material.dart';
import 'package:involve_app/core/utils/required_location.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

/// Blocks the app until a live GPS fix is captured.
class LocationRequiredPage extends StatefulWidget {
  const LocationRequiredPage({super.key, required this.onGranted});

  final void Function(BuildContext context) onGranted;

  @override
  State<LocationRequiredPage> createState() => _LocationRequiredPageState();
}

class _LocationRequiredPageState extends State<LocationRequiredPage> {
  bool _busy = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _request());
  }

  Future<void> _request() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    final result = await RequiredLocation.capture();
    if (!mounted) return;
    if (result.ok) {
      widget.onGranted(context);
      return;
    }
    await RequiredLocation.openSettings(result);
    if (!mounted) return;
    setState(() {
      _busy = false;
      _error = result.error;
    });
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: const Color(0xFF0F172A),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.location_on, color: Color(0xFF818CF8), size: 56),
                const SizedBox(height: 20),
                const Text(
                  'Location required',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  _error ??
                      'Invify must request your current location before you can continue.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey[400], height: 1.4),
                ),
                const SizedBox(height: 28),
                if (_busy)
                  const InvifyLoadingIndicator(message: 'REQUESTING LOCATION…')
                else
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _request,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366F1),
                        foregroundColor: Colors.white,
                      ),
                      child: const Text(
                        'ALLOW LOCATION AND CONTINUE',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
