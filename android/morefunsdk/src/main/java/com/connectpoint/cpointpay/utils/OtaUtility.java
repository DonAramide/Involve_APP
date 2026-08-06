package com.connectpoint.cpointpay.utils;

import android.util.Log;

import java.io.FileInputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.text.DecimalFormat;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Random;
import java.util.StringTokenizer;
import java.util.Vector;


public class OtaUtility {
	
	private static final int PAD_LIMIT = 8192;

    public static SimpleDateFormat dff = new SimpleDateFormat("MM-DD-yy hhmm a");
    public static SimpleDateFormat dfft = new SimpleDateFormat("dd-MMM-yyyy hhmmss a");
    public static SimpleDateFormat dff2 = new SimpleDateFormat("DDMMyyyy");
    public static SimpleDateFormat dff3 = new SimpleDateFormat("dd-MM-yyyy");
    public static SimpleDateFormat dft1 = new SimpleDateFormat("dd-MM-yyyy hh:mm:ss a");
    public static SimpleDateFormat dft3 = new SimpleDateFormat("dd-MMM hh:mm a");
    public static SimpleDateFormat dff4 = new SimpleDateFormat("yyyy-MM-dd");
    
    public static SimpleDateFormat dff6 = new SimpleDateFormat("dd-MMM-yyyy");
    
    public static SimpleDateFormat mysdt = new SimpleDateFormat("yyyy-MM-dd hh:mm:ss");
    
    public static SimpleDateFormat dffLic = new SimpleDateFormat("MMyyyydd");



    public static String formatAmount2(double d)
    {
        DecimalFormat df = new DecimalFormat("#,###.##");
        return df.format(d);
    }

    
    public static boolean isDataNumeric(String text)
    {
    	
    	boolean isNumeric = text.matches("^\\d+$");
    	//Pattern pattern = Pattern.compile("^\\d+$");
    	//if(pattern.matcher(text).matches())
    	//LoggingUtil.DebugInfo("IS-NUMERIC::" + isNumeric);
    	return isNumeric;
    }
    
    
    public static Date[] GetDateRange(Date dt,String type)
    {
    	Calendar c = Calendar.getInstance();
    	//c.setTime(dt); // Now use today date.
    	//c.add(Calendar.DATE, days); 
    	Calendar c2 = Calendar.getInstance();
    	
    	Date[] dts = new Date[2];
    	if(type.equals("M")) //Monthly
    	{
    		c = Calendar.getInstance();
        	c.setTime(dt);
        	c.set(Calendar.DATE, 1);
        	dts[0] = c.getTime();
        	
        	c2.setTime(dt);
        	c2.set(Calendar.DATE,GetLastDay(c2.get(Calendar.DAY_OF_MONTH), c2.get(Calendar.DAY_OF_YEAR)) );
        	dts[1] = c2.getTime();
    	}
    	else if(type.equals("W")) //Weekly
    	{
    		c = Calendar.getInstance();
        	c.setTime(dt);
        	c2.setTime(dt);
        	int w = c.get(Calendar.DAY_OF_WEEK);
        	c.set(Calendar.DATE, 1);
        	int[] days =  GetWeekDays(w);
        	
        	c.add(Calendar.DATE, days[0]);
        	c2.add(Calendar.DATE, days[1]);
        		
            dts[0] = c.getTime();
        	dts[1] = c2.getTime();
    	}
        else if(type.equals("T")) //Today
        {
            c = Calendar.getInstance();
            Log.d("TT","Date2d::" + dt.toString());
            Log.d("TT","Date2c::" + c);
            c.setTime(dt);

            c.set(Calendar.HOUR,0);
            c.set(Calendar.MINUTE,0);
            c.set(Calendar.SECOND,0);
            dts[0] = c.getTime();
            Log.d("TT","Date1::" + dts[0]);
            c2 = c;
            c2.set(Calendar.HOUR,23);
            c2.set(Calendar.MINUTE,59);
            c2.set(Calendar.SECOND,59);
            dts[1] = c2.getTime();
            Log.d("TT2","Date2::" + dts[1]);

        }
        else if(type.equals("Y")) //Yesterday
        {
            c = Calendar.getInstance();
            c.setTime(dt);
            c.add(Calendar.DATE, -1);
            dts[0] = c.getTime();
            dts[1] = c.getTime();
        }
        else if(type.equals("L")) //Last Week
        {
            c = Calendar.getInstance();
            c.setTime(dt);
            c2.setTime(dt);
            c2.add(Calendar.DATE, -7);
            dts[0] = c.getTime();
            dts[1] = c2.getTime();
        }

    	
    	return  dts;
    }
    
