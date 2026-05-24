package com.demo.mpossdk.internal.domain.repository

import com.demo.mpossdk.internal.domain.model.ConnectionMode
import com.demo.mpossdk.internal.domain.model.TerminalParameters

internal interface SessionManager {
    fun saveTerminalParameters(terminalParameters: TerminalParameters)
    fun getTerminalParameters(): TerminalParameters?
    fun saveLatitude(latitude: String?)
    fun getLatitude(): String?
    fun saveLongitude(longitude: String?)
    fun getLongitude(): String?
    fun setConnectionMode(connectionMode: ConnectionMode)
    fun getConnectionMode(): ConnectionMode
    fun setDeviceMac(mac: String)
    fun getDeviceMac(): String?
    fun setDeviceName(macName: String)
    fun getDeviceName(): String?
}