package com.demo.mpossdk.internal.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.demo.mpossdk.internal.domain.model.ConnectionMode
import com.demo.mpossdk.internal.domain.model.TerminalParameters
import com.demo.mpossdk.internal.domain.repository.SessionManager
import com.demo.mpossdk.internal.domain.security.keystore.KeystoreEncryptionUtils
import com.demo.mpossdk.internal.utils.Constants
import com.google.gson.Gson

internal class SessionManagerImpl(
    private val context: Context,
    private val sharedPreferences: SharedPreferences
) : SessionManager {
    private fun saveString(key: String, value: String) {
        val encryptString = KeystoreEncryptionUtils.encrypt(context, value)
        sharedPreferences.edit().putString(key, encryptString).apply()
    }

    private fun getString(key: String): String? {
        val encryptString = sharedPreferences.getString(key, null) ?: return null
        return KeystoreEncryptionUtils.decrypt(context, encryptString)
    }

    override fun saveTerminalParameters(terminalParameters: TerminalParameters) {
        val json = Gson().toJson(terminalParameters)
        saveString(Constants.PREF_TERMINAL_PARAMETERS, json)
    }

    override fun getTerminalParameters(): TerminalParameters? {
        val json = sharedPreferences.getString(Constants.PREF_TERMINAL_PARAMETERS, null) ?: return null
        val decryptString = KeystoreEncryptionUtils.decrypt(context, json)
        return Gson().fromJson(decryptString, TerminalParameters::class.java)
    }

    override fun saveLatitude(latitude: String?) {
        saveString(Constants.PREF_LATITUDE, latitude ?: "")
    }

    override fun getLatitude(): String? {
        return getString(Constants.PREF_LATITUDE)
    }

    override fun saveLongitude(longitude: String?) {
        saveString(Constants.PREF_LONGITUDE, longitude ?: "")
    }

    override fun getLongitude(): String? {
        return getString(Constants.PREF_LONGITUDE)
    }

    override fun setConnectionMode(connectionMode: ConnectionMode) {
        saveString(Constants.PREF_CONNECTION_MODE, connectionMode.name)
    }

    override fun getConnectionMode(): ConnectionMode {
        val connection = getString(Constants.PREF_CONNECTION_MODE) ?: ConnectionMode.BLUETOOTH.name
        return ConnectionMode.valueOf(connection)
    }

    override fun setDeviceMac(mac: String) {
        saveString(Constants.PREF_DEVICE_MAC, mac)
    }

    override fun getDeviceMac(): String? {
        return getString(Constants.PREF_DEVICE_MAC)
    }

    override fun setDeviceName(name: String) {
        saveString(Constants.PREF_DEVICE_NAME, name)
    }

    override fun getDeviceName(): String? {
        return getString(Constants.PREF_DEVICE_NAME)
    }
}