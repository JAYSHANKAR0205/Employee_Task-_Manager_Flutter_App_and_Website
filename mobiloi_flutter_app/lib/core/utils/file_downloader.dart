import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import '../network/dio_client.dart';

class FileDownloader {
  /// Downloads a file from [url] (relative endpoint or full URL) and prompts
  /// the user to save it with [fileName].
  static Future<bool> downloadFile({
    required String url,
    required String fileName,
    void Function(int received, int total)? onProgress,
  }) async {
    try {
      final dio = DioClient().dio;
      final response = await dio.get<List<int>>(
        url,
        options: Options(responseType: ResponseType.bytes),
        onReceiveProgress: onProgress,
      );

      final data = response.data;
      if (data == null || data.isEmpty) {
        throw 'Downloaded file is empty';
      }

      final bytes = Uint8List.fromList(data);

      final result = await FilePicker.saveFile(
        dialogTitle: 'Save $fileName',
        fileName: fileName,
        bytes: bytes,
      );

      return result != null || kIsWeb;
    } catch (e) {
      debugPrint('FileDownloader error: $e');
      rethrow;
    }
  }
}
