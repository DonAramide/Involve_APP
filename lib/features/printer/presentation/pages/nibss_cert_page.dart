import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/core/mpos/mpos_device_type.dart';
import 'package:involve_app/core/pos/nibss_geo.dart';
import 'package:involve_app/core/utils/nibss_response_codes.dart';
import 'package:involve_app/core/utils/progress_dialog_utils.dart';
import 'package:involve_app/features/invoicing/domain/templates/invoice_template.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_bloc.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_state.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/services/mpos_service.dart';
import 'package:involve_app/services/terminal_sync_service.dart';

/// NIBSS certification menu copied from DSpreadBaseApp (Print → Init Geofencing).
/// Each card transaction runs through the current VM30 EMV path.
class NibssCertPage extends StatefulWidget {
  const NibssCertPage({super.key});

  static const routeName = '/nibss_cert';

  @override
  State<NibssCertPage> createState() => _NibssCertPageState();
}

class _NibssCertPageState extends State<NibssCertPage> {
  final MposService _mpos = MposService();
  TerminalConfig? _config;
  bool _busy = false;
  String _status = 'Ready';
  NibssGeoFix? _geo;
  MposTransactionData? _lastTx;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final cached = await TerminalSyncService.loadCachedConfig();
    if (mounted) setState(() => _config = cached);
  }

  String get _terminalId =>
      _config?.terminalId ?? _config?.mposTerminalId ?? '';

  String get _activeHost =>
      (_config?.activeHost ??
              _config?.routingRules?['activeHost']?.toString() ??
              'NIBSS')
          .toString()
          .toUpperCase();

  String get _deviceType => MposDeviceType.channelValue(
        MposDeviceType.resolve(_config?.terminalType),
      );

  bool get _processOnDevice {
    final routing = _config?.routingRules ?? {};
    if (MposDeviceType.isMoreFun(_config?.terminalType)) return true;
    return routing['processOnDevice'] == true;
  }

  Future<NibssGeoFix?> _ensureGeo() async {
    _geo ??= await NibssGeo.capture();
    final geo = _geo;
    if (geo != null) {
      await _mpos.saveGeoCoordinates(
        latitude: geo.latitude,
        longitude: geo.longitude,
        deviceType: _deviceType,
      );
    }
    return geo;
  }

  Future<void> _runCardTxn({
    required String transactionType,
    required double amount,
    double cashbackAmount = 0,
    String? originalRrn,
    String? originalStan,
  }) async {
    if (_terminalId.isEmpty) {
      _toast('Terminal not provisioned. Sync from Printer & MPOS first.');
      return;
    }
    if (_busy) return;
    setState(() {
      _busy = true;
      _status = 'Starting $transactionType…';
    });

    try {
      final geo = await _ensureGeo();
      final result = await ProgressDialogUtils.showUpdatableProgress(
        context,
        (setMessage) async {
          setMessage('Waiting for card on terminal…');
          return _mpos.initiatePayment(
            amount: amount,
            terminalId: _terminalId,
            activeHost: _activeHost,
            processOnDevice: _processOnDevice,
            deviceType: _deviceType,
            transactionType: transactionType,
            cashbackAmount: cashbackAmount,
            originalRrn: originalRrn,
            originalStan: originalStan,
            latitude: geo?.latitude,
            longitude: geo?.longitude,
          );
        },
        initialMessage: '$transactionType…',
      );
      if (!mounted) return;

      final tx = result.transaction;
      final approved = result.status == 'payment_success' &&
          (tx == null || tx.paymentSuccess == true);
      final code = tx?.statusCode ?? '';
      final msg = tx?.message ??
          result.error?.message ??
          (approved ? 'Approved' : 'Declined');
      final hostMsg = code.isNotEmpty
          ? NibssResponseCodes.getMessage(code)
          : msg;
      setState(() {
        _lastTx = tx;
        _status =
            '${approved ? "APPROVED" : "DECLINED"}  $transactionType  ${hostMsg.isNotEmpty ? hostMsg : msg}';
      });
      _toast(_status, ok: approved);
    } catch (e) {
      if (!mounted) return;
      setState(() => _status = e.toString());
      _toast('Transaction failed: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<double?> _amountDialog(String title, {String hint = 'Amount (NGN)'}) async {
    final controller = TextEditingController();
    final value = await showDialog<double>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(hintText: hint),
          autofocus: true,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              final parsed = double.tryParse(controller.text.trim());
              Navigator.pop(ctx, parsed);
            },
            child: const Text('OK'),
          ),
        ],
      ),
    );
    return value;
  }

  Future<String?> _rrnDialog() async {
    final controller = TextEditingController(text: _lastTx?.rrn ?? '');
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Enter RRN'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(hintText: '12-digit RRN'),
          autofocus: true,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  Future<void> _purchase() async {
    final amount = await _amountDialog('Purchase');
    if (amount == null || amount < 0.01) {
      if (amount != null) _toast('Amount must be at least 0.01');
      return;
    }
    await _runCardTxn(transactionType: 'PURCHASE', amount: amount);
  }

  Future<void> _cashAdvance() async {
    final amount = await _amountDialog('Cash Advance');
    if (amount == null || amount < 0.01) return;
    await _runCardTxn(transactionType: 'CASHADVANCE', amount: amount);
  }

  Future<void> _preAuth() async {
    final amount = await _amountDialog('Pre Auth');
    if (amount == null || amount < 0.01) return;
    await _runCardTxn(transactionType: 'PREAUTH', amount: amount);
  }

  Future<void> _purchaseWithCb() async {
    final amount = await _amountDialog('Purchase With Cashback');
    if (amount == null || amount < 0.01) return;
    final cashback = await _amountDialog('Cashback', hint: 'Cashback (NGN)');
    if (cashback == null || cashback < 0.01) return;
    if (cashback > amount) {
      _toast('Cashback cannot be greater than amount');
      return;
    }
    await _runCardTxn(
      transactionType: 'PURCHASEWITHCB',
      amount: amount,
      cashbackAmount: cashback,
    );
  }

  Future<void> _balance() async {
    await _runCardTxn(transactionType: 'BALANCE', amount: 2);
  }

  Future<void> _reversal() async {
    final rrn = await _rrnDialog();
    if (rrn == null) return;
    if (rrn.length < 12) {
      _toast('RRN should be 12 digits');
      return;
    }
    await _runCardTxn(
      transactionType: 'REVERSAL',
      amount: 0,
      originalRrn: rrn,
      originalStan: _lastTx?.stan,
    );
  }

  Future<void> _refund() async {
    final rrn = await _rrnDialog();
    if (rrn == null || rrn.length < 12) {
      if (rrn != null) _toast('RRN should be 12 digits');
      return;
    }
    final amount = await _amountDialog('Refund amount');
    if (amount == null || amount < 0.01) return;
    await _runCardTxn(
      transactionType: 'REFUND',
      amount: amount,
      originalRrn: rrn,
    );
  }

  Future<void> _preAuthComplete() async {
    final rrn = await _rrnDialog();
    if (rrn == null || rrn.length < 12) {
      if (rrn != null) _toast('RRN should be 12 digits');
      return;
    }
    final amount = await _amountDialog('Pre-Auth Completion');
    if (amount == null || amount < 0.01) return;
    await _runCardTxn(
      transactionType: 'PREAUTHCOMPLETE',
      amount: amount,
      originalRrn: rrn,
      originalStan: _lastTx?.stan,
    );
  }

  Future<void> _print() async {
    final tx = _lastTx;
    final settings = context.read<SettingsBloc>().state.settings;
    final commands = <PrintCommand>[
      TextCommand('================================', align: 'center'),
      TextCommand('NIBSS CERTIFICATION', isBold: true, align: 'center'),
      TextCommand('================================', align: 'center'),
      TextCommand(settings?.organizationName ?? _config?.businessName ?? 'INVIFY'),
      TextCommand('TID: ${_terminalId.isEmpty ? "N/A" : _terminalId}'),
      if (tx != null) ...[
        TextCommand('Type: ${tx.transactionType ?? "PURCHASE"}'),
        TextCommand('Amount: ${tx.amount ?? "0.00"}'),
        TextCommand('PAN: ${tx.maskedPan ?? "N/A"}'),
        TextCommand('RRN: ${tx.rrn ?? "N/A"}'),
        TextCommand('STAN: ${tx.stan ?? "N/A"}'),
        TextCommand('Auth: ${tx.authCode ?? "N/A"}'),
        TextCommand(tx.paymentSuccess ? 'APPROVED' : (tx.message ?? 'DECLINED'),
            isBold: true),
      ] else
        TextCommand('No transaction yet — print test OK', align: 'center'),
      if (_geo != null) ...[
        TextCommand('Lat: ${_geo!.latitude.toStringAsFixed(5)}'),
        TextCommand('Lon: ${_geo!.longitude.toStringAsFixed(5)}'),
        TextCommand('F120: ${_geo!.field120}'),
      ],
      TextCommand('================================', align: 'center'),
    ];
    context.read<PrinterBloc>().add(PrintCommandsEvent(commands, 58));
    _toast('Sent to printer');
  }

  Future<void> _keyExchange() async {
    if (_config == null) {
      _toast('Terminal not provisioned. Sync first.');
      return;
    }
    setState(() {
      _busy = true;
      _status = 'Key exchange…';
    });
    try {
      final primary = _config?.primaryHost;
      final nibss = primary?['nibssConfig'] as Map?;
      String? scrub(dynamic raw) {
        final v = raw?.toString().trim();
        if (v == null || v.isEmpty) return null;
        if (v.toUpperCase().contains('SECRET_MASKED')) return null;
        return v;
      }

      final ctmk = scrub(nibss?['ctmk']) ??
          scrub(primary?['kimonoKeys']?['ctmk']) ??
          scrub(primary?['kimonoFallbackParameters']?['key1']);
      final hostIp = primary?['ip']?.toString() ??
          _config?.nibssIp ??
          _config?.expressPayHost;
      final hostPort = primary?['port']?.toString() ??
          _config?.nibssPort?.toString() ??
          _config?.expressPayPort?.toString();

      final result = await ProgressDialogUtils.showUpdatableProgress(
        context,
        (setMessage) async {
          setMessage('Starting key exchange…');
          return _mpos.loadParams(
            terminalId: _terminalId,
            activeHost: _activeHost,
            ipAddress: hostIp,
            portNumber: hostPort,
            enableSsl: _config?.nibssSsl ?? true,
            key1: ctmk,
            deviceType: _deviceType,
          );
        },
        initialMessage: 'Do Key Exchange…',
      );
      if (!mounted) return;
      final ok = result.status == 'success';
      setState(() => _status = ok ? 'Key exchange OK' : 'Key exchange failed: ${result.message}');
      _toast(_status, ok: ok);
    } catch (e) {
      _toast('Key exchange failed: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _initGeofencing() async {
    setState(() {
      _busy = true;
      _status = 'Init geofencing…';
    });
    try {
      final geo = await NibssGeo.capture();
      if (geo == null) {
        setState(() => _status = 'Location unavailable — enable GPS and retry');
        _toast(_status);
        return;
      }
      _geo = geo;
      final native = await _mpos.initGeofencing(
        latitude: geo.latitude,
        longitude: geo.longitude,
        deviceType: _deviceType,
      );
      setState(() {
        _status =
            'Geofencing ready  ${geo.latitude.toStringAsFixed(5)}, ${geo.longitude.toStringAsFixed(5)}\n'
            'F120 ${native['field120'] ?? geo.field120}';
      });
      _toast('Geofencing initialized');
    } catch (e) {
      setState(() => _status = 'Geofencing failed: $e');
      _toast(_status);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _toast(String message, {bool ok = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: ok ? Colors.green : null,
      ),
    );
  }

  Widget _action(String label, VoidCallback onPressed) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: _busy ? null : onPressed,
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 14),
            alignment: Alignment.centerLeft,
          ),
          child: Text(label),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('NIBSS CERT')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        children: [
          Text(
            'TID ${_terminalId.isEmpty ? "not synced" : _terminalId}  ·  $_activeHost',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 16),
          _action('Print', _print),
          _action('Do Key Exchange', _keyExchange),
          _action('Purchase', _purchase),
          _action('Card Balance', _balance),
          _action('Reversal', _reversal),
          _action('Cash Advance', _cashAdvance),
          _action('Purchase With CB', _purchaseWithCb),
          _action('Refund', _refund),
          _action('Pre Auth', _preAuth),
          _action('Pre-Auth Completion', _preAuthComplete),
          _action('Settings', () => Navigator.pushNamed(context, '/printer_settings')),
          _action('Init Geofencing', _initGeofencing),
          const SizedBox(height: 8),
          Text(_status, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}
