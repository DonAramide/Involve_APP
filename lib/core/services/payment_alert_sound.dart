import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Plays a loud payment-received alert (POS-style double beep).
class PaymentAlertSound {
  PaymentAlertSound._();

  static final AudioPlayer _player = AudioPlayer();
  static bool _configured = false;

  static Future<void> _ensureConfigured() async {
    if (_configured) return;
    try {
      await _player.setReleaseMode(ReleaseMode.stop);
      await _player.setVolume(1.0);
      // Alarm usage routes at a loud stream on most Android POS devices.
      await _player.setAudioContext(
        AudioContext(
          android: const AudioContextAndroid(
            isSpeakerphoneOn: true,
            stayAwake: false,
            contentType: AndroidContentType.sonification,
            usageType: AndroidUsageType.alarm,
            audioFocus: AndroidAudioFocus.gainTransientMayDuck,
          ),
          iOS: AudioContextIOS(
            category: AVAudioSessionCategory.playback,
            options: {AVAudioSessionOptions.defaultToSpeaker},
          ),
        ),
      );
      _configured = true;
    } catch (e) {
      debugPrint('[PaymentAlertSound] configure failed: $e');
      _configured = true; // avoid retry loops on unsupported platforms
    }
  }

  /// Loud beep when an inbound payment notification is shown.
  static Future<void> play() async {
    try {
      await _ensureConfigured();
      await HapticFeedback.heavyImpact();
      await _player.stop();
      await _player.setVolume(1.0);
      await _player.play(AssetSource('sounds/payment_received.wav'));
    } catch (e) {
      debugPrint('[PaymentAlertSound] play failed: $e');
      try {
        await SystemSound.play(SystemSoundType.alert);
        await HapticFeedback.vibrate();
      } catch (_) {}
    }
  }
}
