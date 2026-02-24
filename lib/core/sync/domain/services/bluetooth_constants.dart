class BluetoothSyncConstants {
  static const String serviceUuid = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  static const String dataCharUuid = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
  
  // Protocol markers
  static const String chunkStart = "S:";
  static const String chunkEnd = "E:";
  static const String msgPull = "PULL:";
  static const String msgPush = "PUSH:";
  static const String msgComplete = "OK";
}
