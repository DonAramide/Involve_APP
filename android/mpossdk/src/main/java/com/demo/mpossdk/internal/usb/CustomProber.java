package com.demo.mpossdk.internal.usb;

public class CustomProber {

    public static UsbSerialProber getCustomProber() {
        ProbeTable customTable = new ProbeTable();
        customTable.addProduct(0x0D28,0xCCDD,CdcAcmSerialDriver.class);
        customTable.addProduct(0x0103,0x6061,CdcAcmSerialDriver.class);
        customTable.addProduct(0x05C6,0x9020,CdcAcmSerialDriver.class);
        return new UsbSerialProber(customTable);
    }

}
