package com.connectpoint.cpointpay.mposdirect;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import com.connectpoint.cpointpay.utils.AppController;
import com.mf.mpos.pub.CommEnum;
import com.mf.mpos.pub.Controler;
import com.mf.mpos.pub.result.ConnectPosResult;
import com.mf.mpos.pub.result.GetRandomResult;
import com.mf.mpos.pub.result.LoadMainKeyResult;
import com.mf.mpos.pub.result.LoadWorkKeyResult;
import com.mf.mpos.util.Misc;
import com.vanstone.trans.tools.PinBlockEncryptionUtil;

import org.jpos.iso.ISOUtil;

/**
 * MoreFun Bluetooth MPOS device connection and key injection (TMK + TPK).
 */
public class MposDeviceManager {

    /** Serializes all MoreFun SDK Bluetooth calls — the channel is not thread-safe. */
    public static final Object DEVICE_LOCK = new Object();

    private static volatile boolean deviceOperationInProgress;

    private static final String TAG = "MposDeviceManager";
    private static final String PREFS_AGENT = "AGENT_APP_DATA";
    private static final String KEY_MAC = "mpos_connect";
    private static final int MAX_INJECT_ATTEMPTS = 6;
    private static final long RETRY_DELAY_MS = 800;

    public interface InjectProgressCallback {
        void onAttempt(int attempt, int maxAttempts, String step);
    }

    private final Context context;

    public MposDeviceManager(Context context) {
        this.context = context.getApplicationContext();
    }

    public void initializeSdk() {
        if (!Controler.posConnected()) {
            AppController.setConnectedMode("bluetooth");
            Controler.Init(context, CommEnum.CONNECTMODE.BLUETOOTH, AppController.getManufacturerID());
            Controler.SetManufacturerID(AppController.getManufacturerID());
        }
    }

    public boolean isConnected() {
        return Controler.posConnected();
    }

    public String getSavedMac() {
        SharedPreferences pref = context.getSharedPreferences(PREFS_AGENT, Context.MODE_PRIVATE);
        return pref.getString(KEY_MAC, null);
    }

    public boolean connectSavedDevice() {
        initializeSdk();
        String mac = getSavedMac();
        if (mac == null || mac.isEmpty()) {
            return false;
        }
        if (Controler.posConnected()) {
            return true;
        }
        ConnectPosResult result = Controler.connectPos(mac);
        Log.d(TAG, "connectPos mac=" + mac + " connected=" + result.bConnected);
        return result.bConnected;
    }

    public static void setDeviceOperationInProgress(boolean inProgress) {
        deviceOperationInProgress = inProgress;
    }

    public static boolean isDeviceOperationInProgress() {
        return deviceOperationInProgress;
    }

    /**
     * Lightweight Bluetooth keep-alive. Reconnects if the idle session has dropped.
     */
    public boolean pingOrReconnect() {
        synchronized (DEVICE_LOCK) {
            if (deviceOperationInProgress) {
                return true;
            }
            String mac = getSavedMac();
            if (mac == null || mac.isEmpty()) {
                return false;
            }
            initializeSdk();

            if (!Controler.posConnected()) {
                Log.w(TAG, "Ping: not connected — reconnecting");
                return connectSavedDeviceLocked(mac);
            }

            GetRandomResult result = Controler.GetRandomNum();
            if (result != null && CommEnum.COMMRET.NOERROR.equals(result.commResult)) {
                Log.d(TAG, "Ping OK");
                return true;
            }

            Log.w(TAG, "Ping failed result="
                    + (result != null ? result.commResult : "null") + " — reconnecting");
            try {
                Controler.disconnectPos();
            } catch (Exception ignored) {
            }
            return connectSavedDeviceLocked(mac);
        }
    }

    private boolean connectSavedDeviceLocked(String mac) {
        ConnectPosResult result = Controler.connectPos(mac);
        Log.i(TAG, "Reconnect mac=" + mac + " connected=" + result.bConnected);
        return result.bConnected;
    }

    public boolean injectKeys(MposHostParameters params) {
        return injectKeys(params, null);
    }

    /** Prefer plain TPK for MPOS PIN pad encryption during card read. */
    public boolean injectKeysForCardRead(MposHostParameters params) {
        if (params == null || params.getTmk() == null || params.getTpk() == null) {
            return false;
        }
        if (!ensureConnected()) {
            return false;
        }
        if (!injectMasterKey(params.getTmk(), params.getTmkKcv())) {
            return false;
        }
        Controler.SetKeyIndex(CommEnum.KEYINDEX.INDEX0);
        PinKeyStrategy[] preferred = {
                PinKeyStrategy.CLEAR_PLAIN_MAG,
                PinKeyStrategy.HOST_ENCRYPTED_MAG,
                PinKeyStrategy.CLEAR_WORKKEY2
        };
        for (PinKeyStrategy strategy : preferred) {
            if (injectPinKey(params, strategy)) {
                Log.i(TAG, "Card-read key injection OK: " + strategy.name());
                return true;
            }
        }
        return injectKeys(params);
    }