    public static boolean isLeapYear(int year) {
  	  Calendar cal = Calendar.getInstance();
  	  cal.set(Calendar.YEAR, year);
  	  return cal.getActualMaximum(Calendar.DAY_OF_YEAR) > 365;
   }
    
    public static Calendar ConvertToCalendarDate(int dd, int mm, int year) {
    	  Calendar cal = Calendar.getInstance();
    	  cal.set(Calendar.YEAR, year);
    	  cal.set(Calendar.MONTH, mm - 1);
    	  cal.set(Calendar.DATE, dd);
    	  return cal;
     }
    
    
    public static long GetDateDifferenceInDays(Date d1, Date d2) {
  	  Calendar cal1 = Calendar.getInstance();
  	  cal1.setTime(d1);
  	  Calendar cal2 = Calendar.getInstance();
	  cal2.setTime(d2);
	  
  	  cal1.set(Calendar.HOUR,0);
  	  cal1.set(Calendar.MINUTE, 0);
  	  cal1.set(Calendar.SECOND, 0);
  	  
  	  cal2.set(Calendar.HOUR,0);
	  cal2.set(Calendar.MINUTE, 0);
	  cal2.set(Calendar.SECOND, 0);
	  
	  long diff = cal2.getTimeInMillis() - cal1.getTimeInMillis();
	  
	  long oneDay = 1000 * 60 * 60 * 24;
	  
	  diff = diff/oneDay;
  	
  	  return diff;
   }
    
    public static int GetLastDay(int mth,int yr)
    {
    	boolean isleap = isLeapYear(yr);
    	if(mth == 4 || mth == 6 || mth == 9 || mth == 11 )
    		return 30;
    	else if (mth == 2)
    	{
    		if(isleap)
    			return 29;
    		else
    			return 28;
    	}
    	else
    		return 31;
    	
    	
    }
    
    public static int[] GetWeekDays(int d)
    {
    	int[] days = new int[2];
    	days[0] = 0; days[1] =0;
    	
    	if(d == Calendar.MONDAY)
    	{
    		days[0] = 0; days[1] = 0;
    	}
    	else if(d == Calendar.TUESDAY)
    	{
    		days[0] = -1; days[1] = 0;
    	}
    	else if(d == Calendar.WEDNESDAY)
    	{
    		days[0] = -2; days[1] = 0;
    	}
    	else if(d == Calendar.THURSDAY)
    	{
    		days[0] = -3; days[1] = 0;
    	}
    	else if(d == Calendar.FRIDAY)
    	{
    		days[0] = -4; days[1] = 0;
    	}
    	else if(d == Calendar.SATURDAY)
    	{
    		days[0] = -5; days[1] = 0;
    	}
    	else if(d == Calendar.SUNDAY)
    	{
    		days[0] = -6; days[1] = 0;
    	}
    		
    	
    	return days;
    	
    }

    
    public static String GetEasternDateFormat(Date dt)
    {
      return dff.format(dt) + " EDT";
    }

    public static String GetDateFormat2(Date dt)
    {
      return dff2.format(dt) ;
    }
    
    public static String ConvertToDateDDMMMYYYY(Date dt)
    {
      return dff6.format(dt) ;
    }
    
    public static String CDateToString(Date dt)
    {
      return dff3.format(dt) ;
    }
    public static String CDateToStringSanef(Date dt)
    {
        return dff6.format(dt) ;
    }
    public static String CDateToStringSanef2(Date dt)
    {
        return dff4.format(dt);
    }
    
    public static String CDateToStringLic(Date dt)
    {
      return dffLic.format(dt) ;
    }
    
    public static Date ConvertToDateLic(String dt)
    {
    	Date d = new Date();
    	try {
    	 d = dffLic.parse(dt.trim());
    	
      }
      catch(Exception ex)
      {
    	  ex.printStackTrace();
      }
    	return d;
    }
    
    public static String CDateTimeToString(Date dt)
    {
      return dfft.format(dt) ;
    }
    public static String CDateTimeToString2(Date dt)
    {
      return dft1.format(dt) ;
    }
    
    public static String CDateTimeToString3(Date dt)
    {
      return dft3.format(dt) ;
    }
    
    public static String MYDateToString(Date dt)
    {
      return dff4.format(dt) ;
    }
    
  
    
