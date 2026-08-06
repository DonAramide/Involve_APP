package com.vanstone.trans.tools;

import android.content.Context;
import android.util.Log;

import com.connectpoint.cpointpay.dao.AppDatabase;
import com.connectpoint.cpointpay.dao.ParamInfo;
import com.connectpoint.cpointpay.info.TermParamInfo;
import com.connectpoint.cpointpay.model.TranNetInfo;
import com.connectpoint.cpointpay.utils.OtaUtility;
import com.connectpoint.cpointpay.utils.SecurityUtil;

import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;
import java.util.StringTokenizer;
import java.util.Vector;


import org.apache.commons.codec.binary.Hex;
import org.jpos.core.VolatileSequencer;
import org.jpos.iso.ISODate;
import org.jpos.iso.ISOField;
import org.jpos.iso.ISOMsg;
import org.jpos.iso.ISOUtil;
import org.jpos.iso.channel.PostChannel;
import org.jpos.iso.packager.GenericPackager;
import org.jpos.tlv.TLVList;
import org.jpos.util.LogSource;
import org.jpos.util.SimpleLogListener;



public class IsoMessageClient {
	
   AppDatabase appDatabase;

    Properties props = null;

    PostChannel channel = null;

    public static final String TAG = IsoMessageClient.class.getSimpleName();

//ISOMUX mux = null;

    org.jpos.util.Logger logger = new org.jpos.util.Logger();
    VolatileSequencer seq = new VolatileSequencer();


	public ISOMsg getNetworkMgtRequestRubies(String keyType, String terminalId)
	{
		return getNetworkMgtRequestRubies( keyType,  terminalId,"");
	}
    public ISOMsg getNetworkMgtRequestRubies(String keyType, String terminalId,String ptsp) {
        Date d = new Date();
       // logger.info("Create Network Request ");
         ISOMsg m = new ISOMsg();
        try {

        	m.setPackager(new PosPackager());
            m.setMTI("0800");

            String bitmap = "1";
            m.set(3,  keyType + "0000");
            Date date = new Date();
            String DATE_FORMAT = "MMddHHmmss"; //""MMdd-yyyy hh:mm:ss";
            SimpleDateFormat sdf = new SimpleDateFormat(DATE_FORMAT);
            String dx = sdf.format(date);
            System.out.println("Today is " + dx);
            m.set(7, dx);  //"0327133744");  //MMDDhhmmss
			m.set(11, OtaUtility.GetRefNumber("",6));
           // m.set(new ISOField(11,
                   // ISOUtil.zeropad(new Integer(seq.get("traceno")).toString(), 6)));
            m.set(new ISOField(12, ISODate.getTime(d)));
            m.set(new ISOField(13, ISODate.getDate(d)));
			if(ptsp.equals("NETOP"))
				m.set(32,"100001");
            m.set(41,  terminalId);

        } catch (Exception ex) {
            ex.printStackTrace();
        }
        return m;
    }

	public ISOMsg getNetworkMgtRequestRubies2(String keyType, ISOMsg m2) {
		Date d = new Date();
		// logger.info("Create Network Request ");
		ISOMsg m = new ISOMsg();
		try {

			m.setPackager(new PosPackager());
			m.setMTI("0800");

			String bitmap = "1";
			m.set(3,  keyType + "0000");
			Date date = new Date();
			String DATE_FORMAT = "MMddHHmmss"; //""MMdd-yyyy hh:mm:ss";
			SimpleDateFormat sdf = new SimpleDateFormat(DATE_FORMAT);
			String dx = sdf.format(date);
			System.out.println("Today is " + dx);
			m.set(7, m2.getString(7));  //"0327133744");  //MMDDhhmmss
			m.set(11, m2.getString(11)) ; //new ISOField(11,
					//ISOUtil.zeropad(new Integer(seq.get("traceno")).toString(), 6)));
			m.set(12, m2.getString(12)); // //new ISOField(12, ISODate.getTime(d)));
			m.set(13, m2.getString(13));  //new ISOField(13, ISODate.getDate(d)));
			m.set(41, m2.getString(41)); //  terminalId); //"2HIG0106"); //"20390004"); // "2HIG0106"); //"2HIG0004");

		} catch (Exception ex) {
			ex.printStackTrace();
		}
		return m;
	}
    
    public ISOMsg getNetworkMgtRequestRubiesParamDownload(String keyType,String terminalId) {
        Date d = new Date();
       // logger.info("Create Network Request ");
         ISOMsg m = new ISOMsg();
        try {

            m.setMTI("0800");

            String bitmap = "1";
            m.set(3,  keyType + "0000");
            Date date = new Date();
            String DATE_FORMAT = "MMddHHmmss"; //""MMdd-yyyy hh:mm:ss";
            SimpleDateFormat sdf = new SimpleDateFormat(DATE_FORMAT);
            String dx = sdf.format(date);
            System.out.println("Today is " + dx);
            m.set(7, dx);  //"0327133744");  //MMDDhhmmss
            m.set(new ISOField(11,
                    ISOUtil.zeropad(Integer.toString(seq.get("traceno")), 6)));
            m.set(new ISOField(12, ISODate.getTime(d)));
            m.set(new ISOField(13, ISODate.getDate(d)));
            m.set(41,  terminalId); //"2HIG0106"); //"20390004"); // "2HIG0106"); //"2HIG0004");
            //m.set(70, "101");
            //m.set(100, "00100100133");

            // m.unset(3);
            //int charge = 100;
            //m.set(28,"D00000" + charge); //Tranction Fee Charge
        } catch (Exception ex) {
            ex.printStackTrace();
        }
        return m;
    }


    public void  SendISOPurchase(ISOMsg m,String eid)

	{

		

		try

		{

               // "3.81.182.81"; //
			//7900; //
			//30000; //
			 String serverIP = "";
             int port = 0;
             int timeout =  0;
			logger.addListener(new SimpleLogListener(System.out));
            //channel = new PostChannel(serverIP, port, new PostPackager()); // PosPackager());   //ISO87APackager());

			//String xml = "C:\\JAVA\\jpos-1.7.0\\jpos-1.7.0\\cfg\\packager\\iso87ascii.xml";

            channel = new PostChannel(serverIP, port,new PosPackager()); // new GenericPackager("C:\\JAVA\\jpos-1.7.0\\jpos-1.7.0\\cfg\\packager\\postpack.xml")); // PosPackager());   //ISO87APackager());
           // channel = new PostChannel(serverIP, port,new GenericPackager(xml)); 
            
            //mux = new ISOMUX(channel);

            ((LogSource) channel).setLogger(logger, "channel");

            //mux.setLogger(logger, "mux");

            System.out.println("ISo-Connect 1");

            if (!channel.isConnected()) {

                channel.connect();
                System.out.println("ISo-Connect 2");

            }

            VolatileSequencer seq = new VolatileSequencer();

            if ( channel.isConnected()) {

            	System.out.println("ISo-Connect 3");

            	
		    		
		    		channel.send(m);
		    		System.out.println("ISo-Connect 33 " + timeout);

	                channel.setTimeout(timeout * 1000);

	                ISOMsg response = channel.receive();   //  req.getResponse(isoTimeOut);
	                channel.disconnect();

	                if(response != null)
	                {
	                	
	                	
	                	System.out.println("ISo-Connect Response " + response.getString(39));
	                	String rspCode = response.getString(39);
	                	String authCode  = OtaUtility.GetRefNumber("", 6).trim();
	                	if(response.hasField(38))
	                	  authCode = response.getString(38);
	                	
	                	String refNo = "CAWI" + response.getString(37) + response.getString(11);
	                	System.out.println("ISo-Connect 33 " + refNo);

	                }

		    		
            }

			

		}

		catch(Exception ex)

		{

			ex.printStackTrace();

		}

		

		

	}

	public void  SendISOmessage(String eid,String terminalId, String serverIP,int port, String key1, String key2)
	{

		try
		{


            int timeout = 0;
            
			logger.addListener(new SimpleLogListener(System.out));

            channel = new PostChannel(serverIP, port,new PosPackager());

            ((LogSource) channel).setLogger(logger, "channel");

             System.out.println("ISo-Connect 1");

            if (!channel.isConnected()) {

                channel.connect();
                System.out.println("ISo-Connect 2");

            }

            VolatileSequencer seq = new VolatileSequencer();
            

            String tpke ="";

            if ( channel.isConnected()) {

            	System.out.println("ISo-Connect 3");

            	ISOMsg m = getNetworkMgtRequestRubies("9A",terminalId);
		    		
		    		channel.send(m);
		    		System.out.println("ISo-Connect 33 " + timeout);

	                channel.setTimeout(timeout * 1000);

	                ISOMsg response = channel.receive();   //  req.getResponse(isoTimeOut);

	                if(response != null)
	                {
	                	System.out.println("ISo-Connect Response " + response.getString(39));
	                	String f53 = response.getString(53);
	                	String tpk ="";
	                	 String zmk = ISOUtil.hexor(key1,key2);
	                	 
	                	String tmk = PinBlockEncryptionUtil.DecryptSessionKey(zmk,f53);
	                	System.out.println("ISo-TMK " + tmk);
	                	
	                	m = getNetworkMgtRequestRubies("9B",terminalId);
			    		String tsk ="";
			    		channel.send(m);
			    		 ISOMsg response2 = channel.receive(); 
			    		 if(response2 != null)
			    		 {
			    			 f53 = response2.getString(53);	
			    			  tsk = PinBlockEncryptionUtil.DecryptSessionKey(tmk,f53);
			                System.out.println("ISo-TSK " + tsk);
			    		 }
			    		 
			    		 
			    		 m = getNetworkMgtRequestRubies("9G",terminalId);
				    		
				    		channel.send(m);
				    		 ISOMsg response3 = channel.receive(); 
				    		 if(response3 != null)
				    		 {
				    			 f53 = response3.getString(53);
				    			 tpke = f53;
						    	 tpk = PinBlockEncryptionUtil.DecryptSessionKey(tmk,f53);
				                System.out.println("ISo-TPK " + tpk);
				    		 }
				    		 

				    		 m = getNetworkMgtRequestRubies("9C",terminalId);
				    		 m.set(64, new String(new byte[]{0x0}));
				    		 
				    		 String f64 = generateHashForIsoMsg(m, tsk);
				    		 m.set(64, f64);
				    		 
					    		String f62 ="";
					    		
					    		String cardAcceptorId = "";
					    		String cardAcceptorLocation = "";
						    	String merchantType = "";
						    	String currencyCode = "";
					    		channel.send(m);
					    		 ISOMsg response4 = channel.receive(); 
					    		 if(response4 != null)
					    		 {
					    			 f62 = response4.getString(62);
							    	//String tpk = PinBlockEncryptionUtil.DecryptSessionKey(tmk,f53);
					               // System.out.println("ISo-TPK " + tpk);
					    			 
					    			 Map<String, String> decodedParameters = parseParameters(f62);
					    			 cardAcceptorId = decodedParameters.get("03");
					    			  cardAcceptorLocation = decodedParameters.get("52");
					    			   merchantType = decodedParameters.get("08");
					    			    currencyCode = decodedParameters.get("05");
					    			    
					    			    System.out.println(" Card acceptor Id: " + cardAcceptorId);
					    			    System.out.println(" Card acceptor Location: " + cardAcceptorLocation);
					    			    System.out.println(" Merchant Type: " + merchantType);
					    			    System.out.println(" currencyCode: " + currencyCode);
					    			    
					    		 }
				    		     String action = "U";
					    		/* BkTermParam termInfo = agNetJPA.GetTerminalParamInfo(eid, terminalId);
                                 if(termInfo == null)
                                 {
					    		    termInfo = new BkTermParam();
					    		    termInfo.setId("0");
					    		    termInfo.setStatus("Active");
					    		    termInfo.setBank("");
					    		    termInfo.setAndroid_Id("");
						    		termInfo.setUsername("");
					    		    action = "S";
                                 }
					    		 termInfo.setTerminal_Id(terminalId);
					    		 termInfo.setCard_Acceptor_Id(cardAcceptorId);
					    		 termInfo.setCardAcceptor_Location(cardAcceptorLocation);
					    		 termInfo.setEntity_Id(new BigInteger(eid));
					    		 
					    		 termInfo.setIso_Ccy_Code(currencyCode);
					    		 termInfo.setMerchant_Type(merchantType);
					    		 termInfo.setTmk(tmk);
					    		 termInfo.setTpk(tpke);
					    		 termInfo.setTsk(tsk);
					    		 termInfo.setZmk(zmk);
					    		 agNetJPA.SaveEntity(termInfo, action);*/
					    		String json = terminalId + "|" + tmk + "|" + tpke + "|" + tsk + "|" + zmk + "|" + cardAcceptorId;
					    		json = SecurityUtil.encrypt(json,"");
					    String category = "TERMINAL_KEY";
						ParamInfo pInfo = appDatabase.userProfileDAO().getParamInfo(category) ;
						if(pInfo == null)
						{
							pInfo = new ParamInfo();
							pInfo.setCode(category);
							pInfo.setName(json);
							pInfo.setLastUpdate(new Date());
							appDatabase.userProfileDAO().saveParamInfo(pInfo);
						}
						else
						{
							pInfo.setName(json);
							pInfo.setLastUpdate(new Date());
							appDatabase.userProfileDAO().updateParamInfo(pInfo);
						}
				    		
	                	
	                }

             channel.disconnect();

            }

			

		}

		catch(Exception ex)

		{

			ex.printStackTrace();

		}

		

		

	}



	public ISOMsg CreatePurchaseMessage2Upsl(TranNetInfo tInfoc, TermParamInfo tparams, int retry) { //, String posAccountUpsl) {
		Date d = new Date();

		ISOMsg m = new ISOMsg();
		try {

			String mobileNo = tInfoc.getMobileNo();
			m.setMTI("0100" );//"0200");

			//String cdx = cardNo + "|" + cardName + "|" + expDate + "|" + track2 + "|" + track1|tlv;
			//tranInfo.setBillRefNo(cdx);
			//XStream xs = new XStream();
			//LoggingUtil.DebugInfo("XML:: " + xs.toXML(tInfoc));



			String[] cds = OtaUtility.tokenize(tInfoc.getBillRefNo(), "|");


			//String[] cds = tokenize(tInfo.getCardData(), "|");
			String pan =  cds[0]; // ""; // "";
			//String pin = "";
			String track2Data =  cds[3]; // "";
			String field55 = cds[4];
			String field23 = cds[5];
			String accType = cds[6];
			String accx = "00";
			if(accType.equals("1"))
				accx ="20";
			else if(accType.equals("2"))
				accx ="10";
			else if(accType.equals("3"))
				accx ="30";
			field23 = ISOUtil.padleft(field23, 3, '0');
			String tData2 = OtaUtility.tokenize(track2Data, "=")[1];
			String expDate = tData2.substring(0,4);
			String serviceCode =tData2.substring(4,7);

			String track2Data2 = track2Data; // + "10";//
			track2Data2 = track2Data2.replace("&#0;", "").trim();
			if(track2Data2.length() > 37)
				track2Data2 = track2Data2.substring(0,37);
			//Settings.tokenize(track2Data, "=")[0] + "=" + expDate + serviceCode ;

			double amt = tInfoc.getAmount();



			String tsk = tparams.getTsk2();// tparams[3];  //termInfo.getTsk();
			//String serverIP = tparams[6];
			//int port = Integer.parseInt(tparams[7]);
			String terminalId = tparams.getTerminalId(); // tparams[0];
			String cardAcceptorId = tparams.getCardAcceptorId(); // tparams[5];
			String cardAcceptorLocation = tparams.getCardAcceptionLocation();// tparams[8];

			String rrn = tInfoc.getExternalRefNo().substring(0,12);
			String stan = tInfoc.getExternalRefNo().substring(12);

			String pinBlock = tInfoc.getCardData(); // PinBlockEncryptionUtil.GenerateISO0Format0PinBlock(pan, pin);

			m.set(2, pan);
			//m.set(3, "001000");
			//m.set(3, "010000"); //added for UPSL
			m.set(3, "310000");
			//010000
			//m.set(3, "00" + accx + "00");  //Purchase

			//m.set(3, "01" + accx + "00");  //Cash Advance
			//m.set(3, "09" + accx + "00");  //Purchase with Cash back
			//m.set(3, "20" + accx + "00");  //Refund

			//m.set(3, "00" + accx + "00");
			Long amts = new BigDecimal(amt * 100).longValue();
			String amt3 = ISOUtil.padleft(Long.toString(amts), 12, '0');
//			m.set(4, amt3);

			Date date = new Date();
			String DATE_FORMAT = "MMddHHmmss"; //""MMdd-yyyy hh:mm:ss";
			SimpleDateFormat sdf = new SimpleDateFormat(DATE_FORMAT);
			String dx = sdf.format(date);
			System.out.println("Today is " + dx);
			m.set(7, dx);  //"0327133744");  //MMDDhhmmss
			m.set(11, stan); //new ISOField(11,
			// ISOUtil.zeropad(new Integer(seq.get("traceno")).toString(), 6)));
			m.set(new ISOField(12, ISODate.getTime(d)));
			m.set(new ISOField(13, ISODate.getDate(d)));
			m.set(14,expDate);
			//m.set(new ISOField(15, ISODate.getDate(d)));
			m.set(18, "5999");//"6010");// 4");
			m.set(22, "051");
			m.set(23, field23); //"001");
			m.set(25, "00");
			//m.set(26, "04"); //"06");
			m.set(26, "06"); // Set Offline PIN
			m.set(28, "C00000000");
			m.set(32,  "111129"); //  "111111");
			//track2Data = track2Data.replace('=', 'D');
			m.set(35,  track2Data2); // track2Data); //pan +  "=" + expDate + "226" +  "19123451");
			m.set(37, rrn);
			m.set(40, serviceCode) ;//"601"); // "221");
			m.set(41,  terminalId) ; // "2HIG0106");
			m.set(42,  cardAcceptorId) ;// "2HIGP010000P010");
			m.set(43,  cardAcceptorLocation) ; // "2HIGP010 PHLEX LAGOS                LANG");
			m.set(49, "566");
			//byte[] pinBytes  = ISOUtil.hex2byte(pinBlock);
			if(pinBlock.length() > 16)
				pinBlock = pinBlock.substring(0,16);
			if(retry > 0)
				m.set(52,pinBlock); // pinBytes);

			m.set(55,field55);
			//String f60 = "010085C24300148041Meter Number=12.87001001.Acct=1234567890.Phone=" + mobileNo;
			String posAccountUpsl = tparams.getPoolAccount();
			if(posAccountUpsl == null || posAccountUpsl.equals(""))
				posAccountUpsl ="1234567890";

			//posAccountUpsl = "1774691015";

			String f60 = "010085C24300148041Meter Number=12.87001004.Acct=" + posAccountUpsl + ".Phone=" + mobileNo;
			//	String f60 = "010085C24300148041Meter Number=12.87001003.Acct=1234567890.Phone=" + mobileNo;
//			m.set(60, f60);
			//	m.set(62,"00698WD0101333" + mobileNo);
			m.set(98, "87001501");
//			m.set(100, "506180");
//
//			 m.set(103,"0001189745");
			m.set(123, "510101210244101");

//			m.set(128, new String(new byte[]{0x0}));

			String f128 = generateHashForIsoMsg2(m, tsk);
			Log.d(TAG, "hash value "+f128);
			Log.d(TAG, "tsk "+tsk);
			Log.d(TAG, "pck "+ m.getComposite().getBytes());
			m.set(128, "");


		} catch (Exception ex) {
			ex.printStackTrace();
		}
		return m;
	}





