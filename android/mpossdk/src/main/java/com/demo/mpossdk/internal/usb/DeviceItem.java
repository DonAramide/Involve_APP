package com.demo.mpossdk.internal.usb;

import android.hardware.usb.UsbDevice;

public class DeviceItem {
    private UsbDevice device;
    private int port;
    private UsbSerialDriver driver;

    public DeviceItem(UsbDevice device, int port, UsbSerialDriver driver) {
        this.device = device;
        this.port = port;
        this.driver = driver;
    }

    public UsbDevice getUsbDevice(){
        return device;
    }

    public int getPort(){
        return port;
    }

    public UsbSerialDriver getUsbDriver(){
        return driver;
    }
}
