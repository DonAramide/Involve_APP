package com.connectpoint.cpointpay.mposdirect;

/**
 * Default NIBSS host and terminal settings for MPOS Direct.
 * TMK (9A) is decrypted locally with ZMK = key1 XOR key2.
 */
public final class MposDefaults {

    /** Bump when connection defaults change so SharedPreferences are refreshed. */
    public static final int CONFIG_VERSION = 3;

    public static final String WHO = "NIBSS";
    public static final String TERMINAL_ID = "2070AL30";
    public static final String MERCHANT_ID = "2ANLE0000000001";
    public static final String FOOTER_MESSAGE = "Thank you for choosing us";
    public static final String HOST_IP = "196.6.103.18";
    public static final int HOST_PORT = 4001;
    public static final boolean ENABLE_SSL = true;

    /** ZMK component 1 — XOR with component 2 to decrypt TMK from host field 53. */
    public static final String KEY_COMPONENT_1 = "66D4AF3321D8564E9F6F35411755E730";
    public static final String KEY_COMPONENT_2 = "00000000000000000000000000000000";

    private MposDefaults() {
    }
}
