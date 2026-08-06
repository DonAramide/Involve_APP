package com.connectpoint.cpointpay.mposdirect;

import android.util.Log;

import com.connectpoint.cpointpay.info.TermParamInfo;
import com.connectpoint.cpointpay.model.TranNetInfo;
import com.connectpoint.cpointpay.utils.OtaUtility;
import com.mf.mpos.pub.CommEnum;
import com.mf.mpos.pub.Controler;
import com.mf.mpos.pub.EmvTagDef;
import com.mf.mpos.pub.param.ReadCardParam;
import com.mf.mpos.pub.result.ReadCardResult;
import com.mf.mpos.pub.result.ReadPosInfoResult;
import com.mf.mpos.util.Misc;
import com.vanstone.trans.tools.IsoMessageClient;
import com.vanstone.trans.tools.SunSSLSocketFactory;

import org.jpos.iso.ISOMsg;
import org.jpos.iso.ISOUtil;
import org.jpos.iso.channel.PostChannel;
import org.jpos.util.LogSource;
import org.jpos.util.SimpleLogListener;

import java.security.MessageDigest;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Reads card on MoreFun MPOS and posts ISO8583 purchase to the switch host.
 */
public class MposPaymentService {

    private static final String TAG = "MposPaymentService";
    /** 64-char placeholder for field 128 before SHA-256 MAC (matches C:\\dev\\mpos). */
    private static final String MAC_PLACEHOLDER_128 =
            "0000000000000000000000000000000000000000000000000000000000000000";

    /**
     * ICC tags Accelerex GA / NIBSS purchase uses (order matters for host acceptance).
     * Excludes MoreFun extras 4F / 9F09 / 9F1E / 9F39 that Accelerex does not send.
     */
    private static final String[] NIBSS_FIELD55_TAGS = {
            "9F26", "9F27", "9F10", "9F37", "9F36", "95", "9A", "9C", "9F02", "5F2A",
            "5F34", "82", "9F1A", "9F03", "9F33", "84", "9F34", "9F35", "9F41"
    };

    public static class CardReadData {
        public String pan;
        public String cardName;
        public String expData;
        public String track2;
        public String icData;
        public String panSeq;
        public String pinBlock;
        public int cardType;
    }

    public static class PaymentResult {
        public final boolean approved;
        public final String responseCode;
        public final String authCode;
        public final String message;

        public PaymentResult(boolean approved, String responseCode, String authCode, String message) {
            this.approved = approved;
            this.responseCode = responseCode;
            this.authCode = authCode;
            this.message = message;
        }
    }

    /** Result of ISO balance inquiry (proc 310000). */
    public static class BalanceResult {
        public final boolean approved;
        public final String responseCode;
        public final String authCode;
        public final String message;
        public final String balanceFormatted;
        public final String currencyCode;
        public final String rawField54;
        public final String maskedPan;

        public BalanceResult(boolean approved, String responseCode, String authCode, String message,
                             String balanceFormatted, String currencyCode, String rawField54, String maskedPan) {
            this.approved = approved;
            this.responseCode = responseCode;
            this.authCode = authCode;
            this.message = message;
            this.balanceFormatted = balanceFormatted;
            this.currencyCode = currencyCode;
            this.rawField54 = rawField54;
            this.maskedPan = maskedPan;
        }
    }

    public interface CardReadListener {
        void onStep(int step);

        void onCardRead(CardReadData data);

        void onError(String message);
    }

    public CardReadData readCard(double amount, MposHostParameters host, MposDeviceManager deviceManager,
                                 CardReadListener listener) {
        synchronized (MposDeviceManager.DEVICE_LOCK) {
            return readCardLocked(amount, host, deviceManager, listener);
        }
    }

