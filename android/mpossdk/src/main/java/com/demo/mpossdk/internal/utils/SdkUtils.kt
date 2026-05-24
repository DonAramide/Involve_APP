package com.demo.mpossdk.internal.utils

import android.Manifest
import android.app.Dialog
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.view.View
import android.view.Window
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.core.content.ContextCompat
import com.demo.mpossdk.R
import com.google.android.material.snackbar.Snackbar
import java.lang.reflect.Method
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

internal class SdkUtils(private val context: Context) {
    fun showToastMessage(message: String) {
        val toast = Toast.makeText(context, message, Toast.LENGTH_LONG)
        toast.show()
    }

    fun getSerialNumber(): String? {
        var serial: String? = null
        try {
            val c = Class.forName("android.os.SystemProperties")
            val get: Method = c.getMethod("get", String::class.java)
            serial = get.invoke(c, "ro.serialno") as String?
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return serial
    }
}

internal fun Context.showAlertDialog(
    title: String = getString(R.string.lib_name),
    message: String,
    positiveTitle: String? = "Okay",
    negativeTitle: String? = "Cancel",
    showNegativeButton: Boolean = true,
    onConfirmAction: (Boolean) -> Unit
) {
    val builder = AlertDialog.Builder(this)
        .setTitle(title)
        .setMessage(message)
        .setCancelable(false)
        .setPositiveButton(
            positiveTitle
        ) { dialog, _ ->
            run {
                dialog.dismiss()
                onConfirmAction(true)
            }
        }
    if (showNegativeButton) {
        builder.setNegativeButton(
            negativeTitle
        ) { dialog, _ ->
            run {
                dialog.dismiss()
                onConfirmAction(false)
            }
        }
    }
    builder.create()
    builder.show()
}

internal fun View.showWarningSnackBar(message: String) {
    Snackbar.make(this, message, Snackbar.LENGTH_SHORT)
        .setBackgroundTint(resources.getColor(R.color.warning))
        .show()
}

internal fun View.showSuccessSnackBar(message: String) {
    Snackbar.make(this, message, Snackbar.LENGTH_SHORT)
        .setBackgroundTint(resources.getColor(R.color.success))
        .setTextColor(resources.getColor(R.color.white))
        .show()
}

internal fun Context.hasLocationPermission(): Boolean {
    return ContextCompat.checkSelfPermission(
        this,
        Manifest.permission.ACCESS_COARSE_LOCATION
    ) == PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
}

internal fun Long.toFormattedDateString(): String {
    val format = SimpleDateFormat("dd MMM, yyyy HH:mm:ss a", Locale.getDefault())
    return format.format(Date(this))
}