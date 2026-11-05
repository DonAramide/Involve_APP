import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:involve_app/core/service_mode/service_mode_terms.dart';
import 'package:involve_app/core/services/finance_api_client.dart';
import 'package:involve_app/core/services/service_locator.dart';
import 'package:involve_app/core/utils/app_config.dart';
import 'package:involve_app/features/school/presentation/bloc/school_bloc.dart';
import 'package:involve_app/features/settings/domain/services/security_service.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';

/// Continuous gate clock: camera + USB/wedge barcode scanner.
/// Shows Welcome / Goodbye with name, photo, and recorded date/time.
class GateClockPage extends StatefulWidget {
  static const String routeName = '/gate_clock';

  const GateClockPage({super.key});

  @override
  State<GateClockPage> createState() => _GateClockPageState();
}

class _GateClockPageState extends State<GateClockPage> {
  // Legacy opaque tokens (20–128) or new 12-char Invify Code 128 identity.
  static final _tokenPattern = RegExp(r'^([A-Za-z0-9]{12}|[A-Za-z0-9_-]{20,128})$');
  static final _identityInText = RegExp(r'[A-Za-z0-9]{12}');
  static final _opaqueInText = RegExp(r'[A-Za-z0-9_-]{20,128}');

  final MobileScannerController _camera = MobileScannerController(
    formats: const [
      BarcodeFormat.code128,
      BarcodeFormat.qrCode,
      BarcodeFormat.code39,
      BarcodeFormat.code93,
      BarcodeFormat.codabar,
    ],
    // unrestricted: thermal Code 128 needs many frames; we dedupe in-app.
    detectionSpeed: DetectionSpeed.unrestricted,
    returnImage: false,
  );
  final FocusNode _wedgeFocus = FocusNode(debugLabel: 'gate_wedge');
  final TextEditingController _wedgeController = TextEditingController();

  String _direction = 'arrival';
  bool _busy = false;
  bool _cameraOn = true;
  bool _torchOn = false;
  DateTime? _cooldownUntil;
  DateTime? _lastScanAt;
  String? _lastToken;
  String? _wedgeSubmitLock;
  Timer? _wedgeDebounce;
  final StringBuffer _hardwareBuffer = StringBuffer();
  Timer? _hardwareIdle;

  _GateResult? _result;

  FinanceApiClient _client() {
    if (!sl.isRegistered<FinanceApiClient>()) {
      sl.registerSingleton<FinanceApiClient>(FinanceApiClient(
        baseUrl: AppConfig.baseUrl,
        getToken: () async {
          final offline = await SecurityService().getOfflineToken();
          if (offline != null && offline.trim().isNotEmpty) return offline.trim();
          return Supabase.instance.client.auth.currentSession?.accessToken;
        },
        getTenantId: () async => await SecurityService().getTenantId(),
      ));
    }
    return sl<FinanceApiClient>();
  }

  @override
  void initState() {
    super.initState();
    _wedgeFocus.addListener(_keepWedgeFocused);
    // USB/HID wedge scanners inject key events; capture at the hardware level so
    // focus quirks (Offstage TextField, Soft keyboard) cannot drop scans.
    HardwareKeyboard.instance.addHandler(_onHardwareKey);
    WidgetsBinding.instance.addPostFrameCallback((_) => _ensureWedgeFocus());
  }

  @override
  void dispose() {
    _wedgeDebounce?.cancel();
    _hardwareIdle?.cancel();
    HardwareKeyboard.instance.removeHandler(_onHardwareKey);
    _wedgeFocus.removeListener(_keepWedgeFocused);
    _camera.dispose();
    _wedgeFocus.dispose();
    _wedgeController.dispose();
    super.dispose();
  }

  /// Pull a usable gate token out of noisy camera/scanner payloads.
  String? _extractToken(String? raw) {
    if (raw == null) return null;
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return null;
    if (_tokenPattern.hasMatch(trimmed)) return trimmed;
    // Opaque first when long — never slice the first 12 chars off a secret token.
    if (trimmed.length >= 20) {
      final opaque = _opaqueInText.firstMatch(trimmed);
      if (opaque != null && _tokenPattern.hasMatch(opaque.group(0)!)) {
        return opaque.group(0);
      }
    }
    // Bounded 12-char identity inside OCR noise (spaces/punctuation around it).
    final id = RegExp(r'(?:^|[^A-Za-z0-9])([A-Za-z0-9]{12})(?:[^A-Za-z0-9]|$)').firstMatch(trimmed);
    if (id != null) return id.group(1);
    return null;
  }

