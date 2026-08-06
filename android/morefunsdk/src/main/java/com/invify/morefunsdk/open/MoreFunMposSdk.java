package com.invify.morefunsdk.open;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;

import com.connectpoint.cpointpay.mposdirect.MposDefaults;
import com.connectpoint.cpointpay.mposdirect.MposDeviceManager;
import com.connectpoint.cpointpay.mposdirect.MposEmvConfigurator;
import com.connectpoint.cpointpay.mposdirect.MposHostParameters;
import com.connectpoint.cpointpay.mposdirect.MposKeyExchangeService;
import com.connectpoint.cpointpay.mposdirect.MposPaymentService;
import com.connectpoint.cpointpay.mposdirect.MposSessionManager;
import com.connectpoint.cpointpay.utils.AppController;
import com.mf.mpos.pub.Controler;
import com.mf.mpos.pub.result.ReadPosInfoResult;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Flutter-facing facade for MoreFun / MP63 MPOS Direct
 * (Pair → Load Params → Pay), adapted from CPointPay mposdirect.
 */
public final class MoreFunMposSdk {

    public interface PairCallback {
        void onResult(String status, String message);
    }

    public interface ProgressCallback {
        void onProgress(String message);
    }

    public interface LoadParamsCallback {
        void onResult(String status, String message, Map<String, Object> params);
    }

    public interface PaymentCallback {
        void onResult(Map<String, Object> response);
    }

    private static final Handler MAIN = new Handler(Looper.getMainLooper());
    private static final ExecutorService EXEC = Executors.newSingleThreadExecutor();

    private static volatile PairCallback pairCallback;

    private MoreFunMposSdk() {
    }

    public static void pairDevice(Activity activity, String posSerialNumber, PairCallback callback) {
        pairCallback = callback;
        Intent intent = new Intent(activity, MoreFunPairActivity.class);
        if (posSerialNumber != null && !posSerialNumber.trim().isEmpty()) {
            intent.putExtra(MoreFunPairActivity.EXTRA_EXPECTED_SERIAL, posSerialNumber);
        }
        activity.startActivity(intent);
    }

    public static void unpairDevice(Context context) {
        try {
            Controler.disconnectPos();
        } catch (Exception ignored) {
        }
        context.getSharedPreferences("AGENT_APP_DATA", Context.MODE_PRIVATE)
                .edit()
                .remove("mpos_connect")
                .apply();
        new MposSessionManager(context).clearKeys();
    }

    public static String getMposSerialNumber(Context context) {
        try {
            MposDeviceManager deviceManager = new MposDeviceManager(context);
            if (!deviceManager.connectSavedDevice()) return null;
            ReadPosInfoResult info = Controler.ReadPosInfo2();
            return info != null ? info.sn : null;
        } catch (Exception e) {
            return null;
        }
    }