    public static String CDateToStringMS(String dt)
    {
      String st = "";
    	try {
    	Date d = dff4.parse(dt.trim());
    	st = dff3.format(d) ;
      }
      catch(Exception ex)
      {
    	  ex.printStackTrace();
      }
    	return st;
    }
    
    public static String MSDateToStringC(String dt)
    {
      String st = "";
    	try {
    	Date d = dff3.parse(dt.trim());
    	st = dff4.format(d) ;
      }
      catch(Exception ex)
      {
    	  ex.printStackTrace();
      }
    	return st;
    }
    
    public static Date MYSQLStringDateToDateTime(String dt)
    {
    	Date d =  new Date();
    	try {
    	 d = mysdt.parse(dt.trim());
    	
      }
      catch(Exception ex)
      {
    	  ex.printStackTrace();
      }
    	return d;
    }

    public static Date SetDateWithTime(Date dt,int hh, int mm, int ss)
    {
        Calendar c = Calendar.getInstance();
        c.setTime(dt); // Now use today date.
        c.set(Calendar.HOUR_OF_DAY, hh);
        c.set(Calendar.MINUTE, mm);
        c.set(Calendar.SECOND, ss);
        Date dtx = c.getTime();
        Log.d("DDDX", dtx.toString());
        return  dtx;
    }
    
    public static Date AddDaysToDate(Date dt,int days)
    {
    	Calendar c = Calendar.getInstance();
    	c.setTime(dt); // Now use today date.
    	c.add(Calendar.DATE, days); 
    	return  c.getTime();
    }
    public static Calendar GetCalendarDate(String dts)
    {
    	Calendar c = Calendar.getInstance();
    	c.setTime(OtaUtility.ConvertToDate(dts));
    	
    	return c;
    }
    
    public static Date AddTimeToDate(Date dt,int tt)
    {
    	Calendar c = Calendar.getInstance();
    	c.setTime(dt); // Now use today date.
    	c.add(Calendar.MINUTE, tt); 
    	return  c.getTime();
    }
    
    public static String CDateToStringDateTimeMYHMS(Date dt)
    {
      String st = "";
    	try {
    	    st = mysdt.format(dt) ;
      }
      catch(Exception ex)
      {
    	  ex.printStackTrace();
      }
    	return st;
    }
    
    public static Date ConvertToDate(String dt)
    {
       Date dtx = null;
       try 
       { 
    	   dtx = dff3.parse(dt);
       }
       catch(Exception ex)
       {
    	   ex.printStackTrace();
       }
       
       return dtx;
    }
    
    public static int LastDayOfMonth(Date dt)
    {
    	
    	Calendar c = Calendar.getInstance();
    	c.setTime(dt);
    	//c.set(Calendar.DAY_OF_MONTH, c.getActualMaximum(Calendar.DAY_OF_MONTH));
    	
    	return c.getActualMaximum(Calendar.DAY_OF_MONTH);
    }

    public static boolean isEmpty(String str) {
        return str == null || str.length() == 0;
    }

    public static String leftPad(String str, int size, char padChar) {
        if (str == null) {
            return null;
        }
        int pads = size - str.length();
        if (pads <= 0) {
            return str; // returns original String when possible
        }
        if (pads > PAD_LIMIT) {
            return leftPad(str, size, String.valueOf(padChar));
        }
        return padding(pads, padChar).concat(str);
    }

    public static String leftPad(String str, int size, String padStr) {
        if (str == null) {
            return null;
        }
        if (isEmpty(padStr)) {
            padStr = " ";
        }
        int padLen = padStr.length();
        int strLen = str.length();
        int pads = size - strLen;
        if (pads <= 0) {
            return str; // returns original String when possible
        }
        if (padLen == 1 && pads <= PAD_LIMIT) {
            return leftPad(str, size, padStr.charAt(0));
        }

        if (pads == padLen) {
            return padStr.concat(str);
        } else if (pads < padLen) {
            return padStr.substring(0, pads).concat(str);
        } else {
            char[] padding = new char[pads];
            char[] padChars = padStr.toCharArray();
            for (int i = 0; i < pads; i++) {
                padding[i] = padChars[i % padLen];
            }
            return new String(padding).concat(str);
        }
    }

    public static String rightPad(String str, int size, char padChar) {
        if (str == null) {
            return null;
        }
        int pads = size - str.length();
        if (pads <= 0) {
            return str; // returns original String when possible
        }
        if (pads > PAD_LIMIT) {
            return rightPad(str, size, String.valueOf(padChar));
        }
        return str.concat(padding(pads, padChar));
    }

