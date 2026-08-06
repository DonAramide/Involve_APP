package com.connectpoint.cpointpay.mposdirect;

import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.connectpoint.cpointpay.R;
import com.connectpoint.cpointpay.utils.AppController;
import com.google.android.material.textfield.TextInputEditText;
import com.sample.activity.BluetoothConnectActivity;

/**
 * Home screen for direct MPOS payment — mirrors C:\dev\mpos MainActivity using MoreFun Bluetooth.
 */
public class MposHomeActivity extends AppCompatActivity {

    private MposSessionManager sessionManager;
    private MposDeviceManager deviceManager;
    private TextView tvConnectionStatus;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_mpos_direct_home);

        sessionManager = new MposSessionManager(this);
        deviceManager = new MposDeviceManager(this);
        deviceManager.initializeSdk();

        tvConnectionStatus = findViewById(R.id.tvConnectionStatus);
        bindConfigFields();
        updateConnectionStatus();

        findViewById(R.id.btnPairDevice).setOnClickListener(v -> pairDevice());
        findViewById(R.id.btnLoadParams).setOnClickListener(v -> loadParams());
        findViewById(R.id.btnPay).setOnClickListener(v -> startPayment());

        MposConnectionKeepAlive.acquire(this);
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateConnectionStatus();
    }

    @Override
    protected void onDestroy() {
        MposConnectionKeepAlive.release(this);
        super.onDestroy();
    }

    private void bindConfigFields() {
        setText(R.id.txtTerminalId, sessionManager.getTerminalId());
        setText(R.id.txtHostIp, sessionManager.getServerIp());
        setText(R.id.txtHostPort, String.valueOf(sessionManager.getPort()));
        setText(R.id.txtKeyComponent1, sessionManager.getKeyComponent1());
        setText(R.id.txtKeyComponent2, sessionManager.getKeyComponent2());
    }

    private void setText(int viewId, String value) {
        TextInputEditText editText = findViewById(viewId);
        if (editText != null) {
            editText.setText(value);
        }
    }

    private void saveConfigFromUi() {
        String terminalId = getFieldText(R.id.txtTerminalId);
        String hostIp = getFieldText(R.id.txtHostIp);
        int port = parsePort(getFieldText(R.id.txtHostPort));
        String key1 = getFieldText(R.id.txtKeyComponent1);
        String key2 = getFieldText(R.id.txtKeyComponent2);
        sessionManager.saveConnectionConfig(terminalId, hostIp, port, MposDefaults.ENABLE_SSL, key1, key2);
    }

    private String getFieldText(int viewId) {
        TextInputEditText editText = findViewById(viewId);
        return editText != null && editText.getText() != null ? editText.getText().toString().trim() : "";
    }

    private int parsePort(String value) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return MposDefaults.HOST_PORT;
        }
    }

    private void updateConnectionStatus() {
        String mac = deviceManager.getSavedMac();
        boolean connected = deviceManager.isConnected();
        boolean keysLoaded = sessionManager.areKeysLoaded();

        String status;
        if (mac == null || mac.isEmpty()) {
            status = getString(R.string.mpos_direct_not_paired);
        } else if (!connected) {
            status = getString(R.string.mpos_direct_paired_not_connected, mac);
        } else if (keysLoaded) {
            status = getString(R.string.mpos_direct_ready, mac);
        } else {
            status = getString(R.string.mpos_direct_connected_no_keys, mac);
        }
        tvConnectionStatus.setText(status);
    }

    private void pairDevice() {
        // Do not call Controler.Init here — it destroys the live BT session (see log: "destory BLUETOOTH").
        AppController.setConnectedMode(getString(R.string.bluetooth));
        deviceManager.initializeSdk();
        startActivity(new Intent(this, BluetoothConnectActivity.class));
    }

    private void loadParams() {
        saveConfigFromUi();
        if (deviceManager.getSavedMac() == null) {
            toast(R.string.mpos_direct_pair_first);
            return;
        }
        startActivity(new Intent(this, MposKeyExchangeActivity.class));
    }

    private void startPayment() {
        saveConfigFromUi();
        String amountText = getFieldText(R.id.txtAmount);
        if (amountText.isEmpty()) {
            toast(R.string.mpos_direct_enter_amount);
            return;
        }
        double amount;
        try {
            amount = Double.parseDouble(amountText);
        } catch (NumberFormatException e) {
            toast(R.string.mpos_direct_invalid_amount);
            return;
        }
        if (amount <= 0) {
            toast(R.string.mpos_direct_invalid_amount);
            return;
        }
        if (deviceManager.getSavedMac() == null) {
            toast(R.string.mpos_direct_pair_first);
            return;
        }
        if (!sessionManager.areKeysLoaded()) {
            toast(R.string.mpos_direct_load_params_first);
            return;
        }

        Intent intent = new Intent(this, MposPaymentActivity.class);
        intent.putExtra(MposPaymentActivity.EXTRA_AMOUNT, amount);
        startActivity(intent);
    }

    private void toast(int resId) {
        Toast.makeText(this, resId, Toast.LENGTH_SHORT).show();
    }
}