    private CardReadData readCardLocked(double amount, MposHostParameters host, MposDeviceManager deviceManager,
                                        CardReadListener listener) {
        if (!Controler.posConnected()) {
            listener.onError("MPOS device not connected");
            return null;
        }

        // AIDs/CAPKs and TMK/TPK are loaded during key exchange (Load Params) — not on every Pay.
        Controler.SetKeyIndex(CommEnum.KEYINDEX.INDEX0);
        listener.onStep(1);

        long minor = Math.round(amount * 100);
        Log.i(TAG, "ReadCard starting amountMinor=" + minor);
        ReadCardResult result = Controler.ReadCard(buildReadCardParam(amount, listener));
        Log.i(TAG, "ReadCard finished commResult=" + result.commResult + " cardType=" + result.cardType
                + " pan=" + (result.pan != null ? maskPan(result.pan) : "null")
                + " pinLen=" + result.pinLen
                + " pinPresent=" + (result.pinblock != null && !result.pinblock.isEmpty())
                + " icDataLen=" + (result.icData != null ? result.icData.length() : 0));

        if (!result.commResult.equals(CommEnum.COMMRET.NOERROR) && !isRecoverableRead(result)) {
            listener.onError("Card read failed: " + result.commResult);
            return null;
        }
        if (!result.commResult.equals(CommEnum.COMMRET.NOERROR)) {
            Log.w(TAG, "ReadCard commResult=" + result.commResult + " but card data present — continuing");
        }

        if (result.cardType == 0) {
            listener.onError("Transaction cancelled");
            return null;
        }

        if (result.cardType != 1 && result.cardType != 2 && result.cardType != 3) {
            listener.onError(cardTypeMessage(result.cardType));
            return null;
        }

        CardReadData data = new CardReadData();
        data.pan = result.pan;
        data.cardName = result.cardname;
        data.expData = result.expData;
        data.track2 = normalizeTrack2(result.track2);
        data.icData = resolveIcData(result);
        data.pinBlock = resolvePinBlock(result);
        data.cardType = result.cardType;
        data.panSeq = readPanSeq(result);
        Log.i(TAG, "Card read icDataLen=" + (data.icData != null ? data.icData.length() : 0)
                + " pinPresent=" + (data.pinBlock != null && !data.pinBlock.isEmpty()));

        if (data.pinBlock == null || data.pinBlock.isEmpty()) {
            if (isChipCard(result.cardType) && data.icData != null && !data.icData.isEmpty()) {
                Log.w(TAG, "No online PIN block — chip EMV offline PIN (field 55 only)");
            } else if (result.pinLen > 0) {
                listener.onError("PIN was entered but encryption failed — run Load Params again");
                return null;
            } else {
                listener.onError("Enter PIN on the MPOS keypad when it beeps — keep card inserted");
                return null;
            }
        }

        listener.onCardRead(data);
        return data;
    }

    public PaymentResult sendPurchase(MposHostParameters host, CardReadData card, double amount) {
        PostChannel channel = null;
        try {
            if (host.getTsk() == null || host.getTsk().isEmpty()) {
                return new PaymentResult(false, "96", "", "TSK missing — run Load Params first");
            }
            if (card.icData == null || card.icData.isEmpty()) {
                return new PaymentResult(false, "96", "", "EMV data (field 55) missing from card read");
            }
            boolean hasPin = card.pinBlock != null && !card.pinBlock.isEmpty();
            if (!hasPin && !isChipCard(card.cardType)) {
                return new PaymentResult(false, "96", "", "PIN block missing — enter PIN on MPOS keypad");
            }

            TranNetInfo tran = buildTranNetInfo(card, amount);
            TermParamInfo term = buildTermParamInfo(host);

            IsoMessageClient isoClient = new IsoMessageClient();
            ISOMsg request;
            if ("NIBSS".equalsIgnoreCase(MposDefaults.WHO)) {
                // Match AisinoCashWithdrawalActivityOnPOS / NextGo NIBSS purchase format.
                String isodt = new SimpleDateFormat("yyyyMMddHHmmss", Locale.US).format(new Date());
                request = isoClient.CreatePurchaseMessageNIBSS(
                        tran,
                        term.getTerminalId(),
                        term.getTsk(),
                        host.getMerchantId(),
                        padLocation(host.getMerchantLocation()),
                        isodt);
                // CreatePurchaseMessageNIBSS hardcodes fields that Accelerex GA rejects (peer-disconnect).
                // Override to match working horizonbaseapp purchase on 196.6.103.18:4001.
                applyGaNibssPurchaseOverrides(request, host);
                // Accelerex IsoPackager: PIN + MAC are binary (not ASCII hex strings).
                applyBinaryPinAndMac(request, term.getTsk());
            } else {
                int retry = hasPin ? 1 : 0;
                request = isoClient.CreatePurchaseMessage(tran, term, retry);
            }
            if (request.getString(2) == null) {
                return new PaymentResult(false, "96", "", "Failed to build purchase message");
            }
            // NIBSS/GA: Accelerex sends f59; does not require f60. f52 only when online-PIN CVM.
            boolean nibss = "NIBSS".equalsIgnoreCase(MposDefaults.WHO);
            boolean incomplete = !request.hasField(55) || !request.hasField(123) || !request.hasField(128)
                    || (nibss && !request.hasField(59))
                    || (!nibss && (!request.hasField(59) || !request.hasField(60)));
            if (incomplete) {
                Log.e(TAG, "Incomplete ISO: who=" + MposDefaults.WHO
                        + " f3=" + request.getString(3)
                        + " f32=" + request.getString(32)
                        + " f52=" + request.hasField(52)
                        + " f55=" + request.hasField(55)
                        + " f59=" + request.hasField(59)
                        + " f60=" + request.hasField(60)
                        + " f123=" + request.hasField(123)
                        + " f128=" + request.hasField(128));
                return new PaymentResult(false, "96", "", "Incomplete purchase message — check PIN and EMV data");
            }
            Log.i(TAG, "ISO purchase ready who=" + MposDefaults.WHO
                    + " f3=" + request.getString(3)
                    + " f18=" + request.getString(18)
                    + " f32=" + request.getString(32)
                    + " f52=" + request.hasField(52)
                    + " f55len=" + (request.getString(55) != null ? request.getString(55).length() : 0)
                    + " f59=" + (request.hasField(59) ? request.getString(59) : "n/a")
                    + " f123=" + request.getString(123)
                    + " packager=MposIsoPackager(binary PIN/MAC)");

            org.jpos.util.Logger logger = new org.jpos.util.Logger();
            logger.addListener(new SimpleLogListener(System.out));
            channel = new PostChannel(host.getServerIp(), host.getPort(), new MposIsoPackager());
            ((LogSource) channel).setLogger(logger, "mpos-purchase");
            channel.setTimeout(180000);
            if (host.isEnableSsl()) {
                channel.setSocketFactory(new SunSSLSocketFactory());
            }
            channel.connect();
            channel.send(request);
            ISOMsg response = channel.receive();

            if (response == null) {
                return new PaymentResult(false, "96", "",
                        "No response from host (peer-disconnect). "
                                + "If key exchange works, ask GA/NIBSS to confirm TID "
                                + host.getTerminalId() + " is live for purchase.");
            }

            String rspCode = response.getString(39);
            String authCode = response.hasField(38) ? response.getString(38) : "";
            boolean approved = "00".equals(rspCode);
            return new PaymentResult(approved, rspCode, authCode,
                    approved ? "Approved" : "Declined (" + rspCode + ")");
        } catch (Exception ex) {
            Log.e(TAG, "Purchase failed", ex);
            String msg = ex.getMessage() != null ? ex.getMessage() : "Purchase failed";
            if (msg.toLowerCase(Locale.US).contains("disconnect")
                    || msg.toLowerCase(Locale.US).contains("peer")) {
                msg = "Host closed connection (peer-disconnect). "
                        + "Card/ISO fields look OK — verify TID is purchase-enabled on this host.";
            }
            return new PaymentResult(false, "96", "", msg);
        } finally {
            if (channel != null && channel.isConnected()) {
                try {
                    channel.disconnect();
                } catch (Exception ignored) {
                }
            }
        }
    }

