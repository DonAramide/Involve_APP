package com.connectpoint.cpointpay.mposdirect;

/**
 * Terminal and host parameters obtained from ISO key exchange.
 */
public class MposHostParameters {

    private String terminalId;
    private String serverIp;
    private int port;
    private boolean enableSsl;

    private String tmk;
    private String tsk;
    private String tpk;
    private String encryptedTpk;
    private String tmkKcv;
    private String tpkKcv;
    private String zmk;

    private String merchantId;
    private String merchantLocation;
    private String mcc;
    private String currencyCode;

    public String getTerminalId() {
        return terminalId;
    }

    public void setTerminalId(String terminalId) {
        this.terminalId = terminalId;
    }

    public String getServerIp() {
        return serverIp;
    }

    public void setServerIp(String serverIp) {
        this.serverIp = serverIp;
    }

    public int getPort() {
        return port;
    }

    public void setPort(int port) {
        this.port = port;
    }

    public boolean isEnableSsl() {
        return enableSsl;
    }

    public void setEnableSsl(boolean enableSsl) {
        this.enableSsl = enableSsl;
    }

    public String getTmk() {
        return tmk;
    }

    public void setTmk(String tmk) {
        this.tmk = tmk;
    }

    public String getTsk() {
        return tsk;
    }

    public void setTsk(String tsk) {
        this.tsk = tsk;
    }

    public String getTpk() {
        return tpk;
    }

    public void setTpk(String tpk) {
        this.tpk = tpk;
    }

    public String getEncryptedTpk() {
        return encryptedTpk;
    }

    public void setEncryptedTpk(String encryptedTpk) {
        this.encryptedTpk = encryptedTpk;
    }

    public String getTmkKcv() {
        return tmkKcv;
    }

    public void setTmkKcv(String tmkKcv) {
        this.tmkKcv = tmkKcv;
    }

    public String getTpkKcv() {
        return tpkKcv;
    }

    public void setTpkKcv(String tpkKcv) {
        this.tpkKcv = tpkKcv;
    }

    public String getZmk() {
        return zmk;
    }

    public void setZmk(String zmk) {
        this.zmk = zmk;
    }

    public String getMerchantId() {
        return merchantId;
    }

    public void setMerchantId(String merchantId) {
        this.merchantId = merchantId;
    }

    public String getMerchantLocation() {
        return merchantLocation;
    }

    public void setMerchantLocation(String merchantLocation) {
        this.merchantLocation = merchantLocation;
    }

    public String getMcc() {
        return mcc;
    }

    public void setMcc(String mcc) {
        this.mcc = mcc;
    }

    public String getCurrencyCode() {
        return currencyCode;
    }

    public void setCurrencyCode(String currencyCode) {
        this.currencyCode = currencyCode;
    }

    public boolean hasKeys() {
        return tmk != null && !tmk.isEmpty() && tpk != null && !tpk.isEmpty() && tsk != null && !tsk.isEmpty();
    }
}
