package com.connectpoint.cpointpay.model;

public class TranNetInfo {
	
	
	private long id;
	private String deviceName;
	private String accountId;
	private String deviceId;
	private String accountNo;
	private String postedBy;
	private String ccy;
	private double amount;
	private double charge;
	private String narration;
	private String beneficiaryAccount;
	private String beneficiaryMobile;
	private String beneficiaryID;
	private String senderMobile;
	private String senderName;
	private String beneficiaryName;
	private String bankCode;
	private String transferType;
	private String beneficiaryAccountType;
	private String tranCode;
	private String tranType;
	private String userID;
	private String mobileNo;
	private String paymentMethod;
	private String cardData;
	
	private String slipNo;
	
	private String rspCode;
	private String rspMessage;
	private String billRefNo;
	private String status;
	
	private double beneficiaryAmount;
	private double tax;
	
	private String channelType;
	
	private String tranDateTime;
	private String tranDate;

	
	private double agentCommission;
	private double groupCommission;
	private double thirdPartyCommission;
		
	private String geolocation;
 
	private String externalRefNo;
	private String tranRefNo;

	private String encIccCardData;

	public String getDeviceName() {
		return deviceName;
	}

	public void setDeviceName(String deviceName) {
		this.deviceName = deviceName;
	}

	public String getEncIccCardData() {
		return encIccCardData;
	}

	public void setEncIccCardData(String encIccCardData) {
		this.encIccCardData = encIccCardData;
	}

	public long getId() {
		return id;
	}

	public String getAccountId() {
		return accountId;
	}

	public String getDeviceId() {
		return deviceId;
	}

	public String getAccountNo() {
		return accountNo;
	}

	public String getPostedBy() {
		return postedBy;
	}

	public String getCcy() {
		return ccy;
	}

	public double getAmount() {
		return amount;
	}

	public double getCharge() {
		return charge;
	}

	public String getNarration() {
		return narration;
	}

	public String getBeneficiaryAccount() {
		return beneficiaryAccount;
	}

	public String getBeneficiaryMobile() {
		return beneficiaryMobile;
	}

	public String getBeneficiaryID() {
		return beneficiaryID;
	}

	public String getSenderMobile() {
		return senderMobile;
	}

	public String getSenderName() {
		return senderName;
	}

	public String getBeneficiaryName() {
		return beneficiaryName;
	}

	public String getBankCode() {
		return bankCode;
	}

	public String getTransferType() {
		return transferType;
	}

	public String getBeneficiaryAccountType() {
		return beneficiaryAccountType;
	}

	public String getTranCode() {
		return tranCode;
	}

	public String getTranType() {
		return tranType;
	}

	public String getUserID() {
		return userID;
	}

	public String getMobileNo() {
		return mobileNo;
	}

	public String getPaymentMethod() {
		return paymentMethod;
	}

	public String getCardData() {
		return cardData;
	}

	public String getRspCode() {
		return rspCode;
	}

	public String getRspMessage() {
		return rspMessage;
	}

	public String getBillRefNo() {
		return billRefNo;
	}

	public String getStatus() {
		return status;
	}

	public double getAgentCommission() {
		return agentCommission;
	}

	public double getGroupCommission() {
		return groupCommission;
	}

	public double getThirdPartyCommission() {
		return thirdPartyCommission;
	}

	public String getGeolocation() {
		return geolocation;
	}

	public String getExternalRefNo() {
		return externalRefNo;
	}

	public void setId(long id) {
		this.id = id;
	}

	public void setAccountId(String accountId) {
		this.accountId = accountId;
	}

	public void setDeviceId(String deviceId) {
		this.deviceId = deviceId;
	}

	public void setAccountNo(String accountNo) {
		this.accountNo = accountNo;
	}

	public void setPostedBy(String postedBy) {
		this.postedBy = postedBy;
	}

	public void setCcy(String ccy) {
		this.ccy = ccy;
	}

	public void setAmount(double amount) {
		this.amount = amount;
	}

	public void setCharge(double charge) {
		this.charge = charge;
	}

	public void setNarration(String narration) {
		this.narration = narration;
	}

	public void setBeneficiaryAccount(String beneficiaryAccount) {
		this.beneficiaryAccount = beneficiaryAccount;
	}

	public void setBeneficiaryMobile(String beneficiaryMobile) {
		this.beneficiaryMobile = beneficiaryMobile;
	}

	public void setBeneficiaryID(String beneficiaryID) {
		this.beneficiaryID = beneficiaryID;
	}

	public void setSenderMobile(String senderMobile) {
		this.senderMobile = senderMobile;
	}

	public void setSenderName(String senderName) {
		this.senderName = senderName;
	}

	public void setBeneficiaryName(String beneficiaryName) {
		this.beneficiaryName = beneficiaryName;
	}

	public void setBankCode(String bankCode) {
		this.bankCode = bankCode;
	}

	public void setTransferType(String transferType) {
		this.transferType = transferType;
	}

	public void setBeneficiaryAccountType(String beneficiaryAccountType) {
		this.beneficiaryAccountType = beneficiaryAccountType;
	}

	public void setTranCode(String tranCode) {
		this.tranCode = tranCode;
	}

	public void setTranType(String tranType) {
		this.tranType = tranType;
	}

	public void setUserID(String userID) {
		this.userID = userID;
	}

	public void setMobileNo(String mobileNo) {
		this.mobileNo = mobileNo;
	}

	public void setPaymentMethod(String paymentMethod) {
		this.paymentMethod = paymentMethod;
	}

	public void setCardData(String cardData) {
		this.cardData = cardData;
	}

	public void setRspCode(String rspCode) {
		this.rspCode = rspCode;
	}

	public void setRspMessage(String rspMessage) {
		this.rspMessage = rspMessage;
	}

	public void setBillRefNo(String billRefNo) {
		this.billRefNo = billRefNo;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public void setAgentCommission(double agentCommission) {
		this.agentCommission = agentCommission;
	}

	public void setGroupCommission(double groupCommission) {
		this.groupCommission = groupCommission;
	}

	public void setThirdPartyCommission(double thirdPartyCommission) {
		this.thirdPartyCommission = thirdPartyCommission;
	}

	public void setGeolocation(String geolocation) {
		this.geolocation = geolocation;
	}

	public void setExternalRefNo(String externalRefNo) {
		this.externalRefNo = externalRefNo;
	}

	public String getSlipNo() {
		return slipNo;
	}

	public void setSlipNo(String slipNo) {
		this.slipNo = slipNo;
	}

	public double getBeneficiaryAmount() {
		return beneficiaryAmount;
	}

	public double getTax() {
		return tax;
	}

	public void setBeneficiaryAmount(double beneficiaryAmount) {
		this.beneficiaryAmount = beneficiaryAmount;
	}

	public void setTax(double tax) {
		this.tax = tax;
	}

	public String getChannelType() {
		return channelType;
	}

	public void setChannelType(String channelType) {
		this.channelType = channelType;
	}

	public String getTranRefNo() {
		return tranRefNo;
	}

	public void setTranRefNo(String tranRefNo) {
		this.tranRefNo = tranRefNo;
	}

	public String getTranDateTime() {
		return tranDateTime;
	}

	public void setTranDateTime(String tranDateTime) {
		this.tranDateTime = tranDateTime;
	}

	public String getTranDate() {
		return tranDate;
	}

	public void setTranDate(String tranDate) {
		this.tranDate = tranDate;
	}
	
	

}
