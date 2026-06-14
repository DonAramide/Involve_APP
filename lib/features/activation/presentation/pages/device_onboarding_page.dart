import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:dio/dio.dart';
import 'package:geolocator/geolocator.dart';
import 'package:involve_app/core/license/storage_service.dart';
import 'package:involve_app/core/utils/device_info_service.dart';
import 'package:involve_app/features/activation/presentation/pages/activation_page.dart';
import 'package:involve_app/features/dashboard/presentation/pages/dashboard_page.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

class DeviceOnboardingPage extends StatefulWidget {
  const DeviceOnboardingPage({super.key});

  @override
  State<DeviceOnboardingPage> createState() => _DeviceOnboardingPageState();
}

class _DeviceOnboardingPageState extends State<DeviceOnboardingPage> {
  final _formKey = GlobalKey<FormState>();
  final _businessNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _agentCodeController = TextEditingController();
  
  String _selectedIndustry = 'retail';
  String _primaryColorHex = '#6366F1';
  bool _isLoading = false;
  int _currentStep = 0;

  final List<Map<String, String>> _stepsInfo = [
    {
      'title': 'Welcome to Invify',
      'desc': ' fin-tech grade enterprise system orchestrator. Let\'s configure your device profile for lightning-fast speeds.',
      'icon': 'rocket_launch',
    },
    {
      'title': 'Identity & Operation Mode',
      'desc': 'Enter your business details and select your core operational industry mode.',
      'icon': 'business',
    },
    {
      'title': 'Branding & Telemetry Sync',
      'desc': 'Choose your primary brand color and publish your secure device telemetry signature.',
      'icon': 'security',
    }
  ];

  @override
  void initState() {
    super.initState();
    // Default pre-population from existing settings if any
    final state = context.read<SettingsBloc>().state;
    if (state.settings != null) {
      _businessNameController.text = state.settings!.organizationName;
    }
  }