  bool _onHardwareKey(KeyEvent event) {
    if (event is! KeyDownEvent) return false;
    // Let soft-keyboard / TextField path handle when it already owns composition.
    if (_busy) return false;

    if (event.logicalKey == LogicalKeyboardKey.enter ||
        event.logicalKey == LogicalKeyboardKey.numpadEnter) {
      final buffered = _hardwareBuffer.toString();
      _hardwareBuffer.clear();
      _hardwareIdle?.cancel();
      final token = _extractToken(buffered);
      if (token != null) {
        _onWedgeSubmit(token);
        return true;
      }
      return false;
    }

    // Many Android HID wedges omit `character` and only set keyLabel.
    final char = (event.character != null && event.character!.isNotEmpty)
        ? event.character!
        : (event.logicalKey.keyLabel.length == 1 ? event.logicalKey.keyLabel : null);
    if (char == null || char.isEmpty) return false;
    // Ignore pure control keys; accept printable scanner chars.
    if (char.codeUnitAt(0) < 32) return false;
    _hardwareBuffer.write(char);
    _hardwareIdle?.cancel();
    _hardwareIdle = Timer(const Duration(milliseconds: 160), () {
      final buffered = _hardwareBuffer.toString();
      _hardwareBuffer.clear();
      final token = _extractToken(buffered);
      if (token != null) _onWedgeSubmit(token);
    });
    // Consume so Enter/chars do not toggle Clock in/out.
    return true;
  }

  bool get _cooling {
    final until = _cooldownUntil;
    return until != null && DateTime.now().isBefore(until);
  }

  /// Same card must not re-fire from camera frames or a second scanner trigger.
  bool _isDuplicateScan(String token) {
    if (_lastToken != token || _lastScanAt == null) return false;
    return DateTime.now().difference(_lastScanAt!) < const Duration(seconds: 4);
  }

  void _armCooldown([Duration duration = const Duration(seconds: 3)]) {
    _cooldownUntil = DateTime.now().add(duration);
    _lastScanAt = DateTime.now();
  }

  void _ensureWedgeFocus() {
    if (!mounted) return;
    if (!_wedgeFocus.hasFocus) {
      _wedgeFocus.requestFocus();
    }
  }

