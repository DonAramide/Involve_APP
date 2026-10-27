import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:involve_app/core/services/finance_api_client.dart';
import 'package:involve_app/core/services/service_locator.dart';
import 'package:involve_app/core/utils/app_config.dart';
import 'package:involve_app/features/settings/domain/services/security_service.dart';

/// Staff enter the 6-digit code the school admin reads from their authenticator.
/// Returns true only after the server accepts that code.
Future<bool> requireAdminCompanyTransferAuth(
  BuildContext context, {
  String? amount,
  String? beneficiary,
  String? reference,
}) async {
  final ok = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    useRootNavigator: true,
    builder: (ctx) => _AdminTransferAuthDialog(
      amount: _detail(amount),
      beneficiary: _detail(beneficiary),
      reference: _detail(reference),
    ),
  );
  return ok == true;
}

String? _detail(String? value) {
  final text = value?.trim();
  if (text == null || text.isEmpty) return null;
  return text;
}

class _AdminTransferAuthDialog extends StatefulWidget {
  final String? amount;
  final String? beneficiary;
  final String? reference;

  const _AdminTransferAuthDialog({
    this.amount,
    this.beneficiary,
    this.reference,
  });

  @override
  State<_AdminTransferAuthDialog> createState() => _AdminTransferAuthDialogState();
}

class _AdminTransferAuthDialogState extends State<_AdminTransferAuthDialog> {
  final _controller = TextEditingController();
  final _focus = FocusNode();
  final _actionsKey = GlobalKey();
  bool _busy = false;
  String? _error;
  double _lastInset = 0;

  @override
  void initState() {
    super.initState();
    _focus.addListener(() {
      if (_focus.hasFocus) _revealActions();
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _focus.requestFocus();
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final inset = MediaQuery.viewInsetsOf(context).bottom;
    if (inset != _lastInset) {
      _lastInset = inset;
      _revealActions();
    }
  }

  void _revealActions() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final target = _actionsKey.currentContext;
      if (!mounted || target == null) return;
      Scrollable.ensureVisible(
        target,
        alignment: 1,
        duration: const Duration(milliseconds: 180),
      );
    });
  }

  @override
  void dispose() {
    _controller.clear();
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  FinanceApiClient _client() {
    if (!sl.isRegistered<FinanceApiClient>()) {
      sl.registerSingleton<FinanceApiClient>(FinanceApiClient(
        baseUrl: AppConfig.baseUrl,
        getToken: () async => await SecurityService().getOfflineToken() ?? '',
        getTenantId: () async => await SecurityService().getTenantId(),
      ));
    }
    return sl<FinanceApiClient>();
  }

  String _safeError(FinanceApiException err) {
    final text = err.message.toLowerCase();
    if (err.statusCode == 401) {
      return 'This device could not be verified. Reconnect the tablet and try again.';
    }
    if (text.contains('not valid') || text.contains('invalid') || err.statusCode == 403 && text.contains('code')) {
      return 'Invalid authentication code. Please enter the current 6-digit code.';
    }
    if (text.contains('turn on') || text.contains('enable 2fa') || text.contains('2fa settings')) {
      return err.message;
    }
    if (err.statusCode == 404) {
      return 'Authorization is not available on this server. Please try again in a moment.';
    }
    return 'Could not complete authorization. Please try again.';
  }

  Future<void> _submit() async {
    if (_busy) return;
    final code = _controller.text.replaceAll(RegExp(r'\D'), '');
    if (code.length != 6) {
      setState(() => _error = 'Enter the current 6-digit code from the authenticator app.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final response = await _client().post(
        '/api/finance/company-transfer/authorize',
        data: {'otp': code},
      );
      if (!mounted) return;
      if (response.statusCode == 200 && response.data is Map && response.data['authorized'] == true) {
        _controller.clear();
        Navigator.of(context, rootNavigator: true).pop(true);
        return;
      }
      _controller.clear();
      setState(() {
        _busy = false;
        _error = 'Invalid authentication code. Please enter the current 6-digit code.';
      });
      _focus.requestFocus();
    } on FinanceApiException catch (e) {
      if (!mounted) return;
      _controller.clear();
      setState(() {
        _busy = false;
        _error = _safeError(e);
      });
      _focus.requestFocus();
    } catch (_) {
      if (!mounted) return;
      _controller.clear();
      setState(() {
        _busy = false;
        _error = 'Could not complete authorization. Please try again.';
      });
      _focus.requestFocus();
    }
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final bottomInset = media.viewInsets.bottom;
    final maxHeight = (media.size.height - bottomInset - 48).clamp(180.0, 560.0);
    final details = <MapEntry<String, String>>[
      if (widget.amount != null) MapEntry('Amount', widget.amount!),
      if (widget.beneficiary != null) MapEntry('Beneficiary', widget.beneficiary!),
      if (widget.reference != null) MapEntry('Reference', widget.reference!),
    ];
    final code = _controller.text;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Dialog(
      backgroundColor: Colors.white,
      elevation: 6,
      shadowColor: const Color(0x33000000),
      surfaceTintColor: Colors.white,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: Color(0xFFE4E7EC)),
      ),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: 420, maxHeight: maxHeight),
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(20, 18, 20, 16 + (bottomInset > 0 ? 4 : 0)),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.verified_user_outlined, size: 22, color: Color(0xFF1F3A5F)),
              const SizedBox(height: 8),
              const Text(
                'Authorize Payment',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF101828),
                  height: 1.2,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Additional verification is required to complete this payment.',
                style: TextStyle(fontSize: 13, height: 1.35, color: Color(0xFF475467)),
              ),
              if (details.isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text(
                  'PAYMENT DETAILS',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.6,
                    color: Color(0xFF667085),
                  ),
                ),
                const SizedBox(height: 8),
                for (final row in details) _DetailRow(label: row.key, value: row.value),
              ],
              const SizedBox(height: 16),
              const Text(
                'AUTHENTICATION',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.6,
                  color: Color(0xFF667085),
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                "Enter the 6-digit code from the authorized administrator's authenticator app.",
                style: TextStyle(fontSize: 13, height: 1.35, color: Color(0xFF344054)),
              ),
              const SizedBox(height: 4),
              const Text(
                'Use the current code from the authenticator app.',
                style: TextStyle(fontSize: 12, color: Color(0xFF667085)),
              ),
              const SizedBox(height: 12),
              _CodeEntry(
                controller: _controller,
                focusNode: _focus,
                enabled: !_busy,
                code: code,
                onChanged: () {
                  final digits = _controller.text.replaceAll(RegExp(r'\D'), '');
                  if (digits != _controller.text) {
                    _controller.value = TextEditingValue(
                      text: digits,
                      selection: TextSelection.collapsed(offset: digits.length),
                    );
                  }
                  setState(() => _error = null);
                },
                onSubmit: _submit,
              ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(
                  _error!,
                  style: const TextStyle(fontSize: 12, height: 1.3, color: Color(0xFFB42318)),
                ),
              ],
              const SizedBox(height: 10),
              const Text(
                'Never share your authentication code with anyone.',
                style: TextStyle(fontSize: 12, color: Color(0xFF667085)),
              ),
              const SizedBox(height: 16),
              Row(
                key: _actionsKey,
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _busy ? null : () => Navigator.of(context, rootNavigator: true).pop(false),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(44, 44),
                        foregroundColor: const Color(0xFF344054),
                        side: const BorderSide(color: Color(0xFFD0D5DD)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: (_busy || code.length != 6) ? null : _submit,
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(44, 44),
                        backgroundColor: const Color(0xFF1F3A5F),
                        disabledBackgroundColor: const Color(0xFFE4E7EC),
                        foregroundColor: Colors.white,
                        disabledForegroundColor: const Color(0xFF98A2B3),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                      ),
                      child: _busy
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Text(
                              'Authorize Payment',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                            ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 96,
            child: Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF667085))),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF101828)),
            ),
          ),
        ],
      ),
    );
  }
}

