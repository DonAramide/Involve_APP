import 'package:equatable/equatable.dart';

class PeerDevice extends Equatable {
  final String deviceId;
  final String deviceName;
  final String ip;
  final int port;
  final bool isMaster;
  final String? authToken;
  final DateTime lastSeen;

  const PeerDevice({
    required this.deviceId,
    required this.deviceName,
    required this.ip,
    required this.port,
    required this.isMaster,
    this.authToken,
    required this.lastSeen,
  });

  bool get isOnline => DateTime.now().difference(lastSeen).inSeconds < 10;

  PeerDevice copyWith({
    String? deviceId,
    String? deviceName,
    String? ip,
    int? port,
    bool? isMaster,
    String? authToken,
    DateTime? lastSeen,
  }) {
    return PeerDevice(
      deviceId: deviceId ?? this.deviceId,
      deviceName: deviceName ?? this.deviceName,
      ip: ip ?? this.ip,
      port: port ?? this.port,
      isMaster: isMaster ?? this.isMaster,
      authToken: authToken ?? this.authToken,
      lastSeen: lastSeen ?? this.lastSeen,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'deviceId': deviceId,
      'deviceName': deviceName,
      'ip': ip,
      'port': port,
      'isMaster': isMaster,
      'authToken': authToken,
    };
  }

  factory PeerDevice.fromJson(Map<String, dynamic> json) {
    return PeerDevice(
      deviceId: json['deviceId'],
      deviceName: json['deviceName'],
      ip: json['ip'],
      port: json['port'],
      isMaster: json['isMaster'],
      authToken: json['authToken'],
      lastSeen: DateTime.now(),
    );
  }

  @override
  List<Object?> get props => [deviceId, deviceName, ip, port, isMaster, authToken, lastSeen];
}