	public ISOMsg  CreatePurchaseMessageCheckBalance(TranNetInfo tInfoc, TermParamInfo tparams,int retry) { //, String posAccountUpsl) {
		Date d = new Date();

		ISOMsg m = new ISOMsg();
		try {

			String mobileNo = tInfoc.getMobileNo();
			m.setMTI("0100" );//"0200");

			//String cdx = cardNo + "|" + cardName + "|" + expDate + "|" + track2 + "|" + track1|tlv;
			//tranInfo.setBillRefNo(cdx);
			//XStream xs = new XStream();
			//LoggingUtil.DebugInfo("XML:: " + xs.toXML(tInfoc));



			String[] cds = OtaUtility.tokenize(tInfoc.getBillRefNo(), "|");


			//String[] cds = tokenize(tInfo.getCardData(), "|");
			String pan =  cds[0]; // ""; // "";
			//String pin = "";
			String track2Data =  cds[3]; // "";
			String field55 = cds[4];
			String field23 = cds[5];
			String accType = cds[6];
			String accx = "00";
			if(accType.equals("1"))
				accx ="20";
			else if(accType.equals("2"))
				accx ="10";
			else if(accType.equals("3"))
				accx ="30";
			field23 = ISOUtil.padleft(field23, 3, '0');
			String tData2 = OtaUtility.tokenize(track2Data, "=")[1];
			String expDate = tData2.substring(0,4);
			String serviceCode =tData2.substring(4,7);

			String track2Data2 = track2Data; // + "10";//
			track2Data2 = track2Data2.replace("&#0;", "").trim();
			if(track2Data2.length() > 37)
				track2Data2 = track2Data2.substring(0,37);
			//Settings.tokenize(track2Data, "=")[0] + "=" + expDate + serviceCode ;

			double amt = tInfoc.getAmount();



			String tsk = tparams.getTsk();// tparams[3];  //termInfo.getTsk();
			//String serverIP = tparams[6];
			//int port = Integer.parseInt(tparams[7]);
			String terminalId = tparams.getTerminalId(); // tparams[0];
			String cardAcceptorId = tparams.getCardAcceptorId(); // tparams[5];
			String cardAcceptorLocation = tparams.getCardAcceptionLocation();// tparams[8];

			String rrn = tInfoc.getExternalRefNo().substring(0,12);
			String stan = tInfoc.getExternalRefNo().substring(12);

			String pinBlock = tInfoc.getCardData(); // PinBlockEncryptionUtil.GenerateISO0Format0PinBlock(pan, pin);

			m.set(2, pan);
			//m.set(3, "001000");
			//m.set(3, "010000"); //added for UPSL
			m.set(3, "310000");
			//010000
			//m.set(3, "00" + accx + "00");  //Purchase

			//m.set(3, "01" + accx + "00");  //Cash Advance
			//m.set(3, "09" + accx + "00");  //Purchase with Cash back
			//m.set(3, "20" + accx + "00");  //Refund

			//m.set(3, "00" + accx + "00");
			Long amts = new BigDecimal(amt * 100).longValue();
			String amt3 = ISOUtil.padleft(Long.toString(amts), 12, '0');
			m.set(4, amt3);

			Date date = new Date();
			String DATE_FORMAT = "MMddHHmmss"; //""MMdd-yyyy hh:mm:ss";
			SimpleDateFormat sdf = new SimpleDateFormat(DATE_FORMAT);
			String dx = sdf.format(date);
			System.out.println("Today is " + dx);
			m.set(7, dx);  //"0327133744");  //MMDDhhmmss
			m.set(11, stan); //new ISOField(11,
			// ISOUtil.zeropad(new Integer(seq.get("traceno")).toString(), 6)));
			m.set(new ISOField(12, ISODate.getTime(d)));
			m.set(new ISOField(13, ISODate.getDate(d)));
			m.set(14,expDate);
			//m.set(new ISOField(15, ISODate.getDate(d)));
			m.set(18, "6010");// 4");
			m.set(22, "051");
			m.set(23, field23); //"001");
			m.set(25, "00");
			//m.set(26, "04"); //"06");
			m.set(26, "06"); // Set Offline PIN
			m.set(28, "C00000000");
			m.set(32,  "111129"); //  "111111");
			//track2Data = track2Data.replace('=', 'D');
			m.set(35,  track2Data2); // track2Data); //pan +  "=" + expDate + "226" +  "19123451");
			m.set(37, rrn);
			m.set(40, serviceCode) ;//"601"); // "221");
			m.set(41,  terminalId) ; // "2HIG0106");
			m.set(42,  cardAcceptorId) ;// "2HIGP010000P010");
			m.set(43,  cardAcceptorLocation) ; // "2HIGP010 PHLEX LAGOS                LANG");
			m.set(49, "566");
			//byte[] pinBytes  = ISOUtil.hex2byte(pinBlock);
			if(pinBlock.length() > 16)
				pinBlock = pinBlock.substring(0,16);
			if(retry > 0)
				m.set(52,pinBlock); // pinBytes);

			m.set(55,field55);
			//String f60 = "010085C24300148041Meter Number=12.87001001.Acct=1234567890.Phone=" + mobileNo;
			String posAccountUpsl = tparams.getPoolAccount();
			if(posAccountUpsl == null || posAccountUpsl.equals(""))
				posAccountUpsl ="1234567890";

			//posAccountUpsl = "1774691015";

			String f60 = "010085C24300148041Meter Number=12.87001004.Acct=" + posAccountUpsl + ".Phone=" + mobileNo;
			//	String f60 = "010085C24300148041Meter Number=12.87001003.Acct=1234567890.Phone=" + mobileNo;
			m.set(60, f60);
			//	m.set(62,"00698WD0101333" + mobileNo);
			//m.set(98, "High   Street   MFB      ");
			//m.set(100, "506180");

			// m.set(103,"0001189745");
			m.set(123, "510101513344101");

			m.set(128, new String(new byte[]{0x0}));

			String f128 = generateHashForIsoMsg(m, tsk);
			m.set(128, f128);

		} catch (Exception ex) {
			ex.printStackTrace();
		}
		return m;
	}


	public ISOMsg CreatePurchaseMessageBlanceCheeckingUPSL(TranNetInfo tInfoc, TermParamInfo tparams, int retry) { //, String posAccountUpsl) {
		Date d = new Date();

		ISOMsg m = new ISOMsg();
		try {

			String mobileNo = tInfoc.getMobileNo();
			m.setMTI("0100" );//"0200");

			//String cdx = cardNo + "|" + cardName + "|" + expDate + "|" + track2 + "|" + track1|tlv;
			//tranInfo.setBillRefNo(cdx);
			//XStream xs = new XStream();
			//LoggingUtil.DebugInfo("XML:: " + xs.toXML(tInfoc));



			String[] cds = OtaUtility.tokenize(tInfoc.getBillRefNo(), "|");


			//String[] cds = tokenize(tInfo.getCardData(), "|");
			String pan =  cds[0]; // ""; // "";
			//String pin = "";
			String track2Data =  cds[3]; // "";
			String field55 = cds[4];
			String field23 = cds[5];
			String accType = cds[6];
			String accx = "00";
			if(accType.equals("1"))
				accx ="20";
			else if(accType.equals("2"))
				accx ="10";
			else if(accType.equals("3"))
				accx ="30";
			field23 = ISOUtil.padleft(field23, 3, '0');
			String tData2 = OtaUtility.tokenize(track2Data, "=")[1];
			String expDate = tData2.substring(0,4);
			String serviceCode =tData2.substring(4,7);

			String track2Data2 = track2Data; // + "10";//
			track2Data2 = track2Data2.replace("&#0;", "").trim();
			if(track2Data2.length() > 37)
				track2Data2 = track2Data2.substring(0,37);
			//Settings.tokenize(track2Data, "=")[0] + "=" + expDate + serviceCode ;

			double amt = tInfoc.getAmount();



			String tsk = tparams.getTsk2();// tparams[3];  //termInfo.getTsk();
			//String serverIP = tparams[6];
			//int port = Integer.parseInt(tparams[7]);
			String terminalId = tparams.getTerminalId(); // tparams[0];
			String cardAcceptorId = tparams.getCardAcceptorId(); // tparams[5];
			String cardAcceptorLocation = tparams.getCardAcceptionLocation();// tparams[8];

			String rrn = tInfoc.getExternalRefNo().substring(0,12);
			String stan = tInfoc.getExternalRefNo().substring(12);

			String pinBlock = tInfoc.getCardData(); // PinBlockEncryptionUtil.GenerateISO0Format0PinBlock(pan, pin);

			m.set(2, pan);
			//m.set(3, "001000");
			//m.set(3, "010000"); //added for UPSL
			m.set(3, "310000");
			//010000
			//m.set(3, "00" + accx + "00");  //Purchase

			//m.set(3, "01" + accx + "00");  //Cash Advance
			//m.set(3, "09" + accx + "00");  //Purchase with Cash back
			//m.set(3, "20" + accx + "00");  //Refund

			//m.set(3, "00" + accx + "00");
			Long amts = new BigDecimal(amt * 100).longValue();
			String amt3 = ISOUtil.padleft(Long.toString(amts), 12, '0');
//			m.set(4, amt3);

			Date date = new Date();
			String DATE_FORMAT = "MMddHHmmss"; //""MMdd-yyyy hh:mm:ss";
			SimpleDateFormat sdf = new SimpleDateFormat(DATE_FORMAT);
			String dx = sdf.format(date);
			System.out.println("Today is " + dx);
			m.set(7, dx);  //"0327133744");  //MMDDhhmmss
			m.set(11, stan); //new ISOField(11,
			// ISOUtil.zeropad(new Integer(seq.get("traceno")).toString(), 6)));
			m.set(new ISOField(12, ISODate.getTime(d)));
			m.set(new ISOField(13, ISODate.getDate(d)));
			m.set(14,expDate);
			//m.set(new ISOField(15, ISODate.getDate(d)));
			m.set(18, "5999");//"6010");// 4");
			m.set(22, "051");
			m.set(23, field23); //"001");
			m.set(25, "00");
			//m.set(26, "04"); //"06");
			m.set(26, "06"); // Set Offline PIN
			m.set(28, "C00000000");
			m.set(32,  "111129"); //  "111111");
			//track2Data = track2Data.replace('=', 'D');
			m.set(35,  track2Data2); // track2Data); //pan +  "=" + expDate + "226" +  "19123451");
			m.set(37, rrn);
			m.set(40, serviceCode) ;//"601"); // "221");
			m.set(41,  terminalId) ; // "2HIG0106");
			m.set(42,  cardAcceptorId) ;// "2HIGP010000P010");
			m.set(43,  cardAcceptorLocation) ; // "2HIGP010 PHLEX LAGOS                LANG");
			m.set(49, "566");
			//byte[] pinBytes  = ISOUtil.hex2byte(pinBlock);
			if(pinBlock.length() > 16)
				pinBlock = pinBlock.substring(0,16);
			if(retry > 0)
				m.set(52,pinBlock); // pinBytes);

			m.set(55,field55);
			//String f60 = "010085C24300148041Meter Number=12.87001001.Acct=1234567890.Phone=" + mobileNo;
			String posAccountUpsl = tparams.getPoolAccount();
			if(posAccountUpsl == null || posAccountUpsl.equals(""))
				posAccountUpsl ="1234567890";

			//posAccountUpsl = "1774691015";

			String f60 = "010085C24300148041Meter Number=12.87001004.Acct=" + posAccountUpsl + ".Phone=" + mobileNo;
			//	String f60 = "010085C24300148041Meter Number=12.87001003.Acct=1234567890.Phone=" + mobileNo;
//			m.set(60, f60);
			//	m.set(62,"00698WD0101333" + mobileNo);
//			m.set(98, "87001501");
//			m.set(100, "506180");
//
//			 m.set(103,"0001189745");
			m.set(123, "510101210244101");

//			m.set(128, new String(new byte[]{0x0}));

			String f128 = generateHashForIsoMsg2(m, tsk);
			Log.d(TAG, "hash value "+f128);
			Log.d(TAG, "tsk "+tsk);
			Log.d(TAG, "pck "+ m.getComposite().getBytes());
			m.set(128, "");


		} catch (Exception ex) {
			ex.printStackTrace();
		}
		return m;
	}


	public ISOMsg CreatePurchaseMessageBlanceCheeckingREscMainn(TranNetInfo tInfoc, TermParamInfo tparams, int retry) { //, String posAccountUpsl) {
		Date d = new Date();

		ISOMsg m = new ISOMsg();
		try {

			String mobileNo = tInfoc.getMobileNo();
			m.setMTI("0100" );//"0200");

			//String cdx = cardNo + "|" + cardName + "|" + expDate + "|" + track2 + "|" + track1|tlv;
			//tranInfo.setBillRefNo(cdx);
			//XStream xs = new XStream();
			//LoggingUtil.DebugInfo("XML:: " + xs.toXML(tInfoc));



			String[] cds = OtaUtility.tokenize(tInfoc.getBillRefNo(), "|");


			//String[] cds = tokenize(tInfo.getCardData(), "|");
			String pan =  cds[0]; // ""; // "";
			//String pin = "";
			String track2Data =  cds[3]; // "";
			String field55 = cds[4];
			String field23 = cds[5];
			String accType = cds[6];
			String accx = "00";
			if(accType.equals("1"))
				accx ="20";
			else if(accType.equals("2"))
				accx ="10";
			else if(accType.equals("3"))
				accx ="30";
			field23 = ISOUtil.padleft(field23, 3, '0');
			String tData2 = OtaUtility.tokenize(track2Data, "=")[1];
			String expDate = tData2.substring(0,4);
			String serviceCode =tData2.substring(4,7);

			String track2Data2 = track2Data; // + "10";//
			track2Data2 = track2Data2.replace("&#0;", "").trim();
			if(track2Data2.length() > 37)
				track2Data2 = track2Data2.substring(0,37);
			//Settings.tokenize(track2Data, "=")[0] + "=" + expDate + serviceCode ;

			double amt = tInfoc.getAmount();



			String tsk = tparams.getTsk2();// tparams[3];  //termInfo.getTsk();
			//String serverIP = tparams[6];
			//int port = Integer.parseInt(tparams[7]);
			String terminalId = tparams.getTerminalId(); // tparams[0];
			String cardAcceptorId = tparams.getCardAcceptorId(); // tparams[5];
			String cardAcceptorLocation = tparams.getCardAcceptionLocation();// tparams[8];

			String rrn = tInfoc.getExternalRefNo().substring(0,12);
			String stan = tInfoc.getExternalRefNo().substring(12);

			String pinBlock = tInfoc.getCardData(); // PinBlockEncryptionUtil.GenerateISO0Format0PinBlock(pan, pin);

			m.set(2, pan);
			//m.set(3, "001000");
			//m.set(3, "010000"); //added for UPSL
			m.set(3, "310000");
			//010000
			//m.set(3, "00" + accx + "00");  //Purchase

			//m.set(3, "01" + accx + "00");  //Cash Advance
			//m.set(3, "09" + accx + "00");  //Purchase with Cash back
			//m.set(3, "20" + accx + "00");  //Refund

			//m.set(3, "00" + accx + "00");
			Long amts = new BigDecimal(amt * 100).longValue();
			String amt3 = ISOUtil.padleft(Long.toString(amts), 12, '0');
			m.set(4, "000000001000");

			Date date = new Date();
			String DATE_FORMAT = "MMddHHmmss"; //""MMdd-yyyy hh:mm:ss";
			SimpleDateFormat sdf = new SimpleDateFormat(DATE_FORMAT);
			String dx = sdf.format(date);
			System.out.println("Today is " + dx);
			m.set(7, dx);  //"0327133744");  //MMDDhhmmss
			m.set(11, stan); //new ISOField(11,
			// ISOUtil.zeropad(new Integer(seq.get("traceno")).toString(), 6)));
			m.set(new ISOField(12, ISODate.getTime(d)));
			m.set(new ISOField(13, ISODate.getDate(d)));
			m.set(14,expDate);
			//m.set(new ISOField(15, ISODate.getDate(d)));
			m.set(18, "5999");//"6010");// 4");
			m.set(22, "051");
			m.set(23, field23); //"001");
			m.set(25, "00");
			//m.set(26, "04"); //"06");
			m.set(26, "06"); // Set Offline PIN
			m.set(28, "C00000000");
			m.set(32,  "111129"); //  "111111");
			//track2Data = track2Data.replace('=', 'D');
			m.set(35,  track2Data2); // track2Data); //pan +  "=" + expDate + "226" +  "19123451");
			m.set(37, rrn);
			m.set(40, serviceCode) ;//"601"); // "221");
			m.set(41,  terminalId) ; // "2HIG0106");
			m.set(42,  cardAcceptorId) ;// "2HIGP010000P010");
			m.set(43,  cardAcceptorLocation) ; // "2HIGP010 PHLEX LAGOS                LANG");
			m.set(49, "566");
			//byte[] pinBytes  = ISOUtil.hex2byte(pinBlock);
			if(pinBlock.length() > 16)
				pinBlock = pinBlock.substring(0,16);
			if(retry > 0)
				m.set(52,pinBlock); // pinBytes);

			m.set(55,field55);
			//String f60 = "010085C24300148041Meter Number=12.87001001.Acct=1234567890.Phone=" + mobileNo;
			String posAccountUpsl = tparams.getPoolAccount();
			if(posAccountUpsl == null || posAccountUpsl.equals(""))
				posAccountUpsl ="1234567890";

			//posAccountUpsl = "1774691015";

			String f60 = "010085C24300148041Meter Number=12.87001004.Acct=" + posAccountUpsl + ".Phone=" + mobileNo;
			//	String f60 = "010085C24300148041Meter Number=12.87001003.Acct=1234567890.Phone=" + mobileNo;
//			m.set(60, f60);
			//	m.set(62,"00698WD0101333" + mobileNo);
//			m.set(98, "87001501");
//			m.set(100, "506180");
//
//			 m.set(103,"0001189745");
			m.set(123, "510101210244101");

//			m.set(128, new String(new byte[]{0x0}));

			String f128 = generateHashForIsoMsg2(m, tsk);
			Log.d(TAG, "hash value "+f128);
			Log.d(TAG, "tsk "+tsk);
			Log.d(TAG, "pck "+ m.getComposite().getBytes());
			m.set(128, "");


		} catch (Exception ex) {
			ex.printStackTrace();
		}
		return m;
	}

