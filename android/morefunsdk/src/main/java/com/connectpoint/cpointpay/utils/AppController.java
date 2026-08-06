package com.connectpoint.cpointpay.utils;

/**
 * Minimal stub of CPointPay AppController for MoreFun MPOS Direct.
 * Only manufacturer ID + connected-mode helpers are required by MposDeviceManager.
 */
public final class AppController {

    private static final int MANUFACTURER_ID = 25;
    private static volatile String connectedMode = "bluetooth";

    private AppController() {
    }

    public static int getManufacturerID() {
        return MANUFACTURER_ID;
    }

    public static void setConnectedMode(String mode) {
        if (mode != null && !mode.isEmpty()) {
            connectedMode = mode;
        }
    }

    public static String getConnectedMode() {
        return connectedMode;
    }
}