    public static String rightPad(String str, int size, String padStr) {
        if (str == null) {
            return null;
        }
        if (isEmpty(padStr)) {
            padStr = " ";
        }
        int padLen = padStr.length();
        int strLen = str.length();
        int pads = size - strLen;
        if (pads <= 0) {
            return str; // returns original String when possible
        }
        if (padLen == 1 && pads <= PAD_LIMIT) {
            return rightPad(str, size, padStr.charAt(0));
        }

        if (pads == padLen) {
            return str.concat(padStr);
        } else if (pads < padLen) {
            return str.concat(padStr.substring(0, pads));
        } else {
            char[] padding = new char[pads];
            char[] padChars = padStr.toCharArray();
            for (int i = 0; i < pads; i++) {
                padding[i] = padChars[i % padLen];
            }
            return str.concat(new String(padding));
        }
    }

    private static String padding(int repeat, char padChar) throws IndexOutOfBoundsException {
        if (repeat < 0) {
            throw new IndexOutOfBoundsException("Cannot pad a negative amount: " + repeat);
        }
        final char[] buf = new char[repeat];
        for (int i = 0; i < buf.length; i++) {
            buf[i] = padChar;
        }
        return new String(buf);
    }

    public static String GetReferenceNo(String type) {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; //abcdefghijklmnopqrstuvwxyz0123456789";
        char[] stringChars = new char[7];

        int x = 0; //stringChars.length;
        for (int i = 0; i < 3; i++) //3
        {
            Random random = new Random();
            x = random.nextInt(chars.length());
            stringChars[i] = chars.charAt(x);
        }
        SimpleDateFormat isoSdf = new SimpleDateFormat("mmss");
        Date dt = new Date();

        for (int i = 3; i < 7; i++) //4
        {
            Random random = new Random();
            x = random.nextInt(9);
            stringChars[i] = chars.charAt(x);
        }


        String finalString = new String(stringChars) + isoSdf.format(dt);
        String refno = type + finalString;


        return refno;
    }
    
    

    public static String GetRefNumber(String type, int len) {

        String finalString = "";
        int x = 0;
        char[] stringChars = new char[len];
        for (int i = 0; i < len; i++) //4
        {
            Random random = new Random();
            x = random.nextInt(9);

            stringChars[i] = Integer.toString(x).toCharArray()[0];
        }


        finalString = new String(stringChars);
        finalString = type + finalString;
        return finalString.trim();
    }
    
    
    
    
    
    public static String GenerateRandomHEX(int l) {
    	char[] chars = new char[] { '0', '1', '2', '3', '4', '5',
    			'6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F' };
    	char[] stringChars = new char[l];
        int x = 0; //stringChars.length;
        for (int i = 0; i < l; i++) //3
        {
            Random random = new Random();
            x = random.nextInt(chars.length);
            stringChars[i] = chars[x];
        }
        return new String(stringChars); // stringChars.toString();
    }
    
    
    public static String GeneratePassword(int l) {
        String chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        char[] stringChars = new char[l];

        int x = 0; //stringChars.length;
        for (int i = 0; i < l; i++) //3
        {
            Random random = new Random();
            x = random.nextInt(chars.length());
            stringChars[i] = chars.charAt(x);
        }
        return new String(stringChars); // stringChars.toString();
    }
    
    public static String GeneratePINCode(int l) {
        String chars = "0123456789";
        char[] stringChars = new char[l];

        int x = 0; //stringChars.length;
        for (int i = 0; i < l; i++) //3
        {
            Random random = new Random();
            x = random.nextInt(chars.length());
            stringChars[i] = chars.charAt(x);
        }
        return new String(stringChars); // stringChars.toString();
    }
    
    public static String GenerateRandomTextNo(int l) {
        String chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        char[] stringChars = new char[l];

        int x = 0; //stringChars.length;
        for (int i = 0; i < l; i++) //3
        {
            Random random = new Random();
            x = random.nextInt(chars.length());
            stringChars[i] = chars.charAt(x);
        }
        return new String(stringChars); // stringChars.toString();
    }

    public static String GetISOAmount(double amt) {
        String amtx = "";
        amtx = BigDecimal.valueOf(amt ).setScale(0, RoundingMode.HALF_UP).toString();
        int x = amtx.indexOf(".");
        if (x > 0) {
            amtx = amtx.substring(0, x);
        }
        try {
            //amtx = ISOUtil.padleft(amtx, 12, '0');
        } catch (Exception ex) {
        }

        return amtx;
    }