  Future<String> _getCurrentLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return 'Location disabled';

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) return 'Permissions denied';
      }
      if (permission == LocationPermission.deniedForever) return 'Permissions denied forever';

      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
      );
      return 'Lat: ${position.latitude.toStringAsFixed(4)}, Lng: ${position.longitude.toStringAsFixed(4)}';
    } catch (e) {
      return 'Unknown Location';
    }
  }

  Future<void> _submitOnboarding({required bool isTrial}) async {
    if (!_formKey.currentState!.validate()) {
      setState(() => _currentStep = 1); // Switch to the form step
      return;
    }

    setState(() => _isLoading = true);

    final businessName = _businessNameController.text.trim();
    final phone = _phoneController.text.trim();
    final inputAgentCode = _agentCodeController.text.trim();
    final finalAgentCode = inputAgentCode.isEmpty ? 'AAA000' : inputAgentCode;
    
    // Get full diagnostic device specs
    final deviceInfo = await DeviceInfoService.getDeviceDetails();

    // 1. Mark onboarding completed locally
    await StorageService.setOnboardingCompleted(true);
    
    // Set settings state globally inside settings BLoC
    final settingsBloc = context.read<SettingsBloc>();
    final currentSettings = settingsBloc.state.settings;
    if (currentSettings != null) {
      final parsedColor = int.parse(_primaryColorHex.replaceFirst('#', '0xFF'));
      
      settingsBloc.add(UpdateAppSettings(
        currentSettings.copyWith(
          organizationName: businessName,
          lastRoute: isTrial ? DashboardPage.routeName : ActivationPage.routeName,
          businessMode: _selectedIndustry,
          primaryColor: parsedColor,
        )
      ));
    }

    final actualLocation = await _getCurrentLocation();

    // 2. Resiliently transmit the device details to the backend API
    bool apiSuccess = false;
    try {
      final dio = Dio(BaseOptions(connectTimeout: const Duration(seconds: 5)));
      final payload = {
        'businessName': businessName,
        'phone': phone,
        'industry': _selectedIndustry,
        'themeColor': _primaryColorHex,
        'agentCode': finalAgentCode,
        'location': actualLocation,
        'deviceInfo': deviceInfo,
      };

      // Try local host ports (resilient fallbacks for Android/iOS emulators and localhost)
      final urls = [
        'http://localhost:3004/devices/onboard',
        'http://10.59.69.40:3004/devices/onboard',
      ];

      for (var url in urls) {
        try {
          await dio.post(url, data: payload);
          apiSuccess = true;
          debugPrint('[DeviceOnboarding] Successfully transmitted diagnostics to $url');
          break; // Stop once we successfully ping one of the active developer endpoints
        } catch (_) {}
      }
    } catch (e) {
      debugPrint('[DeviceOnboarding] Error during telemetry delivery: $e');
    }

    if (!isTrial && !apiSuccess) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Server is currently unavailable. Please proceed with the Free 3-Day Trial.'),
            backgroundColor: Color(0xFFF59E0B), // Warning Orange
            behavior: SnackBarBehavior.floating,
            duration: Duration(seconds: 4),
          ),
        );
      }
      return;
    }

    if (isTrial) {
      // Initialize 3-Day Trial
      await StorageService.saveTrialStartDate(DateTime.now());
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const DashboardPage()),
          (route) => false,
        );
      }
    } else {
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const ActivationPage(isExpired: false)),
          (route) => false,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: const Color(0xFF05070D),
      body: AnnotatedRegion<SystemUiOverlayStyle>(
        value: SystemUiOverlayStyle.light,
        child: Container(
          decoration: const BoxDecoration(
            gradient: RadialGradient(
              center: Alignment.topLeft,
              radius: 1.5,
              colors: [
                Color(0xFF0B1226),
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

              // Main Content Layout
              SafeArea(
                child: Center(
                  child: SingleChildScrollView(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Form(
                        key: _formKey,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(24),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                            child: Card(
                              color: const Color(0xFF0B0F19).withOpacity(0.55),
                              elevation: 24,
                              margin: EdgeInsets.zero,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(24),
                                side: BorderSide(
                                  color: const Color(0xFF6366F1).withOpacity(0.25),
                                  width: 1.5,
                                ),
                              ),
                              child: Container(
                                width: 500,
                                padding: const EdgeInsets.symmetric(horizontal: 32.0, vertical: 40.0),
                                child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Header Branding Row
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF6366F1).withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: const Icon(
                                        Icons.rocket_launch,
                                        color: Color(0xFF818CF8),
                                        size: 24,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'INVIFY',
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14,
                                            letterSpacing: 1.5,
                                          ),
                                        ),
                                        Text(
                                          'DEVICE TELEMETRY ONBOARDING',
                                          style: TextStyle(
                                            color: Color(0xFF818CF8),
                                            fontWeight: FontWeight.bold,
                                            fontSize: 9,
                                            letterSpacing: 1.0,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 32),

                                // Indicator Row
                                Row(
                                  children: List.generate(3, (index) {
                                    final isActive = index <= _currentStep;
                                    return Expanded(
                                      child: Container(
                                        height: 3,
                                        margin: EdgeInsets.only(right: index == 2 ? 0 : 8),
                                        decoration: BoxDecoration(
                                          color: isActive
                                              ? const Color(0xFF6366F1)
                                              : Colors.white.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(2),
                                        ),
                                      ),
                                    );
                                  }),
                                ),
                                const SizedBox(height: 24),

                                // Step Title & Description
                                Text(
                                  _stepsInfo[_currentStep]['title']!,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  _stepsInfo[_currentStep]['desc']!,
                                  style: TextStyle(
                                    color: Colors.grey[400],
                                    fontSize: 13,
                                    height: 1.4,
                                  ),
                                ),
                                const SizedBox(height: 32),

                                // Step Contents Switcher
                                _buildStepContent(size),

                                const SizedBox(height: 32),

                                // Actions
                                if (_isLoading)
                                  const Center(
                                    child: CircularProgressIndicator(
                                      color: Color(0xFF6366F1),
                                    ),
                                  )
                                else
                                  _buildStepActions(),
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
  ),
);
}

  Widget _buildStepContent(Size size) {
    if (_currentStep == 0) {
      return Column(
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFF101625),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withOpacity(0.05)),
            ),
            child: Column(
              children: [
                _buildIntroBullet(Icons.point_of_sale, 'Checkout Speed Operations', 'Optimized payment flows and offline billing.'),
                const SizedBox(height: 16),
                _buildIntroBullet(Icons.menu_book, 'Curriculum Planner', 'Structured tuitions, attendance records, and syllabus.'),
                const SizedBox(height: 16),
                _buildIntroBullet(Icons.shield, 'Device Security binding', 'Enterprise grade binary signatures mapped directly to hardware ID.'),
              ],
            ),
          ),
        ],
      );
    }

    if (_currentStep == 1) {
      return Column(
        children: [
          TextFormField(
            controller: _businessNameController,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              labelText: 'Business / School Name',
              labelStyle: const TextStyle(color: Color(0xFF818CF8)),
              prefixIcon: const Icon(Icons.business, color: Color(0xFF818CF8)),
              filled: true,
              fillColor: const Color(0xFF101625),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF6366F1)),
              ),
            ),
            validator: (value) => value == null || value.trim().isEmpty ? 'Required' : null,
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              labelText: 'WhatsApp Contact (Telemetry)',
              labelStyle: const TextStyle(color: Color(0xFF818CF8)),
              prefixIcon: const Icon(Icons.phone, color: Color(0xFF818CF8)),
              filled: true,
              fillColor: const Color(0xFF101625),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF6366F1)),
              ),
            ),
            validator: (value) => value == null || value.trim().isEmpty ? 'Required' : null,
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _agentCodeController,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              labelText: 'Agent Code (Optional)',
              labelStyle: const TextStyle(color: Color(0xFF818CF8)),
              prefixIcon: const Icon(Icons.badge, color: Color(0xFF818CF8)),
              filled: true,
              fillColor: const Color(0xFF101625),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF6366F1)),
              ),
            ),
          ),
          const SizedBox(height: 24),
          const Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Select Industry Sector Mode:',
              style: TextStyle(color: Colors.grey, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildIndustrySelector('school', Icons.school, 'School'),
              const SizedBox(width: 8),
              _buildIndustrySelector('retail', Icons.shopping_cart, 'Retail'),
              const SizedBox(width: 8),
              _buildIndustrySelector('services', Icons.dry_cleaning, 'Service'),
            ],
          ),
        ],
      );
    }

    // Step 3
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Select Theme Primary Accent:',
          style: TextStyle(color: Colors.grey, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _buildColorOption('#6366F1', const Color(0xFF6366F1)),
            _buildColorOption('#10B981', const Color(0xFF10B981)),
            _buildColorOption('#F59E0B', const Color(0xFFF59E0B)),
            _buildColorOption('#EF4444', const Color(0xFFEF4444)),
            _buildColorOption('#EC4899', const Color(0xFFEC4899)),
          ],
        ),
        const SizedBox(height: 32),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF101625),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.2)),
          ),
          child: Row(
            children: [
              const Icon(Icons.info_outline, color: Color(0xFFF59E0B), size: 20),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Onboarding completes your hardware profile binding securely.',
                  style: TextStyle(
                    color: Colors.grey[400],
                    fontSize: 11,
                    height: 1.3,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildIntroBullet(IconData icon, String title, String desc) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: const Color(0xFF818CF8), size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
              ),
              const SizedBox(height: 2),
              Text(
                desc,
                style: TextStyle(color: Colors.grey[500], fontSize: 11),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildIndustrySelector(String id, IconData icon, String label) {
    final isSelected = _selectedIndustry == id;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedIndustry = id),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF6366F1).withOpacity(0.15) : const Color(0xFF101625),
            border: Border.all(
              color: isSelected ? const Color(0xFF6366F1) : Colors.white.withOpacity(0.05),
              width: 1.5,
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              Icon(icon, color: isSelected ? const Color(0xFF818CF8) : Colors.grey, size: 20),
              const SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? Colors.white : Colors.grey,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildColorOption(String hex, Color color) {
    final isSelected = _primaryColorHex == hex;
    return InkWell(
      onTap: () => setState(() => _primaryColorHex = hex),
      customBorder: const CircleBorder(),
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
            color: isSelected ? Colors.white : Colors.transparent,
            width: 2,
          ),
        ),
        child: CircleAvatar(
          backgroundColor: color,
          radius: 12,
        ),
      ),
    );
  }

  Widget _buildStepActions() {
    if (_currentStep < 2) {
      return Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          if (_currentStep > 0)
            TextButton(
              onPressed: () => setState(() => _currentStep--),
              child: const Text('BACK', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
            )
          else
            const SizedBox.shrink(),
          ElevatedButton(
            onPressed: () {
              if (_currentStep == 1 && !_formKey.currentState!.validate()) {
                return;
              }
              setState(() => _currentStep++);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF6366F1),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            child: const Text('NEXT STEP', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      );
    }

    // Step 3 Actions
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton(
            onPressed: () => _submitOnboarding(isTrial: false),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF6366F1),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('ONBOARD & ACTIVATE DEVICE', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          height: 50,
          child: OutlinedButton(
            onPressed: () => _submitOnboarding(isTrial: true),
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: const Color(0xFF10B981).withOpacity(0.5)),
              foregroundColor: const Color(0xFF10B981),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('START FREE 3-DAY TRIAL', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          ),
        ),
        const SizedBox(height: 16),
        Center(
          child: TextButton(
            onPressed: () => setState(() => _currentStep = 1),
            child: const Text('GO BACK TO DETAILS', style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
          ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _businessNameController.dispose();
    _phoneController.dispose();
    _agentCodeController.dispose();
    super.dispose();
  }
}
