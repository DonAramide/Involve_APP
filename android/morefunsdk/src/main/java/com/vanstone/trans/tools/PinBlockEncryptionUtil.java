package com.vanstone.trans.tools;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.security.Security;

import javax.crypto.BadPaddingException;
import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.jpos.iso.ISOUtil;
import org.jpos.security.jceadapter.JCEHandler;
import org.jpos.security.jceadapter.JCESecurityModule;



public class PinBlockEncryptionUtil {
	
	
	 
	 public static void main(String[] args) throws InvalidKeyException,
	   NoSuchAlgorithmException, NoSuchPaddingException,
	   IllegalBlockSizeException, BadPaddingException {

	  //System.out
	   // .println(encryptPinBlock("1234567890123456", "1234", key, 168));
	  try
	  {

	    

	    
	  }
	  catch(Exception ex)
	  {
		  ex.printStackTrace();
	  }

	 }

	public static String toHexString(byte[] ba) {
		StringBuilder str = new StringBuilder();
		for(int i = 0; i < ba.length; i++)
			str.append(String.format("%x", ba[i]));
		return str.toString();
	}

	public static String fromHexString(String hex) {
		StringBuilder str = new StringBuilder();
		for (int i = 0; i < hex.length(); i+=2) {
			str.append((char) Integer.parseInt(hex.substring(i, i + 2), 16));
		}
		return str.toString();
	}
	 
	 public static String DecryptSessionKey(String zmk, String seKey)
	 {
		 String result ="";
		 try
		 {
			
			 System.out.println("CTMK-XOR: " + zmk);
			 System.out.println("seKey: " + seKey);
			 String sKey = seKey.substring(0,32);
			 String kcv = seKey.substring(32,38);
			 System.out.println("KCVV: " + kcv);
			 System.out.println("CTMK: " + zmk);
			 Security.addProvider(new BouncyCastleProvider());
         	 JCEHandler jceHandler = new JCEHandler(new BouncyCastleProvider());
         	 
         	
         	//jceHandler.generateMAC(data, kd, macAlgorithm)
         	 
         	
           byte [] keyBytes3 = hexStringToByteArray(zmk);
           SecretKey sessionKey3 = new SecretKeySpec(keyBytes3,"DESede");
           
           //Key key = jceHandler.
           
           //jceHandler.decryptDESKey(32, hexStringToByteArray(sKey), sessionKey3, true);
           
           byte[] clearSessionKeyB =  jceHandler.decryptData(hexStringToByteArray(sKey), sessionKey3);
           String clearSessionKey = ISOUtil.hexString(clearSessionKeyB);
            result = clearSessionKey;
            if(clearSessionKey.length() >= 32)
            	clearSessionKey = clearSessionKey.substring(0,32);
            
            result = clearSessionKey;
            
           //LoggingUtil.DebugInfo("Clear-Session Key::" + clearSessionKey);
           //LoggingUtil.DebugInfo("Encrypted-Session Key::" + seKey);
          String key = ISOUtil.padleft("0", 16, '0');
           String kcv2 = EncryptKey(clearSessionKey, key);
           //LoggingUtil.DebugInfo("KCV::" + kcv2);
           
           //LoggingUtil.DebugInfo("Clear-Session Key22::" + clearSessionKey.substring(0,32));
           
           
		 }
		 catch(Exception ex)
		 {
			 ex.printStackTrace();
		 }
		 return result;
	 }
	 
	 
	 public static String  EncryptKey(String zmk, String key )
	 {
		 String pb ="";
		 try
		 {
			
				
			// String zmk = ISOUtil.hexor("A013076DFA210E3EAA36B87790EB5930","8D4FE78BF5DAE4EDBC46BF8911092E21");
			 System.out.println("CTMK-XOR: " + zmk);
			 System.out.println("Key: " + key);
			 
			
      	   
        	 Security.addProvider(new BouncyCastleProvider());
         	 JCEHandler jceHandler = new JCEHandler(new BouncyCastleProvider());
         
           byte [] keyBytes3 = hexStringToByteArray(zmk);
           SecretKey sessionKey3 = new SecretKeySpec(keyBytes3,"DESede");
           byte[] pinss =  jceHandler.encryptData(hexStringToByteArray(key), sessionKey3);
      	   pb = ISOUtil.hexString(pinss);
           //LoggingUtil.DebugInfo("Encrypted Value::" + pb);
      
			 
		 }
		 catch(Exception ex)
		  {
			  ex.printStackTrace();
		  }
		 
		 return pb;
	 }