    public static String GetUUID(String type) {

        String ref = type + "_" + java.util.UUID.randomUUID().toString();

        return  ref;
    }

       public static String GetRetrievalRefNo(String type) {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; //abcdefghijklmnopqrstuvwxyz0123456789";
        char[] stringChars = new char[7];

        int x = 0; //stringChars.length;
        for (int i = 0; i < 3; i++) //3
        {
            Random random = new Random();
            x = random.nextInt(chars.length());
            stringChars[i] = chars.charAt(x);
        }
        SimpleDateFormat isoSdf = new SimpleDateFormat("mmss");
        Date dt = new Date();

        for (int i = 3; i < 7; i++) //4
        {
            Random random = new Random();
            x = random.nextInt(9);
            stringChars[i] = chars.charAt(x);
        }


        String finalString = new String(stringChars) + isoSdf.format(dt);
        String refno = type + finalString;

        //if (ChargeEngineDAO.IsRetrievalRefNoExist(refno)) {
          //  return GetRetrievalRefNo(type);
       // }

        return refno;
    }

       public static String formatAmount(double d)
    {
          DecimalFormat df = new DecimalFormat("#,###.##");
          return df.format(d);
       }

    public static String GetStan() {

        String finalString = "";
        int x = 0;
        char[] stringChars = new char[6];
        for (int i = 0; i < 6; i++) //4
        {
            Random random = new Random();
            x = random.nextInt(9);

            stringChars[i] = Integer.toString(x).toCharArray()[0];
        }


        finalString = new String(stringChars);
        return finalString.trim();
    }
    
    public static String ReadFileAsString(String path) {
		String result = "";
		try {
			FileInputStream input = new FileInputStream(path);

			byte[] fileData = new byte[input.available()];

			input.read(fileData);
			input.close();

			result = new String(fileData, StandardCharsets.UTF_8);
		} catch (Exception ex) {
			//LoggingUtil.ExceptionInfo(ex);
		}
		return result;
	}
    
    public static String ConvertTo2DP(double amt)
	{
		
    	return new BigDecimal(amt).setScale(2,RoundingMode.HALF_UP).toString();
	}
    
    public static double ConvertTo2DPD(double amt)
   	{
   		
       	return new BigDecimal(amt).setScale(2,RoundingMode.HALF_UP).doubleValue();
   	}
    
    public static String ValidateMobileNo(String cty, String mobile)
	{
		
		String m = "";
		if(cty.equals("Ghana") || cty.equals("GHS") || cty.equals("GH"))
		{
			if(mobile.startsWith("0") && mobile.length() == 10)
			{
				return "233" + mobile.substring(1);
			}
			else if(mobile.startsWith("233") && mobile.length() == 12)
			{
				return mobile;
			}
		}
		else if(cty.equals("Nigeria") || cty.equals("NGN") || cty.equals("NG"))
		{
			if(mobile.startsWith("0") && mobile.length() == 11)
			{
				return "234" + mobile.substring(1);
			}
			else if(mobile.startsWith("234") && mobile.length() == 13)
			{
				return mobile;
			}
		}
		
		return m;
		
		
	}