    public static void loadParams(
            Context context,
            String terminalId,
            String ipAddress,
            String portNumber,
            boolean enableSsl,
            String key1,
            String key2,
            ProgressCallback onProgress,
            LoadParamsCallback callback
    ) {
        EXEC.execute(() -> {
            try {
                AppController.setConnectedMode("bluetooth");
                MposDeviceManager deviceManager = new MposDeviceManager(context);
                MposSessionManager sessionManager = new MposSessionManager(context);

                String tid = notBlank(terminalId) ? terminalId : MposDefaults.TERMINAL_ID;
                String ip = notBlank(ipAddress) ? ipAddress : MposDefaults.HOST_IP;
                int port = parsePort(portNumber);
                String k1 = notBlank(key1) ? key1 : MposDefaults.KEY_COMPONENT_1;
                String k2 = notBlank(key2) ? key2 : MposDefaults.KEY_COMPONENT_2;

                sessionManager.saveConnectionConfig(tid, ip, port, enableSsl, k1, k2);

                if (!deviceManager.connectSavedDevice()) {
                    post(() -> callback.onResult("failure",
                            "Could not connect to MoreFun MPOS. Pair device first.", null));
                    return;
                }

                MposKeyExchangeService keyExchangeService = new MposKeyExchangeService();
                keyExchangeService.performKeyExchange(tid, ip, port, enableSsl, k1, k2,
                        new MposKeyExchangeService.Callback() {
                            @Override
                            public void onProgress(String step) {
                                post(() -> onProgress.onProgress(step));
                            }

                            @Override
                            public void onSuccess(MposHostParameters params) {
                                EXEC.execute(() -> {
                                    synchronized (MposDeviceManager.DEVICE_LOCK) {
                                        MposDeviceManager.setDeviceOperationInProgress(true);
                                        try {
                                            post(() -> onProgress.onProgress("Injecting keys into device..."));
                                            boolean injected = deviceManager.injectKeys(params,
                                                    (attempt, max, step) ->
                                                            post(() -> onProgress.onProgress(
                                                                    step + " (" + attempt + "/" + max + ")")));
                                            if (!injected) {
                                                post(() -> callback.onResult("failure",
                                                        "Key injection into MoreFun device failed", null));
                                                return;
                                            }
                                            post(() -> onProgress.onProgress("Loading EMV parameters..."));
                                            MposEmvConfigurator.configure(params);
                                            sessionManager.saveHostParameters(params);
                                            Map<String, Object> resultParams = new HashMap<>();
                                            resultParams.put("terminalId", params.getTerminalId());
                                            resultParams.put("ipAddress", params.getServerIp());
                                            resultParams.put("portNumber", String.valueOf(params.getPort()));
                                            resultParams.put("merchantId", params.getMerchantId());
                                            resultParams.put("merchantLocation", params.getMerchantLocation());
                                            post(() -> callback.onResult("success",
                                                    "Key exchange successful", resultParams));
                                        } finally {
                                            MposDeviceManager.setDeviceOperationInProgress(false);
                                        }
                                    }
                                });
                            }

                            @Override
                            public void onError(String message) {
                                post(() -> callback.onResult("failure", message, null));
                            }
                        });
            } catch (Exception e) {
                post(() -> callback.onResult("failure",
                        e.getMessage() != null ? e.getMessage() : "Load params failed", null));
            }
        });
    }

