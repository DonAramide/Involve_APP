package com.demo.mpossdk.internal.ui

import android.Manifest
import android.app.Dialog
import android.app.PendingIntent
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.Bundle
import android.os.Parcelable
import android.view.Window
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import com.demo.mpossdk.databinding.ActivityConnectingDeviceBinding
import com.demo.mpossdk.databinding.DialogBluetoothDevicesBinding
import com.demo.mpossdk.databinding.ItemBluetoothDevicesBinding
import com.demo.mpossdk.internal.data.ServiceLocator
import com.demo.mpossdk.internal.domain.model.ConnectionMode
import com.demo.mpossdk.internal.domain.model.ConnectionMode.BLUETOOTH
import com.demo.mpossdk.internal.domain.model.ConnectionMode.USB
import com.demo.mpossdk.internal.domain.repository.SessionManager
import com.demo.mpossdk.internal.ui.common.CustomListAdapter
import com.demo.mpossdk.internal.ui.common.DeviceNameDiffer
import com.demo.mpossdk.internal.ui.processing.ProcessingTransactionActivity
import com.demo.mpossdk.internal.usb.CustomProber
import com.demo.mpossdk.internal.usb.DeviceItem
import com.demo.mpossdk.internal.usb.SerialInputOutputManager
import com.demo.mpossdk.internal.usb.UsbSerialDriver
import com.demo.mpossdk.internal.usb.UsbSerialPort
import com.demo.mpossdk.internal.usb.UsbSerialProber
import com.demo.mpossdk.internal.utils.LogUtil
import com.demo.mpossdk.internal.utils.showAlertDialog
import com.demo.mpossdk.internal.utils.showWarningSnackBar
import com.demo.mpossdk.open.MposSdk
import com.demo.mpossdk.open.PairResultListener
import com.vanstone.mispos.component.Ex37Comm
import com.vanstone.vm20sdk.api.SystemApi
import com.vanstone.vm20sdk.struct.DateUser
import com.vanstone.vm20sdk.struct.TimeUser
import com.vanstone.vm20sdk.utils.ByteUtils
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.io.IOException
import java.util.Calendar
import java.util.Date

internal class ConnectingDeviceActivity : AppCompatActivity(), SerialInputOutputManager.Listener {
    private lateinit var binding: ActivityConnectingDeviceBinding
    private lateinit var coroutineScope: CoroutineScope
    private lateinit var sessionManager: SessionManager
    private var usbManager: UsbManager? = null
    private var driver: UsbSerialDriver? = null
    private var usbSerialPort: UsbSerialPort? = null

    private val bluetoothAdapter: BluetoothAdapter by lazy {
        val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothManager.adapter
    }

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { permissions ->
            val canEnableBluetooth = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                permissions[Manifest.permission.BLUETOOTH_CONNECT] == true
            } else true

            if (canEnableBluetooth && !bluetoothAdapter.isEnabled) {
                val enableBluetoothIntent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
                startActivity(enableBluetoothIntent)
            }

            if (permissions[Manifest.permission.BLUETOOTH] == true || permissions[Manifest.permission.BLUETOOTH_SCAN] == true
                || permissions[Manifest.permission.BLUETOOTH_CONNECT] == true
            ) {
                checkBluetoothPermission()
            }

