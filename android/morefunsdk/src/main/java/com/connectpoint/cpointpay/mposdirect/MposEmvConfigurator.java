package com.connectpoint.cpointpay.mposdirect;

import android.util.Log;

import com.mf.mpos.pub.CommEnum;
import com.mf.mpos.pub.Controler;
import com.mf.mpos.pub.result.ICAidResult;
import com.mf.mpos.pub.result.ICPublicKeyResult;
import com.mf.mpos.util.Misc;

/**
 * Loads AIDs, CAPKs and terminal EMV parameters onto the MoreFun device during key exchange (Load Params).
 * Mirrors {@link com.sample.activity.DownloadAidActivity} and {@link com.sample.activity.DownloadPukActivity}.
 */
public final class MposEmvConfigurator {

    private static final String TAG = "MposEmvConfigurator";

    private static final String[] AIDS = MposEmvProfileData.aids();
    private static final String[] CAPKS = MposEmvProfileData.capks();
    private static final String[] CAPK_LABELS = MposEmvProfileData.capkLabels();
    /** Some MoreFun firmwares only store 8 CAPKs; require core schemes, not necessarily all 9. */
    private static final int MIN_CAPKS_REQUIRED = 8;

    private MposEmvConfigurator() {
    }

    /**
     * @return true when AIDs, enough CAPKs and terminal TLV were loaded successfully
     */
    public static boolean configure(MposHostParameters host) {
        if (!Controler.posConnected()) {
            Log.w(TAG, "Skip EMV configure — device not connected");
            return false;
        }

        Log.i(TAG, "Clearing AIDs and CAPKs on device");
        Controler.ICAidManage(CommEnum.ICAIDACTION.CLEAR, new byte[0]);
        Controler.ICPublicKeyManage(CommEnum.ICPUBLICKEYACTION.CLEAR, new byte[0]);

        int aidOk = 0;
        for (int i = 0; i < AIDS.length; i++) {
            ICAidResult result = Controler.ICAidManage(CommEnum.ICAIDACTION.ADD, Misc.asc2hex(AIDS[i]));
            if (isOk(result != null ? result.commResult : null)) {
                aidOk++;
            } else {
                Log.w(TAG, "AID download failed index=" + (i + 1) + " result="
                        + (result != null ? result.commResult : "null"));
            }
        }
        Log.i(TAG, "AIDs loaded " + aidOk + "/" + AIDS.length + " (profile: NIBSS AID)");

        int capkOk = 0;
        for (int i = 0; i < CAPKS.length; i++) {
            String label = i < CAPK_LABELS.length ? CAPK_LABELS[i] : ("#" + (i + 1));
            ICPublicKeyResult result = Controler.ICPublicKeyManage(
                    CommEnum.ICPUBLICKEYACTION.ADD, Misc.asc2hex(CAPKS[i]));
            if (isOk(result != null ? result.commResult : null)) {
                capkOk++;
                Log.d(TAG, "CAPK OK " + label);
            } else {
                Log.w(TAG, "CAPK FAILED " + label + " result="
                        + (result != null ? result.commResult : "null")
                        + " tlvLen=" + CAPKS[i].length());
            }
        }
        Log.i(TAG, "CAPKs loaded " + capkOk + "/" + CAPKS.length + " (profile: NIBSS 9-CAPK)");

        String currencyCode = formatCurrencyCode(host != null ? host.getCurrencyCode() : "566");
        Controler.SetEmvParam(currencyCode);
        String tlv = buildEmvParamTlv(host);
        boolean tlvOk = Controler.SetEmvParamTlv(tlv);
        Log.i(TAG, "SetEmvParam=" + currencyCode + " SetEmvParamTlv=" + tlvOk + " tlvLen=" + tlv.length());

        boolean success = aidOk == AIDS.length && capkOk >= MIN_CAPKS_REQUIRED && tlvOk;
        if (!success) {
            Log.e(TAG, "EMV configure incomplete — aids=" + aidOk + " capks=" + capkOk
                    + " (need>=" + MIN_CAPKS_REQUIRED + ") tlv=" + tlvOk);
        } else if (capkOk < CAPKS.length) {
            Log.w(TAG, "EMV configure OK with partial CAPKs " + capkOk + "/" + CAPKS.length
                    + " (device may have limited CAPK slots)");
        }
        return success;
    }

    private static boolean isOk(CommEnum.COMMRET commResult) {
        return commResult != null && commResult.equals(CommEnum.COMMRET.NOERROR);
    }

    private static String formatCurrencyCode(String currencyCode) {
        String digits = currencyCode != null ? currencyCode.replaceAll("\\D", "") : "";
        if (digits.isEmpty()) {
            digits = "566";
        }
        if (digits.length() >= 4) {
            return digits.substring(0, 4);
        }
        StringBuilder sb = new StringBuilder();
        while (sb.length() < 4 - digits.length()) {
            sb.append('0');
        }
        sb.append(digits);
        return sb.toString();
    }

    private static String buildEmvParamTlv(MposHostParameters host) {
        String terminalId = padAscii(host != null ? host.getTerminalId() : "00000000", 8);
        String merchantId = padAscii(host != null ? host.getMerchantId() : "123456789012345", 15);
        String mcc = padNumeric(host != null ? host.getMcc() : "6010", 4);

        StringBuilder tlv = new StringBuilder();
        tlv.append("9F0106313233343536");
        tlv.append("9F40057000F0A001");
        tlv.append("9F1502").append(mcc);
        tlv.append("9F160F").append(toHex(merchantId));
        tlv.append("9F390105");
        tlv.append("9F3303E0F1C8");
        tlv.append("9F1A020566");
        tlv.append("9F1C08").append(toHex(terminalId));
        tlv.append("9F350122");
        tlv.append("5F2A020566");
        tlv.append("5F360102");
        tlv.append("9F3C020566");
        tlv.append("9F3D0102");
        tlv.append("9F1E086D706F735F646972");
        tlv.append("9F660434000080");
        return tlv.toString();
    }

    private static String padAscii(String value, int length) {
        if (value == null) {
            value = "";
        }
        if (value.length() >= length) {
            return value.substring(0, length);
        }
        StringBuilder sb = new StringBuilder(value);
        while (sb.length() < length) {
            sb.append('0');
        }
        return sb.toString();
    }

    private static String padNumeric(String value, int length) {
        if (value == null || value.isEmpty()) {
            value = "6010";
        }
        String digits = value.replaceAll("\\D", "");
        if (digits.length() >= length) {
            return digits.substring(0, length);
        }
        StringBuilder sb = new StringBuilder();
        while (sb.length() < length - digits.length()) {
            sb.append('0');
        }
        sb.append(digits);
        return sb.toString();
    }

    private static String toHex(String ascii) {
        StringBuilder hex = new StringBuilder();
        for (int i = 0; i < ascii.length(); i++) {
            hex.append(String.format("%02X", (int) ascii.charAt(i)));
        }
        return hex.toString();
    }
}
