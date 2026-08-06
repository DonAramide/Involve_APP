package com.connectpoint.cpointpay.mposdirect;

import android.util.Log;

import com.vanstone.trans.tools.IsoMessageClient;
import com.vanstone.trans.tools.PinBlockEncryptionUtil;
import com.vanstone.trans.tools.PosPackager;
import com.vanstone.trans.tools.SunSSLSocketFactory;

import org.jpos.iso.ISOMsg;
import org.jpos.iso.ISOUtil;
import org.jpos.iso.channel.PostChannel;
import org.jpos.util.LogSource;
import org.jpos.util.SimpleLogListener;

import java.util.Map;

/**
 * Performs ISO8583 terminal key exchange (TMK / TSK / TPK / parameters) against the switch host.
 * Each step uses a fresh connection — the host closes the socket after each network-management message.
 */
public class MposKeyExchangeService {

    private static final String TAG = "MposKeyExchangeService";
    private static final String MAC_PLACEHOLDER_64 =
            "0000000000000000000000000000000000000000000000000000000000000000";

    public interface Callback {
        void onProgress(String step);

        void onSuccess(MposHostParameters params);

        void onError(String message);
    }

    private final IsoMessageClient isoClient = new IsoMessageClient();

    public void performKeyExchange(String terminalId, String serverIp, int port, boolean enableSsl,
                                   String keyComponent1, String keyComponent2, Callback callback) {
        try {
            callback.onProgress("Downloading TMK...");
            ISOMsg tmkResponse = sendAndReceive(serverIp, port, enableSsl,
                    isoClient.getNetworkMgtRequestRubies("9A", terminalId));
            if (!isSuccess(tmkResponse)) {
                callback.onError("TMK download failed: " + responseCode(tmkResponse));
                return;
            }

            String field53 = tmkResponse.getString(53);
            String zmk = buildZmk(keyComponent1, keyComponent2);
            if (zmk == null || zmk.isEmpty()) {
                callback.onError("ZMK key components missing — enter key1 and key2");
                return;
            }
            callback.onProgress("Decrypting TMK with ZMK...");
            String tmk = PinBlockEncryptionUtil.DecryptSessionKey(zmk, field53);
            if (tmk == null || tmk.isEmpty()) {
                callback.onError("Unable to decrypt TMK with ZMK");
                return;
            }
            if (tmk.length() > 32) {
                tmk = tmk.substring(0, 32);
            }
            String tmkKcv = field53.length() >= 38 ? field53.substring(32, 38) : "";

            callback.onProgress("Downloading TSK...");
            ISOMsg tskResponse = sendAndReceive(serverIp, port, enableSsl,
                    isoClient.getNetworkMgtRequestRubies("9B", terminalId));
            if (!isSuccess(tskResponse)) {
                callback.onError("TSK download failed: " + responseCode(tskResponse));
                return;
            }
            String tsk = PinBlockEncryptionUtil.DecryptSessionKey(tmk, tskResponse.getString(53));

            callback.onProgress("Downloading TPK...");
            ISOMsg tpkResponse = sendAndReceive(serverIp, port, enableSsl,
                    isoClient.getNetworkMgtRequestRubies("9G", terminalId));
            if (!isSuccess(tpkResponse)) {
                callback.onError("TPK download failed: " + responseCode(tpkResponse));
                return;
            }
            String encryptedTpk = tpkResponse.getString(53);
            String tpk = PinBlockEncryptionUtil.DecryptSessionKey(tmk, encryptedTpk);

            callback.onProgress("Downloading terminal parameters...");
            ISOMsg paramRequest = isoClient.getNetworkMgtRequestRubies("9C", terminalId);
            paramRequest.set(62, "01008" + terminalId);
            paramRequest.setPackager(new PosPackager());
            paramRequest.set(64, MAC_PLACEHOLDER_64);
            paramRequest.recalcBitMap();
            String field64 = IsoMessageClient.generateHashForIsoMsg(paramRequest, tsk);
            paramRequest.set(64, field64);
            ISOMsg paramResponse = sendAndReceive(serverIp, port, enableSsl, paramRequest);
            if (!isSuccess(paramResponse)) {
                callback.onError("Parameter download failed: " + responseCode(paramResponse));
                return;
            }

            String merchantId = "";
            String merchantLocation = "";
            String mcc = "";
            String currencyCode = "";
            String field62 = paramResponse.getString(62);
            if (field62 != null) {
                Map<String, String> decoded = IsoMessageClient.parseParameters(field62);
                merchantId = nullSafe(decoded.get("03"));
                merchantLocation = nullSafe(decoded.get("52"));
                mcc = nullSafe(decoded.get("08"));
                currencyCode = nullSafe(decoded.get("05"));
            }

            MposHostParameters params = new MposHostParameters();
            params.setTerminalId(terminalId);
            params.setServerIp(serverIp);
            params.setPort(port);
            params.setEnableSsl(enableSsl);
            params.setTmk(tmk);
            params.setTsk(tsk);
            params.setTpk(tpk);
            params.setEncryptedTpk(encryptedTpk != null && encryptedTpk.length() >= 32
                    ? encryptedTpk.substring(0, 32) : encryptedTpk);
            params.setTmkKcv(tmkKcv);
            params.setTpkKcv(encryptedTpk != null && encryptedTpk.length() >= 38
                    ? encryptedTpk.substring(32, 38) : "");
            params.setZmk(zmk);
            if (merchantId == null || merchantId.isEmpty()) {
                merchantId = MposDefaults.MERCHANT_ID;
            }
            params.setMerchantId(merchantId);
            params.setMerchantLocation(merchantLocation);
            params.setMcc(mcc.isEmpty() ? "6010" : mcc);
            params.setCurrencyCode(currencyCode.isEmpty() ? "566" : currencyCode);

            callback.onProgress("Key exchange complete");
            callback.onSuccess(params);
        } catch (Exception ex) {
            Log.e(TAG, "Key exchange error", ex);
            String message = ex.getMessage();
            if (message == null || message.isEmpty()) {
                message = "Key exchange failed";
            }
            callback.onError(message);
        }
    }

