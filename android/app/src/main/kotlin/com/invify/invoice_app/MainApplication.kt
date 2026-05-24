package com.invify.invoice_app

import io.flutter.app.FlutterApplication
import com.demo.mpossdk.open.MposSdk

class MainApplication : FlutterApplication() {
    override fun onCreate() {
        super.onCreate()
        MposSdk.initMposDevice(this)
    }
}
