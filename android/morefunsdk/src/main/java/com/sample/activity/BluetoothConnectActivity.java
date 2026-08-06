package com.sample.activity;

import static com.connectpoint.cpointpay.activity.AgentVisitReport.TAG;

import android.Manifest;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.AdapterView;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.TextView;

import androidx.core.app.ActivityCompat;

import com.connectpoint.cpointpay.R;
import com.mf.mpos.pub.Controler;
import com.mf.mpos.pub.result.ConnectPosResult;
import com.sample.adapter.BluetoothItem;
import com.sample.adapter.BluetoothListAdapter;
import com.sample.utils.SweetDialogUtils;


import java.lang.reflect.Method;
import java.util.Set;

import butterknife.BindView;
import butterknife.ButterKnife;
import butterknife.OnClick;
import cn.pedant.SweetAlert.SweetAlertDialog;

public class BluetoothConnectActivity extends Activity {
    @BindView(R.id.listview)
    ListView mListView;

    @BindView(R.id.tv_mac)
    TextView tv_mac;

    @BindView(R.id.tv_name)
    TextView tv_name;

    @BindView(R.id.ll_bluetoothDevice)
    LinearLayout ll_bluetoothDevice;

    private final BluetoothAdapter btAdapter = BluetoothAdapter.getDefaultAdapter();
    private BluetoothListAdapter mAdapter;
    private BluetoothReceiver br;
    private final String bluetoothMac = "";
    private final String bluetoothName = "";

    private static final int REQUEST_BLUETOOTH_PERMISSION = 1;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_connect_bluetooth);

        ButterKnife.bind(this);
        mAdapter = new BluetoothListAdapter(this);
        mListView.setAdapter(mAdapter);
        mListView.setFastScrollEnabled(true);
        mListView.setOnItemClickListener(mListClickListener);

        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            // TODO: Consider calling
            //    ActivityCompat#requestPermissions
            // here to request the missing permissions, and then overriding
            //   public void onRequestPermissionsResult(int requestCode, String[] permissions,
            //                                          int[] grantResults)
            // to handle the case where the user grants the permission. See the documentation
            // for ActivityCompat#requestPermissions for more details.
            return;
        }
        btAdapter.enable();
