import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';
import 'package:involve_app/features/activation/presentation/pages/activation_page.dart';

class GoProPage extends StatefulWidget {
  const GoProPage({super.key});

  @override
  State<GoProPage> createState() => _GoProPageState();
}

class _GoProPageState extends State<GoProPage> {
  final _formKey = GlobalKey<FormState>();
  final _businessNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _cacController = TextEditingController();
  
  bool _isLoading = false;
  Map<String, dynamic>? _generatedVirtualAccount;

  Future<void> _submitRegistration() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final dio = Dio(BaseOptions(connectTimeout: const Duration(seconds: 10)));
      final payload = {
        'businessName': _businessNameController.text.trim(),
        'email': _emailController.text.trim(),
        'phone': _phoneController.text.trim(),
        'industry': 'retail',
        'cacNumber': _cacController.text.trim(),
        'plan': 'premium'
      };

      // Try local host ports (resilient fallbacks for Android/iOS emulators and localhost)
      final urls = [
        'http://192.168.1.194:3004/public/onboarding/provision',
        'http://localhost:3004/public/onboarding/provision',
      ];

      Response? response;
      for (var url in urls) {
        try {
          response = await dio.post(url, data: payload);
          break;
        } catch (_) {}
      }

      if (response != null && response.statusCode == 201) {
        final data = response.data;
        if (data['virtualAccount'] != null) {
          setState(() {
            _generatedVirtualAccount = data['virtualAccount'];
            _isLoading = false;
          });
        }
      } else {
        throw Exception("Failed to connect to provision endpoint");
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Registration Failed: Ensure you have internet connection.', style: const TextStyle(color: Colors.white)), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Go Pro - Cloud & Sync'),
        backgroundColor: Colors.deepPurple.shade900,
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: InvifyLoadingIndicator(message: 'Provisioning Cloud Workspace...'))
          : _generatedVirtualAccount != null
              ? _buildPaymentInstructions()
              : _buildRegistrationForm(),
    );
  }

  Widget _buildRegistrationForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Register your Business',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'To upgrade to Pro and enable real-time cloud sync, please register your business below. We will generate a unique Virtual Account for your payment.',
              style: TextStyle(fontSize: 14, color: Colors.grey.shade700),
            ),
            const SizedBox(height: 24),
            TextFormField(
              controller: _businessNameController,
              decoration: const InputDecoration(labelText: 'Business Name', border: OutlineInputBorder()),
              validator: (v) => v!.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _emailController,
              decoration: const InputDecoration(labelText: 'Email Address', border: OutlineInputBorder()),
              validator: (v) => v!.isEmpty || !v.contains('@') ? 'Valid email required' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _phoneController,
              decoration: const InputDecoration(labelText: 'Phone Number', border: OutlineInputBorder()),
              validator: (v) => v!.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _cacController,
              decoration: const InputDecoration(labelText: 'CAC Registration Number', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _submitRegistration,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.deepPurple.shade900,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Generate Payment Account', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentInstructions() {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.check_circle, color: Colors.green, size: 64),
          const SizedBox(height: 16),
          const Text(
            'Business Profile Created!',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Text(
            'Your cloud tenant workspace has been reserved. To complete activation and enable Pro features, please pay the subscription fee into your dedicated account below:',
            style: TextStyle(fontSize: 16, color: Colors.grey.shade700),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.deepPurple.shade50,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.deepPurple.shade200),
            ),
            child: Column(
              children: [
                Text(
                  _generatedVirtualAccount!['accountName'],
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                ),
                const SizedBox(height: 8),
                Text(
                  _generatedVirtualAccount!['bankName'],
                  style: TextStyle(color: Colors.grey.shade600),
                ),
                const SizedBox(height: 16),
                Text(
                  _generatedVirtualAccount!['accountNumber'],
                  style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.deepPurple.shade900, letterSpacing: 2),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          const Text(
            'Once paid, contact Invify Admin with your receipt to receive your Terminal Activation Code.',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: OutlinedButton.icon(
              onPressed: () {
                Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ActivationPage(isExpired: true)));
              },
              icon: const Icon(Icons.key),
              label: const Text('I have my Activation Code'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.deepPurple.shade900,
                side: BorderSide(color: Colors.deepPurple.shade900),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
