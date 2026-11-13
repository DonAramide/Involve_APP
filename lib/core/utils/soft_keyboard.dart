import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// Soft IME helpers for devices that attach a HID barcode scanner.
///
/// Android often hides the on-screen keyboard when any hardware keyboard is
/// present. USB/Bluetooth wedge scanners count as hardware keyboards, so PIN
/// and search fields would otherwise never show a keypad.
///
/// On phones **without** an external scanner, the system IME is left alone —
/// forcing it globally previously stuck the keypad on every screen.
class SoftKeyboard {
  SoftKeyboard._();

  static const MethodChannel _channel =
      MethodChannel('com.invify.app/soft_keyboard');

  /// True when a non-virtual hardware keyboard / HID scanner is attached.
  static Future<bool> hasExternalKeyboard() async {
    if (kIsWeb || !Platform.isAndroid) return false;
    try {
      final value = await _channel.invokeMethod<bool>('hasExternalKeyboard');
      return value == true;
    } catch (_) {
      return false;
    }
  }

  /// Show the soft keyboard for an explicitly focused text field (PIN / search).
  ///
  /// Always safe to call from [TextField.onTap]. Native side uses a stronger
  /// show when a HID scanner is attached, and a normal show otherwise.
  static Future<void> forceShow() async {
    try {
      await SystemChannels.textInput.invokeMethod<void>('TextInput.show');
    } catch (_) {}
    if (kIsWeb || !Platform.isAndroid) return;
    try {
      await _channel.invokeMethod<void>('forceShow');
    } catch (_) {}
  }

  /// Dismiss the soft keyboard and clear sticky visibility flags.
  static Future<void> hide() async {
    try {
      await SystemChannels.textInput.invokeMethod<void>('TextInput.hide');
    } catch (_) {}
    if (kIsWeb || !Platform.isAndroid) return;
    try {
      await _channel.invokeMethod<void>('hide');
    } catch (_) {}
  }
}

/// Re-requests the soft keyboard only while a **visible** [EditableText] is focused
/// **and** an external HID keyboard/scanner is attached.
///
/// - No scanner (Samsung phone): does nothing — system IME handles TextFields.
/// - Scanner attached: forces soft IME for real PIN/search fields.
/// - Tiny/hidden wedge capture fields (Gate Clock 1×1) are ignored.
class SoftKeyboardEnforcer extends StatefulWidget {
  const SoftKeyboardEnforcer({super.key, required this.child});

  final Widget child;

  @override
  State<SoftKeyboardEnforcer> createState() => _SoftKeyboardEnforcerState();
}

class _SoftKeyboardEnforcerState extends State<SoftKeyboardEnforcer>
    with WidgetsBindingObserver {
  FocusNode? _lastFocused;
  bool _lastWasVisibleEditable = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    FocusManager.instance.addListener(_onFocusChange);
  }

  @override
  void dispose() {
    FocusManager.instance.removeListener(_onFocusChange);
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _syncImeToFocus();
    }
  }

  void _onFocusChange() {
    final focused = FocusManager.instance.primaryFocus;
    if (focused == null || !focused.hasFocus) {
      if (_lastWasVisibleEditable) {
        _lastWasVisibleEditable = false;
        SoftKeyboard.hide();
      }
      _lastFocused = null;
      return;
    }
    if (identical(focused, _lastFocused)) return;
    _lastFocused = focused;
    _syncImeToFocus();
  }

  void _syncImeToFocus() {
    final focused = FocusManager.instance.primaryFocus;
    final visibleEditable = _isVisibleEditableTextFocus(focused);
    if (!visibleEditable) {
      if (_lastWasVisibleEditable) {
        SoftKeyboard.hide();
      }
      _lastWasVisibleEditable = false;
      return;
    }
    _lastWasVisibleEditable = true;
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final still = FocusManager.instance.primaryFocus;
      if (!_isVisibleEditableTextFocus(still)) return;
      // Only fight Android's "hide soft IME when HW keyboard present" behaviour
      // when a scanner/keyboard is actually attached. Phones stay stock.
      if (!await SoftKeyboard.hasExternalKeyboard()) return;
      await SoftKeyboard.forceShow();
    });
  }

  static bool _isEditableTextFocus(FocusNode? focused) {
    if (focused == null || !focused.hasFocus) return false;
    final ctx = focused.context;
    if (ctx == null) return false;
    if (ctx.widget is EditableText) return true;
    return ctx.findAncestorStateOfType<EditableTextState>() != null ||
        ctx.findAncestorWidgetOfExactType<EditableText>() != null;
  }

  /// Skip Offstage / 1×1 HID wedge capture fields that must not open the IME.
  static bool _isVisibleEditableTextFocus(FocusNode? focused) {
    if (!_isEditableTextFocus(focused)) return false;
    final ctx = focused!.context;
    if (ctx == null) return false;
    final box = ctx.findRenderObject();
    if (box is! RenderBox || !box.hasSize) return false;
    if (box.size.width < 8 || box.size.height < 8) return false;
    return true;
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