    /**
     * ISO balance inquiry (MTI 0100, proc 310000) to the NIBSS host.
     * Requires keys loaded and a successful card+PIN read (amount 0 on device).
     */
    public BalanceResult sendBalanceInquiry(MposHostParameters host, CardReadData card) {
        PostChannel channel = null;
        try {
            if (host.getTsk() == null || host.getTsk().isEmpty()) {
                return balanceFail("96", "TSK missing — run Load Params first");
            }
            if (card.icData == null || card.icData.isEmpty()) {
                return balanceFail("96", "EMV data (field 55) missing from card read");
            }
            boolean hasPin = card.pinBlock != null && !card.pinBlock.isEmpty();
            if (!hasPin && !isChipCard(card.cardType)) {
                return balanceFail("96", "PIN block missing — enter PIN on MPOS keypad");
            }

            TranNetInfo tran = buildTranNetInfo(card, 0.0);
            TermParamInfo term = buildTermParamInfo(host);

            IsoMessageClient isoClient = new IsoMessageClient();
            int retry = hasPin ? 1 : 0;
            ISOMsg request = isoClient.CreatePurchaseMessageCheckBalance(tran, term, retry);
            if (request.getString(2) == null) {
                return balanceFail("96", "Failed to build balance inquiry message");
            }

            // Keep proc 310000; align routing fields with working NIBSS purchase path.
            applyGaNibssBalanceOverrides(request, host);
            applyBinaryPinAndMac(request, term.getTsk());

            Log.i(TAG, "ISO balance inquiry ready f3=" + request.getString(3)
                    + " f52=" + request.hasField(52)
                    + " f55len=" + (request.getString(55) != null ? request.getString(55).length() : 0));

            org.jpos.util.Logger logger = new org.jpos.util.Logger();
            logger.addListener(new SimpleLogListener(System.out));
            channel = new PostChannel(host.getServerIp(), host.getPort(), new MposIsoPackager());
            ((LogSource) channel).setLogger(logger, "mpos-balance");
            channel.setTimeout(180000);
            if (host.isEnableSsl()) {
                channel.setSocketFactory(new SunSSLSocketFactory());
            }
            channel.connect();
            channel.send(request);
            ISOMsg response = channel.receive();

            if (response == null) {
                return balanceFail("96", "No response from host for balance inquiry");
            }

            String rspCode = response.getString(39);
            String authCode = response.hasField(38) ? response.getString(38) : "";
            boolean approved = "00".equals(rspCode);
            String field54 = response.hasField(54) ? response.getString(54) : "";
            String[] parsed = parseAdditionalAmounts(field54);
            String balanceFormatted = parsed[0];
            String currency = parsed[1];

            String message;
            if (approved) {
                message = balanceFormatted != null && !balanceFormatted.isEmpty()
                        ? ("Available balance: " + balanceFormatted)
                        : "Approved (balance not in response field 54)";
            } else {
                message = "Declined (" + rspCode + ")";
            }

            return new BalanceResult(
                    approved,
                    rspCode != null ? rspCode : "96",
                    authCode,
                    message,
                    balanceFormatted,
                    currency,
                    field54,
                    maskPan(card.pan)
            );
        } catch (Exception ex) {
            Log.e(TAG, "Balance inquiry failed", ex);
            String msg = ex.getMessage() != null ? ex.getMessage() : "Balance inquiry failed";
            return balanceFail("96", msg);
        } finally {
            if (channel != null && channel.isConnected()) {
                try {
                    channel.disconnect();
                } catch (Exception ignored) {
                }
            }
        }
    }

