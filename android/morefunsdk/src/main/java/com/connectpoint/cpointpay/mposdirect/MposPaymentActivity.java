package com.connectpoint.cpointpay.mposdirect;

import android.os.Bundle;
import android.view.WindowManager;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.connectpoint.cpointpay.R;

/**
 * Connects to MPOS, reads card, and posts ISO8583 purchase directly to the switch host.
 */
public class MposPaymentActivity extends AppCompatActivity {

    public static final String EXTRA_AMOUNT = "extra_amount";

    private TextView tvProcessMessage;
    private MposSessionManager sessionManager;
    private MposDeviceManager deviceManager;
    private MposPaymentService paymentService;
    private double amount;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_mpos_direct_progress);

        amount = getIntent().getDoubleExtra(EXTRA_AMOUNT, 0);
        tvProcessMessage = findViewById(R.id.tvProcessMessage);
        sessionManager = new MposSessionManager(this);
        deviceManager = new MposDeviceManager(this);
        paymentService = new MposPaymentService();

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        deviceManager.initializeSdk();
        MposDeviceManager.setDeviceOperationInProgress(true);

        // Avoid duplicate payment threads when the activity is recreated (e.g. rotation).
        if (savedInstanceState == null) {
            tvProcessMessage.setText(getString(R.string.mpos_direct_connecting_device));
            startPaymentFlow();
        }

        MposConnectionKeepAlive.acquire(this);
    }

    @Override
    protected void onDestroy() {
        MposConnectionKeepAlive.release(this);
        MposDeviceManager.setDeviceOperationInProgress(false);
        super.onDestroy();
    }

    private void startPaymentFlow() {
        new Thread(() -> {
            if (!deviceManager.connectSavedDevice()) {
                runOnUiThread(() -> showResult(false, getString(R.string.mpos_direct_connect_failed)));
                return;
            }

            MposHostParameters host = sessionManager.getHostParameters();
            if (host == null || !host.hasKeys()) {
                runOnUiThread(() -> showResult(false, getString(R.string.mpos_direct_load_params_first)));
                return;
            }

            runOnUiThread(() -> tvProcessMessage.setText(getString(R.string.mpos_direct_waiting_card)));

            MposPaymentService.CardReadData card = paymentService.readCard(amount, host, deviceManager,
                    new MposPaymentService.CardReadListener() {
                @Override
                public void onStep(int step) {
                    runOnUiThread(() -> {
                        switch (step) {
                            case 1:
                                tvProcessMessage.setText(getString(R.string.mpos_direct_waiting_card));
                                break;
                            case 2:
                                tvProcessMessage.setText(getString(R.string.mpos_direct_reading_card));
                                break;
                            case 3:
                                tvProcessMessage.setText(getString(R.string.mpos_direct_enter_pin));
                                break;
                            default:
                                break;
                        }
                    });
                }

                @Override
                public void onCardRead(MposPaymentService.CardReadData data) {
                    // handled by return value
                }

                @Override
                public void onError(String message) {
                    runOnUiThread(() -> showResult(false, message));
                }
            });

            if (card == null) {
                return;
            }

            runOnUiThread(() -> tvProcessMessage.setText(getString(R.string.mpos_direct_sending_to_host)));
            MposPaymentService.PaymentResult result = paymentService.sendPurchase(host, card, amount);
            runOnUiThread(() -> showResult(result.approved,
                    result.message + (result.authCode != null && !result.authCode.isEmpty()
                            ? "\nAuth: " + result.authCode : "")));
        }).start();
    }

    private void showResult(boolean success, String message) {
        new AlertDialog.Builder(this)
                .setTitle(success ? R.string.mpos_direct_success : R.string.mpos_direct_failed)
                .setMessage(message)
                .setCancelable(false)
                .setPositiveButton(android.R.string.ok, (d, w) -> finish())
                .show();
    }
}
