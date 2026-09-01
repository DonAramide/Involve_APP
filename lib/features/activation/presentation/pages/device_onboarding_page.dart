import 'package:involve_app/core/utils/app_config.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
import 'package:involve_app/core/widgets/invify_brand_logo.dart';


import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:dio/dio.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:geolocator/geolocator.dart';
import 'package:involve_app/core/license/storage_service.dart';
import 'package:involve_app/core/utils/device_info_service.dart';
import 'package:involve_app/features/dashboard/presentation/pages/dashboard_page.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../utils/onboarding_navigator.dart';
import '../../data/nigeria_states_lgas.dart';
import 'package:involve_app/core/widgets/barcode_scanner_dialog.dart';
import 'package:involve_app/features/settings/domain/services/security_service.dart';

class DeviceOnboardingPage extends StatefulWidget {
  const DeviceOnboardingPage({super.key});


  @override
  State<DeviceOnboardingPage> createState() => _DeviceOnboardingPageState();
}

class _DeviceOnboardingPageState extends State<DeviceOnboardingPage> {
  final _formKey = GlobalKey<FormState>();
  
  // New Registration Fields
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  // Existing Fields
  final _businessNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _agentCodeController = TextEditingController();
  WestAfricanCountry _selectedCountryCode = westAfricanCountries.first;
  
  // Address Fields
  final _streetController = TextEditingController();
  String? _selectedCountry = 'Nigeria';
  String? _selectedState;
  String? _selectedLga;
  final _stateController = TextEditingController(); // For non-Nigeria states
  
  String _selectedIndustry = 'retail';
  String _primaryColorHex = '#6366F1';
  bool _isLoading = false;
  int _currentStep = 0;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool? _isServerReachable;