    private static BalanceResult balanceFail(String code, String message) {
        return new BalanceResult(false, code, "", message, "", "566", "", "");
    }

    private static void applyGaNibssBalanceOverrides(ISOMsg request, MposHostParameters host)
            throws Exception {
        String downloadedMcc = host != null ? host.getMcc() : null;
        String mcc = (downloadedMcc != null && !downloadedMcc.trim().isEmpty())
                ? downloadedMcc.trim() : "6012";

        // Must remain balance inquiry.
        request.set(3, "310000");
        request.set(4, "000000000000");
        request.set(18, mcc);
        request.set(26, "12");
        request.set(28, "D00000000");
        request.set(32, "111129");
        request.set(33, "557694");
        request.set(123, "A1010171134C101");

        String tid = request.getString(41);
        String rrn = request.getString(37);
        String sn = resolveMposSerial();
        if (tid != null && rrn != null) {
            request.set(59, tid + "-" + sn + "-" + rrn);
        }

        // Same as purchase: omit f52 if host peer-disconnects with online PIN.
        if (request.hasField(52)) {
            request.unset(52);
            Log.i(TAG, "Balance inquiry: unset f52 for GA host compatibility");
        }
    }

    /**
     * Parse ISO DE54 additional amounts.
     * Format: AccountType(2) + AmountType(2) + Currency(3) + Sign(1) + Amount(12) [repeated].
     * Prefers amount type 02 (available balance), else first amount.
     */
    private static String[] parseAdditionalAmounts(String field54) {
        String balance = "";
        String currency = "566";
        if (field54 == null || field54.trim().isEmpty()) {
            return new String[]{balance, currency};
        }
        String raw = field54.replaceAll("\\s", "");
        String preferred = null;
        String fallback = null;
        String preferredCcy = currency;
        String fallbackCcy = currency;
        for (int i = 0; i + 20 <= raw.length(); i += 20) {
            String chunk = raw.substring(i, i + 20);
            String amtType = chunk.substring(2, 4);
            String ccy = chunk.substring(4, 7);
            char sign = chunk.charAt(7);
            String amt12 = chunk.substring(8, 20);
            long minor;
            try {
                minor = Long.parseLong(amt12);
            } catch (NumberFormatException e) {
                continue;
            }
            if (sign == 'D' || sign == 'd') {
                minor = -minor;
            }
            String formatted = String.format(Locale.US, "%,.2f", minor / 100.0);
            if ("02".equals(amtType) || "01".equals(amtType)) {
                preferred = formatted;
                preferredCcy = ccy;
            } else if (fallback == null) {
                fallback = formatted;
                fallbackCcy = ccy;
            }
        }
        if (preferred != null) {
            return new String[]{preferred, preferredCcy};
        }
        if (fallback != null) {
            return new String[]{fallback, fallbackCcy};
        }
        return new String[]{raw, currency};
    }

    private static String maskPan(String pan) {
        if (pan == null || pan.length() < 10) {
            return pan != null ? pan : "";
        }
        return pan.substring(0, 6) + "****" + pan.substring(pan.length() - 4);
    }