	public static String  EncryptMessage(String data, String key )
	{
		String pb ="";
		try
		{


			// String zmk = ISOUtil.hexor("A013076DFA210E3EAA36B87790EB5930","8D4FE78BF5DAE4EDBC46BF8911092E21");
			System.out.println("CTMK-XOR: " + data);
			System.out.println("Key: " + key);



			Security.addProvider(new BouncyCastleProvider());
			JCEHandler jceHandler = new JCEHandler(new BouncyCastleProvider());

			byte [] keyBytes3 = hexStringToByteArray(key);
			SecretKey sessionKey3 = new SecretKeySpec(keyBytes3,"DESede");
			byte[] datx =  jceHandler.encryptData(hexStringToByteArray(data), sessionKey3);
			pb = ISOUtil.hexString(datx);
			//LoggingUtil.DebugInfo("Encrypted Value::" + pb);


		}
		catch(Exception ex)
		{
			ex.printStackTrace();
		}

		return pb;
	}

	 


	 /**
	  * Encrypts the security pin for a card and gives the Hex representation of the encrypted pin block.
	  * @param cardNumber Card number for which the Pin is encrypted
	  * @param pin Pin to be encrypted
	  * @param key Clear Key to be used for encryption
	  * @param keySize Key strnght
	  * @return The Hex representation of the encrypted pin block bytes
	  * @throws NoSuchAlgorithmException
	  * @throws NoSuchPaddingException
	  * @throws InvalidKeyException
	  * @throws IllegalBlockSizeException
	  * @throws BadPaddingException
	  */
	 public static String encryptPinBlock(String cardNumber, String pin,
	   String key, int keySize) throws NoSuchAlgorithmException,
	   NoSuchPaddingException, InvalidKeyException,
	   IllegalBlockSizeException, BadPaddingException {
	  byte[] keyBytes = getEncryptionKey(key, keySize);
	  byte[] pinBlock = getPinBlock(cardNumber, pin);
	  SecretKey secretKey = new SecretKeySpec(keyBytes, "DESede");

	  Cipher cipher = Cipher.getInstance("DESede/CBC/NoPadding");
	  cipher.init(Cipher.ENCRYPT_MODE, secretKey);
	  byte[] encryptedPinBlock = cipher.doFinal(pinBlock);

	  return getHexString(encryptedPinBlock);

	 }

	 /**
	  * Takes the Card number and Pin as input and generates the Pin Block Out of it.
	  * First get the card padded (16 Char) which when converted to Hex gives an array of 8
	  * Get the Pin Padded (16 Char) which when converted to Hex gives an array of 8
	  * XOR the resulting arrays to get the pin block 
	  * @param cardNumber
	  * @param pin
	  * @return
	  * @throws IllegalBlockSizeException
	  */
	 private static byte[] getPinBlock(String cardNumber, String pin)
	   throws IllegalBlockSizeException {
	  int[] paddedPin = padPin(pin);
	  int[] paddedCard = padCard(cardNumber);

	  byte[] pinBlock = new byte[8];
	  for (int cnt = 0; cnt < 8; cnt++) {
	   pinBlock[cnt] = (byte) (paddedPin[cnt] ^ paddedCard[cnt]);
	  }
	  return pinBlock;
	 }

	 private static final String PIN_PAD = "FFFFFFFFFFFFFF";

	 /**
	  * Generates a 16 digit block, with following Components
	  * Two digit pin length (left padded with zero if length less than 10)
	  * Pin Number 
	  * Right padded with F to make it 16 char long.
	  * FOr example for a 5 digit Pin 12345 the outout would be 
	  * 0512 345F FFFF FFFF
	  * @param pin
	  * @return
	  * @throws IllegalBlockSizeException
	  */
	 private static int[] padPin(String pin) throws IllegalBlockSizeException {
	  String pinBlockString = "0" + pin.length() + pin + PIN_PAD;
	  pinBlockString = pinBlockString.substring(0, 16);
	  return getHexIntArray(pinBlockString);

	 }

