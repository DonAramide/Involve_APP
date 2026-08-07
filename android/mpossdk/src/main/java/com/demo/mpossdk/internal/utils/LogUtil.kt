package com.demo.mpossdk.internal.utils

import android.util.Log
import com.demo.mpossdk.BuildConfig

// Public for Java interop (keystore utils are Java).
object LogUtil {
    private var tag = "MposSdkLogUtil"
    private var isLogEnabled = BuildConfig.DEBUG

    fun i(i: String) {
        if (isLogEnabled) {
            Log.i(tag, i)
        }
    }

    fun w(w: String) {
        if (isLogEnabled) {
            Log.w(tag, w)
        }
    }

    fun e(e: String?) {
        if (isLogEnabled) {
            Log.e(tag, e ?: "null")
        }
    }

    fun d(d: String) {
        if (isLogEnabled) {
            Log.d(tag, d)
        }
    }

    fun v(v: String) {
        if (isLogEnabled) {
            Log.v(tag, v)
        }
    }

    fun printSeparator(level: Int, text: String?) {
        val msg =
            ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> $text <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"
        when (level) {
            Log.VERBOSE -> {
                v("  ")
                v(msg)
            }

            Log.INFO -> {
                i("  ")
                i(msg)
            }

            Log.WARN -> {
                w("  ")
                w(msg)
            }

            Log.DEBUG -> {
                d("  ")
                d(msg)
            }

            Log.ERROR -> {
                e("  ")
                e(msg)
            }
        }
    }
}