    /**
     * Align with working Accelerex GA purchase (horizonbaseapp) on NIBSS host.
     * CreatePurchaseMessageNIBSS defaults (f18=5011, f26=04, f28=C..., f32=100001, f123=5101...)
     * cause peer-disconnect; Accelerex approved txn used these values instead.
     * <p>
     * f18: Accelerex approved used 6012. Downloaded MCC for 2070AL30 is 5251 — force 6012
     * as last A/B against peer-disconnect (host may reject unknown MCC for purchase).
     */
    private static void applyGaNibssPurchaseOverrides(ISOMsg request, MposHostParameters host)
            throws Exception {
        // GA/NIBSS routing values from working Accelerex IsoPackager dumps on :4001.
        // (CreatePurchaseMessageNIBSS defaults 5011/100001/5101… cause peer-disconnect.)
        String downloadedMcc = host != null ? host.getMcc() : null;
        String mcc = (downloadedMcc != null && !downloadedMcc.trim().isEmpty())
                ? downloadedMcc.trim() : "6012";

        // Accelerex approved dumps use savings purchase proc code 001000 (not 000000).
        request.set(3, "001000");
        request.set(18, mcc);
        request.set(26, "12");
        request.set(28, "D00000000");
        request.set(32, "111129");
        request.set(33, "557694");
        request.set(123, "A1010171134C101");

        // Accelerex IsoMessageBuilder always sets f59 = TID-serial-RRN.
        String tid = request.getString(41);
        String rrn = request.getString(37);
        String sn = resolveMposSerial();
        if (tid != null && rrn != null) {
            request.set(59, tid + "-" + sn + "-" + rrn);
        }

        // This host peer-disconnects whenever f52 is present (Verve online-PIN CVM 42… and
        // Accelerex Verve dumps). Mastercard (no f52 / CVM 41…) returns 0210/00. mpos SDK
        // also leaves PIN unset. Always omit f52 here until TPK/PIN path is proven with GA.
        String cvm = extractEmvTag(request.getString(55), "9F34");
        if (request.hasField(52)) {
            request.unset(52);
            Log.i(TAG, "Unset f52 — GA host peer-disconnects with online PIN "
                    + "(kept CVM 9F34=" + cvm + " in field 55)");
        }

        Log.i(TAG, "GA NIBSS overrides f3=001000 f18=" + mcc
                + " (downloadedMcc=" + downloadedMcc + ")"
                + " f26=12 f28=D00000000 f32=111129 f33=557694"
                + " f59=" + request.getString(59)
                + " f52=" + request.hasField(52)
                + " cvm=" + cvm
                + " f123=A1010171134C101");
    }

    private static String resolveMposSerial() {
        try {
            if (Controler.posConnected()) {
                ReadPosInfoResult info = Controler.ReadPosInfo2();
                if (info != null && info.sn != null && !info.sn.trim().isEmpty()) {
                    return info.sn.trim();
                }
            }
        } catch (Exception ex) {
            Log.w(TAG, "ReadPosInfo2 for f59 serial failed", ex);
        }
        return "MPOS";
    }

    /** Minimal TLV tag extract from uppercase hex EMV blob (tag then 1-byte length). */
    private static String extractEmvTag(String field55Hex, String tag) {
        if (field55Hex == null || tag == null) {
            return null;
        }
        String hex = field55Hex.replaceAll("\\s", "").toUpperCase(Locale.US);
        String needle = tag.toUpperCase(Locale.US);
        int i = 0;
        while (i + 4 <= hex.length()) {
            String t;
            int first = Integer.parseInt(hex.substring(i, i + 2), 16);
            if ((first & 0x1F) == 0x1F) {
                if (i + 4 > hex.length()) {
                    break;
                }
                t = hex.substring(i, i + 4);
                i += 4;
            } else {
                t = hex.substring(i, i + 2);
                i += 2;
            }
            if (i + 2 > hex.length()) {
                break;
            }
            int len = Integer.parseInt(hex.substring(i, i + 2), 16);
            i += 2;
            if (i + len * 2 > hex.length()) {
                break;
            }
            String value = hex.substring(i, i + len * 2);
            if (t.equals(needle)) {
                return value;
            }
            i += len * 2;
        }
        return null;
    }