	 private static final String ZERO_PAD = "0000000000000000";

	 /**
	  * Using the Card Number it generates a 16-digit block with 4 zeroes and and
	  * the 12 right most digits of the card number, excluding the check digit
	  * (which is the last digit of the card number. 
	  * For Example for a Card 5259 5134 8115 5074
	  * 4 Will be the check digit
	  * Right most 12 digits would be 951348115507
	  * Hence the output would be 0000 9513 4811 5507
	  * @param cardNumber
	  * @return
	  * @throws IllegalBlockSizeException
	  */
	 private static int[] padCard(String cardNumber)
	   throws IllegalBlockSizeException {
	  cardNumber = ZERO_PAD + cardNumber;
	  int cardNumberLength = cardNumber.length();
	  int beginIndex = cardNumberLength - 13;
	  String acctNumber = "0000"
	    + cardNumber.substring(beginIndex, cardNumberLength - 1);
	  return getHexIntArray(acctNumber);
	 }

	 /**
	  * Takes Hex representation of the key, validates the length and returns the
	  * equivallent bytes
	  * 
	  * @param keyString
	  *            Hex representation of the key. THe allowed length of the
	  *            string are 16 (56 bit), 32 (112 bit), 32 or 48 (for 168 bit).
	  *            If the key Strength is 168 bit and the key length is 32 the
	  *            first 16 chars are repeated.
	  * @param keySize
	  *            Valid values are 56, 112, 168
	  * @return
	  * @throws IllegalBlockSizeException
	  * @throws InvalidKeyException
	  * 
	  */
	 private static byte[] getEncryptionKey(String keyString, int keySize)
	   throws IllegalBlockSizeException, InvalidKeyException {
	  int keyLength = keyString.length();
	  switch (keySize) {
	  case 56:
	   if (keyLength != 16)
	    throw new InvalidKeyException(
	      "Hex Key length should be 16 for a 56 Bit Encryption, found ["
	        + keyLength + "]");
	   break;
	  case 112:
	   if (keyLength != 32)
	    throw new InvalidKeyException(
	      "Hex Key length should be 32 for a 112 Bit Encryption, found["
	        + keyLength + "]");
	   break;
	  case 168:
	   if (keyLength != 32 && keyLength != 48)
	    throw new InvalidKeyException(
	      "Hex Key length should be 32 or 48 for a 168 Bit Encryption, found["
	        + keyLength + "]");
	   if (keyLength == 32) {
	    keyString = keyString + keyString.substring(0, 16);
	   }
	   break;
	  default:
	   throw new InvalidKeyException(
	     "Invalid Key Size, expected one of [56, 112, 168], found["
	       + keySize + "]");
	  }

	  byte[] keyBytes = getHexByteArray(keyString);
	  return keyBytes;

	 }

	 /**
	  * Takes a byte array as input and provides a Hex String reporesentation
	  * 
	  * @param input
	  * @return
	  */
	 public static String getHexString(byte[] input) {
	  StringBuilder strBuilder = new StringBuilder();
	  for (byte hexByte : input) {
	   int res = 0xFF & hexByte;
	   String hexString = Integer.toHexString(res);
	   if (hexString.length() == 1) {
	    strBuilder.append(0);
	   }
	   strBuilder.append(hexString);

	  }

	  return strBuilder.toString();
	 }

	 /**
	  * Converts a Hex string representation to an int array
	  * 
	  * @param input
	  *            Every two character of the string is assumed to be
	  * @return int array containing the Hex String input
	  * @throws IllegalBlockSizeException
	  */
	 private static int[] getHexIntArray(String input)
	   throws IllegalBlockSizeException {
	  if (input.length() % 2 != 0) {
	   throw new IllegalBlockSizeException(
	     "Invalid Hex String, Hex representation length is not a multiple of 2");
	  }
	  int[] resultHex = new int[input.length() / 2];
	  for (int iCnt1 = 0; iCnt1 < input.length(); iCnt1++) {
	   String byteString = input.substring(iCnt1, ++iCnt1 + 1);
	   int hexOut = Integer.parseInt(byteString, 16);
	   resultHex[iCnt1 / 2] = (hexOut & 0x000000ff);
	  }
	  return resultHex;
	 }