  void _keepWedgeFocused() {
    if (!mounted || _wedgeFocus.hasFocus) return;
    // Scanner Enter must never land on Clock in/out — reclaim focus next frame.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && !_wedgeFocus.hasFocus) _wedgeFocus.requestFocus();
    });
  }

  /// Dedupe key: identity codes are case-insensitive; opaque tokens stay exact.
  String _dedupeKey(String token) =>
      RegExp(r'^[A-Za-z0-9]{12}$').hasMatch(token) ? token.toUpperCase() : token;

  Future<void> _onRawToken(String raw) async {
    final token = _extractToken(raw);
    if (token == null) return;
    final key = _dedupeKey(token);
    if (_busy || _cooling || _isDuplicateScan(key)) return;

    setState(() {
      _busy = true;
      _lastToken = key;
      _lastScanAt = DateTime.now();
    });
    _wedgeController.clear();

    try {
      final response = await _client().post(
        '/api/school/gate/scans',
        data: {
          'direction': _direction,
          'token': token,
          'deviceLabel': 'mobile-gate',
        },
      );
      final body = response.data is Map
          ? Map<String, dynamic>.from(response.data as Map)
          : <String, dynamic>{};
      final person = body['person'] is Map
          ? Map<String, dynamic>.from(body['person'] as Map)
          : null;
      final outcome = body['outcome']?.toString();
      final recordedAt = DateTime.tryParse(body['recordedAt']?.toString() ?? '') ??
          DateTime.now();
      final accepted = outcome == 'arrival_accepted' || outcome == 'departure_accepted';
      final photo = _localPhotoFor(person);

      if (!mounted) return;
      setState(() {
        _result = _GateResult(
          welcome: _direction == 'arrival',
          accepted: accepted,
          title: _titleFor(outcome, _direction),
          subtitle: _subtitleFor(outcome, person),
          name: person?['printedName']?.toString() ?? '',
          code: person?['printedCode']?.toString() ?? '',
          subjectType: person?['subjectType']?.toString() ?? '',
          recordedAt: recordedAt,
          photo: photo,
          outcome: outcome ?? '',
        );
        _busy = false;
        _armCooldown();
      });
    } on FinanceApiException catch (error) {
      final data = error.data;
      final outcome = data is Map ? data['outcome']?.toString() : null;
      final person = data is Map && data['person'] is Map
          ? Map<String, dynamic>.from(data['person'] as Map)
          : null;
      if (outcome != null) {
        final recordedAt = DateTime.tryParse(data is Map ? (data['recordedAt']?.toString() ?? '') : '') ??
            DateTime.now();
        if (!mounted) return;
        setState(() {
          _result = _GateResult(
            welcome: _direction == 'arrival',
            accepted: false,
            title: _titleFor(outcome, _direction),
            subtitle: _subtitleFor(outcome, person),
            name: person?['printedName']?.toString() ?? '',
            code: person?['printedCode']?.toString() ?? '',
            subjectType: person?['subjectType']?.toString() ?? '',
            recordedAt: recordedAt,
            photo: _localPhotoFor(person),
            outcome: outcome,
          );
          _busy = false;
          _armCooldown();
        });
      } else {
        final code = data is Map ? data['code']?.toString() : null;
        _fail(
          code == 'SCHOOL_GATE_SCHEMA_UNAPPLIED'
              ? 'Gate scans are not being saved yet.'
              : error.statusCode == 401
                  ? 'Sign in again on this device (authorization missing).'
                  : error.message,
        );
      }
    } catch (_) {
      _fail('The scan could not be sent.');
    } finally {
      _wedgeSubmitLock = null;
      if (mounted && _busy) setState(() => _busy = false);
      _wedgeController.clear();
      _ensureWedgeFocus();
    }
  }

  void _fail(String message) {
    if (!mounted) return;
    setState(() {
      _busy = false;
      _result = _GateResult(
        welcome: _direction == 'arrival',
        accepted: false,
        title: 'Scan not accepted',
        subtitle: message,
        name: '',
        code: '',
        subjectType: '',
        recordedAt: DateTime.now(),
        photo: null,
        outcome: 'error',
      );
      _armCooldown();
    });
  }

  void _onDetect(BarcodeCapture capture) {
    if (_busy || _cooling) return;
    for (final barcode in capture.barcodes) {
      final token = _extractToken(barcode.rawValue) ??
          _extractToken(barcode.displayValue);
      if (token != null) {
        unawaited(_onRawToken(token));
        return;
      }
    }
  }

  /// Single entry for USB/wedge: ignore Enter+onChanged double fire and rapid re-triggers.
  void _onWedgeSubmit(String value) {
    final token = _extractToken(value);
    if (token == null) return;
    final key = _dedupeKey(token);
    if (_busy || _cooling || _isDuplicateScan(key)) {
      _wedgeController.clear();
      return;
    }
    if (_wedgeSubmitLock == key) return;
    _wedgeDebounce?.cancel();
    _wedgeSubmitLock = key;
    _wedgeController.clear();
    unawaited(_onRawToken(token));
  }

  void _onWedgeChanged(String value) {
    final token = _extractToken(value);
    // Only schedule when a complete token is buffered; commit after a short idle
    // so Enter (onSubmitted) and the final onChanged do not both post.
    if (token == null) return;
    _wedgeDebounce?.cancel();
    _wedgeDebounce = Timer(const Duration(milliseconds: 140), () {
      if (!mounted) return;
      _onWedgeSubmit(token);
    });
  }

  Future<void> _toggleTorch() async {
    try {
      await _camera.toggleTorch();
      if (!mounted) return;
      setState(() => _torchOn = !_torchOn);
    } catch (_) {}
    _ensureWedgeFocus();
  }

  Uint8List? _localPhotoFor(Map<String, dynamic>? person) {
    if (person == null) return null;
    try {
      final school = context.read<SchoolBloc>().state;
      final code = (person['printedCode']?.toString() ?? '').trim().toLowerCase();
      final studentId = person['studentId']?.toString();
      final staffId = person['staffId']?.toString();
      final type = (person['subjectType']?.toString() ?? '').toLowerCase();

      if (type == 'student' || studentId != null) {
        final byAdmission = school.students.where(
          (s) => s.admissionNumber.trim().toLowerCase() == code,
        );
        if (byAdmission.isNotEmpty) return byAdmission.first.image;
        if (studentId != null && studentId.isNotEmpty) {
          final byId = school.students.where((s) => s.id?.toString() == studentId);
          if (byId.isNotEmpty) return byId.first.image;
        }
      }
      if (type == 'staff' || staffId != null) {
        final byId = school.teachers.where((t) => t.id?.toString() == staffId);
        if (byId.isNotEmpty) return byId.first.image;
        final want = (person['printedName']?.toString() ?? '').trim().toLowerCase();
        final byName = school.teachers.where(
          (t) => t.fullName.trim().toLowerCase() == want,
        );
        if (byName.isNotEmpty) return byName.first.image;
      }
    } catch (_) {}
    return null;
  }

  String _titleFor(String? outcome, String direction) {
    switch (outcome) {
      case 'arrival_accepted':
        return 'Welcome';
      case 'departure_accepted':
        return 'Goodbye';
      case 'duplicate_open':
      case 'duplicate_window':
        return 'Already clocked in';
      case 'departure_without_session':
        return 'No open clock-in';
      case 'unknown_token':
        return 'Unknown card';
      case 'revoked_card':
        return 'Card revoked';
      case 'expired_card':
        return 'Card expired';
      case 'inactive_subject':
        return 'Inactive member';
      case 'tracking_disabled':
        return 'Tracking off';
      default:
        return direction == 'arrival' ? 'Clock-in' : 'Clock-out';
    }
  }

  String _subtitleFor(String? outcome, Map<String, dynamic>? person) {
    final name = person?['printedName']?.toString() ?? '';
    switch (outcome) {
      case 'arrival_accepted':
        return name.isEmpty ? 'Clock-in saved on the server.' : 'Welcome, $name. Clock-in saved.';
      case 'departure_accepted':
        return name.isEmpty ? 'Clock-out saved on the server.' : 'Goodbye, $name. Clock-out saved.';
      case 'duplicate_open':
      case 'duplicate_window':
        return 'This person is already clocked in.';
      case 'departure_without_session':
        return 'There is no open clock-in to close.';
      case 'unknown_token':
        return 'This barcode is not an active card for this school.';
      case 'revoked_card':
        return 'This card has been revoked.';
      case 'expired_card':
        return 'This card has expired.';
      case 'inactive_subject':
        return 'This card is not active for a current student or staff member.';
      case 'tracking_disabled':
        return 'Administrator entry tracking is off.';
      default:
        return 'The scan was not accepted.';
    }
  }

  Future<void> _toggleCamera() async {
    setState(() => _cameraOn = !_cameraOn);
    if (_cameraOn) {
      await _camera.start();
    } else {
      await _camera.stop();
    }
    _ensureWedgeFocus();
  }

  ServiceModeTerms get _terms {
    final mode =
        context.read<SettingsBloc>().state.settings?.normalizedBusinessMode;
    return ServiceModeTerms.fromRaw(mode);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final result = _result;
    final timeFmt = DateFormat('EEE, d MMM yyyy · HH:mm:ss');
    final terms = _terms;

    return Scaffold(
      appBar: AppBar(
        title: Text(terms.gateClockTitle),
        actions: [
          if (_cameraOn)
            ExcludeFocus(
              child: IconButton(
                tooltip: _torchOn ? 'Torch off' : 'Torch on',
                onPressed: _toggleTorch,
                icon: Icon(_torchOn ? Icons.flash_on : Icons.flash_off),
              ),
            ),
          ExcludeFocus(
            child: IconButton(
              tooltip: _cameraOn ? 'Pause camera' : 'Resume camera',
              onPressed: _toggleCamera,
              icon: Icon(_cameraOn ? Icons.videocam : Icons.videocam_off),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Hold the barcode steady and close for camera, or pull the USB scanner trigger. '
                  'Use the torch if the print is faint.',
                  style: theme.textTheme.bodyMedium,
                ),
                const SizedBox(height: 12),
                // ExcludeFocus: scanner Enter must not toggle Clock in/out.
                ExcludeFocus(
                  child: SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'arrival', label: Text('Clock in'), icon: Icon(Icons.login)),
                      ButtonSegment(value: 'departure', label: Text('Clock out'), icon: Icon(Icons.logout)),
                    ],
                    selected: {_direction},
                    onSelectionChanged: _busy
                        ? null
                        : (next) {
                            setState(() => _direction = next.first);
                            _ensureWedgeFocus();
                          },
                  ),
                ),
              ],
            ),
          ),
          // 1×1 focused field — Offstage drops HID keys on some Android builds.
          SizedBox(
            width: 1,
            height: 1,
            child: Opacity(
              opacity: 0,
              child: TextField(
                focusNode: _wedgeFocus,
                controller: _wedgeController,
                autofocus: true,
                enableSuggestions: false,
                autocorrect: false,
                keyboardType: TextInputType.visiblePassword,
                textInputAction: TextInputAction.done,
                onSubmitted: (value) {
                  _wedgeDebounce?.cancel();
                  _onWedgeSubmit(value);
                },
                onChanged: _onWedgeChanged,
              ),
            ),
          ),
          Expanded(
            flex: 5,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (_cameraOn)
                      MobileScanner(
                        controller: _camera,
                        fit: BoxFit.cover,
                        onDetect: _onDetect,
                        errorBuilder: (context, error) {
                          return Container(
                            color: Colors.black87,
                            alignment: Alignment.center,
                            padding: const EdgeInsets.all(16),
                            child: Text(
                              'Camera error: ${error.errorCode.name}\nUse the USB scanner, or reopen Gate clock.',
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: Colors.white70),
                            ),
                          );
                        },
                      )
                    else
                      Container(
                        color: Colors.black87,
                        alignment: Alignment.center,
                        child: const Text(
                          'Camera paused — USB scanner still active',
                          style: TextStyle(color: Colors.white70),
                        ),
                      ),
                    if (_busy)
                      Container(
                        color: Colors.black45,
                        alignment: Alignment.center,
                        child: const CircularProgressIndicator(color: Colors.white),
                      ),
                    Positioned(
                      left: 12,
                      right: 12,
                      bottom: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          _direction == 'arrival'
                              ? 'Mode: CLOCK IN — fill the frame with the barcode'
                              : 'Mode: CLOCK OUT — fill the frame with the barcode',
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            flex: 5,
            child: result == null
                ? const Center(
                    child: Text(
                      'Waiting for scan…\nWelcome / Goodbye with photo appears here.',
                      textAlign: TextAlign.center,
                    ),
                  )
                : _ResultPanel(result: result, timeLabel: timeFmt.format(result.recordedAt.toLocal())),
          ),
        ],
      ),
    );
  }
}