    public static String[] tokenize(String input, String delim) {
        Vector v = new Vector();
        StringTokenizer t;
        //System.out.println("...TOKENIZE::" + input + "    " + delim);
        if (delim.equals("default")) {
            t = new StringTokenizer(input);
        } else {
            t = new StringTokenizer(input, delim);
        }
        for (; t.hasMoreTokens(); v.addElement(t.nextToken()));
        String[] cmd = new String[v.size()];
        for (int i = 0; i < cmd.length; i++) {
            cmd[i] = (String) v.elementAt(i);
            //System.out.println("...TOKENIZE CMD::" + cmd[i]);
        }

        return cmd;
    }
    
    
    public static String ValidateMobileNo2(String phoneCode, String mobile,int phoneLen)
	{
		
		String m = "";
		if(mobile.startsWith(phoneCode))
		{
			m = mobile;
		}
		else if(m.startsWith("0") && mobile.length() == phoneLen)
			m = phoneCode + mobile.substring(1);
		else
			m = "";
		
		return m;
		
		
	}
    
    
    
    
    public static String CRC16Check(String str)
    {
    	String scrc ="";
    	int[] table = {
    			0x0000, 0xC0C1, 0xC181, 0x0140, 0xC301, 0x03C0, 0x0280, 0xC241,
    			0xC601, 0x06C0, 0x0780, 0xC741, 0x0500, 0xC5C1, 0xC481, 0x0440,
    			0xCC01, 0x0CC0, 0x0D80, 0xCD41, 0x0F00, 0xCFC1, 0xCE81, 0x0E40,
    			0x0A00, 0xCAC1, 0xCB81, 0x0B40, 0xC901, 0x09C0, 0x0880, 0xC841,
    			0xD801, 0x18C0, 0x1980, 0xD941, 0x1B00, 0xDBC1, 0xDA81, 0x1A40,
    			0x1E00, 0xDEC1, 0xDF81, 0x1F40, 0xDD01, 0x1DC0, 0x1C80, 0xDC41,
    			0x1400, 0xD4C1, 0xD581, 0x1540, 0xD701, 0x17C0, 0x1680, 0xD641,
    			0xD201, 0x12C0, 0x1380, 0xD341, 0x1100, 0xD1C1, 0xD081, 0x1040,
    			0xF001, 0x30C0, 0x3180, 0xF141, 0x3300, 0xF3C1, 0xF281, 0x3240,
    			0x3600, 0xF6C1, 0xF781, 0x3740, 0xF501, 0x35C0, 0x3480, 0xF441,
    			0x3C00, 0xFCC1, 0xFD81, 0x3D40, 0xFF01, 0x3FC0, 0x3E80, 0xFE41,
    			0xFA01, 0x3AC0, 0x3B80, 0xFB41, 0x3900, 0xF9C1, 0xF881, 0x3840,
    			0x2800, 0xE8C1, 0xE981, 0x2940, 0xEB01, 0x2BC0, 0x2A80, 0xEA41,
    			0xEE01, 0x2EC0, 0x2F80, 0xEF41, 0x2D00, 0xEDC1, 0xEC81, 0x2C40,
    			0xE401, 0x24C0, 0x2580, 0xE541, 0x2700, 0xE7C1, 0xE681, 0x2640,
    			0x2200, 0xE2C1, 0xE381, 0x2340, 0xE101, 0x21C0, 0x2080, 0xE041,
    			0xA001, 0x60C0, 0x6180, 0xA141, 0x6300, 0xA3C1, 0xA281, 0x6240,
    			0x6600, 0xA6C1, 0xA781, 0x6740, 0xA501, 0x65C0, 0x6480, 0xA441,
    			0x6C00, 0xACC1, 0xAD81, 0x6D40, 0xAF01, 0x6FC0, 0x6E80, 0xAE41,
    			0xAA01, 0x6AC0, 0x6B80, 0xAB41, 0x6900, 0xA9C1, 0xA881, 0x6840,
    			0x7800, 0xB8C1, 0xB981, 0x7940, 0xBB01, 0x7BC0, 0x7A80, 0xBA41,
    			0xBE01, 0x7EC0, 0x7F80, 0xBF41, 0x7D00, 0xBDC1, 0xBC81, 0x7C40,
    			0xB401, 0x74C0, 0x7580, 0xB541, 0x7700, 0xB7C1, 0xB681, 0x7640,
    			0x7200, 0xB2C1, 0xB381, 0x7340, 0xB101, 0x71C0, 0x7080, 0xB041,
    			0x5000, 0x90C1, 0x9181, 0x5140, 0x9301, 0x53C0, 0x5280, 0x9241,
    			0x9601, 0x56C0, 0x5780, 0x9741, 0x5500, 0x95C1, 0x9481, 0x5440,
    			0x9C01, 0x5CC0, 0x5D80, 0x9D41, 0x5F00, 0x9FC1, 0x9E81, 0x5E40,
    			0x5A00, 0x9AC1, 0x9B81, 0x5B40, 0x9901, 0x59C0, 0x5880, 0x9841,
    			0x8801, 0x48C0, 0x4980, 0x8941, 0x4B00, 0x8BC1, 0x8A81, 0x4A40,
    			0x4E00, 0x8EC1, 0x8F81, 0x4F40, 0x8D01, 0x4DC0, 0x4C80, 0x8C41,
    			0x4400, 0x84C1, 0x8581, 0x4540, 0x8701, 0x47C0, 0x4680, 0x8641,
    			0x8201, 0x42C0, 0x4380, 0x8341, 0x4100, 0x81C1, 0x8081, 0x4040,
    	};


    	byte[] bytes = str.getBytes();
    	int crc = 0x0000;
    	for (byte b : bytes) {
    		crc = (crc >>> 8) ^ table[(crc ^ b) & 0xff];
    	}

    	scrc = Integer.toHexString(crc);

    	return scrc;

    }
    

}