	 /**
	  * Converts a Hex string representation to an byte array
	  * 
	  * @param input
	  *            Every two character of the string is assumed to be
	  * @return byte array containing the Hex String input
	  * @throws IllegalBlockSizeException
	  */
	 private static byte[] getHexByteArray(String input)
	   throws IllegalBlockSizeException {

	  int[] resultHex = getHexIntArray(input);
	  byte[] returnBytes = new byte[resultHex.length];
	  for (int cnt = 0; cnt < resultHex.length; cnt++) {
	   returnBytes[cnt] = (byte) resultHex[cnt];
	  }
	  return returnBytes;
	 }
	 
	 private static String getAccountNumberPartr(String cardNumber){
	        int length = cardNumber.length();
	        return cardNumber.substring(length-13, length-1);
	    }
	    
	 //code to generate pinblock
	    /*public byte [] makeEncryptedPin(String clearPin , String cardNumber) throws ISOException{
	        String block1 = ISOUtil.padright(String.format("0%d%s", clearPin.length() , clearPin), 16, 'F');
	        String block2 = ISOUtil.zeropad(getAccountNumberPartr(cardNumber),16);
	        System.out.println(block1 +"|"+ block2);
	        byte [] clearPINbytes = ISOUtil.hex2byte(ISOUtil.hexor(block1, block2));
	        return encryptSk(clearPINbytes);
	    }*/

	 //code to encrypt generated pinblock
	    public static byte[] encrytPINBlock(String clearPINBlock, String hexKey){
	        //String hexKey="D2EDA5E7DC3EFA30F5598FF503748314";
	        byte[] encrytedPinBlock = null;
	        byte []keyBytes = hexStringToByteArray(hexKey);
	        try {
	        	byte[] pinblock = hexStringToByteArray(clearPINBlock);
	            SecretKey secretKey = new SecretKeySpec(keyBytes,"DESede");
	            Cipher cipher = Cipher.getInstance("DESede/CBC/NoPadding");
	            cipher.init(Cipher.ENCRYPT_MODE, secretKey);
	            encrytedPinBlock = cipher.doFinal(pinblock);
	            
	            String ss = ISOUtil.hexString(encrytedPinBlock);
		        // LoggingUtil.DebugInfo("SS-PIN-BLOC::" + ss);
		         encrytedPinBlock = ISOUtil.hex2byte(ss);
		         
		        // return ss;
		           
		           
	        }catch(Exception ex){
	            ex.printStackTrace();
	        }
	        return encrytedPinBlock;
	    }
	    
	    
	    
	    public static String encrytPINBlock2(String clearPINBlock, String hexKey){
	        //String hexKey="D2EDA5E7DC3EFA30F5598FF503748314";
	        byte[] encrytedPinBlock = null;
	        // hexStringToByteArray(hexKey);
	        try {
	        	
	        	 byte []keyBytes =  hexKey.getBytes(StandardCharsets.UTF_8);
	        	byte[] pinblock = hexStringToByteArray(clearPINBlock);
	            SecretKey secretKey = new SecretKeySpec(keyBytes,"DESede");
	            Cipher cipher = Cipher.getInstance("DESede/CBC/NoPadding");
	            cipher.init(Cipher.ENCRYPT_MODE, secretKey);
	            encrytedPinBlock = cipher.doFinal(pinblock);
	            
	            String ss = ISOUtil.hexString(encrytedPinBlock);
		        // LoggingUtil.DebugInfo("SS-PIN-BLOC::" + ss);
		         encrytedPinBlock = ISOUtil.hex2byte(ss);
		         
		         return ss;
		           
		           
	        }catch(Exception ex){
	            ex.printStackTrace();
	        }
	        return null; // encrytedPinBlock;
	    }
	    
	    public static byte[] hexStringToByteArray(String s){
	        int len = s.length();
	        byte [] data = new byte [len / 2];
	        for (int i = 0; i <len; i += 2){
	            data [i / 2] = (byte) ((Character.digit(s.charAt(i), 16) << 4) + Character.digit(s.charAt(i +1), 16));
	        }
	        
	        byte [] key;
	        if(data.length == 16){
	            key = new byte[24];
	            System.arraycopy(data, 0, key, 0, 16);
	            System.arraycopy(data, 0, key, 16, 8);
	        }else {
	            key = data;
	        }
	        return key;
	    }


}