	public ISOMsg CreatePurchaseMessageBlanceCheeckingRESC(TranNetInfo tInfoc, TermParamInfo tparams, int retry) { //, String posAccountUpsl) {
		Date d = new Date();

		ISOMsg m = new ISOMsg();
		try {

			String mobileNo = tInfoc.getMobileNo();
			m.setMTI("0100" );//"0200");

			//String cdx = cardNo + "|" + cardName + "|" + expDate + "|" + track2 + "|" + track1|tlv;
			//tranInfo.setBillRefNo(cdx);
			//XStream xs = new XStream();
			//LoggingUtil.DebugInfo("XML:: " + xs.toXML(tInfoc));



			String[] cds = OtaUtility.tokenize(tInfoc.getBillRefNo(), "|");


			//String[] cds = tokenize(tInfo.getCardData(), "|");
			String pan =  cds[0]; // ""; // "";
			//String pin = "";
			String track2Data =  cds[3]; // "";
			String field55 = cds[4];
			String field23 = cds[5];
			String accType = cds[6];
			String accx = "00";
			if(accType.equals("1"))
				accx ="20";
			else if(accType.equals("2"))
				accx ="10";
			else if(accType.equals("3"))
				accx ="30";
			field23 = ISOUtil.padleft(field23, 3, '0');
			String tData2 = OtaUtility.tokenize(track2Data, "=")[1];
			String expDate = tData2.substring(0,4);
			String serviceCode =tData2.substring(4,7);

			String track2Data2 = track2Data; // + "10";//
			track2Data2 = track2Data2.replace("&#0;", "").trim();
			if(track2Data2.length() > 37)
				track2Data2 = track2Data2.substring(0,37);
			//Settings.tokenize(track2Data, "=")[0] + "=" + expDate + serviceCode ;

			double amt = tInfoc.getAmount();



			String tsk = tparams.getTsk2();// tparams[3];  //termInfo.getTsk();
			//String serverIP = tparams[6];
			//int port = Integer.parseInt(tparams[7]);
			String terminalId = tparams.getTerminalId(); // tparams[0];
			String cardAcceptorId = tparams.getCardAcceptorId(); // tparams[5];
			String cardAcceptorLocation = tparams.getCardAcceptionLocation();// tparams[8];

			String rrn = tInfoc.getExternalRefNo().substring(0,12);
			String stan = tInfoc.getExternalRefNo().substring(12);

			String pinBlock = tInfoc.getCardData(); // PinBlockEncryptionUtil.GenerateISO0Format0PinBlock(pan, pin);

			m.set(2, pan);
			//m.set(3, "001000");
			//m.set(3, "010000"); //added for UPSL
			m.set(3, "310000");
			//010000
			//m.set(3, "00" + accx + "00");  //Purchase

			//m.set(3, "01" + accx + "00");  //Cash Advance
			//m.set(3, "09" + accx + "00");  //Purchase with Cash back
			//m.set(3, "20" + accx + "00");  //Refund

			//m.set(3, "00" + accx + "00");
			Long amts = new BigDecimal(amt * 100).longValue();
			String amt3 = ISOUtil.padleft(Long.toString(amts), 12, '0');
//			m.set(4, amt3);

			Date date = new Date();
			String DATE_FORMAT = "MMddHHmmss"; //""MMdd-yyyy hh:mm:ss";
			SimpleDateFormat sdf = new SimpleDateFormat(DATE_FORMAT);
			String dx = sdf.format(date);
			System.out.println("Today is " + dx);
			m.set(7, dx);  //"0327133744");  //MMDDhhmmss
			m.set(11, stan); //new ISOField(11,
			// ISOUtil.zeropad(new Integer(seq.get("traceno")).toString(), 6)));
			m.set(new ISOField(12, ISODate.getTime(d)));
			m.set(new ISOField(13, ISODate.getDate(d)));
			m.set(14,expDate);
			//m.set(new ISOField(15, ISODate.getDate(d)));
			m.set(18, "5999");//"6010");// 4");
			m.set(22, "051");
			m.set(23, field23); //"001");
			m.set(25, "00");
			//m.set(26, "04"); //"06");
			m.set(26, "06"); // Set Offline PIN
			m.set(28, "C00000000");
			m.set(32,  "111129"); //  "111111");
			//track2Data = track2Data.replace('=', 'D');
			m.set(35,  track2Data2); // track2Data); //pan +  "=" + expDate + "226" +  "19123451");
			m.set(37, rrn);
			m.set(40, serviceCode) ;//"601"); // "221");
			m.set(41,  terminalId) ; // "2HIG0106");
			m.set(42,  cardAcceptorId) ;// "2HIGP010000P010");
			m.set(43,  cardAcceptorLocation) ; // "2HIGP010 PHLEX LAGOS                LANG");
			m.set(49, "566");
			//byte[] pinBytes  = ISOUtil.hex2byte(pinBlock);
			if(pinBlock.length() > 16)
				pinBlock = pinBlock.substring(0,16);
			if(retry > 0)
				m.set(52,pinBlock); // pinBytes);

			m.set(55,field55);
			//String f60 = "010085C24300148041Meter Number=12.87001001.Acct=1234567890.Phone=" + mobileNo;
			String posAccountUpsl = tparams.getPoolAccount();
			if(posAccountUpsl == null || posAccountUpsl.equals(""))
				posAccountUpsl ="1234567890";

			//posAccountUpsl = "1774691015";

			String f60 = "010085C24300148041Meter Number=12.87001004.Acct=" + posAccountUpsl + ".Phone=" + mobileNo;
			//	String f60 = "010085C24300148041Meter Number=12.87001003.Acct=1234567890.Phone=" + mobileNo;
//			m.set(60, f60);
			//	m.set(62,"00698WD0101333" + mobileNo);
			m.set(98, "87001501");
//			m.set(100, "506180");
//
//			 m.set(103,"0001189745");
			m.set(123, "510101210244101");

//			m.set(128, new String(new byte[]{0x0}));

			String f128 = generateHashForIsoMsg2(m, tsk);
			Log.d(TAG, "hash value "+f128);
			Log.d(TAG, "tsk "+tsk);
			Log.d(TAG, "pck "+ m.getComposite().getBytes());
			m.set(128, "");


		} catch (Exception ex) {
			ex.printStackTrace();
		}
		return m;
	}


//	public ISOMsg  CreatePurchaseMessage2(TranNetInfo tInfoc, TermParamInfo tparams,int retry) { //, String posAccountUpsl) {
//		Date d = new Date();
//
//		ISOMsg m = new ISOMsg();
//		try {
//
//			String mobileNo = tInfoc.getMobileNo();
//			m.setMTI("0100" );//"0200");
//
//			//String cdx = cardNo + "|" + cardName + "|" + expDate + "|" + track2 + "|" + track1|tlv;
//			//tranInfo.setBillRefNo(cdx);
//			//XStream xs = new XStream();
//			//LoggingUtil.DebugInfo("XML:: " + xs.toXML(tInfoc));
//
//
//
//			String[] cds = OtaUtility.tokenize(tInfoc.getBillRefNo(), "|");
//
//
//			//String[] cds = tokenize(tInfo.getCardData(), "|");
//			String pan =  cds[0]; // ""; // "";
//			//String pin = "";
//			String track2Data =  cds[3]; // "";
//			String field55 = cds[4];
//			String field23 = cds[5];
//			String accType = cds[6];
//			String accx = "00";
//			if(accType.equals("1"))
//				accx ="20";
//			else if(accType.equals("2"))
//				accx ="10";
//			else if(accType.equals("3"))
//				accx ="30";
//			field23 = ISOUtil.padleft(field23, 3, '0');
//			String tData2 = OtaUtility.tokenize(track2Data, "=")[1];
//			String expDate = tData2.substring(0,4);
//			String serviceCode =tData2.substring(4,7);
//
//			String track2Data2 = track2Data; // + "10";//
//			track2Data2 = track2Data2.replace("&#0;", "").trim();
//			if(track2Data2.length() > 37)
//				track2Data2 = track2Data2.substring(0,37);
//			//Settings.tokenize(track2Data, "=")[0] + "=" + expDate + serviceCode ;
//
//			double amt = tInfoc.getAmount();
//
//
//
//			String tsk = tparams.getTsk();// tparams[3];  //termInfo.getTsk();
//			//String serverIP = tparams[6];
//			//int port = Integer.parseInt(tparams[7]);
//			String terminalId = tparams.getTerminalId(); // tparams[0];
//			String cardAcceptorId = tparams.getCardAcceptorId(); // tparams[5];
//			String cardAcceptorLocation = tparams.getCardAcceptionLocation();// tparams[8];
//
//			String rrn = tInfoc.getExternalRefNo().substring(0,12);
//			String stan = tInfoc.getExternalRefNo().substring(12);
//
//			String pinBlock = tInfoc.getCardData(); // PinBlockEncryptionUtil.GenerateISO0Format0PinBlock(pan, pin);
//
//			m.set(2, pan);
//			//m.set(3, "001000");
//			//m.set(3, "010000"); //added for UPSL
//			m.set(3, "310000");
//			//010000
//			//m.set(3, "00" + accx + "00");  //Purchase
//
//			//m.set(3, "01" + accx + "00");  //Cash Advance
//			//m.set(3, "09" + accx + "00");  //Purchase with Cash back
//			//m.set(3, "20" + accx + "00");  //Refund
//
//			//m.set(3, "00" + accx + "00");
//			Long amts = new BigDecimal(amt * 100).longValue();
//			String amt3 = ISOUtil.padleft(Long.toString(amts), 12, '0');
////			m.set(4, amt3);
//
//			Date date = new Date();
//			String DATE_FORMAT = "MMddHHmmss"; //""MMdd-yyyy hh:mm:ss";
//			SimpleDateFormat sdf = new SimpleDateFormat(DATE_FORMAT);
//			String dx = sdf.format(date);
//			System.out.println("Today is " + dx);
//			m.set(7, dx);  //"0327133744");  //MMDDhhmmss
//			m.set(11, stan); //new ISOField(11,
//			// ISOUtil.zeropad(new Integer(seq.get("traceno")).toString(), 6)));
//			m.set(new ISOField(12, ISODate.getTime(d)));
//			m.set(new ISOField(13, ISODate.getDate(d)));
//			m.set(14,expDate);
//			//m.set(new ISOField(15, ISODate.getDate(d)));
//			m.set(18, "5999");//"6010");// 4");
//			m.set(22, "051");
//			m.set(23, field23); //"001");
//			m.set(25, "00");
//			//m.set(26, "04"); //"06");
//			m.set(26, "06"); // Set Offline PIN
//			m.set(28, "C00000000");
//			m.set(32,  "111129"); //  "111111");
//			//track2Data = track2Data.replace('=', 'D');
//			m.set(35,  track2Data2); // track2Data); //pan +  "=" + expDate + "226" +  "19123451");
//			m.set(37, rrn);
//			m.set(40, serviceCode) ;//"601"); // "221");
//			m.set(41,  terminalId) ; // "2HIG0106");
//			m.set(42,  cardAcceptorId) ;// "2HIGP010000P010");
//			m.set(43,  cardAcceptorLocation) ; // "2HIGP010 PHLEX LAGOS                LANG");
//			m.set(49, "566");
//			//byte[] pinBytes  = ISOUtil.hex2byte(pinBlock);
//			if(pinBlock.length() > 16)
//				pinBlock = pinBlock.substring(0,16);
//			if(retry > 0)
//				m.set(52,pinBlock); // pinBytes);
//
//			m.set(55,field55);
//			//String f60 = "010085C24300148041Meter Number=12.87001001.Acct=1234567890.Phone=" + mobileNo;
//			String posAccountUpsl = tparams.getPoolAccount();
//			if(posAccountUpsl == null || posAccountUpsl.equals(""))
//				posAccountUpsl ="1234567890";
//
//			//posAccountUpsl = "1774691015";
//
//			String f60 = "010085C24300148041Meter Number=12.87001004.Acct=" + posAccountUpsl + ".Phone=" + mobileNo;
//			//	String f60 = "010085C24300148041Meter Number=12.87001003.Acct=1234567890.Phone=" + mobileNo;
////			m.set(60, f60);
//			//	m.set(62,"00698WD0101333" + mobileNo);
//			m.set(98, "87001501");
//			//m.set(100, "506180");
//
//			// m.set(103,"0001189745");
//			m.set(123, "510101210244101");
//
//			m.set(128, new String(new byte[]{0x0}));
//
//			String f128 = generateHashForIsoMsg(m, tsk);
//			m.set(128, f128);
//
//		} catch (Exception ex) {
//			ex.printStackTrace();
//		}
//		return m;
//	}


	public ISOMsg CreatePurchaseMessageRexConnect23(TranNetInfo tInfoc, TermParamInfo tparams, int retry, boolean onlinePin) { //, String posAccountUpsl) {
		System.out.println("*****A*****tInfoc=>" + tInfoc.toString());
		System.out.println("*****B*****tparams=>" + tparams.toString());


		Date d = new Date();

		ISOMsg m = new ISOMsg();
		try {

			String mobileNo = tInfoc.getMobileNo();
			m.setMTI("0200");

			Log.d(TAG, "BILL-REF: " + tInfoc.getBillRefNo());

			String[] cds = OtaUtility.tokenize(tInfoc.getBillRefNo(), "|");
			//String[] cds = tokenize(tInfo.getCardData(), "|");
			String pan = cds[0]; // ""; // "";
			//String pin = "";
			String track2Data = cds[3]; // "";
			String field55 = cds[4];
			String field23 = cds[5];
			String accType = cds[6];


			System.out.println("cds0==>" + cds[0]);
			System.out.println("cds1==>" + cds[1]);
			System.out.println("cds=2=>" + cds[2]);
			System.out.println("cds3==>" + cds[3]);
			System.out.println("cds4==>" + cds[4]);
			System.out.println("cds=5=>" + cds[5]);
			System.out.println("cds=6=>" + cds[6]);

			System.out.println("tparams =>" + tparams);

			field23 = ISOUtil.padleft(field23, 3, '0');

			String accx = "00";
			/*if(accType.equals("1"))
				accx ="20";
			else if(accType.equals("2"))
				accx ="10";
			else if(accType.equals("3"))
				accx ="30";*/
			//field23 = ISOUtil.padleft(field23, 3, '0');
			String tData2 = null, expDate = null, serviceCode = "";

			if (track2Data.contains("D")) {
				tData2 = OtaUtility.tokenize(track2Data, "D")[1];
				expDate = tData2.substring(0, 4);
				serviceCode = tData2.substring(4, 7);
			} else if (track2Data.contains("=")) {
				tData2 = OtaUtility.tokenize(track2Data, "=")[1];
				expDate = tData2.substring(0, 4);
				serviceCode = tData2.substring(4, 7);
			}
			serviceCode = "201";


			System.out.println("**********serviceCode=>" + tData2.substring(4, 7));
			System.out.println("**********expDate=>" + tData2.substring(4, 7));
			System.out.println("**********expDate=>" + tData2.substring(0, 4));


			String track2Data2 = track2Data; // + "10";//
			track2Data2 = track2Data2.replace("&#0;", "").trim();
			if (track2Data2.length() > 37)
				track2Data2 = track2Data2.substring(0, 37);
			//Settings.tokenize(track2Data, "=")[0] + "=" + expDate + serviceCode ;

			double amt = tInfoc.getAmount();

			String tsk = tparams.getTsk();// tparams[3];  //termInfo.getTsk();
			//String serverIP = tparams[6];
			//int port = Integer.parseInt(tparams[7]);
			String terminalId = tparams.getTerminalId(); // tparams[0];
			String cardAcceptorId = tparams.getCardAcceptorId(); // tparams[5];
			String cardAcceptorLocation = tparams.getCardAcceptionLocation();// tparams[8];
			String ccyCode = tparams.getCurrencyCode();

			String merchantNo = tparams.getMcc();
			System.out.println("**********merchantNo=>" + merchantNo);
			System.out.println("********** .getCardData()=>" + tInfoc.getCardData());

			String rrn = tInfoc.getExternalRefNo().substring(0, 12);
			String stan = tInfoc.getExternalRefNo().substring(12);

			String pinBlock = tInfoc.getCardData(); // PinBlockEncryptionUtil.GenerateISO0Format0PinBlock(pan, pin);

			m.set(2, pan);
			//m.set(3, "001000");
			//m.set(3, "010000"); //added for UPSL
			//m.set(3, "01" + accx + "00");
			m.set(3, "000000");
			//010000
			//m.set(3, "00" + accx + "00");  //Purchase

			//m.set(3, "01" + accx + "00");  //Cash Advance
			//m.set(3, "09" + accx + "00");  //Purchase with Cash back
			//m.set(3, "20" + accx + "00");  //Refund

			//m.set(3, "00" + accx + "00");
			//Long amts = new BigDecimal(amt * 100).longValue();
			Long amts = new BigDecimal(amt).longValue();
			String amt3 = ISOUtil.padleft(Long.toString(amts), 12, '0');
			m.set(4, amt3);

			Date date = new Date();
			String DATE_FORMAT = "MMddHHmmss"; //""MMdd-yyyy hh:mm:ss";DE64  ]
			SimpleDateFormat sdf = new SimpleDateFormat(DATE_FORMAT);
			String dx = sdf.format(date);
			System.out.println("Today is " + dx);
			m.set(7, dx);  //"0327133744");  //MMDDhhmmss
			m.set(11, stan); //new ISOField(11,
			// ISOUtil.zeropad(new Integer(seq.get("traceno")).toString(), 6)));
			m.set(new ISOField(12, ISODate.getTime(d)));
			m.set(new ISOField(13, ISODate.getDate(d)));
			m.set(14, expDate);
			//m.set(new ISOField(15, ISODate.getDate(d)));
			m.set(18, "6012"); //5251"); // for NIBSS "5410"); //6010");// 4"); 6012
			m.set(22, "051");
			//5399237077728398D2307221019244246
			m.set(23, field23); //"001");
			if (onlinePin)
				m.set(25, "00");
			else
				m.set(25, "00"); //"91"); //"00");

//			m.set(26, "12"); //"06");


			m.set(26, "12"); //"06"); // Set Offline PIN
			m.set(28, "D00000000");  //D00000000
			m.set(32, getAcquiringInstitutionIdCode(track2Data)); //"415002"); //  "111111");
			track2Data2 = track2Data2.replace('=', 'D');
			m.set(35, track2Data2); // track2Data); //pan +  "=" + expDate + "226" +  "19123451");
			m.set(37, rrn);
			m.set(40, "221");//"601"); // "221"); 201 serviceCode
			//m.set(40, "221") ;//"601"); // "221"); 201
			m.set(41, terminalId); // "2HIG0106");
			m.set(42, "2011LA023073696");// "2HIGP010000P010");
			m.set(43, "AIICO INSURANCE PLC    LA           LANG");
//			m.set(43,  "ZINTERNET NIGERIA LIMITLA           LANG") ; // "2HIGP010 PHLEX LAGOS                LANG");cardAcceptorLocation
			m.set(49, "566");
			//byte[] pinBytes  = ISOUtil.hex2byte(pinBlock);


			if (pinBlock.length() > 16)
				pinBlock = pinBlock.substring(0, 16);
			Log.e("PINDATA", tInfoc.getCardData());
			//if(retry > 0)
			if (onlinePin && 16 == tInfoc.getCardData().length())
				m.set(52, tInfoc.getCardData()); // pinBytes);

			m.set(55, field55);

			//m.set(59, "Reconciler&gt;GENERIC&amp;Option&gt;000");

			SimpleDateFormat dff4 = new SimpleDateFormat("yyyy");
			String dy = dff4.format(new Date());
//			m.set(59, terminalId +"-"+ rrn + "-" + dy + dx);

			m.set(123, "51010151134C101");//510101513344101

//			m.set(128, new String(new byte[]{0x0}));
			m.set(128, "");

			String f128 = generateHashForIsoMsg(m, tsk);
			m.set(128, f128);

		} catch (Exception ex) {
			ex.printStackTrace();
		}
		return m;
	}
	public static String getAcquiringInstitutionIdCode(String track2Data) {
		return track2Data.substring(0, 6);
	}