    public static void initiatePayment(
            Context context,
            double amount,
            String terminalId,
            ProgressCallback onProgress,
            PaymentCallback callback
    ) {
        EXEC.execute(() -> {
            try {
                if (amount < 1.0) {
                    Map<String, Object> err = new HashMap<>();
                    err.put("status", "error");
                    Map<String, Object> msg = new HashMap<>();
                    msg.put("message", "Invalid amount, amount should not be less than 1 naira");
                    err.put("error", msg);
                    post(() -> callback.onResult(err));
                    return;
                }

                MposDeviceManager deviceManager = new MposDeviceManager(context);
                MposSessionManager sessionManager = new MposSessionManager(context);

                if (notBlank(terminalId)) {
                    sessionManager.saveConnectionConfig(
                            terminalId,
                            sessionManager.getServerIp(),
                            sessionManager.getPort(),
                            sessionManager.isEnableSsl(),
                            sessionManager.getKeyComponent1(),
                            sessionManager.getKeyComponent2()
                    );
                }

                if (!deviceManager.connectSavedDevice()) {
                    Map<String, Object> err = new HashMap<>();
                    err.put("status", "error");
                    Map<String, Object> msg = new HashMap<>();
                    msg.put("message", "Could not connect to MoreFun MPOS. Pair device first.");
                    err.put("error", msg);
                    post(() -> callback.onResult(err));
                    return;
                }

                if (!sessionManager.areKeysLoaded()) {
                    Map<String, Object> err = new HashMap<>();
                    err.put("status", "error");
                    Map<String, Object> msg = new HashMap<>();
                    msg.put("message", "Keys not loaded. Run Download Params first.");
                    err.put("error", msg);
                    post(() -> callback.onResult(err));
                    return;
                }

                MposHostParameters host = sessionManager.getHostParameters();
                MposPaymentService paymentService = new MposPaymentService();
                final String[] readError = {null};

                post(() -> onProgress.onProgress("Waiting for card..."));
                MposDeviceManager.setDeviceOperationInProgress(true);
                MposPaymentService.CardReadData card;
                try {
                    card = paymentService.readCard(amount, host, deviceManager,
                            new MposPaymentService.CardReadListener() {
                                @Override
                                public void onStep(int step) {
                                    String m;
                                    if (step == 1) m = "Waiting for card...";
                                    else if (step == 2) m = "Reading card...";
                                    else if (step == 3) m = "Enter PIN on MPOS...";
                                    else m = "Processing card...";
                                    String finalM = m;
                                    post(() -> onProgress.onProgress(finalM));
                                }

                                @Override
                                public void onCardRead(MposPaymentService.CardReadData data) {
                                    post(() -> onProgress.onProgress("Card read OK"));
                                }

                                @Override
                                public void onError(String message) {
                                    readError[0] = message;
                                }
                            });
                } finally {
                    MposDeviceManager.setDeviceOperationInProgress(false);
                }

                if (card == null) {
                    Map<String, Object> response = new HashMap<>();
                    response.put("status", "payment_failed");
                    Map<String, Object> tx = new HashMap<>();
                    tx.put("message", readError[0] != null ? readError[0] : "Card read failed or cancelled");
                    tx.put("paymentSuccess", false);
                    response.put("transaction", tx);
                    post(() -> callback.onResult(response));
                    return;
                }

                post(() -> onProgress.onProgress("Sending to host..."));
                MposPaymentService.PaymentResult result = paymentService.sendPurchase(host, card, amount);
                boolean success = result.approved;

                Map<String, Object> response = new HashMap<>();
                response.put("status", success ? "payment_success" : "payment_failed");
                Map<String, Object> tx = new HashMap<>();
                tx.put("amount", String.format(Locale.US, "%.2f", amount));
                tx.put("authCode", result.authCode != null ? result.authCode : "");
                tx.put("rrn", "");
                tx.put("stan", "");
                tx.put("statusCode", result.responseCode != null ? result.responseCode : "");
                tx.put("message", result.message != null ? result.message : (success ? "Approved" : "Declined"));
                tx.put("maskedPan", maskPan(card.pan));
                tx.put("cardExpireDate", card.expData != null ? card.expData : "");
                tx.put("cardHolderName", card.cardName != null ? card.cardName : "");
                tx.put("aid", "");
                tx.put("appLabel", "");
                tx.put("transactionType", "PURCHASE");
                tx.put("paymentSuccess", success);
                response.put("transaction", tx);
                post(() -> callback.onResult(response));
            } catch (Exception e) {
                Map<String, Object> err = new HashMap<>();
                err.put("status", "error");
                Map<String, Object> msg = new HashMap<>();
                msg.put("message", e.getMessage() != null ? e.getMessage() : "Payment failed");
                err.put("error", msg);
                post(() -> callback.onResult(err));
            }
        });
    }

