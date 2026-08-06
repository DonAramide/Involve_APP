package com.connectpoint.cpointpay.mposdirect;

import android.content.Context;
import android.content.SharedPreferences;

import com.google.gson.Gson;

/**
 * Persists MPOS direct host configuration and downloaded keys.
 */
public class MposSessionManager {

    private static final String PREFS = "MPOS_DIRECT_PREFS";
    private static final String KEY_HOST_PARAMS_JSON = "host_params_json";
    private static final String KEY_TERMINAL_ID = "terminal_id";
    private static final String KEY_SERVER_IP = "server_ip";
    private static final String KEY_PORT = "port";
    private static final String KEY_ENABLE_SSL = "enable_ssl";
    private static final String KEY_COMPONENT_1 = "key_component_1";
    private static final String KEY_COMPONENT_2 = "key_component_2";
    private static final String KEY_KEYS_LOADED = "keys_loaded";
    private static final String KEY_CONFIG_VERSION = "config_version";

    private final SharedPreferences prefs;
    private final Gson gson = new Gson();

    public MposSessionManager(Context context) {
        prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        ensureLatestDefaults();
    }

    /** Refresh connection defaults when MposDefaults.CONFIG_VERSION changes. */
    private void ensureLatestDefaults() {
        int stored = prefs.getInt(KEY_CONFIG_VERSION, 0);
        if (stored >= MposDefaults.CONFIG_VERSION) {
            return;
        }
        prefs.edit()
                .putString(KEY_TERMINAL_ID, MposDefaults.TERMINAL_ID)
                .putString(KEY_SERVER_IP, MposDefaults.HOST_IP)
                .putInt(KEY_PORT, MposDefaults.HOST_PORT)
                .putBoolean(KEY_ENABLE_SSL, MposDefaults.ENABLE_SSL)
                .putString(KEY_COMPONENT_1, MposDefaults.KEY_COMPONENT_1)
                .putString(KEY_COMPONENT_2, MposDefaults.KEY_COMPONENT_2)
                .putInt(KEY_CONFIG_VERSION, MposDefaults.CONFIG_VERSION)
                .remove(KEY_HOST_PARAMS_JSON)
                .putBoolean(KEY_KEYS_LOADED, false)
                .apply();
    }

    public void saveHostParameters(MposHostParameters params) {
        prefs.edit()
                .putString(KEY_HOST_PARAMS_JSON, gson.toJson(params))
                .putString(KEY_TERMINAL_ID, params.getTerminalId())
                .putString(KEY_SERVER_IP, params.getServerIp())
                .putInt(KEY_PORT, params.getPort())
                .putBoolean(KEY_ENABLE_SSL, params.isEnableSsl())
                .putBoolean(KEY_KEYS_LOADED, params.hasKeys())
                .apply();
    }

    public MposHostParameters getHostParameters() {
        String json = prefs.getString(KEY_HOST_PARAMS_JSON, null);
        if (json == null || json.isEmpty()) {
            return null;
        }
        return gson.fromJson(json, MposHostParameters.class);
    }

    public boolean areKeysLoaded() {
        return prefs.getBoolean(KEY_KEYS_LOADED, false);
    }

    public void saveConnectionConfig(String terminalId, String serverIp, int port, boolean enableSsl,
                                     String keyComponent1, String keyComponent2) {
        prefs.edit()
                .putString(KEY_TERMINAL_ID, terminalId)
                .putString(KEY_SERVER_IP, serverIp)
                .putInt(KEY_PORT, port)
                .putBoolean(KEY_ENABLE_SSL, enableSsl)
                .putString(KEY_COMPONENT_1, keyComponent1)
                .putString(KEY_COMPONENT_2, keyComponent2)
                .apply();
    }

    public String getTerminalId() {
        return prefs.getString(KEY_TERMINAL_ID, MposDefaults.TERMINAL_ID);
    }

    public String getServerIp() {
        return prefs.getString(KEY_SERVER_IP, MposDefaults.HOST_IP);
    }

    public int getPort() {
        return prefs.getInt(KEY_PORT, MposDefaults.HOST_PORT);
    }

    public boolean isEnableSsl() {
        return prefs.getBoolean(KEY_ENABLE_SSL, MposDefaults.ENABLE_SSL);
    }

    public String getKeyComponent1() {
        return prefs.getString(KEY_COMPONENT_1, MposDefaults.KEY_COMPONENT_1);
    }

    public String getKeyComponent2() {
        return prefs.getString(KEY_COMPONENT_2, MposDefaults.KEY_COMPONENT_2);
    }

    public void clearKeys() {
        prefs.edit()
                .remove(KEY_HOST_PARAMS_JSON)
                .putBoolean(KEY_KEYS_LOADED, false)
                .apply();
    }
}