	public ISOMsg  CreatePurchaseMessage(TranNetInfo tInfoc, TermParamInfo tparams,int retry) { //, String posAccountUpsl) {
		Date d = new Date();

		ISOMsg m = new ISOMsg();
		try {

			String mobileNo = tInfoc.getMobileNo();
			m.setMTI("0200" );//"0200");

			//String cdx = cardNo + "|" + cardName + "|" + expDate + "|" + track2 + "|" + track1|tlv;
			//tranInfo.setBillRefNo(cdx);
			//XStream xs = new XStream();
			//LoggingUtil.DebugInfo("XML:: " + xs.toXML(tInfoc));



			String[] cds = OtaUtility.tokenize(tInfoc.getBillRefNo(), "|");


			//String[] cds = tokenize(tInfo.getCardData(), "|");
			String pan =  cds[0]; // ""; // "";
			//String pin = "";
			String track2Data =  cds[3]; // "";
			String field55 = cds[4];
			String field23 = cds[5];
			String accType = cds[6];
			String accx = "00";
			if(accType.equals("1"))
				accx ="20";
			else if(accType.equals("2"))
				accx ="10";
			else if(accType.equals("3"))
				accx ="30";
			Log.d(TAG, "track data" +track2Data);
			Log.d(TAG, "field23" +field23);
			field23 = ISOUtil.padleft(field23, 3, '0');
			String tData2 = OtaUtility.tokenize(track2Data, "=")[1];
			String expDate = tData2.substring(0,4);
			String serviceCode =tData2.substring(4,7);

			String track2Data2 = track2Data; // + "10";//
			track2Data2 = track2Data2.replace("&#0;", "").trim();
			if(track2Data2.length() > 37)
				track2Data2 = track2Data2.substring(0,37);
			//Settings.tokenize(track2Data, "=")[0] + "=" + expDate + serviceCode ;

			double amt = tInfoc.getAmount();



            String tsk = tparams.getTsk();// tparams[3];  //termInfo.getTsk();
            //String serverIP = tparams[6];
            //int port = Integer.parseInt(tparams[7]);
            String terminalId = tparams.getTerminalId(); // tparams[0];
            String cardAcceptorId = tparams.getCardAcceptorId(); // tparams[5];
            String cardAcceptorLocation = tparams.getCardAcceptionLocation();// tparams[8];

			String rrn = tInfoc.getExternalRefNo().substring(0,12);
			String stan = tInfoc.getExternalRefNo().substring(12);

			String pinBlock = tInfoc.getCardData(); // PinBlockEncryptionUtil.GenerateISO0Format0PinBlock(pan, pin);

			m.set(2, pan);
			//m.set(3, "001000");
            //m.set(3, "010000"); //added for UPSL
			m.set(3, "01" + accx + "00");
            //010000
			//m.set(3, "00" + accx + "00");  //Purchase

			//m.set(3, "01" + accx + "00");  //Cash Advance
			//m.set(3, "09" + accx + "00");  //Purchase with Cash back
			//m.set(3, "20" + accx + "00");  //Refund

			//m.set(3, "00" + accx + "00");
			Long amts = new BigDecimal(amt * 100).longValue();
			String amt3 = ISOUtil.padleft(Long.toString(amts), 12, '0');
			m.set(4, amt3);

			Date date = new Date();
			String DATE_FORMAT = "MMddHHmmss"; //""MMdd-yyyy hh:mm:ss";
			SimpleDateFormat sdf = new SimpleDateFormat(DATE_FORMAT);
			String dx = sdf.format(date);
			System.out.println("Today is " + dx);
			m.set(7, dx);  //"0327133744");  //MMDDhhmmss
			m.set(11, stan); //new ISOField(11,
			// ISOUtil.zeropad(new Integer(seq.get("traceno")).toString(), 6)));
			m.set(new ISOField(12, ISODate.getTime(d)));
			m.set(new ISOField(13, ISODate.getDate(d)));
			m.set(14,expDate);
			//m.set(new ISOField(15, ISODate.getDate(d)));
			m.set(18, "6010");// 4");
			m.set(22, "051");
			m.set(23, field23); //"001");
			m.set(25, "00");
			//m.set(26, "04"); //"06");
            m.set(26, "06"); // Set Offline PIN
			m.set(28, "C00000000");
			m.set(32,  "111129"); //  "111111");
			//track2Data = track2Data.replace('=', 'D');
			m.set(35,  track2Data2); // track2Data); //pan +  "=" + expDate + "226" +  "19123451");
			m.set(37, rrn);
			m.set(40, serviceCode) ;//"601"); // "221");
			m.set(41,  terminalId) ; // "2HIG0106");
			m.set(42,  cardAcceptorId) ;// "2HIGP010000P010");
			m.set(43,  cardAcceptorLocation) ; // "2HIGP010 PHLEX LAGOS                LANG");
			m.set(49, "566");
			//byte[] pinBytes  = ISOUtil.hex2byte(pinBlock);
			if (pinBlock == null) {
				pinBlock = "";
			}
			if(pinBlock.length() > 16)
				pinBlock = pinBlock.substring(0,16);
			Log.d(TAG, "ison retry "+retry);
			if(retry > 0)
               m.set(52,pinBlock); // pinBytes);

			m.set(55,field55);
			//String f60 = "010085C24300148041Meter Number=12.87001001.Acct=1234567890.Phone=" + mobileNo;
            String posAccountUpsl = tparams.getPoolAccount();
            if(posAccountUpsl == null || posAccountUpsl.equals(""))
                posAccountUpsl ="1234567890";

            SimpleDateFormat dff4 = new SimpleDateFormat("yyyy");
            String dy = dff4.format(new Date());
            m.set(59, terminalId + "-" + rrn + "-" + dy + dx);

            //posAccountUpsl = "1774691015";

            String f60 = "010085C24300148041Meter Number=12.87001004.Acct=" + posAccountUpsl + ".Phone=" + mobileNo;
			//	String f60 = "010085C24300148041Meter Number=12.87001003.Acct=1234567890.Phone=" + mobileNo;
			m.set(60, f60);
			//	m.set(62,"00698WD0101333" + mobileNo);
			//m.set(98, "High   Street   MFB      ");
			//m.set(100, "506180");

			// m.set(103,"0001189745");
			m.set(123, "510101513344101");

			m.set(128, new String(new byte[]{0x0}));

			String f128 = generateHashForIsoMsg(m, tsk);
			m.set(128, f128);

		} catch (Exception ex) {
			ex.printStackTrace();
		}
		return m;
	}

	public ISOMsg  CreatePurchaseMessageHori(TranNetInfo tInfoc, TermParamInfo tparams,int retry) { //, String posAccountUpsl) {
		Date d = new Date();

		ISOMsg m = new ISOMsg();
		try {

			String mobileNo = tInfoc.getMobileNo();
			m.setMTI("0200" );//"0200");

			//String cdx = cardNo + "|" + cardName + "|" + expDate + "|" + track2 + "|" + track1|tlv;
			//tranInfo.setBillRefNo(cdx);
			//XStream xs = new XStream();
			//LoggingUtil.DebugInfo("XML:: " + xs.toXML(tInfoc));



			String[] cds = OtaUtility.tokenize(tInfoc.getBillRefNo(), "|");


			//String[] cds = tokenize(tInfo.getCardData(), "|");
			String pan =  cds[0]; // ""; // "";
			//String pin = "";
			String track2Data =  cds[3]; // "";
			String field55 = cds[4];
			String field23 = cds[5];
			String accType = cds[6];
			String accx = "00";
			if(accType.equals("1"))
				accx ="20";
			else if(accType.equals("2"))
				accx ="10";
			else if(accType.equals("3"))
				accx ="30";
			Log.d(TAG, "track data" +track2Data);
			Log.d(TAG, "field23" +field23);
			field23 = ISOUtil.padleft(field23, 3, '0');
			String tData2 = OtaUtility.tokenize(track2Data, "=")[1];
			String expDate = tData2.substring(0,4);
			String serviceCode =tData2.substring(4,7);

			String track2Data2 = track2Data; // + "10";//
			track2Data2 = track2Data2.replace("&#0;", "").trim();
			if(track2Data2.length() > 37)
				track2Data2 = track2Data2.substring(0,37);
			//Settings.tokenize(track2Data, "=")[0] + "=" + expDate + serviceCode ;

			double amt = tInfoc.getAmount();



			String tsk = tparams.getTsk();// tparams[3];  //termInfo.getTsk();
			//String serverIP = tparams[6];
			//int port = Integer.parseInt(tparams[7]);
			String terminalId = tparams.getTerminalId(); // tparams[0];
			String cardAcceptorId = tparams.getCardAcceptorId(); // tparams[5];
			String cardAcceptorLocation = tparams.getCardAcceptionLocation();// tparams[8];

			String rrn = tInfoc.getExternalRefNo().substring(0,12);
			String stan = tInfoc.getExternalRefNo().substring(12);

			String pinBlock = tInfoc.getCardData(); // PinBlockEncryptionUtil.GenerateISO0Format0PinBlock(pan, pin);

			m.set(2, pan);
			//m.set(3, "001000");
			//m.set(3, "010000"); //added for UPSL
			m.set(3, "01" + accx + "00");
			//010000
			//m.set(3, "00" + accx + "00");  //Purchase

			//m.set(3, "01" + accx + "00");  //Cash Advance
			//m.set(3, "09" + accx + "00");  //Purchase with Cash back
			//m.set(3, "20" + accx + "00");  //Refund

			//m.set(3, "00" + accx + "00");
			Long amts = new BigDecimal(amt * 100).longValue();
			String amt3 = ISOUtil.padleft(Long.toString(amts), 12, '0');
			m.set(4, amt3);

			Date date = new Date();
			String DATE_FORMAT = "MMddHHmmss"; //""MMdd-yyyy hh:mm:ss";
			SimpleDateFormat sdf = new SimpleDateFormat(DATE_FORMAT);
			String dx = sdf.format(date);
			System.out.println("Today is " + dx);
			m.set(7, dx);  //"0327133744");  //MMDDhhmmss
			m.set(11, stan); //new ISOField(11,
			// ISOUtil.zeropad(new Integer(seq.get("traceno")).toString(), 6)));
			m.set(new ISOField(12, ISODate.getTime(d)));
			m.set(new ISOField(13, ISODate.getDate(d)));
			m.set(14,expDate);
			//m.set(new ISOField(15, ISODate.getDate(d)));
			m.set(18, "6010");// 4");
			m.set(22, "051");
			m.set(23, field23); //"001");
			m.set(25, "00");
			//m.set(26, "04"); //"06");
			m.set(26, "06"); // Set Offline PIN
			m.set(28, "C00000000");
			m.set(32,  "111129"); //  "111111");
			//track2Data = track2Data.replace('=', 'D');
			m.set(35,  track2Data2); // track2Data); //pan +  "=" + expDate + "226" +  "19123451");
			m.set(37, rrn);
			m.set(40, serviceCode) ;//"601"); // "221");
			m.set(41,  terminalId) ; // "2HIG0106");
			m.set(42,  cardAcceptorId) ;// "2HIGP010000P010");
			m.set(43,  cardAcceptorLocation) ; // "2HIGP010 PHLEX LAGOS                LANG");
			m.set(49, "566");
			//byte[] pinBytes  = ISOUtil.hex2byte(pinBlock);
			if(pinBlock.length() > 16)
				pinBlock = pinBlock.substring(0,16);
			Log.d(TAG, "ison retry "+retry);
//			if(retry > 0)
				m.set(52,pinBlock); // pinBytes);

			m.set(55,field55);
			//String f60 = "010085C24300148041Meter Number=12.87001001.Acct=1234567890.Phone=" + mobileNo;
			String posAccountUpsl = tparams.getPoolAccount();
			if(posAccountUpsl == null || posAccountUpsl.equals(""))
				posAccountUpsl ="1234567890";

			//posAccountUpsl = "1774691015";

			String f60 = "010085C24300148041Meter Number=12.87001004.Acct=" + posAccountUpsl + ".Phone=" + mobileNo;
			//	String f60 = "010085C24300148041Meter Number=12.87001003.Acct=1234567890.Phone=" + mobileNo;
			m.set(60, f60);
			//	m.set(62,"00698WD0101333" + mobileNo);
			//m.set(98, "High   Street   MFB      ");
			//m.set(100, "506180");

			// m.set(103,"0001189745");
			m.set(123, "510101513344101");

			m.set(128, new String(new byte[]{0x0}));

			String f128 = generateHashForIsoMsg(m, tsk);
			m.set(128, f128);

		} catch (Exception ex) {
			ex.printStackTrace();
		}
		return m;
	}

	//
//	public ISOMsg CreatePurchaseMessageRexConnect(TranNetInfo tInfoc, TermParamInfo tparams,int retry, boolean onlinePin) { //, String posAccountUpsl) {
//		Date d = new Date();
//
//		ISOMsg m = new ISOMsg();
//		try {
//
//			String mobileNo = tInfoc.getMobileNo();
//			m.setMTI("0200");
//
//			Log.d(TAG,"BILL-REF: " + tInfoc.getBillRefNo());
//
//			String[] cds = OtaUtility.tokenize(tInfoc.getBillRefNo(), "|");
//			//String[] cds = tokenize(tInfo.getCardData(), "|");
//			String pan =  cds[0]; // ""; // "";
//			//String pin = "";
//			String track2Data =  cds[3]; // "";
//			String field55 = cds[4];
//			String field23 = cds[5];
//			String accType = cds[6];
//
//			field23 = ISOUtil.padleft(field23, 3, '0');
//
//			String accx = "00";
//			/*if(accType.equals("1"))
//				accx ="20";
//			else if(accType.equals("2"))
//				accx ="10";
//			else if(accType.equals("3"))
//				accx ="30";*/
//			//field23 = ISOUtil.padleft(field23, 3, '0');
//			String tData2 = "";
//			if(track2Data.contains("D"))
//			    tData2 = OtaUtility.tokenize(track2Data, "D")[1];
//			else if(track2Data.contains("="))
//				tData2 = OtaUtility.tokenize(track2Data, "=")[1];
//
//
//			String expDate = tData2.substring(0,4);
//			String serviceCode =tData2.substring(4,7);
//
//			String track2Data2 = track2Data; // + "10";//
//			track2Data2 = track2Data2.replace("&#0;", "").trim();
//			if(track2Data2.length() > 37)
//				track2Data2 = track2Data2.substring(0,37);
//			//Settings.tokenize(track2Data, "=")[0] + "=" + expDate + serviceCode ;
//
//			double amt = tInfoc.getAmount();
//
//			String tsk = tparams.getTsk();// tparams[3];  //termInfo.getTsk();
//			//String serverIP = tparams[6];
//			//int port = Integer.parseInt(tparams[7]);
//			String terminalId = tparams.getTerminalId(); // tparams[0];
//			String cardAcceptorId = tparams.getCardAcceptorId(); // tparams[5];
//			String cardAcceptorLocation = tparams.getCardAcceptionLocation();// tparams[8];
//			String ccyCode = tparams.getCurrencyCode();
//
//			String rrn = tInfoc.getExternalRefNo().substring(0,12);
//			String stan = tInfoc.getExternalRefNo().substring(12);
//
//			String pinBlock = tInfoc.getCardData(); // PinBlockEncryptionUtil.GenerateISO0Format0PinBlock(pan, pin);
//
//			m.set(2, pan);
//			//m.set(3, "001000");
//			//m.set(3, "010000"); //added for UPSL
//			//m.set(3, "01" + accx + "00");
//			m.set(3, "000000" );
//			//010000
//			//m.set(3, "00" + accx + "00");  //Purchase
//
//			//m.set(3, "01" + accx + "00");  //Cash Advance
//			//m.set(3, "09" + accx + "00");  //Purchase with Cash back
//			//m.set(3, "20" + accx + "00");  //Refund
//
//			//m.set(3, "00" + accx + "00");
//			Long amts = new BigDecimal(amt * 100).longValue();
//			String amt3 = ISOUtil.padleft(Long.toString(amts), 12, '0');
//			m.set(4, amt3);
//
//			Date date = new Date();
//			String DATE_FORMAT = "MMddHHmmss"; //""MMdd-yyyy hh:mm:ss";
//			SimpleDateFormat sdf = new SimpleDateFormat(DATE_FORMAT);
//			String dx = sdf.format(date);
//			System.out.println("Today is " + dx);
//			m.set(7, dx);  //"0327133744");  //MMDDhhmmss
//			m.set(11, stan); //new ISOField(11,
//			// ISOUtil.zeropad(new Integer(seq.get("traceno")).toString(), 6)));
//			m.set(new ISOField(12, ISODate.getTime(d)));
//			m.set(new ISOField(13, ISODate.getDate(d)));
//			m.set(14,expDate);
//			//m.set(new ISOField(15, ISODate.getDate(d)));
//			m.set(18, "5411"); //5251"); // for NIBSS "5410"); //6010");// 4");
//			m.set(22, "051");
//			//5399237077728398D2307221019244246
//			m.set(23, field23); //"001");
//			if(onlinePin)
//				m.set(25, "00");
//			else
//				m.set(25, "00"); //"91"); //"00");
//
//			m.set(26, "04"); //"06");
//
//
//			//m.set(26, "12"); //"06"); // Set Offline PIN
//			m.set(28, "D00000000");  //D00000000
//			m.set(32,  "111129"); //"415002"); //  "111111");
//			track2Data2 = track2Data2.replace('=', 'D');
//			m.set(35,  track2Data2); // track2Data); //pan +  "=" + expDate + "226" +  "19123451");
//			m.set(37, rrn);
//			m.set(40, serviceCode) ;//"601"); // "221");
//			m.set(41,  terminalId) ; // "2HIG0106");
//			m.set(42,  cardAcceptorId) ;// "2HIGP010000P010");
//			m.set(43,  cardAcceptorLocation) ; // "2HIGP010 PHLEX LAGOS                LANG");
//			m.set(49, ccyCode);
//			//byte[] pinBytes  = ISOUtil.hex2byte(pinBlock);
//			if(pinBlock.length() > 16)
//				pinBlock = pinBlock.substring(0,16);
//			//if(retry > 0)
//           // if(onlinePin)
//			    //m.set(52,pinBlock); // pinBytes);
//
//			m.set(55,field55);
//
//			//m.set(59, "Reconciler&gt;GENERIC&amp;Option&gt;000");
//
//			SimpleDateFormat dff4 = new SimpleDateFormat("yyyy");
//			String dy = dff4.format(new Date());
//			m.set(59, terminalId +"-"+ rrn + "-" + dy + dx);
//
//			m.set(123, "510101513344101");
//
//			m.set(128, new String(new byte[]{0x0}));
//
//			String f128 = generateHashForIsoMsg(m, tsk);
//			m.set(128, f128);
//
//		} catch (Exception ex) {
//			ex.printStackTrace();
//		}
//		return m;
//	}


