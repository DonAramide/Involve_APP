import 'dart:io';
import 'dart:typed_data';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

class SharingUtils {
  static Future<void> shareFile(Uint8List bytes, String fileName, {String? text}) async {
    final tempDir = await getTemporaryDirectory();
    final tempFile = File(p.join(tempDir.path, fileName));
    await tempFile.writeAsBytes(bytes);
    
    await Share.shareXFiles([XFile(tempFile.path)], text: text);
  }

  static Future<Uint8List?> readFileBytes(String path) async {
    final file = File(path);
    if (await file.exists()) {
      return await file.readAsBytes();
    }
    return null;
  }
}
