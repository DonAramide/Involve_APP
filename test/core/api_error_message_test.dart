import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/core/utils/api_error_message.dart';

void main() {
  group('friendlyApiError', () {
    test('maps ECONNREFUSED to a friendly connection message', () {
      final msg = friendlyApiError('connect ECONNREFUSED 192.168.1.193:4000');
      expect(msg.toLowerCase(), contains('invify server'));
      expect(msg, isNot(contains('ECONNREFUSED')));
      expect(msg, isNot(contains('192.168')));
    });

    test('maps Dio connectionError', () {
      final msg = friendlyApiError(
        DioException(
          requestOptions: RequestOptions(path: '/x'),
          type: DioExceptionType.connectionError,
          message: 'connect ECONNREFUSED 127.0.0.1:4000',
        ),
      );
      expect(msg.toLowerCase(), contains('invify server'));
      expect(msg, isNot(contains('ECONNREFUSED')));
    });

    test('keeps clear business Exception messages', () {
      final msg = friendlyApiError(
        Exception("Student's first and last name are required to generate a virtual account."),
      );
      expect(msg, contains('first and last name'));
    });

    test('hides Authorization header internals', () {
      final msg = friendlyApiError(
        Exception('Generation failed: Missing or malformed Authorization header'),
        fallback: 'Could not generate the lesson note. Please try again.',
      );
      expect(msg, 'Your session expired. Please sign in again.');
      expect(msg.toLowerCase(), isNot(contains('authorization')));
    });

    test('hides Invalid API key internals', () {
      final msg = friendlyApiError(
        'Invalid API key',
        fallback: 'Could not generate virtual account. Please try again.',
      );
      expect(msg.toLowerCase(), contains('payment accounts'));
      expect(msg.toLowerCase(), isNot(contains('api key')));
    });

    test('falls back for opaque technical dumps', () {
      final msg = friendlyApiError(
        'DioException [bad response]: status code of 500',
        fallback: 'Something went wrong. Please try again.',
      );
      expect(msg, 'Something went wrong. Please try again.');
    });
  });
}