class _GateResult {
  final bool welcome;
  final bool accepted;
  final String title;
  final String subtitle;
  final String name;
  final String code;
  final String subjectType;
  final DateTime recordedAt;
  final Uint8List? photo;
  final String outcome;

  _GateResult({
    required this.welcome,
    required this.accepted,
    required this.title,
    required this.subtitle,
    required this.name,
    required this.code,
    required this.subjectType,
    required this.recordedAt,
    required this.photo,
    required this.outcome,
  });
}

class _ResultPanel extends StatelessWidget {
  final _GateResult result;
  final String timeLabel;

  const _ResultPanel({required this.result, required this.timeLabel});

  @override
  Widget build(BuildContext context) {
    final ok = result.accepted;
    final accent = ok
        ? (result.welcome ? const Color(0xFF1B7A4E) : const Color(0xFF2554A0))
        : const Color(0xFF9A3412);
    final initials = () {
      final parts = result.name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
      if (parts.isEmpty) return '?';
      if (parts.length == 1) return parts.first[0].toUpperCase();
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }();

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: accent.withValues(alpha: 0.35)),
      ),
      child: SingleChildScrollView(
        child: Column(
          children: [
            Text(
              result.title,
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                color: accent,
              ),
            ),
            const SizedBox(height: 12),
            CircleAvatar(
              radius: 56,
              backgroundColor: accent.withValues(alpha: 0.15),
              backgroundImage: result.photo != null ? MemoryImage(result.photo!) : null,
              child: result.photo == null
                  ? Text(initials, style: TextStyle(fontSize: 36, fontWeight: FontWeight.w700, color: accent))
                  : null,
            ),
            const SizedBox(height: 12),
            if (result.name.isNotEmpty)
              Text(
                result.name,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
              ),
            if (result.code.isNotEmpty || result.subjectType.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  [
                    if (result.subjectType.isNotEmpty) result.subjectType.toUpperCase(),
                    if (result.code.isNotEmpty) result.code,
                  ].join(' · '),
                  style: TextStyle(color: Colors.grey.shade700, fontWeight: FontWeight.w600),
                ),
              ),
            const SizedBox(height: 10),
            Text(
              timeLabel,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Text(
              result.subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade800),
            ),
          ],
        ),
      ),
    );
  }
}
