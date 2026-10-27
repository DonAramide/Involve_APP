import 'package:equatable/equatable.dart';

class PeerDevice extends Equatable {
  final String deviceId;
  final String deviceName;
  /// Hardware serial shown so the other phone can confirm this handset.
  final String? hardwareId;
  final String? ip;
  final int? port;
  final String? bluetoothId;
  final bool isBluetooth;
  final bool isMaster;
  final String? authToken;
  final DateTime lastSeen;

  const PeerDevice({
    required this.deviceId,
    required this.deviceName,
    this.hardwareId,
    this.ip,
    this.port,
    this.bluetoothId,
    this.isBluetooth = false,
    required this.isMaster,
    this.authToken,
    required this.lastSeen,
  });

  bool get isOnline => DateTime.now().difference(lastSeen).inSeconds < 15;

  PeerDevice copyWith({
    String? deviceId,
    String? deviceName,
    String? hardwareId,
    String? ip,
    int? port,
    String? bluetoothId,
    bool? isBluetooth,
    bool? isMaster,
    String? authToken,
    DateTime? lastSeen,
  }) {
    return PeerDevice(
      deviceId: deviceId ?? this.deviceId,
      deviceName: deviceName ?? this.deviceName,
      hardwareId: hardwareId ?? this.hardwareId,
      ip: ip ?? this.ip,
      port: port ?? this.port,
      bluetoothId: bluetoothId ?? this.bluetoothId,
      isBluetooth: isBluetooth ?? this.isBluetooth,
      isMaster: isMaster ?? this.isMaster,
      authToken: authToken ?? this.authToken,
      lastSeen: lastSeen ?? this.lastSeen,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'deviceId': deviceId,
      'deviceName': deviceName,
      'hardwareId': hardwareId,
      'ip': ip,
      'port': port,
      'bluetoothId': bluetoothId,
      'isBluetooth': isBluetooth,
      'isMaster': isMaster,
      'authToken': authToken,
    };
  }

  factory PeerDevice.fromJson(Map<String, dynamic> json) {
    return PeerDevice(
      deviceId: json['deviceId'],
      deviceName: json['deviceName'],
      hardwareId: json['hardwareId']?.toString(),
      ip: json['ip'],
      port: json['port'],
      bluetoothId: json['bluetoothId'],
      isBluetooth: json['isBluetooth'] ?? false,
      isMaster: json['isMaster'],
      authToken: json['authToken'],
      lastSeen: DateTime.now(),
    );
  }

  @override
  String get confirmId {
    final hardware = hardwareId?.trim() ?? '';
    return hardware.isNotEmpty ? hardware : deviceId;
  }

  @override
  List<Object?> get props => [deviceId, deviceName, hardwareId, ip, port, isBluetooth, isMaster, authToken, lastSeen];
}