	public ISOMsg CreatePurchaseMessageRexConnect(TranNetInfo tInfoc, TermParamInfo tparams,int retry, boolean onlinePin) { //, String posAccountUpsl) {
		Date d = new Date();

		ISOMsg m = new ISOMsg();
		try {

			String mobileNo = tInfoc.getMobileNo();
			m.setMTI("0200");

			Log.d(TAG,"BILL-REF: " + tInfoc.getBillRefNo());

			String[] cds = OtaUtility.tokenize(tInfoc.getBillRefNo(), "|");
			//String[] cds = tokenize(tInfo.getCardData(), "|");
			String pan =  cds[0]; // ""; // "";
			//String pin = "";
			String track2Data =  cds[3]; // "";
			String field55 = cds[4];
			String field23 = cds[5];
			String accType = cds[6];

			field23 = ISOUtil.padleft(field23, 3, '0');

			String accx = "00";
			/*if(accType.equals("1"))
				accx ="20";
			else if(accType.equals("2"))
				accx ="10";
			else if(accType.equals("3"))
				accx ="30";*/
			//field23 = ISOUtil.padleft(field23, 3, '0');
			String tData2 = "";
			if(track2Data.contains("D"))
				tData2 = OtaUtility.tokenize(track2Data, "D")[1];
			else if(track2Data.contains("="))
				tData2 = OtaUtility.tokenize(track2Data, "=")[1];


			String expDate = tData2.substring(0,4);
			String serviceCode =tData2.substring(4,7);

			String track2Data2 = track2Data; // + "10";//
			track2Data2 = track2Data2.replace("&#0;", "").trim();
			if(track2Data2.length() > 37)
				track2Data2 = track2Data2.substring(0,37);
			//Settings.tokenize(track2Data, "=")[0] + "=" + expDate + serviceCode ;

			double amt = tInfoc.getAmount();

			String tsk = tparams.getTsk();// tparams[3];  //termInfo.getTsk();
			//String serverIP = tparams[6];
			//int port = Integer.parseInt(tparams[7]);
			String terminalId = tparams.getTerminalId(); // tparams[0];
			String cardAcceptorId = tparams.getCardAcceptorId(); // tparams[5];
			String cardAcceptorLocation = tparams.getCardAcceptionLocation();// tparams[8];
			String ccyCode = tparams.getCurrencyCode();

			String rrn = tInfoc.getExternalRefNo().substring(0,12);
			String stan = tInfoc.getExternalRefNo().substring(12);

			String pinBlock = tInfoc.getCardData(); // PinBlockEncryptionUtil.GenerateISO0Format0PinBlock(pan, pin);

			m.set(2, pan);
			//m.set(3, "001000");
			//m.set(3, "010000"); //added for UPSL
			//m.set(3, "01" + accx + "00");
			m.set(3, "000000" );
			//010000
			//m.set(3, "00" + accx + "00");  //Purchase

			//m.set(3, "01" + accx + "00");  //Cash Advance
			//m.set(3, "09" + accx + "00");  //Purchase with Cash back
			//m.set(3, "20" + accx + "00");  //Refund

			//m.set(3, "00" + accx + "00");
			Long amts = new BigDecimal(amt * 100).longValue();
			String amt3 = ISOUtil.padleft(Long.toString(amts), 12, '0');
			m.set(4, amt3);

			Date date = new Date();
			String DATE_FORMAT = "MMddHHmmss"; //""MMdd-yyyy hh:mm:ss";
			SimpleDateFormat sdf = new SimpleDateFormat(DATE_FORMAT);
			String dx = sdf.format(date);
			System.out.println("Today is " + dx);
			m.set(7, dx);  //"0327133744");  //MMDDhhmmss
			m.set(11, stan); //new ISOField(11,
			// ISOUtil.zeropad(new Integer(seq.get("traceno")).toString(), 6)));
			m.set(new ISOField(12, ISODate.getTime(d)));
			m.set(new ISOField(13, ISODate.getDate(d)));
			m.set(14,expDate);
			//m.set(new ISOField(15, ISODate.getDate(d)));
			m.set(18, "5411"); //5251"); // for NIBSS "5410"); //6010");// 4");
			m.set(22, "051");
			//5399237077728398D2307221019244246
			m.set(23, field23); //"001");
			if(onlinePin)
				m.set(25, "00");
			else
				m.set(25, "00"); //"91"); //"00");

			m.set(26, "04"); //"06");


			//m.set(26, "12"); //"06"); // Set Offline PIN
			m.set(28, "D00000000");  //D00000000
			m.set(32,  "111129"); //"415002"); //  "111111");
			track2Data2 = track2Data2.replace('=', 'D');
			m.set(35,  track2Data2); // track2Data); //pan +  "=" + expDate + "226" +  "19123451");
			m.set(37, rrn);
			m.set(40, serviceCode) ;//"601"); // "221");
			m.set(41,  terminalId) ; // "2HIG0106");
			m.set(42,  cardAcceptorId) ;// "2HIGP010000P010");
			m.set(43,  cardAcceptorLocation) ; // "2HIGP010 PHLEX LAGOS                LANG");
			m.set(49, ccyCode);
			//byte[] pinBytes  = ISOUtil.hex2byte(pinBlock);
			if(pinBlock.length() > 16)
				pinBlock = pinBlock.substring(0,16);
			//if(retry > 0)
			// if(onlinePin)
			//m.set(52,pinBlock); // pinBytes);

			m.set(55,field55);

			//m.set(59, "Reconciler&gt;GENERIC&amp;Option&gt;000");

			SimpleDateFormat dff4 = new SimpleDateFormat("yyyy");
			String dy = dff4.format(new Date());
			m.set(59, terminalId +"-"+ rrn + "-" + dy + dx);

			m.set(123, "510101513344101");

			m.set(128, new String(new byte[]{0x0}));

			String f128 = generateHashForIsoMsg(m, tsk);
			m.set(128, f128);

		} catch (Exception ex) {
			ex.printStackTrace();
		}
		return m;
	}

	public ISOMsg CreateCashAdvanceRefundDepositCashbackMessage(TranNetInfo tInfoc, String[] tparams, String tranCode) {
		Date d = new Date();

		ISOMsg m = new ISOMsg();
		try {

			String mobileNo = tInfoc.getMobileNo();
			m.setMTI("0200");

            if(tranCode.equals("60")) //Pre-Auth
            {
                m.setMTI("0100");
            }
            else if(tranCode.equals("61")) //Pre-Authorization Sale Completion
			{
				m.setMTI("0220");
			}


            String[] cds = OtaUtility.tokenize(tInfoc.getBillRefNo(), "|");


			//String[] cds = tokenize(tInfo.getCardData(), "|");
			String pan =  cds[0]; // ""; // "";
			//String pin = "";
			String track2Data =  cds[3]; // "";
			String field55 = cds[4];
			String field23 = cds[5];
			String accType = cds[6];
			String accx = "00";
			if(accType.equals("1"))
				accx ="20";
			else if(accType.equals("2"))
				accx ="10";
			else if(accType.equals("3"))
				accx ="30";
			field23 = ISOUtil.padleft(field23, 3, '0');
			String tData2 = OtaUtility.tokenize(track2Data, "=")[1];
			String expDate = tData2.substring(0,4);
			String serviceCode =tData2.substring(4,7);

			String track2Data2 = track2Data; // + "10";//
			track2Data2 = track2Data2.replace("&#0;", "").trim();
			if(track2Data2.length() > 37)
				track2Data2 = track2Data2.substring(0,37);
			//Settings.tokenize(track2Data, "=")[0] + "=" + expDate + serviceCode ;

			double amt = tInfoc.getAmount();



			String tsk = tparams[3];  //termInfo.getTsk();
			//String serverIP = tparams[6];
			//int port = Integer.parseInt(tparams[7]);
			String terminalId = tparams[0];
			String cardAcceptorId = tparams[5];
			String cardAcceptorLocation = tparams[8];

			String rrn = tInfoc.getExternalRefNo().substring(0,12);
			String stan = tInfoc.getExternalRefNo().substring(12);

			String pinBlock = tInfoc.getCardData(); // PinBlockEncryptionUtil.GenerateISO0Format0PinBlock(pan, pin);

			m.set(2, pan);
			m.set(3, tranCode + "0000");
			//m.set(3, "01" + accx + "00");  //Purchase

			//m.set(3, "01" + accx + "00");  //Cash Advance
			//m.set(3, "09" + accx + "00");  //Purchase with Cash back
			//m.set(3, "20" + accx + "00");  //Refund

			//m.set(3, "00" + accx + "00");
			Long amts = new BigDecimal(amt * 100).longValue();
			String amt3 = ISOUtil.padleft(Long.toString(amts), 12, '0');
			m.set(4, amt3);

			Date date = new Date();
			String DATE_FORMAT = "MMddHHmmss"; //""MMdd-yyyy hh:mm:ss";
			SimpleDateFormat sdf = new SimpleDateFormat(DATE_FORMAT);
			String dx = sdf.format(date);
			System.out.println("Today is " + dx);
			m.set(7, dx);  //"0327133744");  //MMDDhhmmss
			m.set(11, stan); //new ISOField(11,
			// ISOUtil.zeropad(new Integer(seq.get("traceno")).toString(), 6)));
			m.set(new ISOField(12, ISODate.getTime(d)));
			m.set(new ISOField(13, ISODate.getDate(d)));
			m.set(14,expDate);
			//m.set(new ISOField(15, ISODate.getDate(d)));
			m.set(18, "6014");
			m.set(22, "051");
			m.set(23, field23); //"001");
			m.set(25, "00");
			m.set(26, "04"); //"06");
			m.set(28, "C00000000");
			//m.set(32,  "111129"); //  "111111");
			m.set(32,  "111129"); //  "111111");
			m.set(33,  "111111");
			//track2Data = track2Data.replace('=', 'D');
			m.set(35,  track2Data2); // track2Data); //pan +  "=" + expDate + "226" +  "19123451");
			m.set(37, rrn);
			m.set(40, serviceCode) ;//"601"); // "221");
			m.set(41,  terminalId) ; // "2HIG0106");
			m.set(42,  cardAcceptorId) ;// "2HIGP010000P010");
			m.set(43,  cardAcceptorLocation) ; // "2HIGP010 PHLEX LAGOS                LANG");
			m.set(49, "566");
			//byte[] pinBytes  = ISOUtil.hex2byte(pinBlock);
			if(pinBlock.length() > 16)
				pinBlock = pinBlock.substring(0,16);

			m.set(52,pinBlock); // pinBytes);
			m.set(55,field55);
			String f60 = "010085C24300148041Meter Number=12.87001001.Acct=1234567890.Phone=" + mobileNo;
			//	String f60 = "010085C24300148041Meter Number=12.87001003.Acct=1234567890.Phone=" + mobileNo;
			m.set(60, f60);
			//	m.set(62,"00698WD0101333" + mobileNo);
			//m.set(98, "High   Street   MFB      ");
			//m.set(100, "506180");

			// m.set(103,"0001189745");
			m.set(123, "510101513344101");

			m.set(128, new String(new byte[]{0x0}));

			String f128 = generateHashForIsoMsg(m, tsk);
			m.set(128, f128);

		} catch (Exception ex) {
			ex.printStackTrace();
		}
		return m;
	}

    public ISOMsg CreatePurchaseMessageUPSL(TranNetInfo tInfoc, String[] tparams,String zmk, Context ctx) {
        Date d = new Date();

        ISOMsg m = new ISOMsg();
        try {
			InputStream is = ctx.getAssets().open("postpack.xml");

			GenericPackager packager = new GenericPackager(is);
         	m.setPackager(packager);


            String mobileNo = tInfoc.getMobileNo();
            m.setMTI("0200");

            //String cdx = cardNo + "|" + cardName + "|" + expDate + "|" + track2 + "|" + track1|tlv;
            //tranInfo.setBillRefNo(cdx);
            //XStream xs = new XStream();
            //LoggingUtil.DebugInfo("XML:: " + xs.toXML(tInfoc));



            String[] cds = OtaUtility.tokenize(tInfoc.getBillRefNo(), "|");


            //String[] cds = tokenize(tInfo.getCardData(), "|");
            String pan =  cds[0]; // ""; // "";
            //String pin = "";
            String track2Data =  cds[3]; // "";
            String field55 = cds[4];
            String field23 = cds[5];
            String accType = cds[6];
            String accx = "00";
            if(accType.equals("1"))
                accx ="20";
            else if(accType.equals("2"))
                accx ="10";
            else if(accType.equals("3"))
                accx ="30";
            field23 = ISOUtil.padleft(field23, 3, '0');
            String tData2 = OtaUtility.tokenize(track2Data, "=")[1];
            String expDate = tData2.substring(0,4);
            String serviceCode =tData2.substring(4,7);

            String track2Data2 = track2Data; // + "10";//
            track2Data2 = track2Data2.replace("&#0;", "").trim();
            if(track2Data2.length() > 37)
                track2Data2 = track2Data2.substring(0,37);
            //Settings.tokenize(track2Data, "=")[0] + "=" + expDate + serviceCode ;

            double amt = tInfoc.getAmount();

            String tsk = tparams[3];  //termInfo.getTsk();
            //String serverIP = tparams[6];
            //int port = Integer.parseInt(tparams[7]);
            String terminalId = tparams[0];
            String cardAcceptorId = tparams[5];
            String cardAcceptorLocation = tparams[8];

            String rrn = tInfoc.getExternalRefNo().substring(0,12);
            String stan = tInfoc.getExternalRefNo().substring(12);

            String pinBlock = tInfoc.getCardData(); // PinBlockEncryptionUtil.GenerateISO0Format0PinBlock(pan, pin);

            m.set(2, pan);
            m.set(3, "001000");
           // m.set(3, "00" + accx + "00");  //Purchase

            //m.set(3, "01" + accx + "00");  //Cash Advance
            //m.set(3, "09" + accx + "00");  //Purchase with Cash back
            //m.set(3, "20" + accx + "00");  //Refund

            //m.set(3, "00" + accx + "00");
            Long amts = new BigDecimal(amt * 100).longValue();
            String amt3 = ISOUtil.padleft(Long.toString(amts), 12, '0');
            m.set(4, amt3);

            Date date = new Date();
            String DATE_FORMAT = "MMddHHmmss"; //""MMdd-yyyy hh:mm:ss";
            SimpleDateFormat sdf = new SimpleDateFormat(DATE_FORMAT);
            String dx = sdf.format(date);
            System.out.println("Today is " + dx);
            m.set(7, dx);  //"0327133744");  //MMDDhhmmss
            m.set(11, stan); //new ISOField(11,
            // ISOUtil.zeropad(new Integer(seq.get("traceno")).toString(), 6)));
            m.set(new ISOField(12, ISODate.getTime(d)));
            m.set(new ISOField(13, ISODate.getDate(d)));
            m.set(14,expDate);
            m.set(new ISOField(15, ISODate.getDate(d)));
            m.set(18, "6014");
            m.set(22, "051");
            m.set(23, field23); //"001");
            m.set(25, "00");
            m.set(26, "04"); //"06");
            m.set(28, "C00000000");
            m.set(32,  "111129"); //  "111111");
            //track2Data = track2Data.replace('=', 'D');
            m.set(35,  track2Data2); // track2Data); //pan +  "=" + expDate + "226" +  "19123451");
            m.set(37, rrn);
            m.set(40, serviceCode) ;//"601"); // "221");
            m.set(41,  terminalId) ; // "2HIG0106");
            m.set(42,  cardAcceptorId) ;// "2HIGP010000P010");
            m.set(43,  cardAcceptorLocation) ; // "2HIGP010 PHLEX LAGOS                LANG");
            m.set(49, "566");
            //byte[] pinBytes  = ISOUtil.hex2byte(pinBlock);
            if(pinBlock.length() > 16)
                pinBlock = pinBlock.substring(0,16);

           // m.set(52,pinBlock); // pinBytes);
            Log.d(TAG,"field 555:" + field55);

            //m.set(55,PinBlockEncryptionUtil.EncryptMessage(field55,zmk));
            String f60 = "010085C24300148041Meter Number=12.87001001.Acct=1234567890.Phone=" + mobileNo;
            //	String f60 = "010085C24300148041Meter Number=12.87001003.Acct=1234567890.Phone=" + mobileNo;
			m.set(56,"1510");
           // m.set(60, f60);
            //	m.set(62,"00698WD0101333" + mobileNo);
            //m.set(98, "High   Street   MFB      ");
            //m.set(100, "506180");

            // m.set(103,"0001189745");
            m.set(103,"87001001");
            m.set(123, "510101513344101");
            String hexData = field55;  //ISOUtil.hexString(field55.getBytes());

            //m.set("127.25", field55); // PinBlockEncryptionUtil.EncryptMessage(hexData,zmk));

			ISOMsg inner = new ISOMsg(127);
				inner.set(2,"000000000400");
				inner.set(3,"                        001156001156            ");
				inner.set(25,field55);
			    m.set(inner);

			//new GenericPackager("C:\\JAVA\\jpos-1.7.0\\jpos-1.7.0\\cfg\\packager\\postpack.xml"); // PosPackager());   //ISO87APackager())

           // m.set(128, new String(new byte[]{0x0}));

            String f128 = generateHashForIsoMsg2(m, tsk);
            //m.set(128, f128);

           // String packData = new String(m.pack());

           // Log.d(TAG,"ISO-PACK-PURCHASE:  " + packData);

        } catch (Exception ex) {
            ex.printStackTrace();
        }
        return m;
    }


