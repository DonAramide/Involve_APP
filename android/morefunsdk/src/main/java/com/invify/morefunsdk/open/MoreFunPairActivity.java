package com.invify.morefunsdk.open;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.ListView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.connectpoint.cpointpay.mposdirect.MposDeviceManager;
import com.connectpoint.cpointpay.utils.AppController;
import com.invify.morefunsdk.R;
import com.mf.mpos.pub.Controler;
import com.mf.mpos.pub.result.ConnectPosResult;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Bluetooth discovery + connect for MoreFun MP63.
 * Saves MAC to AGENT_APP_DATA / mpos_connect (same contract as CPointPay MPOS Direct).
 */
public class MoreFunPairActivity extends AppCompatActivity {

    public static final String EXTRA_EXPECTED_SERIAL = "expectedSerial";

    private final Map<String, String> devices = new LinkedHashMap<>();
    private ArrayAdapter<String> adapter;
    private TextView statusText;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private boolean receiverRegistered;

    private final BroadcastReceiver receiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent == null || intent.getAction() == null) return;
            switch (intent.getAction()) {
                case BluetoothDevice.ACTION_FOUND: {
                    BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                    if (device == null) return;
                    String name = device.getName();
                    String mac = device.getAddress();
                    if (name == null || mac == null) return;
                    if (!devices.containsKey(mac)) {
                        devices.put(mac, name);
                        refreshList();
                    }
                    break;
                }
                case BluetoothAdapter.ACTION_DISCOVERY_FINISHED:
                    statusText.setText(getString(R.string.morefun_scan_finished, devices.size()));
                    break;
                default:
                    break;
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_morefun_pair);

        statusText = findViewById(R.id.tvStatus);
        ListView listView = findViewById(R.id.listDevices);
        adapter = new ArrayAdapter<>(this, android.R.layout.simple_list_item_1, new ArrayList<>());
        listView.setAdapter(adapter);

        findViewById(R.id.btnScan).setOnClickListener(v -> startScan());
        findViewById(R.id.btnCancel).setOnClickListener(v -> {
            MoreFunMposSdk.notifyPairResult("failure", "Pairing cancelled");
            finish();
        });

        listView.setOnItemClickListener((parent, view, position, id) -> {
            List<Map.Entry<String, String>> entries = new ArrayList<>(devices.entrySet());
            if (position < 0 || position >= entries.size()) return;
            Map.Entry<String, String> entry = entries.get(position);
            connect(entry.getKey(), entry.getValue());
        });

        AppController.setConnectedMode("bluetooth");
        startScan();
    }

    @Override
    protected void onDestroy() {
        stopScan();
        if (receiverRegistered) {
            try {
                unregisterReceiver(receiver);
            } catch (Exception ignored) {
            }
            receiverRegistered = false;
        }
        super.onDestroy();
    }

    private void startScan() {
        BluetoothAdapter bt = BluetoothAdapter.getDefaultAdapter();
        if (bt == null) {
            Toast.makeText(this, R.string.morefun_bt_unavailable, Toast.LENGTH_LONG).show();
            return;
        }
        if (!bt.isEnabled()) {
            Toast.makeText(this, R.string.morefun_bt_disabled, Toast.LENGTH_LONG).show();
            return;
        }

        devices.clear();
        try {
            for (BluetoothDevice d : bt.getBondedDevices()) {
                if (d.getName() != null) {
                    devices.put(d.getAddress(), d.getName());
                }
            }
        } catch (SecurityException ignored) {
        }
        refreshList();

        if (!receiverRegistered) {
            IntentFilter filter = new IntentFilter();
            filter.addAction(BluetoothDevice.ACTION_FOUND);
            filter.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
            registerReceiver(receiver, filter);
            receiverRegistered = true;
        }

        try {
            if (bt.isDiscovering()) bt.cancelDiscovery();
            bt.startDiscovery();
            statusText.setText(R.string.morefun_scanning);
        } catch (SecurityException e) {
            statusText.setText(e.getMessage());
        }
    }

    private void stopScan() {
        try {
            BluetoothAdapter bt = BluetoothAdapter.getDefaultAdapter();
            if (bt != null) bt.cancelDiscovery();
        } catch (Exception ignored) {
        }
    }

    private void refreshList() {
        List<String> rows = new ArrayList<>();
        for (Map.Entry<String, String> e : devices.entrySet()) {
            rows.add(e.getValue() + "\n" + e.getKey());
        }
        adapter.clear();
        adapter.addAll(rows);
        adapter.notifyDataSetChanged();
    }

    private void connect(String mac, String name) {
        stopScan();
        statusText.setText(getString(R.string.morefun_connecting, name));
        executor.execute(() -> {
            try {
                if (!Controler.posConnected()) {
                    AppController.setConnectedMode("bluetooth");
                    new MposDeviceManager(this).initializeSdk();
                } else {
                    try {
                        Controler.disconnectPos();
                    } catch (Exception ignored) {
                    }
                }

                ConnectPosResult result = Controler.connectPos(mac);
                if (result.bConnected) {
                    getSharedPreferences("AGENT_APP_DATA", Context.MODE_PRIVATE)
                            .edit()
                            .putString("mpos_connect", mac)
                            .apply();
                    runOnUiThread(() -> {
                        MoreFunMposSdk.notifyPairResult("success", "Paired " + name + " (" + mac + ")");
                        finish();
                    });
                } else {
                    runOnUiThread(() -> {
                        statusText.setText(R.string.morefun_connect_failed);
                        Toast.makeText(this, R.string.morefun_connect_failed, Toast.LENGTH_LONG).show();
                    });
                }
            } catch (Exception e) {
                runOnUiThread(() -> {
                    statusText.setText(e.getMessage());
                    Toast.makeText(this, e.getMessage() != null ? e.getMessage() : "Connect failed",
                            Toast.LENGTH_LONG).show();
                });
            }
        });
    }
}