    /**
     * Accelerex/mpos IsoPackager: field 52 = 8 binary bytes, field 128 = 32 binary bytes.
     * ASCII IF_CHAR packing (vanstone PosPackager) makes the host mis-parse and peer-disconnect.
     * MAC matches C:\\dev\\mpos IsoMessageBuilder (placeholder zeros, trim last 64, SHA-256).
     */
    private static void applyBinaryPinAndMac(ISOMsg request, String tsk) throws Exception {
        request.setPackager(new MposIsoPackager());

        if (request.hasField(52)) {
            String pinHex = request.getString(52);
            if (pinHex != null && !pinHex.isEmpty()) {
                pinHex = pinHex.replaceAll("\\s", "");
                if (pinHex.length() >= 16) {
                    pinHex = pinHex.substring(0, 16);
                }
                request.set(52, ISOUtil.hex2byte(pinHex));
            }
        }

        // 32 zero bytes (64 hex zeros) — same as mpos IsoMessageBuilder
        request.set(128, ISOUtil.hex2byte(MAC_PLACEHOLDER_128));
        request.recalcBitMap();
        byte[] prePack = request.pack();
        int trimLen = Math.max(0, prePack.length - 64);
        byte[] toHash = ISOUtil.trim(prePack, trimLen);
        Log.i(TAG, "Binary MAC HASH_LEN=" + prePack.length + " trim=" + trimLen
                + " tskLen=" + (tsk != null ? tsk.length() : 0)
                + " f52=" + request.hasField(52));

        MessageDigest md = MessageDigest.getInstance("SHA-256");
        md.update(ISOUtil.hex2byte(tsk));
        md.update(toHash);
        byte[] mac = md.digest();
        request.set(128, mac);
        Log.i(TAG, "Field 128 MAC binary len=" + mac.length
                + " hex=" + ISOUtil.hexString(mac));
    }

    private TranNetInfo buildTranNetInfo(CardReadData card, double amount) {
        String externalRef = OtaUtility.GetRefNumber("", 12) + OtaUtility.GetRefNumber("", 6);
        String panSeq = card.panSeq != null ? card.panSeq : "000";
        String track2 = normalizeTrack2(card.track2);
        String field55 = normalizeField55(card.icData);
        String billRef = sanitizeBillRefPart(card.pan) + "|"
                + sanitizeBillRefPart(nullSafe(card.cardName)) + "|"
                + sanitizeBillRefPart(nullSafe(card.expData)) + "|"
                + track2 + "|"
                + field55 + "|"
                + panSeq + "|00";
        Log.d(TAG, "billRef track2=" + track2 + " field55Len="
                + field55.length()
                + " rawIcLen=" + (card.icData != null ? card.icData.length() : 0));

        String pinForIso = card.pinBlock != null ? card.pinBlock : "";
        if (pinForIso.length() > 16) {
            pinForIso = pinForIso.substring(0, 16);
        }

        TranNetInfo tran = new TranNetInfo();
        tran.setAmount(amount);
        tran.setBillRefNo(billRef);
        tran.setCardData(pinForIso);
        tran.setExternalRefNo(externalRef);
        tran.setTranRefNo("MPOS" + externalRef);
        tran.setMobileNo("08000000000");
        return tran;
    }

    private TermParamInfo buildTermParamInfo(MposHostParameters host) {
        TermParamInfo term = new TermParamInfo();
        term.setTerminalId(host.getTerminalId());
        term.setTmk(host.getTmk());
        term.setTsk(host.getTsk());
        term.setTpk(host.getEncryptedTpk() != null ? host.getEncryptedTpk() : host.getTpk());
        term.setCardAcceptorId(padMerchantId(host.getMerchantId()));
        term.setCardAcceptionLocation(padLocation(host.getMerchantLocation()));
        term.setMcc(host.getMcc() != null && !host.getMcc().isEmpty() ? host.getMcc() : "6010");
        term.setCurrencyCode(host.getCurrencyCode() != null && !host.getCurrencyCode().isEmpty()
                ? host.getCurrencyCode() : "566");
        term.setServerIP(host.getServerIp());
        term.setPort(host.getPort());
        term.setPoolAccount("1234567890");
        return term;
    }

    /** MoreFun returns track2 with D separator; IsoMessageClient expects = */
    private static String normalizeTrack2(String track2) {
        if (track2 == null) {
            return "";
        }
        String value = track2.trim().replace('D', '=').replace('d', '=');
        if (value.endsWith("F") || value.endsWith("f")) {
            value = value.substring(0, value.length() - 1);
        }
        return value;
    }

    private String resolvePinBlock(ReadCardResult result) {
        if (result.pinblock != null && !result.pinblock.isEmpty()) {
            return normalizePinHex(result.pinblock);
        }
        try {
            String fromTlv = result.GetStringHex2Asc(ReadCardResult.Tag.pinblock);
            if (fromTlv != null && !fromTlv.isEmpty()) {
                Log.i(TAG, "PIN block from TLV tag pinblock");
                return normalizePinHex(fromTlv);
            }
        } catch (Exception ex) {
            Log.w(TAG, "GetStringHex2Asc(pinblock) failed", ex);
        }
        try {
            byte[] pinBytes = result.GetBytes((byte) 0x09);
            if (pinBytes != null && pinBytes.length > 0) {
                Log.i(TAG, "PIN block from TLV byte 0x09 len=" + pinBytes.length);
                return normalizePinHex(Misc.hex2asc(pinBytes));
            }
        } catch (Exception ex) {
            Log.w(TAG, "GetBytes(0x09) failed", ex);
        }
        return null;
    }

