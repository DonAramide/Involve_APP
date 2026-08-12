// lib/features/school_finance/presentation/pages/payout_settings_page.dart

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
import '../../domain/repositories/finance_repository_new.dart';
import '../../../../core/services/service_locator.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

class PayoutSettingsPage extends StatefulWidget {
  const PayoutSettingsPage({super.key});

  @override
  State<PayoutSettingsPage> createState() => _PayoutSettingsPageState();
}

class _PayoutSettingsPageState extends State<PayoutSettingsPage> {
  final _formKey = GlobalKey<FormState>();
  final _repository = sl<FinanceRepository>();

  final _accountNumberController = TextEditingController();
  final _accountNameController = TextEditingController();
  final _bankNameController = TextEditingController();
  final _bankCodeController = TextEditingController();

  bool _isLoading = true;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    try {
      final settings = await _repository.getPayoutSettings();
      if (settings.isNotEmpty) {
        _accountNumberController.text = settings['account_number'] ?? '';
        _accountNameController.text = settings['account_name'] ?? '';
        _bankNameController.text = settings['bank_name'] ?? '';
        _bankCodeController.text = settings['bank_code'] ?? '';
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyApiError(e, fallback: 'Could not load payout settings.'))));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    try {
      await _repository.savePayoutSettings(
        accountNumber: _accountNumberController.text,
        bankCode: _bankCodeController.text,
        bankName: _bankNameController.text,
        accountName: _accountNameController.text,
      );
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payout settings saved successfully!'), backgroundColor: Colors.green));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyApiError(e, fallback: 'Could not save payout settings.')), backgroundColor: Colors.red));
    } finally {
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        title: const Text('Payout Settings', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
      ),
      body: _isLoading
          ? const InvifyLoadingIndicator(message: 'FETCHING PAYOUT CONFIGURATION...')
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildInfoCard(),
                    const SizedBox(height: 24),
                    const Text('Bank Account Details', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1A1C1E))),
                    const SizedBox(height: 16),
                    _buildTextField(
                      controller: _accountNumberController,
                      label: 'Account Number',
                      hint: 'Enter 10-digit account number',
                      icon: Icons.numbers_rounded,
                      keyboardType: TextInputType.number,
                      validator: (v) => v!.length != 10 ? 'Enter a valid 10-digit account number' : null,
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      controller: _bankNameController,
                      label: 'Bank Name',
                      hint: 'e.g. Access Bank, GTBank',
                      icon: Icons.account_balance_rounded,
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      controller: _bankCodeController,
                      label: 'Bank Code',
                      hint: 'Enter 3-digit bank code',
                      icon: Icons.code_rounded,
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      controller: _accountNameController,
                      label: 'Account Name',
                      hint: 'As it appears on your bank statement',
                      icon: Icons.person_rounded,
                      validator: (v) => v!.isEmpty ? 'Account name is required' : null,
                    ),
                    const SizedBox(height: 40),
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: _isSaving ? null : _handleSave,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1A1C1E),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          elevation: 0,
                        ),
                        child: _isSaving
                            ? const Text('SAVING CONFIGURATION...', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white))
                            : const Text('Save Payout Configuration', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Center(
                      child: Text(
                        'Funds will be automatically swept to this account upon request.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.grey, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildInfoCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.blue.shade100),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline_rounded, color: Colors.blue.shade700),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Specify the bank account where you want school funds to be transferred. Ensure the details are accurate to avoid delays.',
              style: TextStyle(fontSize: 13, color: Color(0xFF0D47A1), height: 1.4),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey)),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          validator: validator,
          decoration: InputDecoration(
            hintText: hint,
            prefixIcon: Icon(icon, size: 20, color: const Color(0xFF1A1C1E)),
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF1A1C1E), width: 1)),
            errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.red, width: 1)),
          ),
        ),
      ],
    );
  }
}
