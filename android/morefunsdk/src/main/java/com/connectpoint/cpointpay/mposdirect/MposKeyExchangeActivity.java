package com.connectpoint.cpointpay.mposdirect;

import android.os.Bundle;
import android.util.Log;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.connectpoint.cpointpay.R;

/**
 * Downloads TMK/TSK/TPK from the switch host and injects keys into the MoreFun MPOS device.
 */
public class MposKeyExchangeActivity extends AppCompatActivity {

    private static final String TAG = "MposKeyExchangeActivity";

    private TextView tvProcessMessage;
    private MposSessionManager sessionManager;
    private MposDeviceManager deviceManager;
    private MposKeyExchangeService keyExchangeService;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_mpos_direct_progress);

        tvProcessMessage = findViewById(R.id.tvProcessMessage);
        sessionManager = new MposSessionManager(this);
        deviceManager = new MposDeviceManager(this);
        keyExchangeService = new MposKeyExchangeService();
        MposDeviceManager.setDeviceOperationInProgress(true);

        MposConnectionKeepAlive.acquire(this);
        startKeyExchange();
    }

    @Override
    protected void onDestroy() {
        MposConnectionKeepAlive.release(this);
        MposDeviceManager.setDeviceOperationInProgress(false);
        super.onDestroy();
    }

    private void startKeyExchange() {
        new Thread(() -> {
            if (!deviceManager.connectSavedDevice()) {
                runOnUiThread(() -> finishWithError(getString(R.string.mpos_direct_connect_failed)));
                return;
            }

            String terminalId = sessionManager.getTerminalId();
            String serverIp = sessionManager.getServerIp();
            int port = sessionManager.getPort();
            boolean enableSsl = sessionManager.isEnableSsl();
            String key1 = sessionManager.getKeyComponent1();
            String key2 = sessionManager.getKeyComponent2();

            keyExchangeService.performKeyExchange(terminalId, serverIp, port, enableSsl, key1, key2,
                    new MposKeyExchangeService.Callback() {
                        @Override
                        public void onProgress(String step) {
                            runOnUiThread(() -> tvProcessMessage.setText(step));
                        }

                        @Override
                        public void onSuccess(MposHostParameters params) {
                            runOnUiThread(() -> tvProcessMessage.setText(getString(R.string.mpos_direct_injecting_keys)));
                            new Thread(() -> {
                                synchronized (MposDeviceManager.DEVICE_LOCK) {
                                    boolean injected = deviceManager.injectKeys(params,
                                            (attempt, maxAttempts, step) ->
                                                    runOnUiThread(() -> tvProcessMessage.setText(
                                                            step + " (" + attempt + "/" + maxAttempts + ")")));
                                    if (!injected) {
                                        runOnUiThread(() -> finishWithError(
                                                getString(R.string.mpos_direct_key_injection_failed)));
                                        return;
                                    }

                                    runOnUiThread(() -> tvProcessMessage.setText(
                                            getString(R.string.mpos_direct_loading_emv)));
                                    if (!MposEmvConfigurator.configure(params)) {
                                        runOnUiThread(() -> finishWithError(
                                                "Failed to load EMV parameters (AIDs/CAPKs) onto MPOS"));
                                        return;
                                    }

                                    sessionManager.saveHostParameters(params);
                                    runOnUiThread(() -> {
                                        Toast.makeText(MposKeyExchangeActivity.this,
                                                R.string.mpos_direct_key_exchange_success, Toast.LENGTH_LONG).show();
                                        finish();
                                    });
                                }
                            }).start();
                        }

                        @Override
                        public void onError(String message) {
                            runOnUiThread(() -> finishWithError(message));
                        }
                    });
        }).start();
    }

    private void finishWithError(String message) {
        Log.e(TAG, "Key exchange failed: " + message);
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
        finish();
    }
}
