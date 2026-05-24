class NibssResponseCodes {
  static String getMessage(String? code) {
    if (code == null || code.isEmpty) {
      return "Unknown Error (No Code)";
    }

    switch (code) {
      case '00':
        return 'Approved successfully';
      case '01':
        return 'Refer to card issuer';
      case '02':
        return 'Refer to card issuer, special condition';
      case '03':
        return 'Invalid merchant';
      case '04':
        return 'Pick-up card';
      case '05':
        return 'Do not honor';
      case '06':
        return 'Error';
      case '07':
        return 'Pick-up card, special condition';
      case '08':
        return 'Honor with identification';
      case '09':
        return 'Request in progress';
      case '10':
        return 'Approved, partial';
      case '11':
        return 'Approved, VIP';
      case '12':
        return 'Invalid transaction';
      case '13':
        return 'Invalid amount';
      case '14':
        return 'Invalid card number';
      case '15':
        return 'No such issuer';
      case '30':
        return 'Format error';
      case '33':
        return 'Expired card, pick-up';
      case '34':
        return 'Suspected fraud, pick-up';
      case '38':
        return 'PIN tries exceeded, pick-up';
      case '39':
        return 'No credit account';
      case '40':
        return 'Function not supported';
      case '41':
        return 'Lost card, pick-up';
      case '43':
        return 'Stolen card, pick-up';
      case '51':
        return 'Insufficient funds';
      case '54':
        return 'Expired card';
      case '55':
        return 'Incorrect PIN';
      case '56':
        return 'No card record';
      case '57':
        return 'Transaction not permitted to cardholder';
      case '58':
        return 'Transaction not permitted on terminal';
      case '59':
        return 'Suspected fraud';
      case '61':
        return 'Exceeds withdrawal limit';
      case '62':
        return 'Restricted card';
      case '63':
        return 'Security violation';
      case '65':
        return 'Exceeds withdrawal frequency';
      case '68':
        return 'Response received too late';
      case '91':
        return 'Issuer or switch inoperative';
      case '92':
        return 'Routing error';
      case '94':
        return 'Duplicate transaction';
      case '96':
        return 'System malfunction';
      default:
        return 'Unknown Error (Code: $code)';
    }
  }
}