//        if (!MyApplication.getBluetoothMac().isEmpty()) {
//            ll_bluetoothDevice.setVisibility(View.VISIBLE);
//            tv_name.setText(MyApplication.getBluetoothName());
//            tv_mac.setText(MyApplication.getBluetoothMac());
//        } else {
//            ll_bluetoothDevice.setVisibility(View.GONE);
//        }
        registerReceiver();

    }

    @Override
    protected void onDestroy() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN)
                == PackageManager.PERMISSION_GRANTED) {
            btAdapter.cancelDiscovery();
        }
        unregisterReceiver();
        super.onDestroy();
    }

    @OnClick({R.id.removeBond, R.id.search, R.id.connect, R.id.isConnect, R.id.disconnect})
    public void onClick(View view) {
        switch (view.getId()) {
            case R.id.removeBond:
                removeBondMethods();
                break;
            case R.id.search:
                Log.d(TAG, "bluetooth started here");
                if (ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
                    // Permission not granted, request it
//                    ActivityCompat.requestPermissions(this,
//                            new String[]{
//                                    Manifest.permission.BLUETOOTH_SCAN,
//                                    Manifest.permission.BLUETOOTH_ADMIN,
//                                    Manifest.permission.BLUETOOTH_SCAN,
//                                    Manifest.permission.BLUETOOTH_ADVERTISE,
//                                    Manifest.permission.BLUETOOTH_CONNECT,
//                                    Manifest.permission.BLUETOOTH
//                            },
//                            REQUEST_BLUETOOTH_PERMISSION);
                }
                btAdapter.cancelDiscovery();
                startDiscovery();
                break;
            case R.id.connect:
                connectDevice();
                break;
            case R.id.isConnect:
                if (Controler.posConnected()) {
                    new SweetAlertDialog(BluetoothConnectActivity.this, SweetAlertDialog.SUCCESS_TYPE)
                            .setContentText(getString(R.string.device_already_connect))
                            .show();
                } else {
                    new SweetAlertDialog(BluetoothConnectActivity.this, SweetAlertDialog.ERROR_TYPE)
                            .setContentText(getString(R.string.device_not_connect))
                            .show();
                }
                break;
            case R.id.disconnect:
                Controler.disconnectPos();
                break;
            default:
                break;
        }
    }


    @Override
    public void onBackPressed() {
        // TODO Auto-generated method stub
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
            // TODO: Consider calling
            //    ActivityCompat#requestPermissions
            // here to request the missing permissions, and then overriding
            //   public void onRequestPermissionsResult(int requestCode, String[] permissions,
            //                                          int[] grantResults)
            // to handle the case where the user grants the permission. See the documentation
            // for ActivityCompat#requestPermissions for more details.
            return;
        }
        btAdapter.cancelDiscovery();
        finish();

    }

    private final AdapterView.OnItemClickListener mListClickListener = new AdapterView.OnItemClickListener() {
        public void onItemClick(AdapterView<?> av, View v, int position, long id) {
            mAdapter.setSelected(position);
        }
    };

    private void unregisterReceiver() {
        if (br != null) {
            try {
                unregisterReceiver(br);
            } catch (Exception e) {
                //e.printStackTrace();
            }
        }
        br = null;
    }

    private void registerReceiver() {
        try {
            br = new BluetoothReceiver();
            IntentFilter filter = new IntentFilter();
            filter.addAction(BluetoothDevice.ACTION_FOUND);
            registerReceiver(br, filter);
        } catch (Exception e) {
            //e.printStackTrace();
        }
    }

    private class BluetoothReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            // TODO Auto-generated method stub
            try {
                if (BluetoothDevice.ACTION_FOUND.equals(intent.getAction())) {
                    BluetoothDevice btDevice = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                    if (btDevice != null) {
                        if (ActivityCompat.checkSelfPermission(getApplicationContext(), Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                            // TODO: Consider calling
                            //    ActivityCompat#requestPermissions
                            // here to request the missing permissions, and then overriding
                            //   public void onRequestPermissionsResult(int requestCode, String[] permissions,
                            //                                          int[] grantResults)
                            // to handle the case where the user grants the permission. See the documentation
                            // for ActivityCompat#requestPermissions for more details.
                            return;
                        }
                        mAdapter.addItem(new BluetoothItem(btDevice.getName(), btDevice.getAddress(), false));
                        mAdapter.notifyDataSetChanged();
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    private void startDiscovery() {
        Log.d(TAG, "startDiscovery happennig ");
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            // TODO: Consider calling
            //    ActivityCompat#requestPermissions
            // here to request the missing permissions, and then overriding
            //   public void onRequestPermissionsResult(int requestCode, String[] permissions,
            //                                          int[] grantResults)
            // to handle the case where the user grants the permission. See the documentation
            // for ActivityCompat#requestPermissions for more details.
//            return;
        }
        Set<BluetoothDevice> pairedDevices = btAdapter.getBondedDevices();
        mAdapter.clear();
        for (BluetoothDevice device : pairedDevices) {
            Log.d(TAG, "paired devices "+device);
            mAdapter.addItem(new BluetoothItem(device.getName(), device.getAddress(), false));
        }
        mAdapter.notifyDataSetChanged();
        btAdapter.startDiscovery();
    }

    private void connectDevice() {
        SharedPreferences pref = getSharedPreferences("AGENT_APP_DATA", MODE_PRIVATE);
        if (mAdapter.getSelected() >= 0) {
            BluetoothManager bluetoothManager = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
//            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
//                // TODO: Consider calling
//                //    ActivityCompat#requestPermissions
//                // here to request the missing permissions, and then overriding
//                //   public void onRequestPermissionsResult(int requestCode, String[] permissions,
//                //                                          int[] grantResults)
//                // to handle the case where the user grants the permission. See the documentation
//                // for ActivityCompat#requestPermissions for more details.
//                return;
//            }
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
                // TODO: Consider calling
                //    ActivityCompat#requestPermissions
                // here to request the missing permissions, and then overriding
                //   public void onRequestPermissionsResult(int requestCode, String[] permissions,
                //                                          int[] grantResults)
                // to handle the case where the user grants the permission. See the documentation
                // for ActivityCompat#requestPermissions for more details.
//                return;
            }
            bluetoothManager.getAdapter().cancelDiscovery();
            //Create waiting window

            SweetDialogUtils.showProgress(BluetoothConnectActivity.this, getString(R.string.device_connect), false);
            String mac = ((BluetoothItem) mAdapter.getItem(mAdapter.getSelected())).getAddress();
            String name = ((BluetoothItem) mAdapter.getItem(mAdapter.getSelected())).getName();
            new Thread(new Runnable() {
                @Override
                public void run() {
                    if (Controler.posConnected()) {
                        Controler.disconnectPos();
                    }
                    Log.d(TAG, "MAc address of bluetooth " + mac);
                    ConnectPosResult ret = Controler.connectPos(mac);

                    if (ret.bConnected) {
                        SweetDialogUtils.changeAlertType(BluetoothConnectActivity.this, getString(R.string.device_already_connect), SweetAlertDialog.SUCCESS_TYPE);
                        SharedPreferences.Editor editor = pref.edit();
                        editor.putString("mpos_connect", mac);
                        editor.commit();
                        finish();
                    } else {
                        SweetDialogUtils.changeAlertType(BluetoothConnectActivity.this, getString(R.string.device_not_connect), SweetAlertDialog.ERROR_TYPE);
                    }

                }
            }).start();


        } else {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    Controler.connectPos("");
                }
            }).start();

        }
    }

    private void removeBondMethods() {
        Controler.disconnectPos();
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            // TODO: Consider calling
            //    ActivityCompat#requestPermissions
            // here to request the missing permissions, and then overriding
            //   public void onRequestPermissionsResult(int requestCode, String[] permissions,
            //                                          int[] grantResults)
            // to handle the case where the user grants the permission. See the documentation
            // for ActivityCompat#requestPermissions for more details.
            return;
        }
        Set<BluetoothDevice> pairedDevices = btAdapter.getBondedDevices();
        for (BluetoothDevice b : pairedDevices) {
            removeBondMethod(b);
        }
        mAdapter.clear();
        mAdapter.notifyDataSetChanged();
    }

    private int removeBondMethod(BluetoothDevice btDev) {
        // TODO Auto-generated method stub
        //Using reflection method calls BluetoothDevice.createBond(BluetoothDevice remoteDevice);
        Method removeBondMethod = null;
        try {
            removeBondMethod = BluetoothDevice.class.getMethod("removeBond");
            removeBondMethod.invoke(btDev);
            Log.w("removeBondMethod", "removeBondMethod  	removeBondMethod.invoke(btDev); ");
        } catch (Exception e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        }
        return 0;
    }

}