    private static String normalizePinHex(String pinHex) {
        if (pinHex == null) {
            return null;
        }
        String value = pinHex.replaceAll("\\s", "").toUpperCase();
        if (value.length() > 16) {
            value = value.substring(0, 16);
        }
        return value.isEmpty() ? null : value;
    }

    private static boolean isChipCard(int cardType) {
        return cardType == 2 || cardType == 3;
    }

    private String resolveIcData(ReadCardResult result) {
        if (result.icData != null && !result.icData.isEmpty()) {
            return result.icData;
        }
        try {
            String fromTlv = result.GetStringHex2Asc(ReadCardResult.Tag.icData);
            if (fromTlv != null && !fromTlv.isEmpty()) {
                Log.i(TAG, "icData from ReadCardResult TLV");
                return fromTlv;
            }
        } catch (Exception ex) {
            Log.w(TAG, "GetStringHex2Asc(icData) failed", ex);
        }
        return "";
    }

    /** SDK may return TIMEOUT after card data was already received over BT. */
    private static boolean isRecoverableRead(ReadCardResult result) {
        if (result == null || result.commResult == null) {
            return false;
        }
        if (!CommEnum.COMMRET.TIMEOUT.equals(result.commResult)) {
            return false;
        }
        if (result.cardType != 1 && result.cardType != 2 && result.cardType != 3) {
            return false;
        }
        return result.pan != null && !result.pan.trim().isEmpty();
    }

    private static String padMerchantId(String merchantId) {
        if (merchantId == null || merchantId.isEmpty()) {
            return "123456789012345";
        }
        if (merchantId.length() >= 15) {
            return merchantId.substring(0, 15);
        }
        StringBuilder sb = new StringBuilder(merchantId);
        while (sb.length() < 15) {
            sb.append('0');
        }
        return sb.toString();
    }

    private static String padLocation(String location) {
        if (location == null || location.isEmpty()) {
            location = "MPOS DIRECT LAGOS NG";
        }
        if (location.length() >= 40) {
            return location.substring(0, 40);
        }
        StringBuilder sb = new StringBuilder(location);
        while (sb.length() < 40) {
            sb.append(' ');
        }
        return sb.toString();
    }

    private ReadCardParam buildReadCardParam(double amount, CardReadListener listener) {
        ReadCardParam param = new ReadCardParam();
        long minor = Math.round(amount * 100);
        param.setAmount(minor);
        param.setPinInput((byte) 1);
        param.setPinMaxLen((byte) 6);
        param.setPinTimeout((byte) 60);
        param.setCardTimeout((byte) 90);
        param.setAllowfallback(false);
        param.setForceonline(false);
        param.setRequireReturnCardNo((byte) 1);
        param.setTransType(CommEnum.TRANSTYPE.FUNC_SALE);
        param.setTransName("PURCHASE");
        param.setCardmode((byte) 2);
        param.setEmvTransactionType((byte) 0x00);
        param.setTags(buildEmvTags());
        param.setOnSteplistener(step -> {
            Log.d(TAG, "ReadCard step=" + step);
            listener.onStep(step);
        });
        return param;
    }



    private static String cardTypeMessage(int cardType) {
        switch (cardType) {
            case 4:
                return "Please insert chip card";
            case 5:
                return "Card read timeout — insert card and try again";
            case 6:
                return "Card EMV error (type 6) — re-run Load Params, then insert Verve chip firmly and retry";
            default:
                return "Unsupported card read result: " + cardType;
        }
    }

    private List<byte[]> buildEmvTags() {
        // Match Accelerex GA field-55 tag set (no 4F / 9F09 / 9F1E / 9F39).
        List<byte[]> tags = new ArrayList<>();
        tags.add(EmvTagDef.EMV_TAG_9F26_IC_AC);
        tags.add(EmvTagDef.EMV_TAG_9F27_IC_CID);
        tags.add(EmvTagDef.EMV_TAG_9F10_IC_ISSAPPDATA);
        tags.add(EmvTagDef.EMV_TAG_9F37_TM_UNPNUM);
        tags.add(EmvTagDef.EMV_TAG_9F36_IC_ATC);
        tags.add(EmvTagDef.EMV_TAG_95_TM_TVR);
        tags.add(EmvTagDef.EMV_TAG_9A_TM_TRANSDATE);
        tags.add(EmvTagDef.EMV_TAG_9C_TM_TRANSTYPE);
        tags.add(EmvTagDef.EMV_TAG_9F02_TM_AUTHAMNTN);
        tags.add(EmvTagDef.EMV_TAG_5F2A_TM_CURCODE);
        tags.add(EmvTagDef.EMV_TAG_5F34_IC_PANSN);
        tags.add(EmvTagDef.EMV_TAG_82_IC_AIP);
        tags.add(EmvTagDef.EMV_TAG_9F1A_TM_CNTRYCODE);
        tags.add(EmvTagDef.EMV_TAG_9F03_TM_OTHERAMNTN);
        tags.add(EmvTagDef.EMV_TAG_9F33_TM_CAP);
        tags.add(EmvTagDef.EMV_TAG_84_IC_DFNAME);
        tags.add(EmvTagDef.EMV_TAG_9F34_TM_CVMRESULT);
        tags.add(EmvTagDef.EMV_TAG_9F35_TM_TERMTYPE);
        tags.add(EmvTagDef.EMV_TAG_9F41_TM_TRSEQCNTR);
        return tags;
    }