    /**
     * Card balance inquiry — same Pair/keys path as Pay, ISO proc 310000.
     */
    public static void checkBalance(
            Context context,
            String terminalId,
            ProgressCallback onProgress,
            PaymentCallback callback
    ) {
        EXEC.execute(() -> {
            try {
                MposDeviceManager deviceManager = new MposDeviceManager(context);
                MposSessionManager sessionManager = new MposSessionManager(context);

                if (notBlank(terminalId)) {
                    sessionManager.saveConnectionConfig(
                            terminalId,
                            sessionManager.getServerIp(),
                            sessionManager.getPort(),
                            sessionManager.isEnableSsl(),
                            sessionManager.getKeyComponent1(),
                            sessionManager.getKeyComponent2()
                    );
                }

                if (!deviceManager.connectSavedDevice()) {
                    Map<String, Object> err = new HashMap<>();
                    err.put("status", "error");
                    Map<String, Object> msg = new HashMap<>();
                    msg.put("message", "Could not connect to MoreFun MPOS. Pair device first.");
                    err.put("error", msg);
                    post(() -> callback.onResult(err));
                    return;
                }

                if (!sessionManager.areKeysLoaded()) {
                    Map<String, Object> err = new HashMap<>();
                    err.put("status", "error");
                    Map<String, Object> msg = new HashMap<>();
                    msg.put("message", "Keys not loaded. Run Download Params first.");
                    err.put("error", msg);
                    post(() -> callback.onResult(err));
                    return;
                }

                MposHostParameters host = sessionManager.getHostParameters();
                MposPaymentService paymentService = new MposPaymentService();
                final String[] readError = {null};

                post(() -> onProgress.onProgress("Waiting for card..."));
                MposDeviceManager.setDeviceOperationInProgress(true);
                MposPaymentService.CardReadData card;
                try {
                    // Amount 0 — device prompts for card + PIN without a purchase amount.
                    card = paymentService.readCard(0.0, host, deviceManager,
                            new MposPaymentService.CardReadListener() {
                                @Override
                                public void onStep(int step) {
                                    String m;
                                    if (step == 1) m = "Waiting for card...";
                                    else if (step == 2) m = "Reading card...";
                                    else if (step == 3) m = "Enter PIN on MPOS...";
                                    else m = "Processing card...";
                                    String finalM = m;
                                    post(() -> onProgress.onProgress(finalM));
                                }

                                @Override
                                public void onCardRead(MposPaymentService.CardReadData data) {
                                    post(() -> onProgress.onProgress("Card read OK"));
                                }

                                @Override
                                public void onError(String message) {
                                    readError[0] = message;
                                }
                            });
                } finally {
                    MposDeviceManager.setDeviceOperationInProgress(false);
                }

                if (card == null) {
                    Map<String, Object> response = new HashMap<>();
                    response.put("status", "balance_failed");
                    Map<String, Object> tx = new HashMap<>();
                    tx.put("message", readError[0] != null ? readError[0] : "Card read failed or cancelled");
                    tx.put("paymentSuccess", false);
                    response.put("transaction", tx);
                    post(() -> callback.onResult(response));
                    return;
                }

                post(() -> onProgress.onProgress("Checking balance with host..."));
                MposPaymentService.BalanceResult result = paymentService.sendBalanceInquiry(host, card);
                boolean success = result.approved;

                Map<String, Object> response = new HashMap<>();
                response.put("status", success ? "balance_success" : "balance_failed");
                Map<String, Object> tx = new HashMap<>();
                tx.put("amount", result.balanceFormatted != null ? result.balanceFormatted : "");
                tx.put("authCode", result.authCode != null ? result.authCode : "");
                tx.put("rrn", "");
                tx.put("stan", "");
                tx.put("statusCode", result.responseCode != null ? result.responseCode : "");
                tx.put("message", result.message != null ? result.message : (success ? "Approved" : "Declined"));
                tx.put("maskedPan", result.maskedPan != null ? result.maskedPan : maskPan(card.pan));
                tx.put("cardExpireDate", card.expData != null ? card.expData : "");
                tx.put("cardHolderName", card.cardName != null ? card.cardName : "");
                tx.put("aid", "");
                tx.put("appLabel", "");
                tx.put("transactionType", "BALANCE_INQUIRY");
                tx.put("paymentSuccess", success);
                tx.put("balance", result.balanceFormatted != null ? result.balanceFormatted : "");
                tx.put("currencyCode", result.currencyCode != null ? result.currencyCode : "566");
                tx.put("rawField54", result.rawField54 != null ? result.rawField54 : "");
                response.put("transaction", tx);
                post(() -> callback.onResult(response));
            } catch (Exception e) {
                Map<String, Object> err = new HashMap<>();
                err.put("status", "error");
                Map<String, Object> msg = new HashMap<>();
                msg.put("message", e.getMessage() != null ? e.getMessage() : "Balance inquiry failed");
                err.put("error", msg);
                post(() -> callback.onResult(err));
            }
        });
    }

    public static void notifyPairResult(String status, String message) {
        PairCallback cb = pairCallback;
        pairCallback = null;
        if (cb != null) {
            post(() -> cb.onResult(status, message));
        }
    }

    private static boolean notBlank(String s) {
        return s != null && !s.trim().isEmpty();
    }

    private static int parsePort(String portNumber) {
        try {
            return Integer.parseInt(portNumber);
        } catch (Exception e) {
            return MposDefaults.HOST_PORT;
        }
    }

    private static String maskPan(String pan) {
        if (pan == null || pan.length() < 10) return pan != null ? pan : "";
        return pan.substring(0, 6) + "****" + pan.substring(pan.length() - 4);
    }

    private static void post(Runnable r) {
        MAIN.post(r);
    }
}