  final List<Map<String, String>> _stepsInfo = [
    {
      'title': 'Welcome to Invify',
      'desc': ' fin-tech grade enterprise system orchestrator. Let\'s configure your device profile for lightning-fast speeds.',
      'icon': 'rocket_launch',
    },
    {
      'title': 'Identity & Operation Mode',
      'desc': 'Enter your personal details, business details, and select your core operational industry mode.',
      'icon': 'business',
    },
    {
      'title': 'Business Address',
      'desc': 'Enter the physical location of your business for compliance and geo-telemetry.',
      'icon': 'location_on',
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
    _pingServer();
    final state = context.read<SettingsBloc>().state;
    if (state.settings != null) {
      final savedName = state.settings!.organizationName;
      // Only pre-fill if there's a real saved name (not a placeholder)
      if (savedName.isNotEmpty && savedName != 'My Business' && savedName != 'My Business (Reset)') {
        _businessNameController.text = savedName;
      }
    }
  }

  String? _serverPingError;

  Future<void> _pingServer({bool showFeedback = false}) async {
    String? errorReason;
    bool success = false;
    final targetUrl = AppConfig.baseUrl;

    try {
      final response = await http.get(Uri.parse('$targetUrl/livez'))
          .timeout(const Duration(seconds: 5));
      if (response.statusCode < 500) {
        success = true;
      } else {
        errorReason = 'The Invify server is temporarily unavailable. Please try again.';
      }
    } catch (e) {
      try {
        final dio = Dio(BaseOptions(connectTimeout: const Duration(seconds: 5), receiveTimeout: const Duration(seconds: 5)));
        final res = await dio.get('$targetUrl/settings/onboarding');
        if ((res.statusCode ?? 500) < 500) {
          success = true;
        } else {
          errorReason = 'Could not reach the Invify server. Please try again.';
        }
      } catch (e2) {
        errorReason = friendlyApiError(
          e2,
          fallback:
              'Could not reach the Invify server. Connect this tablet to the same Wi-Fi as the office computer, then tap the cloud icon to retry.',
        );
      }
    }

    if (mounted) {
      setState(() {
        _isServerReachable = success;
        _serverPingError = success ? null : errorReason;
      });

      if (showFeedback) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              success
                  ? 'Connected to the Invify server.'
                  : (errorReason ??
                      'Could not reach the Invify server. Connect this tablet to the same Wi-Fi as the office computer, then try again.'),
            ),
            backgroundColor: success ? const Color(0xFF10B981) : const Color(0xFFEF4444),
            duration: const Duration(seconds: 5),
          ),
        );
      }
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
    if (_isLoading) return;

    if (!_formKey.currentState!.validate()) {
      setState(() => _currentStep = 1);
      return;
    }

    setState(() => _isLoading = true);

    try {
      final dio = Dio(BaseOptions(connectTimeout: const Duration(seconds: 10)));
      
      // Fetch Onboarding Settings
      List<String> requiredChannels = ['EMAIL']; // Default fallback
      try {
        final response = await dio.get('${AppConfig.baseUrl}/settings/onboarding');
        if (response.data['requiredChannels'] != null) {
          requiredChannels = List<String>.from(response.data['requiredChannels']);
        }
      } catch (_) {
        debugPrint('Failed to fetch onboarding settings, using default channels.');
      }

      // ── Collect Device ID and GPS Location before registration ──
      final deviceId = await DeviceInfoService.getDeviceSuffix();
      
      // Use getLastKnownPosition or timeout getCurrentPosition to avoid 5+ second GPS hangs indoors
      String gpsLocation = 'Unknown Location';
      try {
        bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
        if (serviceEnabled) {
          LocationPermission permission = await Geolocator.checkPermission();
          if (permission == LocationPermission.whileInUse || permission == LocationPermission.always) {
            Position? position = await Geolocator.getLastKnownPosition();
            position ??= await Geolocator.getCurrentPosition(
              desiredAccuracy: LocationAccuracy.medium,
            ).timeout(const Duration(seconds: 2));
            
            gpsLocation = 'Lat: ${position.latitude.toStringAsFixed(4)}, Lng: ${position.longitude.toStringAsFixed(4)}';
          }
        }
      } catch (e) {
        debugPrint('Geolocator timeout or error: $e');
      }

      // Format phone number with country dial code
      String nationalPhone = _phoneController.text.trim().replaceAll(RegExp(r'\D'), '');
      if (nationalPhone.startsWith('0')) {
        nationalPhone = nationalPhone.replaceFirst(RegExp(r'^0+'), '');
      }
      final formattedFullPhone = '${_selectedCountryCode.dialCode}$nationalPhone';

      // Keep buttons locked until OTP is sent and the verify page opens.
      final payload = {
        'firstName': _firstNameController.text.trim(),
        'lastName': _lastNameController.text.trim(),
        'email': _emailController.text.trim(),
        'password': _passwordController.text,
        'phone': formattedFullPhone,
        'businessName': _businessNameController.text.trim(),
        'industry': _selectedIndustry,
        'themeColor': _primaryColorHex,
        'agentCode': _agentCodeController.text.trim().isEmpty ? 'AAA000' : _agentCodeController.text.trim().toUpperCase(),
        'deviceId': deviceId,
        'location': gpsLocation,
        'country': _selectedCountry,
        'state': _selectedCountry == 'Nigeria' ? _selectedState : _stateController.text.trim(),
        'lga': _selectedCountry == 'Nigeria' ? _selectedLga : null,
        'streetAddress': _streetController.text.trim(),
        'isTrial': isTrial,
        'completedChannels': <String>[],
      };

      if (mounted) {
        await OnboardingNavigator.proceed(context, payload, requiredChannels);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: const Color(0xFFEF4444),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      // Unlock only if still on this page (OTP send failed or user returned).
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: const Color(0xFF05070D),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () {
            if (_currentStep > 0) {
              setState(() => _currentStep--);
            } else {
              if (Navigator.of(context).canPop()) {
                Navigator.of(context).pop();
              } else {
                SystemNavigator.pop();
              }
            }
          },
        ),
      ),
      body: AnnotatedRegion<SystemUiOverlayStyle>(
        value: SystemUiOverlayStyle.light,
        child: Container(
          decoration: const BoxDecoration(
            gradient: RadialGradient(
              center: Alignment.topLeft,
              radius: 1.5,
              colors: [Color(0xFF0B1226), Color(0xFF05070D)],
            ),
          ),
          child: Stack(
            children: [
              Positioned.fill(
                child: Center(
                  child: Opacity(
                    opacity: 0.15,
                    child: InvifyBrandLogo(
                      size: 500,
                      fit: BoxFit.contain,
                    ),
                  ),
                ),
              ),
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
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(8),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF6366F1).withOpacity(0.1),
                                            borderRadius: BorderRadius.circular(10),
                                          ),
                                          child: const Icon(Icons.rocket_launch, color: Color(0xFF818CF8), size: 24),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: const [
                                              Text('INVIFY', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14, letterSpacing: 1.5)),
                                              Text('DEVICE TELEMETRY ONBOARDING', style: TextStyle(color: Color(0xFF818CF8), fontWeight: FontWeight.bold, fontSize: 9, letterSpacing: 1.0)),
                                            ],
                                          ),
                                        ),
                                        if (_isServerReachable != null)
                                          IconButton(
                                            icon: Icon(
                                              _isServerReachable! ? Icons.cloud_done : Icons.cloud_off,
                                              color: _isServerReachable! ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                              size: 24,
                                            ),
                                            onPressed: () {
                                              setState(() => _isServerReachable = null);
                                              _pingServer(showFeedback: true);
                                            },
                                            tooltip: _isServerReachable!
                                                ? 'Connected to the Invify server'
                                                : 'Cannot reach the Invify server. Tap to retry',
                                          )
                                        else
                                          const Padding(
                                            padding: EdgeInsets.all(12.0),
                                            child: SizedBox(
                                              width: 20,
                                              height: 20,
                                              child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF818CF8)),
                                            ),
                                          ),
                                      ],
                                    ),
                                    const SizedBox(height: 32),
                                    Row(
                                      children: List.generate(4, (index) {
                                        final isActive = index <= _currentStep;
                                        return Expanded(
                                          child: Container(
                                            height: 3,
                                            margin: EdgeInsets.only(right: index == 3 ? 0 : 8),
                                            decoration: BoxDecoration(
                                              color: isActive ? const Color(0xFF6366F1) : Colors.white.withOpacity(0.1),
                                              borderRadius: BorderRadius.circular(2),
                                            ),
                                          ),
                                        );
                                      }),
                                    ),
                                    const SizedBox(height: 24),
                                    Text(_stepsInfo[_currentStep]['title']!, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                                    const SizedBox(height: 8),
                                    Text(_stepsInfo[_currentStep]['desc']!, style: TextStyle(color: Colors.grey[400], fontSize: 13, height: 1.4)),
                                    const SizedBox(height: 32),
                                    _buildStepContent(size),
                                    const SizedBox(height: 32),
                                    if (_isLoading)
                                      const Column(
                                        children: [
                                          Center(child: CircularProgressIndicator(color: Color(0xFF6366F1))),
                                          SizedBox(height: 16),
                                          Text(
                                            'Sending verification code…',
                                            style: TextStyle(color: Colors.grey, fontSize: 13),
                                          ),
                                        ],
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
          Row(
            children: [
              Expanded(
                child: _buildTextField(_firstNameController, 'First Name', Icons.person),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildTextField(_lastNameController, 'Last Name', Icons.person_outline),
              ),
            ],
          ),
          const SizedBox(height: 20),
          _buildTextField(_emailController, 'Email Address', Icons.email, isEmail: true),
          const SizedBox(height: 20),
          _buildTextField(
            _passwordController, 
            'Create Web Password', 
            Icons.lock, 
            isPassword: true,
            isObscured: _obscurePassword,
            onToggleObscure: () => setState(() => _obscurePassword = !_obscurePassword),
            helperText: 'Used to sign in to the Invify Web Management Portal',
            customValidator: (value) {
              if (value == null || value.trim().isEmpty) return 'Password is required';
              if (value.length < 9) return 'Password must be at least 9 characters';
              if (!RegExp(r'[A-Z]').hasMatch(value)) return 'Password must contain at least one capital letter (A-Z)';
              if (!RegExp(r'[a-z]').hasMatch(value)) return 'Password must contain at least one lowercase letter (a-z)';
              if (!RegExp(r'[0-9]').hasMatch(value)) return 'Password must contain at least one number (0-9)';
              if (!RegExp(r'[^A-Za-z0-9]').hasMatch(value)) return 'Password must contain at least one symbol (e.g. !@#\$)';
              return null;
            },
          ),
          _buildPasswordRequirements(),
          const SizedBox(height: 20),
          _buildTextField(
            _confirmPasswordController, 
            'Confirm Web Password', 
            Icons.lock_outline, 
            isPassword: true,
            isObscured: _obscureConfirmPassword,
            onToggleObscure: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
            customValidator: (value) {
              if (value == null || value.isEmpty) return 'Required';
              if (value != _passwordController.text) return 'Passwords do not match';
              return null;
            },
          ),
          const SizedBox(height: 20),
          _buildTextField(_businessNameController, 'Business / Tenant Name', Icons.business),
          const SizedBox(height: 20),
          _buildPhoneFieldWithCountrySelector(),
          const SizedBox(height: 20),
          _buildTextField(_agentCodeController, 'Agent Code (Optional)', Icons.badge, isRequired: false),
          const SizedBox(height: 24),
          const Align(
            alignment: Alignment.centerLeft,
            child: Text('Select Industry Sector Mode:', style: TextStyle(color: Colors.grey, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1)),
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

    if (_currentStep == 2) {
      return _buildAddressStep();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Select Theme Primary Accent:', style: TextStyle(color: Colors.grey, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1)),
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
                child: Text('OTP Verification will begin next to bind your hardware profile securely.', style: TextStyle(color: Colors.grey[400], fontSize: 11, height: 1.3)),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTextField(
    TextEditingController controller, 
    String label, 
    IconData icon, {
    bool isEmail = false, 
    bool isPhone = false, 
    bool isPassword = false, 
    bool isRequired = true, 
    String? Function(String?)? customValidator,
    String? helperText,
    bool? isObscured,
    VoidCallback? onToggleObscure,
  }) {
    final obscure = isPassword ? (isObscured ?? _obscurePassword) : false;
    return TextFormField(
      controller: controller,
      style: const TextStyle(color: Colors.white),
      obscureText: obscure,
      keyboardType: isEmail ? TextInputType.emailAddress : isPhone ? TextInputType.phone : TextInputType.text,
      decoration: InputDecoration(
        labelText: label,
        helperText: helperText,
        helperStyle: TextStyle(color: Colors.grey[400], fontSize: 11),
        labelStyle: const TextStyle(color: Color(0xFF818CF8)),
        prefixIcon: Icon(icon, color: const Color(0xFF818CF8)),
        suffixIcon: isPassword
            ? IconButton(
                icon: Icon(
                  obscure ? Icons.visibility_off : Icons.visibility,
                  color: const Color(0xFF818CF8),
                ),
                onPressed: onToggleObscure ?? () {
                  setState(() {
                    _obscurePassword = !_obscurePassword;
                  });
                },
              )
            : null,
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
      validator: customValidator ?? (isRequired ? (value) => value == null || value.trim().isEmpty ? 'Required' : null : null),
    );
  }

  Widget _buildPasswordRequirements() {
    return ValueListenableBuilder<TextEditingValue>(
      valueListenable: _passwordController,
      builder: (context, value, _) {
        final text = value.text;
        final hasMinLength = text.length >= 9;
        final hasUppercase = RegExp(r'[A-Z]').hasMatch(text);
        final hasNumber = RegExp(r'[0-9]').hasMatch(text);
        final hasSymbol = RegExp(r'[^A-Za-z0-9]').hasMatch(text);

        Widget buildChip(String label, bool isValid) {
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: isValid ? const Color(0x2210B981) : const Color(0x1A6B7280),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(
                color: isValid ? const Color(0xFF10B981) : Colors.white.withOpacity(0.08),
                width: 1,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  isValid ? Icons.check_circle_rounded : Icons.radio_button_unchecked,
                  size: 12,
                  color: isValid ? const Color(0xFF10B981) : Colors.grey[500],
                ),
                const SizedBox(width: 4),
                Text(
                  label,
                  style: TextStyle(
                    color: isValid ? const Color(0xFF10B981) : Colors.grey[400],
                    fontSize: 10.5,
                    fontWeight: isValid ? FontWeight.bold : FontWeight.normal,
                  ),
                ),
              ],
            ),
          );
        }

        return Container(
          margin: const EdgeInsets.only(top: 8, bottom: 4),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Password Security Requirements:',
                style: TextStyle(
                  color: Colors.grey[400],
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  buildChip('9+ Characters', hasMinLength),
                  buildChip('1+ Capital (A-Z)', hasUppercase),
                  buildChip('1+ Number (0-9)', hasNumber),
                  buildChip('1+ Symbol (!@#\$)', hasSymbol),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPhoneFieldWithCountrySelector() {
    return TextFormField(
      controller: _phoneController,
      style: const TextStyle(color: Colors.white),
      keyboardType: TextInputType.phone,
      decoration: InputDecoration(
        labelText: 'WhatsApp Contact',
        labelStyle: const TextStyle(color: Color(0xFF818CF8)),
        helperText: 'Max 14 digits (West Africa regional code included)',
        helperStyle: TextStyle(color: Colors.grey[400], fontSize: 11),
        prefixIcon: InkWell(
          onTap: _showCountryPickerBottomSheet,
          borderRadius: const BorderRadius.horizontal(left: Radius.circular(12)),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            margin: const EdgeInsets.only(right: 8),
            decoration: BoxDecoration(
              border: Border(
                right: BorderSide(color: Colors.white.withOpacity(0.1)),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _selectedCountryCode.flag,
                  style: const TextStyle(fontSize: 18),
                ),
                const SizedBox(width: 6),
                Text(
                  _selectedCountryCode.dialCode,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(width: 4),
                const Icon(Icons.arrow_drop_down, color: Color(0xFF818CF8), size: 18),
              ],
            ),
          ),
        ),
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
      validator: (value) {
        if (value == null || value.trim().isEmpty) return 'WhatsApp contact is required';
        final clean = value.trim().replaceAll(RegExp(r'\D'), '');
        
        // 1. Length check: must not exceed 14 digits
        final fullDigits = '${_selectedCountryCode.dialCode.replaceAll('+', '')}$clean';
        if (clean.length > 14 || fullDigits.length > 14) {
          return 'Phone number cannot exceed 14 digits';
        }
        if (clean.length < _selectedCountryCode.minLength) {
          return 'Enter a valid ${_selectedCountryCode.name} number (min ${_selectedCountryCode.minLength} digits)';
        }

        // 2. Dummy / repetitive digits check (00000000000, 1111111111, etc.)
        if (RegExp(r'^(.)\1+$').hasMatch(clean)) {
          return 'Invalid phone number (cannot be repetitive digits like 000000... or 111111...)';
        }

        // 3. Sequential digits check (123456789, 987654321, 0123456789)
        const sequential = ['0123456789', '1234567890', '9876543210', '0987654321'];
        for (final seq in sequential) {
          if (seq.contains(clean) && clean.length >= 6) {
            return 'Invalid phone number (cannot be sequential digits)';
          }
        }

        // 4. Nigerian specific format check
        if (_selectedCountryCode.code == 'NG') {
          String normalized = clean.startsWith('0') ? clean.substring(1) : clean;
          if (normalized.length == 10 && !RegExp(r'^[789]').hasMatch(normalized)) {
            return 'Nigerian mobile numbers must start with 7, 8, or 9';
          }
        }

        return null;
      },
    );
  }

  void _showCountryPickerBottomSheet() {
    final searchCtrl = TextEditingController();
    List<WestAfricanCountry> filtered = List.from(westAfricanCountries);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => SafeArea(
          child: Container(
            height: MediaQuery.of(ctx).size.height * 0.65,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              children: [
                Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const Text(
                  'Select West African Country Code',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: searchCtrl,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'Search country or dial code (+234)...',
                    hintStyle: const TextStyle(color: Colors.white38),
                    prefixIcon: const Icon(Icons.search, color: Color(0xFF818CF8), size: 18),
                    filled: true,
                    fillColor: const Color(0xFF1E293B),
                    contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide.none,
                    ),
                  ),
                  onChanged: (query) {
                    final q = query.toLowerCase().trim();
                    setModalState(() {
                      filtered = westAfricanCountries.where((c) {
                        return c.name.toLowerCase().contains(q) ||
                            c.dialCode.contains(q) ||
                            c.code.toLowerCase().contains(q);
                      }).toList();
                    });
                  },
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: ListView.separated(
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => Divider(color: Colors.white.withOpacity(0.05), height: 1),
                    itemBuilder: (context, index) {
                      final country = filtered[index];
                      final isSelected = country.code == _selectedCountryCode.code;

                      return ListTile(
                        onTap: () {
                          setState(() {
                            _selectedCountryCode = country;
                            _selectedCountry = country.name;
                          });
                          Navigator.pop(ctx);
                        },
                        leading: Text(country.flag, style: const TextStyle(fontSize: 24)),
                        title: Text(
                          country.name,
                          style: TextStyle(
                            color: isSelected ? const Color(0xFF818CF8) : Colors.white,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            fontSize: 13,
                          ),
                        ),
                        trailing: Text(
                          country.dialCode,
                          style: TextStyle(
                            color: isSelected ? const Color(0xFF818CF8) : Colors.grey[400],
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
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
              Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
              const SizedBox(height: 2),
              Text(desc, style: TextStyle(color: Colors.grey[500], fontSize: 11)),
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
            border: Border.all(color: isSelected ? const Color(0xFF6366F1) : Colors.white.withOpacity(0.05), width: 1.5),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              Icon(icon, color: isSelected ? const Color(0xFF818CF8) : Colors.grey, size: 20),
              const SizedBox(height: 6),
              Text(label, style: TextStyle(color: isSelected ? Colors.white : Colors.grey, fontWeight: FontWeight.bold, fontSize: 12)),
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
        decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: isSelected ? Colors.white : Colors.transparent, width: 2)),
        child: CircleAvatar(backgroundColor: color, radius: 12),
      ),
    );
  }

  Widget _buildStepActions() {
    if (_currentStep < 3) {
      if (_currentStep == 0) {
        return Column(
          children: [
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () {
                  setState(() => _currentStep++);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366F1),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('NEXT STEP', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: OutlinedButton.icon(
                onPressed: () => _startLinkQrScan(context),
                icon: const Icon(Icons.qr_code_scanner, size: 18),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFF818CF8)),
                  foregroundColor: const Color(0xFF818CF8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                label: const Text('LINK DEVICE TO EXISTING PROFILE', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              ),
            ),
          ],
        );
      }

      return Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          if (_currentStep > 0)
            TextButton(onPressed: () => setState(() => _currentStep--), child: const Text('BACK', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)))
          else
            const SizedBox.shrink(),
          ElevatedButton(
            onPressed: () {
              if (_currentStep == 1 && !_formKey.currentState!.validate()) return;
              if (_currentStep == 2) {
                 if (_streetController.text.trim().isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Street Address is required')));
                    return;
                 }
                 if (_selectedCountry == null) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Country is required')));
                    return;
                 }
                 if (_selectedCountry == 'Nigeria') {
                     if (_selectedState == null) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('State is required')));
                        return;
                     }
                     if (_selectedLga == null) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('LGA is required')));
                        return;
                     }
                 } else {
                     if (_stateController.text.trim().isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('State/Region is required')));
                        return;
                     }
                 }
              }
              setState(() => _currentStep++);
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366F1), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12)),
            child: const Text('NEXT STEP', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      );
    }

    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton(
            onPressed: () => _submitOnboarding(isTrial: false),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366F1), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: const Text('ONBOARD & ACTIVATE DEVICE', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          height: 50,
          child: OutlinedButton(
            onPressed: () => _submitOnboarding(isTrial: true),
            style: OutlinedButton.styleFrom(side: BorderSide(color: const Color(0xFF10B981).withOpacity(0.5)), foregroundColor: const Color(0xFF10B981), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: const Text('START FREE 3-DAY TRIAL', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          ),
        ),
        const SizedBox(height: 16),
        Center(
          child: TextButton(onPressed: () => setState(() => _currentStep = 2), child: const Text('GO BACK TO DETAILS', style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold))),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _businessNameController.dispose();
    _phoneController.dispose();
    _agentCodeController.dispose();
    _streetController.dispose();
    _stateController.dispose();
    super.dispose();
  }

  Widget _buildAddressStep() {
    final stateList = nigeriaStatesAndLgas.map((s) => s['state'] as String).toList();
    List<String> lgaList = [];
    if (_selectedState != null) {
      final stateData = nigeriaStatesAndLgas.firstWhere((s) => s['state'] == _selectedState, orElse: () => {});
      if (stateData.containsKey('lgas')) {
        lgaList = List<String>.from(stateData['lgas']);
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildTextField(_streetController, 'Street Address', Icons.location_on),
        const SizedBox(height: 20),
        SearchableDropdown(
          label: 'Country',
          value: _selectedCountry,
          items: africaCountries,
          hint: 'Select Country',
          icon: Icons.public,
          onChanged: (val) {
            setState(() {
              _selectedCountry = val;
              if (val != 'Nigeria') {
                _selectedState = null;
                _selectedLga = null;
              }
            });
          },
        ),
        const SizedBox(height: 20),
        if (_selectedCountry == 'Nigeria') ...[
          Row(
            children: [
              Expanded(
                child: SearchableDropdown(
                  label: 'State',
                  value: _selectedState,
                  items: stateList,
                  hint: 'Select State',
                  icon: Icons.map,
                  onChanged: (val) {
                    setState(() {
                      _selectedState = val;
                      _selectedLga = null; // Reset LGA when state changes
                    });
                  },
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: SearchableDropdown(
                  label: 'LGA',
                  value: _selectedLga,
                  items: lgaList,
                  hint: 'Select LGA',
                  icon: Icons.location_city,
                  onChanged: (val) {
                    setState(() {
                      _selectedLga = val;
                    });
                  },
                ),
              ),
            ],
          ),
        ] else ...[
          _buildTextField(_stateController, 'State / Region', Icons.map),
        ],
      ],
    );
  }

  Future<void> _startLinkQrScan(BuildContext context) async {
    final scannedCode = await showDialog<String>(
      context: context,
      builder: (ctx) => const BarcodeScannerDialog(),
    );

    if (scannedCode == null || scannedCode.isEmpty) return;
    if (!mounted) return;

    // Capture context-dependent refs BEFORE any await
    final settingsBloc = this.context.read<SettingsBloc>();

    // Parse the QR payload
    try {
      final data = jsonDecode(scannedCode);
      if (data['action'] == 'LINK_DEVICE') {
        final token = data['token'] as String;
        final tenantId = data['tenantId'] as String;

        setState(() => _isLoading = true);

        final deviceId = await DeviceInfoService.getDeviceSuffix();
        final gpsLocation = await _getCurrentLocation();

        final dio = Dio(BaseOptions(connectTimeout: const Duration(seconds: 10)));
        final urls = [
          '${AppConfig.baseUrl}/auth/link-device',
        ];

        bool linkSuccess = false;
        String errorMessage = 'Failed to link device';

        for (final url in urls) {
          try {
            final response = await dio.post(url, data: {
              'token': token,
              'deviceId': deviceId,
              'agentCode': 'AAA000',
              'location': gpsLocation,
              'ownerEmail': 'linked-device@invify.app',
              'ownerName': 'Linked Terminal User',
            });
            if (response.statusCode == 200 && response.data['success'] == true) {
              linkSuccess = true;
              break;
            }
          } catch (e) {
            errorMessage = friendlyApiError(
              e,
              fallback: 'Failed to link device. Please try again.',
            );
          }
        }

        if (!mounted) return;
        setState(() => _isLoading = false);

        if (linkSuccess) {
          final security = SecurityService();
          await security.setTenantId(tenantId);
          await StorageService.setOnboardingCompleted(true);
          await StorageService.saveTrialStartDate(DateTime.now());
          settingsBloc.add(LoadSettings());

          if (!mounted) return;
          ScaffoldMessenger.of(this.context).showSnackBar(
            const SnackBar(
              content: Text('Device linked successfully! 3-day trial activated.'),
              backgroundColor: Colors.green,
            ),
          );
          Navigator.of(this.context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (_) => const DashboardPage()),
            (route) => false,
          );
        } else {
          if (!mounted) return;
          ScaffoldMessenger.of(this.context).showSnackBar(
            SnackBar(
              content: Text('Linking failed: $errorMessage'),
              backgroundColor: Colors.red,
            ),
          );
        }
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(this.context).showSnackBar(
          const SnackBar(
            content: Text('Invalid QR code format for device linking.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(this.context).showSnackBar(
        SnackBar(
          content: Text('Error parsing QR code: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}