    public boolean injectKeys(MposHostParameters params, InjectProgressCallback callback) {
        if (params == null || params.getTmk() == null || params.getTpk() == null) {
            Log.e(TAG, "Missing TMK/TPK for injection");
            return false;
        }

        PinKeyStrategy[] strategies = PinKeyStrategy.values();
        for (int attempt = 1; attempt <= MAX_INJECT_ATTEMPTS; attempt++) {
            PinKeyStrategy strategy = strategies[(attempt - 1) % strategies.length];
            notifyProgress(callback, attempt, "Connecting to MPOS...");
            if (!ensureConnected()) {
                sleep(RETRY_DELAY_MS);
                continue;
            }

            notifyProgress(callback, attempt, "Loading master key (attempt " + attempt + ")...");
            if (!injectMasterKey(params.getTmk(), params.getTmkKcv())) {
                Log.w(TAG, "Master key injection failed on attempt " + attempt);
                sleep(RETRY_DELAY_MS);
                continue;
            }

            notifyProgress(callback, attempt, "Loading PIN key (" + strategy.name() + ")...");
            if (injectPinKey(params, strategy)) {
                Log.i(TAG, "Key injection succeeded on attempt " + attempt + " using " + strategy.name());
                return true;
            }

            Log.w(TAG, "PIN key injection failed on attempt " + attempt + " using " + strategy.name());
            sleep(RETRY_DELAY_MS);
        }
        return false;
    }

    /** @deprecated use {@link #injectKeys(MposHostParameters)} */
    public boolean injectKeys(String clearTmk, String clearTpk, String tmkKcv) {
        MposHostParameters params = new MposHostParameters();
        params.setTmk(clearTmk);
        params.setTpk(clearTpk);
        params.setTmkKcv(tmkKcv);
        return injectKeys(params);
    }

    private boolean injectMasterKey(String clearTmk, String tmkKcv) {
        String tmk32 = normalizeHexKey(clearTmk, 32);
        String mainKeyHex = tmk32 + normalizeKcv(tmkKcv, tmk32);

        byte[] kekD1 = Misc.asc2hex(mainKeyHex, 0, 16, 0);
        byte[] kekD2 = Misc.asc2hex(mainKeyHex, 16, 16, 0);
        byte[] kvcBytes = Misc.asc2hex(mainKeyHex, 32, 8, 0);

        LoadMainKeyResult mainResult = Controler.LoadMainKey(
                CommEnum.MAINKEYENCRYPT.PLAINTEXT,
                CommEnum.KEYINDEX.INDEX0,
                CommEnum.MAINKEYTYPE.DOUBLE,
                kekD1, kekD2, kvcBytes);

        if (!mainResult.loadResult) {
            Log.e(TAG, "LoadMainKey failed");
            return false;
        }

        Controler.SetKeyIndex(CommEnum.KEYINDEX.INDEX0);
        Log.d(TAG, "LoadMainKey + SetKeyIndex succeeded");
        return true;
    }

    private boolean injectPinKey(MposHostParameters params, PinKeyStrategy strategy) {
        switch (strategy) {
            case HOST_ENCRYPTED_MAG:
                return loadWorkKeyMag(buildWorkKeyHex(
                        normalizeHexKey(params.getEncryptedTpk(), 32),
                        normalizeKcv(params.getTpkKcv(), params.getTpk())));
            case CLEAR_PLAIN_MAG:
                return loadWorkKeyMag(buildWorkKeyHex(
                        normalizeHexKey(params.getTpk(), 32),
                        normalizeKcv(null, params.getTpk())));
            case LOCAL_ENCRYPTED_MAG:
                return loadWorkKeyMag(buildEncryptedUnderTmkWorkKeyHex(params.getTmk(), params.getTpk()));
            case CLEAR_DOUBLE:
                return loadWorkKeyDouble(buildWorkKeyHex(
                        normalizeHexKey(params.getTpk(), 32),
                        normalizeKcv(null, params.getTpk())));
            case HOST_ENCRYPTED_WORKKEY2:
                return loadWorkKey2(
                        normalizeHexKey(params.getEncryptedTpk(), 32),
                        normalizeKcv(params.getTpkKcv(), params.getTpk()));
            case CLEAR_WORKKEY2:
                return loadWorkKey2(
                        normalizeHexKey(params.getTpk(), 32),
                        normalizeKcv(null, params.getTpk()));
            default:
                return false;
        }
    }

