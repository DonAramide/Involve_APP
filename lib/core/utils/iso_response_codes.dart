const Map<String, String> isoResponseCodes = {
  '00': 'Approved or completed successfully',
  '01': 'Refer to card issuer',
  '02': 'Refer to card issuer, special condition',
  '03': 'Invalid merchant',
  '04': 'Pick-up card',
  '05': 'Do not honor',
  '06': 'Error',
  '07': 'Pick-up card, special condition',
  '08': 'Honor with identification',
  '09': 'Request in progress',
  '10': 'Approved, partial',
  '11': 'Approved, VIP',
  '12': 'Invalid transaction',
  '13': 'Invalid amount',
  '14': 'Invalid card number',
  '15': 'No such issuer',
  '16': 'Approved, update track 3',
  '17': 'Customer cancellation',
  '18': 'Customer dispute',
  '19': 'Re-enter transaction',
  '20': 'Invalid response',
  '21': 'No action taken',
  '22': 'Suspected malfunction',
  '23': 'Unacceptable transaction fee',
  '24': 'File update not supported',
  '25': 'Unable to locate record',
  '26': 'Duplicate record',
  '27': 'File update edit error',
  '28': 'File update file locked',
  '29': 'File update failed',
  '30': 'Format error',
  '31': 'Bank not supported',
  '32': 'Completed partially',
  '33': 'Expired card, pick-up',
  '34': 'Suspected fraud, pick-up',
  '35': 'Contact acquirer, pick-up',
  '36': 'Restricted card, pick-up',
  '37': 'Call acquirer security, pick-up',
  '38': 'PIN tries exceeded, pick-up',
  '39': 'No credit account',
  '40': 'Function not supported',
  '41': 'Lost card',
  '42': 'No universal account',
  '43': 'Stolen card',
  '44': 'No investment account',
  '51': 'Not sufficient funds',
  '52': 'No check account',
  '53': 'No savings account',
  '54': 'Expired card',
  '55': 'Incorrect PIN',
  '56': 'No card record',
  '57': 'Transaction not permitted to cardholder',
  '58': 'Transaction not permitted on terminal',
  '59': 'Suspected fraud',
  '60': 'Contact acquirer',
  '61': 'Exceeds withdrawal limit',
  '62': 'Restricted card',
  '63': 'Security violation',
  '64': 'Original amount incorrect',
  '65': 'Exceeds withdrawal frequency',
  '66': 'Call acquirer security',
  '67': 'Hard capture',
  '68': 'Response received too late',
  '75': 'PIN tries exceeded',
  '77': 'Intervene, bank approval required',
  '78': 'Intervene, bank approval required for partial amount',
  '90': 'Cut-off in progress',
  '91': 'Issuer or switch inoperative',
  '92': 'Routing error',
  '93': 'Violation of law',
  '94': 'Duplicate transaction',
  '95': 'Reconcile error',
  '96': 'System malfunction',
  '98': 'Exceeds cash limit'
};

String getIsoResponseMessage(String? msg) {
  if (msg == null || msg.isEmpty) return 'Unknown Error';
  
  // msg is often in the format "Declined (Code: 63)" or "Code: 63"
  final regex = RegExp(r'Code:\s*(\d{2})');
  final match = regex.firstMatch(msg);
  
  if (match != null && match.groupCount >= 1) {
    final code = match.group(1);
    final description = isoResponseCodes[code];
    if (description != null) {
      return '$description (Code $code)';
    }
  }
  
  // If we couldn't parse it or find it, return the original message
  return msg;
}