    /**
     * Opens a connection, sends one message, receives the response, then disconnects.
     * Matches C:\dev\mpos KeyExchangeHandler.sendAndReceive behaviour.
     */
    private ISOMsg sendAndReceive(String serverIp, int port, boolean enableSsl, ISOMsg request)
            throws Exception {
        PostChannel channel = openChannel(serverIp, port, enableSsl);
        try {
            channel.send(request);
            return channel.receive();
        } finally {
            if (channel.isConnected()) {
                try {
                    channel.disconnect();
                } catch (Exception ignored) {
                }
            }
        }
    }

    private PostChannel openChannel(String serverIp, int port, boolean enableSsl) throws Exception {
        org.jpos.util.Logger logger = new org.jpos.util.Logger();
        logger.addListener(new SimpleLogListener(System.out));
        PostChannel channel = new PostChannel(serverIp, port, new PosPackager());
        ((LogSource) channel).setLogger(logger, "mpos-key-exchange");
        channel.setTimeout(60000);
        if (enableSsl) {
            channel.setSocketFactory(new SunSSLSocketFactory());
        }
        channel.connect();
        return channel;
    }

    private static String buildZmk(String key1, String key2) {
        if (key1 == null || key2 == null || key1.isEmpty() || key2.isEmpty()) {
            return null;
        }
        return ISOUtil.hexor(key1, key2);
    }

    private static boolean isSuccess(ISOMsg response) throws Exception {
        return response != null && "00".equals(response.getString(39));
    }

    private static String responseCode(ISOMsg response) {
        try {
            return response != null ? response.getString(39) : "no response";
        } catch (Exception e) {
            return "unknown";
        }
    }

    private static String nullSafe(String value) {
        return value != null ? value : "";
    }
}