class _CodeEntry extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final bool enabled;
  final String code;
  final VoidCallback onChanged;
  final VoidCallback onSubmit;

  const _CodeEntry({
    required this.controller,
    required this.focusNode,
    required this.enabled,
    required this.code,
    required this.onChanged,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '6-digit authentication code',
      textField: true,
      child: SizedBox(
        height: 48,
        child: Stack(
          children: [
            ExcludeSemantics(
              child: Row(
                children: List.generate(6, (index) {
                  final filled = index < code.length;
                  final active = enabled && index == code.length.clamp(0, 5) && code.length < 6;
                  return Expanded(
                    child: Padding(
                      padding: EdgeInsets.only(left: index == 0 ? 0 : 6),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        height: 48,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8F9FB),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: active ? const Color(0xFF1F3A5F) : const Color(0xFFD0D5DD),
                            width: active ? 1.5 : 1,
                          ),
                        ),
                        child: filled
                            ? const DecoratedBox(
                                decoration: BoxDecoration(color: Color(0xFF101828), shape: BoxShape.circle),
                                child: SizedBox(width: 8, height: 8),
                              )
                            : null,
                      ),
                    ),
                  );
                }),
              ),
            ),
            TextField(
              controller: controller,
              focusNode: focusNode,
              enabled: enabled,
              autofocus: true,
              keyboardType: TextInputType.number,
              textInputAction: TextInputAction.done,
              maxLength: 6,
              showCursor: false,
              enableSuggestions: false,
              autocorrect: false,
              obscureText: true,
              style: const TextStyle(color: Colors.transparent, fontSize: 1),
              decoration: const InputDecoration(
                counterText: '',
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(vertical: 14),
              ),
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              onChanged: (_) => onChanged(),
              onSubmitted: (_) {
                if (controller.text.length == 6) onSubmit();
              },
            ),
          ],
        ),
      ),
    );
  }
}
