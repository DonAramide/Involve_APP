import 'package:flutter/material.dart';
import 'dart:ui';
import 'package:flutter/services.dart';
import 'package:involve_app/core/license/license_service.dart';
import 'package:involve_app/core/license/storage_service.dart';
import 'package:involve_app/features/activation/presentation/pages/device_onboarding_page.dart';
import 'package:involve_app/features/dashboard/presentation/pages/dashboard_page.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/core/license/license_model.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:involve_app/core/utils/device_info_service.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class ActivationPage extends StatefulWidget {
  static const routeName = '/activation';
  final bool isExpired;
  const ActivationPage({super.key, this.isExpired = false});

  @override
  State<ActivationPage> createState() => _ActivationPageState();
}

class _ActivationPageState extends State<ActivationPage> {
  final _businessNameController = TextEditingController();
  final List<TextEditingController> _segmentControllers = List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());
  bool _isLoading = false;
  String? _errorMessage;
  
  @override
  void initState() {
    super.initState();
    _checkOnboarding();
    // Pre-populate business name if settings are already loaded
    final settingsState = context.read<SettingsBloc>().state;
    if (settingsState.settings != null) {
      _businessNameController.text = settingsState.settings!.organizationName;
    }
  }

  Future<void> _checkOnboarding() async {
    final completed = await StorageService.isOnboardingCompleted();
    if (!completed && mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const DeviceOnboardingPage()),
      );
    }
  }

  Future<void> _activate() async {
    final businessName = _businessNameController.text.trim();
    final code = _segmentControllers.map((c) => c.text.trim()).join('-');

    if (businessName.isEmpty || code.isEmpty) {
      setState(() => _errorMessage = 'Please fill in all fields');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final license = await LicenseService.activate(businessName, code);

    if (license != null) {
      if (mounted) {
        // Sync the business name globally if activation was successful
        final settingsBloc = context.read<SettingsBloc>();
        final currentSettings = settingsBloc.state.settings;
        if (currentSettings != null && currentSettings.organizationName != businessName) {
           settingsBloc.add(UpdateAppSettings(currentSettings.copyWith(organizationName: businessName)));
        }
        
        // Refresh entire state to update trial banner and Pro features
        settingsBloc.add(LoadSettings());
        
        _showSuccessDialog(license);
      }
    } else {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Invalid activation code or business name';
      });
    }
  }

  void _showSuccessDialog(LicenseModel license) {
    final expiryFormatted = DateFormat('MMM dd, yyyy').format(license.expiryDate);
    final daysLeft = license.expiryDate.difference(DateTime.now()).inDays;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Icon(Icons.check_circle, color: Colors.green, size: 64),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Activation Successful!',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Text(
                    license.businessName,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const Divider(),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Plan:', style: TextStyle(color: Colors.grey)),
                      Text(license.planType.name.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Expires:', style: TextStyle(color: Colors.grey)),
                      Text(expiryFormatted, style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Duration:', style: TextStyle(color: Colors.grey)),
                      Text('$daysLeft Days', style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Would you like to update your business logo, address, phone, and description now?',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Colors.grey),
            ),
          ],
        ),
        actionsPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(dialogContext).pop();
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const DashboardPage()),
                (route) => false,
              );
            },
            child: const Text('LATER'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(dialogContext).pop();
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const DashboardPage(autoOpenSettings: true)),
                (route) => false,
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('CONFIGURE NOW'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF030509),
              Color(0xFF05070D),
            ],
          ),
        ),
        child: Stack(
          children: [
            // Watermarked Background Logo
            Positioned.fill(
              child: Center(
                child: Opacity(
                  opacity: 0.15,
                  child: Image.asset(
                    'assets/images/logo.png',
                    width: 500,
                    height: 500,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
            ),

            // Content Layout
            BlocListener<SettingsBloc, SettingsState>(
              listenWhen: (previous, current) => 
                previous.settings?.organizationName != current.settings?.organizationName,
              listener: (context, state) {
                if (state.settings != null && _businessNameController.text.isEmpty) {
                  _businessNameController.text = state.settings!.organizationName;
                }
              },
              child: Center(
                child: SingleChildScrollView(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(24),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                        child: Card(
                          color: const Color(0xFF0B0F19).withOpacity(0.55),
                          elevation: 12,
                          margin: EdgeInsets.zero,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(24),
                            side: BorderSide(
                              color: const Color(0xFF6366F1).withOpacity(0.25),
                              width: 1.5,
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 32.0, vertical: 48.0),
                            child: Container(
                              width: 500,
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Image.asset(
                                        'assets/images/logo_transparent.png',
                                        height: 70,
                                      ),
                                      const SizedBox(width: 16),
                                      Icon(Icons.lock_person, size: 70, color: const Color(0xFF818CF8)),
                                    ],
                                  ),
                                  const SizedBox(height: 24),
                                  Text(
                                    widget.isExpired ? 'Subscription Expired' : 'App Activation',
                                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    widget.isExpired 
                                      ? 'Please enter a new activation code to continue using the app.'
                                      : 'Enter your business name and activation code to start.',
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(color: Colors.grey),
                                  ),
                                  const SizedBox(height: 24),
                                  // Device ID Display
                                  FutureBuilder<String>(
                                    future: DeviceInfoService.getDeviceSuffix(),
                                    builder: (context, snapshot) {
                                      if (!snapshot.hasData) return const SizedBox.shrink();
                                      return Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                        decoration: BoxDecoration(
                                          color: Colors.orange.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(20),
                                          border: Border.all(color: Colors.orange.withOpacity(0.3)),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            const Icon(Icons.perm_device_information, size: 16, color: Colors.orange),
                                            const SizedBox(width: 8),
                                            Text(
                                              'DEVICE ID: ${snapshot.data}',
                                              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.deepOrange, letterSpacing: 1.2),
                                            ),
                                          ],
                                        ),
                                      );
                                    },
                                  ),
                                  const SizedBox(height: 24),
                                  TextField(
                                    controller: _businessNameController,
                                    style: const TextStyle(color: Colors.white),
                                    decoration: InputDecoration(
                                      labelText: 'Business Name',
                                      labelStyle: const TextStyle(color: Colors.grey),
                                      prefixIcon: const Icon(Icons.business, color: Colors.grey),
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                      enabledBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(12),
                                        borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                                      ),
                                      focusedBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(12),
                                        borderSide: const BorderSide(color: Color(0xFF6366F1)),
                                      ),
                                      filled: true,
                                      fillColor: Colors.black.withOpacity(0.2),
                                    ),
                                  ),
                                  const SizedBox(height: 20),
                                  _buildSegmentedInput(),
                                  if (_errorMessage != null) ...[
                                    const SizedBox(height: 16),
                                    Text(
                                      _errorMessage!,
                                      style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                  const SizedBox(height: 32),
                                  SizedBox(
                                    width: double.infinity,
                                    height: 56,
                                    child: ElevatedButton(
                                      onPressed: _isLoading ? null : _activate,
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF6366F1),
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                      ),
                                      child: _isLoading 
                                        ? const Text('VERIFYING LICENSE CRYPTOGRAPHY...', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, fontStyle: FontStyle.italic, color: Colors.white))
                                        : const Text('ACTIVATE NOW', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                                    ),
                                  ),
                                  const SizedBox(height: 32),
                                  const Divider(color: Colors.white10),
                                  const SizedBox(height: 16),
                                  Text(
                                    'DON\'T HAVE A CODE?',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.grey[500],
                                      letterSpacing: 1.2,
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      _buildContactIcon(
                                        context,
                                        icon: Icons.phone,
                                        label: 'Support / WhatsApp',
                                        onTap: () => _launchUrl('tel:+2348023552282'),
                                      ),
                                      const SizedBox(width: 32),
                                      _buildContactIcon(
                                        context,
                                        icon: Icons.email,
                                        label: 'Email Support',
                                        onTap: () => _launchUrl('mailto:info.iips.ng@gmail.com'),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSegmentedInput() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Activation Code',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF818CF8)),
            ),
            InkWell(
              onTap: _openQRScanner,
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF6366F1).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF6366F1).withOpacity(0.3)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.qr_code_scanner, size: 14, color: const Color(0xFF818CF8)),
                    const SizedBox(width: 6),
                    const Text(
                      'SCAN QR',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF818CF8),
                        letterSpacing: 1.0,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: List.generate(6, (index) {
            return Expanded(
              child: Padding(
                padding: EdgeInsets.only(right: index == 5 ? 0 : 4),
                child: TextField(
                  controller: _segmentControllers[index],
                  focusNode: _focusNodes[index],
                  textAlign: TextAlign.center,
                  textCapitalization: TextCapitalization.characters,
                  inputFormatters: [
                    LengthLimitingTextInputFormatter(30), // Allow paste
                  ],
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  decoration: InputDecoration(
                    counterText: '',
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Color(0xFF6366F1)),
                    ),
                    filled: true,
                    fillColor: Colors.black.withOpacity(0.3),
                  ),
                  onChanged: (value) {
                    if (value.length > 4) {
                      _handlePaste(index, value);
                    } else if (value.length == 4 && index < 5) {
                      _focusNodes[index + 1].requestFocus();
                    } else if (value.isEmpty && index > 0) {
                      _focusNodes[index - 1].requestFocus();
                    }
                  },
                ),
              ),
            );
          }),
        ),
        const SizedBox(height: 4),
        const Text(
          'Format: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX',
          style: TextStyle(fontSize: 10, color: Colors.grey),
        ),
      ],
    );
  }

  void _handlePaste(int startIndex, String value) {
    // Normalize input (remove dashes)
    final clean = value.replaceAll('-', '').replaceAll(' ', '').toUpperCase();
    
    // Distribute characters starting from the current index
    int charPtr = 0;
    for (int i = startIndex; i < 6; i++) {
      if (charPtr >= clean.length) break;
      
      final end = (charPtr + 4).clamp(0, clean.length);
      _segmentControllers[i].text = clean.substring(charPtr, end);
      charPtr += 4;
    }
    
    // Set focus to the segment where distribution ended
    final segmentsFilled = (clean.length / 4).ceil();
    final targetIdx = (startIndex + segmentsFilled - 1).clamp(0, 5);
    _focusNodes[targetIdx].requestFocus();
    
    // Move cursor to end of text in the focused box
    _segmentControllers[targetIdx].selection = TextSelection.fromPosition(
      TextPosition(offset: _segmentControllers[targetIdx].text.length),
    );
  }

  Widget _buildContactIcon(BuildContext context, {required IconData icon, required String label, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF6366F1).withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: const Color(0xFF818CF8)),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: Color(0xFF818CF8),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _launchUrl(String url) async {
    final Uri uri = Uri.parse(url);
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Could not launch $url')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error launching support link: $e')),
        );
      }
    }
  }

  @override
  void dispose() {
    _businessNameController.dispose();
    for (var c in _segmentControllers) {
      c.dispose();
    }
    for (var f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  void _openQRScanner() {
    bool _scanned = false;
    showDialog(
      context: context,
      builder: (dialogContext) {
        return Dialog(
          backgroundColor: const Color(0xFF0B0F19),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
            side: BorderSide(color: const Color(0xFF6366F1).withOpacity(0.3), width: 1.5),
          ),
          child: Container(
            width: 400,
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.qr_code_scanner, color: const Color(0xFF818CF8), size: 24),
                        const SizedBox(width: 12),
                        const Text(
                          'QR Code Scanner',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.grey),
                      onPressed: () => Navigator.of(dialogContext).pop(),
                    ),
                  ],
                ),
                const Divider(color: Colors.white10),
                const SizedBox(height: 16),
                
                Container(
                  height: 240,
                  width: 240,
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.4),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFF6366F1).withOpacity(0.2)),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: MobileScanner(
                      onDetect: (capture) {
                        if (_scanned) return;
                        final List<Barcode> barcodes = capture.barcodes;
                        for (final barcode in barcodes) {
                          if (barcode.rawValue != null) {
                            final code = barcode.rawValue!.trim().toUpperCase();
                            if (code.contains('-') || code.length >= 10) {
                              _scanned = true;
                              Navigator.of(dialogContext).pop();
                              _fillActivationCode(code);
                              _showScannerSuccess(code);
                              return;
                            }
                          }
                        }
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                
                const Text(
                  'Scan the license certificate QR generated on the Web Console to activate immediately.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey, fontSize: 12, height: 1.4),
                ),
                const SizedBox(height: 24),
                
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      final data = await Clipboard.getData('text/plain');
                      if (data != null && data.text != null && data.text!.isNotEmpty) {
                        final clean = data.text!.trim().toUpperCase();
                        if (clean.contains('-') || clean.length >= 10) {
                          Navigator.of(dialogContext).pop();
                          _fillActivationCode(clean);
                          _showScannerSuccess(clean);
                          return;
                        }
                      }
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('No valid activation key found on clipboard.')),
                        );
                      }
                    },
                    icon: const Icon(Icons.content_paste, size: 16),
                    label: const Text('PASTE / CLIP'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: BorderSide(color: Colors.white.withOpacity(0.15)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _fillActivationCode(String rawCode) {
    final clean = rawCode.replaceAll('-', '').replaceAll(' ', '').toUpperCase();
    int charPtr = 0;
    for (int i = 0; i < 6; i++) {
      if (charPtr >= clean.length) break;
      final end = (charPtr + 4).clamp(0, clean.length);
      _segmentControllers[i].text = clean.substring(charPtr, end);
      charPtr += 4;
    }
  }

  void _showScannerSuccess(String code) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: Colors.green[800],
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Scanned Code: $code successfully mapped!',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _simulateLiveScan() {
    final textController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF0B0F19),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: const Color(0xFF6366F1).withOpacity(0.3)),
        ),
        title: const Text('Simulate Web QR Camera Scanner', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Input or paste the certificate activation key to simulate camera scanner detection.',
              style: TextStyle(color: Colors.grey, fontSize: 12),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: textController,
              autofocus: true,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'e.g. SQGB-4F6F-HQVI-...',
                hintStyle: const TextStyle(color: Colors.white30),
                filled: true,
                fillColor: Colors.black26,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('CANCEL', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            onPressed: () {
              final code = textController.text.trim().toUpperCase();
              Navigator.of(context).pop();
              if (code.isNotEmpty) {
                _fillActivationCode(code);
                _showScannerSuccess(code);
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366F1)),
            child: const Text('COMPLETE SCAN', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}

class ScannerLaserAnimation extends StatefulWidget {
  const ScannerLaserAnimation({super.key});

  @override
  State<ScannerLaserAnimation> createState() => _ScannerLaserAnimationState();
}

class _ScannerLaserAnimationState extends State<ScannerLaserAnimation> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);
    
    _animation = Tween<double>(begin: 0.1, end: 0.9).animate(_controller);
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Stack(
          children: [
            Align(
              alignment: Alignment(0, _animation.value * 2 - 1),
              child: Container(
                height: 3,
                width: 220,
                decoration: BoxDecoration(
                  color: Colors.redAccent,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.redAccent.withOpacity(0.8),
                      blurRadius: 8,
                      spreadRadius: 2,
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