	public ISOMsg CreatePurchaseMessageUPSLNew(TranNetInfo tInfoc, String[] tparams,String zmk, Context ctx) {
		Date d = new Date();

		ISOMsg m = new ISOMsg();
		try {
			InputStream is = ctx.getAssets().open("postpack.xml");

			GenericPackager packager = new GenericPackager(is);
			m.setPackager(packager);


			String mobileNo = tInfoc.getMobileNo();
			m.setMTI("0200");

			//String cdx = cardNo + "|" + cardName + "|" + expDate + "|" + track2 + "|" + track1|tlv;
			//tranInfo.setBillRefNo(cdx);
			//XStream xs = new XStream();
			//LoggingUtil.DebugInfo("XML:: " + xs.toXML(tInfoc));



			String[] cds = OtaUtility.tokenize(tInfoc.getBillRefNo(), "|");


			//String[] cds = tokenize(tInfo.getCardData(), "|");
			String pan =  cds[0]; // ""; // "";
			//String pin = "";
			String track2Data =  cds[3]; // "";
			String field55 = cds[4];
			String field23 = cds[5];
			String accType = cds[6];
			String accx = "00";
			if(accType.equals("1"))
				accx ="20";
			else if(accType.equals("2"))
				accx ="10";
			else if(accType.equals("3"))
				accx ="30";
			field23 = ISOUtil.padleft(field23, 3, '0');
			String tData2 = OtaUtility.tokenize(track2Data, "=")[1];
			String expDate = tData2.substring(0,4);
			String serviceCode =tData2.substring(4,7);

			String track2Data2 = track2Data; // + "10";//
			track2Data2 = track2Data2.replace("&#0;", "").trim();
			if(track2Data2.length() > 37)
				track2Data2 = track2Data2.substring(0,37);
			//Settings.tokenize(track2Data, "=")[0] + "=" + expDate + serviceCode ;

			double amt = tInfoc.getAmount();

			String tsk = tparams[3];  //termInfo.getTsk();
			//String serverIP = tparams[6];
			//int port = Integer.parseInt(tparams[7]);
			String terminalId = tparams[0];
			String cardAcceptorId = tparams[5];
			String cardAcceptorLocation = tparams[8];

			String rrn = tInfoc.getExternalRefNo().substring(0,12);
			String stan = tInfoc.getExternalRefNo().substring(12);

			String pinBlock = tInfoc.getCardData(); // PinBlockEncryptionUtil.GenerateISO0Format0PinBlock(pan, pin);

			m.set(2, pan);
			m.set(3, "001000");
			// m.set(3, "00" + accx + "00");  //Purchase

			//m.set(3, "01" + accx + "00");  //Cash Advance
			//m.set(3, "09" + accx + "00");  //Purchase with Cash back
			//m.set(3, "20" + accx + "00");  //Refund

			//m.set(3, "00" + accx + "00");
			Long amts = new BigDecimal(amt * 100).longValue();
			String amt3 = ISOUtil.padleft(Long.toString(amts), 12, '0');
			m.set(4, amt3);

			Date date = new Date();
			String DATE_FORMAT = "MMddHHmmss"; //""MMdd-yyyy hh:mm:ss";
			SimpleDateFormat sdf = new SimpleDateFormat(DATE_FORMAT);
			String dx = sdf.format(date);
			System.out.println("Today is " + dx);
			m.set(7, dx);  //"0327133744");  //MMDDhhmmss
			m.set(11, stan); //new ISOField(11,
			// ISOUtil.zeropad(new Integer(seq.get("traceno")).toString(), 6)));
			m.set(new ISOField(12, ISODate.getTime(d)));
			m.set(new ISOField(13, ISODate.getDate(d)));
			m.set(14,expDate);
			m.set(new ISOField(15, ISODate.getDate(d)));
			m.set(18, "6014");
			m.set(22, "051");
			m.set(23, field23); //"001");
			m.set(25, "00");
			m.set(26, "04"); //"06");
			m.set(28, "C00000000");
			m.set(32,  "111129"); //  "111111");
			//track2Data = track2Data.replace('=', 'D');
			m.set(35,  track2Data2); // track2Data); //pan +  "=" + expDate + "226" +  "19123451");
			m.set(37, rrn);
			m.set(40, serviceCode) ;//"601"); // "221");
			m.set(41,  terminalId) ; // "2HIG0106");
			m.set(42,  cardAcceptorId) ;// "2HIGP010000P010");
			m.set(43,  cardAcceptorLocation) ; // "2HIGP010 PHLEX LAGOS                LANG");
			m.set(49, "566");
			//byte[] pinBytes  = ISOUtil.hex2byte(pinBlock);
			if(pinBlock.length() > 16)
				pinBlock = pinBlock.substring(0,16);

			// m.set(52,pinBlock); // pinBytes);
			Log.d(TAG,"field 555:" + field55);

			//m.set(55,PinBlockEncryptionUtil.EncryptMessage(field55,zmk));
			String f60 = "010085C24300148041Meter Number=12.87001001.Acct=1234567890.Phone=" + mobileNo;
			//	String f60 = "010085C24300148041Meter Number=12.87001003.Acct=1234567890.Phone=" + mobileNo;
			m.set(56,"1510");
			// m.set(60, f60);
			//	m.set(62,"00698WD0101333" + mobileNo);
			//m.set(98, "High   Street   MFB      ");
			//m.set(100, "506180");

			// m.set(103,"0001189745");
			m.set(103,"87001001");
			m.set(123, "510101513344101");
			String hexData = field55;  //ISOUtil.hexString(field55.getBytes());

			//m.set("127.25", field55); // PinBlockEncryptionUtil.EncryptMessage(hexData,zmk));

			ISOMsg inner = new ISOMsg(127);
			inner.set(2,"0106200448002004480106200448");
			inner.set(3,"                        001156001156            ");

			m.set("127.2", "0106200448002004480106200448");
			m.set("127.3", "                        200448200448");
			m.set("127.13", "     000000   566");
			m.set("127.20", "19800106");

			//"<?xml version=\"1.0\" encoding=\"utf-8\"?><IccData><IccRequest>" +
				//	"<AmountAuthorized>000000000210</AmountAuthorized><AmountOther>000000000000</AmountOther><ApplicationInterchangeProfile>3900</ApplicationInterchangeProfile><ApplicationTransactionCounter>0076</ApplicationTransactionCounter><Cryptogram>C7ADFF959253C60D</Cryptogram><CryptogramInformationData>80</CryptogramInformationData><CvmResults>410302</CvmResults><IssuerApplicationData>0110A50003020000000000000000000000FF</IssuerApplicationData><TerminalCapabilities>E0F8C8</TerminalCapabilities><TerminalCountryCode>566</TerminalCountryCode><TerminalType>22</TerminalType><TerminalVerificationResult>0480000000</TerminalVerificationResult><TransactionCurrencyCode>566</TransactionCurrencyCode><TransactionDate>210518</TransactionDate><TransactionType>00</TransactionType><UnpredictableNumber>00ABDB62</UnpredictableNumber></IccRequest></IccData>6008->
			//if (m.hasField(55)) {
				TLVList tlv = new TLVList();
				tlv.unpack( field55.getBytes()); //m.getBytes(55));
				m.set("127.25", buildRequestICCData(tlv, m));
				//inner.unset(55);
			//}
			//inner.set(25,field55);
			//m.set(inner);

			//new GenericPackager("C:\\JAVA\\jpos-1.7.0\\jpos-1.7.0\\cfg\\packager\\postpack.xml"); // PosPackager());   //ISO87APackager())

			// m.set(128, new String(new byte[]{0x0}));

			String f128 = generateHashForIsoMsg2(m, tsk);
			//m.set(128, f128);

			// String packData = new String(m.pack());

			// Log.d(TAG,"ISO-PACK-PURCHASE:  " + packData);

		} catch (Exception ex) {
			ex.printStackTrace();
		}
		return m;
	}


	private String buildRequestICCData(TLVList tlv, ISOMsg isoMsg) {

		StringBuilder sb = new StringBuilder();

		sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
		sb.append("<IccData><IccRequest>");

		String type = isoMsg.getString(3).substring(0,2);
		//for BI override
		if("31".equals(type)) {
			sb.append(String.format("<AmountAuthorized>%s</AmountAuthorized>", "000000000000"));
		} else {
			if (tlv.hasTag(0x9F02))
				sb.append(String.format("<AmountAuthorized>%s</AmountAuthorized>", tlv.getString(0x9F02)));
		}


		if (tlv.hasTag(0x9F03))
			sb.append(String.format("<AmountOther>%s</AmountOther>", tlv.getString(0x9F03)));

		if (tlv.hasTag(0x4F))
			sb.append(String.format("<ApplicationIdentifier>%s</ApplicationIdentifier>", tlv.getString(0x4F)));

		if (tlv.hasTag(0x82))
			sb.append(String.format("<ApplicationInterchangeProfile>%s</ApplicationInterchangeProfile>", tlv.getString(0x82)));

		if (tlv.hasTag(0x9F36))
			sb.append(String.format("<ApplicationTransactionCounter>%s</ApplicationTransactionCounter>", tlv.getString(0x9F36)));

		if (tlv.hasTag(0x9F07))
			sb.append(String.format("<ApplicationUsageControl>%s</ApplicationUsageControl>", tlv.getString(0x9F07)));

		if (tlv.hasTag(0x9F26))
			sb.append(String.format("<Cryptogram>%s</Cryptogram>", tlv.getString(0x9F26)));

		if (tlv.hasTag(0x9F27))
			sb.append(String.format("<CryptogramInformationData>%s</CryptogramInformationData>", tlv.getString(0x9F27)));

		if (tlv.hasTag(0x8E))
			sb.append(String.format("<CvmList>%s</CvmList>", tlv.getString(0x8E)));

		if (tlv.hasTag(0x9F34))
			sb.append(String.format("<CvmResults>%s</CvmResults>", tlv.getString(0x9F34)));

		if (tlv.hasTag(0x9F1E))
			sb.append(String.format("<InterfaceDeviceSerialNumber>%s</InterfaceDeviceSerialNumber>", tlv.getString(0x9F1E)));

		if (tlv.hasTag(0x9F10))
			sb.append(String.format("<IssuerApplicationData>%s</IssuerApplicationData>", tlv.getString(0x9F10)));

		if (tlv.hasTag(0x9F08))
			sb.append(String.format("<TerminalApplicationVersionNumber>%s</TerminalApplicationVersionNumber>", tlv.getString(0x9F08)));

		if (tlv.hasTag(0x9F33))
			sb.append(String.format("<TerminalCapabilities>%s</TerminalCapabilities>", tlv.getString(0x9F33)));

		if (tlv.hasTag(0x9F1A))
			sb.append(String.format("<TerminalCountryCode>%s</TerminalCountryCode>", tlv.getString(0x9F1A)));

		if (tlv.hasTag(0x9F35))
			sb.append(String.format("<TerminalType>%s</TerminalType>", tlv.getString(0x9F35)));

		if (tlv.hasTag(0x95))
			sb.append(String.format("<TerminalVerificationResult>%s</TerminalVerificationResult>", tlv.getString(0x95)));

		if (tlv.hasTag(0x9F53))
			sb.append(String.format("<TransactionCategoryCode>%s</TransactionCategoryCode>", tlv.getString(0x9F53)));

		if (tlv.hasTag(0x5F2A))
			sb.append(String.format("<TransactionCurrencyCode>%s</TransactionCurrencyCode>", tlv.getString(0x5F2A)));

		if (tlv.hasTag(0x9A))
			sb.append(String.format("<TransactionDate>%s</TransactionDate>", tlv.getString(0x9A)));

		appendICCTag(sb, tlv, 0x9F41, "TransactionSequenceCounter");
		//for BI override
		if("31".equals(type)) {
			appendICCTag(sb, "00", "TransactionType");
		} else {
			appendICCTag(sb, tlv, 0x9C, "TransactionType");
		}

		if (tlv.hasTag(0x9F37))
			sb.append(String.format("<UnpredictableNumber>%s</UnpredictableNumber>", tlv.getString(0x9F37)));

		sb.append("</IccRequest></IccData>");

		return sb.toString();
	}

	private static void appendICCTag(StringBuilder sb, TLVList tlv, int tag, String elementName) {

		if (tlv.hasTag(tag))
			sb.append(String.format("<%s>%s</%s>",
					elementName, tlv.getString(tag), elementName));
	}
	private static void appendICCTag(StringBuilder sb, String value, String elementName) {

		if (value!=null)
			sb.append(String.format("<%s>%s</%s>",
					elementName, value, elementName));
	}

	public ISOMsg CreatePayattitudeMessage(TranNetInfo tInfoc, TermParamInfo tparams) { // String[] tparams, String posAccountUpsl) {
		Date d = new Date();

		ISOMsg m = new ISOMsg();
		try {

			String mobileNo = tInfoc.getMobileNo();
			m.setMTI("0200");

			//String cdx = cardNo + "|" + cardName + "|" + expDate + "|" + track2 + "|" + track1|tlv;
			//tranInfo.setBillRefNo(cdx);
			//XStream xs = new XStream();
			//LoggingUtil.DebugInfo("XML:: " + xs.toXML(tInfoc));



			//String[] cds = OtaUtility.tokenize(tInfoc.getBillRefNo(), "|");


			//String[] cds = tokenize(tInfo.getCardData(), "|");
			//String pan =  cds[0]; // ""; // "";
			//String pin = "";
			/*String track2Data =  cds[3]; // "";
			String field55 = cds[4];
			String field23 = cds[5];
			String accType = cds[6];
			String accx = "00";
			if(accType.equals("1"))
				accx ="20";
			else if(accType.equals("2"))
				accx ="10";
			else if(accType.equals("3"))
				accx ="30";
			field23 = ISOUtil.padleft(field23, 3, '0');
			String tData2 = OtaUtility.tokenize(track2Data, "=")[1];
			String expDate = tData2.substring(0,4);
			String serviceCode =tData2.substring(4,7);

			String track2Data2 = track2Data; // + "10";//
			track2Data2 = track2Data2.replace("&#0;", "").trim();
			if(track2Data2.length() > 37)
				track2Data2 = track2Data2.substring(0,37);*/
			//Settings.tokenize(track2Data, "=")[0] + "=" + expDate + serviceCode ;

			double amt = tInfoc.getAmount();



			String tsk = tparams.getTsk();// tparams[3];  //termInfo.getTsk();
			//String serverIP = tparams[6];
			//int port = Integer.parseInt(tparams[7]);
			String terminalId = tparams.getTerminalId(); // tparams[0];
			String cardAcceptorId = tparams.getCardAcceptorId(); // tparams[5];
			String cardAcceptorLocation = tparams.getCardAcceptionLocation();// tparams[8];

			String rrn = tInfoc.getExternalRefNo().substring(0,12);
			String stan = tInfoc.getExternalRefNo().substring(12);

			String pinBlock = tInfoc.getCardData(); // PinBlockEncryptionUtil.GenerateISO0Format0PinBlock(pan, pin);

			m.set(2, "9501000000000001") ; //pan);
			m.set(3, "010000"); // + accx + "00");
			Long amts = new BigDecimal(amt * 100).longValue();
			String amt3 = ISOUtil.padleft(Long.toString(amts), 12, '0');
			m.set(4, amt3);

			Date date = new Date();
			String DATE_FORMAT = "MMddHHmmss"; //""MMdd-yyyy hh:mm:ss";
			SimpleDateFormat sdf = new SimpleDateFormat(DATE_FORMAT);
			String dx = sdf.format(date);
			System.out.println("Today is " + dx);
			m.set(7, dx);  //"0327133744");  //MMDDhhmmss
			m.set(11, stan); //new ISOField(11,
			// ISOUtil.zeropad(new Integer(seq.get("traceno")).toString(), 6)));
			m.set(new ISOField(12, ISODate.getTime(d)));
			m.set(new ISOField(13, ISODate.getDate(d)));
			m.set(14, "2512"); //expDate);
			//m.set(new ISOField(15, ISODate.getDate(d)));
			m.set(18, "6014");
			m.set(22, "051");
			m.set(23,  "002") ; //field23); //"001");
			m.set(25, "00");
			m.set(26, "04"); //"06");
			m.set(28, "C00000000");
			m.set(32,  "111129"); //  "111111");
			//track2Data = track2Data.replace('=', 'D');
			m.set(35, "9501000000000001D3012"); // track2Data2); // track2Data); //pan +  "=" + expDate + "226" +  "19123451");
			m.set(37, rrn);
			m.set(40,  "206") ; //serviceCode) ;//"601"); // "221");
			m.set(41,  terminalId) ; // "2HIG0106");
			m.set(42,  cardAcceptorId) ;// "2HIGP010000P010");
			m.set(43,  cardAcceptorLocation) ; // "2HIGP010 PHLEX LAGOS                LANG");
			m.set(49, "566");
			//byte[] pinBytes  = ISOUtil.hex2byte(pinBlock);
			//if(pinBlock.length() > 16)
				//pinBlock = pinBlock.substring(0,16);

			//m.set(52,pinBlock); // pinBytes);
			//m.set(55,field55);

            String posAccountUpsl = tparams.getPoolAccount();

            if(posAccountUpsl == null || posAccountUpsl.equals(""))
                posAccountUpsl ="0001451023";

			//if(posAccountUpsl == null || posAccountUpsl.equals(""))
				//posAccountUpsl ="1234567890";

			//posAccountUpsl = "1774691015";

			//String f60 = "010085C24300148041Meter Number=12.87001004.Acct=" + posAccountUpsl + ".Phone=" + mobileNo;


           // m.set(60, "010083K07226448041Static Number=12.87001001.Acct=" + posAccountUpsl + ".Phone=" + mobileNo);
			m.set(60, "010083K07226448041Static Number=12.87001004.Acct=" + posAccountUpsl + ".Phone=" + mobileNo);


			//m.set(60, "010083K07226448041Static Number=12.57001214.Acct=0001451023.Phone=" + mobileNo);
			m.set(62,"00698WD0101333" + mobileNo);
			//m.set(98, "High   Street   MFB      ");
			//m.set(100, "506180");

			// m.set(103,"0001189745");
			m.set(123, "510101513344101");

			m.set(128, new String(new byte[]{0x0}));

			String f128 = generateHashForIsoMsg(m, tsk);
			m.set(128, f128);

		} catch (Exception ex) {
			ex.printStackTrace();
		}
		return m;
	}

