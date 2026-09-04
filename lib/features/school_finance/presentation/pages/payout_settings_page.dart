// lib/features/school_finance/presentation/pages/payout_settings_page.dart

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
import '../../domain/repositories/finance_repository_new.dart';
import '../../../../core/services/service_locator.dart';
import '../../../../core/utils/nigerian_banks.dart';
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

  List<Map<String, String>> _banks = [];
  bool _loadingBanks = true;
  String? _selectedBankCode;
  bool _isLoading = true;
  bool _isSaving = false;
  bool _resolvingAccount = false;
  String? _resolveError;
  Timer? _resolveDebounce;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _resolveDebounce?.cancel();
    _accountNumberController.dispose();
    _accountNameController.dispose();
    _bankNameController.dispose();
    _bankCodeController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    try {
      final futures = await Future.wait([
        _repository.getPayoutSettings(),
        _repository.getPayoutBanks(country: 'nigeria'),
      ]);
      final settings = futures[0] as Map<String, dynamic>;
      final rawBanks = futures[1] as List<Map<String, dynamic>>;

      final mapped = rawBanks
          .map((b) {
            final name = (b['name'] ?? b['bank_name'] ?? b['bankName'] ?? '').toString().trim();
            final code = (b['code'] ?? b['bank_code'] ?? b['bankCode'] ?? '').toString().trim();
            return {'name': name, 'code': code};
          })
          .where((b) => b['name']!.isNotEmpty && b['code']!.isNotEmpty)
          .toList()
        ..sort((a, b) => a['name']!.toLowerCase().compareTo(b['name']!.toLowerCase()));

      _banks = mapped.isNotEmpty ? mapped : kDefaultNigerianBanks.map((e) => Map<String, String>.from(e)).toList();

      if (settings.isNotEmpty) {
        _accountNumberController.text = settings['account_number'] ?? '';
        _accountNameController.text = settings['account_name'] ?? '';
        _bankNameController.text = settings['bank_name'] ?? '';
        _bankCodeController.text = settings['bank_code'] ?? '';
        _selectedBankCode = _bankCodeController.text.isNotEmpty ? _bankCodeController.text : null;
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyApiError(e, fallback: 'Could not load payout settings.'))));
      _banks = kDefaultNigerianBanks.map((e) => Map<String, String>.from(e)).toList();
    } finally {
      setState(() {
        _isLoading = false;
        _loadingBanks = false;
      });
    }
  }

  Future<void> _resolveAccountName() async {
    final acct = _accountNumberController.text.trim();
    final code = (_selectedBankCode ?? _bankCodeController.text).trim();
    if (acct.length < 10 || code.isEmpty) {
      setState(() {
        _resolvingAccount = false;
        _resolveError = null;
      });
      return;
    }

    setState(() {
      _resolvingAccount = true;
      _resolveError = null;
      _accountNameController.clear();
    });

    try {
      final result = await _repository.resolvePayoutAccount(
        accountNumber: acct,
        bankCode: code,
      );
      final resolvedName = (result['account_name'] ??
              result['accountName'] ??
              result['AccountName'] ??
              '')
          .toString()
          .trim();
      setState(() {
        if (resolvedName.isNotEmpty) {
          _accountNameController.text = resolvedName;
          _resolveError = null;
        } else {
          _accountNameController.clear();
          _resolveError = 'Could not validate account with Quasar. Please verify bank and account number.';
        }
        _resolvingAccount = false;
      });
    } catch (e) {
      setState(() {
        _accountNameController.clear();
        _resolvingAccount = false;
        _resolveError = 'Could not validate account with Quasar. Please check network and account details.';
      });
    }
  }

  void _scheduleResolve() {
    _resolveDebounce?.cancel();
    _resolveDebounce = Timer(const Duration(milliseconds: 550), _resolveAccountName);
  }

  Future<void> _handleSave() async {
    final acct = _accountNumberController.text.trim();
    final bank = _bankNameController.text.trim();
    final code = (_selectedBankCode ?? _bankCodeController.text).trim();
    final name = _accountNameController.text.trim();

    if (code.isEmpty || bank.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a bank.'), backgroundColor: Colors.red),
      );
      return;
    }

    if (acct.length != 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid 10-digit account number.'), backgroundColor: Colors.red),
      );
      return;
    }

    if (_resolvingAccount) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Validating account with Quasar. Please wait…'), backgroundColor: Colors.orange),
      );
      return;
    }

    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Account name must be validated by Quasar before saving. Please verify the bank and account number.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      await _repository.savePayoutSettings(
        accountNumber: acct,
        bankCode: code,
        bankName: bank,
        accountName: name,
      );
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Payout settings saved and verified successfully!'), backgroundColor: Colors.green),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(friendlyApiError(e, fallback: 'Could not save payout settings.')), backgroundColor: Colors.red),
      );
    } finally {
      setState(() => _isSaving = false);
    }
  }

  Future<void> _showBankSearchDialog() async {
    final searchController = TextEditingController();
    List<Map<String, String>> filtered = List.from(_banks);

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          void filter(String query) {
            final q = query.trim().toLowerCase();
            setSheetState(() {
              if (q.isEmpty) {
                filtered = List.from(_banks);
              } else {
                filtered = _banks.where((b) {
                  final name = (b['name'] ?? '').toLowerCase();
                  final code = (b['code'] ?? '').toLowerCase();
                  return name.contains(q) || code.contains(q);
                }).toList();
              }
            });
          }

          return Container(
            height: MediaQuery.of(ctx).size.height * 0.75,
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: Column(
              children: [
                Container(
                  margin: const EdgeInsets.only(top: 10, bottom: 8),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Select Bank',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  child: TextField(
                    controller: searchController,
                    autofocus: true,
                    decoration: InputDecoration(
                      hintText: 'Search by bank name...',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear),
                              onPressed: () {
                                searchController.clear();
                                filter('');
                              },
                            )
                          : null,
                      filled: true,
                      fillColor: Colors.grey.shade100,
                      contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                    ),
                    onChanged: filter,
                  ),
                ),
                const Divider(),
                Expanded(
                  child: filtered.isEmpty
                      ? const Center(
                          child: Text('No banks found', style: TextStyle(color: Colors.grey)),
                        )
                      : ListView.builder(
                          itemCount: filtered.length,
                          itemBuilder: (context, index) {
                            final bank = filtered[index];
                            final isSelected = bank['code'] == _selectedBankCode;
                            return ListTile(
                              leading: CircleAvatar(
                                radius: 18,
                                backgroundColor: isSelected ? Colors.blue.shade50 : Colors.grey.shade100,
                                child: Icon(
                                  Icons.account_balance,
                                  size: 18,
                                  color: isSelected ? Colors.blue : Colors.grey.shade600,
                                ),
                              ),
                              title: Text(
                                bank['name'] ?? '',
                                style: TextStyle(
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                  color: isSelected ? Colors.blue : Colors.black87,
                                ),
                              ),
                              trailing: isSelected ? const Icon(Icons.check, color: Colors.blue) : null,
                              onTap: () {
                                Navigator.pop(ctx);
                                setState(() {
                                  _selectedBankCode = bank['code'];
                                  _bankCodeController.text = bank['code'] ?? '';
                                  _bankNameController.text = bank['name'] ?? '';
                                  _accountNameController.clear();
                                  _resolveError = null;
                                });
                                if (_accountNumberController.text.trim().length == 10) {
                                  _scheduleResolve();
                                }
                              },
                            );
                          },
                        ),
                ),
              ],
            ),
          );
        },
      ),
    );
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
                    // Bank selection
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Bank', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey)),
                        const SizedBox(height: 8),
                        InkWell(
                          onTap: _loadingBanks ? null : _showBankSearchDialog,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.account_balance_rounded, size: 20, color: Color(0xFF1A1C1E)),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    _bankNameController.text.isNotEmpty ? _bankNameController.text : 'Select Bank (Tap to search)',
                                    style: TextStyle(
                                      color: _bankNameController.text.isNotEmpty ? Colors.black : Colors.grey.shade500,
                                      fontWeight: _bankNameController.text.isNotEmpty ? FontWeight.w600 : FontWeight.normal,
                                    ),
                                  ),
                                ),
                                const Icon(Icons.search, size: 20, color: Colors.grey),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    // Account number field
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Account Number', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey)),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _accountNumberController,
                          keyboardType: TextInputType.number,
                          maxLength: 10,
                          decoration: InputDecoration(
                            hintText: 'Enter 10-digit account number',
                            prefixIcon: const Icon(Icons.numbers_rounded, size: 20, color: Color(0xFF1A1C1E)),
                            counterText: '',
                            suffixIcon: _resolvingAccount
                                ? const Padding(
                                    padding: EdgeInsets.all(12),
                                    child: SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    ),
                                  )
                                : null,
                            filled: true,
                            fillColor: Colors.white,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF1A1C1E), width: 1)),
                          ),
                          onChanged: (val) {
                            final trimmed = val.trim();
                            if (trimmed.length < 10) {
                              _resolveDebounce?.cancel();
                              setState(() {
                                _resolvingAccount = false;
                                _accountNameController.clear();
                                _resolveError = null;
                              });
                            } else if (trimmed.length == 10) {
                              _scheduleResolve();
                            }
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    // Account name field (strictly readOnly!)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Account Name (Auto-populated)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey)),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _accountNameController,
                          readOnly: true,
                          enableInteractiveSelection: false,
                          style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.black),
                          decoration: InputDecoration(
                            hintText: _resolvingAccount ? 'Validating with Quasar…' : 'Auto-populated from Quasar',
                            prefixIcon: const Icon(Icons.verified_user_outlined, size: 20, color: Colors.blue),
                            suffixIcon: _resolvingAccount
                                ? const Padding(
                                    padding: EdgeInsets.all(12),
                                    child: SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    ),
                                  )
                                : _accountNameController.text.isNotEmpty
                                    ? const Icon(Icons.check_circle, color: Colors.green, size: 20)
                                    : (_selectedBankCode != null && _accountNumberController.text.trim().length == 10)
                                        ? IconButton(
                                            icon: const Icon(Icons.refresh, size: 18, color: Colors.blue),
                                            tooltip: 'Retry Quasar validation',
                                            onPressed: _resolveAccountName,
                                          )
                                        : null,
                            helperText: _resolveError ?? (_accountNameController.text.isNotEmpty ? '✓ Validated by Quasar' : null),
                            helperMaxLines: 2,
                            helperStyle: TextStyle(
                              color: _resolveError != null ? Colors.red[700] : Colors.green[700],
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                            ),
                            filled: true,
                            fillColor: Colors.white,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF1A1C1E), width: 1)),
                          ),
                        ),
                      ],
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
              'Specify the bank account where you want school funds to be transferred. Account name is automatically validated and retrieved from Quasar.',
              style: TextStyle(fontSize: 13, color: Color(0xFF0D47A1), height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}