            if (permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
                || permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true
            ) {
                //TODO -> CHECK FOR LOCATION
            }
        }

    private fun checkBluetoothPermission() {
        when {
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.BLUETOOTH
            ) == PackageManager.PERMISSION_GRANTED
                    ||
                    ContextCompat.checkSelfPermission(
                        this,
                        Manifest.permission.BLUETOOTH_SCAN
                    ) == PackageManager.PERMISSION_GRANTED
                    && ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.BLUETOOTH_CONNECT
            ) == PackageManager.PERMISSION_GRANTED -> {
                // You can use the API that requires the permission.
                setupCommunicationMode(BLUETOOTH)
            }

            ActivityCompat.shouldShowRequestPermissionRationale(
                this, Manifest.permission.BLUETOOTH_CONNECT
            ) -> {
                // In an educational UI, explain to the user why your app requires this
                // permission for a specific feature to behave as expected, and what
                // features are disabled if it's declined. In this UI, include a
                // "cancel" or "no thanks" button that lets the user continue
                // using your app without granting the permission.

                //Todo -> Show permission rationale
            }

            else -> {
                // You can directly ask for the permission.
                // The registered ActivityResultCallback gets the result of this request.
                requestPermission()
            }
        }
    }

    private fun requestPermission() {
        permissionLauncher.launch(
            arrayOf(
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.WRITE_EXTERNAL_STORAGE,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            )
        )
    }


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityConnectingDeviceBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val serviceLocator = ServiceLocator.getInstance(this)
        sessionManager = serviceLocator.provideSessionManager()
        coroutineScope = serviceLocator.provideCoroutineScope()

        if (bluetoothAdapter.isEnabled) {
            requestPermission()
        } else {
            val enableBtIntent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
            startActivityForResult(enableBtIntent, REQUEST_ENABLE_BT)
        }
    }

    private fun setupCommunicationMode(connectionMode: ConnectionMode) {
        when (connectionMode) {
            USB -> {
                // Use USB to communicate with MIS
                // How to Refer to https://gitcode.net/mirrors/mik3y/usb-serial-for-android?utm_source=csdn_github_accelerator
                registerUsbReceiver()
                getUsbDevicePermission()
                // Set the the way of communication to port
                SystemApi.SetCommMode(1)
            }

            BLUETOOTH -> {
                val bondedDevices = bluetoothAdapter.bondedDevices
                if (bondedDevices.isEmpty()) {
                    showAlertDialog(
                        message = "There are no paired bluetooth devices found. Kindly pair POS device",
                        showNegativeButton = false
                    ) {
                        val intent = Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS)
                        startActivity(intent)
                    }
                    return
                }

                val bluetoothDevices = mutableListOf<String>()
                for (device in bondedDevices) {
                    bluetoothDevices.add("${device.name} | ${device.address}")

                    /**
                     * This means that we have established connection with
                     * this device before already so no need to show list of
                     * devices again
                     */
//                    if (sessionManager.getDeviceMac() == device.address) {
//                        SystemApi.setMacAddr(device.address)
//                        navigateToProcessingScreen()
//                        return
//                    }
                }

                showBluetoothDeviceDialog(bluetoothDevices)
            }
        }
    }

    private fun navigateToProcessingScreen() {
        val intent = Intent(this, ProcessingTransactionActivity::class.java)
        startActivity(intent)
        finish()
    }

    private fun showBluetoothDeviceDialog(bluetoothDevices: MutableList<String>) {
        val dialog = Dialog(this)
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
        dialog.setCancelable(false)
        val dialogBinding = DialogBluetoothDevicesBinding.inflate(dialog.layoutInflater)
        dialog.setContentView(dialogBinding.root)
        dialog.window!!.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))

        val deviceAdapter = CustomListAdapter(
            clickListener = { _, deviceName ->
                coroutineScope.launch {
                    val split = deviceName.split(" | ")
                    sessionManager.setDeviceName(split[0])
                    sessionManager.setDeviceMac(split[1])
                    sessionManager.setConnectionMode(BLUETOOTH)
                    SystemApi.setMacAddr(sessionManager.getDeviceMac())
                }


                setTime()
                MposSdk.pairResultListener(
                    PairResultListener.OnSuccess(
                        "Device pairing successful"
                    )
                )
                dialog.dismiss()
                finish()
            },
            diffCallback = DeviceNameDiffer,
            viewCreator = { layoutInflater, viewGroup, _ ->
                ItemBluetoothDevicesBinding.inflate(
                    layoutInflater,
                    viewGroup,
                    false
                )
            }
        ) { item, binding, _ ->
            binding.apply {
                tvDeviceName.text = item
            }
        }

        dialogBinding.recyclerviewDevices.apply {
            layoutManager = LinearLayoutManager(this@ConnectingDeviceActivity)
            adapter = deviceAdapter
        }

        deviceAdapter.submitList(bluetoothDevices)
        dialog.show()
    }

    private fun setTime() = coroutineScope.launch {
        SystemApi.setMacAddr(sessionManager.getDeviceMac())

        val calendar = Calendar.getInstance().apply {
            time = Date()
        }

        val year = calendar.get(Calendar.YEAR)
        val month = calendar.get(Calendar.MONTH) + 1 // Month is 0-indexed
        val day = calendar.get(Calendar.DAY_OF_MONTH)
        val week = calendar.get(Calendar.WEEK_OF_YEAR)
        val hour = calendar.get(Calendar.HOUR_OF_DAY)
        val minute = calendar.get(Calendar.MINUTE)
        val second = calendar.get(Calendar.SECOND)

        val dateUser = DateUser()
        dateUser.year = year.toShort()
        dateUser.mon = month.toByte()
        dateUser.day = day.toByte()
        dateUser.dow = week.toByte()

        val timeUser = TimeUser()
        timeUser.hour = hour.toByte()
        timeUser.min = minute.toByte()
        timeUser.sec = second.toByte()

        val result = SystemApi.SetTime_Api(dateUser, timeUser)
        if (result == 0) {
            LogUtil.i("Time set successfully")
        }
    }

    private fun getUsbDevicePermission() {
        val usbDevices = mutableListOf<DeviceItem>()
        usbManager = this.getSystemService(USB_SERVICE) as UsbManager

        val usbCustomProber: UsbSerialProber = CustomProber.getCustomProber()
        if (usbManager != null) {
            for (device in usbManager!!.getDeviceList().values) {
                val driver = usbCustomProber.probeDevice(device)
                if (driver != null) {
                    for (port in 0 until driver.ports.size) {
                        usbDevices.add(DeviceItem(device, port, driver))
                        LogUtil.d("port-drivers: port=$port")
                    }
                }
            }
        }

        if (usbDevices.isEmpty()) {
            binding.root.showWarningSnackBar("There is no usable device")
            return
        }

        for (deviceItem in usbDevices) {
            val usbDevice: UsbDevice = deviceItem.usbDevice
            if (((usbDevice.vendorId == 0x0D28) && (usbDevice.productId == 0xCCDD)) || ((usbDevice.vendorId == 0x0103) && (usbDevice.productId == 0x6061)) || ((usbDevice.vendorId == 0x05C6) && (usbDevice.productId == 0x9020))) {
                driver = deviceItem.usbDriver
                val mPermissionIntent = PendingIntent.getBroadcast(
                    applicationContext,
                    0,
                    Intent(ACTION_USB_PERMISSION),
                    0
                ) //PendingIntent.FLAG_UPDATE_CURRENT
                usbManager!!.requestPermission(usbDevice, mPermissionIntent)
                sessionManager.setConnectionMode(USB)
                return
            }
        }
    }

    override fun onNewData(data: ByteArray?) {
    }

    override fun onRunError(e: Exception?) {
    }

    private fun registerUsbReceiver() {
        val filter = IntentFilter(ACTION_USB_PERMISSION)
        registerReceiver(usbReceiver, filter)
    }

    private val usbReceiver: BroadcastReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent == null) return

            if (intent.action == ACTION_USB_PERMISSION) {
                synchronized(this@ConnectingDeviceActivity) {
                    val device =
                        intent.getParcelableExtra<Parcelable>(UsbManager.EXTRA_DEVICE) as UsbDevice?
                    LogUtil.d("device: " + "BroadcastReceiver vid:" + device!!.vendorId + " pid:" + device.productId)

                    if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                        if (!usbManager!!.hasPermission(device)) {
                            binding.root.showWarningSnackBar("No permission")
                            return
                        }

                        val usbDeviceConnection = usbManager!!.openDevice(device)
                        if (usbDeviceConnection == null) {
                            binding.root.showWarningSnackBar("Device connection is null")
                            return
                        }

                        if (driver == null) {
                            binding.root.showWarningSnackBar("driver is null")
                            return
                        }

                        usbSerialPort = driver!!.ports[0]
                        if (usbSerialPort == null) {
                            binding.root.showWarningSnackBar("No USB Port")
                            return
                        }

                        try {
                            usbSerialPort!!.open(usbDeviceConnection)
                            usbSerialPort!!.setParameters(
                                115200,
                                UsbSerialPort.DATABITS_8,
                                UsbSerialPort.STOPBITS_1,
                                UsbSerialPort.PARITY_NONE
                            )
                        } catch (e: IOException) {
                            try {
                                usbSerialPort!!.close()
                            } catch (ex: IOException) {
                                ex.printStackTrace()
                            }
                            e.printStackTrace()
                            return
                        }


                        val irs232Oper: Ex37Comm.IRs232Oper = object : Ex37Comm.IRs232Oper {
                            override fun portSends(sendbuf: ByteArray, sendlen: Int): Int {
                                val sbuf = ByteArray(sendlen)
                                ByteUtils.memcpy(sbuf, sendbuf, sendlen)
                                try {
                                    usbSerialPort!!.write(sbuf, 1000)
                                    //Log.d(TAG, "write: "+sendlen+" " + CommonConvert.bcdToASCString(sbuf, 0, sendlen));
                                } catch (e: IOException) {
                                    usbDeviceConnection.close()
                                    e.printStackTrace()
                                    return -1
                                }
                                return 0
                            }

                            override fun portRecvs(recvbuf: ByteArray, recvlen: Int, ms: Int): Int {
                                var RecBufLen = 0
                                val rbuf = ByteArray(recvlen)
                                try {
                                    RecBufLen = usbSerialPort!!.read(rbuf, 5000)
                                    //Log.d(TAG, "read: "+RecBufLen+" " + CommonConvert.bcdToASCString(rbuf, 0, RecBufLen));
                                } catch (e: IOException) {
                                    // TODO Auto-generated catch block
                                    usbDeviceConnection.close()
                                    e.printStackTrace()
                                    return -1
                                }
                                ByteUtils.memcpy(recvbuf, rbuf, RecBufLen)
                                return RecBufLen
                            }
                        }

                        Ex37Comm.setRs232Oper(irs232Oper)
                    }
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        if (sessionManager.getConnectionMode() == BLUETOOTH) {
            if (sessionManager.getDeviceMac()?.isNotEmpty() == true) {
                SystemApi.setMacAddr(sessionManager.getDeviceMac())
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        coroutineScope.cancel()
        if (sessionManager.getConnectionMode() == USB) {
            disconnect()
        }
    }

    private fun disconnect() {
        unregisterReceiver(usbReceiver)

        if (usbSerialPort != null) {
            try {
                usbSerialPort!!.close()
            } catch (e: IOException) {
                e.printStackTrace()
            }
            usbSerialPort = null
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (resultCode == RESULT_OK && requestCode == REQUEST_ENABLE_BT) {
            requestPermission()
        } else {
            showAlertDialog(
                message = "You need to enable Bluetooth for app to work",
                showNegativeButton = false
            ) {
                val intent = Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS)
                startActivity(intent)
            }
        }
    }

    companion object {
        const val ACTION_USB_PERMISSION = "com.vanstone.usb.permission"
        const val REQUEST_ENABLE_BT = 1002
    }
}