    private boolean loadWorkKeyMag(String workKeyHex) {
        byte[] workKeyBytes = Misc.asc2hex(workKeyHex);
        Log.d(TAG, "LoadWorkKey DOUBLEMAG len=" + workKeyBytes.length);
        LoadWorkKeyResult result = Controler.LoadWorkKey(
                CommEnum.KEYINDEX.INDEX0,
                CommEnum.WORKKEYTYPE.DOUBLEMAG,
                workKeyBytes,
                workKeyBytes.length);
        Log.d(TAG, "LoadWorkKey DOUBLEMAG result=" + result.loadResult);
        return result.loadResult;
    }

    private boolean loadWorkKeyDouble(String workKeyHex) {
        byte[] workKeyBytes = Misc.asc2hex(workKeyHex);
        Log.d(TAG, "LoadWorkKey DOUBLE len=" + workKeyBytes.length);
        LoadWorkKeyResult result = Controler.LoadWorkKey(
                CommEnum.KEYINDEX.INDEX0,
                CommEnum.WORKKEYTYPE.DOUBLE,
                workKeyBytes,
                workKeyBytes.length);
        Log.d(TAG, "LoadWorkKey DOUBLE result=" + result.loadResult);
        return result.loadResult;
    }

    private boolean loadWorkKey2(String key32, String kcv8) {
        byte[] pinSlot = buildKeySlotBytes(key32, kcv8);
        byte[] macSlot = buildKeySlotBytes(key32, kcv8);
        byte[] tdkSlot = buildKeySlotBytes(key32, kcv8);
        Log.d(TAG, "LoadWorkKey2 slotLen=" + pinSlot.length);
        LoadWorkKeyResult result = Controler.LoadWorkKey2(
                CommEnum.KEYINDEX.INDEX0,
                CommEnum.WORKKEYTYPE.DOUBLEMAG,
                (byte) 0x01,
                pinSlot,
                macSlot,
                tdkSlot);
        Log.d(TAG, "LoadWorkKey2 result=" + result.loadResult);
        return result.loadResult;
    }

    private String buildWorkKeyHex(String key32, String kcv8) {
        String slot = key32 + kcv8;
        return slot + slot + slot;
    }

    private String buildEncryptedUnderTmkWorkKeyHex(String clearTmk, String clearTpk) {
        String tmk32 = normalizeHexKey(clearTmk, 32);
        String tpk32 = normalizeHexKey(clearTpk, 32);
        String encrypted = PinBlockEncryptionUtil.EncryptKey(tmk32, tpk32);
        if (encrypted == null || encrypted.isEmpty()) {
            encrypted = tpk32;
        }
        encrypted = normalizeHexKey(encrypted, 32);
        return buildWorkKeyHex(encrypted, normalizeKcv(null, tpk32));
    }

    private static byte[] buildKeySlotBytes(String key32, String kcv8) {
        return Misc.asc2hex(key32 + kcv8);
    }

    private boolean ensureConnected() {
        if (Controler.posConnected()) {
            return true;
        }
        return connectSavedDevice();
    }

    private static void notifyProgress(InjectProgressCallback callback, int attempt, String step) {
        if (callback != null) {
            callback.onAttempt(attempt, MAX_INJECT_ATTEMPTS, step);
        }
    }

    private static void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static String normalizeHexKey(String key, int length) {
        String value = key != null ? key.replaceAll("\\s", "").toUpperCase() : "";
        return padRight(value, length, '0').substring(0, length);
    }

    private static String normalizeKcv(String hostKcv, String clearKey32) {
        if (hostKcv != null && !hostKcv.trim().isEmpty()) {
            String kcv = hostKcv.replaceAll("\\s", "").toUpperCase();
            if (kcv.length() >= 8) {
                return kcv.substring(0, 8);
            }
            return padRight(kcv, 8, '0');
        }
        return computeKcv8(clearKey32);
    }

    private static String computeKcv8(String clearKey32) {
        try {
            String zeros = ISOUtil.padleft("0", 16, '0');
            String kcv = PinBlockEncryptionUtil.EncryptKey(clearKey32, zeros);
            if (kcv != null && !kcv.isEmpty()) {
                kcv = kcv.replaceAll("\\s", "").toUpperCase();
                if (kcv.length() >= 8) {
                    return kcv.substring(0, 8);
                }
                return padRight(kcv, 8, '0');
            }
        } catch (Exception ignored) {
        }
        return "00000000";
    }

    private static String padRight(String value, int length, char pad) {
        if (value == null) {
            value = "";
        }
        StringBuilder sb = new StringBuilder(value);
        while (sb.length() < length) {
            sb.append(pad);
        }
        return sb.toString();
    }

    private enum PinKeyStrategy {
        HOST_ENCRYPTED_MAG,
        CLEAR_PLAIN_MAG,
        LOCAL_ENCRYPTED_MAG,
        CLEAR_DOUBLE,
        HOST_ENCRYPTED_WORKKEY2,
        CLEAR_WORKKEY2
    }
}