	public ISOMsg CreatePurchaseReversalMessage(TranNetInfo tInfoc, String[] tparams, String dx) {
		Date d = new Date();

		ISOMsg m = new ISOMsg();
		try {

			String mobileNo = tInfoc.getMobileNo();
			m.setMTI("0420");

			//String cdx = cardNo + "|" + cardName + "|" + expDate + "|" + track2 + "|" + track1|tlv;
			//tranInfo.setBillRefNo(cdx);
			//XStream xs = new XStream();
			//LoggingUtil.DebugInfo("XML:: " + xs.toXML(tInfoc));



			String[] cds = OtaUtility.tokenize(tInfoc.getBillRefNo(), "|");


			//String[] cds = tokenize(tInfo.getCardData(), "|");
			String pan =  cds[0]; // ""; // "";
			//String pin = "";
			String track2Data =  cds[3]; // "";
			String field55 = cds[4];
			String field23 = cds[5];
			String accType = cds[6];
			String accx = "00";
			if(accType.equals("1"))
				accx ="20";
			else if(accType.equals("2"))
				accx ="10";
			else if(accType.equals("3"))
				accx ="30";
			field23 = ISOUtil.padleft(field23, 3, '0');
			String tData2 = OtaUtility.tokenize(track2Data, "=")[1];
			String expDate = tData2.substring(0,4);
			String serviceCode =tData2.substring(4,7);

			String track2Data2 = track2Data; // + "10";//
			track2Data2 = track2Data2.replace("&#0;", "").trim();
			if(track2Data2.length() > 37)
				track2Data2 = track2Data2.substring(0,37);
			//Settings.tokenize(track2Data, "=")[0] + "=" + expDate + serviceCode ;

			double amt = tInfoc.getAmount();



			String tsk = tparams[3];  //termInfo.getTsk();
			//String serverIP = tparams[6];
			//int port = Integer.parseInt(tparams[7]);
			String terminalId = tparams[0];
			String cardAcceptorId = tparams[5];
			String cardAcceptorLocation = tparams[8];

			String rrn = tInfoc.getExternalRefNo().substring(0,12);
			String stan = tInfoc.getExternalRefNo().substring(12);

			String pinBlock = tInfoc.getCardData(); // PinBlockEncryptionUtil.GenerateISO0Format0PinBlock(pan, pin);

			m.set(2, pan);
			//m.set(3, "001000");
			m.set(3, "01" + accx + "00");
			//m.set(3, "00" + accx + "00");
			Long amts = new BigDecimal(amt * 100).longValue();
			String amt3 = ISOUtil.padleft(Long.toString(amts), 12, '0');
			m.set(4, amt3);

			//Date date = new Date();
			//String DATE_FORMAT = "MMddHHmmss"; //""MMdd-yyyy hh:mm:ss";
			//SimpleDateFormat sdf = new SimpleDateFormat(DATE_FORMAT);
			//String dx = sdf.format(date);
			System.out.println("Today is " + dx);
			m.set(7, dx);  //"0327133744");  //MMDDhhmmss
			m.set(11, stan); //new ISOField(11,
			// ISOUtil.zeropad(new Integer(seq.get("traceno")).toString(), 6)));
			m.set(new ISOField(12, ISODate.getTime(d)));
			m.set(new ISOField(13, ISODate.getDate(d)));
			m.set(14,expDate);
			//m.set(new ISOField(15, ISODate.getDate(d)));
			m.set(18, "6014");
			m.set(22, "051");
			m.set(23, field23); //"001");
			m.set(25, "00");
			m.set(26, "04"); //"06");
			m.set(28, "C00000000");
			//m.set(32,  "111129"); //  "111111");
			m.set(32,  "111129"); //  "111111");
			m.set(33,  "111111");
			//track2Data = track2Data.replace('=', 'D');
			m.set(35,  track2Data2); // track2Data); //pan +  "=" + expDate + "226" +  "19123451");
			m.set(37, rrn);
			m.set(40, serviceCode) ;//"601"); // "221");
			m.set(41,  terminalId) ; // "2HIG0106");
			m.set(42,  cardAcceptorId) ;// "2HIGP010000P010");
			m.set(43,  cardAcceptorLocation) ; // "2HIGP010 PHLEX LAGOS                LANG");
			m.set(49, "566");
			//byte[] pinBytes  = ISOUtil.hex2byte(pinBlock);
			if(pinBlock.length() > 16)
				pinBlock = pinBlock.substring(0,16);

			m.set(52,pinBlock); // pinBytes);
			m.set(55,field55);
			String f60 = "010085C24300148041Meter Number=12.87001001.Acct=1234567890.Phone=" + mobileNo;
			//	String f60 = "010085C24300148041Meter Number=12.87001003.Acct=1234567890.Phone=" + mobileNo;
			m.set(60, f60);
			//	m.set(62,"00698WD0101333" + mobileNo);
			//m.set(98, "High   Street   MFB      ");
			//m.set(100, "506180");

			// m.set(103,"0001189745");

			String f90 ="0200" +  stan + dx + "00000" + m.getString(32) + "00000" + m.getString(33);
			m.set(90, f90);
			String f95 = m.getString(4) + m.getString(4) + "D00000000" + "C00000000";
			m.set(95, f95);

			m.set(123, "510101513344101");

			m.set(128, new String(new byte[]{0x0}));

			String f128 = generateHashForIsoMsg(m, tsk);
			m.set(128, f128);

		} catch (Exception ex) {
			ex.printStackTrace();
		}
		return m;
	}

    public ISOMsg CreatePreAuthSaleCompletionMessage(TranNetInfo tInfoc, String[] tparams, String dx) {
        Date d = new Date();

        ISOMsg m = new ISOMsg();
        try {

            String mobileNo = tInfoc.getMobileNo();
            m.setMTI("0220");

            //String cdx = cardNo + "|" + cardName + "|" + expDate + "|" + track2 + "|" + track1|tlv;
            //tranInfo.setBillRefNo(cdx);
            //XStream xs = new XStream();
            //LoggingUtil.DebugInfo("XML:: " + xs.toXML(tInfoc));



            String[] cds = OtaUtility.tokenize(tInfoc.getBillRefNo(), "|");

            //String[] cds = tokenize(tInfo.getCardData(), "|");
            String pan =  cds[0]; // ""; // "";
            //String pin = "";
            String track2Data =  cds[3]; // "";
            String field55 = cds[4];
            String field23 = cds[5];
            String accType = cds[6];
            String accx = "00";
            if(accType.equals("1"))
                accx ="20";
            else if(accType.equals("2"))
                accx ="10";
            else if(accType.equals("3"))
                accx ="30";
            field23 = ISOUtil.padleft(field23, 3, '0');
            String tData2 = OtaUtility.tokenize(track2Data, "=")[1];
            String expDate = tData2.substring(0,4);
            String serviceCode =tData2.substring(4,7);

            String track2Data2 = track2Data; // + "10";//
            track2Data2 = track2Data2.replace("&#0;", "").trim();
            if(track2Data2.length() > 37)
                track2Data2 = track2Data2.substring(0,37);
            //Settings.tokenize(track2Data, "=")[0] + "=" + expDate + serviceCode ;

            double amt = tInfoc.getAmount();



            String tsk = tparams[3];  //termInfo.getTsk();
            //String serverIP = tparams[6];
            //int port = Integer.parseInt(tparams[7]);
            String terminalId = tparams[0];
            String cardAcceptorId = tparams[5];
            String cardAcceptorLocation = tparams[8];

            String rrn = tInfoc.getExternalRefNo().substring(0,12);
            String stan = tInfoc.getExternalRefNo().substring(12);

            String pinBlock = tInfoc.getCardData(); // PinBlockEncryptionUtil.GenerateISO0Format0PinBlock(pan, pin);

            m.set(2, pan);
            m.set(3, "610000");
            //m.set(3, "01" + accx + "00");
            //m.set(3, "00" + accx + "00");
            Long amts = new BigDecimal(amt * 100).longValue();
            String amt3 = ISOUtil.padleft(Long.toString(amts), 12, '0');
            m.set(4, amt3);

            //Date date = new Date();
            //String DATE_FORMAT = "MMddHHmmss"; //""MMdd-yyyy hh:mm:ss";
            //SimpleDateFormat sdf = new SimpleDateFormat(DATE_FORMAT);
            //String dx = sdf.format(date);
            System.out.println("Today is " + dx);
            m.set(7, dx);  //"0327133744");  //MMDDhhmmss
            m.set(11, stan); //new ISOField(11,
            // ISOUtil.zeropad(new Integer(seq.get("traceno")).toString(), 6)));
            m.set(new ISOField(12, ISODate.getTime(d)));
            m.set(new ISOField(13, ISODate.getDate(d)));
            m.set(14,expDate);
            //m.set(new ISOField(15, ISODate.getDate(d)));
            m.set(18, "6014");
            m.set(22, "051");
            m.set(23, field23); //"001");
            m.set(25, "00");
            m.set(26, "04"); //"06");
            m.set(28, "C00000000");
            //m.set(32,  "111129"); //  "111111");
            m.set(32,  "111129"); //  "111111");
            m.set(33,  "111111");
            //track2Data = track2Data.replace('=', 'D');
            m.set(35,  track2Data2); // track2Data); //pan +  "=" + expDate + "226" +  "19123451");
            m.set(37, rrn);
            m.set(40, serviceCode) ;//"601"); // "221");
            m.set(41,  terminalId) ; // "2HIG0106");
            m.set(42,  cardAcceptorId) ;// "2HIGP010000P010");
            m.set(43,  cardAcceptorLocation) ; // "2HIGP010 PHLEX LAGOS                LANG");
            m.set(49, "566");
            //byte[] pinBytes  = ISOUtil.hex2byte(pinBlock);
            if(pinBlock.length() > 16)
                pinBlock = pinBlock.substring(0,16);

            m.set(52,pinBlock); // pinBytes);
            m.set(55,field55);
            String f60 = "010085C24300148041Meter Number=12.87001001.Acct=1234567890.Phone=" + mobileNo;
            //	String f60 = "010085C24300148041Meter Number=12.87001003.Acct=1234567890.Phone=" + mobileNo;
            m.set(60, f60);
            //	m.set(62,"00698WD0101333" + mobileNo);
            //m.set(98, "High   Street   MFB      ");
            //m.set(100, "506180");

            // m.set(103,"0001189745");

            String f90 ="0100" +  stan + dx + "00000" + m.getString(32) + "00000" + m.getString(33);
            m.set(90, f90);
            String f95 = m.getString(4) + m.getString(4) + "D00000000" + "C00000000";
            m.set(95, f95);

            m.set(123, "510101513344101");

            m.set(128, new String(new byte[]{0x0}));

            String f128 = generateHashForIsoMsg(m, tsk);
            m.set(128, f128);

        } catch (Exception ex) {
            ex.printStackTrace();
        }
        return m;
    }

	public ISOMsg CreateBalanceInquiryMessage(TranNetInfo tInfoc, String[] tparams) {
		Date d = new Date();

		ISOMsg m = new ISOMsg();
		try {

			String mobileNo = tInfoc.getMobileNo();
			m.setMTI("0100");

			//String cdx = cardNo + "|" + cardName + "|" + expDate + "|" + track2 + "|" + track1|tlv;
			//tranInfo.setBillRefNo(cdx);
			//XStream xs = new XStream();
			//LoggingUtil.DebugInfo("XML:: " + xs.toXML(tInfoc));



			String[] cds = OtaUtility.tokenize(tInfoc.getBillRefNo(), "|");


			//String[] cds = tokenize(tInfo.getCardData(), "|");
			String pan =  cds[0]; // ""; // "";
			//String pin = "";
			String track2Data =  cds[3]; // "";
			String field55 = cds[4];
			String field23 = cds[5];
			String accType = cds[6];
			String accx = "00";
			if(accType.equals("1"))
				accx ="20";
			else if(accType.equals("2"))
				accx ="10";
			else if(accType.equals("3"))
				accx ="30";
			field23 = ISOUtil.padleft(field23, 3, '0');
			String tData2 = OtaUtility.tokenize(track2Data, "=")[1];
			String expDate = tData2.substring(0,4);
			String serviceCode =tData2.substring(4,7);

			String track2Data2 = track2Data; // + "10";//
			track2Data2 = track2Data2.replace("&#0;", "").trim();
			if(track2Data2.length() > 37)
				track2Data2 = track2Data2.substring(0,37);
			//Settings.tokenize(track2Data, "=")[0] + "=" + expDate + serviceCode ;

			double amt = tInfoc.getAmount();



			String tsk = tparams[3];  //termInfo.getTsk();
			//String serverIP = tparams[6];
			//int port = Integer.parseInt(tparams[7]);
			String terminalId = tparams[0];
			String cardAcceptorId = tparams[5];
			String cardAcceptorLocation = tparams[8];

			String rrn = tInfoc.getExternalRefNo().substring(0,12);
			String stan = tInfoc.getExternalRefNo().substring(12);

			String pinBlock = tInfoc.getCardData(); // PinBlockEncryptionUtil.GenerateISO0Format0PinBlock(pan, pin);

			m.set(2, pan);
			//m.set(3, "001000");
			m.set(3, "31" + "0000");
			//m.set(3, "00" + accx + "00");
			Long amts = new BigDecimal(amt * 100).longValue();
			String amt3 = ISOUtil.padleft(Long.toString(amts), 12, '0');
			m.set(4, amt3);

			Date date = new Date();
			String DATE_FORMAT = "MMddHHmmss"; //""MMdd-yyyy hh:mm:ss";
			SimpleDateFormat sdf = new SimpleDateFormat(DATE_FORMAT);
			String dx = sdf.format(date);
			System.out.println("Today is " + dx);
			m.set(7, dx);  //"0327133744");  //MMDDhhmmss
			m.set(11, stan); //new ISOField(11,
			// ISOUtil.zeropad(new Integer(seq.get("traceno")).toString(), 6)));
			m.set(new ISOField(12, ISODate.getTime(d)));
			m.set(new ISOField(13, ISODate.getDate(d)));
			m.set(14,expDate);
			//m.set(new ISOField(15, ISODate.getDate(d)));
			m.set(18, "6014");
			m.set(22, "051");
			m.set(23, field23); //"001");
			m.set(25, "00");
			m.set(26, "04"); //"06");
			m.set(28, "C00000000");
			m.set(32,  "111129"); //  "111111");
			//track2Data = track2Data.replace('=', 'D');
			m.set(35,  track2Data2); // track2Data); //pan +  "=" + expDate + "226" +  "19123451");
			m.set(37, rrn);
			m.set(40, serviceCode) ;//"601"); // "221");
			m.set(41,  terminalId) ; // "2HIG0106");
			m.set(42,  cardAcceptorId) ;// "2HIGP010000P010");
			m.set(43,  cardAcceptorLocation) ; // "2HIGP010 PHLEX LAGOS                LANG");
			m.set(49, "566");
			//byte[] pinBytes  = ISOUtil.hex2byte(pinBlock);
			if(pinBlock.length() > 16)
				pinBlock = pinBlock.substring(0,16);

			m.set(52,pinBlock); // pinBytes);
			m.set(55,field55);
			String f60 = "010085C24300148041Meter Number=12.87001001.Acct=1234567890.Phone=" + mobileNo;
			//	String f60 = "010085C24300148041Meter Number=12.87001003.Acct=1234567890.Phone=" + mobileNo;
			m.set(60, f60);
			//	m.set(62,"00698WD0101333" + mobileNo);
			//m.set(98, "High   Street   MFB      ");
			//m.set(100, "506180");

			// m.set(103,"0001189745");
			m.set(123, "510101513344101");

			m.set(128, new String(new byte[]{0x0}));

			String f128 = generateHashForIsoMsg(m, tsk);
			m.set(128, f128);

		} catch (Exception ex) {
			ex.printStackTrace();
		}
		return m;
	}

	public ISOMsg CreatePurchaseMessageNIBSS(TranNetInfo tInfoc, TermParamInfo tparams)
	{
		return  new ISOMsg();
	}
    public ISOMsg CreatePurchaseMessageNIBSS(TranNetInfo tInfoc, String terminalId, String tsk, String cardAcceptorId, String cardAcceptorLocation, String isodt) {
       // Date d = new Date();

        ISOMsg m = new ISOMsg();
        try {

            String mobileNo = tInfoc.getMobileNo();
            m.setMTI("0200");

            //String cdx = cardNo + "|" + cardName + "|" + expDate + "|" + track2 + "|" + track1|tlv;
            //tranInfo.setBillRefNo(cdx);
            //XStream xs = new XStream();
            //LoggingUtil.DebugInfo("XML:: " + xs.toXML(tInfoc));

            String[] cds = OtaUtility.tokenize(tInfoc.getBillRefNo(), "|");


            //String[] cds = tokenize(tInfo.getCardData(), "|");
            String pan =  cds[0]; // ""; // "";
            //String pin = "";
            String track2Data =  cds[3]; // "";
            String field55 = cds[4];
            String field23 = cds[5];
            String accType = cds[6];
            String accx = "00";
            if(accType.equals("1"))
                accx ="20";
            else if(accType.equals("2"))
                accx ="10";
            else if(accType.equals("3"))
                accx ="30";
            field23 = ISOUtil.padleft(field23, 3, '0');
            String tData2 = OtaUtility.tokenize(track2Data, "=")[1];
            String expDate = tData2.substring(0,4);
            String serviceCode =tData2.substring(4,7);

            String track2Data2 = track2Data; // + "10";//
            track2Data2 = track2Data2.replace("&#0;", "").trim();
            if(track2Data2.length() > 37)
                track2Data2 = track2Data2.substring(0,37);
            //Settings.tokenize(track2Data, "=")[0] + "=" + expDate + serviceCode ;

            double amt = tInfoc.getAmount();



            //String tsk = tparams.getTsk(); // tparams[3];  //termInfo.getTsk();
            //String serverIP = tparams[6];
            //int port = Integer.parseInt(tparams[7]);
            //String terminalId = tparams.getTerminalId(); // tparams[0];
            //String cardAcceptorId = tparams.getCardAcceptorId(); // tparams[5];
            //String cardAcceptorLocation = tparams.getCardAcceptionLocation(); // tparams[8];

            String rrn = tInfoc.getExternalRefNo().substring(0,12);
            String stan = tInfoc.getExternalRefNo().substring(12);

            String pinBlock = tInfoc.getCardData(); // PinBlockEncryptionUtil.GenerateISO0Format0PinBlock(pan, pin);

            m.set(2, pan);
            //m.set(3, "001000");
            m.set(3, "00" + accx + "00");  //Purchase

            //m.set(3, "01" + accx + "00");  //Cash Advance
            //m.set(3, "09" + accx + "00");  //Purchase with Cash back
            //m.set(3, "20" + accx + "00");  //Refund

            //m.set(3, "00" + accx + "00");
            Long amts = new BigDecimal(amt * 100).longValue();
            String amt3 = ISOUtil.padleft(Long.toString(amts), 12, '0');
            m.set(4, amt3);

			String dx = isodt.substring(4);
			System.out.println("Today is " + dx);
			m.set(7, dx);  //"0327133744");  //MMDDhhmmss
			m.set(11, stan); //new ISOField(11,
			// ISOUtil.zeropad(new Integer(seq.get("traceno")).toString(), 6)));
			//m.set(new ISOField(12, ISODate.getTime(d)));
			//m.set(new ISOField(13, ISODate.getDate(d)));

			m.set(new ISOField(12, isodt.substring(8)));
			m.set(new ISOField(13, isodt.substring(4,8)));

            m.set(14,expDate);
            //m.set(new ISOField(15, ISODate.getDate(d)));
            m.set(18, "5011") ; //"6014");
            m.set(22, "051");
            m.set(23, field23); //"001");
            m.set(25, "00");
            m.set(26, "04"); //"06");
            m.set(28, "C00000000");
           // m.set(32,  "111129"); //  "111111");
			m.set(32,"100001");
            m.set(33,  "111111");

			track2Data2 = track2Data2.replace('=', 'D');
            m.set(35,  track2Data2); // track2Data); //pan +  "=" + expDate + "226" +  "19123451");
            m.set(37, rrn);
            m.set(40, serviceCode) ;//"601"); // "221");
            m.set(41,  terminalId) ; // "2HIG0106");
            m.set(42,  cardAcceptorId) ;// "2HIGP010000P010");
            m.set(43,  cardAcceptorLocation) ; // "2HIGP010 PHLEX LAGOS                LANG");
            m.set(49, "566");
            //byte[] pinBytes  = ISOUtil.hex2byte(pinBlock);
            if(pinBlock.length() > 16)
                pinBlock = pinBlock.substring(0,16);

            m.set(52,pinBlock); // pinBytes);
            m.set(55,field55);
            String f60 = "010085C24300148041Meter Number=12.87001001.Acct=1234567890.Phone=" + mobileNo;
            //	String f60 = "010085C24300148041Meter Number=12.87001003.Acct=1234567890.Phone=" + mobileNo;
           // m.set(60, f60);
            //	m.set(62,"00698WD0101333" + mobileNo);
            //m.set(98, "High   Street   MFB      ");
            //m.set(100, "506180");

            // m.set(103,"0001189745");
            m.set(123, "510101513344101");

            m.set(128, new String(new byte[]{0x0}));

            String f128 = generateHashForIsoMsg(m, tsk);
            m.set(128, f128);

        } catch (Exception ex) {
            ex.printStackTrace();
        }
        return m;
    }