    /**
     * Rebuild ICC data in Accelerex/NIBSS tag order; drop tags the working GA purchase omits.
     */
    private static String normalizeField55(String rawIcData) {
        if (rawIcData == null || rawIcData.isEmpty()) {
            return "";
        }
        String hex = rawIcData.replaceAll("\\s", "").toUpperCase(Locale.US);
        Map<String, String> tlv = parseTlvMap(hex);
        if (tlv.isEmpty()) {
            Log.w(TAG, "Field55 parse empty — using raw icData");
            return hex;
        }
        StringBuilder out = new StringBuilder();
        for (String tag : NIBSS_FIELD55_TAGS) {
            String value = tlv.get(tag);
            if (value == null || value.isEmpty()) {
                continue;
            }
            int byteLen = value.length() / 2;
            out.append(tag);
            if (byteLen < 0x80) {
                out.append(String.format(Locale.US, "%02X", byteLen));
            } else {
                // Length > 127 unlikely for these tags; keep simple form.
                out.append(String.format(Locale.US, "%02X", byteLen));
            }
            out.append(value);
        }
        Log.i(TAG, "Field55 normalized len=" + out.length()
                + " tags=" + tlv.keySet() + " kept=" + NIBSS_FIELD55_TAGS.length);
        return out.toString();
    }

    private static Map<String, String> parseTlvMap(String hex) {
        Map<String, String> map = new LinkedHashMap<>();
        int i = 0;
        while (i + 2 <= hex.length()) {
            String b1 = hex.substring(i, i + 2);
            i += 2;
            String tag = b1;
            int tagByte = Integer.parseInt(b1, 16);
            if ((tagByte & 0x1F) == 0x1F) {
                if (i + 2 > hex.length()) {
                    break;
                }
                String b2 = hex.substring(i, i + 2);
                i += 2;
                tag = b1 + b2;
                int second = Integer.parseInt(b2, 16);
                while ((second & 0x80) != 0) {
                    if (i + 2 > hex.length()) {
                        return map;
                    }
                    b2 = hex.substring(i, i + 2);
                    i += 2;
                    tag = tag + b2;
                    second = Integer.parseInt(b2, 16);
                }
            }
            if (i + 2 > hex.length()) {
                break;
            }
            int lenByte = Integer.parseInt(hex.substring(i, i + 2), 16);
            i += 2;
            int length;
            if ((lenByte & 0x80) == 0) {
                length = lenByte;
            } else {
                int num = lenByte & 0x7F;
                if (i + num * 2 > hex.length()) {
                    break;
                }
                length = Integer.parseInt(hex.substring(i, i + num * 2), 16);
                i += num * 2;
            }
            int valueChars = length * 2;
            if (i + valueChars > hex.length()) {
                break;
            }
            String value = hex.substring(i, i + valueChars);
            i += valueChars;
            map.put(tag, value);
        }
        return map;
    }

    private String readPanSeq(ReadCardResult result) {
        if (result.pansn != null && !result.pansn.isEmpty()) {
            return formatPanSeq(result.pansn);
        }
        try {
            String fromTlv = result.GetStringHex2Asc(ReadCardResult.Tag.pansn);
            if (fromTlv != null && !fromTlv.isEmpty()) {
                return formatPanSeq(fromTlv);
            }
        } catch (Exception ex) {
            Log.w(TAG, "GetStringHex2Asc(pansn) failed", ex);
        }
        return "001";
    }

    private static String formatPanSeq(String raw) {
        if (raw == null || raw.isEmpty()) {
            return "001";
        }
        String value = raw.trim();
        if (value.matches("\\d+")) {
            try {
                return ISOUtil.padleft(value, 3, '0');
            } catch (Exception ignored) {
                return "001";
            }
        }
        try {
            return ISOUtil.padleft(String.valueOf(Integer.parseInt(value, 16)), 3, '0');
        } catch (Exception ignored) {
            return "001";
        }
    }

    private static String sanitizeBillRefPart(String value) {
        return value != null ? value.replace('|', ' ') : "";
    }

    private static String nullSafe(String value) {
        return value != null ? value : "";
    }
}
