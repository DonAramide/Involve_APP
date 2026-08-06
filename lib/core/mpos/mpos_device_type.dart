/// Resolves which MPOS hardware stack to use from admin-synced terminal config.
enum MposDeviceFamily {
  aisino,
  morefun,
}

class MposDeviceType {
  static MposDeviceFamily resolve(String? terminalType, {String? deviceModel}) {
    final raw = '${terminalType ?? ''} ${deviceModel ?? ''}'.toUpperCase();
    final normalized = raw.replaceAll(RegExp(r'[\s_\-]'), '');
    if (normalized.contains('MOREFUN') ||
        normalized.contains('MP63') ||
        normalized.contains('MPOSDIRECT')) {
      return MposDeviceFamily.morefun;
    }
    return MposDeviceFamily.aisino;
  }

  static String channelValue(MposDeviceFamily family) {
    switch (family) {
      case MposDeviceFamily.morefun:
        return 'MOREFUN_MP63';
      case MposDeviceFamily.aisino:
        return 'AISINO_VM30';
    }
  }

  static bool isMoreFun(String? terminalType, {String? deviceModel}) =>
      resolve(terminalType, deviceModel: deviceModel) == MposDeviceFamily.morefun;
}