	public ISOMsg CreatePurchaseMessageUPSL(TranNetInfo tInfoc, String terminalId, String tsk, String cardAcceptorId, String cardAcceptorLocation, String isodt,String posAccountUpsl) {

		return  CreatePurchaseMessageUPSL( tInfoc,  terminalId,  tsk,  cardAcceptorId,  cardAcceptorLocation,  isodt, posAccountUpsl,true) ;

		}

		public ISOMsg CreatePurchaseMessageUPSL(TranNetInfo tInfoc, String terminalId, String tsk, String cardAcceptorId, String cardAcceptorLocation, String isodt,String posAccountUpsl, boolean isOfflinePIN) {
		// Date d = new Date();

		ISOMsg m = new ISOMsg();
		try {

			String mobileNo = tInfoc.getMobileNo();
			m.setMTI("0200");

			//String cdx = cardNo + "|" + cardName + "|" + expDate + "|" + track2 + "|" + track1|tlv;
			//tranInfo.setBillRefNo(cdx);
			//XStream xs = new XStream();
			//LoggingUtil.DebugInfo("XML:: " + xs.toXML(tInfoc));

			String[] cds = OtaUtility.tokenize(tInfoc.getBillRefNo(), "|");


			//String[] cds = tokenize(tInfo.getCardData(), "|");
			String pan =  cds[0]; // ""; // "";
			//String pin = "";
			String track2Data =  cds[3]; // "";
			String field55 = cds[4];
			String field23 = cds[5];
			String accType = cds[6];
			String accx = "00";
			if(accType.equals("1"))
				accx ="20";
			else if(accType.equals("2"))
				accx ="10";
			else if(accType.equals("3"))
				accx ="30";
			field23 = ISOUtil.padleft(field23, 3, '0');
			String tData2 = OtaUtility.tokenize(track2Data, "=")[1];
			String expDate = tData2.substring(0,4);
			String serviceCode =tData2.substring(4,7);

			String track2Data2 = track2Data; // + "10";//
			track2Data2 = track2Data2.replace("&#0;", "").trim();
			if(track2Data2.length() > 37)
				track2Data2 = track2Data2.substring(0,37);
			//Settings.tokenize(track2Data, "=")[0] + "=" + expDate + serviceCode ;

			double amt = tInfoc.getAmount();



			//String tsk = tparams.getTsk(); // tparams[3];  //termInfo.getTsk();
			//String serverIP = tparams[6];
			//int port = Integer.parseInt(tparams[7]);
			//String terminalId = tparams.getTerminalId(); // tparams[0];
			//String cardAcceptorId = tparams.getCardAcceptorId(); // tparams[5];
			//String cardAcceptorLocation = tparams.getCardAcceptionLocation(); // tparams[8];

			String rrn = tInfoc.getExternalRefNo().substring(0,12);
			String stan = tInfoc.getExternalRefNo().substring(12);

			String pinBlock = tInfoc.getCardData(); // PinBlockEncryptionUtil.GenerateISO0Format0PinBlock(pan, pin);

			m.set(2, pan);
			//m.set(3, "001000");
			//m.set(3, "00" + accx + "00");  //Purchase
			m.set(3, "010000"); //UPSL

			//m.set(3, "01" + accx + "00");  //Cash Advance
			//m.set(3, "09" + accx + "00");  //Purchase with Cash back
			//m.set(3, "20" + accx + "00");  //Refund

			//m.set(3, "00" + accx + "00");
			Long amts = new BigDecimal(amt * 100).longValue();
			String amt3 = ISOUtil.padleft(Long.toString(amts), 12, '0');
			m.set(4, amt3);

			String dx = isodt.substring(4);
			System.out.println("Today is " + dx);
			m.set(7, dx);  //"0327133744");  //MMDDhhmmss
			m.set(11, stan); //new ISOField(11,
			// ISOUtil.zeropad(new Integer(seq.get("traceno")).toString(), 6)));
			//m.set(new ISOField(12, ISODate.getTime(d)));
			//m.set(new ISOField(13, ISODate.getDate(d)));

			m.set(new ISOField(12, isodt.substring(8)));
			m.set(new ISOField(13, isodt.substring(4,8)));

			m.set(14,expDate);
			//m.set(new ISOField(15, ISODate.getDate(d)));
			m.set(18, "6010");// 4");
			m.set(22, "051");
			m.set(23, field23); //"001");
			m.set(25, "00");
			m.set(26, "06"); //"06");
			m.set(28, "C00000000");
			m.set(32,  "111129"); //
			// m.set(32,  "111129"); //  "111111");

			//m.set(33,  "111111");

			//track2Data = track2Data.replace('=', 'D');
			m.set(35,  track2Data2); // track2Data); //pan +  "=" + expDate + "226" +  "19123451");
			m.set(37, rrn);
			m.set(40, serviceCode) ;//"601"); // "221");
			m.set(41,  terminalId) ; // "2HIG0106");
			m.set(42,  cardAcceptorId) ;// "2HIGP010000P010");
			Log.d(TAG, "Card acceptor id"+cardAcceptorId);
			m.set(43,  cardAcceptorLocation) ; // "2HIGP010 PHLEX LAGOS                LANG");
			m.set(49, "566");
			//byte[] pinBytes  = ISOUtil.hex2byte(pinBlock);
			if(!isOfflinePIN) {
				if (pinBlock.length() > 16)
					pinBlock = pinBlock.substring(0, 16);

				m.set(52, pinBlock); // pinBytes);
			}

			m.set(55,field55);
			String f60 = "010085C24300148041Meter Number=12.87001001.Acct=1234567890.Phone=" + mobileNo;
			if(posAccountUpsl == null || posAccountUpsl.equals(""))
				posAccountUpsl ="1453105168"; //0060846532";

			//posAccountUpsl = "1774691015";

			 f60 = "010085C24300148041Meter Number=12.87001004.Acct=" + posAccountUpsl + ".Phone=" + mobileNo;
			//	String f60 = "010085C24300148041Meter Number=12.87001003.Acct=1234567890.Phone=" + mobileNo;
			m.set(60, f60);

			//	m.set(62,"00698WD0101333" + mobileNo);
			//m.set(98, "High   Street   MFB      ");
			//m.set(100, "506180");

			// m.set(103,"0001189745");
			m.set(123, "510101513344101");

			m.set(128, new String(new byte[]{0x0}));

			String f128 = generateHashForIsoMsg(m, tsk);
			m.set(128, f128);

		} catch (Exception ex) {
			ex.printStackTrace();
		}
		return m;
	}


	public ISOMsg CreatePurchaseMessageREXNEW(TranNetInfo tInfoc, TermParamInfo tparams,int retry) { //, String posAccountUpsl) {
		Date d = new Date();

		ISOMsg m = new ISOMsg();
		try {

			String mobileNo = tInfoc.getMobileNo();
			m.setMTI("0200");

			//String cdx = cardNo + "|" + cardName + "|" + expDate + "|" + track2 + "|" + track1|tlv;
			//tranInfo.setBillRefNo(cdx);
			//XStream xs = new XStream();
			//LoggingUtil.DebugInfo("XML:: " + xs.toXML(tInfoc));



			String[] cds = OtaUtility.tokenize(tInfoc.getBillRefNo(), "|");


			//String[] cds = tokenize(tInfo.getCardData(), "|");
			String pan =  cds[0]; // ""; // "";
			//String pin = "";
			String track2Data =  cds[3]; // "";
			String field55 = cds[4];
			String field23 = cds[5];
			String accType = cds[6];
			String accx = "00";
			if(accType.equals("1"))
				accx ="20";
			else if(accType.equals("2"))
				accx ="10";
			else if(accType.equals("3"))
				accx ="30";
			field23 = ISOUtil.padleft(field23, 3, '0');
			String tData2 = OtaUtility.tokenize(track2Data, "=")[1];
			String expDate = tData2.substring(0,4);
			String serviceCode =tData2.substring(4,7);

			String track2Data2 = track2Data; // + "10";//
			track2Data2 = track2Data2.replace("&#0;", "").trim();
			if(track2Data2.length() > 37)
				track2Data2 = track2Data2.substring(0,37);
			//Settings.tokenize(track2Data, "=")[0] + "=" + expDate + serviceCode ;

			double amt = tInfoc.getAmount();



			String tsk = tparams.getTsk();// tparams[3];  //termInfo.getTsk();
			//String serverIP = tparams[6];
			//int port = Integer.parseInt(tparams[7]);
			String terminalId = tparams.getTerminalId(); // tparams[0];
			String cardAcceptorId = tparams.getCardAcceptorId(); // tparams[5];
			String cardAcceptorLocation = tparams.getCardAcceptionLocation();// tparams[8];

			String rrn = tInfoc.getExternalRefNo().substring(0,12);
			String stan = tInfoc.getExternalRefNo().substring(12);

			String pinBlock = tInfoc.getCardData(); // PinBlockEncryptionUtil.GenerateISO0Format0PinBlock(pan, pin);

			m.set(2, pan);
			//m.set(3, "001000");
			//m.set(3, "010000"); //added for UPSL

			m.set(3, "000000");
			//010000
			//m.set(3, "00" + accx + "00");  //Purchase

			//m.set(3, "01" + accx + "00");  //Cash Advance
			//m.set(3, "09" + accx + "00");  //Purchase with Cash back
			//m.set(3, "20" + accx + "00");  //Refund

			//m.set(3, "00" + accx + "00");
			Long amts = new BigDecimal(amt * 100).longValue();
			String amt3 = ISOUtil.padleft(Long.toString(amts), 12, '0');
			m.set(4, amt3);

			Date date = new Date();
			String DATE_FORMAT = "MMddHHmmss"; //""MMdd-yyyy hh:mm:ss";
			SimpleDateFormat sdf = new SimpleDateFormat(DATE_FORMAT);
			String dx = sdf.format(date);
			System.out.println("Today is " + dx);
			m.set(7, dx);  //"0327133744");  //MMDDhhmmss
			m.set(11, stan); //new ISOField(11,
			// ISOUtil.zeropad(new Integer(seq.get("traceno")).toString(), 6)));
			m.set(new ISOField(12, ISODate.getTime(d)));
			m.set(new ISOField(13, ISODate.getDate(d)));
			m.set(14,expDate);
			//m.set(new ISOField(15, ISODate.getDate(d)));
			m.set(18, "5251");// 4");
			m.set(22, "051");
			m.set(23, field23); //"001");
			m.set(25, "00");
			//m.set(26, "04"); //"06");
			//m.set(26, "06"); // Set Offline PIN
//			m.set(28, "C00000000");
			m.set(28, "D00000000");
			m.set(32,  "111130"); //  "111111");
			//track2Data = track2Data.replace('=', 'D');
			m.set(35,  track2Data2); // track2Data); //pan +  "=" + expDate + "226" +  "19123451");
			m.set(37, rrn);
			m.set(40, serviceCode) ;//"601"); // "221");
			m.set(41,  terminalId) ; // "2HIG0106");
			m.set(42,  cardAcceptorId) ;// "2HIGP010000P010");
			m.set(43,  cardAcceptorLocation) ; // "2HIGP010 PHLEX LAGOS                LANG");
			m.set(49, "566");
			//byte[] pinBytes  = ISOUtil.hex2byte(pinBlock);
			if(pinBlock.length() > 16)
				pinBlock = pinBlock.substring(0,16);
			if(retry > 0)
				m.set(52,pinBlock); // pinBytes);

			m.set(55,field55);
			//String f60 = "010085C24300148041Meter Number=12.87001001.Acct=1234567890.Phone=" + mobileNo;
			String posAccountUpsl = tparams.getPoolAccount();
			if(posAccountUpsl == null || posAccountUpsl.equals(""))
				posAccountUpsl ="1234567890";

			//posAccountUpsl = "1774691015";\
			m.set(59, terminalId +"-"+ rrn + "-" + dx);

//			String f60 = "010085C24300148041Meter Number=12.87001004.Acct=" + posAccountUpsl + ".Phone=" + mobileNo;
//			//	String f60 = "010085C24300148041Meter Number=12.87001003.Acct=1234567890.Phone=" + mobileNo;
//			m.set(60, f60);
			//	m.set(62,"00698WD0101333" + mobileNo);
			//m.set(98, "High   Street   MFB      ");
			//m.set(100, "506180");

			// m.set(103,"0001189745");
			m.set(123, "511101513344101");

//			m.set(128, new String(new byte[]{0x0}));

			String f128 = generateHashForIsoMsg(m, tsk);
			m.set(128, f128);

		} catch (Exception ex) {
			ex.printStackTrace();
		}
		return m;
	}




	public  String[] tokenize(String input, String delim) {
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
	    

	    
	    
	    public static Map<String,String> parseParameters(String parameters){

	        int length = parameters.length();
	        Map<String,String> decodedValues = new HashMap<String, String>();
	        try{
	            String key;
	            int valueLen;
	            while(length > 0){
	                key = parameters.substring(0,2);
	                valueLen = Integer.parseInt(parameters.substring(2,5))+5;
	                decodedValues.put(key,parameters.substring(5,valueLen));
	                parameters = parameters.substring(valueLen);
	                length = parameters.length();
	            }
	        }catch(Exception e){
	            //fail silently
	        }
	        return decodedValues;

	    }
	    
	    
	    public static String generateHashForIsoMsg(ISOMsg isoMsg, String key) throws Exception {
	        PosPackager packager = new PosPackager();
	        isoMsg.setPackager(packager);
	        String generatedHashValue ="";
	        try {
	            byte[] data = isoMsg.pack();
	            int length = data.length;
	            System.out.println("HASH_LEN:: " + length);
	            byte[] dataToHash = new byte[length - 64];
	            if (length >= 64) {
	                System.arraycopy(data, 0, dataToHash, 0, dataToHash.length);
	            }

	             generatedHashValue = hash(dataToHash, Hex.decodeHex(key.toCharArray()));

	            return ISOUtil.padleft(generatedHashValue, 64, '0').toUpperCase();
	        } catch (Exception e) {
	           e.printStackTrace();
	        } 
	        return generatedHashValue;
	    }

	public static String generateHashForIsoMsg2(ISOMsg isoMsg, String key) throws Exception {
		//PosPackager packager = new PosPackager();
		//isoMsg.setPackager(packager);
		String generatedHashValue ="";
		try {
			byte[] data = isoMsg.pack();
			int length = data.length;
			System.out.println("HASH_LEN:: " + length);
			byte[] dataToHash = new byte[length - 64];
			if (length >= 64) {
				System.arraycopy(data, 0, dataToHash, 0, dataToHash.length);
			}

			generatedHashValue = hash(dataToHash, Hex.decodeHex(key.toCharArray()));

			return ISOUtil.padleft(generatedHashValue, 64, '0').toUpperCase();
		} catch (Exception e) {
			e.printStackTrace();
		}
		return generatedHashValue;
	}
	    
	    private static String hash(byte[] data, byte[] key) {
	        MessageDigest md = getDigest();
	        md.update(key);
	        md.update(data);

	        return new String(Hex.encodeHex(md.digest()));
	    }

	    private static MessageDigest getDigest() {
	        try {
	            return MessageDigest.getInstance("SHA-256");
	        } catch (NoSuchAlgorithmException e) {
	            throw new UnsupportedOperationException(e);
	        }
	    }
	    
	    public static String Hash256Message(String data)
	    {
	    	String msg ="";
	    	try
	    	{
	    		
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
		     byte[] hashBytes = data.getBytes(StandardCharsets.UTF_8);
		    byte[] messageDigest = digest.digest(hashBytes);
		     StringBuffer sb = new StringBuffer();
		    for (int i = 0; i < messageDigest.length; i++)
		    {
		        String h = Integer.toHexString(0xFF & messageDigest[i]);
		        while(h.length() < 2)
		            h = "0" + h;
		        sb.append(h);
		    }
		    msg =  sb.toString();
		    	
	    	}
	    	catch(Exception ex)
	    	{
	    		ex.printStackTrace();
	    		//LoggingUtil.ExceptionInfo(ex);
	    	}
	    	
	    	return msg;
	    	
	    }
		
	    
	    

}
